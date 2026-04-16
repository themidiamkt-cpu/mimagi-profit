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
import { Plus, Trash2 } from "lucide-react";

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
  const navigate = useNavigate();

  // Update description when tab prop changes
  useEffect(() => {
    if (tab) {
      setDescription(tab.description || "");
    }
  }, [tab]);

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
        const { error } = await supabase.from("tabs").insert([
          {
            customer_id: customerId,
            description: description || null,
            user_id: user?.id
          },
        ]);

        if (error) throw error;
        toast.success("Fichinha criada com sucesso!");
      }

      setDescription("");
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
      <DialogContent>
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
