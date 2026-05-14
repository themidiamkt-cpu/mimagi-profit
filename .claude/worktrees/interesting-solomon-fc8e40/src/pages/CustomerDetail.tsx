import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TabForm } from "@/components/TabForm";
import { CustomerForm } from "@/components/CustomerForm";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Phone, FileText } from "lucide-react";
import { toast } from "sonner";

interface Customer {
  id: string;
  name: string;
  whatsapp: string | null;
  document: string | null;
}

interface Tab {
  id: string;
  description: string | null;
  status: "aberta" | "quitada" | "em_atraso";
  total_value: number;
  created_at: string;
}

const CustomerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomerData = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Fetch customer
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);

      // Fetch tabs
      const { data: tabsData, error: tabsError } = await supabase
        .from("tabs")
        .select("*")
        .eq("customer_id", id)
        .order("created_at", { ascending: false });

      if (tabsError) throw tabsError;
      setTabs((tabsData || []) as Tab[]);
    } catch (error) {
      console.error("Error fetching customer data:", error);
      toast.error("Erro ao carregar dados do cliente");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Cliente não encontrado</p>
          <Link to="/fichinhas">
            <Button>Voltar para lista</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <Link to="/fichinhas">
          <Button variant="ghost" className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-3xl">{customer.name}</CardTitle>
                <CustomerForm customer={customer} onSuccess={fetchCustomerData} />
              </div>
              {customer.whatsapp && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{customer.whatsapp}</span>
                </div>
              )}
              {customer.document && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{customer.document}</span>
                </div>
              )}
            </div>
            <TabForm customerId={customer.id} onSuccess={fetchCustomerData} />
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-medium">Fichinhas</h2>

        {tabs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Nenhuma fichinha cadastrada ainda
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tabs.map((tab) => (
              <Card key={tab.id} className="hover:shadow-none transition-shadow h-full">
                <Link to={`/fichinhas/tab/${tab.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {tab.description || "Sem descrição"}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={tab.status} />
                        <TabForm
                          customerId={customer.id}
                          tab={tab}
                          onSuccess={fetchCustomerData}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-2xl font-medium text-primary">
                        R$ {Number(tab.total_value).toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Criada em {new Date(tab.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDetail;
