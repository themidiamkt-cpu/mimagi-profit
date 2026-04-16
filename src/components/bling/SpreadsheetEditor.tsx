import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
    FileUp, FileDown, Plus, Trash2, Send,
    RefreshCw, CheckCircle2, AlertCircle, Search, User, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { blingApi } from '@/lib/blingApi';

interface SpreadsheetData {
    vendas: any[];
    itens: any[];
    clientes: any[];
    produtos: any[];
}

const generateLocalId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36).substring(4);

const DEFAULT_DATA: SpreadsheetData = {
    vendas: Array.from({ length: 20 }, () => ({ _id: generateLocalId() })),
    itens: Array.from({ length: 20 }, () => ({ _id: generateLocalId() })),
    clientes: Array.from({ length: 20 }, () => ({ _id: generateLocalId() })),
    produtos: Array.from({ length: 20 }, () => ({ _id: generateLocalId() })),
};

const normalizeLookupKey = (value?: string | null) => {
    if (!value) return "";
    return value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
};

export function SpreadsheetEditor() {
    const { user } = useAuthContext();
    const [data, setData] = useState<SpreadsheetData>(DEFAULT_DATA);
    const [activeTab, setActiveTab] = useState<keyof SpreadsheetData>('vendas');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [syncMeta, setSyncMeta] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Carregar dados e rascunho
    useEffect(() => {
        if (!user) return;
        const key = `planilha_draft_${user.id}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.data) setData({ ...DEFAULT_DATA, ...parsed.data });
                if (parsed.timestamp) setLastSaved(new Date(parsed.timestamp));
            } catch (e) {
                console.error("Erro ao carregar rascunho:", e);
            }
        }
        fetchMeta();
        fetchDropdownData();
    }, [user]);

    const fetchDropdownData = async () => {
        const { data: prods } = await supabase.from('bling_produtos').select('codigo, nome, marca, preco, categoria').order('nome');

        // Buscar clientes do CRM com telefone
        const { data: crmCusts } = await supabase.from('growth_customers').select('name, phone').order('name');

        // Buscar clientes do histórico de vendas (Bling)
        const { data: salesCusts } = await supabase.from('bling_pedidos').select('contato_nome').order('contato_nome');

        // Consolidar nomes únicos e seus telefones
        const customerMap: Record<string, string> = {};

        crmCusts?.forEach(c => {
            if (c.name) customerMap[c.name] = c.phone || '';
        });

        salesCusts?.forEach(c => {
            if (c.contato_nome && !customerMap[c.contato_nome]) {
                customerMap[c.contato_nome] = '';
            }
        });

        const combinedCustomers = Object.entries(customerMap)
            .map(([name, phone]) => ({ name, phone }))
            .sort((a, b) => a.name.localeCompare(b.name));

        if (prods) setProducts(prods);
        setCustomers(combinedCustomers);
    };

    const fetchMeta = async () => {
        if (!user) return;
        const { data: meta } = await supabase.from('bling_sync_meta').select('*').eq('user_id', user.id).maybeSingle();
        setSyncMeta(meta);
    };

    const saveDraft = useCallback((newData: SpreadsheetData) => {
        if (!user) return;
        localStorage.setItem(`planilha_draft_${user.id}`, JSON.stringify({
            data: newData,
            timestamp: new Date().toISOString()
        }));
        setLastSaved(new Date());
    }, [user]);

    const handleCellChange = (tab: keyof SpreadsheetData, rowIndex: number, field: string, value: any) => {
        setData(prev => {
            const newData = { ...prev };
            const newRows = [...newData[tab]];
            const currentRow = { ...newRows[rowIndex], [field]: value };

            // Lógica de auto-preenchimento para produtos e clientes na aba vendas
            if (tab === 'vendas') {
                if (field === 'codigo_produto') {
                    const prod = products.find(p => p.codigo === value);
                    if (prod) {
                        currentRow.nome_produto = prod.nome;
                        currentRow.valor_unitario = prod.preco || currentRow.valor_unitario;
                        currentRow.marca = prod.marca || currentRow.marca;
                    }
                } else if (field === 'nome_produto') {
                    const prod = products.find(p => p.nome === value);
                    if (prod) {
                        currentRow.codigo_produto = prod.codigo;
                        currentRow.valor_unitario = prod.preco || currentRow.valor_unitario;
                    }
                } else if (field === 'nome_cliente') {
                    const cust = customers.find(c => c.name === value);
                    if (cust && cust.phone) {
                        currentRow.telefone = cust.phone;
                    }
                }

                // Auto-calculo do valor_total da linha
                const qty = Number(currentRow.quantidade || 1);
                const unit = Number(currentRow.valor_unitario || 0);
                const dPerc = Number(currentRow.desconto_percentual || 0);
                const dVal = Number(currentRow.desconto_valor || 0);

                let total = qty * unit;
                if (dVal > 0) total -= dVal;
                else if (dPerc > 0) total -= (total * dPerc / 100);

                if (field !== 'valor_total' && total > 0) {
                    currentRow.valor_total = total.toFixed(2);
                }
            }

            newRows[rowIndex] = currentRow;
            newData[tab] = newRows;
            saveDraft(newData);
            return newData;
        });
    };

    const handleAddRow = () => {
        const newData = { ...data };
        newData[activeTab] = [...newData[activeTab], { _id: generateLocalId() }];
        setData(newData);
        saveDraft(newData);
    };

    const handleRemoveRow = (tab: keyof SpreadsheetData, rowIndex: number) => {
        setData(prev => {
            const newData = { ...prev };
            const newRows = [...newData[tab]];
            newRows.splice(rowIndex, 1);
            newData[tab] = newRows;
            saveDraft(newData);
            return newData;
        });
    };

    const handleClear = () => {
        if (window.confirm("Limpar todo o rascunho?")) {
            setData(DEFAULT_DATA);
            if (user) localStorage.removeItem(`planilha_draft_${user.id}`);
            setLastSaved(null);
            toast.success("Dados limpos");
        }
    };

    const handleExport = () => {
        const wb = XLSX.utils.book_new();
        const filterEmpty = (rows: any[]) => rows.filter(r => Object.values(r).some(v => v !== null && v !== ''));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filterEmpty(data.vendas)), "Vendas");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filterEmpty(data.itens)), "Itens");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filterEmpty(data.clientes)), "Clientes");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filterEmpty(data.produtos)), "Produtos");
        XLSX.writeFile(wb, `mimagi_planilha_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const wb = XLSX.read(event.target?.result, { type: 'binary' });
                const newData = { ...data };
                const addIds = (rows: any[]) => rows.map(r => ({ _id: generateLocalId(), ...r }));

                if (wb.SheetNames.includes('Vendas')) newData.vendas = addIds(XLSX.utils.sheet_to_json(wb.Sheets['Vendas']));
                if (wb.SheetNames.includes('Itens')) newData.itens = addIds(XLSX.utils.sheet_to_json(wb.Sheets['Itens']));
                if (wb.SheetNames.includes('Clientes')) newData.clientes = addIds(XLSX.utils.sheet_to_json(wb.Sheets['Clientes']));
                if (wb.SheetNames.includes('Produtos')) newData.produtos = addIds(XLSX.utils.sheet_to_json(wb.Sheets['Produtos']));
                setData(newData);
                saveDraft(newData);
                toast.success("Importado!");
            } catch (err) { toast.error("Erro ao importar"); }
        };
        reader.readAsBinaryString(file);
    };

    const generateBigIntId = async (...parts: string[]): Promise<string> => {
        const input = parts.map(p => String(p || '').trim().toLowerCase()).join('|');
        const msgUint8 = new TextEncoder().encode(input);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        let id = 0n;
        for (let i = 0; i < 6; i++) {
            id = (id << 8n) | BigInt(hashArray[i]);
        }
        return id.toString();
    };

    const generateUUID = async (...parts: string[]): Promise<string> => {
        const input = parts.map(p => String(p || '').trim().toLowerCase()).join('|');
        const msgUint8 = new TextEncoder().encode(input);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hex = hashArray.map(b => b.toString(16).padStart(2, '0'));

        // Formatar como UUID v4 (determinístico a partir do hash)
        // Versão 4: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        const uuid = [
            hex.slice(0, 4).join(''),
            hex.slice(4, 6).join(''),
            ((parseInt(hex[6], 16) & 0x0f) | 0x40).toString(16).padStart(2, '0') + hex[7],
            ((parseInt(hex[8], 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hex[9],
            hex.slice(10, 16).join('')
        ].join('-');
        return uuid;
    };

    const handleSync = async () => {
        if (!user) return;
        setSyncing(true);
        const toastId = toast.loading("Sincronizando com o banco de dados...");

        try {
            const filterEmpty = (rows: any[]) => (rows || []).filter(r => r && Object.values(r).some(v => v !== null && v !== ''));
            const cleanVendas = filterEmpty(data.vendas);
            const cleanItens = filterEmpty(data.itens);
            const cleanClientes = filterEmpty(data.clientes);
            const cleanProdutos = filterEmpty(data.produtos);

            const customerRecords: Array<{ data: any; id: string; normalizedName: string }> = [];
            const customerNameMap: Record<string, string> = {};
            for (const c of cleanClientes) {
                if (!c.nome) continue;
                const normalizedName = normalizeLookupKey(c.nome);
                const customerId = await generateUUID(user.id, c.nome);
                customerRecords.push({ data: c, id: customerId, normalizedName });
                if (normalizedName && !customerNameMap[normalizedName]) {
                    customerNameMap[normalizedName] = customerId;
                }
            }

            // 1. Processar Itens por Pedido (Consolidando da aba vendas e da aba itens)
            const itensPorPedido: Record<string, any[]> = {};

            cleanVendas.forEach((v: any) => {
                const pedidoNum = String(v.numero_pedido || '').trim();
                if (v.codigo_produto || v.nome_produto) {
                    if (!itensPorPedido[pedidoNum]) itensPorPedido[pedidoNum] = [];

                    const qty = Number(v.quantidade || 1);
                    const unit = Number(v.valor_unitario || 0);
                    const dPerc = Number(v.desconto_percentual || 0);
                    const dVal = Number(v.desconto_valor || 0);
                    const discount = dVal > 0 ? dVal : (unit * qty * dPerc / 100);

                    itensPorPedido[pedidoNum].push({
                        codigo: String(v.codigo_produto || '').trim(),
                        nome: String(v.nome_produto || '').trim(),
                        quantidade: qty,
                        valor: unit,
                        desconto: discount
                    });
                }
            });

            cleanItens.forEach((item: any) => {
                const pedidoNum = String(item.numero_pedido || '').trim();
                if (!pedidoNum) return;
                if (!itensPorPedido[pedidoNum]) itensPorPedido[pedidoNum] = [];
                itensPorPedido[pedidoNum].push({
                    codigo: String(item.codigo_produto || '').trim(),
                    nome: String(item.nome_produto || '').trim(),
                    marca: String(item.marca || '').trim(),
                    quantidade: Number(item.quantidade || 1),
                    valorUnidade: Number(item.valor_unitario || 0),
                    desconto: Number(item.desconto || 0)
                });
            });

            // 2. Mapear Pedidos
            const mappedPedidos = [];
            for (const v of cleanVendas) {
                const pedidoNum = String(v.numero_pedido || '');
                const dataPedido = v.data || new Date().toISOString().split('T')[0];
                const nomeCliente = v.nome_cliente || 'Consumidor Final';
                const total = Number(v.valor_total || 0);

                // Geração de ID Estável: Prioriza o número do pedido ou o ID interno da linha
                // Isso permite editar a data ou o valor sem criar duplicatas no banco
                let gId;
                if (pedidoNum) {
                    gId = await generateBigIntId(user.id, pedidoNum, 'manual_order');
                } else {
                    gId = await generateBigIntId(user.id, v._id || (dataPedido + nomeCliente + total), 'manual_order');
                }

                const normalizedClienteName = normalizeLookupKey(nomeCliente);
                const matchedCustomerId = normalizedClienteName ? customerNameMap[normalizedClienteName] : undefined;
                const contatoId = matchedCustomerId ?? await generateBigIntId(user.id, nomeCliente);

                mappedPedidos.push({
                    id: (gId as any),
                    numero: pedidoNum || gId,
                    data: dataPedido,
                    total: total,
                    contato_nome: nomeCliente,
                    contato_id: contatoId,
                    loja_descricao: v.canal || 'Planilha Manual',
                    user_id: user.id,
                    synced_at: new Date().toISOString(),
                    itens: itensPorPedido[pedidoNum] || [],
                    raw: { is_manual: true }
                });
            }

            // 3. Processar Produtos
            const productUpserts = [];
            for (const p of cleanProdutos) {
                if (!p.sku && !p.nome) continue;
                const sku = String(p.sku || '').trim();
                const productId = await generateBigIntId(user.id, sku, 'product', '');

                productUpserts.push({
                    id: (productId as any),
                    codigo: sku,
                    nome: p.nome || 'Produto sem nome',
                    marca: p.marca || 'Sem Marca',
                    preco: p.preco ? Number(p.preco) : null,
                    categoria: p.categoria || null,
                    user_id: user.id
                });
            }

            // 4. Processar Clientes e Filhos
            const customerUpserts = customerRecords.map(({ data: c, id: customerId }) => ({
                id: customerId,
                name: c.nome,
                phone: c.telefone || null,
                cpf: c.cpf || null,
                city: c.cidade || null,
                user_id: user.id,
                venda_origem: 'planilha'
            }));
            const childrenUpserts = [];
            for (const { data: c, id: customerId } of customerRecords) {
                if (c.nome_filho_1) {
                    const childId1 = await generateUUID(customerId, c.nome_filho_1, 'child1', c.nascimento_filho_1 || '');
                    childrenUpserts.push({
                        id: childId1,
                        customer_id: customerId,
                        name: c.nome_filho_1,
                        birth_date: c.nascimento_filho_1 || null,
                        user_id: user.id
                    });
                }

                if (c.nome_filho_2) {
                    const childId2 = await generateUUID(customerId, c.nome_filho_2, 'child2', c.nascimento_filho_2 || '');
                    childrenUpserts.push({
                        id: childId2,
                        customer_id: customerId,
                        name: c.nome_filho_2,
                        birth_date: c.nascimento_filho_2 || null,
                        user_id: user.id
                    });
                }
            }

            // 4. Limpeza de registros órfãos (Vendas deletadas na planilha)
            // Removemos registros marcados como manual ou com a descrição padrão que não estão no mappedPedidos
            const manualIdsToKeep = mappedPedidos.map(p => p.id);

            // Deletar com base no marcador JSONB 'is_manual', no label 'Planilha Manual' ou se loja_id é nulo
            // Isso garante que a 'camiseta' e outras vendas fantasmas sumam ao sincronizar agora
            const { error: delError } = await (supabase as any)
                .from('bling_pedidos')
                .delete()
                .eq('user_id', user.id)
                .or(`loja_descricao.eq.Planilha Manual,raw->is_manual.eq.true,loja_id.is.null`)
                .not('id', 'in', `(${manualIdsToKeep.join(',')})`);

            if (delError) console.warn('Aviso na limpeza de orfãos:', delError);

            // 5. Upsert Sequencial no Banco
            if (mappedPedidos.length > 0) {
                const { error } = await supabase.from('bling_pedidos').upsert(mappedPedidos);
                if (error) throw error;
            }

            if (productUpserts.length > 0) {
                const { error } = await supabase.from('bling_produtos').upsert(productUpserts);
                if (error) throw error;
            }

            if (customerUpserts.length > 0) {
                const { error } = await supabase.from('growth_customers').upsert(customerUpserts);
                if (error) throw error;
            }

            if (childrenUpserts.length > 0) {
                const { error } = await supabase.from('children').upsert(childrenUpserts);
                if (error) throw error;
            }

            // 5. Recalcular métricas CRM para garantir que o dashboard reflita os dados novos/removidos
            await (blingApi as any).recalculateRFM();


            // 5. Atualizar Meta
            const { count } = await supabase
                .from('bling_pedidos')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            await supabase.from('bling_sync_meta').upsert({
                user_id: user.id,
                status: 'done',
                last_sync: new Date().toISOString(),
                total_rows: count || 0
            });

            toast.success("Sincronização concluída com sucesso!", { id: toastId });
            fetchMeta();
            fetchDropdownData();
        } catch (err: any) {
            console.error('Erro na sincronização:', err);
            toast.error("Falha ao sincronizar: " + (err.message || "Erro de conexão"), { id: toastId });
        } finally {
            setSyncing(false);
        }
    };

    const columns = {
        vendas: [
            { key: 'numero_pedido', label: 'Pedido #', type: 'text', placeholder: 'Ex: 123' },
            { key: 'data', label: 'Data', type: 'date' },
            { key: 'nome_cliente', label: 'Cliente', type: 'select', options: customers.map(c => c.name) },
            { key: 'codigo_produto', label: 'SKU', type: 'select', options: products.map(p => p.codigo) },
            { key: 'nome_produto', label: 'Produto', type: 'select', options: products.map(p => p.nome) },
            { key: 'marca', label: 'Marca', type: 'text', placeholder: 'Auto-preenchido' },
            { key: 'quantidade', label: 'Qtd', type: 'number' },
            { key: 'valor_unitario', label: 'Unitário (R$)', type: 'number' },
            { key: 'desconto_percentual', label: 'Desc %', type: 'number' },
            { key: 'desconto_valor', label: 'Desc R$', type: 'number' },
            { key: 'valor_total', label: 'Total (R$)', type: 'number' },
            { key: 'canal', label: 'Canal', type: 'text' },
            { key: 'telefone', label: 'Telefone', type: 'text' },
        ],
        itens: [
            { key: 'numero_pedido', label: 'Pedido #', type: 'text' },
            { key: 'codigo_produto', label: 'SKU', type: 'select', options: products.map(p => p.codigo) },
            { key: 'nome_produto', label: 'Produto', type: 'select', options: products.map(p => p.nome) },
            { key: 'marca', label: 'Marca', type: 'text' },
            { key: 'quantidade', label: 'Qtd', type: 'number' },
            { key: 'valor_unitario', label: 'Unitário (R$)', type: 'number' },
        ],
        clientes: [
            { key: 'nome', label: 'Nome', type: 'text' },
            { key: 'telefone', label: 'Telefone', type: 'text' },
            { key: 'cpf', label: 'CPF', type: 'text' },
            { key: 'cidade', label: 'Cidade', type: 'text' },
            { key: 'nome_filho_1', label: 'Filho(a) 1', type: 'text' },
            { key: 'nascimento_filho_1', label: 'Nasc. 1', type: 'date' },
            { key: 'nome_filho_2', label: 'Nasc. 2', type: 'date' },
        ],
        produtos: [
            { key: 'sku', label: 'SKU', type: 'text', placeholder: 'Ex: 123' },
            { key: 'nome', label: 'Nome', type: 'text', placeholder: 'Nome do Produto' },
            { key: 'categoria', label: 'Categoria', type: 'text', placeholder: 'Ex: Vestidos' },
            { key: 'marca', label: 'Marca', type: 'text', placeholder: 'Marca/Fornecedor' },
            { key: 'preco', label: 'Preço (R$)', type: 'number' },
        ]
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* Header / Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <RefreshCw className={cn("w-5 h-5 text-primary", syncing && "animate-spin")} />
                    </div>
                    <div>
                        <h3 className="font-medium text-sm">Status da Planilha</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            {syncMeta?.last_sync ? `Sincronizado ${formatDistanceToNow(new Date(syncMeta.last_sync), { addSuffix: true, locale: ptBR })}` : "Aguardando sincronização"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx,.xls" />
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><FileUp className="w-4 h-4 mr-2" /> Importar</Button>
                    <Button variant="outline" size="sm" onClick={handleExport}><FileDown className="w-4 h-4 mr-2" /> Exportar</Button>
                    <Button variant="primary" size="sm" onClick={handleSync} disabled={syncing}><Send className="w-4 h-4 mr-2" /> Sincronizar</Button>
                </div>
            </div>

            {/* Editor Card */}
            <Card className="border shadow-md overflow-hidden">
                <CardHeader className="pb-3 border-b bg-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Editor de Marcas e Vendas</CardTitle>
                            <CardDescription className="text-xs italic text-primary">
                                {lastSaved ? `Rascunho salvo ${formatDistanceToNow(lastSaved, { addSuffix: true, locale: ptBR })}` : "Editor manual de alta performance"}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={handleAddRow} className="hover:bg-primary/5 text-primary"><Plus className="w-4 h-4 mr-1" /> Nova linha</Button>
                            <Button variant="ghost" size="sm" onClick={handleClear} className="text-destructive hover:bg-destructive/5"><Trash2 className="w-4 h-4 mr-1" /> Limpar</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 bg-white">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                        <div className="px-6 border-b bg-gray-50/50">
                            <TabsList className="bg-transparent h-12 gap-6">
                                <TabsTrigger value="vendas" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 h-12 font-medium">Vendas</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="overflow-auto max-h-[600px] relative">
                            <TabsContent value="vendas" className="m-0">
                                <table className="w-full border-collapse text-sm table-fixed min-w-[1000px]">
                                    <thead className="sticky top-0 z-20 bg-gray-100/90 backdrop-blur-sm border-b shadow-sm">
                                        <tr>
                                            <th className="w-12 p-2 border text-center text-[10px] text-gray-400 font-bold uppercase">#</th>
                                            {columns.vendas.map(col => (
                                                <th key={col.key} className="p-3 border text-left font-semibold text-gray-700 uppercase tracking-tighter text-[11px]">
                                                    {col.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {data.vendas.map((row, rowIndex) => (
                                            <tr key={rowIndex} className="hover:bg-gray-50 transition-colors group">
                                                <td className="p-2 border bg-gray-50/50 text-center text-xs text-gray-400 group-hover:bg-gray-100 transition-colors font-medium relative">
                                                    {rowIndex + 1}
                                                    <button
                                                        onClick={() => handleRemoveRow('vendas', rowIndex)}
                                                        className="absolute inset-0 flex items-center justify-center bg-destructive text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Remover linha"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </td>
                                                {columns.vendas.map(col => (
                                                    <td key={col.key} className="p-0 border relative bg-white">
                                                        {col.type === 'select' ? (
                                                            <div className="relative flex items-center">
                                                                <input
                                                                    list={`${col.key}-list`}
                                                                    className="w-full h-11 px-3 bg-white outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-gray-700"
                                                                    value={row[col.key] || ''}
                                                                    onChange={(e) => handleCellChange('vendas', rowIndex, col.key, e.target.value)}
                                                                    placeholder={col.placeholder}
                                                                />
                                                                <datalist id={`${col.key}-list`}>
                                                                    {col.options?.map((opt: string) => <option key={opt} value={opt} />)}
                                                                </datalist>
                                                            </div>
                                                        ) : (
                                                            <input
                                                                type={col.type}
                                                                className="w-full h-11 px-3 bg-white outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-gray-700"
                                                                value={row[col.key] || ''}
                                                                onChange={(e) => handleCellChange('vendas', rowIndex, col.key, e.target.value)}
                                                                placeholder={col.placeholder}
                                                                required={col.key === 'numero_pedido' || col.key === 'nome_cliente'}
                                                            />
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </TabsContent>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Footer Insight */}
            <div className="flex items-center gap-2 p-4 bg-primary/5 rounded-xl border border-primary/10">
                <AlertCircle className="h-5 w-5 text-primary" />
                <p className="text-sm text-gray-600">
                    Os dados preenchidos aqui alimentam instantaneamente seus dashboards de <strong>Lucratividade por Marca</strong> e <strong>Curva de Vendas</strong>.
                </p>
            </div>
        </div>
    );
}
