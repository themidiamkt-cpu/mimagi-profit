import { useState } from 'react';
import { SectionCard } from '../SectionCard';
import { AlertBox } from '../AlertBox';
import { PlanejamentoFinanceiro, CalculatedValues, Alert, CanalVenda } from '@/types/financial';
import { formatCurrency, formatPercent } from '@/utils/formatters';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, Trash2, Edit2, Check, X, RefreshCw } from 'lucide-react';
import { useDashboardContext } from '@/contexts/DashboardContext';
import { Button } from '@/components/ui/button';

interface PlanejamentoCanaisProps {
  data: PlanejamentoFinanceiro;
  calculated: CalculatedValues;
  updateField: <K extends keyof PlanejamentoFinanceiro>(field: K, value: PlanejamentoFinanceiro[K]) => void;
  setCanaisMesAtivo: (mes: string) => void;
}

const COLORS = ['#1e4d4d', '#2d6b6b', '#3d8989', '#4da7a7', '#5dc5c5', '#6de3e3', '#7dffff', '#8effef', '#9effff', '#aeffff'];
const WEEK_FIELDS = [
  { key: 'realizado_semana_1', label: 'Semana 1' },
  { key: 'realizado_semana_2', label: 'Semana 2' },
  { key: 'realizado_semana_3', label: 'Semana 3' },
  { key: 'realizado_semana_4', label: 'Semana 4' },
] as const;

const formatMonthLabel = (mes: string) => {
  const [ano, mesNumero] = mes.split('-').map(Number);
  if (!ano || !mesNumero) return mes;
  return new Date(ano, mesNumero - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
};

const normalizeChannelName = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const createCanalFromName = (nome: string): CanalVenda => ({
  id: `auto-${normalizeChannelName(nome).replace(/[^a-z0-9]+/g, '-') || Date.now()}`,
  nome,
  perc: 0,
  ticket: 0,
  meta_semanal: 0,
  realizado_semana_1: 0,
  realizado_semana_2: 0,
  realizado_semana_3: 0,
  realizado_semana_4: 0,
  invest: 0,
  cpv: 0,
  conv: 0,
  hasInvest: false,
  roas_esperado: 0,
});

export function PlanejamentoCanais({ data, calculated, updateField, setCanaisMesAtivo }: PlanejamentoCanaisProps) {
  const { weeklyMetrics, refreshWeeklyMetrics, loadingWeekly } = useDashboardContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newCanalName, setNewCanalName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const faturamentoMensal = calculated.faturamento_mensal;
  const canais = data.canais_venda;
  const mesesSalvos = Object.keys(data.canais_venda_por_mes).sort().reverse();

  const configuredByName = canais.reduce<Record<string, CanalVenda>>((acc, canal) => {
    acc[normalizeChannelName(canal.nome)] = canal;
    return acc;
  }, {});

  const actualByName = WEEK_FIELDS.reduce<Record<string, {
    nome: string;
    realizado_semana_1: number;
    realizado_semana_2: number;
    realizado_semana_3: number;
    realizado_semana_4: number;
    qtdPedidos: number;
  }>>((acc, week, index) => {
    const weekData = weeklyMetrics?.[`week${index + 1}`];
    const channels = weekData?.channels || [];

    channels.forEach((channel: any) => {
      const nome = channel.nome || 'Venda Direta / Outros';
      const key = normalizeChannelName(nome);

      if (!acc[key]) {
        acc[key] = {
          nome,
          realizado_semana_1: 0,
          realizado_semana_2: 0,
          realizado_semana_3: 0,
          realizado_semana_4: 0,
          qtdPedidos: 0,
        };
      }

      acc[key][week.key] += Number(channel.faturamento || 0);
      acc[key].qtdPedidos += Number(channel.qtdPedidos || 0);
    });

    return acc;
  }, {});

  const channelKeys = Array.from(new Set([
    ...Object.keys(actualByName),
    ...canais
      .filter(canal => canal.meta_semanal > 0 || canal.perc > 0)
      .map(canal => normalizeChannelName(canal.nome)),
  ]));

  const realizedTotalFromChannels = Object.values(actualByName).reduce((acc, channel) =>
    acc +
    channel.realizado_semana_1 +
    channel.realizado_semana_2 +
    channel.realizado_semana_3 +
    channel.realizado_semana_4
  , 0);

  // Cálculos por canal
  const canaisCalculados = channelKeys.map(key => {
    const actual = actualByName[key];
    const canal = configuredByName[key] || createCanalFromName(actual?.nome || key);
    const r1 = actual?.realizado_semana_1 || 0;
    const r2 = actual?.realizado_semana_2 || 0;
    const r3 = actual?.realizado_semana_3 || 0;
    const r4 = actual?.realizado_semana_4 || 0;
    const realizadoMensal = r1 + r2 + r3 + r4;
    const metaSemanalPlanejada = Number(canal.meta_semanal || 0);
    const metaMensalPlanejada = metaSemanalPlanejada * 4;
    const perc = realizedTotalFromChannels > 0 ? (realizadoMensal / realizedTotalFromChannels) * 100 : 0;
    const faturamentoEsperado = metaMensalPlanejada;
    const ticketReal = actual?.qtdPedidos ? realizadoMensal / actual.qtdPedidos : 0;
    const pecasPlanejadasSemana =
      ticketReal > 0 ? Math.ceil(metaSemanalPlanejada / ticketReal) : 0;
    const pecasNecessarias = ticketReal > 0 ? Math.ceil(faturamentoEsperado / ticketReal) : 0;
    const roas = canal.roas_esperado || null;
    const vendasParaPagarInvest = canal.invest && ticketReal > 0 ? Math.ceil(canal.invest / ticketReal) : null;
    const atingimentoMeta = metaMensalPlanejada > 0 ? realizadoMensal / metaMensalPlanejada : null;
    const gapMetaMensal = metaMensalPlanejada - realizadoMensal;

    let status: 'verde' | 'amarelo' | 'vermelho' = 'verde';
    if (roas !== null && canal.hasInvest) {
      if (roas < 1) status = 'vermelho';
      else if (roas < 3) status = 'amarelo';
    }

    return {
      ...canal,
      realizado_semana_1: r1,
      realizado_semana_2: r2,
      realizado_semana_3: r3,
      realizado_semana_4: r4,
      perc,
      faturamentoEsperado,
      metaSemanalPlanejada,
      metaMensalPlanejada,
      realizadoMensal,
      qtdPedidos: actual?.qtdPedidos || 0,
      ticketReal,
      pecasPlanejadasSemana,
      pecasNecessarias,
      roas,
      vendasParaPagarInvest,
      atingimentoMeta,
      gapMetaMensal,
      status,
      isConfigured: Boolean(configuredByName[key]),
    };
  }).sort((a, b) => b.realizadoMensal - a.realizadoMensal || b.metaSemanalPlanejada - a.metaSemanalPlanejada);

  const metaSemanalTotal = canaisCalculados.reduce((acc, c) => acc + c.metaSemanalPlanejada, 0);
  const metaMensalCanais = canaisCalculados.reduce((acc, c) => acc + c.metaMensalPlanejada, 0);
  const realizadoMensalCanais = canaisCalculados.reduce((acc, c) => acc + c.realizadoMensal, 0);
  const gapMensalCanais = metaMensalCanais - realizadoMensalCanais;
  const atingimentoMensalCanais =
    metaMensalCanais > 0 ? realizadoMensalCanais / metaMensalCanais : null;

  // Dados para gráfico de pizza
  const pieData = canaisCalculados.map(c => ({
    name: c.nome,
    value: c.realizadoMensal,
    perc: c.perc,
  })).filter(c => c.value > 0);

  // Dados para gráfico de barras
  const barData = canaisCalculados.map(c => ({
    name: c.nome.length > 12 ? c.nome.substring(0, 12) + '...' : c.nome,
    meta: c.metaMensalPlanejada,
    realizado: c.realizadoMensal,
  }));

  // Alertas
  const alertasCanais: Alert[] = [];

  canaisCalculados.forEach(c => {
    if (c.hasInvest && c.roas !== null && c.roas < 1) {
      alertasCanais.push({ type: 'danger', message: `ROAS do canal ${c.nome} está abaixo de 1 (${c.roas.toFixed(2)}). Investimento não se paga.` });
    } else if (c.hasInvest && c.roas !== null && c.roas < 3) {
      alertasCanais.push({ type: 'warning', message: `ROAS do canal ${c.nome} está entre 1 e 3 (${c.roas.toFixed(2)}). Atenção ao retorno.` });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verde': return 'text-green-600 bg-green-50';
      case 'amarelo': return 'text-yellow-600 bg-yellow-50';
      case 'vermelho': return 'text-red-600 bg-red-50';
      default: return '';
    }
  };

  const getAtingimentoColor = (atingimento: number | null) => {
    if (atingimento === null) return 'text-muted-foreground';
    if (atingimento >= 1) return 'text-green-600';
    if (atingimento >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Funções para gerenciar canais
  const updateCanal = <K extends keyof CanalVenda>(id: string, field: K, value: CanalVenda[K]) => {
    const updatedCanais = canais.map(c =>
      c.id === id
        ? {
          ...c,
          [field]: value,
        }
        : c
    );
    updateField('canais_venda', updatedCanais);
  };

  const updateCanalMetaSemanal = (canal: CanalVenda, value: number) => {
    const normalizedName = normalizeChannelName(canal.nome);
    const existing = canais.find(c => normalizeChannelName(c.nome) === normalizedName);

    if (existing) {
      updateCanal(existing.id, 'meta_semanal', value);
      return;
    }

    updateField('canais_venda', [
      ...canais,
      {
        ...createCanalFromName(canal.nome),
        meta_semanal: value,
      },
    ]);
  };

  const addCanal = () => {
    if (!newCanalName.trim()) return;

    const newCanal: CanalVenda = {
      id: Date.now().toString(),
      nome: newCanalName.trim(),
      perc: 0,
      ticket: 150,
      meta_semanal: 0,
      realizado_semana_1: 0,
      realizado_semana_2: 0,
      realizado_semana_3: 0,
      realizado_semana_4: 0,
      invest: 0,
      cpv: 0,
      conv: 0,
      hasInvest: false,
      roas_esperado: 0,
    };

    updateField('canais_venda', [...canais, newCanal]);
    setNewCanalName('');
    setShowAddForm(false);
  };

  const removeCanal = (id: string) => {
    const updatedCanais = canais.filter(c => c.id !== id);
    updateField('canais_venda', updatedCanais);
  };

  const startEditing = (canal: CanalVenda) => {
    setEditingId(canal.id);
    setEditingName(canal.nome);
  };

  const saveEditing = () => {
    if (editingId && editingName.trim()) {
      updateCanal(editingId, 'nome', editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  return (
    <div className="space-y-6">
      <SectionCard title="13. PLANEJAMENTO POR CANAIS DE VENDA">
        <div className="mb-6 p-4 bg-muted/30 border border-border">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Competência ativa dos canais</div>
              <div className="text-2xl font-medium capitalize">{formatMonthLabel(data.canais_venda_mes_ativo)}</div>
              <div className="text-sm text-muted-foreground mt-1">
                Cada mês guarda seu próprio planejado e realizado semanal.
              </div>
            </div>
            <div className="w-full lg:w-56">
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Selecionar mês
              </label>
              <input
                type="month"
                value={data.canais_venda_mes_ativo}
                onChange={(e) => setCanaisMesAtivo(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          {mesesSalvos.length > 1 && (
            <div className="mt-3 text-sm text-muted-foreground">
              Meses salvos: {mesesSalvos.map(formatMonthLabel).join(' • ')}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-accent-subtle border border-accent/20">
            <div className="text-sm font-medium text-muted-foreground">Faturamento Mensal Total (Meta)</div>
            <div className="text-2xl font-medium font-mono text-accent mt-2">{formatCurrency(faturamentoMensal)}</div>
          </div>
          <div className="p-4 bg-muted/30 border border-border">
            <div className="text-sm font-medium text-muted-foreground">Meta Semanal Total</div>
            <div className="text-2xl font-medium font-mono mt-2">{formatCurrency(metaSemanalTotal)}</div>
          </div>
          <div className="p-4 bg-muted/30 border border-border">
            <div className="text-sm font-medium text-muted-foreground">Meta Mensal dos Canais</div>
            <div className="text-2xl font-medium font-mono mt-2">{formatCurrency(metaMensalCanais)}</div>
          </div>
          <div className="p-4 bg-muted/30 border border-border">
            <div className="text-sm font-medium text-muted-foreground">Realizado Acumulado</div>
            <div className={`text-2xl font-medium font-mono mt-2 ${getAtingimentoColor(atingimentoMensalCanais)}`}>
              {formatCurrency(realizadoMensalCanais)}
            </div>
          </div>
        </div>

        {/* Alertas */}
        {alertasCanais.length > 0 && (
          <div className="mb-6">
            <AlertBox alerts={alertasCanais} />
          </div>
        )}

        {/* Metas por Canal */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
            <h3 className="text-lg font-medium text-foreground">
              Metas Semanais por Canal
            </h3>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Adicionar Meta
            </button>
          </div>

          {/* Formulário para adicionar novo canal */}
          {showAddForm && (
            <div className="mb-4 p-4 bg-muted/50 border border-border">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Nome do Canal
                  </label>
                  <input
                    type="text"
                    value={newCanalName}
                    onChange={(e) => setNewCanalName(e.target.value)}
                    placeholder="Ex: E-commerce, Loja física..."
                    className="w-full px-3 py-2 bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <button
                  onClick={addCanal}
                  className="px-4 py-2 bg-primary text-primary-foreground font-medium hover:bg-primary/90"
                >
                  Adicionar
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewCanalName('');
                  }}
                  className="px-4 py-2 bg-muted text-muted-foreground font-medium hover:bg-muted/80"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Lista de canais do Bling com meta semanal editável */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left p-3 font-medium w-48">Canal</th>
                  <th className="text-right p-3 font-medium">Realizado Mês</th>
                  <th className="text-right p-3 font-medium">% Realizado</th>
                  <th className="text-right p-3 font-medium">Pedidos</th>
                  <th className="text-right p-3 font-medium">Ticket Real</th>
                  <th className="text-center p-3 font-medium">Meta Semanal</th>
                  <th className="text-right p-3 font-medium">Meta Mensal</th>
                  <th className="text-right p-3 font-medium">Atingimento</th>
                  <th className="text-center p-3 font-medium w-24">Ações</th>
                </tr>
              </thead>
              <tbody>
                {canaisCalculados.map((canal) => (
                  <tr key={canal.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3">
                      {editingId === canal.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 px-2 py-1 bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            autoFocus
                          />
                          <button onClick={saveEditing} className="p-1 text-green-600 hover:bg-green-50">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={cancelEditing} className="p-1 text-red-600 hover:bg-red-50">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="font-medium">{canal.nome}</span>
                      )}
                    </td>
                    <td className="text-right p-3 font-mono">{formatCurrency(canal.realizadoMensal)}</td>
                    <td className="text-right p-3 font-mono">{formatPercent(canal.perc)}</td>
                    <td className="text-right p-3 font-mono">{canal.qtdPedidos}</td>
                    <td className="text-right p-3 font-mono">{canal.ticketReal ? formatCurrency(canal.ticketReal) : '-'}</td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={canal.metaSemanalPlanejada}
                        onChange={(e) => updateCanalMetaSemanal(canal, Number(e.target.value))}
                        className="w-28 px-2 py-1 bg-background border border-border text-foreground text-center font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        min={0}
                      />
                    </td>
                    <td className="text-right p-3 font-mono">{formatCurrency(canal.metaMensalPlanejada)}</td>
                    <td className={`text-right p-3 font-mono ${getAtingimentoColor(canal.atingimentoMeta)}`}>
                      {canal.atingimentoMeta !== null ? formatPercent(canal.atingimentoMeta * 100) : '-'}
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {canal.isConfigured ? (
                          <button
                            onClick={() => removeCanal(canal.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Limpar meta manual"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Auto</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-medium">
                  <td className="p-3">TOTAL</td>
                  <td className="text-right p-3 font-mono">{formatCurrency(realizadoMensalCanais)}</td>
                  <td className="text-right p-3 font-mono">{realizadoMensalCanais > 0 ? '100,0%' : '-'}</td>
                  <td className="text-right p-3 font-mono">{canaisCalculados.reduce((acc, canal) => acc + canal.qtdPedidos, 0)}</td>
                  <td className="text-right p-3 font-mono">-</td>
                  <td className="text-center p-3 font-mono">{formatCurrency(metaSemanalTotal)}</td>
                  <td className="text-right p-3 font-mono">{formatCurrency(metaMensalCanais)}</td>
                  <td className={`text-right p-3 font-mono ${getAtingimentoColor(atingimentoMensalCanais)}`}>
                    {atingimentoMensalCanais !== null ? formatPercent(atingimentoMensalCanais * 100) : '-'}
                  </td>
                  <td className="text-center p-3">-</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
            <h3 className="text-lg font-medium text-foreground">
              Acompanhamento Semanal das Metas por Canal
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshWeeklyMetrics}
              disabled={loadingWeekly}
              className="h-8 gap-2 bg-background border-border hover:bg-muted"
            >
              <RefreshCw className={`h-4 w-4 ${loadingWeekly ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sincronizar com Bling</span>
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left p-3 font-medium">Canal</th>
                  {WEEK_FIELDS.map((week) => (
                    <th key={week.key} className="text-center p-3 font-medium">{week.label}</th>
                  ))}
                  <th className="text-right p-3 font-medium">Meta Mensal</th>
                  <th className="text-right p-3 font-medium">Realizado</th>
                  <th className="text-right p-3 font-medium">Gap</th>
                  <th className="text-right p-3 font-medium">Atingimento</th>
                </tr>
              </thead>
              <tbody>
                {canaisCalculados.map((canal) => (
                  <tr key={canal.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 font-medium">{canal.nome}</td>
                    {WEEK_FIELDS.map((week) => (
                      <td key={week.key} className="p-2">
                        <div className="w-28 px-2 py-1 bg-muted/40 border border-border text-center font-mono text-sm">
                          {formatCurrency(canal[week.key])}
                        </div>
                      </td>
                    ))}
                    <td className="text-right p-3 font-mono">{formatCurrency(canal.metaMensalPlanejada)}</td>
                    <td className="text-right p-3 font-mono">{formatCurrency(canal.realizadoMensal)}</td>
                    <td className={`text-right p-3 font-mono ${canal.gapMetaMensal <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {`${canal.gapMetaMensal <= 0 ? '+' : '-'}${formatCurrency(Math.abs(canal.gapMetaMensal))}`}
                    </td>
                    <td className={`text-right p-3 font-mono ${getAtingimentoColor(canal.atingimentoMeta)}`}>
                      {canal.atingimentoMeta !== null ? formatPercent(canal.atingimentoMeta * 100) : '-'}
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/50 font-medium">
                  <td className="p-3">TOTAL</td>
                  {WEEK_FIELDS.map((week) => (
                    <td key={week.key} className="text-center p-3 font-mono">
                      {formatCurrency(canaisCalculados.reduce((acc, canal) => acc + canal[week.key], 0))}
                    </td>
                  ))}
                  <td className="text-right p-3 font-mono">{formatCurrency(metaMensalCanais)}</td>
                  <td className="text-right p-3 font-mono">{formatCurrency(realizadoMensalCanais)}</td>
                  <td className={`text-right p-3 font-mono ${gapMensalCanais <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {`${gapMensalCanais <= 0 ? '+' : '-'}${formatCurrency(Math.abs(gapMensalCanais))}`}
                  </td>
                  <td className={`text-right p-3 font-mono ${getAtingimentoColor(atingimentoMensalCanais)}`}>
                    {atingimentoMensalCanais !== null ? formatPercent(atingimentoMensalCanais * 100) : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabela 1 - Distribuição de Faturamento */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-foreground mb-4 border-b border-border pb-2">
            Tabela: Metas e Realizado por Canal
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left p-3 font-medium">Canal</th>
                  <th className="text-right p-3 font-medium">% Realizado</th>
                  <th className="text-right p-3 font-medium">Realizado</th>
                  <th className="text-right p-3 font-medium">Meta Semanal</th>
                  <th className="text-right p-3 font-medium">Meta Mensal</th>
                  <th className="text-right p-3 font-medium">Ticket Real</th>
                  <th className="text-right p-3 font-medium">Pedidos</th>
                </tr>
              </thead>
              <tbody>
                {canaisCalculados.map((canal) => (
                  <tr key={canal.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 font-medium">{canal.nome}</td>
                    <td className="text-right p-3 font-mono">{formatPercent(canal.perc)}</td>
                    <td className="text-right p-3 font-mono">{formatCurrency(canal.realizadoMensal)}</td>
                    <td className="text-right p-3 font-mono">{formatCurrency(canal.metaSemanalPlanejada)}</td>
                    <td className="text-right p-3 font-mono">{formatCurrency(canal.metaMensalPlanejada)}</td>
                    <td className="text-right p-3 font-mono">{canal.ticketReal ? formatCurrency(canal.ticketReal) : '-'}</td>
                    <td className="text-right p-3 font-mono">{canal.qtdPedidos}</td>
                  </tr>
                ))}
                <tr className="bg-muted/50 font-medium">
                  <td className="p-3">TOTAL</td>
                  <td className="text-right p-3 font-mono">{realizadoMensalCanais > 0 ? '100,0%' : '-'}</td>
                  <td className="text-right p-3 font-mono">{formatCurrency(realizadoMensalCanais)}</td>
                  <td className="text-right p-3 font-mono">{formatCurrency(metaSemanalTotal)}</td>
                  <td className="text-right p-3 font-mono">{formatCurrency(metaMensalCanais)}</td>
                  <td className="text-right p-3 font-mono">-</td>
                  <td className="text-right p-3 font-mono">{canaisCalculados.reduce((acc, c) => acc + c.qtdPedidos, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabela 2 - Investimento por Canal */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-foreground mb-4 border-b border-border pb-2">
            Tabela: Investimento vs Retorno por Canal
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left p-3 font-medium">Canal</th>
                  <th className="text-right p-3 font-medium">Investimento</th>
                  <th className="text-right p-3 font-medium">CPV Estimado</th>
                  <th className="text-right p-3 font-medium">Vendas p/ Pagar Invest.</th>
                  <th className="text-right p-3 font-medium">ROAS Estimado</th>
                  <th className="text-left p-3 font-medium">Observações</th>
                </tr>
              </thead>
              <tbody>
                {canaisCalculados.filter(c => c.hasInvest).map((canal) => (
                  <tr key={canal.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 font-medium">{canal.nome}</td>
                    <td className="text-right p-3 font-mono">{formatCurrency(canal.invest || 0)}</td>
                    <td className="text-right p-3 font-mono">{canal.cpv ? formatCurrency(canal.cpv) : '-'}</td>
                    <td className="text-right p-3 font-mono">{canal.vendasParaPagarInvest || '-'}</td>
                    <td className="text-right p-3">
                      <span className={`px-2 py-1 text-xs font-medium font-mono ${getStatusColor(canal.status)}`}>
                        {canal.roas ? canal.roas.toFixed(2) : '-'}
                      </span>
                    </td>
                    <td className="text-left p-3 text-xs text-muted-foreground">
                      {canal.roas && canal.roas >= 3 ? 'ROAS saudável' : canal.roas && canal.roas >= 1 ? 'Atenção ao retorno' : canal.roas ? 'Investimento não se paga' : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Gráfico de Pizza */}
          <div className="bg-muted/30 p-4">
            <h4 className="text-sm font-medium text-foreground mb-4">Participação dos Canais no Faturamento</h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, perc }) => `${name.length > 8 ? name.substring(0, 8) + '...' : name} ${perc.toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Barras */}
          <div className="bg-muted/30 p-4">
            <h4 className="text-sm font-medium text-foreground mb-4">Meta Mensal x Realizado por Canal</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="meta" fill="#1e4d4d" name="Meta Mensal" />
                <Bar dataKey="realizado" fill="#4da7a7" name="Realizado" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
