import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

interface Order {
  id: string;
  bling_order_id: string | null;
  order_date: string;
  total: number;
  channel: string | null;
  customer_id: string;
  growth_customers?: { name: string };
}

interface GrowthCustomer {
  id: string;
  name: string;
}

export const GrowthOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<GrowthCustomer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState({
    customer_id: "",
    order_date: new Date().toISOString().split('T')[0],
    total: "",
    channel: "",
  });
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);

  // Simulação de dados do Lovable
  const [lovableData, setLovableData] = useState<{responsible: string, responsibleId: string, children: {id: string, name: string}[]}[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Simulação: substitua por chamada real ao Lovable se necessário
    setLovableData([
      {
        responsible: 'Maria Silva',
        responsibleId: 'r1',
        children: [
          { id: 'c1', name: 'Joãozinho' },
          { id: 'c2', name: 'Aninha' },
        ],
      },
      {
        responsible: 'Carlos Souza',
        responsibleId: 'r2',
        children: [
          { id: 'c3', name: 'Pedro' },
        ],
      },
    ]);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [ordersRes, customersRes] = await Promise.all([
        supabase
          .from("orders")
          .select("*, growth_customers(name)")
          .order("order_date", { ascending: false }),
        supabase
          .from("growth_customers")
          .select("id, name")
          .order("name"),
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (customersRes.error) throw customersRes.error;

      setOrders(ordersRes.data || []);
      setCustomers(customersRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let error;
      if (editingOrder) {
        ({ error } = await supabase
          .from("orders")
          .update({
            customer_id: formData.customer_id,
            order_date: formData.order_date,
            total: parseFloat(formData.total) || 0,
            channel: formData.channel || null,
          })
          .eq("id", editingOrder.id));
      } else {
        ({ error } = await supabase
          .from("orders")
          .insert([{
            customer_id: formData.customer_id,
            order_date: formData.order_date,
            total: parseFloat(formData.total) || 0,
            channel: formData.channel || null,
          }]));
      }
      if (error) throw error;
      toast.success(editingOrder ? "Pedido atualizado com sucesso!" : "Pedido cadastrado com sucesso!");
      setIsDialogOpen(false);
      setFormData({ customer_id: "", order_date: new Date().toISOString().split('T')[0], total: "", channel: "" });
      setEditingOrder(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || (editingOrder ? "Erro ao atualizar pedido" : "Erro ao cadastrar pedido"));
    }
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.growth_customers?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.bling_order_id?.includes(searchTerm) ||
      o.channel?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando pedidos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por cliente, pedido Bling ou canal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingOrder(null);
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingOrder(null); setFormData({ customer_id: "", order_date: new Date().toISOString().split('T')[0], total: "", channel: "" }); }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Pedido
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingOrder ? "Editar Pedido" : "Cadastrar Pedido"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="customer_id">Responsável e Criança *</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a criança" />
                  </SelectTrigger>
                  <SelectContent>
                    {lovableData.map((group) => (
                      <optgroup key={group.responsibleId} label={group.responsible}>
                        {group.children.map((child) => (
                          <SelectItem key={child.id} value={child.id}>{group.responsible} - {child.name}</SelectItem>
                        ))}
                      </optgroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="order_date">Data do Pedido *</Label>
                <Input
                  id="order_date"
                  type="date"
                  value={formData.order_date}
                  onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="total">Valor Total (R$) *</Label>
                <Input
                  id="total"
                  type="number"
                  step="0.01"
                  value={formData.total}
                  onChange={(e) => setFormData({ ...formData, total: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="channel">Canal de Venda</Label>
                <Select
                  value={formData.channel}
                  onValueChange={(value) => setFormData({ ...formData, channel: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o canal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="loja">Loja Física</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="marketplace">Marketplace</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={!formData.customer_id}>{editingOrder ? "Salvar Alterações" : "Cadastrar"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchTerm ? "Nenhum pedido encontrado" : "Nenhum pedido cadastrado ainda"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-none transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {order.growth_customers?.name}
                  </CardTitle>
                  {order.channel && (
                    <Badge variant="outline">{order.channel}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Data:</span>
                  <span className="font-medium">{format(new Date(order.order_date), 'dd/MM/yyyy')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-medium text-lg">R$ {Number(order.total).toFixed(2)}</span>
                </div>
                {order.bling_order_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Bling ID:</span>
                    <span className="font-mono text-xs">{order.bling_order_id}</span>
                  </div>
                )}
                <Button size="sm" variant="outline" onClick={() => {
                  setEditingOrder(order);
                  setFormData({
                    customer_id: order.customer_id || "",
                    order_date: order.order_date || new Date().toISOString().split('T')[0],
                    total: order.total?.toString() || "",
                    channel: order.channel || "",
                  });
                  setIsDialogOpen(true);
                }}>
                  Editar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" onClick={() => setDeletingOrder(order)}>
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Deseja realmente excluir este pedido?</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeletingOrder(null)}>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={async () => {
                        if (deletingOrder) {
                          const { error } = await supabase.from("orders").delete().eq("id", deletingOrder.id);
                          if (!error) {
                            toast.success("Pedido excluído com sucesso!");
                            fetchData();
                          } else {
                            toast.error("Erro ao excluir pedido");
                          }
                          setDeletingOrder(null);
                        }
                      }}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
