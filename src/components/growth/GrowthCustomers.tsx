import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Users, RefreshCw, Database, Eraser, MessageSquare, Baby, Trash2, TrendingUp, ChevronDown, Download, Upload, BarChart3, Info, Package } from "lucide-react";
import { toast } from "sonner";
import { differenceInYears, differenceInMonths, format } from "date-fns";
import { blingApi } from "@/lib/blingApi";
import { cn } from "@/lib/utils";
import { formatDate, formatCurrency } from "@/utils/formatters";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { ImportCustomersExcel } from "@/components/ImportCustomersExcel";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GrowthSmartActions } from "./GrowthSmartActions";
import { Sparkles } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";

interface GrowthCustomer {
  id: string;
  bling_id?: number | null;
  name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  city: string | null;
  total_orders: number;
  total_spent: number;
  ticket_medio: number;
  ltv: number;
  rfm_segment: string;
  last_purchase_date: string | null;
  venda_origem: string | null;
}

interface LiveCustomerMetrics {
  totalOrders: number;
  totalSpent: number;
  ticketMedio: number;
  ltv: number;
  ltvProfit: number;
  lastPurchaseDate: string | null;
  averageFrequency: number;
  retentionMonths: number;
}

interface CustomerPurchaseItem {
  sku: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface CustomerPurchaseOrder {
  id: string;
  number: string;
  date: string | null;
  channel: string | null;
  total: number;
  items: CustomerPurchaseItem[];
}

const RFM_LEGEND = [
  { key: 'campeao', label: '🏆 Campeão', desc: 'Clientes de alto valor: compram muito, gastam bem e compraram recentemente.' },
  { key: 'leal', label: '💎 Leal', desc: 'Clientes fiéis: compram com frequência e possuem bom ticket médio.' },
  { key: 'recorrente', label: '🔄 Recorrente', desc: 'Clientes que compram com constância na loja.' },
  { key: 'novo', label: '✨ Novo', desc: 'Clientes que fizeram sua primeira compra recentemente.' },
  { key: 'em_risco', label: '⚠️ Em Risco', desc: 'Clientes que não compram há algum tempo e podem estar parando.' },
  { key: 'perdido', label: '💤 Perdido', desc: 'Clientes que não compram há mais de 1 ano.' },
  { key: 'vip', label: '👑 VIP', desc: 'Segmentação manual para clientes de prestígio.' },
];

const SIZES = ["RN", "P", "M", "G", "GG", "1", "2", "3", "4", "6", "8", "10", "12", "14", "16"];
const normalizeCustomerName = (value?: string | null) =>
  value?.trim().toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "") || "";
const getOrderItems = (order: any) => Array.isArray(order?.itens) ? order.itens : (Array.isArray(order?.itens?.data) ? order.itens.data : []);

export const GrowthCustomers = () => {
  const { user } = useAuthContext();
  const [customers, setCustomers] = useState<GrowthCustomer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
    city: "",
  });
  const [editingCustomer, setEditingCustomer] = useState<GrowthCustomer | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [deletingCustomer, setDeletingCustomer] = useState<GrowthCustomer | null>(null);
  const [syncingBling, setSyncingBling] = useState(false);
  const [lojaNames, setLojaNames] = useState<Record<string, string>>({});
  const [selectedSegment, setSelectedSegment] = useState<string>("all");
  const [liveMetricsByCustomerId, setLiveMetricsByCustomerId] = useState<Record<string, LiveCustomerMetrics>>({});
  const [purchaseHistoryByCustomerId, setPurchaseHistoryByCustomerId] = useState<Record<string, CustomerPurchaseOrder[]>>({});
  const [liveMetricsUpdatedAt, setLiveMetricsUpdatedAt] = useState<Date | null>(null);
  const [refreshingLiveMetrics, setRefreshingLiveMetrics] = useState(false);
  const [isChildDialogOpen, setIsChildDialogOpen] = useState(false);
  const [selectedCustomerForPurchases, setSelectedCustomerForPurchases] = useState<GrowthCustomer | null>(null);
  const [restoringLegacyCustomers, setRestoringLegacyCustomers] = useState(false);
  const [childFormData, setChildFormData] = useState({
    name: "",
    birth_date: "",
    current_size: "",
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    // Busca todos os filhos ao carregar a tela
    (supabase as any)
      .from("children")
      .select("*")
      .then(({ data }: any) => setChildren(data || []));

    // Busca nomes das lojas do Bling
    const fetchLojas = async () => {
      try {
        const response = await blingApi.getCanaisVenda();
        const data = response.data || [];
        const mapping: Record<string, string> = {};
        data.forEach((l: any) => {
          mapping[String(l.id)] = l.descricao || l.nome;
        });
        setLojaNames(mapping);
      } catch (error) {
        console.error('Erro ao buscar nomes das lojas:', error);
      }
    };
    fetchLojas();
  }, []);

  const fetchLiveMetrics = async (customerList: GrowthCustomer[]) => {
    if (!customerList || customerList.length === 0) {
      setLiveMetricsByCustomerId({});
      setPurchaseHistoryByCustomerId({});
      setLiveMetricsUpdatedAt(new Date());
      return;
    }

    try {
      setRefreshingLiveMetrics(true);

      const localOrders = await blingApi.getLocalPedidos();
      const metrics = blingApi.calculateMetrics(localOrders, lojaNames);

      const metricsByBlingId: Record<string, any> = {};
      const metricsByName: Record<string, any> = {};
      const ordersByBlingId: Record<string, any[]> = {};
      const ordersByName: Record<string, any[]> = {};

      (metrics?.customers || []).forEach((curr: any) => {
        if (curr.contatoId) metricsByBlingId[String(curr.contatoId)] = curr;
        if (curr.nome) {
          const normalized = normalizeCustomerName(curr.nome);
          metricsByName[normalized] = curr;
        }
      });

      localOrders.forEach((order: any) => {
        const situacaoId = order.situacao?.id ?? order.situacao_id;
        if (situacaoId === 12) return;

        const contatoId = order.contato?.id ?? order.contato_id;
        const contatoNome = order.contato?.nome ?? order.contato_nome;

        if (contatoId) {
          const key = String(contatoId);
          if (!ordersByBlingId[key]) ordersByBlingId[key] = [];
          ordersByBlingId[key].push(order);
        }

        const normalizedName = normalizeCustomerName(contatoNome);
        if (normalizedName) {
          if (!ordersByName[normalizedName]) ordersByName[normalizedName] = [];
          ordersByName[normalizedName].push(order);
        }
      });

      const nextMetrics = customerList.reduce<Record<string, LiveCustomerMetrics>>((acc, customer) => {
        // Fallback robusto para encontrar as métricas do cliente
        // 1. Por bling_id (clientes do sistema)
        // 2. Por ID local (hash gerado na planilha)
        // 3. Por Nome (fallback para manual/conflito de hash)

        let liveMetric = customer.bling_id ? metricsByBlingId[String(customer.bling_id)] : null;

        if (!liveMetric) {
          liveMetric = metricsByBlingId[String(customer.id)];
        }

        if (!liveMetric && customer.name) {
          liveMetric = metricsByName[customer.name.trim().toLowerCase()];
        }

        if (liveMetric) {
          acc[customer.id] = {
            totalOrders: Number(liveMetric.qtdPedidos || 0),
            totalSpent: Number(liveMetric.totalGasto || 0),
            ticketMedio: Number(liveMetric.ticketMedio || 0),
            ltv: Number(liveMetric.ltv || 0),
            ltvProfit: Number(liveMetric.ltvProfit || (liveMetric.ltv * 0.3) || 0),
            lastPurchaseDate: liveMetric.ultimaVenda || null,
            averageFrequency: Number(liveMetric.averageFrequency || 0),
            retentionMonths: Number(liveMetric.retentionMonths || 0),
          };
        }

        return acc;
      }, {});

      const nextPurchaseHistory = customerList.reduce<Record<string, CustomerPurchaseOrder[]>>((acc, customer) => {
        let matchedOrders = customer.bling_id ? ordersByBlingId[String(customer.bling_id)] : null;

        if ((!matchedOrders || matchedOrders.length === 0) && customer.id) {
          matchedOrders = ordersByBlingId[String(customer.id)] || null;
        }

        if ((!matchedOrders || matchedOrders.length === 0) && customer.name) {
          matchedOrders = ordersByName[normalizeCustomerName(customer.name)] || null;
        }

        // De-duplicar pedidos por Número + Data para evitar mostrar órfãos/duplicados no histórico
        const seenOrders = new Set<string>();
        const uniqueOrders = (matchedOrders || []).filter((order: any) => {
          const orderNum = String(order.numero || order.id || "");
          const orderDate = order.data || "";
          const key = `${orderNum}-${orderDate}`;
          if (seenOrders.has(key)) return false;
          seenOrders.add(key);
          return true;
        });

        acc[customer.id] = uniqueOrders
          .slice()
          .sort((a, b) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime())
          .map((order: any) => ({
            id: String(order.id || order.numero || crypto.randomUUID()),
            number: String(order.numero || order.id || "-"),
            date: order.data || null,
            channel: order.loja_descricao || order.loja?.descricao || null,
            total: Number(order.total || 0),
            items: getOrderItems(order).map((item: any) => {
              const quantity = Number(item.quantidade || 1);
              const unitPrice = Number(item.valorUnidade || item.valor || 0);

              return {
                sku: String(item.codigo || "").trim() || null,
                name: String(item.nome || item.descricao || "Produto sem nome").trim(),
                quantity,
                unitPrice,
                totalPrice: quantity * unitPrice,
              };
            }),
          }));

        return acc;
      }, {});

      setLiveMetricsByCustomerId(nextMetrics);
      setPurchaseHistoryByCustomerId(nextPurchaseHistory);
      setLiveMetricsUpdatedAt(new Date());
    } catch (error) {
      console.error("Erro ao atualizar métricas vivas de clientes:", error);
    } finally {
      setRefreshingLiveMetrics(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("growth_customers")
        .select("*")
        .order("ltv", { ascending: false });

      if (error) throw error;
      const customerList = (data || []) as GrowthCustomer[];
      setCustomers(customerList);
      void fetchLiveMetrics(customerList);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Erro ao carregar responsáveis");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState !== "visible" || customers.length === 0) {
        return;
      }

      void fetchLiveMetrics(customers);
    };

    const intervalId = window.setInterval(refreshWhenVisible, 60000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [customers, lojaNames]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let error;
      if (editingCustomer) {
        // Atualizar responsável
        ({ error } = await (supabase as any)
          .from("growth_customers")
          .update(formData)
          .eq("id", editingCustomer.id));
      } else {
        // Cadastrar novo responsável
        ({ error } = await (supabase as any)
          .from("growth_customers")
          .insert([{ ...formData, user_id: user?.id }]));
      }
      if (error) throw error;
      toast.success(editingCustomer ? "Responsável atualizado com sucesso!" : "Responsável cadastrado com sucesso!");
      setIsDialogOpen(false);
      setFormData({ name: "", email: "", phone: "", cpf: "", city: "" });
      setEditingCustomer(null);
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.message || (editingCustomer ? "Erro ao atualizar responsável" : "Erro ao cadastrar responsável"));
    }
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    try {
      const { error } = await (supabase as any)
        .from("children")
        .insert([{
          name: childFormData.name.trim(),
          customer_id: editingCustomer.id,
          birth_date: childFormData.birth_date || null,
          current_size: childFormData.current_size || null,
          user_id: user?.id
        }]);

      if (error) throw error;

      toast.success("Filho adicionado!");
      setIsChildDialogOpen(false);
      setChildFormData({ name: "", birth_date: "", current_size: "" });

      // Refresh children
      const { data } = await (supabase as any).from("children").select("*");
      setChildren(data || []);
    } catch (error: any) {
      toast.error("Erro ao adicionar filho: " + error.message);
    }
  };

  const handleBlingSync = async () => {
    setSyncingBling(true);
    const toastId = toast.loading("Sincronizando faturamento completo do Bling...");

    try {
      // 1. Sincronizar todos os pedidos para o cache local via Edge Function
      await blingApi.syncPedidosToLocal();
      toast.loading("Pedidos sincronizados! Atualizando indicadores de clientes...", { id: toastId });

      // 2. Recalcular métricas de todos os clientes no CRM
      const updatedCount = await blingApi.recalculateRFM();

      toast.success(`Sucesso! ${updatedCount} clientes atualizados com histórico completo.`, { id: toastId });
      fetchCustomers();
    } catch (error: any) {
      console.error("Erro ao sincronizar:", error);
      toast.error("Erro na sincronização: " + (error.message || "Verifique sua conexão"), { id: toastId });
    } finally {
      setSyncingBling(false);
    }
  };

  const handleFullSync = async () => {
    setSyncingBling(true);
    const toastId = toast.loading("Iniciando sincronização completa de contatos...");

    try {
      const results = await (blingApi as any).syncAllContactsToCRM((current: number, total: number) => {
        toast.loading(`Processando contatos: ${current} de ${total}...`, { id: toastId });
      });

      toast.success(`Sincronização concluída! ${results.syncedCount} contatos e ${results.childrenCount} filhos importados.`, { id: toastId });
      fetchCustomers();
    } catch (error: any) {
      console.error("Erro na sincronização completa:", error);
      toast.error("Erro na sincronização: " + (error.message || "Tente novamente"), { id: toastId });
    } finally {
      setSyncingBling(false);
    }
  };

  const handleCleanupDuplicates = async () => {
    const toastId = toast.loading("Analisando duplicados...");
    try {
      const { data: allCustomers } = await (supabase as any).from("growth_customers").select("*");
      const { data: allChildren } = await (supabase as any).from("children").select("*");

      if (!allCustomers || allCustomers.length === 0) {
        toast.info("Nenhum cliente para analisar.", { id: toastId });
        return;
      }

      const groups: Record<string, any[]> = {};
      allCustomers.forEach(c => {
        const key = normalizeCustomerName(c.name);
        if (!groups[key]) groups[key] = [];
        groups[key].push(c);
      });

      let removedCount = 0;

      for (const name in groups) {
        const group = groups[name];
        if (group.length > 1) {
          group.sort((a, b) => {
            const scoreA = ((a.total_orders || 0) * 10) + (a.cpf ? 5 : 0) + (a.email ? 3 : 0);
            const scoreB = ((b.total_orders || 0) * 10) + (b.cpf ? 5 : 0) + (b.email ? 3 : 0);
            return scoreB - scoreA;
          });

          const master = group[0];
          const others = group.slice(1);

          for (const other of others) {
            const otherChildren = (allChildren || []).filter(ch => ch.customer_id === other.id);
            for (const child of otherChildren) {
              await (supabase as any)
                .from("children")
                .update({ customer_id: master.id })
                .eq("id", child.id);
            }

            await (supabase as any)
              .from("growth_customers")
              .update({
                total_orders: (master.total_orders || 0) + (other.total_orders || 0),
                total_spent: (master.total_spent || 0) + (other.total_spent || 0),
                ltv: (master.ltv || 0) + (other.ltv || 0),
                cpf: master.cpf || other.cpf,
                email: master.email || other.email,
                phone: master.phone || other.phone,
                city: master.city || other.city
              })
              .eq("id", master.id);

            await (supabase as any).from("growth_customers").delete().eq("id", other.id);
            removedCount++;
          }
        }
      }

      if (removedCount > 0) {
        toast.success(`Limpeza concluída! ${removedCount} registros duplicados removidos.`, { id: toastId });
        fetchCustomers();
      } else {
        toast.info("Nenhum nome duplicado encontrado.", { id: toastId });
      }
    } catch (error: any) {
      console.error("Erro na limpeza:", error);
      toast.error("Erro ao limpar duplicados.");
    }
  };

  const handleTestSync = async () => {
    setSyncingBling(true);
    const toastId = toast.loading("Iniciando teste: Sincronizando últimos 70 contatos...");

    try {
      const results = await (blingApi as any).syncAllContactsToCRM((current: number, total: number) => {
        toast.loading(`Processando teste: ${current} de ${total}...`, { id: toastId });
      }, 70);

      toast.success(`Teste concluído! ${results.syncedCount} contatos processados.`, { id: toastId });
      fetchCustomers();
    } catch (error: any) {
      console.error("Erro no teste:", error);
      toast.error("Erro no teste: " + (error.message || "Tente novamente"), { id: toastId });
    } finally {
      setSyncingBling(false);
    }
  };

  const handleDelete = async (customer: GrowthCustomer) => {
    try {
      const { error } = await (supabase as any)
        .from("growth_customers")
        .delete()
        .eq("id", customer.id);

      if (error) throw error;
      toast.success("Responsável excluído com sucesso!");
      setDeletingCustomer(null);
      fetchCustomers();
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast.error("Erro ao excluir responsável");
    }
  };

  const handleDeleteOrder = async (orderId: number, orderNumber: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o pedido ${orderNumber}? Isso afetará as métricas do cliente.`)) return;

    try {
      const { error } = await (supabase as any)
        .from("bling_pedidos")
        .delete()
        .eq("id", orderId);

      if (error) throw error;

      toast.success(`Pedido #${orderNumber} excluído.`);

      // Recalcular métricas para atualizar o CRM
      await (blingApi as any).recalculateRFM();

      // Recarregar histórico do cliente para o modal
      if (selectedCustomerForPurchases) {
        const { data: updatedOrders } = await (supabase as any)
          .from("bling_pedidos")
          .select("*")
          .eq("contato_id", selectedCustomerForPurchases.id)
          .order("data", { ascending: false });

        if (updatedOrders) {
          setPurchaseHistoryByCustomerId(prev => ({
            ...prev,
            [selectedCustomerForPurchases.id]: updatedOrders.map((p: any) => ({
              id: p.id,
              number: p.numero,
              date: p.data,
              total: p.total,
              channel: p.loja_descricao,
              items: Array.isArray(p.itens) ? p.itens : []
            }))
          }));
        }
      }

      fetchCustomers();
    } catch (error: any) {
      console.error("Erro ao excluir pedido:", error);
      toast.error("Erro ao excluir pedido.");
    }
  };

  const getSegmentColor = (segment: string) => {
    switch (segment?.toLowerCase()) {
      case 'campeao': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'leal': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'recorrente': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'novo': return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'em_risco': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'perdido': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSegmentLabel = (segment: string) => {
    switch (segment?.toLowerCase()) {
      case 'campeao': return '🏆 Campeão';
      case 'leal': return '💎 Leal';
      case 'recorrente': return '🔄 Recorrente';
      case 'novo': return '✨ Novo';
      case 'em_risco': return '⚠️ Em Risco';
      case 'perdido': return '💤 Perdido';
      case 'vip': return '👑 VIP';
      default: return segment || 'Sem Segmento';
    }
  };

  const getResolvedCustomerMetrics = (customer: GrowthCustomer) => {
    const liveMetric = liveMetricsByCustomerId[customer.id];

    return {
      totalOrders: liveMetric?.totalOrders ?? Number(customer.total_orders || 0),
      totalSpent: liveMetric?.totalSpent ?? Number(customer.total_spent || 0),
      ticketMedio: liveMetric?.ticketMedio ?? Number(customer.ticket_medio || 0),
      ltv: liveMetric?.ltv ?? Number(customer.ltv || 0),
      ltvProfit: liveMetric?.ltvProfit ?? (Number(customer.ltv || 0) * 0.3),
      lastPurchaseDate: liveMetric?.lastPurchaseDate ?? customer.last_purchase_date ?? null,
      averageFrequency: liveMetric?.averageFrequency ?? 0,
      retentionMonths: liveMetric?.retentionMonths ?? 0,
      hasLiveMetric: Boolean(liveMetric),
    };
  };

  const selectedCustomerPurchases = selectedCustomerForPurchases
    ? purchaseHistoryByCustomerId[selectedCustomerForPurchases.id]
    : undefined;

  const selectedCustomerPurchaseSummary = (selectedCustomerPurchases || []).reduce((acc, order) => {
    acc.orders += 1;
    acc.lines += order.items.length;
    acc.units += order.items.reduce((sum, item) => sum + item.quantity, 0);
    acc.total += Number(order.total || 0);
    return acc;
  }, { orders: 0, lines: 0, units: 0, total: 0 });

  const filteredCustomers = customers
    .filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm) ||
        c.cpf?.includes(searchTerm);

      const matchesSegment = selectedSegment === "all" ||
        c.rfm_segment?.toLowerCase() === selectedSegment.toLowerCase();

      return matchesSearch && matchesSegment;
    })
    .sort((a, b) => getResolvedCustomerMetrics(b).ltv - getResolvedCustomerMetrics(a).ltv);

  const handleRecalculateRFM = async () => {
    try {
      setLoading(true);
      const toastId = toast.loading("Recalculando métricas RFM com base no histórico...");
      const updatedCount = await blingApi.recalculateRFM();
      toast.success(`Matriz RFM atualizada! ${updatedCount} clientes processados.`, { id: toastId });
      fetchCustomers();
    } catch (error: any) {
      console.error("Erro ao recalcular RFM:", error);
      toast.error("Erro ao recalcular Matriz RFM");
    } finally {
      setLoading(false);
    }
  };

  const canRestoreLegacyCustomers = (user?.email || "").toLowerCase().trim() === "mimagikidslojainfantil@gmail.com";

  const handleRestoreLegacyCustomers = async () => {
    if (!canRestoreLegacyCustomers) return;

    setRestoringLegacyCustomers(true);
    const toastId = toast.loading("Restaurando clientes antigos...");
    try {
      const { data, error } = await supabase.functions.invoke("backfill-mimagi-kids");
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Falha ao restaurar");
      toast.success(
        `Restaurado: ${data.customers_updated || 0} clientes, ${data.children_updated || 0} filhos.`,
        { id: toastId },
      );
      fetchCustomers();
    } catch (err: any) {
      console.error("Erro ao restaurar clientes antigos:", err);
      toast.error("Erro ao restaurar: " + (err?.message || "Tente novamente"), { id: toastId });
    } finally {
      setRestoringLegacyCustomers(false);
    }
  };

  const getAge = (birthDate: string) => {
    const years = differenceInYears(new Date(), new Date(birthDate));
    if (years < 1) {
      const months = differenceInMonths(new Date(), new Date(birthDate));
      return `${months} ${months === 1 ? 'mês' : 'meses'}`;
    }
    return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  };

  if (loading) {
    return <div className="text-center py-12 text-text-secondary">Carregando responsáveis...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="list" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="bg-white border border-gray-100 p-1 rounded-xl h-11">
            <TabsTrigger value="list" className="rounded-lg px-6 data-[state=active]:bg-gray-50 data-[state=active]:shadow-none font-medium">
              <Users className="h-4 w-4 mr-2" />
              Lista de Clientes
            </TabsTrigger>
            <TabsTrigger value="actions" className="rounded-lg px-6 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none font-medium text-amber-600">
              <Sparkles className="h-4 w-4 mr-2" />
              🔥 Ações Inteligentes
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="actions" className="mt-0 border-none p-0 focus-visible:ring-0">
          <GrowthSmartActions customers={customers} />
        </TabsContent>

        <TabsContent value="list" className="mt-0 border-none p-0 focus-visible:ring-0 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-none">
            <div className="relative flex-1 w-full max-w-lg">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary h-4 w-4 stroke-[1.5px]" />
              <Input
                placeholder="Buscar por nome, email, telefone ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 bg-white border-border focus:ring-primary/20 transition-all rounded-lg"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
              <div className="hidden xl:flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] whitespace-nowrap">
                <span className={cn("h-2 w-2 rounded-full", refreshingLiveMetrics ? "bg-emerald-500 animate-pulse" : "bg-emerald-500")} />
                <span className="font-bold text-emerald-900 uppercase tracking-tight">LTV em tempo real</span>
                <span className="text-emerald-700 font-semibold">
                  {refreshingLiveMetrics
                    ? "Atualizando..."
                    : liveMetricsUpdatedAt
                      ? `às ${liveMetricsUpdatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                      : "aguardando histórico"}
                </span>
              </div>

              {/* Filtro por Segmento */}
              <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                <SelectTrigger className="w-[180px] h-10 bg-white border-gray-200 shrink-0">
                  <SelectValue placeholder="Filtrar por Segmento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Segmentos</SelectItem>
                  {RFM_LEGEND.map((item) => (
                    <SelectItem key={item.key} value={item.key}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Menu de Inteligência e Sincronização */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 border-primary/20 text-primary hover:bg-primary/5 h-10 shrink-0 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className={cn("h-4 w-4 stroke-[1.5px]", syncingBling && "animate-spin")} />
                      <span className="text-[14px]">Inteligência Bling</span>
                    </div>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    Sincronização
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-text-secondary hover:text-foreground transition-colors p-1">
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="left" className="w-80 p-4 shadow-xl border-gray-200">
                        <h4 className="font-medium mb-2 text-sm border-b pb-1 flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-emerald-600" />
                          Legenda de Segmentação (RFM)
                        </h4>
                        <div className="space-y-3">
                          {RFM_LEGEND.map((item) => (
                            <div key={item.label} className="text-xs">
                              <span className="font-medium block mb-0.5">{item.label}</span>
                              <span className="text-text-secondary leading-relaxed">{item.desc}</span>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={handleBlingSync} disabled={syncingBling} className="gap-2 cursor-pointer">
                    <Database className="h-4 w-4" />
                    Sincronizar Pedidos (Histórico)
                    {syncingBling && <RefreshCw className="h-3 w-3 animate-spin ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleFullSync} disabled={syncingBling} className="gap-2 cursor-pointer">
                    <Users className="h-4 w-4" />
                    Sincronizar Contatos (Cadastro)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Análise BI</DropdownMenuLabel>
                  <DropdownMenuItem onClick={handleRecalculateRFM} className="gap-2 cursor-pointer">
                    <TrendingUp className="h-4 w-4" />
                    Recalcular Matriz RFM
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleTestSync} disabled={syncingBling} className="gap-2 cursor-pointer text-orange-600">
                    <RefreshCw className="h-4 w-4" />
                    Executar Teste 70
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Menu de Importação e Ações Extras */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 h-10 shrink-0">
                    <Upload className="h-4 w-4" />
                    <span>Importar / Ações</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Upload de Dados</DropdownMenuLabel>
                  <div className="p-1">
                    <ImportCustomersExcel onSuccess={fetchCustomers} />
                  </div>
                  <DropdownMenuItem className="gap-2 cursor-pointer font-medium p-0">
                    <Button variant="ghost" className="w-full justify-start font-normal h-8 px-2">
                      <Plus className="h-4 w-4 mr-2" />
                      Cadastro em Massa
                    </Button>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Utilitários</DropdownMenuLabel>
                  <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                    <a href="/modelo_cadastro_responsaveis.csv" download className="flex items-center w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Baixar Modelo CSV
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCleanupDuplicates} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                    <Eraser className="h-4 w-4" />
                    Limpar Duplicados
                  </DropdownMenuItem>
                  {canRestoreLegacyCustomers && (
                    <DropdownMenuItem
                      onClick={handleRestoreLegacyCustomers}
                      disabled={restoringLegacyCustomers}
                      className="gap-2 cursor-pointer"
                    >
                      <RefreshCw className={cn("h-4 w-4", restoringLegacyCustomers && "animate-spin")} />
                      Restaurar Clientes Antigos
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) setEditingCustomer(null);
              }}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => { setEditingCustomer(null); setFormData({ name: "", email: "", phone: "", cpf: "", city: "" }); }}
                    className="gap-2 h-10 shadow-none shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    Novo Responsável
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingCustomer ? "Editar Responsável" : "Cadastrar Responsável"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nome *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cpf">CPF</Label>
                      <Input
                        id="cpf"
                        value={formData.cpf}
                        onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <Button type="submit" className="w-full">{editingCustomer ? "Salvar Alterações" : "Cadastrar"}</Button>
                  </form>

                  {editingCustomer && (
                    <div className="mt-8 border-t pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Baby className="h-4 w-4 text-primary" />
                          <h3 className="font-medium">Gerenciar Filhos</h3>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px]"
                          onClick={() => {
                            setChildFormData({ name: "", birth_date: "", current_size: "" });
                            setIsChildDialogOpen(true);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Filho
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {children.filter(c => c.customer_id === editingCustomer.id).map(child => (
                          <div key={child.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{child.name}</span>
                              {child.birth_date && (
                                <span className="text-[10px] text-text-secondary">
                                  {getAge(child.birth_date)} • {format(new Date(child.birth_date + 'T12:00:00'), 'dd/MM/yyyy')}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-text-secondary hover:text-destructive"
                                onClick={async () => {
                                  if (confirm("Excluir este filho?")) {
                                    const { error } = await (supabase as any).from("children").delete().eq("id", child.id);
                                    if (error) toast.error("Erro ao excluir");
                                    else {
                                      toast.success("Filho removido");
                                      const { data } = await (supabase as any).from("children").select("*");
                                      setChildren(data || []);
                                    }
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {children.filter(c => c.customer_id === editingCustomer.id).length === 0 && (
                          <p className="text-xs text-text-secondary italic text-center py-4 bg-muted/30 rounded-lg">
                            Nenhum filho vinculado
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              <Dialog open={isChildDialogOpen} onOpenChange={setIsChildDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Adicionar Filho(a)</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddChild} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="child-name">Nome da Criança *</Label>
                      <Input
                        id="child-name"
                        value={childFormData.name}
                        onChange={(e) => setChildFormData({ ...childFormData, name: e.target.value })}
                        placeholder="Nome completo"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="child-birth">Data de Nascimento</Label>
                        <Input
                          id="child-birth"
                          type="date"
                          value={childFormData.birth_date}
                          onChange={(e) => setChildFormData({ ...childFormData, birth_date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="child-size">Tamanho Atual</Label>
                        <Select
                          value={childFormData.current_size}
                          onValueChange={(value) => setChildFormData({ ...childFormData, current_size: value })}
                        >
                          <SelectTrigger id="child-size">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {SIZES.map((size) => (
                              <SelectItem key={size} value={size}>
                                {size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsChildDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">
                        Salvar Filho
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          {/* Legenda RFM Visual */}
          <div className="bg-white border border-border rounded-xl p-4 shadow-none">
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              {RFM_LEGEND.map((item) => (
                <div key={item.key} className="flex flex-col gap-1 min-w-[140px]">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-foreground">{item.label}</span>
                  </div>
                  <p className="text-[11px] text-text-secondary leading-tight">
                    {item.desc.split(':')[1]?.trim() || item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-text-secondary mx-auto mb-4" />
              <p className="text-text-secondary">
                {searchTerm ? "Nenhum responsável encontrado" : "Nenhum responsável cadastrado ainda"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCustomers.map((customer) => {
                const customerChildren = children.filter(child => child.customer_id === customer.id);
                const resolvedMetrics = getResolvedCustomerMetrics(customer);

                return (
                  <div
                    key={customer.id}
                    className="bg-white border border-border rounded-xl shadow-none hover:border-primary/20 hover:bg-primary/[0.01] transition-all overflow-hidden cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedCustomerForPurchases(customer)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedCustomerForPurchases(customer);
                      }
                    }}
                  >
                    <div className="p-5 pb-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex flex-col">
                          <h3 className="text-[16px] font-medium text-foreground">{customer.name}</h3>
                          {customer.venda_origem && (
                            <span className="text-[11px] text-text-secondary font-light mt-0.5">
                              {customer.venda_origem}
                            </span>
                          )}
                        </div>
                        <Badge variant="outline" className={cn("text-[11px] py-0 px-2 h-6 border font-medium rounded-full", getSegmentColor(customer.rfm_segment))}>
                          {getSegmentLabel(customer.rfm_segment)}
                        </Badge>
                      </div>
                      {customer.phone && (
                        <a
                          href={`https://wa.me/55${customer.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          WhatsApp
                        </a>
                      )}
                    </div>
                    <div className="px-5 py-4 space-y-3 bg-gray-50/50 border-t border-border/40 text-[13px]">
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                        <div>
                          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-tight mb-0.5">Pedidos</p>
                          <p className="font-bold text-text-primary text-base">{resolvedMetrics.totalOrders}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-tight mb-0.5">Faturamento</p>
                          <p className="font-bold text-lg text-primary">{formatCurrency(resolvedMetrics.totalSpent)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-tight mb-0.5">Ticket Médio</p>
                          <p className="font-bold text-text-primary text-base">{formatCurrency(resolvedMetrics.ticketMedio)}</p>
                        </div>
                        <div className="col-span-2 mt-2 p-4 bg-white border border-border/60 rounded-xl shadow-sm">
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-3.5 h-3.5 text-primary" />
                              <span className="text-[11px] font-black text-foreground uppercase tracking-wider">Análise de Valor (LTV)</span>
                            </div>
                            <Badge variant="secondary" className="text-[9px] h-4 font-bold uppercase tracking-tight bg-primary/10 text-primary border-none">
                              Previsão Baseada em Margem
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-tighter">LTV Bruto</p>
                              <p className="font-black text-[17px] text-foreground tracking-tight">{formatCurrency(resolvedMetrics.ltv)}</p>
                            </div>
                            <div className="space-y-0.5 text-right">
                              <p className="text-[10px] font-bold text-success uppercase tracking-tighter">Lucro Líquido Real</p>
                              <p className="font-black text-[17px] text-success tracking-tight">{formatCurrency(resolvedMetrics.ltvProfit)}</p>
                            </div>
                          </div>

                          <div className="mt-4 p-2.5 bg-gray-50 rounded-lg border border-gray-100/80">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                              <span className="text-[10px] font-bold text-text-primary uppercase tracking-tight">Composição do Cálculo</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-[11px] text-text-secondary font-medium">
                              <div className="flex items-center gap-1">
                                <span className="text-foreground">{formatCurrency(resolvedMetrics.ticketMedio)}</span>
                                <span className="text-[10px] opacity-50">Ticket</span>
                              </div>
                              <span className="text-gray-300">×</span>
                              <div className="flex items-center gap-1">
                                <span className="text-foreground">{resolvedMetrics.averageFrequency.toFixed(1)}</span>
                                <span className="text-[10px] opacity-50">Freq/Mês</span>
                              </div>
                              <span className="text-gray-300">×</span>
                              <div className="flex items-center gap-1">
                                <span className="text-foreground">{resolvedMetrics.retentionMonths.toFixed(1)}</span>
                                <span className="text-[10px] opacity-50">Meses</span>
                              </div>
                            </div>
                            <p className="mt-2 pt-2 border-t border-gray-200/50 text-[9px] text-text-secondary leading-tight italic">
                              * Estimativa considerando a margem de <span className="text-success font-bold">30%</span> sobre o faturamento total do cliente.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-tight">Última compra</p>
                          <p className="font-bold text-emerald-700 text-sm">{resolvedMetrics.lastPurchaseDate ? formatDate(resolvedMetrics.lastPurchaseDate) : '-'}</p>
                          <p className="mt-1 text-[10px] text-text-secondary">Clique no card para ver os itens comprados</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-text-secondary hover:text-primary rounded-lg" onClick={(event) => {
                            event.stopPropagation();
                            setEditingCustomer(customer);
                            setFormData({
                              name: customer.name || "",
                              email: customer.email || "",
                              phone: customer.phone || "",
                              cpf: customer.cpf || "",
                              city: customer.city || "",
                            });
                            setIsDialogOpen(true);
                          }}>
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className={cn("h-8 w-8 rounded-lg transition-colors", expanded === customer.id ? "text-primary bg-primary/5" : "text-text-secondary hover:text-primary")}
                            onClick={(event) => {
                              event.stopPropagation();
                              setExpanded(expanded === customer.id ? null : customer.id);
                            }}
                          >
                            <Baby className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-text-secondary hover:text-destructive rounded-lg" onClick={(event) => event.stopPropagation()}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-2xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Deseja excluir este responsável?</AlertDialogTitle>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-lg">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg"
                                  onClick={async () => {
                                    const { error } = await (supabase as any).from("growth_customers").delete().eq("id", customer.id);
                                    if (!error) {
                                      toast.success("Responsável excluído!");
                                      fetchCustomers();
                                    } else {
                                      toast.error("Erro ao excluir");
                                    }
                                  }}
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      {expanded === customer.id && (
                        <div className="mt-3 pt-3 border-t border-border/40 space-y-2 animate-in fade-in slide-in-from-top-1">
                          <p className="text-[11px] font-medium text-text-secondary   tracking-wider mb-2">Filhos vinculados</p>
                          {customerChildren.map(child => (
                            <div key={child.id} className="p-2.5 bg-white border border-border/60 rounded-lg flex flex-col gap-0.5 shadow-none">
                              <div className="flex items-center justify-between">
                                <span className="text-[13px] font-medium text-foreground">{child.name}</span>
                                {child.current_size && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1 border-muted-foreground/30 text-text-secondary">
                                    {child.current_size}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                                {child.birth_date && <span>🎂 {getAge(child.birth_date)}</span>}
                                {child.birth_date && <span>📅 {format(new Date(child.birth_date + 'T12:00:00'), 'dd/MM')}</span>}
                              </div>
                            </div>
                          ))}
                          {customerChildren.length === 0 && (
                            <p className="text-[11px] text-text-secondary italic py-2 text-center bg-gray-50 rounded-lg">
                              Nenhum filho vinculado
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedCustomerForPurchases} onOpenChange={(open) => {
        if (!open) setSelectedCustomerForPurchases(null);
      }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedCustomerForPurchases ? `Itens comprados por ${selectedCustomerForPurchases.name}` : "Itens comprados"}
            </DialogTitle>
            <DialogDescription>
              Histórico de produtos sincronizados no Bling e nas importações manuais.
            </DialogDescription>
          </DialogHeader>

          {!selectedCustomerPurchases && refreshingLiveMetrics ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-text-secondary">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <p className="text-sm">Carregando histórico de compras...</p>
            </div>
          ) : selectedCustomerPurchases && selectedCustomerPurchases.length > 0 ? (
            <div className="space-y-4 pt-2">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border bg-gray-50/70 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-tight text-text-secondary">Pedidos</p>
                  <p className="mt-1 text-xl font-black text-foreground">{selectedCustomerPurchaseSummary.orders}</p>
                </div>
                <div className="rounded-xl border border-border bg-gray-50/70 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-tight text-text-secondary">Itens</p>
                  <p className="mt-1 text-xl font-black text-foreground">{selectedCustomerPurchaseSummary.lines}</p>
                </div>
                <div className="rounded-xl border border-border bg-gray-50/70 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-tight text-text-secondary">Qtd. Total</p>
                  <p className="mt-1 text-xl font-black text-foreground">{selectedCustomerPurchaseSummary.units}</p>
                </div>
                <div className="rounded-xl border border-border bg-gray-50/70 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-tight text-text-secondary">Faturamento</p>
                  <p className="mt-1 text-xl font-black text-primary">{formatCurrency(selectedCustomerPurchaseSummary.total)}</p>
                </div>
              </div>

              <ScrollArea className="h-[420px] pr-4">
                <div className="space-y-4">
                  {selectedCustomerPurchases.map((order) => (
                    <div key={order.id} className="rounded-2xl border border-border bg-white p-4 shadow-none">
                      <div className="flex flex-col gap-2 border-b border-border/60 pb-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary" />
                            <p className="text-sm font-semibold text-foreground">Pedido #{order.number}</p>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-secondary">
                            <span>{order.date ? formatDate(order.date) : "Data não informada"}</span>
                            {order.channel && <span>{order.channel}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="w-fit rounded-full border-primary/20 bg-primary/5 text-primary">
                            {formatCurrency(order.total)}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-text-secondary hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteOrder(order.id, order.number)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {order.items.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {order.items.map((item, index) => (
                            <div key={`${order.id}-${item.sku || item.name}-${index}`} className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-gray-50/70 px-3 py-2.5">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">{item.name}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-secondary">
                                  <span>{item.quantity} un.</span>
                                  <span>{formatCurrency(item.unitPrice)} cada</span>
                                  {item.sku && <span>SKU: {item.sku}</span>}
                                </div>
                              </div>
                              <p className="text-sm font-bold text-primary whitespace-nowrap">{formatCurrency(item.totalPrice)}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 rounded-xl border border-dashed border-border px-3 py-4 text-sm text-text-secondary">
                          Este pedido foi sincronizado sem o detalhamento dos itens.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="py-12 text-center text-text-secondary">
              <Package className="mx-auto mb-3 h-10 w-10 opacity-60" />
              <p className="text-sm font-medium">Nenhum item encontrado para esta cliente.</p>
              <p className="mt-1 text-xs">
                Se necessário, rode a sincronização do Bling para trazer o histórico completo dos pedidos.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
