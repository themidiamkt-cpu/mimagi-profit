import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ShoppingCart, TrendingUp, Clock, Package, Eye, MessageSquare, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface DashboardData {
    summary: {
        totalOrders: number;
        revenue: number;
        pendingOrders: number;
        activeAds: number;
        visits: number;
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
    const [isLoading, setIsLoading] = useState(true);
    const [isConfigured, setIsConfigured] = useState(false);
    const [data, setData] = useState<DashboardData | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
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
                    // Mock data for demonstration if not configured
                    setData({
                        summary: {
                            totalOrders: 85,
                            revenue: 8450.00,
                            pendingOrders: 8,
                            activeAds: 124,
                            visits: 12500,
                            revenueGrowth: 15,
                            ordersGrowth: 10
                        },
                        recentOrders: [
                            { id: "200000123456", buyer: "JOAO_SILVA", status: "paid", value: "R$ 120,00", date: "24/04/2024" },
                            { id: "200000123457", buyer: "MARIA_OLIVEIRA", status: "shipped", value: "R$ 85,50", date: "23/04/2024" },
                        ],
                        lowStockAds: [
                            { title: "Kit 3 Body Infantil Algodão", sku: "KIT-BODY-01", qty: 4 },
                        ],
                        unansweredQuestions: [
                            { id: "1", question: "Tem tamanho G disponível?", ad: "Kit 3 Body Infantil Algodão" },
                        ],
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

        fetchData();
    }, [toast]);

    if (isLoading) {
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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total de Pedidos</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.summary.totalOrders || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {data?.summary.ordersGrowth ? `+${data.summary.ordersGrowth}% este mês` : 'Sem dados'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Receita do Mês</CardTitle>
                        <TrendingUp className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data?.summary.revenue || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {data?.summary.revenueGrowth ? `+${data.summary.revenueGrowth}% este mês` : 'Sem dados'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos Pendentes</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.summary.pendingOrders || 0}</div>
                        <p className="text-xs text-muted-foreground">Aguardando envio</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Anúncios Ativos</CardTitle>
                        <Package className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.summary.activeAds || 0}</div>
                        <p className="text-xs text-muted-foreground">Sincronizados</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Visitas</CardTitle>
                        <Eye className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.summary.visits.toLocaleString() || 0}</div>
                        <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
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
        </div>
    );
};

export default MLDashboard;
