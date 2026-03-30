import { DistribuicaoPublico } from '@/components/dashboard/sections/DistribuicaoPublico';
import { RoupasSapatos } from '@/components/dashboard/sections/RoupasSapatos';
import { useDashboardContext } from '@/contexts/DashboardContext';

export default function Distribuicao() {
  const { data, calculated, updateField, compras } = useDashboardContext();

  // Calcular totais por categoria das compras cadastradas
  const totaisPorCategoria = {
    menina: compras.filter(c => c.categoria === 'menina').reduce((sum, c) => sum + c.valor_total, 0),
    menino: compras.filter(c => c.categoria === 'menino').reduce((sum, c) => sum + c.valor_total, 0),
    bebe: compras.filter(c => c.categoria === 'bebe').reduce((sum, c) => sum + c.valor_total, 0),
    sapatos: compras.filter(c => c.categoria === 'sapatos').reduce((sum, c) => sum + c.valor_total, 0),
  };

  const totalCompras = Object.values(totaisPorCategoria).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {totalCompras > 0 && (
        <div className="bg-info/10 border-l-4 border-info p-4">
          <h4 className="font-semibold text-sm mb-2">Distribuição Real (Compras Cadastradas)</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Menina:</span>{' '}
              <span className="font-mono font-semibold">
                {totalCompras > 0 ? ((totaisPorCategoria.menina / totalCompras) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Menino:</span>{' '}
              <span className="font-mono font-semibold">
                {totalCompras > 0 ? ((totaisPorCategoria.menino / totalCompras) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Bebê:</span>{' '}
              <span className="font-mono font-semibold">
                {totalCompras > 0 ? ((totaisPorCategoria.bebe / totalCompras) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Sapatos:</span>{' '}
              <span className="font-mono font-semibold">
                {totalCompras > 0 ? ((totaisPorCategoria.sapatos / totalCompras) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>
      )}
      <DistribuicaoPublico data={data} calculated={calculated} updateField={updateField} />
      <RoupasSapatos data={data} calculated={calculated} updateField={updateField} />
    </div>
  );
}
