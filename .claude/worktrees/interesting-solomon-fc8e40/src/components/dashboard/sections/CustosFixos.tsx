import { Building2, Plus, Trash2 } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { InputField } from '../InputField';
import { MetricCard } from '../MetricCard';
import { PlanejamentoFinanceiro, CalculatedValues, CustoExtra } from '@/types/financial';
import { formatCurrency } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  data: PlanejamentoFinanceiro;
  calculated: CalculatedValues;
  updateField: <K extends keyof PlanejamentoFinanceiro>(field: K, value: PlanejamentoFinanceiro[K]) => void;
}

export function CustosFixos({ data, calculated, updateField }: Props) {
  const addCustoExtra = () => {
    const newCusto: CustoExtra = {
      id: Date.now().toString(),
      nome: 'Novo Custo',
      valor: 0,
    };
    updateField('custos_extras', [...data.custos_extras, newCusto]);
  };

  const updateCustoExtra = (id: string, field: keyof CustoExtra, value: string | number) => {
    const updated = data.custos_extras.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    );
    updateField('custos_extras', updated);
  };

  const removeCustoExtra = (id: string) => {
    const updated = data.custos_extras.filter(c => c.id !== id);
    updateField('custos_extras', updated);
  };

  return (
    <SectionCard title="7. CUSTOS FIXOS MENSAIS" icon={<Building2 className="w-5 h-5" />}>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <InputField
          label="Aluguel"
          value={data.custo_aluguel}
          onChange={(v) => updateField('custo_aluguel', v as number)}
          prefix="R$"
        />
        <InputField
          label="Salários"
          value={data.custo_salarios}
          onChange={(v) => updateField('custo_salarios', v as number)}
          prefix="R$"
        />
        <InputField
          label="Encargos"
          value={data.custo_encargos}
          onChange={(v) => updateField('custo_encargos', v as number)}
          prefix="R$"
        />
        <InputField
          label="Água/Luz"
          value={data.custo_agua_luz}
          onChange={(v) => updateField('custo_agua_luz', v as number)}
          prefix="R$"
        />
        <InputField
          label="Internet"
          value={data.custo_internet}
          onChange={(v) => updateField('custo_internet', v as number)}
          prefix="R$"
        />
        <InputField
          label="Contador"
          value={data.custo_contador}
          onChange={(v) => updateField('custo_contador', v as number)}
          prefix="R$"
        />
        <InputField
          label="Embalagens"
          value={data.custo_embalagens}
          onChange={(v) => updateField('custo_embalagens', v as number)}
          prefix="R$"
        />
        <InputField
          label="Sistema"
          value={data.custo_sistema}
          onChange={(v) => updateField('custo_sistema', v as number)}
          prefix="R$"
        />
        <InputField
          label="Marketing"
          value={data.custo_marketing}
          onChange={(v) => updateField('custo_marketing', v as number)}
          prefix="R$"
        />
        <InputField
          label="Outros"
          value={data.custo_outros}
          onChange={(v) => updateField('custo_outros', v as number)}
          prefix="R$"
        />
      </div>

      {/* Custos Extras Dinâmicos */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-muted-foreground">Custos Adicionais</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={addCustoExtra}
            className="gap-2 rounded-none"
          >
            <Plus className="w-4 h-4" />
            Adicionar Custo
          </Button>
        </div>
        
        {data.custos_extras.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.custos_extras.map((custo) => (
              <div key={custo.id} className="flex items-end gap-2 p-3 bg-muted/30 border border-border">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
                  <Input
                    value={custo.nome}
                    onChange={(e) => updateCustoExtra(custo.id, 'nome', e.target.value)}
                    className="h-9 rounded-none text-sm"
                  />
                </div>
                <div className="w-32">
                  <label className="text-xs text-muted-foreground mb-1 block">Valor (R$)</label>
                  <Input
                    type="number"
                    value={custo.valor}
                    onChange={(e) => updateCustoExtra(custo.id, 'valor', Number(e.target.value))}
                    className="h-9 rounded-none text-sm font-mono"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCustoExtra(custo.id)}
                  className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-none"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          title="Total Mensal"
          value={formatCurrency(calculated.custo_fixo_mensal)}
          variant="warning"
        />
        <MetricCard
          title="Total no Ciclo (6 meses)"
          value={formatCurrency(calculated.custo_fixo_ciclo)}
          variant="warning"
        />
      </div>
    </SectionCard>
  );
}
