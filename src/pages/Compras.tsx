import { ComprasPagamentos } from '@/components/dashboard/sections/ComprasPagamentos';
import { useDashboardContext } from '@/contexts/DashboardContext';

export default function Compras() {
  const { 
    compras, 
    comprasSaving,
    addCompra,
    updateCompra,
    removeCompra,
    calcularCalendario,
    totalComprometido,
  } = useDashboardContext();

  return (
    <div className="space-y-6 animate-fade-in">
      <ComprasPagamentos 
        compras={compras}
        saving={comprasSaving}
        addCompra={addCompra}
        updateCompra={updateCompra}
        removeCompra={removeCompra}
        calcularCalendario={calcularCalendario}
        totalComprometido={totalComprometido}
      />
    </div>
  );
}
