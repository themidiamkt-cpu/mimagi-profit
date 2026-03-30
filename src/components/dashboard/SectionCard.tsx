import { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
}

export function SectionCard({ title, children, icon }: SectionCardProps) {
  return (
    <section className="corporate-card animate-fade-in">
      <div className="section-header flex items-center gap-3">
        {icon && <span className="text-accent">{icon}</span>}
        <span>{title}</span>
      </div>
      {children}
    </section>
  );
}
