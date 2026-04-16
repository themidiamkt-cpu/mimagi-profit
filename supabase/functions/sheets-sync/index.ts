import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function generateId(user_id: string, data: string, cliente: string, valor: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(user_id + data + cliente + valor);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    let id = 0n;
    // Usamos os primeiros 8 bytes para gerar um BIGINT de 64 bits (positivo)
    for (let i = 0; i < 7; i++) {
        id = (id << 8n) | BigInt(hashArray[i]);
    }
    return id.toString();
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Autenticar usuário
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Missing Authorization header');
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) throw new Error('Invalid user token');

        // 2. Pegar dados do rascunho
        const body = await req.json();
        const { vendas = [], itens = [], clientes = [] } = body;

        console.log(`[SHEETS-SYNC] Recebido: ${vendas.length} vendas, ${itens.length} itens.`);

        // 3. Processar Vendas e Itens
        // Criar um mapa de itens por numero_pedido para facilitar a montagem do JSONB
        const itensPorPedido: Record<string, any[]> = {};
        itens.forEach((item: any) => {
            const pedidoNum = String(item.numero_pedido || '');
            if (!pedidoNum) return;
            if (!itensPorPedido[pedidoNum]) itensPorPedido[pedidoNum] = [];
            itensPorPedido[pedidoNum].push({
                codigo: String(item.codigo_produto || '').trim(),
                nome: String(item.nome_produto || '').trim(),
                marca: String(item.marca || '').trim(),
                quantidade: Number(item.quantidade || 1),
                valorUnidade: Number(item.valor_unitario || 0)
            });
        });

        const mappedPedidos = [];
        for (const v of vendas) {
            const pedidoNum = String(v.numero_pedido || '');
            const dataPedido = v.data || new Date().toISOString().split('T')[0];
            const nomeCliente = v.nome_cliente || 'Consumidor Final';
            const total = Number(v.valor_total || 0);

            // Gerar ID determinístico para evitar duplicatas em re-syncs
            const generatedId = await generateId(user.id, dataPedido, nomeCliente, String(v.valor_total));

            mappedPedidos.push({
                id: generatedId,
                numero: pedidoNum || generatedId,
                data: dataPedido,
                total: total,
                contato_nome: nomeCliente,
                loja_descricao: v.canal || 'Planilha Manual',
                source: 'planilha',
                user_id: user.id,
                synced_at: new Date().toISOString(),
                itens: itensPorPedido[pedidoNum] || []
            });
        }

        // 4. Processar Clientes e Filhos
        const customerUpserts = [];
        const childrenUpserts = [];

        for (const c of clientes) {
            if (!c.nome) continue;

            const customerId = await generateId(user.id, c.nome, c.telefone || '', c.cpf || '');

            customerUpserts.push({
                id: customerId,
                name: c.nome,
                phone: c.telefone || null,
                cpf: c.cpf || null,
                city: c.cidade || null,
                user_id: user.id,
                venda_origem: 'planilha'
            });

            if (c.nome_filho_1) {
                const childId1 = await generateId(customerId, c.nome_filho_1, 'child1', c.nascimento_filho_1 || '');
                childrenUpserts.push({
                    id: childId1,
                    customer_id: customerId,
                    name: c.nome_filho_1,
                    birth_date: c.nascimento_filho_1 || null
                });
            }

            if (c.nome_filho_2) {
                const childId2 = await generateId(customerId, c.nome_filho_2, 'child2', c.nascimento_filho_2 || '');
                childrenUpserts.push({
                    id: childId2,
                    customer_id: customerId,
                    name: c.nome_filho_2,
                    birth_date: c.nascimento_filho_2 || null
                });
            }
        }

        // 5. Upsert no Banco
        if (mappedPedidos.length > 0) {
            const { error: upsertError } = await supabase
                .from('bling_pedidos')
                .upsert(mappedPedidos, { onConflict: 'id' });
            if (upsertError) throw upsertError;
        }

        if (customerUpserts.length > 0) {
            const { error: custError } = await supabase
                .from('growth_customers')
                .upsert(customerUpserts, { onConflict: 'id' });
            if (custError) throw custError;
        }

        if (childrenUpserts.length > 0) {
            const { error: childError } = await supabase
                .from('children')
                .upsert(childrenUpserts, { onConflict: 'id' });
            if (childError) throw childError;
        }

        // 6. Atualizar metadados de sync
        const { count } = await supabase
            .from('bling_pedidos')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        await supabase.from('bling_sync_meta').upsert({
            user_id: user.id,
            status: 'done',
            last_sync: new Date().toISOString(),
            total_rows: count || mappedPedidos.length
        }, { onConflict: 'user_id' });

        return new Response(JSON.stringify({
            success: true,
            synced_orders: mappedPedidos.length,
            synced_customers: customerUpserts.length,
            synced_children: childrenUpserts.length,
            total_in_db: count
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error('[SHEETS-SYNC ERROR]', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }
});
