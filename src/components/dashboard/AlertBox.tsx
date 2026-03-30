import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Alert } from '@/types/financial';

interface AlertBoxProps {
  alerts: Alert[];
}

export function AlertBox({ alerts }: AlertBoxProps) {
  if (alerts.length === 0) return null;

  const getAlertStyles = (type: Alert['type']) => {
    switch (type) {
      case 'danger':
        return { className: 'alert-danger', icon: <AlertTriangle className="w-5 h-5 text-destructive" /> };
      case 'warning':
        return { className: 'alert-warning', icon: <AlertCircle className="w-5 h-5 text-warning" /> };
      case 'info':
        return { className: 'alert-info', icon: <Info className="w-5 h-5 text-info" /> };
    }
  };

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => {
        const { className, icon } = getAlertStyles(alert.type);
        return (
          <div key={index} className={className}>
            <div className="flex items-start gap-3">
              {icon}
              <p className="text-sm font-medium">{alert.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
