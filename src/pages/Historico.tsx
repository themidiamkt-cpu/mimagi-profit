import { HistoricoFinanceiro } from '@/components/dashboard/sections/HistoricoFinanceiro';

export default function Historico() {
    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-medium text-text-primary tracking-tight">Histórico Financeiro</h1>
                <p className="text-muted-foreground text-sm">Acompanhe a evolução do seu faturamento e volume de peças</p>
            </div>

            <HistoricoFinanceiro />
        </div>
    );
}
