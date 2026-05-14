import { Layout } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { InputField } from '../InputField';
import { PlanejamentoFinanceiro } from '@/types/financial';
import { formatPercent } from '@/utils/formatters';

interface Props {
  data: PlanejamentoFinanceiro;
  updateField: <K extends keyof PlanejamentoFinanceiro>(field: K, value: PlanejamentoFinanceiro[K]) => void;
}

interface TipoBlockProps {
  title: string;
  tipos: { label: string; value: number; field: keyof PlanejamentoFinanceiro }[];
  updateField: Props['updateField'];
}

function TipoBlock({ title, tipos, updateField }: TipoBlockProps) {
  const soma = tipos.reduce((acc, t) => acc + t.value, 0);
  const isValid = Math.abs(soma - 100) < 0.01;

  return (
    <div className="border border-border p-4">
      <h4 className="font-medium text-sm   tracking-wide mb-4 text-foreground">{title}</h4>
      
      {!isValid && (
        <div className="alert-warning mb-3">
          <p className="text-xs">Soma: <strong>{formatPercent(soma)}</strong> (deve ser 100%)</p>
        </div>
      )}
      
      <div className="space-y-3">
        {tipos.map((tipo, idx) => (
          <InputField
            key={idx}
            label={tipo.label}
            value={tipo.value}
            onChange={(v) => updateField(tipo.field, v as number)}
            suffix="%"
            min={0}
            max={100}
          />
        ))}
      </div>
    </div>
  );
}

export function TiposPeca({ data, updateField }: Props) {
  const tiposMenina = [
    { label: 'Vestidos', value: data.tipo_menina_vestidos, field: 'tipo_menina_vestidos' as const },
    { label: 'Conjuntos', value: data.tipo_menina_conjuntos, field: 'tipo_menina_conjuntos' as const },
    { label: 'Casual', value: data.tipo_menina_casual, field: 'tipo_menina_casual' as const },
    { label: 'Básicos', value: data.tipo_menina_basicos, field: 'tipo_menina_basicos' as const },
  ];

  const tiposMenino = [
    { label: 'Conjuntos', value: data.tipo_menino_conjuntos, field: 'tipo_menino_conjuntos' as const },
    { label: 'Casual', value: data.tipo_menino_casual, field: 'tipo_menino_casual' as const },
    { label: 'Básicos', value: data.tipo_menino_basicos, field: 'tipo_menino_basicos' as const },
  ];

  const tiposBebe = [
    { label: 'Conjuntos', value: data.tipo_bebe_conjuntos, field: 'tipo_bebe_conjuntos' as const },
    { label: 'Casual', value: data.tipo_bebe_casual, field: 'tipo_bebe_casual' as const },
    { label: 'Básicos', value: data.tipo_bebe_basicos, field: 'tipo_bebe_basicos' as const },
  ];

  return (
    <SectionCard title="5. TIPOS DE PEÇA POR GÊNERO" icon={<Layout className="w-5 h-5" />}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TipoBlock title="Menina" tipos={tiposMenina} updateField={updateField} />
        <TipoBlock title="Menino" tipos={tiposMenino} updateField={updateField} />
        <TipoBlock title="Bebê" tipos={tiposBebe} updateField={updateField} />
      </div>
    </SectionCard>
  );
}
