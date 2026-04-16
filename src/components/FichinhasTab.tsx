import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CustomerForm } from "@/components/CustomerForm";
import { Dashboard, DashboardRef } from "@/components/Dashboard";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Phone, FileText, DollarSign, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";


interface Customer {
  id: string;
  name: string;
  whatsapp: string | null;
  document: string | null;
}

interface CustomerStats {
  openTabs: number;
  totalPending: number;
  totalOverdue: number;
}

export const FichinhasTab = () => {
  const { user } = useAuthContext();
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [customerStats, setCustomerStats] = useState<Record<string, CustomerStats>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const dashboardRef = useRef<DashboardRef>(null);

  const refreshDashboard = () => {
    dashboardRef.current?.refresh();
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      let allData: any[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await (supabase as any)
          .from("customers")
          .select("*")
          .eq("user_id", user?.id)
          .eq("active", true)

          .order("name")
          .range(page * 1000, (page + 1) * 1000 - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          page++;
        } else {
          hasMore = false;
        }
      }

      setCustomers(allData);

      if (allData.length > 0) {
        const stats: Record<string, CustomerStats> = {};
        for (const customer of allData) {
          const { data: tabs } = await (supabase as any)
            .from("tabs")
            .select("id, status")
            .eq("customer_id", customer.id)
            .neq("status", "quitada");

          const openTabs = tabs?.length || 0;

          if (tabs && tabs.length > 0) {
            const { data: installments } = await (supabase as any)
              .from("installments")
              .select("amount, status, due_date")
              .in("tab_id", tabs.map(t => t.id))
              .in("status", ["pendente", "atrasado"]);

            const today = new Date().toISOString().split("T")[0];
            const overdue = installments?.filter(i => i.status === 'atrasado' || (i.status === 'pendente' && i.due_date < today)) || [];
            const pending = installments?.filter(i => i.status === 'pendente' && i.due_date >= today) || [];

            const totalPending = pending.reduce((sum, i) => sum + Number(i.amount), 0);
            const totalOverdue = overdue.reduce((sum, i) => sum + Number(i.amount), 0);
            stats[customer.id] = { openTabs, totalPending, totalOverdue };
          } else {
            stats[customer.id] = { openTabs: 0, totalPending: 0, totalOverdue: 0 };
          }
        }
        setCustomerStats(stats);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers
    .filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.whatsapp?.includes(searchTerm) ||
        customer.document?.includes(searchTerm)
    )
    .sort((a, b) => {
      const statsA = (customerStats[a.id]?.totalPending || 0) + (customerStats[a.id]?.totalOverdue || 0);
      const statsB = (customerStats[b.id]?.totalPending || 0) + (customerStats[b.id]?.totalOverdue || 0);

      // If totals are equal, prioritize overdue
      if (statsA === statsB) {
        return (customerStats[b.id]?.totalOverdue || 0) - (customerStats[a.id]?.totalOverdue || 0);
      }

      return statsB - statsA;
    });

  return (
    <div>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 bg-white p-4 rounded-xl border border-gray-100 shadow-none">
        <div className="relative flex-1 w-full max-w-lg">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 stroke-[1.5px]" />
          <Input
            placeholder="Buscar por nome, WhatsApp ou documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 bg-white border-border focus:ring-primary/20 transition-all rounded-lg"
          />
        </div>
        <CustomerForm onSuccess={fetchCustomers} />
      </div>

      <div className="mb-8">
        <Dashboard ref={dashboardRef} />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando clientes...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchTerm
              ? "Nenhum cliente encontrado com esse critério"
              : "Nenhum cliente cadastrado ainda"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCustomers.map((customer) => {
            const stats = customerStats[customer.id] || { openTabs: 0, totalPending: 0, totalOverdue: 0 };
            return (
              <div key={customer.id} className="bg-white border border-border rounded-xl shadow-none hover:shadow-none transition-all overflow-hidden flex flex-col h-full group">
                <div className="p-5 pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <Link to={`/fichinhas/${customer.id}`} className="flex-1">
                      <h3 className="text-[17px] font-medium text-foreground group-hover:text-primary transition-colors">{customer.name}</h3>
                    </Link>
                    <CustomerForm
                      customer={customer}
                      onSuccess={fetchCustomers}
                    />
                  </div>
                  {(stats.totalPending > 0 || stats.totalOverdue > 0) && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn(
                        "text-[10px] py-0 px-2 h-5 border font-medium rounded-full   tracking-wider",
                        stats.totalOverdue > 0
                          ? "bg-red-50 text-red-600 border-red-100"
                          : "bg-amber-50 text-amber-600 border-amber-100"
                      )}>
                        {stats.totalOverdue > 0 ? "⚠️ Possui Atraso" : "📅 Pendente"}
                      </Badge>
                    </div>
                  )}
                </div>

                <Link to={`/fichinhas/${customer.id}`} className="flex-1 flex flex-col">
                  <div className="px-5 py-4 space-y-3 bg-gray-50/5/50 border-t border-border/40 text-[13px] flex-1">
                    {customer.whatsapp && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4 text-primary/60" />
                        <span className="font-medium">{customer.whatsapp}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-foreground">
                      <FileText className="h-4 w-4 text-primary/60" />
                      <div className="flex items-baseline gap-1">
                        <span className="font-medium text-[15px]">{stats.openTabs}</span>
                        <span className="text-muted-foreground text-[12px]">
                          {stats.openTabs === 1 ? "fichinha aberta" : "fichinhas abertas"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 mt-auto border-t border-border/60">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-[11px] text-muted-foreground mb-1   tracking-tight font-medium">Débito Total</p>
                        <div className="flex items-center justify-between">
                          <span className={cn("text-[18px] font-medium", (stats.totalPending + stats.totalOverdue) > 0 ? "text-[var(--accent)]" : "text-emerald-600")}>
                            R$ {(stats.totalPending + stats.totalOverdue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          {stats.totalOverdue > 0 && (
                            <span className="text-[11px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                              R$ {stats.totalOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vencido
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
