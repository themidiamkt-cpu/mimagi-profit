import { VariaveisPrincipais } from '@/components/dashboard/sections/VariaveisPrincipais';
import { useDashboardContext } from '@/contexts/DashboardContext';

export default function Variaveis() {
  const { data, calculated, updateField } = useDashboardContext();

  return (
    <div className="space-y-6 animate-fade-in">
      <VariaveisPrincipais data={data} calculated={calculated} updateField={updateField} />
    </div>
  );
}
