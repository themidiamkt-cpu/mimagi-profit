import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    TrendingUp,
    AlertTriangle,
    Star,
    PlusCircle,
    MessageSquare,
    Target,
    Tag,
    Zap,
    ChevronRight,
    Filter,
    CheckCircle2,
    Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { differenceInDays, parseISO } from "date-fns";

interface GrowthCustomer {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    total_orders: number;
    total_spent: number;
    ltv: number;
    last_purchase_date: string | null;
    rfm_segment: string;
}

interface SmartActionProps {
    customers: GrowthCustomer[];
    onFilterChange?: (segment: string) => void;
}

export const GrowthSmartActions = ({ customers: allCustomers, onFilterChange }: SmartActionProps) => {
    const [activeSegment, setActiveSegment] = useState<string>("all");
    const [contactedIds, setContactedIds] = useState<Set<string>>(new Set());

    const toggleContacted = (id: string) => {
        setContactedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const customers = useMemo(() => {
        return allCustomers.filter(c => c.phone && c.phone.trim().length > 0);
    }, [allCustomers]);

    const metrics = useMemo(() => {
        const now = new Date();

        const inRisk = customers.filter(c => {
            if (!c.last_purchase_date) return false;
            const days = differenceInDays(now, parseISO(c.last_purchase_date));
            return days > 30 && days <= 60;
        });

        const vip = customers.filter(c => {
            // Logic for VIP: High LTV and more than 3 orders
            return c.ltv > 500 || c.total_orders > 3;
        });

        const news = customers.filter(c => c.total_orders === 1);

        const inactive = customers.filter(c => {
            if (!c.last_purchase_date) return true;
            const days = differenceInDays(now, parseISO(c.last_purchase_date));
            return days > 60;
        });

        return {
            inRisk,
            vip,
            news,
            inactive,
            readyForReorder: customers.filter(c => {
                // Simple logic for reorder: 30 days since last purchase for loyal customers
                if (!c.last_purchase_date) return false;
                const days = differenceInDays(now, parseISO(c.last_purchase_date));
                return days >= 25 && days <= 35 && c.total_orders > 1;
            })
        };
    }, [customers]);

    const dailyActions = [
        {
            id: "risk",
            title: `Recuperar ${metrics.inRisk.length} clientes em risco`,
            desc: "não compram há mais de 30 dias",
            type: "risk",
            count: metrics.inRisk.length,
            icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
            color: "border-red-100 bg-red-50/50"
        },
        {
            id: "vip",
            title: `Oferecer produto premium para ${metrics.vip.length} clientes VIP`,
            desc: "alto LTV + alta frequência",
            type: "vip",
            count: metrics.vip.length,
            icon: <Star className="h-5 w-5 text-emerald-500" />,
            color: "border-emerald-100 bg-emerald-50/50"
        },
        {
            id: "news",
            title: `Incentivar segunda compra de ${metrics.news.length} clientes novos`,
            desc: "fizeram apenas 1 pedido",
            type: "news",
            count: metrics.news.length,
            icon: <PlusCircle className="h-5 w-5 text-amber-500" />,
            color: "border-amber-100 bg-amber-50/50"
        },
        {
            id: "inactive",
            title: `Reativar ${metrics.inactive.length} clientes inativos`,
            desc: "mais de 60 dias sem compra",
            type: "inactive",
            count: metrics.inactive.length,
            icon: <Clock className="h-5 w-5 text-blue-500" />,
            color: "border-blue-100 bg-blue-50/50"
        }
    ];

    const getRecommendedAction = (customer: GrowthCustomer) => {
        const now = new Date();
        const days = customer.last_purchase_date ? differenceInDays(now, parseISO(customer.last_purchase_date)) : 999;

        if (days > 60) return "Enviar cupom de reativação";
        if (customer.total_orders === 1) return "Oferecer desconto p/ 2ª compra";
        if (customer.ltv > 500) return "Apresentar nova coleção VIP";
        if (days > 30) return "Perguntar se gostou do último pedido";
        return "Manter relacionamento";
    };

    const filteredList = useMemo(() => {
        if (activeSegment === "all") return customers.slice(0, 10);
        if (activeSegment === "risk") return metrics.inRisk;
        if (activeSegment === "vip") return metrics.vip;
        if (activeSegment === "news") return metrics.news;
        if (activeSegment === "reorder") return metrics.readyForReorder;
        return customers.slice(0, 10);
    }, [activeSegment, customers, metrics]);

    const handleSegmentClick = (segment: string) => {
        setActiveSegment(segment);
        if (onFilterChange) onFilterChange(segment);
    };

    const handleWhatsAppClick = (phone: string | null, name: string) => {
        if (!phone) return;
        const cleanPhone = phone.replace(/\D/g, "");
        const phoneWithCountry = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
        const url = `https://wa.me/${phoneWithCountry}?text=Olá ${name}!`;
        window.open(url, "_blank");
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* BLOCO 1: RESUMO DE OPORTUNIDADES */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card
                    className={cn(
                        "cursor-pointer transition-all hover:shadow-md border-l-4 border-l-red-500",
                        activeSegment === "risk" && "ring-2 ring-red-500 ring-offset-2"
                    )}
                    onClick={() => handleSegmentClick("risk")}
                >
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Em Risco</p>
                                <h3 className="text-3xl font-bold mt-1">{metrics.inRisk.length}</h3>
                            </div>
                            <div className="bg-red-50 p-2 rounded-lg">
                                <AlertTriangle className="h-6 w-6 text-red-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className={cn(
                        "cursor-pointer transition-all hover:shadow-md border-l-4 border-l-emerald-500",
                        activeSegment === "vip" && "ring-2 ring-emerald-500 ring-offset-2"
                    )}
                    onClick={() => handleSegmentClick("vip")}
                >
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Clientes VIP</p>
                                <h3 className="text-3xl font-bold mt-1">{metrics.vip.length}</h3>
                            </div>
                            <div className="bg-emerald-50 p-2 rounded-lg">
                                <Star className="h-6 w-6 text-emerald-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className={cn(
                        "cursor-pointer transition-all hover:shadow-md border-l-4 border-l-amber-500",
                        activeSegment === "news" && "ring-2 ring-amber-500 ring-offset-2"
                    )}
                    onClick={() => handleSegmentClick("news")}
                >
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Novos</p>
                                <h3 className="text-3xl font-bold mt-1">{metrics.news.length}</h3>
                            </div>
                            <div className="bg-amber-50 p-2 rounded-lg">
                                <PlusCircle className="h-6 w-6 text-amber-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className={cn(
                        "cursor-pointer transition-all hover:shadow-md border-l-4 border-l-blue-500",
                        activeSegment === "reorder" && "ring-2 ring-blue-500 ring-offset-2"
                    )}
                    onClick={() => handleSegmentClick("reorder")}
                >
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Prontos p/ Recompra</p>
                                <h3 className="text-3xl font-bold mt-1">{metrics.readyForReorder.length}</h3>
                            </div>
                            <div className="bg-blue-50 p-2 rounded-lg">
                                <TrendingUp className="h-6 w-6 text-blue-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* BLOCO 2: AÇÕES PRIORITÁRIAS DO DIA */}
            <Card className="border shadow-sm overflow-hidden bg-gradient-to-br from-white to-gray-50/50">
                <CardHeader className="bg-white border-b pb-4">
                    <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary fill-primary/20" />
                        <CardTitle className="text-lg font-semibold">O que fazer hoje</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x border-b">
                        {dailyActions.map((action) => (
                            <div key={action.id} className={cn("p-6 flex items-start gap-4 transition-colors hover:bg-white/80", action.color)}>
                                <div className="mt-1">{action.icon}</div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900">{action.title}</h4>
                                    <p className="text-sm text-gray-500 mt-1">{action.desc}</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1 text-primary font-medium hover:bg-primary/5"
                                    onClick={() => handleSegmentClick(action.id)}
                                >
                                    Ver clientes <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* BLOCO 3: LISTA DE CLIENTES COM AÇÃO */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Users className="h-5 w-5 text-gray-400" />
                        Clientes para agir agora
                        {activeSegment !== "all" && (
                            <Badge variant="secondary" className="ml-2 font-normal">
                                Filtrado por: {activeSegment}
                            </Badge>
                        )}
                    </h3>
                    {activeSegment !== "all" && (
                        <Button variant="ghost" size="sm" onClick={() => handleSegmentClick("all")}>
                            Limpar filtro
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {filteredList.map((customer) => (
                        <Card
                            key={customer.id}
                            className={cn(
                                "overflow-hidden hover:border-primary/30 transition-all group",
                                contactedIds.has(customer.id) && "opacity-40 grayscale-[0.5]"
                            )}
                        >
                            <CardContent className="p-0">
                                <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x">
                                    {/* Info Cliente */}
                                    <div className="p-5 lg:w-1/3 flex flex-col justify-center">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{customer.name}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-tight py-0">
                                                        {customer.rfm_segment || 'S/ Segmento'}
                                                    </Badge>
                                                    {customer.last_purchase_date && (
                                                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {formatDate(customer.last_purchase_date)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">LTV</p>
                                                <p className="text-sm font-semibold text-emerald-600">{formatCurrency(customer.ltv || 0)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Lucro Est.</p>
                                                <p className="text-sm font-semibold">{formatCurrency((customer.total_spent || 0) * 0.3)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ação Recomendada */}
                                    <div className="p-5 lg:flex-1 bg-gray-50/30 flex flex-col justify-center">
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Ação Recomendada</p>
                                            <p className="text-sm font-medium text-gray-700 italic flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-primary" />
                                                “{getRecommendedAction(customer)}”
                                            </p>
                                        </div>
                                    </div>

                                    {/* Botões de Ação */}
                                    <div className="p-5 lg:w-1/4 flex items-center justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-9 px-3 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                            onClick={() => handleWhatsAppClick(customer.phone, customer.name)}
                                        >
                                            <MessageSquare className="h-4 w-4 mr-2" />
                                            WhatsApp
                                        </Button>
                                        <Button
                                            variant={contactedIds.has(customer.id) ? "default" : "outline"}
                                            size="sm"
                                            className={cn(
                                                "h-9 px-3",
                                                contactedIds.has(customer.id) ? "bg-emerald-500 hover:bg-emerald-600 text-white border-none" : "text-gray-400"
                                            )}
                                            onClick={() => toggleContacted(customer.id)}
                                            title={contactedIds.has(customer.id) ? "Desmarcar contato" : "Marcar como contatado"}
                                        >
                                            {contactedIds.has(customer.id) ? <CheckCircle2 className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {filteredList.length === 0 && (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed">
                            <p className="text-gray-400">Nenhum cliente encontrado para este critério.</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};
