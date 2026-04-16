import { SectionCard } from '../SectionCard';
import { ResumoExecutivo } from '@/types/compras';
import { formatCurrency } from '@/utils/formatters';
import { AlertTriangle, TrendingUp, Target, DollarSign, Calendar, CheckCircle, XCircle, Briefcase } from 'lucide-react';

interface Props {
  resumo: ResumoExecutivo;
  totalComprometido: number;
}

export function VisaoDiretoria({ resumo, totalComprometido }: Props) {
  const diferencaCaixa = resumo.faturamento_planejado - resumo.caixa_necessario_medio;
  const coberturaOk = diferencaCaixa >= 0;

  return (
    <SectionCard title="Visão Diretoria - Resumo Executivo" icon={<Briefcase className="w-5 h-5" />}>
      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="metric-card">
          <div className="metric-card-header flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Mês de Maior Investimento
          </div>
          <div className="metric-card-value text-xl">
            {resumo.mes_maior_comprometimento}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header bg-gradient-warning flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Valor Máximo de Saída
          </div>
          <div className="metric-card-value">
            {formatCurrency(resumo.valor_maximo_saida)}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header bg-gradient-success flex items-center gap-2">
            <Target className="w-4 h-4" />
            Faturamento Planejado
          </div>
          <div className="metric-card-value">
            {formatCurrency(resumo.faturamento_planejado)}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header bg-gradient-accent flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Total Investido
          </div>
          <div className="metric-card-value">
            {formatCurrency(totalComprometido)}
          </div>
        </div>
      </div>

      {/* Comparativo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className={`p-4 border-l-4 ${coberturaOk ? 'border-success bg-success/5' : 'border-destructive bg-destructive/5'}`}>
          <div className="flex items-center gap-2 mb-2">
            {coberturaOk ? (
              <CheckCircle className="w-5 h-5 text-success" />
            ) : (
              <XCircle className="w-5 h-5 text-destructive" />
            )}
            <span className="font-medium">Cobertura de Caixa</span>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <span className="text-xs text-muted-foreground  ">Fat. Planejado</span>
              <p className="font-mono text-lg">{formatCurrency(resumo.faturamento_planejado)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground  ">Caixa Necessário (Média)</span>
              <p className="font-mono text-lg">{formatCurrency(resumo.caixa_necessario_medio)}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground  ">Diferença</span>
            <p className={`font-mono text-xl font-medium ${coberturaOk ? 'text-success' : 'text-destructive'}`}>
              {coberturaOk ? '+' : ''}{formatCurrency(diferencaCaixa)}
            </p>
          </div>
        </div>

        {/* Meses críticos */}
        <div className="p-4 border border-border">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Meses Críticos
          </h4>
          {resumo.meses_criticos.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {resumo.meses_criticos.map((mes, i) => (
                <span key={i} className="badge-danger">
                  {mes}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-success flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Nenhum mês crítico identificado
            </p>
          )}
        </div>
      </div>

      {/* Alertas */}
      {resumo.alertas.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Alertas Automáticos
          </h4>
          {resumo.alertas.map((alerta, i) => (
            <div key={i} className="alert-warning">
              <p className="text-sm">{alerta}</p>
            </div>
          ))}
        </div>
      )}

      {/* Indicadores de decisão */}
      <div className="mt-6 p-4 bg-muted/50 border border-border">
        <h4 className="font-medium mb-3">Indicadores de Decisão</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-foreground font-medium">Quanto já está investido:</span>
            <p className="font-mono font-medium text-lg">{formatCurrency(totalComprometido)}</p>
          </div>
          <div>
            <span className="text-foreground font-medium">Pico de investimento (saída):</span>
            <p className="font-mono font-medium text-lg">{resumo.mes_maior_comprometimento}</p>
            <p className="font-mono text-primary font-medium">{formatCurrency(resumo.valor_maximo_saida)}</p>
          </div>
          <div>
            <span className="text-foreground font-medium">Para sustentar crescimento:</span>
            <p className="font-mono font-medium text-lg">{formatCurrency(resumo.caixa_necessario_medio)}/mês</p>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
