import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Baby, Users, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { differenceInYears, differenceInMonths, format, getMonth, getDate } from "date-fns";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Child {
  id: string;
  name: string;
  gender: string | null;
  birth_date: string | null;
  current_size: string | null;
  next_size: string | null;
  customer_id: string;
  growth_customers?: { name: string };
}

interface GrowthCustomer {
  id: string;
  name: string;
}

interface BulkChild {
  name: string;
  gender: string;
  birth_date: string;
  current_size: string;
  next_size: string;
  customer_id: string;
}

const SIZES = ['RN', 'P', 'M', 'G', 'GG', '1', '2', '3', '4', '6', '8', '10', '12', '14', '16'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export const GrowthChildren = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [customers, setCustomers] = useState<GrowthCustomer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    gender: "",
    birth_date: "",
    current_size: "",
    next_size: "",
    customer_id: "",
  });
  const [deletingChild, setDeletingChild] = useState<Child | null>(null);
  
  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterGender, setFilterGender] = useState("");
  const [filterAgeMin, setFilterAgeMin] = useState("");
  const [filterAgeMax, setFilterAgeMax] = useState("");
  const [filterBirthdayMonth, setFilterBirthdayMonth] = useState("");
  const [filterSize, setFilterSize] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [childrenRes, customersRes] = await Promise.all([
        supabase
          .from("children")
          .select("*, growth_customers(name)")
          .order("name"),
        supabase
          .from("growth_customers")
          .select("id, name")
          .order("name"),
      ]);

      if (childrenRes.error) throw childrenRes.error;
      if (customersRes.error) throw customersRes.error;

      setChildren(childrenRes.data || []);
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
      if (editingChild) {
        ({ error } = await supabase
          .from("children")
          .update({
            ...formData,
            birth_date: formData.birth_date || null,
            gender: formData.gender || null,
            current_size: formData.current_size || null,
            next_size: formData.next_size || null,
          })
          .eq("id", editingChild.id));
      } else {
        ({ error } = await supabase
          .from("children")
          .insert([{
            ...formData,
            birth_date: formData.birth_date || null,
            gender: formData.gender || null,
            current_size: formData.current_size || null,
            next_size: formData.next_size || null,
          }]));
      }
      if (error) throw error;
      toast.success(editingChild ? "Criança atualizada com sucesso!" : "Criança cadastrada com sucesso!");
      setIsDialogOpen(false);
      setFormData({ name: "", gender: "", birth_date: "", current_size: "", next_size: "", customer_id: "" });
      setEditingChild(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || (editingChild ? "Erro ao atualizar criança" : "Erro ao cadastrar criança"));
    }
  };

  const handleDelete = async (child: Child) => {
    try {
      const { error } = await supabase.from("children").delete().eq("id", child.id);
      if (error) throw error;
      toast.success("Criança excluída com sucesso!");
      fetchData();
    } catch (error) {
      toast.error("Erro ao excluir criança");
    } finally {
      setDeletingChild(null);
    }
  };

  const clearFilters = () => {
    setFilterGender("");
    setFilterAgeMin("");
    setFilterAgeMax("");
    setFilterBirthdayMonth("");
    setFilterSize("");
  };

  const hasActiveFilters = filterGender || filterAgeMin || filterAgeMax || filterBirthdayMonth || filterSize;

  const filteredChildren = children.filter((c) => {
    // Search filter
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.growth_customers?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Gender filter
    const matchesGender = !filterGender || c.gender === filterGender;
    
    // Age filter
    let matchesAge = true;
    if (c.birth_date && (filterAgeMin || filterAgeMax)) {
      const age = differenceInYears(new Date(), new Date(c.birth_date + 'T12:00:00'));
      if (filterAgeMin && age < parseInt(filterAgeMin)) matchesAge = false;
      if (filterAgeMax && age > parseInt(filterAgeMax)) matchesAge = false;
    } else if ((filterAgeMin || filterAgeMax) && !c.birth_date) {
      matchesAge = false;
    }
    
    // Birthday month filter
    let matchesBirthday = true;
    if (filterBirthdayMonth && c.birth_date) {
      const birthMonth = getMonth(new Date(c.birth_date + 'T12:00:00'));
      matchesBirthday = birthMonth === parseInt(filterBirthdayMonth);
    } else if (filterBirthdayMonth && !c.birth_date) {
      matchesBirthday = false;
    }
    
    // Size filter
    const matchesSize = !filterSize || c.current_size === filterSize;
    
    return matchesSearch && matchesGender && matchesAge && matchesBirthday && matchesSize;
  });

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando crianças...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nome da criança ou responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {hasActiveFilters && <Badge variant="secondary" className="ml-2">{[filterGender, filterAgeMin || filterAgeMax, filterBirthdayMonth, filterSize].filter(Boolean).length}</Badge>}
        </Button>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingChild(null);
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingChild(null); setFormData({ name: "", gender: "", birth_date: "", current_size: "", next_size: "", customer_id: "" }); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Criança
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingChild ? "Editar Criança" : "Cadastrar Criança"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="customer_id">Responsável *</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                <Label htmlFor="gender">Sexo</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="birth_date">Data de Nascimento</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tamanho Atual</Label>
                  <Select
                    value={formData.current_size}
                    onValueChange={(value) => setFormData({ ...formData, current_size: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {SIZES.map((size) => (
                        <SelectItem key={size} value={size}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Próximo Tamanho</Label>
                  <Select
                    value={formData.next_size}
                    onValueChange={(value) => setFormData({ ...formData, next_size: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {SIZES.map((size) => (
                        <SelectItem key={size} value={size}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={!formData.customer_id}>{editingChild ? "Salvar Alterações" : "Cadastrar"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Filtros</h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <Label>Gênero</Label>
              <Select value={filterGender} onValueChange={setFilterGender}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Idade Mínima</Label>
              <Input
                type="number"
                min="0"
                placeholder="Ex: 1"
                value={filterAgeMin}
                onChange={(e) => setFilterAgeMin(e.target.value)}
              />
            </div>
            <div>
              <Label>Idade Máxima</Label>
              <Input
                type="number"
                min="0"
                placeholder="Ex: 10"
                value={filterAgeMax}
                onChange={(e) => setFilterAgeMax(e.target.value)}
              />
            </div>
            <div>
              <Label>Mês de Aniversário</Label>
              <Select value={filterBirthdayMonth} onValueChange={setFilterBirthdayMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, index) => (
                    <SelectItem key={index} value={index.toString()}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tamanho Atual</Label>
              <Select value={filterSize} onValueChange={setFilterSize}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {SIZES.map((size) => (
                    <SelectItem key={size} value={size}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {filteredChildren.length === 0 ? (
        <div className="text-center py-12">
          <Baby className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchTerm ? "Nenhuma criança encontrada" : "Nenhuma criança cadastrada ainda"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredChildren.map((child) => (
            <Card key={child.id} className="hover:shadow-none transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{child.name}</CardTitle>
                  {child.gender && (
                    <Badge variant="outline">
                      {child.gender === 'masculino' ? '♂' : child.gender === 'feminino' ? '♀' : '⚧'}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Responsável: {child.growth_customers?.name}
                </p>
                {child.birth_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Idade:</span>
                    <span className="font-medium">{getAge(child.birth_date)}</span>
                  </div>
                )}
                {child.birth_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Aniversário:</span>
                    <span className="font-medium">{format(new Date(child.birth_date + 'T12:00:00'), 'dd/MM')}</span>
                  </div>
                )}
                {child.current_size && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tamanho:</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{child.current_size}</Badge>
                      {child.next_size && child.next_size !== child.current_size && (
                        <>
                          <span>→</span>
                          <Badge variant="outline">{child.next_size}</Badge>
                        </>
                      )}
                    </div>
                  </div>
                )}
                <Button size="sm" variant="outline" onClick={() => {
                  setEditingChild(child);
                  setFormData({
                    name: child.name || "",
                    gender: child.gender || "",
                    birth_date: child.birth_date || "",
                    current_size: child.current_size || "",
                    next_size: child.next_size || "",
                    customer_id: child.customer_id || "",
                  });
                  setIsDialogOpen(true);
                }}>
                  Editar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" onClick={() => setDeletingChild(child)}>
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Deseja realmente excluir esta criança?</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeletingChild(null)}>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={async () => {
                        if (deletingChild) {
                          const { error } = await supabase.from("children").delete().eq("id", deletingChild.id);
                          if (!error) {
                            toast.success("Criança excluída com sucesso!");
                            fetchData();
                          } else {
                            toast.error("Erro ao excluir criança");
                          }
                          setDeletingChild(null);
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

// Função utilitária para calcular idade a partir da data de nascimento (YYYY-MM-DD)
function getAge(birthDateString: string): number {
  if (!birthDateString) return 0;
  const birthDate = new Date(birthDateString + 'T12:00:00');
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
