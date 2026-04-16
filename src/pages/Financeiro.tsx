import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlayCircle } from 'lucide-react';
import { SimuladorInteligente } from '@/components/dashboard/sections/SimuladorInteligente';
import { useDashboardContext } from '@/contexts/DashboardContext';

export default function Financeiro() {
    const { data, calculated, calculateSimulation } = useDashboardContext();
    const [tab, setTab] = useState('simulacao');

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-foreground">Simulador Estratégico</h1>
                <p className="text-muted-foreground mt-1">Simule cenários e visualize projeções de resultados inteligentes</p>
            </div>

            <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="grid w-full grid-cols-1 max-w-[200px]">
                    <TabsTrigger value="simulacao" className="flex items-center gap-2">
                        <PlayCircle className="h-4 w-4" />
                        Simulação
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="simulacao" className="mt-6">
                    <SimuladorInteligente
                        calculateSimulation={calculateSimulation}
                        currentFaturamento={calculated.faturamento_mensal}
                        data={data}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
