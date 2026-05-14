import { Bell } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { AlertBox } from '../AlertBox';
import { Alert } from '@/types/financial';

interface Props {
  alerts: Alert[];
}

export function AlertasAutomaticos({ alerts }: Props) {
  return (
    <SectionCard title="10. ALERTAS AUTOMÁTICOS" icon={<Bell className="w-5 h-5" />}>
      {alerts.length > 0 ? (
        <AlertBox alerts={alerts} />
      ) : (
        <div className="alert-success">
          <p className="text-sm font-medium">Nenhum alerta no momento. Seu planejamento está dentro dos parâmetros esperados.</p>
        </div>
      )}
    </SectionCard>
  );
}
