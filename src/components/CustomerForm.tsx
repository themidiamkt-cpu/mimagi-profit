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
import { Plus, Trash2, Pencil } from "lucide-react";

interface CustomerFormProps {
  onSuccess?: () => void;
  onDelete?: () => void;
  customer?: {
    id: string;
    name: string;
    whatsapp: string | null;
    document: string | null;
  } | null;
}

export const CustomerForm = ({ onSuccess, onDelete, customer }: CustomerFormProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: customer?.name || "",
    whatsapp: customer?.whatsapp || "",
    document: customer?.document || "",
  });

  // Update form data when customer prop changes
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        whatsapp: customer.whatsapp || "",
        document: customer.document || "",
      });
    }
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (customer) {
        // Update existing customer
        const { error } = await (supabase as any)
          .from("customers")
          .update({
            name: formData.name,
            whatsapp: formData.whatsapp || null,
            document: formData.document || null,
          })
          .eq("id", customer.id);

        if (error) throw error;
        toast.success("Cliente atualizado com sucesso!");
      } else {
        // Create new customer
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await (supabase as any).from("customers").insert([
          {
            name: formData.name,
            whatsapp: formData.whatsapp || null,
            document: formData.document || null,
            user_id: user?.id
          },
        ]).select();

        if (error) throw error;
        // Cadastro automático na aba Growth
        const newCustomer = data && data[0];
        if (newCustomer) {
          await (supabase as any).from("growth_customers").insert([
            {
              id: newCustomer.id, // mantém o mesmo id para facilitar relação
              name: newCustomer.name,
              email: null,
              phone: newCustomer.whatsapp || null,
              cpf: newCustomer.document || null,
              city: null,
              total_orders: 0,
              total_spent: 0,
              ticket_medio: 0,
              ltv: 0,
              rfm_segment: 'novo',
              last_purchase_date: null,
              user_id: user?.id, // mantém o mesmo user_id para isolamento
            },
          ]);
        }
        toast.success("Cliente cadastrado com sucesso!");
      }

      setFormData({ name: "", whatsapp: "", document: "" });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving customer:", error);
      toast.error(customer ? "Erro ao atualizar cliente" : "Erro ao cadastrar cliente");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!customer) return;
    setDeleting(true);

    try {
      // Get all tabs for this customer
      const { data: tabs } = await (supabase as any)
        .from("tabs")
        .select("id")
        .eq("customer_id", customer.id);

      if (tabs && tabs.length > 0) {
        const tabIds = tabs.map(t => t.id);

        // Delete all installments for these tabs
        const { error: installmentsError } = await (supabase as any)
          .from("installments")
          .delete()
          .in("tab_id", tabIds);

        if (installmentsError) throw installmentsError;

        // Delete all tabs
        const { error: tabsError } = await (supabase as any)
          .from("tabs")
          .delete()
          .eq("customer_id", customer.id);

        if (tabsError) throw tabsError;
      }

      // Soft delete customer - set active to false
      const { error } = await (supabase as any)
        .from("customers")
        .update({ active: false })
        .eq("id", customer.id);

      if (error) throw error;
      toast.success("Cliente e todas as fichinhas excluídos com sucesso!");
      setOpen(false);
      onDelete?.();
      onSuccess?.();
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast.error("Erro ao excluir cliente");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-lg font-medium shadow-none transition-all" size={customer ? "icon" : "default"} variant={customer ? "ghost" : "default"}>
          {customer ? <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" /> : <Plus className="h-4 w-4" />}
          {!customer && "Novo Cliente"}
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle>{customer ? "Editar Cliente" : "Cadastrar Cliente"}</DialogTitle>
          <DialogDescription>
            {customer ? "Atualize os dados do cliente" : "Adicione um novo cliente ao sistema"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              placeholder="Nome completo do cliente"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              value={formData.whatsapp}
              onChange={(e) =>
                setFormData({ ...formData, whatsapp: e.target.value })
              }
              placeholder="(19) 99999-9999"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="document">CPF/Documento</Label>
            <Input
              id="document"
              value={formData.document}
              onChange={(e) =>
                setFormData({ ...formData, document: e.target.value })
              }
              placeholder="123.456.789-00"
            />
          </div>
          <div className="flex gap-2 justify-between">
            {customer && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" size="sm" disabled={deleting}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação irá desativar o cliente "{customer.name}" e todas as suas fichinhas.
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
                variant="ghost"
                onClick={() => setOpen(false)}
                className="rounded-lg"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="rounded-lg px-6 font-medium">
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
