import { AcompanhamentoMeta } from '@/components/dashboard/sections/AcompanhamentoMeta';
import { ResultadoLucro } from '@/components/dashboard/sections/ResultadoLucro';
import { PontoEquilibrio } from '@/components/dashboard/sections/PontoEquilibrio';
import { AlertasAutomaticos } from '@/components/dashboard/sections/AlertasAutomaticos';
import { useDashboardContext } from '@/contexts/DashboardContext';

export default function Resultados() {
  const { data, calculated, alerts, updateField } = useDashboardContext();

  return (
    <div className="space-y-6 animate-fade-in">
      <AcompanhamentoMeta data={data} calculated={calculated} updateField={updateField} />
      <ResultadoLucro calculated={calculated} />
      <PontoEquilibrio calculated={calculated} />
      <AlertasAutomaticos alerts={alerts} />
    </div>
  );
}
