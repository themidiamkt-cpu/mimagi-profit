import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { InstallmentForm } from "@/components/InstallmentForm";
import { TabForm } from "@/components/TabForm";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Check, Send } from "lucide-react";
import { toast } from "sonner";

interface Tab {
  id: string;
  description: string | null;
  status: "aberta" | "quitada" | "em_atraso";
  total_value: number;
  customer: {
    id: string;
    name: string;
  };
}

interface Installment {
  id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  status: "pendente" | "pago" | "atrasado";
  sent_to_webhook: boolean;
  paid_at: string | null;
}

const TabDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTabData = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Fetch tab with customer info
      const { data: tabData, error: tabError } = await supabase
        .from("tabs")
        .select(`
          *,
          customer:customers(id, name)
        `)
        .eq("id", id)
        .single();

      if (tabError) throw tabError;
      setTab(tabData as Tab);

      // Fetch installments
      const { data: installmentsData, error: installmentsError } = await supabase
        .from("installments")
        .select("*")
        .eq("tab_id", id)
        .order("installment_number");

      if (installmentsError) throw installmentsError;
      setInstallments((installmentsData || []) as Installment[]);
    } catch (error) {
      console.error("Error fetching tab data:", error);
      toast.error("Erro ao carregar dados da fichinha");
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (installmentId: string) => {
    try {
      const { error } = await supabase
        .from("installments")
        .update({
          status: "pago",
          paid_at: new Date().toISOString(),
        })
        .eq("id", installmentId);

      if (error) throw error;

      toast.success("Parcela marcada como paga!");

      // Dispatch event to refresh dashboard
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));

      fetchTabData();
    } catch (error) {
      console.error("Error marking as paid:", error);
      toast.error("Erro ao marcar como paga");
    }
  };

  const sendReminder = async (installmentId: string) => {
    try {
      const { error } = await supabase.functions.invoke("send-manual-reminder", {
        body: { installmentId },
      });

      if (error) throw error;

      toast.success("Cobrança enviada com sucesso!");
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast.error("Erro ao enviar cobrança");
    }
  };

  useEffect(() => {
    fetchTabData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!tab) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Fichinha não encontrada</p>
          <Link to="/">
            <Button>Voltar para lista</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <Link to={`/fichinhas/${tab.customer.id}`}>
            <Button variant="ghost" className="gap-2 mb-4">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-3xl">
                    {tab.description || "Fichinha"}
                  </CardTitle>
                  <StatusBadge status={tab.status} />
                  <TabForm
                    customerId={tab.customer.id}
                    tab={{ id: tab.id, description: tab.description }}
                    onSuccess={fetchTabData}
                  />
                </div>
                <div className="text-muted-foreground">
                  Cliente:{" "}
                  <Link
                    to={`/fichinhas/${tab.customer.id}`}
                    className="text-primary hover:underline"
                  >
                    {tab.customer.name}
                  </Link>
                </div>
                <div className="text-2xl font-medium text-primary">
                  Total: R$ {Number(tab.total_value).toFixed(2)}
                </div>
              </div>
              <InstallmentForm tabId={tab.id} onSuccess={fetchTabData} />
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Parcelas</CardTitle>
          </CardHeader>
          <CardContent>
            {installments.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Nenhuma parcela cadastrada ainda
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Webhook</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installments.map((installment) => (
                    <TableRow key={installment.id}>
                      <TableCell className="font-medium">
                        {installment.installment_number}
                      </TableCell>
                      <TableCell>
                        {new Date(installment.due_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        R$ {Number(installment.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={installment.status} />
                      </TableCell>
                      <TableCell>
                        {installment.sent_to_webhook ? (
                          <span className="text-success text-sm">Enviado</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Não enviado
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <InstallmentForm
                            tabId={tab.id}
                            installment={installment}
                            onSuccess={fetchTabData}
                          />
                          {installment.status !== "pago" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markAsPaid(installment.id)}
                                className="gap-2"
                              >
                                <Check className="h-4 w-4" />
                                Pagar
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => sendReminder(installment.id)}
                                className="gap-2"
                              >
                                <Send className="h-4 w-4" />
                                Enviar Cobrança
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TabDetail;
