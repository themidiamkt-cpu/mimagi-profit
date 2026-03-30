import { useState } from 'react';
import { SectionCard } from '../SectionCard';
import { AlertBox } from '../AlertBox';
import { PlanejamentoFinanceiro, CalculatedValues, Alert, CanalVenda } from '@/types/financial';
import { formatCurrency, formatPercent } from '@/utils/formatters';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';

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

  if (!ano || !mesNumero) {
    return mes;
  }

  return new Date(ano, mesNumero - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
};

export function PlanejamentoCanais({ data, calculated, updateField, setCanaisMesAtivo }: PlanejamentoCanaisProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newCanalName, setNewCanalName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  const faturamentoMensal = calculated.faturamento_mensal;
  const faturamentoSemanal = faturamentoMensal / 4;
  const canais = data.canais_venda;
  const mesesSalvos = Object.keys(data.canais_venda_por_mes).sort().reverse();

  // Soma dos percentuais
  const somaPerc = canais.reduce((acc, c) => acc + c.perc, 0);
  const distribuicaoValida = Math.abs(somaPerc - 100) <= 0.01;

  // Investimento total
  const investimentoTotal = canais.reduce((acc, c) => acc + (c.invest || 0), 0);

  const calculateMetaSemanal = (perc: number) => faturamentoSemanal * (perc / 100);

  // Cálculos por canal
  const canaisCalculados = canais.map(canal => {
    const faturamentoEsperado = faturamentoMensal * (canal.perc / 100);
    const metaSemanalPlanejada = calculateMetaSemanal(canal.perc);
    const metaMensalPlanejada = metaSemanalPlanejada * 4;
    const realizadoMensal =
      canal.realizado_semana_1 +
      canal.realizado_semana_2 +
      canal.realizado_semana_3 +
      canal.realizado_semana_4;
    const pecasPlanejadasSemana =
      canal.ticket > 0 ? Math.ceil(metaSemanalPlanejada / canal.ticket) : 0;
    const pecasNecessarias = canal.ticket > 0 ? Math.ceil(faturamentoEsperado / canal.ticket) : 0;
    const roas = canal.roas_esperado || null;
    const vendasParaPagarInvest = canal.invest && canal.ticket > 0 ? Math.ceil(canal.invest / canal.ticket) : null;
    const atingimentoMeta = metaMensalPlanejada > 0 ? realizadoMensal / metaMensalPlanejada : null;
    const gapMetaMensal = metaMensalPlanejada - realizadoMensal;
    
    let status: 'verde' | 'amarelo' | 'vermelho' = 'verde';
    if (roas !== null && canal.hasInvest) {
      if (roas < 1) status = 'vermelho';
      else if (roas < 3) status = 'amarelo';
    }
    
    return {
      ...canal,
      faturamentoEsperado,
      metaSemanalPlanejada,
      metaMensalPlanejada,
      realizadoMensal,
      pecasPlanejadasSemana,
      pecasNecessarias,
      roas,
      vendasParaPagarInvest,
      atingimentoMeta,
      gapMetaMensal,
      status,
    };
  });

  const metaSemanalTotal = canaisCalculados.reduce((acc, c) => acc + c.metaSemanalPlanejada, 0);
  const metaMensalCanais = canaisCalculados.reduce((acc, c) => acc + c.metaMensalPlanejada, 0);
  const realizadoMensalCanais = canaisCalculados.reduce((acc, c) => acc + c.realizadoMensal, 0);
  const gapMensalCanais = metaMensalCanais - realizadoMensalCanais;
  const atingimentoMensalCanais =
    metaMensalCanais > 0 ? realizadoMensalCanais / metaMensalCanais : null;

  // Dados para gráfico de pizza
  const pieData = canaisCalculados.map(c => ({
    name: c.nome,
    value: c.faturamentoEsperado,
    perc: c.perc,
  }));

  // Dados para gráfico de barras
  const barData = canaisCalculados.map(c => ({
    name: c.nome.length > 12 ? c.nome.substring(0, 12) + '...' : c.nome,
    meta: c.metaMensalPlanejada,
    realizado: c.realizadoMensal,
  }));

  // Alertas
  const alertasCanais: Alert[] = [];
  
  if (!distribuicaoValida) {
    alertasCanais.push({ type: 'danger', message: `A soma da participação dos canais é ${somaPerc.toFixed(1)}%. Deve ser 100%.` });
  }

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
            ...(field === 'perc'
              ? { meta_semanal: calculateMetaSemanal(Number(value)) }
              : {}),
          }
        : c
    );
    updateField('canais_venda', updatedCanais);
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
              <div className="text-2xl font-semibold capitalize">{formatMonthLabel(data.canais_venda_mes_ativo)}</div>
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
          <div className="p-4 bg-primary/10 border border-primary/30">
            <div className="text-sm font-medium text-muted-foreground">Faturamento Mensal Total (Meta)</div>
            <div className="text-2xl font-bold font-mono text-primary mt-2">{formatCurrency(faturamentoMensal)}</div>
          </div>
          <div className="p-4 bg-muted/30 border border-border">
            <div className="text-sm font-medium text-muted-foreground">Meta Semanal Total</div>
            <div className="text-2xl font-bold font-mono mt-2">{formatCurrency(metaSemanalTotal)}</div>
          </div>
          <div className="p-4 bg-muted/30 border border-border">
            <div className="text-sm font-medium text-muted-foreground">Meta Mensal dos Canais</div>
            <div className="text-2xl font-bold font-mono mt-2">{formatCurrency(metaMensalCanais)}</div>
          </div>
          <div className="p-4 bg-muted/30 border border-border">
            <div className="text-sm font-medium text-muted-foreground">Realizado Acumulado</div>
            <div className={`text-2xl font-bold font-mono mt-2 ${getAtingimentoColor(atingimentoMensalCanais)}`}>
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

        {/* Inputs de Distribuição por Canal */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
            <h3 className="text-lg font-semibold text-foreground">
              Configuração dos Canais
            </h3>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Adicionar Canal
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
                    placeholder="Ex: Mercado Livre, E-commerce..."
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

          {/* Lista de Canais Editáveis */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left p-3 font-semibold w-48">Canal</th>
                  <th className="text-center p-3 font-semibold">% Planejado</th>
                  <th className="text-center p-3 font-semibold">Ticket Médio Planejado</th>
                  <th className="text-center p-3 font-semibold">Meta Semanal</th>
                  <th className="text-center p-3 font-semibold">Investimento</th>
                  <th className="text-center p-3 font-semibold">CPV</th>
                  <th className="text-center p-3 font-semibold">Conv. %</th>
                  <th className="text-center p-3 font-semibold">ROAS Esperado</th>
                  <th className="text-center p-3 font-semibold">Tem Invest.?</th>
                  <th className="text-center p-3 font-semibold w-24">Ações</th>
                </tr>
              </thead>
              <tbody>
                {canais.map((canal) => (
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
                    <td className="p-2">
                      <input
                        type="number"
                        value={canal.perc}
                        onChange={(e) => updateCanal(canal.id, 'perc', Number(e.target.value))}
                        className="w-20 px-2 py-1 bg-background border border-border text-foreground text-center font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        min={0}
                        max={100}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={canal.ticket}
                        onChange={(e) => updateCanal(canal.id, 'ticket', Number(e.target.value))}
                        className="w-24 px-2 py-1 bg-background border border-border text-foreground text-center font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        min={0}
                      />
                    </td>
                    <td className="p-2">
                      <div className="w-28 px-2 py-1 bg-muted/40 border border-border text-foreground text-center font-mono text-sm">
                        {formatCurrency(canaisCalculados.find((item) => item.id === canal.id)?.metaSemanalPlanejada || 0)}
                      </div>
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={canal.invest}
                        onChange={(e) => updateCanal(canal.id, 'invest', Number(e.target.value))}
                        className="w-24 px-2 py-1 bg-background border border-border text-foreground text-center font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        min={0}
                        disabled={!canal.hasInvest}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={canal.cpv}
                        onChange={(e) => updateCanal(canal.id, 'cpv', Number(e.target.value))}
                        className="w-20 px-2 py-1 bg-background border border-border text-foreground text-center font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        min={0}
                        disabled={!canal.hasInvest}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={canal.conv}
                        onChange={(e) => updateCanal(canal.id, 'conv', Number(e.target.value))}
                        className="w-20 px-2 py-1 bg-background border border-border text-foreground text-center font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        min={0}
                        step={0.1}
                        disabled={!canal.hasInvest}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={canal.roas_esperado}
                        onChange={(e) => updateCanal(canal.id, 'roas_esperado', Number(e.target.value))}
                        className="w-20 px-2 py-1 bg-background border border-border text-foreground text-center font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        min={0}
                        step={0.1}
                        disabled={!canal.hasInvest}
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={canal.hasInvest}
                        onChange={(e) => updateCanal(canal.id, 'hasInvest', e.target.checked)}
                        className="w-4 h-4 accent-primary"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => startEditing(canal)}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted"
                          title="Editar nome"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeCanal(canal.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Remover canal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-semibold">
                  <td className="p-3">TOTAL</td>
                  <td className={`text-center p-3 font-mono ${distribuicaoValida ? 'text-green-600' : 'text-red-600'}`}>
                    {somaPerc.toFixed(1)}%
                  </td>
                  <td className="text-center p-3 font-mono">-</td>
                  <td className="text-center p-3 font-mono">{formatCurrency(metaSemanalTotal)}</td>
                  <td className="text-center p-3 font-mono">{formatCurrency(investimentoTotal)}</td>
                  <td className="text-center p-3 font-mono">-</td>
                  <td className="text-center p-3 font-mono">-</td>
                  <td className="text-center p-3 font-mono">-</td>
                  <td className="text-center p-3">-</td>
                  <td className="text-center p-3">-</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {!distribuicaoValida && (
            <div className="mt-2 text-sm font-medium text-red-600">
              Total: {somaPerc.toFixed(1)}% (deve ser 100%)
            </div>
          )}
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4 border-b border-border pb-2">
            Acompanhamento Semanal das Metas por Canal
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left p-3 font-semibold">Canal</th>
                  {WEEK_FIELDS.map((week) => (
                    <th key={week.key} className="text-center p-3 font-semibold">{week.label}</th>
                  ))}
                  <th className="text-right p-3 font-semibold">Meta Mensal</th>
                  <th className="text-right p-3 font-semibold">Realizado</th>
                  <th className="text-right p-3 font-semibold">Gap</th>
                  <th className="text-right p-3 font-semibold">Atingimento</th>
                </tr>
              </thead>
              <tbody>
                {canaisCalculados.map((canal) => (
                  <tr key={canal.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 font-medium">{canal.nome}</td>
                    {WEEK_FIELDS.map((week) => (
                      <td key={week.key} className="p-2">
                        <input
                          type="number"
                          value={canal[week.key]}
                          onChange={(e) => updateCanal(canal.id, week.key, Number(e.target.value))}
                          className="w-24 px-2 py-1 bg-background border border-border text-foreground text-center font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          min={0}
                        />
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
                <tr className="bg-muted/50 font-semibold">
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
          <h3 className="text-lg font-semibold text-foreground mb-4 border-b border-border pb-2">
            Tabela: Planejado por Canal
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left p-3 font-semibold">Canal</th>
                  <th className="text-right p-3 font-semibold">% Planejado</th>
                  <th className="text-right p-3 font-semibold">Fat. Mensal pelo %</th>
                  <th className="text-right p-3 font-semibold">Meta Semanal</th>
                  <th className="text-right p-3 font-semibold">Meta Mensal Cadastrada</th>
                  <th className="text-right p-3 font-semibold">Ticket Planejado</th>
                  <th className="text-right p-3 font-semibold">Peças/Semana</th>
                </tr>
              </thead>
              <tbody>
                {canaisCalculados.map((canal) => (
                  <tr key={canal.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 font-medium">{canal.nome}</td>
                    <td className="text-right p-3 font-mono">{formatPercent(canal.perc)}</td>
                    <td className="text-right p-3 font-mono">{formatCurrency(canal.faturamentoEsperado)}</td>
                      <td className="text-right p-3 font-mono">{formatCurrency(canal.metaSemanalPlanejada)}</td>
                    <td className="text-right p-3 font-mono">{formatCurrency(canal.metaMensalPlanejada)}</td>
                    <td className="text-right p-3 font-mono">{formatCurrency(canal.ticket)}</td>
                    <td className="text-right p-3 font-mono">{canal.pecasPlanejadasSemana}</td>
                  </tr>
                ))}
                <tr className="bg-muted/50 font-semibold">
                  <td className="p-3">TOTAL</td>
                  <td className="text-right p-3 font-mono">{formatPercent(somaPerc)}</td>
                  <td className="text-right p-3 font-mono">{formatCurrency(faturamentoMensal)}</td>
                  <td className="text-right p-3 font-mono">{formatCurrency(metaSemanalTotal)}</td>
                  <td className="text-right p-3 font-mono">{formatCurrency(metaMensalCanais)}</td>
                  <td className="text-right p-3 font-mono">-</td>
                  <td className="text-right p-3 font-mono">{canaisCalculados.reduce((acc, c) => acc + c.pecasPlanejadasSemana, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabela 2 - Investimento por Canal */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4 border-b border-border pb-2">
            Tabela: Investimento vs Retorno por Canal
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left p-3 font-semibold">Canal</th>
                  <th className="text-right p-3 font-semibold">Investimento</th>
                  <th className="text-right p-3 font-semibold">CPV Estimado</th>
                  <th className="text-right p-3 font-semibold">Vendas p/ Pagar Invest.</th>
                  <th className="text-right p-3 font-semibold">ROAS Estimado</th>
                  <th className="text-left p-3 font-semibold">Observações</th>
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
                      <span className={`px-2 py-1 text-xs font-semibold font-mono ${getStatusColor(canal.status)}`}>
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
            <h4 className="text-sm font-semibold text-foreground mb-4">Participação dos Canais no Faturamento</h4>
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
            <h4 className="text-sm font-semibold text-foreground mb-4">Meta Mensal x Realizado por Canal</h4>
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
