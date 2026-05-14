import { useMemo, useState } from 'react';
import { Calculator, Tag, Users } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { InputField } from '../InputField';
import { PlanejamentoFinanceiro, SimulationValues } from '@/types/financial';
import { formatCurrency, formatNumber, formatPercent } from '@/utils/formatters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Props {
  calculateSimulation: (faturamento: number) => SimulationValues;
  currentFaturamento: number;
  data: PlanejamentoFinanceiro;
}

export function Simulacao({ calculateSimulation, currentFaturamento, data }: Props) {
  const [faturamentoDesejado, setFaturamentoDesejado] = useState(currentFaturamento * 1.5);
  const simulation = calculateSimulation(faturamentoDesejado);

  const generoSimulation = useMemo(() => {
    const rows = [
      { label: 'Menina', percentage: data.perc_menina, ticketMedio: data.tm_menina, accentClassName: 'bg-pink-400' },
      { label: 'Menino', percentage: data.perc_menino, ticketMedio: data.tm_menino, accentClassName: 'bg-sky-400' },
      { label: 'Bebê', percentage: data.perc_bebe, ticketMedio: data.tm_bebe, accentClassName: 'bg-amber-400' },
    ];

    return rows.map((row) => {
      const compraMensal = simulation.investimento_mensal_necessario * (row.percentage / 100);
      const faturamentoMensal = simulation.faturamento_mensal_desejado * (row.percentage / 100);
      const pecasMes = row.ticketMedio > 0 ? Math.ceil(faturamentoMensal / row.ticketMedio) : 0;

      return {
        ...row,
        compraMensal,
        faturamentoMensal,
        pecasMes,
      };
    });
  }, [
    data.perc_bebe,
    data.perc_menina,
    data.perc_menino,
    data.tm_bebe,
    data.tm_menina,
    data.tm_menino,
    simulation.faturamento_mensal_desejado,
    simulation.investimento_mensal_necessario,
  ]);

  const marcaSimulation = useMemo(() => {
    const roupasShare = data.perc_roupas / 100;

    const groups = [
      {
        title: 'Menina',
        share: data.perc_menina,
        totalPlanShare: data.perc_menina * roupasShare,
        compraMensalBase: simulation.investimento_mensal_necessario * (data.perc_menina / 100) * roupasShare,
        faturamentoMensalBase: simulation.faturamento_mensal_desejado * (data.perc_menina / 100) * roupasShare,
        description: `Usa ${formatPercent(data.perc_menina)} do mix de gênero e ${formatPercent(data.perc_roupas)} do mix de roupas.`,
        brands: [
          { name: data.marca_menina_1_nome, percentage: data.marca_menina_1_perc },
          { name: data.marca_menina_2_nome, percentage: data.marca_menina_2_perc },
          { name: data.marca_menina_3_nome, percentage: data.marca_menina_3_perc },
          { name: data.marca_menina_4_nome, percentage: data.marca_menina_4_perc },
        ],
      },
      {
        title: 'Menino',
        share: data.perc_menino,
        totalPlanShare: data.perc_menino * roupasShare,
        compraMensalBase: simulation.investimento_mensal_necessario * (data.perc_menino / 100) * roupasShare,
        faturamentoMensalBase: simulation.faturamento_mensal_desejado * (data.perc_menino / 100) * roupasShare,
        description: `Usa ${formatPercent(data.perc_menino)} do mix de gênero e ${formatPercent(data.perc_roupas)} do mix de roupas.`,
        brands: [
          { name: data.marca_menino_1_nome, percentage: data.marca_menino_1_perc },
          { name: data.marca_menino_2_nome, percentage: data.marca_menino_2_perc },
          { name: data.marca_menino_3_nome, percentage: data.marca_menino_3_perc },
          { name: data.marca_menino_4_nome, percentage: data.marca_menino_4_perc },
        ],
      },
      {
        title: 'Bebê',
        share: data.perc_bebe,
        totalPlanShare: data.perc_bebe * roupasShare,
        compraMensalBase: simulation.investimento_mensal_necessario * (data.perc_bebe / 100) * roupasShare,
        faturamentoMensalBase: simulation.faturamento_mensal_desejado * (data.perc_bebe / 100) * roupasShare,
        description: `Usa ${formatPercent(data.perc_bebe)} do mix de gênero e ${formatPercent(data.perc_roupas)} do mix de roupas.`,
        brands: [
          { name: data.marca_bebe_1_nome, percentage: data.marca_bebe_1_perc },
          { name: data.marca_bebe_2_nome, percentage: data.marca_bebe_2_perc },
          { name: data.marca_bebe_3_nome, percentage: data.marca_bebe_3_perc },
          { name: data.marca_bebe_4_nome, percentage: data.marca_bebe_4_perc },
        ],
      },
      {
        title: 'Sapatos',
        share: data.perc_sapatos,
        totalPlanShare: data.perc_sapatos,
        compraMensalBase: simulation.investimento_mensal_necessario * (data.perc_sapatos / 100),
        faturamentoMensalBase: simulation.faturamento_mensal_desejado * (data.perc_sapatos / 100),
        description: `Usa ${formatPercent(data.perc_sapatos)} do mix de categoria.`,
        brands: [
          { name: data.marca_sapato_1_nome, percentage: data.marca_sapato_1_perc },
          { name: data.marca_sapato_2_nome, percentage: data.marca_sapato_2_perc },
        ],
      },
    ];

    return groups.map((group) => {
      const normalizedBrands = group.brands
        .filter((brand) => brand.percentage > 0 || brand.name.trim())
        .map((brand, index) => ({
          name: brand.name.trim() || `Marca ${index + 1}`,
          percentage: brand.percentage,
          totalShare: group.totalPlanShare * (brand.percentage / 100),
          compraMensal: group.compraMensalBase * (brand.percentage / 100),
          faturamentoMensal: group.faturamentoMensalBase * (brand.percentage / 100),
        }));

      return {
        ...group,
        brands: normalizedBrands,
        percentageSum: group.brands.reduce((acc, brand) => acc + brand.percentage, 0),
      };
    });
  }, [
    data.marca_bebe_1_nome,
    data.marca_bebe_1_perc,
    data.marca_bebe_2_nome,
    data.marca_bebe_2_perc,
    data.marca_bebe_3_nome,
    data.marca_bebe_3_perc,
    data.marca_bebe_4_nome,
    data.marca_bebe_4_perc,
    data.marca_menina_1_nome,
    data.marca_menina_1_perc,
    data.marca_menina_2_nome,
    data.marca_menina_2_perc,
    data.marca_menina_3_nome,
    data.marca_menina_3_perc,
    data.marca_menina_4_nome,
    data.marca_menina_4_perc,
    data.marca_menino_1_nome,
    data.marca_menino_1_perc,
    data.marca_menino_2_nome,
    data.marca_menino_2_perc,
    data.marca_menino_3_nome,
    data.marca_menino_3_perc,
    data.marca_menino_4_nome,
    data.marca_menino_4_perc,
    data.marca_sapato_1_nome,
    data.marca_sapato_1_perc,
    data.marca_sapato_2_nome,
    data.marca_sapato_2_perc,
    data.perc_bebe,
    data.perc_menina,
    data.perc_menino,
    data.perc_roupas,
    data.perc_sapatos,
    simulation.faturamento_mensal_desejado,
    simulation.investimento_mensal_necessario,
  ]);

  return (
    <SectionCard title="12. SIMULAÇÃO DE FATURAMENTO DESEJADO" icon={<Calculator className="w-5 h-5" />}>
      <div className="alert-info mb-6">
        <p className="text-sm">Esta simulação é apenas uma projeção e <strong>não salva no banco de dados</strong>.</p>
      </div>

      <div className="mb-6">
        <InputField
          label="Faturamento Mensal Desejado"
          value={faturamentoDesejado}
          onChange={(v) => setFaturamentoDesejado(v as number)}
          prefix="R$"
          step={1000}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-block">
          <p className="stat-label">Faturamento Mensal</p>
          <p className="stat-value text-xl">{formatCurrency(simulation.faturamento_mensal_desejado)}</p>
        </div>
        <div className="stat-block">
          <p className="stat-label">Faturamento Ciclo</p>
          <p className="stat-value text-xl">{formatCurrency(simulation.faturamento_ciclo_desejado)}</p>
        </div>
        <div className="stat-block">
          <p className="stat-label">Investimento Mensal Necessário</p>
          <p className="stat-value text-xl">{formatCurrency(simulation.investimento_mensal_necessario)}</p>
        </div>
        <div className="stat-block">
          <p className="stat-label">Investimento Ciclo Necessário</p>
          <p className="stat-value text-xl">{formatCurrency(simulation.investimento_ciclo_necessario)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-accent/10 border border-accent/30">
        <div className="text-center">
          <p className="text-xs text-muted-foreground  ">Diferença Investimento Mensal</p>
          <p className={`text-2xl font-medium font-mono ${simulation.delta_investimento_mensal >= 0 ? 'text-destructive' : 'text-success'}`}>
            {simulation.delta_investimento_mensal >= 0 ? '+' : ''}{formatCurrency(simulation.delta_investimento_mensal)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground  ">Diferença Investimento Ciclo</p>
          <p className={`text-2xl font-medium font-mono ${simulation.delta_investimento_ciclo >= 0 ? 'text-destructive' : 'text-success'}`}>
            {simulation.delta_investimento_ciclo >= 0 ? '+' : ''}{formatCurrency(simulation.delta_investimento_ciclo)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-foreground font-medium  ">Peças Necessárias/Mês</p>
          <p className="text-2xl font-medium font-mono text-primary">{formatNumber(simulation.qtd_minima_pecas)}</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-muted/20 p-4">
        <div className="mb-4 flex flex-col gap-1">
          <h4 className="text-sm font-medium tracking-wide text-foreground">Como a compra simulada se distribui</h4>
          <p className="text-sm text-muted-foreground">
            Veja a compra mensal projetada primeiro por gênero e depois por marca, usando os percentuais já configurados no seu planejamento.
          </p>
        </div>

        <Tabs defaultValue="genero" className="w-full">
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="genero" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Por gênero
            </TabsTrigger>
            <TabsTrigger value="marca" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Por marca
            </TabsTrigger>
          </TabsList>

          <TabsContent value="genero" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              {generoSimulation.map((item) => (
                <div key={item.label} className="rounded-xl border bg-background p-4 shadow-none">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h5 className="font-medium text-foreground">{item.label}</h5>
                      <p className="text-xs text-muted-foreground">Ticket médio atual: {formatCurrency(item.ticketMedio)}</p>
                    </div>
                    <span className="badge-primary">{formatPercent(item.percentage)}</span>
                  </div>

                  <div className="mb-4 h-2 overflow-hidden rounded-full bg-secondary">
                    <div className={`h-full rounded-full ${item.accentClassName}`} style={{ width: `${Math.min(item.percentage, 100)}%` }} />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Compra mensal</p>
                      <p className="mt-1 text-lg font-medium text-foreground">{formatCurrency(item.compraMensal)}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Faturamento mensal</p>
                      <p className="mt-1 text-lg font-medium text-foreground">{formatCurrency(item.faturamentoMensal)}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3 sm:col-span-2">
                      <p className="text-xs text-muted-foreground">Peças estimadas por mês</p>
                      <p className="mt-1 text-lg font-medium text-primary">{formatNumber(item.pecasMes)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="marca" className="mt-4 space-y-4">
            <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
              As marcas de Menina, Menino e Bebê usam o mix de roupas. Sapatos usa o mix da categoria separadamente.
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {marcaSimulation.map((group) => (
                <div key={group.title} className="rounded-xl border bg-background shadow-none">
                  <div className="border-b bg-muted/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h5 className="font-medium text-foreground">{group.title}</h5>
                        <p className="mt-1 text-xs text-muted-foreground">{group.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="badge-primary">Plano: {formatPercent(group.totalPlanShare)}</span>
                        <span className={Math.abs(group.percentageSum - 100) < 0.01 ? 'badge-success' : 'badge-warning'}>
                          Marcas: {formatPercent(group.percentageSum)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border bg-background p-3">
                        <p className="text-xs text-muted-foreground">Compra mensal do grupo</p>
                        <p className="mt-1 text-lg font-medium text-foreground">{formatCurrency(group.compraMensalBase)}</p>
                      </div>
                      <div className="rounded-lg border bg-background p-3">
                        <p className="text-xs text-muted-foreground">Faturamento mensal do grupo</p>
                        <p className="mt-1 text-lg font-medium text-foreground">{formatCurrency(group.faturamentoMensalBase)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    {group.brands.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Cadastre as marcas dessa seção para ver a simulação detalhada.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr>
                              <th>Marca</th>
                              <th className="text-right">% grupo</th>
                              <th className="text-right">% plano</th>
                              <th className="text-right">Compra/mês</th>
                              <th className="text-right">Fat./mês</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.brands.map((brand) => (
                              <tr key={`${group.title}-${brand.name}`}>
                                <td className="font-medium">{brand.name}</td>
                                <td className="text-right">{formatPercent(brand.percentage)}</td>
                                <td className="text-right">{formatPercent(brand.totalShare)}</td>
                                <td className="text-right font-medium">{formatCurrency(brand.compraMensal)}</td>
                                <td className="text-right">{formatCurrency(brand.faturamentoMensal)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </SectionCard>
  );
}
