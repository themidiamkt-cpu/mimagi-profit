import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Baby, User, CheckCircle2, Copy, Gift } from "lucide-react";
import { z } from "zod";

const childSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  gender: z.string().optional(),
  birth_date: z.string().optional(),
  current_size: z.string().optional(),
  next_size: z.string().optional(),
});

const customerSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  email: z.string().trim().email("Email inválido").max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional(),
  cpf: z.string().trim().max(14).optional(),
  city: z.string().trim().max(100).optional(),
});

interface ChildForm {
  name: string;
  gender: string;
  birth_date: string;
  current_size: string;
  next_size: string;
}

const SIZES = ["RN", "P", "M", "G", "GG", "1", "2", "3", "4", "6", "8", "10", "12", "14", "16"];

// Generate unique coupon code
const generateCouponCode = (): string => {
  const prefix = "MIMAGI";
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding confusing chars like O, 0, I, 1
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}${code}`;
};

const CustomerRegistration = () => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [couponCode, setCouponCode] = useState<string>("");
  // Password state removed
  const [customerData, setCustomerData] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
    city: "",
  });
  const [children, setChildren] = useState<ChildForm[]>([
    { name: "", gender: "", birth_date: "", current_size: "", next_size: "" }
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addChild = () => {
    setChildren([...children, { name: "", gender: "", birth_date: "", current_size: "", next_size: "" }]);
  };

  const removeChild = (index: number) => {
    if (children.length > 1) {
      setChildren(children.filter((_, i) => i !== index));
    }
  };

  const updateChild = (index: number, field: keyof ChildForm, value: string) => {
    const updated = [...children];
    updated[index] = { ...updated[index], [field]: value };
    setChildren(updated);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submit pressed (Lead Capture Mode)");
    setErrors({});

    // Validate customer data
    const customerResult = customerSchema.safeParse(customerData);
    if (!customerResult.success) {
      const fieldErrors: Record<string, string> = {};
      customerResult.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      toast.error("Por favor, corrija os erros no formulário");
      return;
    }

    // Validate children
    const validChildren = children.filter(c => c.name.trim() !== "");
    for (let i = 0; i < validChildren.length; i++) {
      const childResult = childSchema.safeParse(validChildren[i]);
      if (!childResult.success) {
        const fieldErrors: Record<string, string> = {};
        childResult.error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[`child_${i}_${err.path[0]}`] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast.error("Por favor, corrija os erros no formulário");
        return;
      }
    }

    // Password validation removed

    setLoading(true);
    console.log("Starting Lead Capture flow (Direct DB Insert)...");

    try {
      // 1. Insert Customer (Directly into growth_customers)
      // No Supabase Auth User creation

      // Generate unique coupon code
      const newCouponCode = "CLIENTE10";

      const { data: customer, error: customerError } = await supabase
        .from("growth_customers")
        .insert({
          name: customerData.name.trim(),
          email: customerData.email.trim() || null,
          phone: customerData.phone.trim() || null,
          cpf: customerData.cpf.trim() || null,
          city: customerData.city.trim() || null,
          coupon_code: newCouponCode,
          user_id: null // Explicitly null as this is a lead without a login
        })
        .select()
        .single();

      console.log("Customer insert result:", { customer, customerError });

      if (customerError) {
        console.error("Database insert error details:", JSON.stringify(customerError, null, 2));
        if (customerError.code === "23505") { // Postgres unique_violation code
          if (customerError.message.includes("cpf")) {
            toast.error("Este CPF já está cadastrado.");
          } else if (customerError.message.includes("email")) {
            toast.error("Este email já está cadastrado.");
          } else {
            toast.error("Um usuário com estes dados já existe.");
          }
          setLoading(false);
          return;
        }
        if (customerError.code === "42501") {
          toast.error("Erro de permissão (RLS). Verifique se o script de insert público foi aplicado.");
          setLoading(false);
          return;
        }
        throw customerError;
      }

      // 2. Insert children
      if (validChildren.length > 0 && customer) {
        console.log("Inserting children for customer:", customer.id);
        const childrenToInsert = validChildren.map((child) => ({
          customer_id: customer.id,
          name: child.name.trim(),
          gender: child.gender || null,
          birth_date: child.birth_date || null,
          current_size: child.current_size || null,
          next_size: child.next_size || null,
        }));

        const { error: childrenError } = await supabase
          .from("children")
          .insert(childrenToInsert);

        if (childrenError) {
          console.error("Children insert error:", childrenError);
          throw childrenError;
        }
      }

      setCouponCode(newCouponCode);
      setSubmitted(true);
      toast.success("Cadastro realizado com sucesso!");
    } catch (error: any) {
      console.error("Erro geral no try/catch:", error);
      toast.error("Erro ao realizar cadastro.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(couponCode);
    toast.success("Cupom copiado!");
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-none">
          <CardContent className="pt-10 pb-10 space-y-6">
            {/* Thank you header */}
            <div className="space-y-2">
              <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
              <h1 className="text-3xl font-medium text-foreground">Obrigado!</h1>
              <p className="text-muted-foreground">
                Seu cadastro foi realizado com sucesso.
              </p>
            </div>

            {/* Coupon Code Display */}
            <div className="bg-primary/10 rounded-xl p-6 border-2 border-dashed border-primary space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Gift className="h-6 w-6 text-primary" />
                <span className="text-lg font-medium text-primary">Cupom Exclusivo</span>
              </div>

              <div className="bg-background rounded-lg py-4 px-6 shadow-inner">
                <div className="text-3xl font-medium text-foreground tracking-widest">
                  CLIENTE10
                </div>
              </div>

              <div className="text-4xl font-medium text-primary">
                10% OFF
              </div>

              <p className="text-sm text-muted-foreground">
                na sua próxima compra em <a href="https://www.mimagikids.com.br" target="_blank" rel="noopener noreferrer" className="underline text-primary">www.mimagikids.com.br</a>
              </p>

              <Button
                variant="default"
                size="lg"
                onClick={() => {
                  navigator.clipboard.writeText("CLIENTE10");
                  toast.success("Cupom copiado!");
                }}
                className="gap-2 w-full"
              >
                <Copy className="h-4 w-4" />
                Copiar Cupom
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Apresente este cupom na loja ou use no checkout online. Válido para uma única compra.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-medium text-foreground mb-2">Mimagi Kids</h1>
          <p className="text-muted-foreground">Cadastre seus dados e de seus filhos para receber novidades e descontos exclusivos!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados do Responsável */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Seus Dados
              </CardTitle>
              <CardDescription>Informações para contato</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={customerData.name}
                  onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                  placeholder="Seu nome completo"
                  maxLength={100}
                  required
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerData.email}
                  onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                  placeholder="seu@email.com"
                  maxLength={255}
                  required
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              {/* Password field removed */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">WhatsApp</Label>
                  <Input
                    id="phone"
                    value={customerData.phone}
                    onChange={(e) => setCustomerData({ ...customerData, phone: formatPhone(e.target.value) })}
                    placeholder="(00) 00000-0000"
                    maxLength={16}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={customerData.cpf}
                    onChange={(e) => setCustomerData({ ...customerData, cpf: formatCPF(e.target.value) })}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={customerData.city}
                  onChange={(e) => setCustomerData({ ...customerData, city: e.target.value })}
                  placeholder="Sua cidade"
                  maxLength={100}
                />
              </div>
            </CardContent>
          </Card>

          {/* Dados dos Filhos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Baby className="h-5 w-5" />
                Dados dos Filhos
              </CardTitle>
              <CardDescription>Informações das crianças (Opcional)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {children.map((child, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filho(a) {index + 1}</h4>
                    {children.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeChild(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Nome da Criança</Label>
                    <Input
                      value={child.name}
                      onChange={(e) => updateChild(index, "name", e.target.value)}
                      placeholder="Nome do(a) filho(a)"
                      maxLength={100}
                    />
                    {errors[`child_${index}_name`] && (
                      <p className="text-sm text-destructive">{errors[`child_${index}_name`]}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Sexo</Label>
                      <Select
                        value={child.gender}
                        onValueChange={(value) => updateChild(index, "gender", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="feminino">Feminino</SelectItem>
                          <SelectItem value="masculino">Masculino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Data de Nascimento</Label>
                      <Input
                        type="date"
                        value={child.birth_date}
                        onChange={(e) => updateChild(index, "birth_date", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tamanho Atual</Label>
                      <Select
                        value={child.current_size}
                        onValueChange={(value) => updateChild(index, "current_size", value)}
                      >
                        <SelectTrigger>
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
                    <div className="space-y-2">
                      <Label>Próximo Tamanho</Label>
                      <Select
                        value={child.next_size}
                        onValueChange={(value) => updateChild(index, "next_size", value)}
                      >
                        <SelectTrigger>
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
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addChild}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Outro Filho
              </Button>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Salvando..." : "Enviar Cadastro"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CustomerRegistration;
