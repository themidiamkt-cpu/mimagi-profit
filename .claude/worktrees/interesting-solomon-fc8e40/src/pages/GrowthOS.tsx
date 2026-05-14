import { GrowthOSTab } from '@/components/GrowthOSTab';

export default function GrowthOS() {
    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-medium">Clientes</h1>
                <p className="text-muted-foreground text-sm">Cadastro, histórico e inteligência de clientes</p>
            </div>

            <GrowthOSTab />
        </div>
    );
}
