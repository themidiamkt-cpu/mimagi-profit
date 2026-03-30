import { useDashboardContext } from '@/contexts/DashboardContext';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { formatCurrency, formatPercent } from '@/utils/formatters';
import { Eye, DollarSign, Package, AlertTriangle, CheckCircle } from 'lucide-react';

export default function VisaoGeral() {
  const { data, calculated, alerts, compras, resumoExecutivo, totalComprometido } = useDashboardContext();

  const alertasAtivos = alerts.filter(a => a.type === 'danger' || a.type === 'warning');

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionCard title="VISÃO GERAL DO NEGÓCIO" icon={<Eye className="w-5 h-5" />}>
        {/* KPIs principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="stat-block">
            <span className="stat-label">Investimento/Ciclo</span>
            <span className="stat-value text-primary">{formatCurrency(data.investimento_ciclo)}</span>
          </div>
          <div className="stat-block">
            <span className="stat-label">Faturamento/Mês</span>
            <span className="stat-value text-accent">{formatCurrency(calculated.faturamento_mensal)}</span>
          </div>
          <div className="stat-block">
            <span className="stat-label">Lucro Previsto/Mês</span>
            <span className="stat-value text-success">{formatCurrency(calculated.lucro_liquido)}</span>
          </div>
          <div className="stat-block">
            <span className="stat-label">Margem</span>
            <span className="stat-value">{data.margem}x</span>
          </div>
        </div>

        {/* Compras e Fluxo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-accent" />
              <h4 className="font-semibold uppercase text-sm">Compras Cadastradas</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total de compras:</span>
                <span className="font-mono font-semibold">{compras.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor comprometido:</span>
                <span className="font-mono font-semibold text-accent">{formatCurrency(totalComprometido)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mês crítico:</span>
                <span className="font-mono font-semibold">{resumoExecutivo.mes_maior_comprometimento}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Maior saída:</span>
                <span className="font-mono font-semibold text-destructive">{formatCurrency(resumoExecutivo.valor_maximo_saida)}</span>
              </div>
            </div>
          </div>

          <div className="border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-accent" />
              <h4 className="font-semibold uppercase text-sm">Ponto de Equilíbrio</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custos fixos/mês:</span>
                <span className="font-mono">{formatCurrency(calculated.custo_fixo_mensal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Faturamento mínimo:</span>
                <span className="font-mono font-semibold">{formatCurrency(calculated.faturamento_minimo_mensal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Margem de lucro:</span>
                <span className={`font-mono font-semibold ${calculated.margem_lucro > 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatPercent(calculated.margem_lucro)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Alertas */}
        <div className="border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            {alertasAtivos.length > 0 ? (
              <AlertTriangle className="w-5 h-5 text-warning" />
            ) : (
              <CheckCircle className="w-5 h-5 text-success" />
            )}
            <h4 className="font-semibold uppercase text-sm">
              Status do Planejamento
            </h4>
          </div>
          
          {alertasAtivos.length === 0 ? (
            <p className="text-success text-sm">Todos os indicadores estão dentro dos parâmetros esperados.</p>
          ) : (
            <div className="space-y-2">
              {alertasAtivos.slice(0, 5).map((alert, i) => (
                <div 
                  key={i} 
                  className={`text-sm p-2 ${
                    alert.type === 'danger' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                  }`}
                >
                  {alert.message}
                </div>
              ))}
              {alertasAtivos.length > 5 && (
                <p className="text-sm text-muted-foreground">
                  + {alertasAtivos.length - 5} outros alertas
                </p>
              )}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
