import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ShoppingCart, TrendingUp, Clock, Package, Loader2, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface DashboardData {
    summary: {
        totalOrders: number;
        revenue: number;
        pendingOrders: number;
        activeProducts: number;
        revenueGrowth: number;
        ordersGrowth: number;
    };
    recentOrders: Array<{
        id: string;
        status: string;
        value: string;
        date: string;
    }>;
    lowStockProducts: Array<{
        name: string;
        sku: string;
        qty: number;
    }>;
    chartData: any[];
}

const ShopeeDashboard = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isConfigured, setIsConfigured] = useState(false);
    const [data, setData] = useState<DashboardData | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Check status
                const { data: statusData, error: statusError } = await supabase.functions.invoke('shopee-integration', {
                    method: 'GET',
                    body: {},
                    headers: {
                        'x-path': 'status' // I should have implemented path handling better in the function
                    }
                });

                // Wait, my shopee-integration function uses url path. 
                // Supabase functions invoke doesn't easily support path.
                // I'll use a simpler check for now: query the table directly.

                const { data: config } = await supabase
                    .from('shopee_config')
                    .select('id')
                    .maybeSingle();

                setIsConfigured(!!config);

                if (config) {
                    const { data: dashboardData, error: dashboardError } = await supabase.functions.invoke('shopee-dashboard');
                    if (dashboardError) throw dashboardError;
                    setData(dashboardData);
                }
            } catch (error: any) {
                console.error('Error fetching shopee data:', error);
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
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Shopee Dashboard</h1>
                <Button variant="outline" size="sm" onClick={() => navigate("/shopee/configuracoes")}>
                    <Settings className="w-4 h-4 mr-2" />
                    Configurações
                </Button>
            </div>

            {!isConfigured && (
                <Alert variant="destructive" className="bg-orange-50 border-orange-200 text-orange-800">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertTitle className="text-orange-900 font-semibold">Integração não configurada</AlertTitle>
                    <AlertDescription className="text-orange-800">
                        Você ainda não configurou a integração com a Shopee.{" "}
                        <Link to="/shopee/configuracoes" className="font-bold underline hover:text-orange-900">
                            Clique aqui para configurar
                        </Link>
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total de Pedidos</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.summary.totalOrders || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {data?.summary.ordersGrowth ? `+${data.summary.ordersGrowth}% em relação ao mês passado` : 'Sem dados comparativos'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Receita do Mês</CardTitle>
                        <TrendingUp className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data?.summary.revenue || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {data?.summary.revenueGrowth ? `+${data.summary.revenueGrowth}% em relação ao mês passado` : 'Sem dados comparativos'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos Pendentes</CardTitle>
                        <Clock className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.summary.pendingOrders || 0}</div>
                        <p className="text-xs text-muted-foreground">Aguardando envio</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Produtos Ativos</CardTitle>
                        <Package className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.summary.activeProducts || 0}</div>
                        <p className="text-xs text-muted-foreground">Sincronizados com a loja</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Gráfico de Pedidos</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground italic">
                            {data?.chartData.length ? '[Gráfico de pedidos]' : 'Sem dados para exibir o gráfico'}
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Produtos com Baixo Estoque</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data?.lowStockProducts.length ? (
                                data.lowStockProducts.map((product) => (
                                    <div key={product.sku} className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">{product.name}</p>
                                            <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                                        </div>
                                        <div className="text-sm font-bold text-red-500">{product.qty} un</div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground italic">Nenhum produto com baixo estoque.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Últimos Pedidos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">ID do Pedido</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Valor</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Data</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {data?.recentOrders.length ? (
                                    data.recentOrders.map((order) => (
                                        <tr key={order.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                            <td className="p-4 align-middle font-medium">{order.id}</td>
                                            <td className="p-4 align-middle">{order.status}</td>
                                            <td className="p-4 align-middle">{order.value}</td>
                                            <td className="p-4 align-middle">{order.date}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="p-4 text-center text-muted-foreground italic">
                                            Nenhum pedido encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ShopeeDashboard;
