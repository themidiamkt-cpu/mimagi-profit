import { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  variant?: 'default' | 'primary' | 'accent' | 'success' | 'warning';
  icon?: ReactNode;
}

export function MetricCard({ title, value, subtitle, variant = 'default', icon }: MetricCardProps) {
  const headerStyles = {
    default: 'bg-gradient-primary',
    primary: 'bg-gradient-primary',
    accent: 'bg-gradient-accent',
    success: 'bg-gradient-success',
    warning: 'bg-gradient-warning',
  };

  return (
    <div className="metric-card">
      <div className={`metric-card-header flex items-center justify-between ${headerStyles[variant]}`}>
        <span>{title}</span>
        {icon && <span className="opacity-80">{icon}</span>}
      </div>
      <div className="metric-card-value">
        {value}
        {subtitle && (
          <p className="text-sm font-normal text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
