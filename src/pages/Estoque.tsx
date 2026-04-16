import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Package, ShoppingCart, TrendingUp } from 'lucide-react';
import { DistribuicaoPublico } from '@/components/dashboard/sections/DistribuicaoPublico';
import { RoupasSapatos } from '@/components/dashboard/sections/RoupasSapatos';
import { TiposPeca } from '@/components/dashboard/sections/TiposPeca';
import { TicketMedio } from '@/components/dashboard/sections/TicketMedio';
import { ComprasPagamentos } from '@/components/dashboard/sections/ComprasPagamentos';
import { VisaoDiretoria } from '@/components/dashboard/sections/VisaoDiretoria';
import { FluxoCaixa } from '@/components/dashboard/sections/FluxoCaixa';
import { useDashboardContext } from '@/contexts/DashboardContext';
import { CATEGORIAS_LABELS, CategoriaCompra } from '@/types/compras';
import { formatCurrency } from '@/utils/formatters';

export default function Estoque() {
    const {
        data,
        calculated,
        updateField,
        compras,
        comprasSaving,
        addCompra,
        updateCompra,
        removeCompra,
        fluxoCaixa,
        resumoExecutivo,
        calcularCalendario,
        totalComprometido,
        calcularParcelas,
    } = useDashboardContext();
    const [tab, setTab] = useState('produtos');

    // Distribuição real das compras por categoria
    const totaisPorCategoria = {
        menina: compras.filter(c => c.categoria === 'menina').reduce((sum, c) => sum + c.valor_total, 0),
        menino: compras.filter(c => c.categoria === 'menino').reduce((sum, c) => sum + c.valor_total, 0),
        bebe: compras.filter(c => c.categoria === 'bebe').reduce((sum, c) => sum + c.valor_total, 0),
        sapatos: compras.filter(c => c.categoria === 'sapatos').reduce((sum, c) => sum + c.valor_total, 0),
    };
    const totalCompras = Object.values(totaisPorCategoria).reduce((a, b) => a + b, 0);

    // Marcas por categoria
    const marcasPorCategoria = compras.reduce((acc, compra) => {
        if (!acc[compra.categoria]) acc[compra.categoria] = {};
        if (!acc[compra.categoria][compra.marca]) acc[compra.categoria][compra.marca] = 0;
        acc[compra.categoria][compra.marca] += compra.valor_total;
        return acc;
    }, {} as Record<CategoriaCompra, Record<string, number>>);

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-medium">Estoque</h1>
                <p className="text-muted-foreground text-sm">Distribuição, produtos e compras programadas</p>
            </div>

            <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="grid w-full grid-cols-3 max-w-lg">
                    <TabsTrigger value="produtos" className="flex items-center gap-2 tabs-trigger-colorful">
                        <Package className="h-4 w-4" />
                        Produtos
                    </TabsTrigger>
                    <TabsTrigger value="compras" className="flex items-center gap-2 tabs-trigger-colorful">
                        <ShoppingCart className="h-4 w-4" />
                        Compras
                    </TabsTrigger>
                    <TabsTrigger value="fluxo" className="flex items-center gap-2 tabs-trigger-colorful">
                        <TrendingUp className="h-4 w-4" />
                        Fluxo de Caixa
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="produtos" className="mt-6 space-y-6">
                    {compras.length === 0 ? (
                        <div className="border border-dashed border-border rounded-lg p-12 text-center">
                            <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-40" />
                            <p className="text-muted-foreground text-sm">
                                Nenhuma compra cadastrada ainda.<br />
                                Adicione compras na aba <strong>Compras</strong> para ver o resumo por marca aqui.
                            </p>
                        </div>
                    ) : (
                        <>

                            {/* Marcas por categoria */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(marcasPorCategoria).map(([categoria, marcas]) => {
                                    const totalCat = Object.values(marcas as Record<string, number>).reduce((a, b) => a + b, 0);
                                    const label = CATEGORIAS_LABELS[categoria as CategoriaCompra] ?? categoria;
                                    const sortedMarcas = Object.entries(marcas as Record<string, number>)
                                        .sort(([, a], [, b]) => b - a);
                                    return (
                                        <div key={categoria} className="border border-border p-4 bg-card">
                                            <div className="flex items-center justify-between mb-3">
                                                <h5 className="font-medium text-sm   tracking-wide">{label}</h5>
                                                <span className="text-xs text-muted-foreground font-mono">{formatCurrency(totalCat)}</span>
                                            </div>
                                            <div className="space-y-2">
                                                {sortedMarcas.map(([marca, valor]) => {
                                                    const perc = (valor / totalCat) * 100;
                                                    return (
                                                        <div key={marca}>
                                                            <div className="flex justify-between text-sm mb-1">
                                                                <span className="font-medium">{marca}</span>
                                                                <span className="text-muted-foreground font-mono text-xs">
                                                                    {formatCurrency(valor)} · {perc.toFixed(0)}%
                                                                </span>
                                                            </div>
                                                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-primary rounded-full transition-all duration-500"
                                                                    style={{ width: `${perc}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                    <TicketMedio data={data} calculated={calculated} updateField={updateField} />
                </TabsContent>


                <TabsContent value="compras" className="mt-6">
                    <ComprasPagamentos
                        compras={compras}
                        saving={comprasSaving}
                        addCompra={addCompra}
                        updateCompra={updateCompra}
                        removeCompra={removeCompra}
                        calcularCalendario={calcularCalendario}
                        totalComprometido={totalComprometido}
                    />
                </TabsContent>

                <TabsContent value="fluxo" className="mt-6 space-y-6">
                    <VisaoDiretoria resumo={resumoExecutivo} totalComprometido={totalComprometido} />
                    <FluxoCaixa
                        fluxoCaixa={fluxoCaixa}
                        faturamentoMensal={calculated.faturamento_mensal}
                        compras={compras}
                        calcularParcelas={calcularParcelas}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
