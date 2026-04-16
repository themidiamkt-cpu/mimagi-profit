import { useEffect, useState } from "react";
import { addDays, endOfDay, endOfMonth, format, startOfDay, startOfMonth } from "date-fns";
import { ChevronRight, Gift } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Birthday {
  id: string;
  name: string;
  birth_date: string;
  customer_name: string;
  phone: string;
}

interface GrowthBirthdaysCardProps {
  className?: string;
}

const getBirthdayThisYear = (birthDate: string, year: number) => {
  const parsedDate = new Date(`${birthDate}T12:00:00`);
  return new Date(year, parsedDate.getMonth(), parsedDate.getDate(), 12);
};

const sortBirthdays = (birthdays: Birthday[], today: Date) =>
  [...birthdays].sort((firstBirthday, secondBirthday) => {
    const firstDate = getBirthdayThisYear(firstBirthday.birth_date, today.getFullYear());
    const secondDate = getBirthdayThisYear(secondBirthday.birth_date, today.getFullYear());

    return firstDate.getTime() - secondDate.getTime();
  });

export const GrowthBirthdaysCard = ({ className }: GrowthBirthdaysCardProps) => {
  const [monthBirthdays, setMonthBirthdays] = useState<Birthday[]>([]);
  const [weekBirthdays, setWeekBirthdays] = useState<Birthday[]>([]);
  const [birthdayMessage] = useState(
    "Olá, {nome_responsavel}! 💕\nHoje é um dia especial: o aniversário da {nome_crianca} 🎂\nQue seja um ano cheio de alegria, descobertas e muitos momentos felizes.\nCom carinho,\nMimagi Kids"
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        setLoading(true);

        const { data: children } = await (supabase
          .from("children" as any)
          .select("id, name, birth_date, growth_customers(name, phone)") as any);

        if (!children) {
          setMonthBirthdays([]);
          setWeekBirthdays([]);
          return;
        }

        const today = startOfDay(new Date());
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);
        const weekEnd = endOfDay(addDays(today, 7));

        const currentMonthBirthdays: Birthday[] = [];
        const currentWeekBirthdays: Birthday[] = [];

        children.forEach((child: any) => {
          if (!child.birth_date) {
            return;
          }

          const birthdayThisYear = getBirthdayThisYear(child.birth_date, today.getFullYear());
          const birthday = {
            id: child.id,
            name: child.name,
            birth_date: child.birth_date,
            customer_name: child.growth_customers?.name || "",
            phone: child.growth_customers?.phone || "",
          };

          if (birthdayThisYear >= monthStart && birthdayThisYear <= monthEnd) {
            currentMonthBirthdays.push(birthday);
          }

          if (birthdayThisYear >= today && birthdayThisYear <= weekEnd) {
            currentWeekBirthdays.push(birthday);
          }
        });

        setMonthBirthdays(sortBirthdays(currentMonthBirthdays, today));
        setWeekBirthdays(sortBirthdays(currentWeekBirthdays, today));
      } catch (error) {
        console.error("Error fetching birthdays:", error);
        setMonthBirthdays([]);
        setWeekBirthdays([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBirthdays();
  }, []);

  const handleSendBirthday = (child: Birthday) => {
    const cleanPhone = child.phone?.replace(/\D/g, "");

    if (!cleanPhone) {
      alert("Telefone do responsável não cadastrado!");
      return;
    }

    const phoneWithCountry = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    const message = birthdayMessage
      .replace("{nome_responsavel}", child.customer_name)
      .replace("{nome_crianca}", child.name);

    window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const nextBirthday = weekBirthdays[0] || monthBirthdays[0] || null;
  const monthBirthdaysLabel = `${monthBirthdays.length} aniversariante${monthBirthdays.length === 1 ? "" : "s"} neste mês`;
  const upcomingBirthdaysLabel = `${weekBirthdays.length} nos próximos 7 dias`;

  const renderBirthdayList = (birthdays: Birthday[], emptyMessage: string) => {
    if (loading) {
      return <p className="text-sm text-muted-foreground">Carregando aniversários...</p>;
    }

    if (birthdays.length === 0) {
      return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
    }

    return (
      <div className="space-y-3">
        {birthdays.map((birthday) => (
          <div key={birthday.id} className="rounded-xl border bg-background p-4">
            <div className="space-y-1">
              <p className="font-medium text-foreground">{birthday.name}</p>
              <p className="text-sm text-muted-foreground">{birthday.customer_name || "Responsável não informado"}</p>
              <p className="text-sm text-muted-foreground">
                Aniversário em {format(new Date(`${birthday.birth_date}T12:00:00`), "dd/MM")}
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="mt-4 rounded-xl"
              onClick={() => handleSendBirthday(birthday)}
            >
              🎂 Enviar Feliz Aniversário
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog>
      <div className={cn("flex", className)}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="group flex w-full items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3 text-left shadow-none transition-colors hover:border-pink-200 hover:bg-pink-50/20"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-pink-100 bg-pink-50">
                <Gift className="h-5 w-5 text-pink-500" />
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">Aniversariantes</p>
                  {!loading && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      {upcomingBirthdaysLabel}
                    </span>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  {loading ? "Carregando aniversários..." : monthBirthdaysLabel}
                </p>

                <p className="truncate text-xs text-muted-foreground/80">
                  {loading
                    ? "Toque para abrir os detalhes."
                    : nextBirthday
                      ? `Próximo: ${nextBirthday.name} • ${format(new Date(`${nextBirthday.birth_date}T12:00:00`), "dd/MM")}`
                      : "Nenhum aniversário próximo. Toque para ver a lista completa."}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1 text-muted-foreground transition-colors group-hover:text-foreground">
              <span className="hidden text-xs sm:inline">Abrir</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </button>
        </DialogTrigger>
      </div>

      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <div className="border-b bg-muted/20 px-6 py-5">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Gift className="h-5 w-5 text-pink-500" />
              Aniversariantes
            </DialogTitle>
            <DialogDescription>
              Veja quem faz aniversário em breve e envie a mensagem direto pelo WhatsApp.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground">Próximos 7 dias</h4>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                {weekBirthdays.length}
              </span>
            </div>

            {renderBirthdayList(weekBirthdays, "Nenhum aniversário nos próximos dias")}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground">Este mês</h4>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                {monthBirthdays.length}
              </span>
            </div>

            {renderBirthdayList(monthBirthdays, "Nenhum aniversário neste mês")}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
