import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ShoppingCart, TrendingUp, Clock, Package, Eye, MessageSquare, Loader2, Settings, Bug } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface DashboardData {
    summary: {
        totalOrders: number;
        revenue: number;
        pendingOrders: number;
        activeAds: number;
        visits: number;
        adCost: number;
        adSales: number;
        acos: number;
        revenueGrowth: number;
        ordersGrowth: number;
    };
    recentOrders: Array<{
        id: string;
        buyer: string;
        status: string;
        value: string;
        date: string;
    }>;
    lowStockAds: Array<{
        title: string;
        sku: string;
        qty: number;
    }>;
    unansweredQuestions: Array<{
        id: string;
        question: string;
        ad: string;
    }>;
    chartData: any[];
}

const MLDashboard = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isConfigured, setIsConfigured] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [data, setData] = useState<DashboardData | null>(null);
    const [isDebugging, setIsDebugging] = useState(false);
    const [debugResult, setDebugResult] = useState<any>(null);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const { data: config } = await supabase
                .from('ml_config')
                .select('id')
                .maybeSingle();

            setIsConfigured(!!config);

            if (config) {
                const { data: dashboardData, error: dashboardError } = await supabase.functions.invoke('ml-dashboard');
                if (dashboardError) throw dashboardError;
                setData(dashboardData);
            } else {
                setData({
                    summary: {
                        totalOrders: 0,
                        revenue: 0,
                        pendingOrders: 0,
                        activeAds: 0,
                        visits: 0,
                        adCost: 0,
                        adSales: 0,
                        acos: 0,
                        revenueGrowth: 0,
                        ordersGrowth: 0
                    },
                    recentOrders: [],
                    lowStockAds: [],
                    unansweredQuestions: [],
                    chartData: []
                });
            }
        } catch (error: any) {
            console.error('Error fetching ML data:', error);
            toast({
                title: "Erro ao carregar dados",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [toast]);

    const handleSync = async () => {
        try {
            setIsSyncing(true);
            const { data: syncData, error: syncError } = await supabase.functions.invoke('ml-sync');

            if (syncError) throw syncError;
            if (syncData?.success === false) throw new Error(syncData.error);

            toast({
                title: "Sincronização concluída",
                description: `Importados ${syncData.orders} pedidos e ${syncData.ads} anúncios (incluindo métricas de Ads).`,
            });

            // Refresh data
            fetchData();
        } catch (error: any) {
            toast({
                title: "Erro na sincronização",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDebug = async () => {
        try {
            setIsDebugging(true);
            setDebugResult(null);
            const { data: result, error } = await supabase.functions.invoke('ml-debug');
            if (error) throw error;
            setDebugResult(result);
        } catch (error: any) {
            setDebugResult({ erro: error.message });
        } finally {
            setIsDebugging(false);
        }
    };

    if (isLoading && !data) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Mercado Livre Dashboard</h1>
                <div className="flex gap-2">
                    {isConfigured && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="border-yellow-600 text-yellow-700 hover:bg-yellow-50"
                        >
                            {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                            Sincronizar
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDebug}
                        disabled={isDebugging}
                        className="border-gray-400 text-gray-600 hover:bg-gray-50"
                    >
                        {isDebugging ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bug className="w-4 h-4 mr-2" />}
                        Diagnóstico API
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate("/mercadolivre/configuracoes")}>
                        <Settings className="w-4 h-4 mr-2" />
                        Configurações
                    </Button>
                </div>
            </div>

            {!isConfigured && (
                <Alert variant="destructive" className="bg-yellow-50 border-yellow-200 text-yellow-800">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertTitle className="text-yellow-900 font-semibold">Integração não configurada</AlertTitle>
                    <AlertDescription className="text-yellow-800">
                        Você ainda não configurou a integração com o Mercado Livre.{" "}
                        <Link to="/mercadolivre/configuracoes" className="font-bold underline hover:text-yellow-900">
                            Clique aqui para configurar
                        </Link>
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total de Pedidos</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.summary.totalOrders || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Análise dos últimos 30 dias
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Receita Bruta</CardTitle>
                        <TrendingUp className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data?.summary.revenue || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Pedidos pagos
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Visitas Totais</CardTitle>
                        <Eye className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.summary.visits.toLocaleString() || 0}</div>
                        <p className="text-xs text-muted-foreground">Orgânico + Ads</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Anúncios Ativos</CardTitle>
                        <Package className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.summary.activeAds || 0}</div>
                        <p className="text-xs text-muted-foreground">Publicados no ML</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-yellow-50/50 border-yellow-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-yellow-800">Investimento Product Ads</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data?.summary.adCost || 0)}
                        </div>
                        <p className="text-xs text-yellow-700">Últimos 7 dias</p>
                    </CardContent>
                </Card>
                <Card className="bg-green-50/50 border-green-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-800">Faturamento via Ads</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data?.summary.adSales || 0)}
                        </div>
                        <p className="text-xs text-green-700">Conversão direta</p>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50/50 border-blue-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-800">ACOS Médio</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900">
                            {(data?.summary.acos || 0).toFixed(2)}%
                        </div>
                        <p className="text-xs text-blue-700">Publicidade / Vendas</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Últimos Pedidos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="relative w-full overflow-auto">
                            <table className="w-full caption-bottom text-sm">
                                <thead className="[&_tr]:border-b">
                                    <tr className="border-b transition-colors hover:bg-muted/50">
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">ID</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Comprador</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data?.recentOrders.map((order) => (
                                        <tr key={order.id} className="border-b transition-colors hover:bg-muted/50">
                                            <td className="p-4 align-middle font-medium">{order.id}</td>
                                            <td className="p-4 align-middle">{order.buyer}</td>
                                            <td className="p-4 align-middle">{order.status}</td>
                                            <td className="p-4 align-middle">{order.value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Perguntas Pendentes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data?.unansweredQuestions.length ? (
                                data.unansweredQuestions.map((q) => (
                                    <div key={q.id} className="space-y-2 border-b pb-3 last:border-0 last:pb-0">
                                        <p className="text-sm font-medium leading-none">{q.question}</p>
                                        <p className="text-xs text-muted-foreground">Em: {q.ad}</p>
                                        <Button size="sm" variant="outline" className="h-7 text-xs">
                                            <MessageSquare className="mr-1 h-3 w-3" /> Responder
                                        </Button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground italic">Nenhuma pergunta pendente.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Anúncios com Baixo Estoque</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {data?.lowStockAds.map((ad) => (
                            <div key={ad.sku} className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none">{ad.title}</p>
                                    <p className="text-xs text-muted-foreground">SKU: {ad.sku}</p>
                                </div>
                                <div className="text-sm font-bold text-red-500">{ad.qty} un</div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {debugResult && (
                <Card className="border-gray-300 bg-gray-50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-mono text-gray-700 flex items-center gap-2">
                            <Bug className="w-4 h-4" /> Resultado do Diagnóstico da API
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setDebugResult(null)} className="text-xs text-gray-500">
                            Fechar
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <pre className="text-xs font-mono bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-[500px] whitespace-pre-wrap">
                            {JSON.stringify(debugResult, null, 2)}
                        </pre>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default MLDashboard;
