import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings2, DollarSign, Store, TrendingUp } from 'lucide-react';
import { VariaveisPrincipais } from '@/components/dashboard/sections/VariaveisPrincipais';
import { CustosFixos } from '@/components/dashboard/sections/CustosFixos';
import { PlanejamentoCanais } from '@/components/dashboard/sections/PlanejamentoCanais';
import { useDashboardContext } from '@/contexts/DashboardContext';

export default function Planejamento() {
    const { data, calculated, updateField, setCanaisMesAtivo } = useDashboardContext();
    const [tab, setTab] = useState('variaveis');

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-medium">Metas e Custos</h1>
                <p className="text-muted-foreground text-sm">Configure suas metas, custos e acompanhe o histórico</p>
            </div>

            <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="variaveis" className="flex items-center gap-2 tabs-trigger-colorful">
                        <Settings2 className="h-4 w-4" />
                        Meta Mensal
                    </TabsTrigger>
                    <TabsTrigger value="custos" className="flex items-center gap-2 tabs-trigger-colorful">
                        <DollarSign className="h-4 w-4" />
                        Custos
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="variaveis" className="mt-6 space-y-6">
                    <VariaveisPrincipais data={data} calculated={calculated} updateField={updateField} />
                    <PlanejamentoCanais
                        data={data}
                        calculated={calculated}
                        updateField={updateField}
                        setCanaisMesAtivo={setCanaisMesAtivo}
                    />
                </TabsContent>

                <TabsContent value="custos" className="mt-6">
                    <CustosFixos data={data} calculated={calculated} updateField={updateField} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
