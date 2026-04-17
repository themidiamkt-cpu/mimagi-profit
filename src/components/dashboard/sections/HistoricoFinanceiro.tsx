import { useState, useMemo, useEffect } from 'react';
import { SectionCard } from '../SectionCard';
import { History, TrendingUp, ShoppingBag, Calendar, Tag } from 'lucide-react';
import { blingApi } from '@/lib/blingApi';
import { formatCurrency } from '@/utils/formatters';
import { supabase } from '@/integrations/supabase/client';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function HistoricoFinanceiro() {
    const [loading, setLoading] = useState(true);
    const [pedidos, setPedidos] = useState<any[]>([]);
    const [range, setRange] = useState('max'); // '12', '24', 'max'
    const [brandMap, setBrandMap] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                // 1. Busca catálogo de marcas para cruzamento
                const { data: produtos } = await (supabase as any)
                    .from('bling_produtos')
                    .select('codigo, marca');

                const bMap: Record<string, string> = {};
                produtos?.forEach((p: any) => {
                    if (p.codigo) bMap[p.codigo.trim()] = p.marca;
                });
                setBrandMap(bMap);

                // 2. Busca todos os pedidos locais
                const data = await blingApi.getLocalPedidos();
                setPedidos(data);
            } catch (error) {
                console.error('Erro ao buscar histórico:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const chartData = useMemo(() => {
        if (!pedidos.length) return [];

        const historyMap: Record<string, {
            mes: string;
            faturamento: number;
            pecas: number;
            sortKey: string;
            brands: Record<string, number>;
            topBrand: string;
            topBrandValue: number;
        }> = {};

        pedidos.forEach(p => {
            // Mostrar apenas pedidos ATENDIDOS (ID 6 no Bling v3) conforme pedido do usuário
            const situacaoId = Number(p.situacao?.id ?? p.situacao_id);
            if (situacaoId !== 6 && situacaoId !== 9) return;

            const [y, m, d] = p.data.split('-').map(Number);
            const date = new Date(y, m - 1, d);
            const year = y;
            const month = m;
            const monthKey = `${year}-${String(month).padStart(2, '0')}`;
            const displayKey = `${String(month).padStart(2, '0')}/${String(year).slice(2)}`;

            if (!historyMap[monthKey]) {
                historyMap[monthKey] = {
                    mes: displayKey,
                    sortKey: monthKey,
                    faturamento: 0,
                    pecas: 0,
                    brands: {},
                    topBrand: 'N/A',
                    topBrandValue: 0
                };
            }

            historyMap[monthKey].faturamento += Number(p.total || 0);

            // Processar itens para peças e marcas
            const itens = Array.isArray(p.itens) ? p.itens : (Array.isArray(p.itens?.data) ? p.itens.data : []);

            itens.forEach((item: any) => {
                const qty = Number(item.quantidade || 0);
                const val = Number(item.valorUnidade || item.valor || 0) * qty;

                historyMap[monthKey].pecas += qty;

                // Identificar marca
                const sku = String(item.codigo || '').trim();
                let rawMarca = (sku && brandMap[sku]) || '';

                if (!rawMarca || rawMarca.toLowerCase() === 'sem marca' || rawMarca === 'Outros / Sem Marca' || rawMarca === 'N/A') {
                    const extracted = blingApi.extractBrandFromName(item.nome || item.descricao || '');
                    rawMarca = extracted !== 'Sem Marca' ? extracted : 'Outros / Sem Marca';
                }

                if (!historyMap[monthKey].brands[rawMarca]) {
                    historyMap[monthKey].brands[rawMarca] = 0;
                }
                historyMap[monthKey].brands[rawMarca] += val;
            });
        });

        // Encontrar a marca que mais vendeu em cada mês
        Object.values(historyMap).forEach(m => {
            let topB = 'N/A';
            let topV = 0;

            Object.entries(m.brands).forEach(([brand, value]) => {
                if (value > topV && brand !== 'Outros / Sem Marca') {
                    topV = value;
                    topB = brand;
                }
            });

            // Se todas forem "Outros", pega a mais valiosa de "Outros" se houver
            if (topV === 0 && m.brands['Outros / Sem Marca'] > 0) {
                topB = 'Outros / Sem Marca';
                topV = m.brands['Outros / Sem Marca'];
            }

            m.topBrand = topB;
            m.topBrandValue = topV;
        });

        const sortedData = Object.values(historyMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

        if (range === '12') return sortedData.slice(-12);
        if (range === '24') return sortedData.slice(-24);
        return sortedData;
    }, [pedidos, range, brandMap]);

    if (loading) {
        return (
            <div className="h-96 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-end">
                <div className="flex items-center gap-2 bg-card p-1 rounded-lg border shadow-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground ml-2" />
                    <Select value={range} onValueChange={setRange}>
                        <SelectTrigger className="w-44 border-0 shadow-none focus:ring-0">
                            <SelectValue placeholder="Período" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="12">Últimos 12 meses</SelectItem>
                            <SelectItem value="24">Últimos 24 meses</SelectItem>
                            <SelectItem value="max">Tempo Total (Máximo)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <SectionCard title="Faturamento Mensal" icon={<TrendingUp className="w-5 h-5 text-primary" />}>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                                <XAxis
                                    dataKey="mes"
                                    tick={{ fontSize: 11, fontWeight: 500 }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fontWeight: 500 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(value) => `R$ ${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                                />
                                <Tooltip
                                    formatter={(value: number) => [formatCurrency(value), "Faturamento"]}
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                    }}
                                />
                                <Bar dataKey="faturamento" radius={[4, 4, 0, 0]} name="Faturamento">
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill="hsl(var(--primary))" fillOpacity={0.8 + (index / chartData.length) * 0.2} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </SectionCard>

                <SectionCard title="Volume de Peças" icon={<ShoppingBag className="w-5 h-5 text-accent" />}>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                                <XAxis
                                    dataKey="mes"
                                    tick={{ fontSize: 11, fontWeight: 500 }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fontWeight: 500 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    formatter={(value: number) => [value, "Peças"]}
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                    }}
                                />
                                <Bar dataKey="pecas" radius={[4, 4, 0, 0]} name="Peças">
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-p-${index}`} fill="hsl(var(--accent))" fillOpacity={0.8 + (index / chartData.length) * 0.2} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </SectionCard>
            </div>

            <SectionCard title="Análise Mensal Consolidada" icon={<History className="w-5 h-5" />}>
                <div className="overflow-x-auto rounded-xl border border-border/50">
                    <table className="corporate-table w-full min-w-[920px] table-fixed">
                        <colgroup>
                            <col className="w-[14%]" />
                            <col className="w-[22%]" />
                            <col className="w-[18%]" />
                            <col className="w-[28%]" />
                            <col className="w-[18%]" />
                        </colgroup>
                        <thead className="bg-muted/50 border-b border-border/50">
                            <tr>
                                <th className="py-4 px-4 text-left font-bold text-xs uppercase tracking-wider text-text-secondary">Mês/Ano</th>
                                <th className="py-4 px-4 text-right font-bold text-xs uppercase tracking-wider text-text-secondary">Faturamento</th>
                                <th className="py-4 px-4 text-right font-bold text-xs uppercase tracking-wider text-text-secondary">Volume Peças</th>
                                <th className="py-4 px-4 text-left font-bold text-xs uppercase tracking-wider text-text-secondary">Marca Campeã (Valor)</th>
                                <th className="py-4 px-4 text-right font-bold text-xs uppercase tracking-wider text-text-secondary">Ticket Médio</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {[...chartData].reverse().map((data) => (
                                <tr key={data.sortKey} className="hover:bg-muted/20 transition-colors">
                                    <td className="py-4 px-4 font-medium text-text-primary">{data.mes}</td>
                                    <td className="py-4 px-4 text-right font-mono font-semibold text-primary">{formatCurrency(data.faturamento)}</td>
                                    <td className="py-4 px-4 text-right font-medium">{data.pecas}</td>
                                    <td className="py-4 px-4 align-middle">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <Tag className="w-3.5 h-3.5 text-accent" />
                                            <span className="min-w-0 flex-1 truncate font-medium text-text-secondary">{data.topBrand}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-right font-mono text-muted-foreground">
                                        {formatCurrency(data.pecas > 0 ? data.faturamento / data.pecas : 0)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SectionCard>
        </div>
    );
}
