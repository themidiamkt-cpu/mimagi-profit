import { PlanejamentoCanais } from '@/components/dashboard/sections/PlanejamentoCanais';
import { useDashboardContext } from '@/contexts/DashboardContext';

export default function Canais() {
  const { data, calculated, updateField, setCanaisMesAtivo } = useDashboardContext();

  return (
    <div className="space-y-6 animate-fade-in">
      <PlanejamentoCanais
        data={data}
        calculated={calculated}
        updateField={updateField}
        setCanaisMesAtivo={setCanaisMesAtivo}
      />
    </div>
  );
}
