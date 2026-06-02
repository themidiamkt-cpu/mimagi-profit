import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarDays, Plus, Trash2 } from "lucide-react";

interface TabFormProps {
  customerId: string;
  onSuccess?: () => void;
  onDelete?: () => void;
  tab?: {
    id: string;
    description: string | null;
  } | null;
}

export const TabForm = ({ customerId, onSuccess, onDelete, tab }: TabFormProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [description, setDescription] = useState(tab?.description || "");
  const [generateInstallments, setGenerateInstallments] = useState(false);
  const [installmentPlan, setInstallmentPlan] = useState({
    total_amount: "",
    quantity: "1",
    first_month: new Date().toISOString().slice(0, 7),
    due_day: "10",
  });
  const navigate = useNavigate();

  // Update description when tab prop changes
  useEffect(() => {
    if (tab) {
      setDescription(tab.description || "");
    }
  }, [tab]);

  const buildDueDate = (monthValue: string, monthOffset: number, dayValue: string) => {
    const [year, month] = monthValue.split("-").map(Number);
    const dueDay = Math.min(Math.max(parseInt(dayValue || "1", 10), 1), 31);
    const date = new Date(year, month - 1 + monthOffset + 1, 0, 12);
    const lastDay = date.getDate();
    date.setDate(Math.min(dueDay, lastDay));
    return date.toISOString().split("T")[0];
  };

  const formatMoneyPreview = (value: string) => {
    const parsed = Number(value || 0);
    return parsed.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (tab) {
        // Update existing tab
        const { error } = await supabase
          .from("tabs")
          .update({
            description: description || null,
          })
          .eq("id", tab.id);

        if (error) throw error;
        toast.success("Fichinha atualizada com sucesso!");
      } else {
        // Create new tab
        const { data: { user } } = await supabase.auth.getUser();
        if (generateInstallments) {
          const totalAmount = Number(installmentPlan.total_amount || 0);
          const quantity = Number(installmentPlan.quantity || 0);

          if (!totalAmount || totalAmount <= 0 || !quantity || quantity <= 0) {
            throw new Error("Informe o valor total e a quantidade de parcelas.");
          }
        }

        const { data: createdTab, error } = await supabase
          .from("tabs")
          .insert([
            {
              customer_id: customerId,
              description: description || null,
              user_id: user?.id
            },
          ])
          .select("id")
          .single();

        if (error) throw error;

        if (generateInstallments && createdTab?.id) {
          const quantity = Math.max(1, parseInt(installmentPlan.quantity || "1", 10));
          const totalAmount = Number(installmentPlan.total_amount || 0);
          const amountPerInstallment = totalAmount / quantity;
          const installments = Array.from({ length: quantity }, (_, index) => ({
            tab_id: createdTab.id,
            installment_number: index + 1,
            due_date: buildDueDate(installmentPlan.first_month, index, installmentPlan.due_day),
            amount: amountPerInstallment,
            user_id: user?.id,
          }));

          const { error: installmentsError } = await supabase
            .from("installments")
            .insert(installments);

          if (installmentsError) throw installmentsError;
          toast.success(`Fichinha criada com ${quantity} parcela(s)!`);
        } else {
          toast.success("Fichinha criada com sucesso!");
        }
      }

      setDescription("");
      setGenerateInstallments(false);
      setInstallmentPlan({
        total_amount: "",
        quantity: "1",
        first_month: new Date().toISOString().slice(0, 7),
        due_day: "10",
      });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving tab:", error);
      toast.error(tab ? "Erro ao atualizar fichinha" : "Erro ao criar fichinha");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!tab) return;
    setDeleting(true);

    try {
      // First delete all installments
      const { error: installmentsError } = await supabase
        .from("installments")
        .delete()
        .eq("tab_id", tab.id);

      if (installmentsError) throw installmentsError;

      // Then delete the tab
      const { error } = await supabase
        .from("tabs")
        .delete()
        .eq("id", tab.id);

      if (error) throw error;
      toast.success("Fichinha excluída com sucesso!");
      setOpen(false);

      // Dispatch event to refresh dashboard
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));

      onDelete?.();
      // Navigate back to customer detail
      navigate(`/fichinhas/${customerId}`);
    } catch (error) {
      console.error("Error deleting tab:", error);
      toast.error("Erro ao excluir fichinha");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" size={tab ? "sm" : "default"}>
          <Plus className="h-4 w-4" />
          {tab ? "Editar" : "Nova Fichinha"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{tab ? "Editar Fichinha" : "Nova Fichinha"}</DialogTitle>
          <DialogDescription>
            {tab ? "Atualize a descrição da fichinha" : "Crie uma nova fichinha para este cliente"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Compras de novembro"
            />
          </div>
          {!tab && (
            <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-background border">
                    <CalendarDays className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Criar Parcelas</Label>
                    <p className="text-xs text-muted-foreground">Gerar vencimentos automaticamente</p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={generateInstallments ? "default" : "outline"}
                  onClick={() => setGenerateInstallments((value) => !value)}
                >
                  {generateInstallments ? "Ativado" : "Desativado"}
                </Button>
              </div>

              {generateInstallments && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tab-total-amount">Valor total (R$)</Label>
                      <Input
                        id="tab-total-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={installmentPlan.total_amount}
                        onChange={(event) => setInstallmentPlan({ ...installmentPlan, total_amount: event.target.value })}
                        placeholder="0,00"
                        required={generateInstallments}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tab-installment-quantity">Parcelas</Label>
                      <Input
                        id="tab-installment-quantity"
                        type="number"
                        min="1"
                        max="60"
                        value={installmentPlan.quantity}
                        onChange={(event) => setInstallmentPlan({ ...installmentPlan, quantity: event.target.value })}
                        required={generateInstallments}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tab-first-month">Primeiro mês</Label>
                      <Input
                        id="tab-first-month"
                        type="month"
                        value={installmentPlan.first_month}
                        onChange={(event) => setInstallmentPlan({ ...installmentPlan, first_month: event.target.value })}
                        required={generateInstallments}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tab-due-day">Vence todo dia</Label>
                      <Input
                        id="tab-due-day"
                        type="number"
                        min="1"
                        max="31"
                        value={installmentPlan.due_day}
                        onChange={(event) => setInstallmentPlan({ ...installmentPlan, due_day: event.target.value })}
                        required={generateInstallments}
                      />
                    </div>
                  </div>
                  <div className="rounded-md bg-background border px-3 py-2 text-xs text-muted-foreground">
                    {installmentPlan.quantity || "0"} parcela(s) de{" "}
                    {formatMoneyPreview(
                      String(Number(installmentPlan.total_amount || 0) / Math.max(1, Number(installmentPlan.quantity || 1)))
                    )}
                    , vencendo todo dia {installmentPlan.due_day || "10"}.
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2 justify-between">
            {tab && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" size="sm" disabled={deleting}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir fichinha?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação irá excluir a fichinha e todas as suas parcelas permanentemente.
                      Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {deleting ? "Excluindo..." : "Excluir"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : tab ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
