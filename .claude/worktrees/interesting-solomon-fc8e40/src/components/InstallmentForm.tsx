import { useState, useEffect } from "react";
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
import { Plus, Trash2 } from "lucide-react";

interface InstallmentFormProps {
  tabId: string;
  onSuccess?: () => void;
  installment?: {
    id: string;
    installment_number: number;
    due_date: string;
    amount: number;
  } | null;
}

export const InstallmentForm = ({ tabId, onSuccess, installment }: InstallmentFormProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [multiMode, setMultiMode] = useState(false);
  const [multiData, setMultiData] = useState({
    total_amount: "",
    num_months: "1",
    start_date: "",
  });

  const [formData, setFormData] = useState({
    installment_number: installment?.installment_number || 1,
    due_date: installment?.due_date || "",
    amount: installment?.amount.toString() || "",
  });

  // Update form data when installment prop changes
  useEffect(() => {
    if (installment) {
      setFormData({
        installment_number: installment.installment_number,
        due_date: installment.due_date,
        amount: installment.amount.toString(),
      });
      setMultiMode(false);
    }
  }, [installment]);

  useEffect(() => {
    if (open && !installment) {
      fetchNextInstallmentNumber();
    }
  }, [open, installment]);

  const fetchNextInstallmentNumber = async () => {
    const { data, error } = await supabase
      .from("installments")
      .select("installment_number")
      .eq("tab_id", tabId)
      .order("installment_number", { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      setFormData((prev) => ({
        ...prev,
        installment_number: data[0].installment_number + 1,
      }));
    }
  };

  const addMonths = (dateStr: string, months: number) => {
    const date = new Date(dateStr + 'T12:00:00'); // Use noon to avoid timezone shift
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (installment) {
        // Update existing installment
        const { error } = await supabase
          .from("installments")
          .update({
            installment_number: formData.installment_number,
            due_date: formData.due_date,
            amount: parseFloat(formData.amount),
          })
          .eq("id", installment.id);

        if (error) throw error;
        toast.success("Parcela atualizada com sucesso!");
      } else if (multiMode) {
        // Generate multiple installments
        const numMonths = parseInt(multiData.num_months);
        const totalAmount = parseFloat(multiData.total_amount);
        const amountPer = totalAmount / numMonths;
        const startNum = formData.installment_number;

        const newInstallments = [];
        for (let i = 0; i < numMonths; i++) {
          newInstallments.push({
            tab_id: tabId,
            installment_number: startNum + i,
            due_date: addMonths(multiData.start_date, i),
            amount: amountPer,
            user_id: user?.id
          });
        }

        const { error } = await supabase.from("installments").insert(newInstallments);
        if (error) throw error;
        toast.success(`${numMonths} parcelas geradas com sucesso!`);
      } else {
        // Create new single installment
        const { error } = await supabase.from("installments").insert([
          {
            tab_id: tabId,
            installment_number: formData.installment_number,
            due_date: formData.due_date,
            amount: parseFloat(formData.amount),
            user_id: user?.id
          },
        ]);

        if (error) throw error;
        toast.success("Parcela adicionada com sucesso!");
      }

      setFormData(prev => ({
        installment_number: prev.installment_number + (multiMode ? parseInt(multiData.num_months) : 1),
        due_date: "",
        amount: "",
      }));
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving installment:", error);
      toast.error(installment ? "Erro ao atualizar parcela" : "Erro ao adicionar parcelas");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!installment) return;
    setDeleting(true);

    try {
      const { error } = await supabase
        .from("installments")
        .delete()
        .eq("id", installment.id);

      if (error) throw error;
      toast.success("Parcela excluída com sucesso!");
      setOpen(false);

      // Dispatch event to refresh dashboard
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));

      onSuccess?.();
    } catch (error) {
      console.error("Error deleting installment:", error);
      toast.error("Erro ao excluir parcela");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" size="sm">
          <Plus className="h-4 w-4" />
          {installment ? "Editar" : "Adicionar Parcela"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{installment ? "Editar Parcela" : "Adicionar Parcela"}</DialogTitle>
          <DialogDescription>
            {installment ? "Atualize os dados da parcela" : "Adicione uma nova parcela à fichinha"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!installment && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">Geração Automática</Label>
                <p className="text-[11px] text-muted-foreground">Criar várias parcelas de uma vez</p>
              </div>
              <Button
                type="button"
                variant={multiMode ? "default" : "outline"}
                size="sm"
                onClick={() => setMultiMode(!multiMode)}
              >
                {multiMode ? "Ativado" : "Desativado"}
              </Button>
            </div>
          )}

          {multiMode && !installment ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="num_months">Quantidade de Meses</Label>
                  <Input
                    id="num_months"
                    type="number"
                    min="1"
                    max="60"
                    value={multiData.num_months}
                    onChange={(e) => setMultiData({ ...multiData, num_months: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total_amount">Valor Total (R$)</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    step="0.01"
                    value={multiData.total_amount}
                    onChange={(e) => setMultiData({ ...multiData, total_amount: e.target.value })}
                    required
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">Data do Primeiro Vencimento *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={multiData.start_date}
                  onChange={(e) => setMultiData({ ...multiData, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10 text-[11px] text-primary-foreground leading-relaxed">
                <p className="font-semibold text-primary">Dica:</p>
                <p className="text-text-secondary">O sistema criará {multiData.num_months || '0'} parcelas mensais começando em {multiData.start_date || '...'}, dividindo o valor total de R$ {multiData.total_amount || '0'} igualmente.</p>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="installment_number">Número da Parcela</Label>
                  <Input
                    id="installment_number"
                    type="number"
                    value={formData.installment_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        installment_number: parseInt(e.target.value),
                      })
                    }
                    required
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor (R$) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    required
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Data de Vencimento *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) =>
                    setFormData({ ...formData, due_date: e.target.value })
                  }
                  required
                />
              </div>
            </>
          )}

          <div className="flex gap-2 justify-between pt-2">
            {installment && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" size="sm" disabled={deleting}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir parcela?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação irá excluir a parcela #{installment.installment_number} permanentemente.
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
              <Button type="submit" disabled={loading} className="min-w-[100px]">
                {loading ? "Salvando..." : multiMode && !installment ? "Gerar Parcelas" : installment ? "Atualizar" : "Adicionar"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
