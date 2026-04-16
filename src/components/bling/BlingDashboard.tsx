import { useBling } from '@/hooks/useBling';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    RefreshCw,
    ExternalLink,
    ShoppingCart,
    Users,
    ArrowRight,
    AlertTriangle,
    CheckCircle2,
    Clock,
    DollarSign,
    TrendingUp
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { useEffect } from 'react';

interface BlingDashboardProps {
    metrics?: {
        totalFaturamento: number;
        ticketMedio: number;
        totalPedidos: number;
        totalItems?: number;
    } | null;
}

export function BlingDashboard({ metrics }: BlingDashboardProps) {
    const { isConnected, loading, pedidos, contatos, connect, disconnect, fetchDashboardData } = useBling();

    useEffect(() => {
        if (isConnected) {
            fetchDashboardData();
        }
    }, [isConnected]);

    if (loading && isConnected === null) {
        return (
            <div className="flex items-center justify-center p-12">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isConnected) {
        return (
            <Card className="border-dashed">
                <CardHeader className="text-center">
                    <CardTitle>Conectar ao Bling ERP</CardTitle>
                    <CardDescription>
                        Sincronize seus pedidos e clientes automaticamente para ter uma visão completa do seu negócio.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-6 py-8">
                    <div className="grid grid-cols-3 gap-8 text-center max-w-lg w-full">
                        <div className="space-y-2">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                                <ShoppingCart className="w-6 h-6 text-primary" />
                            </div>
                            <p className="text-xs font-medium">Vendas em Tempo Real</p>
                        </div>
                        <div className="space-y-2">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                                <Users className="w-6 h-6 text-primary" />
                            </div>
                            <p className="text-xs font-medium">Gestão de Clientes</p>
                        </div>
                        <div className="space-y-2">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                                <ArrowRight className="w-6 h-6 text-primary" />
                            </div>
                            <p className="text-xs font-medium">Dados Unificados</p>
                        </div>
                    </div>
                    <Button onClick={connect} size="lg" className="gap-2">
                        <ExternalLink className="w-4 h-4" />
                        Conectar Agora
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Status Bar */}
            <div className="flex items-center justify-between bg-card border border-border p-4 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-2 py-1 bg-green-500/10 text-green-600 border border-green-500/20 rounded-full text-xs font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Conectado
                    </div>
                    <p className="text-sm text-muted-foreground">Sua conta do Bling está sincronizada.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchDashboardData} disabled={loading} className="gap-2">
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Sincronizar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={disconnect} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        Desconectar
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-card border shadow-none overflow-hidden relative group">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs font-medium   tracking-wider text-muted-foreground">Total de Vendas</CardTitle>
                        <DollarSign className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-foreground">
                            {metrics ? formatCurrency(metrics.totalFaturamento) : '---'}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">Faturamento Bruto no Período</p>
                    </CardContent>
                    <div className="absolute bottom-0 left-0 h-1 w-full bg-primary/20" />
                </Card>

                <Card className="bg-card border shadow-none overflow-hidden relative group">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs font-medium   tracking-wider text-muted-foreground">Ticket Médio</CardTitle>
                        <TrendingUp className="w-4 h-4 text-success group-hover:scale-110 transition-transform" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-foreground">
                            {metrics ? formatCurrency(metrics.ticketMedio) : '---'}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">Valor Médio por Pedido</p>
                    </CardContent>
                    <div className="absolute bottom-0 left-0 h-1 w-full bg-success/20" />
                </Card>

                <Card className="bg-card border shadow-none overflow-hidden relative group">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs font-medium   tracking-wider text-muted-foreground">Produtos Vendidos</CardTitle>
                        <ShoppingCart className="w-4 h-4 text-orange-500 group-hover:scale-110 transition-transform" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-foreground">
                            {metrics ? (metrics as any).totalItems || metrics.totalPedidos : '---'}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">Soma das quantidades de todos os itens</p>
                    </CardContent>
                    <div className="absolute bottom-0 left-0 h-1 w-full bg-orange-500/20" />
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pedidos Recentes */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div>
                            <CardTitle className="text-sm font-medium   tracking-wider">Últimos Pedidos</CardTitle>
                            <CardDescription>Vendas recentes processadas no Bling</CardDescription>
                        </div>
                        <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {pedidos.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground space-y-2">
                                <Clock className="w-8 h-8 mx-auto opacity-20" />
                                <p className="text-sm">Nenhum pedido encontrado recentemente.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pedidos.map((pedido: any) => (
                                    <div key={pedido.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-primary/50 transition-colors">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium">#{pedido.numero || pedido.id}</p>
                                            <p className="text-xs text-muted-foreground">{pedido.contato?.nome || 'Cliente não identificado'}</p>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <p className="text-sm font-medium font-mono">{formatCurrency(pedido.total || 0)}</p>
                                            <p className="text-[10px] text-muted-foreground">{formatDate(pedido.data)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Clientes Recentes */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div>
                            <CardTitle className="text-sm font-medium   tracking-wider">Novos Clientes</CardTitle>
                            <CardDescription>Contatos cadastrados no ERP</CardDescription>
                        </div>
                        <Users className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {contatos.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground space-y-2">
                                <AlertTriangle className="w-8 h-8 mx-auto opacity-20" />
                                <p className="text-sm">Nenhum contato encontrado.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {contatos.map((contato: any) => (
                                    <div key={contato.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/50 transition-colors">
                                        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs font-medium text-muted-foreground">
                                            {(contato.nome || '?').charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{contato.nome}</p>
                                            <p className="text-xs text-muted-foreground truncate">{contato.email || contato.celular || 'Sem contato'}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                                                {contato.tipo || 'Cliente'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
