import { useState, useEffect } from 'react';
import { blingApi } from '@/lib/blingApi';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
    LayoutDashboard,
    ListOrdered,
    Users,
    TrendingUp,
    DollarSign,
    ShoppingCart,
    Search,
    RefreshCw,
    ArrowUpRight,
    MoreHorizontal,
    Baby,
    Cake,
    Database,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Tag,
    AlertTriangle,
    Calendar,
    Filter,
    ArrowRight,
    Table,
    FileSpreadsheet,
    Power,
    Zap,
    Box,
    Info,
    ShieldCheck,
    FileUp,
    FileDown
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdvancedDatePicker } from "@/components/bling/AdvancedDatePicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { BlingDashboard } from '@/components/bling/BlingDashboard';
import { SpreadsheetEditor } from '@/components/bling/SpreadsheetEditor';
import { useDashboardContext } from '@/contexts/DashboardContext';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function BlingSales() {
    const {
        startDate,
        endDate,
        setStartDate,
        setEndDate,
        selectedLabel,
        setSelectedLabel
    } = useDashboardContext();

    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [pedidos, setPedidos] = useState<any[]>([]);
    const [metrics, setMetrics] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [lojaNames, setLojaNames] = useState<Record<string, string>>({});
    const [isCompare, setIsCompare] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [customerDetails, setCustomerDetails] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
    const [syncMeta, setSyncMeta] = useState<{ last_sync: string; total_rows: number; status: string } | null>(null);
    const [crmSort, setCrmSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'totalGasto', direction: 'desc' });
    const [brandMetrics, setBrandMetrics] = useState<any[]>([]);
    const [productMetrics, setProductMetrics] = useState<any[]>([]);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [syncingProducts, setSyncingProducts] = useState(false);
    const [reprocessingBrands, setReprocessingBrands] = useState(false);
    const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
    const [brandMap, setBrandMap] = useState<Record<string, string>>({});
    const [blingActive, setBlingActive] = useState(true);
    const [blingClientId, setBlingClientId] = useState('');
    const [blingClientSecret, setBlingClientSecret] = useState('');
    const [loadingCredentials, setLoadingCredentials] = useState(false);

    const fetchBlingConfig = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('bling_config')
                .select('client_id, client_secret')
                .eq('user_id', user.id)
                .maybeSingle();

            if (data) {
                setBlingClientId(data.client_id || '');
                setBlingClientSecret(data.client_secret || '');
            }
        } catch (error) {
            console.error('Erro ao buscar config do Bling:', error);
        }
    };

    const handleSaveCredentials = async () => {
        setLoadingCredentials(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            const { error } = await supabase
                .from('bling_config')
                .upsert({
                    user_id: user.id,
                    client_id: blingClientId,
                    client_secret: blingClientSecret,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            toast.success("Credenciais salvas com sucesso!");
        } catch (error: any) {
            toast.error("Erro ao salvar credenciais: " + error.message);
        } finally {
            setLoadingCredentials(false);
        }
    };

    /** Lê pedidos do cache local (Supabase) — rápido, sem limite de período */
    const fetchData = async () => {
        setLoading(true);
        try {
            await fetchBlingConfig();
            const localPedidos = await blingApi.getLocalPedidos(startDate, endDate);
            setPedidos(localPedidos);
            // ... resto do fetchData igual
            // 2. Buscar faturamento por marca
            const salesByBrand = await blingApi.getSalesByBrand(startDate, endDate);
            setBrandMetrics(salesByBrand);

            // 3. Criar mapa de marcas para o calculateMetrics
            const bMap: Record<string, string> = {};
            const { data: produtos } = await (supabase as any)
                .from('bling_produtos')
                .select('codigo, marca');
            produtos?.forEach((p: any) => {
                if (p.codigo) bMap[p.codigo.trim()] = p.marca;
            });
            setBrandMap(bMap);

            setMetrics(blingApi.calculateMetrics(localPedidos, lojaNames, selectedBrand || undefined, bMap));

            const products = await blingApi.getSalesByProduct(startDate, endDate);
            setProductMetrics(products);

            // Refresh sync meta
            const meta = await blingApi.getSyncMeta();
            setSyncMeta(meta);

            // Sincroniza estado local com o banco
            if (meta?.status === 'inactive') {
                setBlingActive(false);
            } else if (meta?.status === 'active') {
                setBlingActive(true);
            }

            // Removido toast de cache vazio para evitar poluição visual e confusão
            // quando há dados parciais ou filtros ativos.
        } catch (error: any) {
            toast.error('Erro ao carregar cache local: ' + (error.message || 'Erro desconhecido'));
        } finally {
            setLoading(false);
        }
    };

    /** Sincroniza o catálogo de produtos/marcas */
    const handleSyncProducts = async () => {
        setSyncingProducts(true);
        const toastId = toast.loading('Sincronizando catálogo de marcas do Bling...');
        try {
            const count = await blingApi.syncAllProducts((curr) => {
                toast.loading(`Sincronizando marcas: ${curr} produtos...`, { id: toastId });
            });
            toast.success(`${count} produtos com marcas sincronizados!`, { id: toastId });
            await fetchData();
        } catch (error: any) {
            toast.error('Erro ao sincronizar marcas: ' + error.message, { id: toastId });
        } finally {
            setSyncingProducts(false);
        }
    };

    /** Reprocessa marcas a partir de nomes já salvos */
    const handleReprocessBrands = async () => {
        setReprocessingBrands(true);
        const toastId = toast.loading('Re-analisando nomes dos produtos no banco...');
        try {
            const count = await blingApi.reprocessBrands((curr, total) => {
                toast.loading(`Analisando: ${curr}/${total} produtos...`, { id: toastId });
            });
            toast.success(`${count} produtos tiveram a marca atualizada com sucesso!`, { id: toastId });
            await fetchData();
        } catch (error: any) {
            toast.error('Erro ao reprocessar marcas: ' + error.message, { id: toastId });
        } finally {
            setReprocessingBrands(false);
        }
    };

    /** Sincroniza do Bling para o Supabase (processo em background) */
    const handleSync = async () => {
        setSyncing(true);
        const toastId = toast.loading('Iniciando sincronização...');
        let attempts = 0;
        const maxAttempts = 6; // ~10 minutos total
        let currentPage = 1;
        let totalUpsertedAll = 0;

        try {
            while (attempts < maxAttempts) {
                toast.loading(`Sincronizando... Página ${currentPage}`, { id: toastId });
                const result = await blingApi.syncPedidosToLocal(startDate, endDate, currentPage);

                if ((result as any).success === false) {
                    throw new Error((result as any).error || 'Erro interno na função');
                }

                totalUpsertedAll += result.upserted;

                if (!result.partial) {
                    toast.success(
                        `Sincronização concluída! ${totalUpsertedAll} pedidos atualizados.`,
                        { id: toastId, duration: 6000 }
                    );
                    break;
                }

                // Se parcial, prepara para o próximo loop
                currentPage = result.nextPage || (currentPage + 1);
                attempts++;

                if (attempts >= maxAttempts) {
                    toast.success(
                        `Sync parcial concluído (${totalUpsertedAll} pedidos). Clique em sincronizar novamente para continuar.`,
                        { id: toastId }
                    );
                }

                // Pequeno delay entre blocos
                await new Promise(r => setTimeout(r, 2000));
            }

            await fetchData();
        } catch (error: any) {
            toast.error('Erro na sincronização: ' + (error.message || 'Erro desconhecido'), { id: toastId });
        } finally {
            setSyncing(false);
            setSyncProgress({ current: 0, total: 0 });
        }
    };

    useEffect(() => {
        const fetchLojas = async () => {
            try {
                const response = await blingApi.getCanaisVenda();
                const data = response.data || [];
                const mapping: Record<string, string> = {};
                data.forEach((l: any) => {
                    mapping[String(l.id)] = l.descricao || l.nome;
                });
                setLojaNames(mapping);
            } catch (error: any) {
                console.error('Erro ao buscar nomes das lojas:', error);
                // Não trava o dashboard se os nomes das lojas falharem
            }
        };
        fetchLojas();
    }, []);

    const handleCustomerClick = async (customer: any) => {
        setSelectedCustomer(customer);
        setCustomerDetails(null);
        setLoadingDetails(true);
        try {
            const firstPedido = customer.pedidos[0];
            const contatoId = firstPedido?.contato?.id || firstPedido?.contato_id;

            if (contatoId) {
                const response = await blingApi.getContato(contatoId);
                const fullData = response.data;
                const family = blingApi.extractFamilyData(fullData.observacao || "");
                setCustomerDetails({ ...fullData, family });
            }
        } catch (error) {
            console.error('Erro ao buscar detalhes do cliente:', error);
            toast.error("Não foi possível carregar os detalhes do cliente");
        } finally {
            setLoadingDetails(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [startDate, endDate, lojaNames, selectedBrand]);

    const handleSyncToCRM = async () => {
        if (!metrics?.customers || metrics.customers.length === 0) {
            toast.error("Nenhum cliente carregado para sincronizar.");
            return;
        }

        const confirm = window.confirm(`Deseja sincronizar ${metrics.customers.length} clientes com a aba Clientes? Isso atualizará métricas de LTV e cadastrará novos dados familiares.`);
        if (!confirm) return;

        setSyncing(true);
        const toastId = toast.loading(`Sincronizando ${metrics.customers.length} clientes...`);

        try {
            const results = await blingApi.syncCustomersToCRM(metrics.customers, (current, total) => {
                setSyncProgress({ current, total });
                toast.loading(`Sincronizando: ${current}/${total} clientes...`, { id: toastId });
            });

            toast.success(`Sincronização concluída com sucesso!`, {
                id: toastId,
                description: `${results.syncedCount} responsáveis e ${results.childrenCount} crianças foram atualizados/cadastrados.`
            });
        } catch (error: any) {
            console.error('Erro na sincronização:', error);
            toast.error("Falha na sincronização: " + (error.message || "Erro desconhecido"), { id: toastId });
        } finally {
            setSyncing(false);
            setSyncProgress({ current: 0, total: 0 });
        }
    };

    const filteredPedidos = pedidos.filter(p => {
        const matchesSearch =
            p.contato?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(p.numero || '').includes(searchTerm);

        if (!selectedBrand) return matchesSearch;

        const itens = Array.isArray(p.itens) ? p.itens : (Array.isArray(p.itens?.data) ? p.itens.data : []);
        const normSelected = blingApi.normalizeBrand(selectedBrand);

        const hasBrand = itens.some((item: any) => {
            const sku = String(item.codigo || '').trim();
            let itemMarca = (sku && brandMap[sku]) || '';
            if (!itemMarca || itemMarca.toLowerCase() === 'sem marca' || itemMarca === 'Outros / Sem Marca') {
                itemMarca = blingApi.extractBrandFromName(item.nome || item.descricao || '');
            }
            return blingApi.normalizeBrand(itemMarca) === normSelected;
        });

        return matchesSearch && hasBrand;
    });

    const handleSort = (key: string) => {
        setCrmSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const sortedCustomers = [...(metrics?.customers || [])].sort((a, b) => {
        const { key, direction } = crmSort;
        let valA = a[key];
        let valB = b[key];

        // Tratamento especial para datas
        if (key === 'ultimaVenda') {
            valA = new Date(valA).getTime();
            valB = new Date(valB).getTime();
        }

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    const SortIcon = ({ column }: { column: string }) => {
        if (crmSort.key !== column) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
        return crmSort.direction === 'asc'
            ? <ArrowUp className="w-3 h-3 ml-1 text-primary" />
            : <ArrowDown className="w-3 h-3 ml-1 text-primary" />;
    };

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-medium tracking-tight">Vendas & CRM</h1>
                    <p className="text-muted-foreground">Analise seu faturamento, LTV e comportamento de clientes.</p>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <AdvancedDatePicker
                        dateStart={startDate}
                        dateEnd={endDate}
                        label={selectedLabel}
                        compare={isCompare}
                        onRangeSelect={(start, end, label, compare) => {
                            setStartDate(start);
                            setEndDate(end);
                            setSelectedLabel(label);
                            setIsCompare(!!compare);
                        }}
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchData}
                        disabled={loading || syncing}
                        className="h-10 px-3"
                    >
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="manual-entry" className="space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-muted/20 p-2 rounded-xl border border-border/50">
                    <TabsList className="bg-transparent p-0 gap-2 h-auto">
                        <TabsTrigger
                            value="manual-entry"
                            className="data-[state=active]:bg-background data-[state=active]:shadow-none px-6 py-2.5 rounded-lg border border-transparent data-[state=active]:border-border gap-2 transition-all"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            <div className="text-left">
                                <p className="text-sm font-medium leading-tight">Entrada Manual</p>
                                <p className="text-[10px] text-muted-foreground font-normal">Editor de Planilha</p>
                            </div>
                        </TabsTrigger>
                        <TabsTrigger
                            value="bling-erp"
                            className="data-[state=active]:bg-background data-[state=active]:shadow-none px-6 py-2.5 rounded-lg border border-transparent data-[state=active]:border-border gap-2 transition-all"
                        >
                            <Database className="w-4 h-4" />
                            <div className="text-left">
                                <p className="text-sm font-medium leading-tight">Painel Bling</p>
                                <p className="text-[10px] text-muted-foreground font-normal">Integração via API v3</p>
                            </div>
                        </TabsTrigger>
                        <TabsTrigger
                            value="config"
                            className="data-[state=active]:bg-background data-[state=active]:shadow-none px-6 py-2.5 rounded-lg border border-transparent data-[state=active]:border-border gap-2 transition-all"
                        >
                            <Power className="w-4 h-4" />
                            <div className="text-left">
                                <p className="text-sm font-medium leading-tight">Configuração</p>
                                <p className="text-[10px] text-muted-foreground font-normal">Ajustes da API</p>
                            </div>
                        </TabsTrigger>
                    </TabsList>

                    <Button
                        onClick={handleSync}
                        disabled={syncing || loading || !blingActive}
                        size="sm"
                        className={cn("gap-2 shadow-none", blingActive ? "shadow-primary/20" : "opacity-50 cursor-not-allowed")}
                        title={!blingActive ? "Integração desativada" : (syncMeta ? `Última sync: ${new Date(syncMeta.last_sync).toLocaleString('pt-BR')} • ${syncMeta.total_rows} pedidos` : 'Nenhuma sync realizada ainda')}
                    >
                        <Database className={cn("w-3 h-3", syncing && "animate-spin")} />
                        {syncing ? 'Sincronizando...' : 'Sincronizar Bling'}
                    </Button>
                </div>

                <TabsContent value="manual-entry" className="space-y-6">
                    <SpreadsheetEditor />
                </TabsContent>

                <TabsContent value="bling-erp" className="space-y-6">
                    {!blingActive && (
                        <Card className="bg-yellow-500/10 border-yellow-500/20 mb-6">
                            <CardContent className="flex items-center gap-4 py-4">
                                <AlertTriangle className="w-6 h-6 text-yellow-500" />
                                <div>
                                    <p className="font-medium text-yellow-600 dark:text-yellow-400">Integração Bling Desativada</p>
                                    <p className="text-sm text-yellow-600/80 dark:text-yellow-400/80">
                                        A sincronização automática e comunicação com a API estão suspensas. Ative nas configurações se desejar retomar.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Tabs defaultValue="dashboard" className="space-y-6">
                        <TabsList className="bg-muted/50 p-1">
                            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                            <TabsTrigger value="vendas">Pedidos</TabsTrigger>
                            <TabsTrigger value="marcas">Marcas</TabsTrigger>
                            <TabsTrigger value="produtos">Produtos</TabsTrigger>
                            <TabsTrigger value="crm">CRM</TabsTrigger>
                        </TabsList>

                        <TabsContent value="dashboard" className="space-y-6">
                            <BlingDashboard metrics={metrics} pedidos={pedidos} />
                        </TabsContent>

                        <TabsContent value="vendas" className="mt-6">
                            <Card className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="text-lg font-medium text-primary">Listagem de Pedidos</h3>
                                        <p className="text-sm text-muted-foreground">Todos os pedidos sincronizados do Bling no período.</p>
                                    </div>
                                    <div className="relative w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar pedido ou cliente..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>

                                <div className="rounded-md border overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr className="text-left font-medium border-b">
                                                <th className="p-3">Data</th>
                                                <th className="p-3">Número</th>
                                                <th className="p-3">Cliente</th>
                                                <th className="p-3">Situação</th>
                                                <th className="p-3 text-right">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {filteredPedidos.map((p: any) => (
                                                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="p-3 text-muted-foreground">{formatDate(p.data)}</td>
                                                    <td className="p-3 font-medium">#{p.numero}</td>
                                                    <td className="p-3 font-medium">{p.contato?.nome}</td>
                                                    <td className="p-3">
                                                        <span className={cn(
                                                            "text-[10px] font-medium px-2 py-0.5 rounded-full",
                                                            p.situacao_id === 6 ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
                                                        )}>
                                                            {p.situacao?.descricao || 'Processado'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-right font-medium text-foreground">
                                                        {formatCurrency(p.total)}
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredPedidos.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="p-8 text-center text-muted-foreground italic">
                                                        Nenhum pedido encontrado para o período ou busca.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="marcas" className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-medium">Análise de Faturamento por Marca</h3>
                                    <p className="text-sm text-muted-foreground">Baseado nos itens vendidos no período selecionado.</p>
                                </div>
                                <Button
                                    onClick={handleSyncProducts}
                                    disabled={syncingProducts}
                                    variant="ghost"
                                    size="sm"
                                    className="gap-2 text-muted-foreground hover:text-primary"
                                >
                                    <RefreshCw className={cn("w-4 h-4", syncingProducts && "animate-spin")} />
                                    {syncingProducts ? 'Sincronizando Marcas...' : 'Sincronizar Catálogo'}
                                </Button>
                                <Button
                                    onClick={handleReprocessBrands}
                                    disabled={reprocessingBrands || syncingProducts}
                                    variant="ghost"
                                    size="sm"
                                    className="gap-2 text-muted-foreground hover:text-primary"
                                    title="Aplica a nova inteligência de extração aos produtos já sincronizados anteriormente."
                                >
                                    <Tag className={cn("w-4 h-4", reprocessingBrands && "animate-spin")} />
                                    {reprocessingBrands ? 'Reprocessando...' : 'Atualizar Heurística'}
                                </Button>
                            </div>

                            {brandMetrics.length === 0 ? (
                                <Card>
                                    <CardContent className="flex flex-col items-center justify-center py-12">
                                        <Tag className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                                        <div className="text-center space-y-4">
                                            <p className="text-foreground font-medium leading-relaxed">
                                                Nenhuma marca encontrada ou sincronizada ainda.
                                            </p>
                                            <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg max-w-md mx-auto text-left space-y-2">
                                                <p className="text-xs font-medium text-primary flex items-center gap-2">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    COMO RESOLVER:
                                                </p>
                                                <ol className="text-xs text-foreground font-medium space-y-1 ml-4 list-decimal">
                                                    <li>Vá na aba <strong>Conexão</strong> e clique em <strong>Desconectar</strong> e depois em <strong>Conectar Agora</strong> (necessário para ativar novas permissões de marcas).</li>
                                                    <li>Clique no botão roxo <strong>Sincronizar do Bling</strong> (topo da página) para baixar os pedidos recentes.</li>
                                                    <li>Clique no botão <strong>Sincronizar Catálogo de Marcas</strong> acima deste card.</li>
                                                </ol>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm font-medium">Top Marcas por Faturamento</CardTitle>
                                        </CardHeader>
                                        <CardContent className="h-[450px] pt-4">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={brandMetrics.filter(bm => bm.marca !== 'Outros / Sem Marca').slice(0, 15)}
                                                    layout="vertical"
                                                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                                                    <XAxis
                                                        type="number"
                                                        stroke="hsl(var(--muted-foreground))"
                                                        fontSize={10}
                                                        tickLine={false}
                                                        axisLine={false}
                                                        tickFormatter={(value) => `R$ ${value}`}
                                                    />
                                                    <YAxis
                                                        dataKey="marca"
                                                        type="category"
                                                        stroke="hsl(var(--foreground))"
                                                        fontSize={11}
                                                        fontWeight="bold"
                                                        tickLine={false}
                                                        axisLine={false}
                                                        width={100}
                                                    />
                                                    <Tooltip
                                                        cursor={{ fill: 'hsl(var(--primary))', opacity: 0.1 }}
                                                        contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontWeight: 'bold' }}
                                                        formatter={(value: any) => formatCurrency(value)}
                                                    />
                                                    <Bar
                                                        dataKey="faturamento"
                                                        fill="hsl(var(--primary))"
                                                        radius={[0, 4, 4, 0]}
                                                        barSize={20}
                                                    />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm font-medium">Ranking Detalhado</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                {brandMetrics
                                                    .filter(bm => bm.marca !== 'Outros / Sem Marca')
                                                    .map((item, idx) => (
                                                        <div key={idx} className="flex items-center justify-between group">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                                                                    {idx + 1}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium text-foreground">{item.marca}</p>
                                                                    <p className="text-xs text-foreground font-medium">{item.qtdItens} itens vendidos</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-sm font-black text-foreground">{formatCurrency(item.faturamento)}</p>
                                                                <p className="text-[10px] text-primary font-medium">TM: {formatCurrency(item.ticketMedio)}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="produtos" className="mt-6">
                            <div className="space-y-6">

                                <Card className="p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h3 className="text-lg font-medium text-primary">Ranking de Produtos Vendidos</h3>
                                            <p className="text-sm text-muted-foreground">Detalhamento por item e faturamento individual.</p>
                                        </div>
                                        <div className="relative w-72">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Buscar produto ou SKU..."
                                                value={productSearchTerm}
                                                onChange={(e) => setProductSearchTerm(e.target.value)}
                                                className="pl-9"
                                            />
                                        </div>
                                    </div>

                                    <Card className="border-muted/50">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium flex justify-between">
                                                <span>Lista de Itens</span>
                                                <span className="text-muted-foreground font-normal">
                                                    {productMetrics
                                                        .filter(p => !selectedBrand || blingApi.normalizeBrand(p.marca) === blingApi.normalizeBrand(selectedBrand))
                                                        .filter(p =>
                                                            p.nome.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                                                            p.codigo.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                                                            p.marca.toLowerCase().includes(productSearchTerm.toLowerCase())
                                                        ).length} produtos encontrados
                                                </span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="rounded-md border overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-muted/50">
                                                        <tr className="text-left font-medium border-b">
                                                            <th className="p-3 w-16">Rank</th>
                                                            <th className="p-3">Produto</th>
                                                            <th className="p-3 w-40">Marca</th>
                                                            <th className="p-3 w-20 text-center">Qtd</th>
                                                            <th className="p-3 w-32 text-right">Faturamento</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y">
                                                        {productMetrics
                                                            // Filtro de marca no ranking de produtos
                                                            .filter(p => !selectedBrand || blingApi.normalizeBrand(p.marca) === blingApi.normalizeBrand(selectedBrand))
                                                            .filter(p =>
                                                                p.nome.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                                                                p.codigo.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                                                                p.marca.toLowerCase().includes(productSearchTerm.toLowerCase())
                                                            )
                                                            .slice(0, 100)
                                                            .map((item, idx) => (
                                                                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                                                    <td className="p-3 font-medium text-muted-foreground">{idx + 1}</td>
                                                                    <td className="p-3">
                                                                        <div className="font-medium">{item.nome}</div>
                                                                        <div className="text-xs text-muted-foreground">{item.codigo}</div>
                                                                    </td>
                                                                    <td className="p-3">
                                                                        <span className={item.marca === 'Outros / Sem Marca' ? "text-muted-foreground italic" : "font-medium text-primary"}>
                                                                            {item.marca}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-3 text-center">{item.qtd}</td>
                                                                    <td className="p-3 text-right font-medium text-primary">{formatCurrency(item.faturamento)}</td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {productMetrics.length > 100 && productSearchTerm === '' && (
                                                <p className="text-center text-xs text-muted-foreground mt-4">Mostrando os top 100 produtos por faturamento.</p>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="crm" className="space-y-6">
                            <Card className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="text-lg font-medium text-primary">CRM de Clientes</h3>
                                        <p className="text-sm text-muted-foreground">Gestão de LTV e dados familiares.</p>
                                    </div>
                                    <Button onClick={handleSyncToCRM} disabled={syncing} className="gap-2">
                                        <Users className="w-4 h-4" />
                                        Sincronizar com Clientes
                                    </Button>
                                </div>

                                <div className="rounded-md border overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr className="text-left font-medium border-b">
                                                <th className="p-3 cursor-pointer" onClick={() => handleSort('nome')}>Cliente <SortIcon column="nome" /></th>
                                                <th className="p-3 cursor-pointer text-right" onClick={() => handleSort('totalGasto')}>Gasto Total <SortIcon column="totalGasto" /></th>
                                                <th className="p-3 cursor-pointer text-center" onClick={() => handleSort('qtdPedidos')}>Pedidos <SortIcon column="qtdPedidos" /></th>
                                                <th className="p-3 cursor-pointer text-right" onClick={() => handleSort('ultimaVenda')}>Última Venda <SortIcon column="ultimaVenda" /></th>
                                                <th className="p-3 w-16"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {sortedCustomers.map((c: any) => (
                                                <tr key={c.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => handleCustomerClick(c)}>
                                                    <td className="p-3 font-medium">{c.nome}</td>
                                                    <td className="p-3 text-right font-medium">{formatCurrency(c.totalGasto)}</td>
                                                    <td className="p-3 text-center">{c.qtdPedidos}</td>
                                                    <td className="p-3 text-right text-muted-foreground">{formatDate(c.ultimaVenda)}</td>
                                                    <td className="p-3 text-center"><ArrowRight className="w-4 h-4 text-muted-foreground" /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </TabsContent>


                <TabsContent value="config" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Status Panel */}
                        <Card className="lg:col-span-1 p-6 space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                                    <Zap className="w-5 h-5" />
                                    Conector Bling
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">Gerencie sua integração oficial via API v3.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-3 h-3 rounded-full animate-pulse", blingActive ? "bg-success" : "bg-muted")} />
                                        <span className="text-sm font-semibold">{blingActive ? 'Sincronização Ativa' : 'Integração Pausada'}</span>
                                    </div>
                                    <Switch
                                        checked={blingActive}
                                        onCheckedChange={async (val) => {
                                            setBlingActive(val);
                                            try {
                                                await blingApi.updateSyncStatus(val);
                                                toast.success(`Integração Bling ${val ? 'ativada' : 'desativada'}`);
                                            } catch (err) { toast.error("Erro ao salvar."); }
                                        }}
                                    />
                                </div>

                                <div className="p-4 bg-accent-subtle rounded-xl border border-primary/10 space-y-4">
                                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Credenciais da API</h4>

                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-medium text-muted-foreground">Bling Client ID</label>
                                            <Input
                                                type="password"
                                                value={blingClientId}
                                                onChange={(e) => setBlingClientId(e.target.value)}
                                                placeholder="Insira o Client ID..."
                                                className="h-8 text-xs bg-white/50"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-medium text-muted-foreground">Bling Client Secret</label>
                                            <Input
                                                type="password"
                                                value={blingClientSecret}
                                                onChange={(e) => setBlingClientSecret(e.target.value)}
                                                placeholder="Insira o Client Secret..."
                                                className="h-8 text-xs bg-white/50"
                                            />
                                        </div>
                                        <Button
                                            size="sm"
                                            className="w-full h-8 text-xs font-bold"
                                            onClick={handleSaveCredentials}
                                            disabled={loadingCredentials}
                                        >
                                            <ShieldCheck className="w-3 h-3 mr-2" />
                                            {loadingCredentials ? 'Salvando...' : 'Salvar Credenciais'}
                                        </Button>
                                    </div>

                                    <div className="pt-2 border-t border-primary/5 space-y-2">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-muted-foreground font-medium">Status do Token</span>
                                            <span className="font-bold text-accent">Válido</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-muted-foreground font-medium">Última Sync</span>
                                            <span className="font-bold text-gray-900">{syncMeta ? new Date(syncMeta.last_sync).toLocaleDateString('pt-BR') : 'Nunca'}</span>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full text-[10px] h-8 mt-2 border-primary/20 hover:bg-primary/5 text-primary font-bold transition-all"
                                            onClick={() => blingApi.connect(blingClientId)}
                                        >
                                            <RefreshCw className="w-3 h-3 mr-2" />
                                            Reautenticar Bling
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t space-y-2">
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ferramentas de Suporte</h4>
                                <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-9 hover:bg-destructive/5 hover:text-destructive" onClick={handleReprocessBrands}>
                                    <Tag className="w-3.5 h-3.5 mr-2" />
                                    Reprocessar Marcas
                                </Button>
                                <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-9" onClick={handleSyncProducts}>
                                    <Box className="w-3.5 h-3.5 mr-2" />
                                    Sincronizar Catálogo
                                </Button>
                            </div>
                        </Card>

                        {/* Onboarding Guide */}
                        <Card className="lg:col-span-2 p-8 space-y-8 bg-white border border-border/60">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-accent-subtle rounded-2xl">
                                    <Info className="w-6 h-6 text-accent" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 leading-none">Guia de Configuração Bling API v3</h3>
                                    <p className="text-sm text-muted-foreground mt-2">Siga estes passos para conectar sua conta à Mimagi Profit.</p>
                                </div>
                            </div>

                            <div className="grid gap-6">
                                <div className="flex gap-4 group">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-400 group-hover:bg-primary group-hover:text-white transition-colors">1</div>
                                    <div className="space-y-1">
                                        <p className="font-semibold text-gray-800">Crie um Aplicativo no Bling</p>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            Acesse <strong>Configurações {">"} Todas as Configurações {">"} Integrações {">"} Configurações de integração</strong> e clique em
                                            "Incluir Integração". Escolha <strong>API V3</strong>.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4 group">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-400 group-hover:bg-primary group-hover:text-white transition-colors">2</div>
                                    <div className="space-y-1">
                                        <p className="font-semibold text-gray-800">Configure o Redirecionamento</p>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            Nas configurações do aplicativo, defina a URL de Redirecionamento como:<br />
                                            <code className="bg-muted px-2 py-1 rounded text-xs text-primary font-mono select-all">
                                                {window.location.origin}/callback
                                            </code>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4 group">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-400 group-hover:bg-primary group-hover:text-white transition-colors">3</div>
                                    <div className="space-y-1">
                                        <p className="font-semibold text-gray-800">Preencha as Credenciais</p>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            Copie o <strong>Client ID</strong> e o <strong>Client Secret</strong> gerados no Bling, cole nos campos acima e clique em <strong>"Salvar Credenciais"</strong>.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4 group">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-400 group-hover:bg-primary group-hover:text-white transition-colors">4</div>
                                    <div className="space-y-1">
                                        <p className="font-semibold text-gray-800">Conecte e Autorize</p>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            Clique no botão <strong>"Reautenticar Bling"</strong> ao lado e autorize as permissões de leitura de pedidos, contatos e produtos.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3 items-start">
                                <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5" />
                                <div className="text-xs text-blue-800 leading-relaxed">
                                    <strong>Segurança Garantida:</strong> Seus dados são processados via integração oficial Oauth2. Não armazenamos sua senha, apenas uma chave de acesso segura com validade limitada.
                                </div>
                            </div>
                        </Card>
                    </div>
                </TabsContent >
            </Tabs >

            <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Detalhes do Cliente</DialogTitle>
                        <DialogDescription>
                            Informações extraídas do Bling e inteligência de CRM.
                        </DialogDescription>
                    </DialogHeader>

                    {loadingDetails ? (
                        <div className="py-12 flex flex-col items-center justify-center space-y-4">
                            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                            <p className="text-sm text-muted-foreground">Carregando dados completos...</p>
                        </div>
                    ) : selectedCustomer ? (
                        <div className="space-y-6 pt-4">
                            <div className="bg-muted/30 p-4 rounded-xl border border-border">
                                <h3 className="text-lg font-medium text-foreground">{selectedCustomer.nome}</h3>
                                <div className="grid grid-cols-2 gap-4 mt-3">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px]   font-medium text-muted-foreground">Total de Vendas</p>
                                        <p className="text-xl font-black text-primary">{formatCurrency(selectedCustomer.totalGasto)}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[10px]   font-medium text-muted-foreground">Volume</p>
                                        <p className="text-xl font-black text-foreground">{selectedCustomer.qtdPedidos} pedidos</p>
                                    </div>
                                </div>
                            </div>

                            {customerDetails?.family && customerDetails.family.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-medium flex items-center gap-2 text-primary">
                                        <Baby className="w-4 h-4" />
                                        Dados da Família (Filhos)
                                    </h4>
                                    <div className="space-y-2">
                                        {customerDetails.family.map((filho: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/10">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                                        <Baby className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium capitalize">{filho.nome}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {filho.dataNascimento} • {filho.idade} {filho.idade === 1 ? 'ano' : 'anos'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-xs font-medium text-primary/60">Aniversário</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {customerDetails?.observacao && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-muted-foreground">Observações Originais</h4>
                                    <div className="p-3 bg-muted/50 rounded-lg text-xs leading-relaxed max-h-32 overflow-y-auto italic">
                                        {customerDetails.observacao}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end pt-4 border-t border-border">
                                <Button onClick={() => setSelectedCustomer(null)} className="rounded-full px-8">
                                    Fechar
                                </Button>
                            </div>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div >
    );
}

export default BlingSales;
