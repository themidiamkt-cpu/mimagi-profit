import { Tag } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { InputField } from '../InputField';
import { PlanejamentoFinanceiro, CalculatedValues } from '@/types/financial';
import { formatCurrency, formatPercent } from '@/utils/formatters';

interface Props {
  data: PlanejamentoFinanceiro;
  calculated: CalculatedValues;
  updateField: <K extends keyof PlanejamentoFinanceiro>(field: K, value: PlanejamentoFinanceiro[K]) => void;
}

interface MarcaBlockProps {
  title: string;
  marcas: { nome: string; perc: number; nomeField: keyof PlanejamentoFinanceiro; percField: keyof PlanejamentoFinanceiro }[];
  investimentoBase: number;
  faturamentoBase: number;
  updateField: Props['updateField'];
}

function MarcaBlock({ title, marcas, investimentoBase, faturamentoBase, updateField }: MarcaBlockProps) {
  const somaPerc = marcas.reduce((acc, m) => acc + m.perc, 0);
  const isValid = Math.abs(somaPerc - 100) < 0.01;

  return (
    <div className="border border-border p-4 mb-4">
      <h4 className="font-semibold text-sm uppercase tracking-wide mb-4 text-foreground">{title}</h4>
      
      {!isValid && (
        <div className="alert-warning mb-3">
          <p className="text-xs">Soma: <strong>{formatPercent(somaPerc)}</strong> (deve ser 100%)</p>
        </div>
      )}
      
      <div className="space-y-3">
        {marcas.map((marca, idx) => (
          <div key={idx} className="grid grid-cols-4 gap-2 items-end">
            <div className="col-span-2">
              <InputField
                label={`Marca ${idx + 1}`}
                value={marca.nome}
                onChange={(v) => updateField(marca.nomeField, v as string)}
                type="text"
              />
            </div>
            <InputField
              label="%"
              value={marca.perc}
              onChange={(v) => updateField(marca.percField, v as number)}
              suffix="%"
              min={0}
              max={100}
            />
            <div className="text-xs text-muted-foreground pb-2">
              <div>Inv: {formatCurrency(investimentoBase * (marca.perc / 100))}</div>
              <div>Fat: {formatCurrency(faturamentoBase * (marca.perc / 100))}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DistribuicaoMarcas({ data, calculated, updateField }: Props) {
  const marcasMenina = [
    { nome: data.marca_menina_1_nome, perc: data.marca_menina_1_perc, nomeField: 'marca_menina_1_nome' as const, percField: 'marca_menina_1_perc' as const },
    { nome: data.marca_menina_2_nome, perc: data.marca_menina_2_perc, nomeField: 'marca_menina_2_nome' as const, percField: 'marca_menina_2_perc' as const },
    { nome: data.marca_menina_3_nome, perc: data.marca_menina_3_perc, nomeField: 'marca_menina_3_nome' as const, percField: 'marca_menina_3_perc' as const },
    { nome: data.marca_menina_4_nome, perc: data.marca_menina_4_perc, nomeField: 'marca_menina_4_nome' as const, percField: 'marca_menina_4_perc' as const },
  ];

  const marcasMenino = [
    { nome: data.marca_menino_1_nome, perc: data.marca_menino_1_perc, nomeField: 'marca_menino_1_nome' as const, percField: 'marca_menino_1_perc' as const },
    { nome: data.marca_menino_2_nome, perc: data.marca_menino_2_perc, nomeField: 'marca_menino_2_nome' as const, percField: 'marca_menino_2_perc' as const },
    { nome: data.marca_menino_3_nome, perc: data.marca_menino_3_perc, nomeField: 'marca_menino_3_nome' as const, percField: 'marca_menino_3_perc' as const },
    { nome: data.marca_menino_4_nome, perc: data.marca_menino_4_perc, nomeField: 'marca_menino_4_nome' as const, percField: 'marca_menino_4_perc' as const },
  ];

  const marcasBebe = [
    { nome: data.marca_bebe_1_nome, perc: data.marca_bebe_1_perc, nomeField: 'marca_bebe_1_nome' as const, percField: 'marca_bebe_1_perc' as const },
    { nome: data.marca_bebe_2_nome, perc: data.marca_bebe_2_perc, nomeField: 'marca_bebe_2_nome' as const, percField: 'marca_bebe_2_perc' as const },
    { nome: data.marca_bebe_3_nome, perc: data.marca_bebe_3_perc, nomeField: 'marca_bebe_3_nome' as const, percField: 'marca_bebe_3_perc' as const },
    { nome: data.marca_bebe_4_nome, perc: data.marca_bebe_4_perc, nomeField: 'marca_bebe_4_nome' as const, percField: 'marca_bebe_4_perc' as const },
  ];

  const marcasSapato = [
    { nome: data.marca_sapato_1_nome, perc: data.marca_sapato_1_perc, nomeField: 'marca_sapato_1_nome' as const, percField: 'marca_sapato_1_perc' as const },
    { nome: data.marca_sapato_2_nome, perc: data.marca_sapato_2_perc, nomeField: 'marca_sapato_2_nome' as const, percField: 'marca_sapato_2_perc' as const },
  ];

  return (
    <SectionCard title="4. DISTRIBUIÇÃO POR MARCAS" icon={<Tag className="w-5 h-5" />}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MarcaBlock
          title="Marcas Menina"
          marcas={marcasMenina}
          investimentoBase={calculated.investimento_menina * (data.perc_roupas / 100)}
          faturamentoBase={calculated.faturamento_menina * (data.perc_roupas / 100)}
          updateField={updateField}
        />
        <MarcaBlock
          title="Marcas Menino"
          marcas={marcasMenino}
          investimentoBase={calculated.investimento_menino * (data.perc_roupas / 100)}
          faturamentoBase={calculated.faturamento_menino * (data.perc_roupas / 100)}
          updateField={updateField}
        />
        <MarcaBlock
          title="Marcas Bebê"
          marcas={marcasBebe}
          investimentoBase={calculated.investimento_bebe * (data.perc_roupas / 100)}
          faturamentoBase={calculated.faturamento_bebe * (data.perc_roupas / 100)}
          updateField={updateField}
        />
        <MarcaBlock
          title="Marcas Sapatos"
          marcas={marcasSapato}
          investimentoBase={calculated.investimento_sapatos}
          faturamentoBase={calculated.faturamento_sapatos}
          updateField={updateField}
        />
      </div>
    </SectionCard>
  );
}
