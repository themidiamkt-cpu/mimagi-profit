import { CustosFixos } from '@/components/dashboard/sections/CustosFixos';
import { useDashboardContext } from '@/contexts/DashboardContext';

export default function Custos() {
  const { data, calculated, updateField } = useDashboardContext();

  return (
    <div className="space-y-6 animate-fade-in">
      <CustosFixos data={data} calculated={calculated} updateField={updateField} />
    </div>
  );
}
