import { useEffect, useMemo, useState } from 'react';
import { useDashboardContext } from '@/contexts/DashboardContext';
import { DashboardAlertsNotice } from '@/components/dashboard/DashboardAlertsNotice';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { GrowthBirthdaysCard } from '@/components/growth/GrowthBirthdaysCard';
import { blingApi } from '@/lib/blingApi';
import { formatCurrency } from '@/utils/formatters';
import { Alert } from '@/types/financial';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Eye, TrendingUp, DollarSign, Target,
  Users, RefreshCw, Tag, Calendar, Filter, Receipt, ShoppingCart
} from 'lucide-react';
import { getCurrentMonthKey } from '@/types/financial';
import { cn } from '@/lib/utils';
import { AdvancedDatePicker } from "@/components/bling/AdvancedDatePicker";

const COLORS = ['#c96442', '#3b6d11', '#185fa5', '#854f0b', '#a32d2d', '#6b6b68'];
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const toDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const parseDate = (value: string) => new Date(`${value}T00:00:00`);

const getPreviousPeriodRange = (start: string, end: string) => {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  const periodLength = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / MS_PER_DAY) + 1);
  const previousEnd = new Date(startDate);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - (periodLength - 1));

  return {
    start: toDateValue(previousStart),
    end: toDateValue(previousEnd),
    periodLength,
  };
};

const getDaysRemainingInMonth = (dateValue: string) => {
  const currentDate = parseDate(dateValue);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  return Math.max(0, Math.round((monthEnd.getTime() - currentDate.getTime()) / MS_PER_DAY));
};

export default function VisaoGeral() {
  const {
    calculated,
    realTimeMetrics,
    brandMetrics,
    productMetrics,
    loadingRealTime,
    refreshRealTime,
    data,
    startDate,
    endDate,
    selectedLabel,
    setStartDate,
    setEndDate,
    setSelectedLabel,
    isSyncing,
    fluxoCaixa,
  } = useDashboardContext();
  const [previousPeriodMetrics, setPreviousPeriodMetrics] = useState<any | null>(null);

  // Dados para Meta x Realizado
  const faturamentoReal = realTimeMetrics?.totalFaturamento || 0;
  const metaFaturamento = calculated.faturamento_mensal || 0;
  const atingimentoMeta = metaFaturamento > 0 ? (faturamentoReal / metaFaturamento) * 100 : 0;
  const ticketMedioAtual = Number(realTimeMetrics?.ticketMedio || 0);

  // Dados do Fluxo de Caixa Real para o mês atual
  const currentMonthKey = getCurrentMonthKey();
  const currentMonthFlow = useMemo(() => {
    return fluxoCaixa?.find(f => f.mes === currentMonthKey);
  }, [fluxoCaixa, currentMonthKey]);

  // Se tivermos dados de boletos reais, usamos eles; senão, usamos a média planejada
  const gastosTotaisReais = currentMonthFlow ? currentMonthFlow.total_saidas : (calculated.custo_fixo_mensal + calculated.custo_produtos);
  const pontoEquilibrioReal = currentMonthFlow ? currentMonthFlow.faturamento_necessario : calculated.faturamento_minimo_mensal;
  const custoComercialReal = currentMonthFlow ? currentMonthFlow.custo_compras : calculated.custo_produtos;

  useEffect(() => {
    let isMounted = true;

    const fetchPreviousMetrics = async () => {
      try {
        const previousRange = getPreviousPeriodRange(startDate, endDate);
        const previousOrders = await blingApi.getLocalPedidos(previousRange.start, previousRange.end);

        if (!isMounted) {
          return;
        }

        setPreviousPeriodMetrics(blingApi.calculateMetrics(previousOrders));
      } catch (error) {
        console.error('Erro ao carregar métricas comparativas da Visão Geral:', error);
        if (isMounted) {
          setPreviousPeriodMetrics(null);
        }
      }
    };

    void fetchPreviousMetrics();

    return () => {
      isMounted = false;
    };
  }, [startDate, endDate]);

  const overviewAlerts = useMemo<Alert[]>(() => {
    const nextAlerts: Alert[] = [];
    const ticketMedioAnterior = Number(previousPeriodMetrics?.ticketMedio || 0);

    if (ticketMedioAnterior > 0 && ticketMedioAtual > 0 && ticketMedioAtual < ticketMedioAnterior) {
      const ticketDeltaPercent = ((ticketMedioAnterior - ticketMedioAtual) / ticketMedioAnterior) * 100;

      nextAlerts.push({
        type: ticketDeltaPercent >= 15 ? 'danger' : 'warning',
        message: `Ticket médio caiu ${ticketDeltaPercent.toFixed(1)}% vs o período anterior (${formatCurrency(ticketMedioAtual)} agora vs ${formatCurrency(ticketMedioAnterior)} antes).`,
      });
    }

    if (metaFaturamento > 0 && faturamentoReal < metaFaturamento) {
      const gapValue = Math.max(0, metaFaturamento - faturamentoReal);
      const gapPercent = Math.max(0, 100 - atingimentoMeta);
      const elapsedDays = Math.max(1, Math.floor((parseDate(endDate).getTime() - parseDate(startDate).getTime()) / MS_PER_DAY) + 1);
      const remainingDays = getDaysRemainingInMonth(endDate);
      const currentDailyAverage = faturamentoReal / elapsedDays;

      nextAlerts.push({
        type: gapPercent >= 50 ? 'danger' : 'warning',
        message: `Faltam ${gapPercent.toFixed(1)}% para atingir a meta, o que representa ${formatCurrency(gapValue)} neste mês.`,
      });

      if (remainingDays > 0) {
        const requiredDailyRevenue = gapValue / remainingDays;

        nextAlerts.push({
          type: requiredDailyRevenue > currentDailyAverage * 1.5 ? 'danger' : 'info',
          message: `Para atingir a meta, é preciso faturar ${formatCurrency(requiredDailyRevenue)} por dia nos próximos ${remainingDays} dias. O ritmo atual está em ${formatCurrency(currentDailyAverage)}/dia.`,
        });
      }
    }

    return nextAlerts;
  }, [previousPeriodMetrics, ticketMedioAtual, metaFaturamento, faturamentoReal, atingimentoMeta, startDate, endDate]);

  const chartMetaReal = [
    { name: 'Faturamento', Planejado: metaFaturamento, Realizado: faturamentoReal }
  ];

  // Dados para Despesas por Categoria (baseado no Planejamento)
  const despesasFixas = [
    { name: 'Aluguel', value: data.custo_aluguel },
    { name: 'Salários', value: data.custo_salarios + data.custo_encargos },
    { name: 'Marketing', value: data.custo_marketing },
    { name: 'Operacional', value: data.custo_agua_luz + data.custo_internet + data.custo_sistema + data.custo_contador },
    { name: 'Embalagens', value: data.custo_embalagens },
    { name: 'Outros', value: data.custo_outros + data.custos_extras.reduce((acc, c) => acc + c.valor, 0) },
  ].filter(d => d.value > 0);

  // Dados para Gráfico de Marcas (Excluindo "Sem Marca")
  const brandChartData = brandMetrics
    .filter(bm => !['Outros / Sem Marca', 'Sem Marca', 'N/A', 'Sem Detalhamento (Resync necessário)'].includes(bm.marca))
    .slice(0, 8); // Top 8 para não poluir o gráfico


  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="tracking-tight">Painel Estratégico</h1>
          <p className="text-sm text-text-secondary">Visão holística de metas, vendas reais e eficiência operacional.</p>
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

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-card border rounded-xl p-5 shadow-none">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Target className="w-4 h-4" />
            <span className="text-xs font-medium   tracking-wider">Meta de Faturamento</span>
          </div>
          <div className="text-2xl font-medium">{formatCurrency(metaFaturamento)}</div>
          <div className="mt-2 text-xs text-muted-foreground">
            Meta definida no Ciclo
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5 shadow-none relative overflow-hidden">
          <div className="flex items-center gap-2 text-primary mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium   tracking-wider">Faturamento Real (Mês)</span>
          </div>
          <div className="text-2xl font-medium text-primary">{formatCurrency(faturamentoReal)}</div>
          <div className="mt-2 flex items-center gap-1">
            <span className={cn(
              "text-xs font-medium px-1.5 py-0.5 rounded",
              atingimentoMeta >= 100 ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
            )}>
              {atingimentoMeta.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground">da meta atingida</span>
          </div>
          <div className="absolute bottom-0 left-0 h-1 bg-primary/10 w-full">
            <div
              className="h-full bg-primary transition-all duration-1000"
              style={{ width: `${Math.min(atingimentoMeta, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5 shadow-none relative overflow-hidden">
          <div className="flex items-center gap-2 text-destructive mb-2">
            <Receipt className="w-4 h-4" />
            <span className="text-xs font-medium   tracking-wider">Saídas Reais (Mês)</span>
          </div>
          <div className="text-2xl font-medium text-destructive">
            {formatCurrency(gastosTotaisReais)}
          </div>
          <div className="mt-2 text-xs text-muted-foreground flex flex-col gap-1">
            <span>Fixo ({formatCurrency(calculated.custo_fixo_mensal)})</span>
            <span>Boletos ({formatCurrency(custoComercialReal)})</span>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5 shadow-none relative overflow-hidden">
          <div className="flex items-center gap-2 text-primary mb-2">
            <ShoppingCart className="w-4 h-4" />
            <span className="text-xs font-medium   tracking-wider">Volume de Vendas</span>
          </div>
          <div className="text-2xl font-medium text-primary">{realTimeMetrics?.totalPedidos || 0}</div>
          <div className="mt-2 text-xs text-muted-foreground">
            Total de pedidos no período
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5 shadow-none">
          <div className="flex items-center gap-2 text-success mb-2">
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium   tracking-wider">Ticket Médio Geral</span>
          </div>
          <div className="text-2xl font-medium text-success">
            {realTimeMetrics?.totalPedidos > 0
              ? formatCurrency(realTimeMetrics.totalFaturamento / realTimeMetrics.totalPedidos)
              : 'R$ 0,00'}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Baseado em {realTimeMetrics?.totalPedidos || 0} pedidos
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <GrowthBirthdaysCard />
        <DashboardAlertsNotice
          alerts={overviewAlerts}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionCard title="Crescimento: Planejado vs Realizado" icon={<TrendingUp className="w-5 h-5" />}>
            <div className="h-[300px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartMetaReal} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                  />
                  <Legend iconType="circle" />
                  <Bar name="Planejado" dataKey="Planejado" fill="#94a3b8" radius={[8, 8, 0, 0]} barSize={60} />
                  <Bar name="Realizado" dataKey="Realizado" fill="var(--accent)" radius={[8, 8, 0, 0]} barSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-4 bg-muted/30 rounded-lg flex items-center justify-between">
              <span className="text-sm">Gap para atingir a meta:</span>
              <span className="font-medium text-destructive">
                {formatCurrency(Math.max(0, metaFaturamento - faturamentoReal))}
              </span>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Gastos (Plan)" icon={<DollarSign className="w-5 h-5" />}>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={despesasFixas}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {despesasFixas.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Desempenho por Canal - Reduzido para LG:2/4 (50%) */}
        <div className="bg-card border rounded-xl overflow-hidden shadow-none lg:col-span-2 flex flex-col">
          <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h4 className="font-medium text-sm  ">Desempenho por Canal</h4>
            </div>
            <span className="text-[10px] text-muted-foreground   bg-muted px-2 py-0.5 rounded">Real Time</span>
          </div>
          <div className="overflow-x-auto flex-grow">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="p-4 font-medium">Canal</th>
                  <th className="p-4 font-medium text-center">Ped.</th>
                  <th className="p-4 font-medium text-right">Fat.</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {realTimeMetrics?.channels?.map((channel: any, idx: number) => (
                  <tr key={idx} className="hover:bg-muted/10 transition-colors">
                    <td className="p-4 font-medium truncate max-w-[120px]">{channel.nome}</td>
                    <td className="p-4 text-center">{channel.qtdPedidos}</td>
                    <td className="p-4 text-right font-medium">{formatCurrency(channel.faturamento)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mix de Público */}
        <div className="bg-card border rounded-xl overflow-hidden shadow-none">
          <div className="p-4 border-b bg-muted/20 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h4 className="font-medium text-sm  ">Público (%)</h4>
          </div>
          <div className="p-4 space-y-4">
            {[
              { label: 'Menina', value: data.perc_menina, color: '#f472b6' },
              { label: 'Menino', value: data.perc_menino, color: '#60a5fa' },
              { label: 'Bebê', value: data.perc_bebe, color: '#fbbf24' },
            ].map(item => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span>{item.label}</span>
                  <span className="font-medium">{item.value}%</span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Seção unificada de Marcas: Gráfico + Tabela */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-xl overflow-hidden shadow-none p-4">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-xs   tracking-tight">Gráfico por Marca</h4>
          </div>
          <div className="h-[250px] w-full">
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
                  width={100}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(val) => val.length > 15 ? `${val.substring(0, 15)}...` : val}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                  formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                />
                <Bar
                  dataKey="faturamento"
                  fill="#FF8042"
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                >
                  {brandChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ranking Detalhado de Marcas */}
        <div className="bg-card border rounded-xl overflow-hidden shadow-none">
          <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              <h4 className="font-medium text-xs   tracking-tight">Ranking Detalhado</h4>
            </div>
            <span className="text-[10px] text-muted-foreground   bg-muted px-2 py-0.5 rounded">Real Time</span>
          </div>
          <div className="max-h-[250px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-left sticky top-0 z-10">
                <tr className="text-[10px]   font-medium text-muted-foreground">
                  <th className="p-3">Marca</th>
                  <th className="p-3 text-center">Itens</th>
                  <th className="p-3 text-right">Faturamento</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {brandMetrics.length > 0 ? (
                  brandMetrics.map((brand: any, idx: number) => (
                    <tr key={idx} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3 font-medium">{brand.marca}</td>
                      <td className="p-3 text-center">{brand.qtdItens}</td>
                      <td className="p-3 text-right font-medium">{formatCurrency(brand.faturamento)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-muted-foreground italic">
                      Nenhum dado encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Top Produtos Vendidos */}
      <div className="bg-card border rounded-xl overflow-hidden shadow-none pb-12">
        <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            <h4 className="font-medium text-sm  ">Top Produtos Vendidos</h4>
          </div>
          <span className="text-[10px] text-muted-foreground   bg-muted px-2 py-0.5 rounded">Real Time</span>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left sticky top-0 z-10">
              <tr>
                <th className="p-4 font-medium">Produto</th>
                <th className="p-4 font-medium text-center">Qtd</th>
                <th className="p-4 font-medium text-right">Faturamento</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {productMetrics.slice(0, 20).map((prod: any, idx: number) => (
                <tr key={idx} className="hover:bg-muted/10 transition-colors">
                  <td className="p-4">
                    <div className="font-medium truncate max-w-[400px]" title={prod.nome}>
                      {prod.nome}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{prod.codigo} | {prod.marca}</div>
                  </td>
                  <td className="p-4 text-center font-medium">{prod.qtd}</td>
                  <td className="p-4 text-right">{formatCurrency(prod.faturamento)}</td>
                </tr>
              ))}
              {productMetrics.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-muted-foreground italic">
                    Nenhum produto encontrado. Sincronize o Bling.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
