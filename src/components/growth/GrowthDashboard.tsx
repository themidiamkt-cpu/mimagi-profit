import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, TrendingUp, AlertTriangle, Gift, Ruler } from "lucide-react";
import { format, addDays, startOfMonth, endOfMonth, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";

interface DashboardMetrics {
  totalChildren: number;
}

interface Birthday {
  id: string;
  name: string;
  birth_date: string;
  customer_name: string;
  phone: string;
}

interface SizeChange {
  id: string;
  name: string;
  current_size: string;
  next_size: string;
  customer_name: string;
}

export const GrowthDashboard = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalChildren: 0,
  });
  const [monthBirthdays, setMonthBirthdays] = useState<Birthday[]>([]);
  const [weekBirthdays, setWeekBirthdays] = useState<Birthday[]>([]);
  const [sizeChanges, setSizeChanges] = useState<SizeChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [birthdayMessage, setBirthdayMessage] = useState<string>(
    "Olá, {nome_responsavel}! 💕\nHoje é um dia especial: o aniversário da {nome_crianca} 🎂\nQue seja um ano cheio de alegria, descobertas e muitos momentos felizes.\nCom carinho,\nMimagi Kids"
  );

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // DashboardMetrics KPI logic removed

      // Fetch children
      const { data: children } = await (supabase
        .from("children" as any)
        .select("*, growth_customers(name, phone)") as any);

      if (children) {
        setMetrics(prev => ({ ...prev, totalChildren: children.length }));

        const today = new Date();
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);
        const weekEnd = addDays(today, 7);

        // Filter birthdays
        const thisMonthBirthdays: Birthday[] = [];
        const thisWeekBirthdays: Birthday[] = [];

        children.forEach(child => {
          if (child.birth_date) {
            const birthDate = new Date(child.birth_date);
            const birthdayThisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
            if (birthdayThisYear >= monthStart && birthdayThisYear <= monthEnd) {
              thisMonthBirthdays.push({
                id: child.id,
                name: child.name,
                birth_date: child.birth_date,
                customer_name: (child.growth_customers as any)?.name || '',
                phone: (child.growth_customers as any)?.phone || '',
              });
            }
            if (birthdayThisYear >= today && birthdayThisYear <= weekEnd) {
              thisWeekBirthdays.push({
                id: child.id,
                name: child.name,
                birth_date: child.birth_date,
                customer_name: (child.growth_customers as any)?.name || '',
                phone: (child.growth_customers as any)?.phone || '',
              });
            }
          }
        });

        setMonthBirthdays(thisMonthBirthdays);
        setWeekBirthdays(thisWeekBirthdays);

        // Filter children needing size change
        const needsSizeChange = children
          .filter(c => c.next_size && c.current_size !== c.next_size)
          .map(c => ({
            id: c.id,
            name: c.name,
            current_size: c.current_size || '',
            next_size: c.next_size || '',
            customer_name: (c.growth_customers as any)?.name || '',
          }));

        setSizeChanges(needsSizeChange);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };


  function handleSendBirthday(child: Birthday) {
    const cleanPhone = child.phone?.replace(/\D/g, "");
    if (!cleanPhone) {
      alert("Telefone do responsável não cadastrado!");
      return;
    }

    // Garante que tenha o prefixo 55 se for número brasileiro (10 ou 11 dígitos)
    const phoneWithCountry = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;

    const nome_responsavel = child.customer_name;
    const nome_crianca = child.name;
    const mensagem = birthdayMessage
      .replace("{nome_responsavel}", nome_responsavel)
      .replace("{nome_crianca}", nome_crianca);
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards removidos a pedido do usuário */}


      {/* Lists */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Birthdays */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="h-5 w-5 text-pink-500" />
              Aniversariantes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Próximos 7 dias ({weekBirthdays.length})</h4>
              {weekBirthdays.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum aniversário</p>
              ) : (
                <ul className="space-y-1">
                  {weekBirthdays.map(b => (
                    <li key={b.id} className="text-sm">
                      <span className="font-medium">{b.name}</span>
                      <span className="text-muted-foreground"> - {b.customer_name}</span>
                      <span className="text-muted-foreground text-xs ml-2">
                        ({format(new Date(b.birth_date + 'T12:00:00'), "dd/MM")})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Este mês ({monthBirthdays.length})</h4>
              {monthBirthdays.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum aniversário</p>
              ) : (
                <ul className="space-y-1 max-h-32 overflow-y-auto">
                  {monthBirthdays.map(b => (
                    <li key={b.id} className="text-sm flex items-center gap-2">
                      <span className="font-medium">{b.name}</span>
                      <span className="text-muted-foreground"> - {b.customer_name}</span>
                      <span className="text-muted-foreground text-xs ml-2">
                        ({format(new Date(b.birth_date + 'T12:00:00'), "dd/MM")})
                      </span>
                      <Button size="sm" variant="outline" onClick={() => handleSendBirthday(b)}>
                        🎂 Enviar Feliz Aniversário
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Size Changes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Ruler className="h-5 w-5 text-blue-500" />
              Troca de Tamanho
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sizeChanges.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma criança precisa trocar de tamanho</p>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {sizeChanges.map(c => (
                  <li key={c.id} className="text-sm flex items-center justify-between">
                    <div>
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground"> - {c.customer_name}</span>
                    </div>
                    <Badge variant="outline">
                      {c.current_size} → {c.next_size}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
