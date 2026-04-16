import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Upload } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type RfmSegment = Database["public"]["Enums"]["rfm_segment"];

interface ChildForm {
  name: string;
  gender: string;
  birth_date: string;
  current_size: string;
  next_size: string;
}

interface CustomerForm {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  city: string;
  children: ChildForm[];
}

export function ImportCustomersExcel({ onSuccess }: { onSuccess?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [customers, setCustomers] = useState<CustomerForm[]>([
    { name: "", email: "", phone: "", cpf: "", city: "", children: [] }
  ]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = evt.target?.result;
      if (!data) return;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);
      if (!rows.length) {
        toast.error("Planilha vazia ou formato inválido");
        return;
      }
      // Espera colunas: name, whatsapp, document
      const toInsert = rows.map(r => ({
        name: r.name || r.Nome || r.nome,
        phone: r.whatsapp || r.WhatsApp || r.whats || r.telefone,
        cpf: r.document || r.cpf || r.CPF || r.documento,
        email: r.email || r.Email || r.e_mail || null,
        city: r.city || r.cidade || null,
      })).filter(r => r.name);
      if (!toInsert.length) {
        toast.error("Nenhum cliente válido encontrado");
        return;
      }
      const { error } = await supabase.from("growth_customers").insert(toInsert);
      if (error) {
        toast.error("Erro ao importar clientes");
      } else {
        toast.success("Clientes importados com sucesso!");
        onSuccess?.();
      }
    };
    reader.readAsBinaryString(file);
  };

  const addCustomer = () => {
    setCustomers([...customers, { name: "", email: "", phone: "", cpf: "", city: "", children: [] }]);
  };

  const removeCustomer = (index: number) => {
    setCustomers(customers.filter((_, i) => i !== index));
  };

  const updateCustomer = (index: number, field: keyof Omit<CustomerForm, 'children'>, value: string) => {
    const updated = [...customers];
    updated[index] = { ...updated[index], [field]: value };
    setCustomers(updated);
  };

  const addChild = (customerIndex: number) => {
    const updated = [...customers];
    updated[customerIndex].children.push({ name: "", gender: "", birth_date: "", current_size: "", next_size: "" });
    setCustomers(updated);
  };

  const removeChild = (customerIndex: number, childIndex: number) => {
    const updated = [...customers];
    updated[customerIndex].children = updated[customerIndex].children.filter((_, i) => i !== childIndex);
    setCustomers(updated);
  };

  const updateChild = (customerIndex: number, childIndex: number, field: keyof ChildForm, value: string) => {
    const updated = [...customers];
    updated[customerIndex].children[childIndex] = { ...updated[customerIndex].children[childIndex], [field]: value };
    setCustomers(updated);
  };

  const handleBulkSubmit = async () => {
    const validCustomers = customers.filter(c => c.name.trim());
    if (!validCustomers.length) {
      toast.error("Adicione pelo menos um responsável com nome");
      return;
    }

    try {
      for (const customer of validCustomers) {
        const { data: insertedCustomer, error: customerError } = await supabase
          .from("growth_customers")
          .insert({
            name: customer.name,
            email: customer.email || null,
            phone: customer.phone || null,
            cpf: customer.cpf || null,
            city: customer.city || null,
          })
          .select()
          .single();

        if (customerError) throw customerError;

        if (insertedCustomer && customer.children.length > 0) {
          const childrenToInsert = customer.children
            .filter(c => c.name.trim())
            .map(c => ({
              customer_id: insertedCustomer.id,
              name: c.name,
              gender: c.gender || null,
              birth_date: c.birth_date || null,
              current_size: c.current_size || null,
              next_size: c.next_size || null,
            }));

          if (childrenToInsert.length > 0) {
            const { error: childError } = await supabase.from("children").insert(childrenToInsert);
            if (childError) throw childError;
          }
        }
      }

      toast.success(`${validCustomers.length} responsável(is) cadastrado(s) com sucesso!`);
      setIsDialogOpen(false);
      setCustomers([{ name: "", email: "", phone: "", cpf: "", city: "", children: [] }]);
      onSuccess?.();
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao cadastrar: " + (error.message || ""));
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        ref={inputRef}
        style={{ display: "none" }}
        onChange={handleFile}
      />
      <Button
        variant="outline"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-4 w-4 mr-2" />
        Importar Excel
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Cadastro em Massa
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastro em Massa de Responsáveis e Filhos</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {customers.map((customer, customerIndex) => (
              <div key={customerIndex} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Responsável {customerIndex + 1}</h4>
                  {customers.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeCustomer(customerIndex)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Nome *</Label>
                    <Input
                      value={customer.name}
                      onChange={(e) => updateCustomer(customerIndex, "name", e.target.value)}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={customer.email}
                      onChange={(e) => updateCustomer(customerIndex, "email", e.target.value)}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={customer.phone}
                      onChange={(e) => updateCustomer(customerIndex, "phone", e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <Label>CPF</Label>
                    <Input
                      value={customer.cpf}
                      onChange={(e) => updateCustomer(customerIndex, "cpf", e.target.value)}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div>
                    <Label>Cidade</Label>
                    <Input
                      value={customer.city}
                      onChange={(e) => updateCustomer(customerIndex, "city", e.target.value)}
                      placeholder="Cidade"
                    />
                  </div>
                </div>

                {/* Filhos */}
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Filhos</Label>
                    <Button variant="outline" size="sm" onClick={() => addChild(customerIndex)}>
                      <Plus className="h-3 w-3 mr-1" /> Adicionar Filho
                    </Button>
                  </div>
                  
                  {customer.children.map((child, childIndex) => (
                    <div key={childIndex} className="bg-muted p-3 rounded-md space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Filho {childIndex + 1}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeChild(customerIndex, childIndex)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        <div>
                          <Label className="text-xs">Nome *</Label>
                          <Input
                            value={child.name}
                            onChange={(e) => updateChild(customerIndex, childIndex, "name", e.target.value)}
                            placeholder="Nome"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Sexo</Label>
                          <select
                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                            value={child.gender}
                            onChange={(e) => updateChild(customerIndex, childIndex, "gender", e.target.value)}
                          >
                            <option value="">Selecione</option>
                            <option value="M">Masculino</option>
                            <option value="F">Feminino</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs">Data Nascimento</Label>
                          <Input
                            type="date"
                            value={child.birth_date}
                            onChange={(e) => updateChild(customerIndex, childIndex, "birth_date", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tamanho Atual</Label>
                          <Input
                            value={child.current_size}
                            onChange={(e) => updateChild(customerIndex, childIndex, "current_size", e.target.value)}
                            placeholder="Ex: 4"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Próximo Tamanho</Label>
                          <Input
                            value={child.next_size}
                            onChange={(e) => updateChild(customerIndex, childIndex, "next_size", e.target.value)}
                            placeholder="Ex: 6"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={addCustomer}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Outro Responsável
              </Button>
              <Button onClick={handleBulkSubmit}>
                Salvar Todos
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
