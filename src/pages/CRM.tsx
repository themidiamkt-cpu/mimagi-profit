import { GrowthCustomers } from "@/components/growth/GrowthCustomers";

export default function CRM() {
    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-medium">CRM</h1>
                <p className="text-muted-foreground text-sm">Pipeline de leads e relacionamento com clientes</p>
            </div>

            <GrowthCustomers initialTab="crm" standaloneTab />
        </div>
    );
}
