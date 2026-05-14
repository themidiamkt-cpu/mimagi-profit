import { useState, useMemo, useEffect } from 'react';
import {
    Calculator,
    Target,
    ShoppingBag,
    PieChart,
    Zap,
    AlertCircle,
    ShieldCheck,
    Tag,
    Plus,
    Trophy,
    Sparkles,
    Briefcase,
    Store
} from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { InputField } from '../InputField';
import { Slider } from '@/components/ui/slider';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { PlanejamentoFinanceiro, SimulationValues, CanalVenda } from '@/types/financial';
import { formatCurrency, formatNumber, formatPercent } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDashboardContext } from '@/contexts/DashboardContext';
import { toast } from 'sonner';

interface Props {
    calculateSimulation: (faturamento: number) => SimulationValues;
    currentFaturamento: number;
    data: PlanejamentoFinanceiro;
}

type ScenarioType = 'optimistic' | 'realistic' | 'pessimistic' | 'custom';

interface CanalSimulacao extends CanalVenda {
    percSimulado: number;
    ticketSimulado: number;
    convSimulada: number;
    custoSimulado: number;
}

interface MarcaSimulada {
    id: string;
    nome: string;
    categoria: 'Menina' | 'Menino' | 'Bebê';
    ticket: number;
    margem: number;
    giro: string; // 'Rápido', 'Médio', 'Lento' ou dias
    custoPeca: number;
    investimento: number;
}

export function SimuladorInteligente({ calculateSimulation, currentFaturamento, data }: Props) {
    const { brandMetricsAllTime, brandMetrics, actualMetrics } = useDashboardContext();
    const [scenario, setScenario] = useState<ScenarioType>('realistic');
    const [valorLucroDesejado, setValorLucroDesejado] = useState(15000);

    // Custom scenario state
    const [canaisSimulados, setCanaisSimulados] = useState<CanalSimulacao[]>([]);
    const [descontoPromo, setDescontoPromo] = useState(0);

    // Advanced Brand Planning State
    const [marcasSimuladas, setMarcasSimuladas] = useState<MarcaSimulada[]>([]);
    const [isAddingBrand, setIsAddingBrand] = useState(false);
    const [newBrand, setNewBrand] = useState<Partial<MarcaSimulada>>({
        categoria: 'Menina',
        giro: 'Médio',
        ticket: 150,
        margem: 50,
        custoPeca: 75,
        investimento: 0
    });

    const suggestBrands = () => {
        if (!brandMetricsAllTime || brandMetricsAllTime.length === 0) {
            toast.error("Não encontramos dados históricos de marcas no seu Bling.");
            return;
        }

        // Filter out "Outros / Sem Marca" and sort by historical revenue (faturamento)
        const topBrands = [...brandMetricsAllTime]
            .filter(b => b.marca && b.marca !== 'Outros / Sem Marca' && b.marca !== 'Sem Marca')
            .sort((a, b) => (b.faturamento || 0) - (a.faturamento || 0))
            .slice(0, 6);

        if (topBrands.length === 0) {
            toast.error("Não há marcas suficientes no histórico para sugerir.");
            return;
        }

        const totalBudget = simulation.investimento_mensal_necessario;
        if (totalBudget <= 0) {
            toast.error("Defina uma meta de lucro primeiro!");
            return;
        }

        const totalHistoricalSales = topBrands.reduce((acc, b) => acc + (b.faturamento || 0), 0) || 1;

        const suggested = topBrands.map((b, idx) => {
            const brandShare = (b.faturamento || 0) / totalHistoricalSales;
            const brandInvestment = simulation.investimento_mensal_necessario * brandShare;

            return {
                id: `hist-${idx}`,
                nome: b.marca || 'Marca',
                categoria: (b.categoria as any) || 'Menina',
                ticket: b.ticketMedio || 150,
                margem: 50, // default
                giro: 'Médio',
                custoPeca: (b.ticketMedio / (data.margem || 2)) || 75,
                investimento: brandInvestment
            };
        });

        setMarcasSimuladas(suggested);
        toast.success("Sugestão proporcional ao seu histórico de faturamento (Todo o Período)!");
    };

    const avgTaxRate = useMemo(() => {
        if (canaisSimulados.length === 0) return 10;
        const totalPerc = canaisSimulados.reduce((acc, c) => acc + c.percSimulado, 0) || 1;
        return canaisSimulados.reduce((acc, c) => acc + (c.custoSimulado * (c.percSimulado / totalPerc)), 0);
    }, [canaisSimulados]);

    const custoFixoTotal = useMemo(() => (
        data.custo_aluguel +
        data.custo_salarios +
        data.custo_encargos +
        data.custo_agua_luz +
        data.custo_internet +
        data.custo_contador +
        data.custo_embalagens +
        data.custo_sistema +
        data.custo_marketing +
        data.custo_outros +
        (data.custos_extras?.reduce((acc, c) => acc + c.valor, 0) || 0)
    ), [data]);

    const reverseAnalysis = useMemo(() => {
        const cpvPerc = 1 / (data.margem || 2);
        const taxPerc = avgTaxRate / 100;
        const requiredRevenue = (custoFixoTotal + valorLucroDesejado) / (1 - cpvPerc - taxPerc);
        return {
            revenue: requiredRevenue,
            investment: requiredRevenue * cpvPerc,
            pieces: requiredRevenue / (data.tm_menina || 150)
        };
    }, [data.margem, avgTaxRate, custoFixoTotal, valorLucroDesejado, data.tm_menina]);

    const faturamentoDesejado = reverseAnalysis.revenue;

    const simulation = useMemo(() => {
        return calculateSimulation(faturamentoDesejado);
    }, [calculateSimulation, faturamentoDesejado]);

    // Calculations
    const lucroEstimado = valorLucroDesejado;
    const margemEstimada = simulation.faturamento_mensal_desejado > 0 ? (lucroEstimado / simulation.faturamento_mensal_desejado) * 100 : 0;

    const brandPlanningSummary = useMemo(() => {
        return marcasSimuladas.reduce((acc, m) => {
            const qte = m.custoPeca > 0 ? m.investimento / m.custoPeca : 0;
            const fat = qte * m.ticket;
            const lucroB = fat * (m.margem / 100);
            const impostos = fat * (avgTaxRate / 100);
            const lucroL = lucroB - impostos;

            return {
                investimento: acc.investimento + m.investimento,
                pecas: acc.pecas + qte,
                faturamento: acc.faturamento + fat,
                lucro: acc.lucro + lucroL
            };
        }, { investimento: 0, pecas: 0, faturamento: 0, lucro: 0 });
    }, [marcasSimuladas, avgTaxRate]);

    const handleAddBrand = () => {
        if (newBrand.nome) {
            const brand: MarcaSimulada = {
                id: Math.random().toString(36).substr(2, 9),
                nome: newBrand.nome,
                categoria: newBrand.categoria as any,
                ticket: newBrand.ticket || 0,
                margem: newBrand.margem || 0,
                giro: newBrand.giro || 'Médio',
                custoPeca: newBrand.custoPeca || 0,
                investimento: 0
            };
            setMarcasSimuladas([...marcasSimuladas, brand]);
            setNewBrand({
                categoria: 'Menina',
                giro: 'Médio',
                ticket: 150,
                margem: 50,
                custoPeca: 75,
                investimento: 0
            });
            setIsAddingBrand(false);
        }
    };

    const handleAutoDistribute = () => {
        if (marcasSimuladas.length === 0) return;
        const totalBudget = brandPlanningSummary.investimento || simulation.investimento_mensal_necessario;
        if (totalBudget <= 0) return;

        // Optimize: weighted by (margin * turnover factor)
        const scoreBrand = (m: MarcaSimulada) => {
            const turnoverFactor = m.giro === 'Rápido' ? 1.2 : m.giro === 'Médio' ? 0.9 : 0.6;
            return (m.margem / 100) * turnoverFactor;
        };
        const totalScore = marcasSimuladas.reduce((acc, m) => acc + scoreBrand(m), 0);
        const newBrands = marcasSimuladas.map(m => ({
            ...m,
            investimento: (scoreBrand(m) / totalScore) * totalBudget
        }));
        setMarcasSimuladas(newBrands);
        toast.success("Investimento otimizado para maior lucro e giro!");
    };


    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* HEADER: Subtle & Professional */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter text-foreground flex items-center gap-3">
                        <Calculator className="w-7 h-7 text-primary" />
                        Simulador Estratégico de Lucro
                    </h2>
                    <p className="text-muted-foreground mt-1 font-medium text-sm">
                        Planejamento detalhado focado em lucro real e escala.
                    </p>
                </div>

                <div className="flex items-center gap-3 bg-white border border-border shadow-sm px-4 py-2 rounded-xl">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-1">Cenário:</span>
                    <Select value={scenario} onValueChange={(v) => setScenario(v as ScenarioType)}>
                        <SelectTrigger className="w-[160px] border-none shadow-none focus:ring-0 text-primary font-black text-sm p-0 h-auto">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl shadow-xl">
                            <SelectItem value="optimistic" className="text-success font-black">Otimista</SelectItem>
                            <SelectItem value="realistic" className="text-primary font-black">Realista</SelectItem>
                            <SelectItem value="pessimistic" className="text-destructive font-black">Pessimista</SelectItem>
                            <SelectItem value="custom" className="italic font-medium">Customizado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* BLOCO 1: META - Refined Palette */}
            <section className="corporate-card overflow-hidden">
                <div className="section-header border-b bg-muted/10">
                    <Target className="w-4 h-4" />
                    <span className="tracking-tight uppercase text-xs font-black">1. Meta e Visão Geral</span>
                </div>

                <div className="p-6">
                    <div className="bg-muted/5 p-8 rounded-2xl border border-border/50">
                        <div className="flex flex-col xl:flex-row gap-10">
                            <div className="flex-1 space-y-6">
                                <InputField
                                    label="Meta de Lucro Líquido"
                                    value={valorLucroDesejado}
                                    onChange={(v) => setValorLucroDesejado(Number(v))}
                                    type="currency"
                                    prefix="R$"
                                />
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center pr-1">
                                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Simulador de Meta de Lucro</span>
                                        <span className="text-sm font-black text-primary">{formatCurrency(valorLucroDesejado)}</span>
                                    </div>
                                    <Slider
                                        value={[valorLucroDesejado]}
                                        min={1000}
                                        max={100000}
                                        step={1000}
                                        onValueChange={(v) => setValorLucroDesejado(v[0])}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-[2]">
                                <div className="bg-white border rounded-2xl p-5 shadow-sm">
                                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block mb-2">Faturamento Ciclo</span>
                                    <p className="text-xl font-black">{formatCurrency(simulation.faturamento_ciclo_desejado)}</p>
                                </div>
                                <div className="bg-white border rounded-2xl p-5 shadow-sm">
                                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block mb-2">Investimento Peças</span>
                                    <p className="text-xl font-black text-destructive">{formatCurrency(simulation.investimento_mensal_necessario)}</p>
                                </div>
                                <div className="bg-white border rounded-2xl p-5 shadow-sm">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <Briefcase className="w-3 h-3 text-primary" />
                                        <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block">Investimento Coleção</span>
                                    </div>
                                    <p className="text-xl font-black text-primary">{formatCurrency(data.investimento_ciclo)}</p>
                                </div>
                                <div className="bg-white border rounded-2xl p-5 shadow-sm">
                                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block mb-2">Peças Sugeridas</span>
                                    <p className="text-xl font-black">{formatNumber(simulation.qtd_minima_pecas)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>


            {/* BLOCO 3 & 4: COMPRAS E MARCAS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="corporate-card overflow-hidden">
                    <div className="section-header border-b bg-muted/10">
                        <ShoppingBag className="w-4 h-4" />
                        <span className="tracking-tight uppercase text-xs font-black">3. Histórico de Compras por Categoria</span>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Menina', perc: actualMetrics?.menina?.percentual || 0, color: 'text-pink-500', bgColor: 'bg-pink-50' },
                                { label: 'Menino', perc: actualMetrics?.menino?.percentual || 0, color: 'text-blue-500', bgColor: 'bg-blue-50' },
                                { label: 'Bebê', perc: actualMetrics?.bebe?.percentual || 0, color: 'text-amber-500', bgColor: 'bg-amber-50' }
                            ].map(cat => (
                                <div key={cat.label} className={cn("p-4 rounded-xl border text-center transition-all", cat.bgColor, "border-border/30")}>
                                    <h5 className={cn("font-black text-sm mb-1", cat.color)}>{cat.label}</h5>
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase mb-4">{formatPercent(cat.perc)} mix histórico</p>
                                    <div className="text-left space-y-1.5 pt-2 border-t border-muted-foreground/10">
                                        <div className="text-[9px] font-black uppercase text-muted-foreground">Sugestão Compra</div>
                                        <div className="font-black text-xs">{formatCurrency(simulation.investimento_mensal_necessario * (cat.perc / 100))}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-5 bg-muted/20 rounded-xl border-2 border-dashed border-border text-center">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total para Investimento</p>
                            <h4 className="text-2xl font-black">{formatCurrency(simulation.investimento_mensal_necessario)}</h4>
                        </div>
                    </div>
                </section>

                <section className="corporate-card overflow-hidden">
                    <div className="section-header border-b bg-muted/10">
                        <Trophy className="w-4 h-4" />
                        <span className="tracking-tight uppercase text-xs font-black">4. Top Marcas Históricas (Todo o Período)</span>
                    </div>
                    <div className="p-6 space-y-3">
                        {brandMetricsAllTime?.filter(b => b.marca && b.marca !== 'Outros / Sem Marca' && b.marca !== 'Sem Marca').slice(0, 4).map((brand, bIdx) => {
                            return (
                                <div key={bIdx} className="flex items-center justify-between p-4 bg-white border rounded-xl hover:border-primary/20 transition-all shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-muted/50 rounded-lg flex items-center justify-center font-black text-primary border text-xs">
                                            {brand.marca?.[0] || '?'}
                                        </div>
                                        <div>
                                            <h6 className="font-black text-sm">{brand.marca || 'Sem Nome'}</h6>
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase">{formatCurrency(brand.faturamento || 0)} faturados</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Ticket Médio</p>
                                        <p className="font-black text-primary text-sm">{formatCurrency(brand.ticketMedio || 0)}</p>
                                    </div>
                                </div>
                            )
                        })}
                        <Button
                            variant="outline"
                            className="w-full border-dashed border-2 font-black uppercase text-[10px] tracking-widest py-6"
                            onClick={suggestBrands}
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Gerar Planejamento de Compras Detalhado
                        </Button>
                    </div>
                </section>
            </div>

            {/* BLOCO 7: SIMULADOR DE PROMO */}
            <div className="grid grid-cols-1 gap-8">
                <section className="corporate-card overflow-hidden">
                    <div className="section-header border-b bg-muted/10">
                        <Zap className="w-4 h-4" />
                        <span className="tracking-tight uppercase text-xs font-black">7. Simulador de Promoções</span>
                    </div>
                    <div className="p-6">
                        <div className="flex flex-col md:flex-row gap-10 items-center">
                            <div className="flex-1 space-y-6 w-full">
                                <InputField label="Desconto Médio Planejado (%)" value={descontoPromo} onChange={(v) => setDescontoPromo(Number(v))} suffix="%" />
                                <Slider value={[descontoPromo]} max={50} step={5} onValueChange={(v) => setDescontoPromo(v[0])} />
                            </div>
                            <div className="bg-primary p-8 rounded-3xl shadow-xl shadow-primary/20 flex-1 text-center w-full relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 -mr-12 -mt-12 rounded-full group-hover:scale-110 transition-transform" />
                                <p className="text-[10px] font-black uppercase text-white/80 tracking-[0.2em] mb-2">Impacto Final no Lucro Meta</p>
                                <p className="text-4xl font-black text-white">{formatCurrency(lucroEstimado * (1 - (descontoPromo / 100)))}</p>
                                <p className="text-[10px] font-bold text-white/60 mt-2">Mantendo mesmo volume de vendas</p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* BLOCO 10: PLANEJAMENTO POR MARCA */}
            <section className="corporate-card overflow-hidden border-t-4 border-primary/50 relative">
                {/* INDICADOR PREMIUM */}
                <div className="absolute top-0 right-0 p-1">
                    <Badge className="bg-primary text-white text-[8px] font-black rounded-none rounded-bl-lg">PREMIUM</Badge>
                </div>

                <div className="section-header border-b bg-muted/5 flex justify-between items-center pr-4">
                    <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-primary" />
                        <span className="tracking-tight uppercase text-xs font-black">10. Planejamento de Compras por Marca</span>
                    </div>

                    <div className="flex items-center gap-2">
                        {marcasSimuladas.length === 0 ? (
                            <Button
                                onClick={suggestBrands}
                                variant="default"
                                size="sm"
                                className="h-8 gap-2 bg-primary text-white font-black uppercase text-[10px] hover:bg-primary/90 px-4 rounded-lg shadow-lg shadow-primary/20 animate-pulse"
                            >
                                <Sparkles className="w-3 h-3" />
                                Montar minha compra
                            </Button>
                        ) : (
                            <Button
                                onClick={handleAutoDistribute}
                                variant="outline"
                                size="sm"
                                className="h-8 gap-2 border-primary/50 text-primary font-black uppercase text-[10px] hover:bg-primary/5 px-4 rounded-lg"
                            >
                                <Zap className="w-3 h-3" />
                                Otimizar minha compra
                            </Button>
                        )}

                        <Dialog open={isAddingBrand} onOpenChange={setIsAddingBrand}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 gap-2 border-primary/30 text-primary font-black uppercase text-[10px] hover:bg-primary/5 px-4 rounded-lg">
                                    <Plus className="w-3 h-3" />
                                    Adicionar Marca
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md border-none shadow-2xl rounded-2xl">
                                <DialogHeader>
                                    <DialogTitle className="font-black text-xl flex items-center gap-2 tracking-tighter">
                                        <Tag className="w-5 h-5 text-primary" />
                                        Nova Marca para Simulação
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-5 py-6">
                                    <InputField label="Nome da Marca" value={newBrand.nome || ''} onChange={(v) => setNewBrand({ ...newBrand, nome: v })} placeholder="Ex: Kyly, Milon..." />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Categoria</label>
                                            <Select value={newBrand.categoria} onValueChange={(v) => setNewBrand({ ...newBrand, categoria: v as any })}>
                                                <SelectTrigger className="rounded-xl border-border/60 bg-muted/10"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Menina">Menina</SelectItem>
                                                    <SelectItem value="Menino">Menino</SelectItem>
                                                    <SelectItem value="Bebê">Bebê</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Expectativa de Giro</label>
                                            <Select value={newBrand.giro} onValueChange={(v) => setNewBrand({ ...newBrand, giro: v })}>
                                                <SelectTrigger className="rounded-xl border-border/60 bg-muted/10"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Rápido">Giro Rápido (30d)</SelectItem>
                                                    <SelectItem value="Médio">Giro Médio (60d)</SelectItem>
                                                    <SelectItem value="Lento">Giro Lento (90d)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField label="Ticket Médio" value={newBrand.ticket} onChange={(v) => setNewBrand({ ...newBrand, ticket: Number(v) })} type="currency" prefix="R$" />
                                        <InputField label="Margem Est. (%)" value={newBrand.margem} onChange={(v) => setNewBrand({ ...newBrand, margem: Number(v) })} suffix="%" />
                                    </div>
                                    <InputField label="Custo Médio p/ Peça" value={newBrand.custoPeca} onChange={(v) => setNewBrand({ ...newBrand, custoPeca: Number(v) })} type="currency" prefix="R$" />
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleAddBrand} className="w-full bg-primary font-black uppercase tracking-widest text-xs py-7 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">Salvar Marca no Planejamento</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="p-6 space-y-8 bg-muted/5">
                    {/* RESUMO DA SUA PRÓXIMA COMPRA */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Store className="w-5 h-5 text-primary" />
                            <h3 className="text-xl font-black tracking-tighter">Resumo da sua próxima compra</h3>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white rounded-2xl border shadow-sm p-5 relative overflow-hidden group hover:border-primary/30 transition-all">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 -mr-8 -mt-8 rounded-full" />
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Total Investido</p>
                                <p className="text-2xl font-black text-primary">{formatCurrency(brandPlanningSummary.investimento)}</p>
                            </div>
                            <div className="bg-white rounded-2xl border shadow-sm p-5 relative overflow-hidden group hover:border-primary/30 transition-all">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Fat. Esperado</p>
                                <p className="text-2xl font-black text-foreground">{formatCurrency(brandPlanningSummary.faturamento)}</p>
                            </div>
                            <div className="bg-white rounded-2xl border shadow-sm p-5 relative overflow-hidden group hover:border-primary/30 transition-all border-success/20 bg-success/5">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-success/10 -mr-8 -mt-8 rounded-full" />
                                <p className="text-[10px] font-black text-success uppercase tracking-widest mb-2">Lucro Esperado</p>
                                <p className="text-2xl font-black text-success">{formatCurrency(brandPlanningSummary.lucro)}</p>
                            </div>
                            <div className="bg-white rounded-2xl border shadow-sm p-5 relative overflow-hidden group hover:border-primary/30 transition-all">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Tempo de Retorno</p>
                                <div className="flex items-end gap-1">
                                    <p className="text-2xl font-black">{marcasSimuladas.length > 0 ? (brandPlanningSummary.investimento / (brandPlanningSummary.faturamento / 30 || 1)).toFixed(0) : '0'}</p>
                                    <span className="text-xs font-bold text-muted-foreground mb-1">dias</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* LISTAGEM DE CARDS DINÂMICOS */}
                    {marcasSimuladas.length === 0 ? (
                        <div className="text-center py-20 border-2 border-dashed rounded-3xl opacity-50 bg-white space-y-4">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                                <Tag className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="font-black text-xl tracking-tight">O planejamento está pronto para começar</p>
                                <p className="text-sm font-medium text-muted-foreground max-w-sm mx-auto">
                                    Clique em <span className="text-primary font-black">"Montar minha compra"</span> para receber sugestões automáticas baseadas no seu objetivo.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {marcasSimuladas.map((marca, idx) => {
                                const qte = marca.custoPeca > 0 ? marca.investimento / marca.custoPeca : 0;
                                const fat = qte * marca.ticket;
                                const lucroMarca = fat * (marca.margem / 100) - (fat * (avgTaxRate / 100));
                                const roi = marca.investimento > 0 ? (lucroMarca / marca.investimento) : 0;

                                // Brand Insights
                                const insights = [];
                                if (marca.margem > 55) insights.push({ label: "Alta Margem", color: "bg-success text-white" });
                                if (marca.giro === 'Lento') insights.push({ label: "Giro Lento", color: "bg-destructive/10 text-destructive border-destructive/20" });
                                if (marca.giro === 'Rápido') insights.push({ label: "Alta Liquidez", color: "bg-primary text-white" });
                                if (fat > brandPlanningSummary.faturamento * 0.4 && marcasSimuladas.length > 1) insights.push({ label: "Motor de Volume", color: "bg-foreground text-white" });

                                return (
                                    <div key={marca.id} className="bg-white border rounded-3xl p-6 hover:shadow-xl hover:border-primary/30 transition-all relative group shadow-sm flex flex-col justify-between overflow-hidden">
                                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                                                onClick={() => setMarcasSimuladas(marcasSimuladas.filter((_, i) => i !== idx))}
                                            >
                                                <Plus className="w-4 h-4 rotate-45" />
                                            </Button>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-start mb-6">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
                                                            marca.categoria === 'Menina' ? "bg-pink-100 text-pink-700" :
                                                                marca.categoria === 'Menino' ? "bg-blue-100 text-blue-700" :
                                                                    "bg-amber-100 text-amber-700"
                                                        )}>{marca.categoria}</span>
                                                    </div>
                                                    <h4 className="font-black text-2xl tracking-tighter text-foreground">{marca.nome}</h4>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black text-muted-foreground uppercase mb-0.5">ROI Esperado</p>
                                                    <p className={cn("text-lg font-black", roi > 0.3 ? "text-success" : "text-primary")}>{formatNumber(roi * 100, 0)}%</p>
                                                </div>
                                            </div>

                                            <div className="space-y-6 pt-4 border-t border-muted/50">
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-end">
                                                        <label className="text-[10px] font-black uppercase text-muted-foreground">Investimento</label>
                                                        <span className="text-lg font-black text-primary">{formatCurrency(marca.investimento)}</span>
                                                    </div>
                                                    <Slider
                                                        value={[marca.investimento]}
                                                        max={simulation.investimento_mensal_necessario * 1.5}
                                                        step={500}
                                                        onValueChange={([v]) => {
                                                            const newBrands = [...marcasSimuladas];
                                                            newBrands[idx].investimento = v;
                                                            setMarcasSimuladas(newBrands);
                                                        }}
                                                        className="py-2"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-3 bg-muted/5 rounded-xl border border-muted/30">
                                                        <p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Qtd Peças</p>
                                                        <p className="text-sm font-black italic">{formatNumber(qte)} un.</p>
                                                    </div>
                                                    <div className="p-3 bg-success/5 rounded-xl border border-success/10 text-right">
                                                        <p className="text-[9px] font-black text-success uppercase mb-1">Lucro Estimado</p>
                                                        <p className="text-sm font-black text-success">{formatCurrency(lucroMarca)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-6 flex flex-wrap gap-1.5">
                                            {insights.map((insight, i) => (
                                                <Badge key={i} className={cn("text-[9px] font-black px-2 py-0.5 rounded-lg border-none", insight.color)}>
                                                    {insight.label}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* MIX DE COMPRA VISUAL */}
                    {marcasSimuladas.length > 0 && (
                        <div className="bg-white border rounded-3xl p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-2">
                                    <PieChart className="w-4 h-4 text-primary" />
                                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em]">Mix Estratégico da Compra</h5>
                                </div>
                                <p className="text-[11px] font-bold text-muted-foreground">Total: {formatCurrency(brandPlanningSummary.investimento)}</p>
                            </div>

                            <div className="flex w-full h-5 bg-muted overflow-hidden rounded-full shadow-inner border border-muted-foreground/10 mb-8">
                                {marcasSimuladas.filter(m => m.investimento > 0).map((marca, midx) => {
                                    const perc = (marca.investimento / (brandPlanningSummary.investimento || 1)) * 100;
                                    const colors = ['bg-primary', 'bg-success', 'bg-warning', 'bg-blue-500', 'bg-destructive', 'bg-pink-500'];
                                    return (
                                        <div
                                            key={marca.id}
                                            className={cn("h-full transition-all duration-1000", colors[midx % colors.length])}
                                            style={{ width: `${perc}%` }}
                                        />
                                    );
                                })}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                                {marcasSimuladas.filter(m => m.investimento > 0).map((marca, midx) => {
                                    const colors = ['bg-primary', 'bg-success', 'bg-warning', 'bg-blue-500', 'bg-destructive', 'bg-pink-500'];
                                    return (
                                        <div key={marca.id} className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-2 h-2 rounded-full", colors[midx % colors.length])} />
                                                <span className="text-[11px] font-black text-foreground truncate">{marca.nome}</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-muted-foreground ml-4">
                                                {((marca.investimento / (brandPlanningSummary.investimento || 1)) * 100).toFixed(0)}% • {formatCurrency(marca.investimento)}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
