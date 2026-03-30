import { useState } from 'react';
import { SectionCard } from '../SectionCard';
import { InputField } from '../InputField';
import { AlertBox } from '../AlertBox';
import { PlanejamentoFinanceiro, CalculatedValues, Alert, CanalVenda } from '@/types/financial';
import { formatCurrency, formatPercent } from '@/utils/formatters';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';

interface PlanejamentoCanaisProps {
  data: PlanejamentoFinanceiro;
  calculated: CalculatedValues;
  updateField: <K extends keyof PlanejamentoFinanceiro>(field: K, value: PlanejamentoFinanceiro[K]) => void;
}

const COLORS = ['#1e4d4d', '#2d6b6b', '#3d8989', '#4da7a7', '#5dc5c5', '#6de3e3', '#7dffff', '#8effef', '#9effff', '#aeffff'];

export function PlanejamentoCanais({ data, calculated, updateField }: PlanejamentoCanaisProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newCanalName, setNewCanalName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  const faturamentoMensal = calculated.faturamento_mensal;
  const canais = data.canais_venda;

  // Soma dos percentuais
  const somaPerc = canais.reduce((acc, c) => acc + c.perc, 0);
  const distribuicaoValida = Math.abs(somaPerc - 100) <= 0.01;

  // Investimento total
  const investimentoTotal = canais.reduce((acc, c) => acc + (c.invest || 0), 0);

  // Cálculos por canal
  const canaisCalculados = canais.map(canal => {
    const faturamentoEsperado = faturamentoMensal * (canal.perc / 100);
    const pecasNecessarias = canal.ticket > 0 ? Math.ceil(faturamentoEsperado / canal.ticket) : 0;
    const roas = canal.roas_esperado || null;
    const vendasParaPagarInvest = canal.invest && canal.ticket > 0 ? Math.ceil(canal.invest / canal.ticket) : null;
    
    let status: 'verde' | 'amarelo' | 'vermelho' = 'verde';
    if (roas !== null && canal.hasInvest) {
      if (roas < 1) status = 'vermelho';
      else if (roas < 3) status = 'amarelo';
    }
    
    return {
      ...canal,
      faturamentoEsperado,
      pecasNecessarias,
      roas,
      vendasParaPagarInvest,
      status,
    };
  });

  // Dados para gráfico de pizza
  const pieData = canaisCalculados.map(c => ({
    name: c.nome,
    value: c.faturamentoEsperado,
    perc: c.perc,
  }));

  // Dados para gráfico de barras
  const barData = canaisCalculados.filter(c => c.hasInvest && c.invest).map(c => ({
    name: c.nome.length > 12 ? c.nome.substring(0, 12) + '...' : c.nome,
    investimento: c.invest || 0,
    faturamento: c.faturamentoEsperado,
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

  // Funções para gerenciar canais
  const updateCanal = (id: string, field: keyof CanalVenda, value: string | number | boolean) => {
    const updatedCanais = canais.map(c => 
      c.id === id ? { ...c, [field]: value } : c
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

  // Sugestões de conteúdo
  const sugestoesConteudo = [
    { canal: 'Instagram Ads', formato: 'Reels + Carrossel', objetivo: 'Conversão', meta: 'Testar 10 criativos/semana' },
    { canal: 'Instagram Orgânico', formato: 'Reels + Stories', objetivo: 'Engajamento', meta: '3 reels + 15 stories/semana' },
    { canal: 'Loja Física', formato: 'Ações presenciais', objetivo: 'Experiência', meta: '3 ativações semanais' },
    { canal: 'WhatsApp', formato: 'Lista + Broadcast', objetivo: 'Relacionamento', meta: '1 lista + 1 broadcast/semana' },
    { canal: 'Shopee', formato: 'Otimização anúncios', objetivo: 'Visibilidade', meta: 'Otimizar 5 anúncios/semana' },
    { canal: 'Mercado Livre', formato: 'Anúncios + Promoções', objetivo: 'Visibilidade', meta: 'Atualizar 10 anúncios/semana' },
    { canal: 'E-commerce', formato: 'SEO + Conteúdo', objetivo: 'Tráfego Orgânico', meta: '2 posts blog/semana' },
  ];

  return (
    <div className="space-y-6">
      <SectionCard title="13. PLANEJAMENTO POR CANAIS DE VENDA">
        {/* Card de Faturamento Mensal Total */}
        <div className="mb-6 p-4 bg-primary/10 border border-primary/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Faturamento Mensal Total (Meta)</span>
            <span className="text-2xl font-bold font-mono text-primary">{formatCurrency(faturamentoMensal)}</span>
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
              Canais de Venda
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
                  <th className="text-center p-3 font-semibold">% Faturamento</th>
                  <th className="text-center p-3 font-semibold">Ticket Médio</th>
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

        {/* Tabela 1 - Distribuição de Faturamento */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4 border-b border-border pb-2">
            Tabela: Distribuição de Faturamento por Canal
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left p-3 font-semibold">Canal</th>
                  <th className="text-right p-3 font-semibold">% Fat.</th>
                  <th className="text-right p-3 font-semibold">Fat. Esperado</th>
                  <th className="text-right p-3 font-semibold">Ticket Médio</th>
                  <th className="text-right p-3 font-semibold">Peças Necessárias</th>
                  <th className="text-center p-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {canaisCalculados.map((canal) => (
                  <tr key={canal.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 font-medium">{canal.nome}</td>
                    <td className="text-right p-3 font-mono">{formatPercent(canal.perc)}</td>
                    <td className="text-right p-3 font-mono">{formatCurrency(canal.faturamentoEsperado)}</td>
                    <td className="text-right p-3 font-mono">{formatCurrency(canal.ticket)}</td>
                    <td className="text-right p-3 font-mono">{canal.pecasNecessarias}</td>
                    <td className="text-center p-3">
                      <span className={`px-2 py-1 text-xs font-semibold ${getStatusColor(canal.status)}`}>
                        {canal.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/50 font-semibold">
                  <td className="p-3">TOTAL</td>
                  <td className="text-right p-3 font-mono">{formatPercent(somaPerc)}</td>
                  <td className="text-right p-3 font-mono">{formatCurrency(faturamentoMensal)}</td>
                  <td className="text-right p-3 font-mono">-</td>
                  <td className="text-right p-3 font-mono">{canaisCalculados.reduce((acc, c) => acc + c.pecasNecessarias, 0)}</td>
                  <td className="text-center p-3">-</td>
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
            <h4 className="text-sm font-semibold text-foreground mb-4">Investimento vs Faturamento Esperado</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="investimento" fill="#1e4d4d" name="Investimento" />
                <Bar dataKey="faturamento" fill="#4da7a7" name="Faturamento" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </SectionCard>

      {/* Seção de Conteúdos */}
      <SectionCard title="13.1 PLANEJAMENTO DE CONTEÚDOS POR CANAL">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 border-b border-border pb-2">
            Conteúdos Semanais por Canal
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <InputField label="Reels Ads" value={data.conteudo_reels_ads} onChange={v => updateField('conteudo_reels_ads', Number(v))} />
            <InputField label="Criativos Tráfego" value={data.conteudo_criativos_trafego} onChange={v => updateField('conteudo_criativos_trafego', Number(v))} />
            <InputField label="Stories/Dia" value={data.conteudo_stories_dia} onChange={v => updateField('conteudo_stories_dia', Number(v))} />
            <InputField label="Posts/Semana" value={data.conteudo_posts_semana} onChange={v => updateField('conteudo_posts_semana', Number(v))} />
            <InputField label="Ações Loja" value={data.conteudo_acoes_loja} onChange={v => updateField('conteudo_acoes_loja', Number(v))} />
            <InputField label="WhatsApp" value={data.conteudo_whatsapp} onChange={v => updateField('conteudo_whatsapp', Number(v))} />
            <InputField label="Shopee" value={data.conteudo_shopee} onChange={v => updateField('conteudo_shopee', Number(v))} />
          </div>
        </div>

        {/* Tabela de Sugestões */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 border-b border-border pb-2">
            Sugestões de Conteúdo por Canal
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left p-3 font-semibold">Canal</th>
                  <th className="text-left p-3 font-semibold">Melhor Formato</th>
                  <th className="text-left p-3 font-semibold">Objetivo</th>
                  <th className="text-left p-3 font-semibold">Meta Sugerida</th>
                </tr>
              </thead>
              <tbody>
                {sugestoesConteudo.map((sug, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 font-medium">{sug.canal}</td>
                    <td className="p-3">{sug.formato}</td>
                    <td className="p-3">{sug.objetivo}</td>
                    <td className="p-3 text-accent font-medium">{sug.meta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}