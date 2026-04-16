import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchOrderDetail(id: string, accessToken: string) {
    try {
        const res = await fetch(`https://api.bling.com.br/Api/v3/pedidos/vendas/${id}`, {
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json.data;
    } catch (e) {
        console.error(`Erro ao buscar detalhe do pedido ${id}:`, e);
        return null;
    }
}

function dateToStr(d: Date): string {
    return d.toISOString().split('T')[0];
}

serve(async (req) => {
    const startTime = Date.now();
    const TIMEOUT_SAFETY_MS = 100_000; // 100 segundos para segurança

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

        // 2. Buscar/Criar Config de Sync Incremental
        const { data: config, error: configError } = await supabase
            .from('bling_config')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (configError) throw new Error('Erro ao buscar configuração de sync: ' + configError.message);

        // Fallback: 7 dias atrás se não houver registro
        let lastSyncAt = config?.last_sync_at;
        if (!lastSyncAt) {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            lastSyncAt = sevenDaysAgo.toISOString();
        }

        // 3. Pegar parâmetros do body (se houver override)
        const body = await req.json().catch(() => ({}));
        let { dateStart, dateEnd, page } = body;
        dateStart = dateStart || lastSyncAt.split('T')[0];
        dateEnd = dateEnd || dateToStr(new Date());
        let currentPage = page || 1;

        console.log(`[SYNC] Iniciando sync incremental: ${dateStart} até ${dateEnd} (Página ${currentPage})`);

        // 4. Pegar token Bling
        const { data: tokenData, error: tokenError } = await supabase
            .from('bling_tokens')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (tokenError || !tokenData) throw new Error('Bling account not connected');

        let accessToken = tokenData.access_token;
        const expiresAt = new Date(tokenData.expires_at);

        if (expiresAt <= new Date()) {
            const clientId = Deno.env.get('BLING_CLIENT_ID');
            const clientSecret = Deno.env.get('BLING_CLIENT_SECRET');
            const auth = btoa(`${clientId}:${clientSecret}`);

            const refreshRes = await fetch('https://www.bling.com.br/Api/v3/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${auth}`,
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: tokenData.refresh_token
                }).toString(),
            });

            const refreshData = await refreshRes.json();
            if (!refreshRes.ok) throw new Error('Failed to refresh Bling token');

            accessToken = refreshData.access_token;
            const newExp = new Date();
            newExp.setSeconds(newExp.getSeconds() + refreshData.expires_in);

            await supabase.from('bling_tokens').update({
                access_token: refreshData.access_token,
                refresh_token: refreshData.refresh_token,
                expires_at: newExp.toISOString(),
                updated_at: new Date().toISOString(),
            }).eq('user_id', user.id);
        }

        // 5. Mapear lojas (canais de venda)
        const lojasRes = await fetch('https://api.bling.com.br/Api/v3/canais-venda', {
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
        });
        const lojasJson = await lojasRes.json();
        const lojasMapping: Record<string, string> = {};
        if (lojasJson.data) {
            lojasJson.data.forEach((l: any) => {
                lojasMapping[String(l.id)] = l.descricao || l.nome;
            });
        }

        let totalFetched = 0;
        let totalUpserted = 0;
        let lastProcessedDate = lastSyncAt;
        let isPartial = false;

        // Loop de Paginação com Early-Return Logic
        while (true) {
            // VERIFICAÇÃO DE TIMEOUT (CORREÇÃO 2)
            if (Date.now() - startTime > TIMEOUT_SAFETY_MS) {
                console.log(`[SYNC] Timeout de segurança atingido (100s). Retornando progresso parcial na página ${currentPage}.`);
                isPartial = true;
                break;
            }

            // Ajuste de data para evitar data futura no Bling (UTC vs Local)
            const now = new Date();
            const offset = now.getTimezoneOffset() * 60000;
            const localToday = new Date(now.getTime() - offset).toISOString().split('T')[0];

            // Sem o 'let' aqui pois já foram declarados acima
            dateStart = body.dateStart || lastSyncAt.split('T')[0];
            dateEnd = body.dateEnd || localToday;

            const params = new URLSearchParams({
                pagina: String(currentPage),
                limite: '100',
                dataInicial: dateStart,
                dataFinal: dateEnd,
            });
            // O Bling v3 pede expand[]=itens. O URLSearchParams.append com [] funciona bem.
            params.append('expand[]', 'itens');

            const url = `https://api.bling.com.br/Api/v3/pedidos/vendas?${params.toString()}`;
            console.log(`[SYNC] Chamando Bling: ${url}`);

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
            });

            if (!res.ok) {
                if (res.status === 404) break; // Fim das páginas
                throw new Error(`Bling API Error: ${res.status}`);
            }

            const json = await res.json();
            const rawPedidos: any[] = json.data || [];
            if (rawPedidos.length === 0) break;

            const pedidos: any[] = [];

            // Processamento dos pedidos da página
            for (const p of rawPedidos) {
                // Se não vieram itens via expansão, fazemos o deep fetch com rate limit
                if (!p.itens || p.itens.length === 0) {
                    const detailed = await fetchOrderDetail(p.id, accessToken);
                    pedidos.push(detailed || p);
                    await delay(350); // ~3 req/s

                    // Re-checa timeout no meio do loop de itens se for muito grande
                    if (Date.now() - startTime > TIMEOUT_SAFETY_MS) break;
                } else {
                    pedidos.push(p);
                }
            }

            if (pedidos.length === 0) break;

            totalFetched += pedidos.length;

            // Mapeamento e Upsert
            const mappedRows = pedidos.map((p: any) => {
                let rawItens: any[] = [];
                if (Array.isArray(p.itens)) rawItens = p.itens;
                else if (p.itens && Array.isArray(p.itens.data)) rawItens = p.itens.data;
                else if (p.itens && typeof p.itens === 'object') {
                    rawItens = Object.values(p.itens).filter(i => typeof i === 'object');
                }

                return {
                    id: p.id,
                    numero: String(p.numero || p.id),
                    data: p.data ? p.data.split(' ')[0] : dateStart,
                    situacao_id: p.situacao?.id ?? null,
                    situacao_nome: p.situacao?.nome ?? null,
                    total: Number(p.total || 0),
                    contato_id: p.contato?.id ?? null,
                    contato_nome: p.contato?.nome ?? null,
                    loja_id: p.loja?.id ?? null,
                    loja_descricao: lojasMapping[String(p.loja?.id)] || p.loja?.descricao || 'Loja Principal',
                    itens: rawItens.map((item: any) => ({
                        codigo: String(item.codigo || item.produto?.codigo || '').trim(),
                        nome: String(item.descricao || item.nome || item.produto?.descricao || '').trim(),
                        quantidade: Number(item.quantidade || 1),
                        valorUnidade: Number(item.valor || item.valorUnidade || item.preco || 0),
                    })),
                    raw: p,
                    synced_at: new Date().toISOString(),
                    user_id: user.id,
                    source: 'bling'
                };
            });

            const { error: upsertError } = await supabase
                .from('bling_pedidos')
                .upsert(mappedRows, { onConflict: 'id', ignoreDuplicates: false });

            if (!upsertError) {
                totalUpserted += mappedRows.length;
                // CORREÇÃO 3: Salva o timestamp do ÚLTIMO pedido da página
                const lastOrder = pedidos[pedidos.length - 1];
                if (lastOrder && lastOrder.data) {
                    lastProcessedDate = lastOrder.data;
                    await supabase.from('bling_config').upsert({
                        user_id: user.id,
                        last_sync_at: lastProcessedDate,
                        updated_at: new Date().toISOString()
                    });
                }
            }

            currentPage++;

            // Re-checa se houve interrupção no loop de itens
            if (Date.now() - startTime > TIMEOUT_SAFETY_MS) {
                isPartial = true;
                break;
            }
        }

        // 6. Atualizar metadados globais
        const { count } = await supabase.from('bling_pedidos').select('*', { count: 'exact', head: true });
        await supabase.from('bling_sync_meta').upsert({
            user_id: user.id,
            status: isPartial ? 'partial' : 'done',
            last_sync: new Date().toISOString(),
            total_rows: count || totalUpserted,
        }, { onConflict: 'user_id' });

        return new Response(JSON.stringify({
            success: true,
            partial: isPartial,
            nextPage: isPartial ? currentPage : null,
            lastProcessedDate: lastProcessedDate,
            fetched: totalFetched,
            upserted: totalUpserted,
            totalInDb: count,
            sync_status: isPartial ? 'partial' : 'done'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error('[SYNC ERROR]', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            stack: error.stack,
            type: 'function_crash'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200, // Retornamos 200 para o frontend conseguir ler o JSON do erro
        });
    }
});
