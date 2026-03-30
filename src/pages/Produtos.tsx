import { DistribuicaoMarcas } from '@/components/dashboard/sections/DistribuicaoMarcas';
import { TiposPeca } from '@/components/dashboard/sections/TiposPeca';
import { TicketMedio } from '@/components/dashboard/sections/TicketMedio';
import { useDashboardContext } from '@/contexts/DashboardContext';
import { formatCurrency } from '@/utils/formatters';
import { CATEGORIAS_LABELS, CategoriaCompra } from '@/types/compras';

export default function Produtos() {
  const { data, calculated, updateField, compras } = useDashboardContext();

  // Agrupar marcas por categoria das compras
  const marcasPorCategoria = compras.reduce((acc, compra) => {
    if (!acc[compra.categoria]) {
      acc[compra.categoria] = {};
    }
    if (!acc[compra.categoria][compra.marca]) {
      acc[compra.categoria][compra.marca] = 0;
    }
    acc[compra.categoria][compra.marca] += compra.valor_total;
    return acc;
  }, {} as Record<CategoriaCompra, Record<string, number>>);

  const categoriasComMarcas = Object.entries(marcasPorCategoria);

  return (
    <div className="space-y-6 animate-fade-in">
      {categoriasComMarcas.length > 0 && (
        <div className="bg-info/10 border-l-4 border-info p-4">
          <h4 className="font-semibold text-sm mb-3">Marcas Cadastradas (Compras)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categoriasComMarcas.map(([categoria, marcas]) => {
              const totalCategoria = Object.values(marcas).reduce((a, b) => a + b, 0);
              return (
                <div key={categoria} className="border border-border p-3 bg-card">
                  <h5 className="font-semibold text-sm mb-2 text-accent">
                    {CATEGORIAS_LABELS[categoria as CategoriaCompra]}
                  </h5>
                  <div className="space-y-1 text-xs">
                    {Object.entries(marcas).map(([marca, valor]) => (
                      <div key={marca} className="flex justify-between">
                        <span className="text-muted-foreground">{marca}</span>
                        <span className="font-mono">
                          {formatCurrency(valor)} ({((valor / totalCategoria) * 100).toFixed(0)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <DistribuicaoMarcas data={data} calculated={calculated} updateField={updateField} />
      <TiposPeca data={data} updateField={updateField} />
      <TicketMedio data={data} calculated={calculated} updateField={updateField} />
    </div>
  );
}
