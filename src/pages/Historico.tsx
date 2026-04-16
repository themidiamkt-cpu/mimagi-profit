import { HistoricoFinanceiro } from '@/components/dashboard/sections/HistoricoFinanceiro';
import { useDashboardContext } from '@/contexts/DashboardContext';
import { AdvancedDatePicker } from "@/components/bling/AdvancedDatePicker";
import { formatCurrency } from '@/utils/formatters';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Tag, RefreshCw, BarChart3, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = ['#c96442', '#3b6d11', '#185fa5', '#854f0b', '#a32d2d', '#6b6b68'];

export default function Historico() {
    const {
        brandMetrics,
        productMetrics,
        startDate,
        endDate,
        selectedLabel,
        setStartDate,
        setEndDate,
        setSelectedLabel,
        isSyncing,
        refreshRealTime,
        loadingRealTime
    } = useDashboardContext();

    // Dados para Gráfico de Marcas (Excluindo "Sem Marca")
    const brandChartData = brandMetrics
        .filter(bm => !['Outros / Sem Marca', 'Sem Marca', 'N/A', 'Sem Detalhamento (Resync necessário)'].includes(bm.marca))
        .slice(0, 10);

    return (
        <div className="p-6 space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-medium text-text-primary tracking-tight">Histórico e Desempenho</h1>
                    <p className="text-muted-foreground text-sm">Análise detalhada de vendas por período, produtos e categorias.</p>
                </div>

                <div className="flex items-center gap-3">
                    {isSyncing && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-lg animate-pulse">
                            <RefreshCw className="w-3.5 h-3.5 text-accent animate-spin" />
                            <span className="text-[11px] font-medium text-accent tracking-wide uppercase">Sincronizando...</span>
                        </div>
                    )}

                    <AdvancedDatePicker
                        dateStart={startDate}
                        dateEnd={endDate}
                        label={selectedLabel}
                        onRangeSelect={(start, end, label) => {
                            setStartDate(start);
                            setEndDate(end);
                            setSelectedLabel(label);
                        }}
                    />

                    <button
                        onClick={() => refreshRealTime()}
                        className="p-2.5 bg-background border hover:bg-secondary rounded-lg transition-colors shadow-none"
                        title="Atualizar dados reais"
                        disabled={loadingRealTime || isSyncing}
                    >
                        <RefreshCw className={cn("w-4 h-4", (loadingRealTime || isSyncing) && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Evolução Mensal (Componente Existente) */}
            <div className="pt-4">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-medium text-text-primary">Evolução Mensal (Faturamento e Volume)</h2>
                </div>
                <HistoricoFinanceiro />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Ranking de Categorias/Marcas */}
                <div className="bg-card border rounded-xl overflow-hidden shadow-none p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Tag className="w-5 h-5 text-primary" />
                        <h3 className="font-medium text-base tracking-tight">Desempenho por Marca (Top 10)</h3>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={brandChartData}
                                layout="vertical"
                                margin={{ top: 0, right: 30, left: 20, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.1} />
                                <XAxis type="number" hide />
                                <YAxis
                                    type="category"
                                    dataKey="marca"
                                    width={120}
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tickFormatter={(val) => val.length > 18 ? `${val.substring(0, 18)}...` : val}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '8px',
                                        fontSize: '12px'
                                    }}
                                    formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                                />
                                <Bar
                                    dataKey="faturamento"
                                    radius={[0, 4, 4, 0]}
                                    barSize={24}
                                >
                                    {brandChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-6 max-h-[200px] overflow-y-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-left sticky top-0">
                                <tr className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                    <th className="p-3">Marca</th>
                                    <th className="p-3 text-center">Itens</th>
                                    <th className="p-3 text-right">Faturamento</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {brandMetrics.map((brand: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-muted/5 transition-colors">
                                        <td className="p-3 font-medium">{brand.marca}</td>
                                        <td className="p-3 text-center">{brand.qtdItens}</td>
                                        <td className="p-3 text-right font-mono">{formatCurrency(brand.faturamento)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Ranking de Produtos */}
                <div className="bg-card border rounded-xl overflow-hidden shadow-none p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Package className="w-5 h-5 text-primary" />
                        <h3 className="font-medium text-base tracking-tight">Top Produtos Vendidos</h3>
                    </div>

                    <div className="max-h-[500px] overflow-y-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-left sticky top-0">
                                <tr className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                    <th className="p-4">Produto</th>
                                    <th className="p-4 text-center">Qtd</th>
                                    <th className="p-4 text-right">Faturamento</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {productMetrics.slice(0, 50).map((prod: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-muted/5 transition-colors">
                                        <td className="p-4">
                                            <div className="font-medium truncate max-w-[250px]" title={prod.nome}>
                                                {prod.nome}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">{prod.codigo} | {prod.marca}</div>
                                        </td>
                                        <td className="p-4 text-center font-bold">{prod.qtd}</td>
                                        <td className="p-4 text-right font-mono">{formatCurrency(prod.faturamento)}</td>
                                    </tr>
                                ))}
                                {productMetrics.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="p-8 text-center text-muted-foreground italic">
                                            Nenhum produto encontrado no período.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
