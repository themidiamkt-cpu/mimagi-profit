import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export type AdInsightRow = {
  date: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
};

interface AdsDashboardShellProps {
  title: string;
  description: string;
  functionName: "meta-ads" | "tiktok-ads";
  settingsPath: string;
}

const toISODate = (d: Date) => d.toISOString().slice(0, 10);

export const AdsDashboardShell = ({
  title,
  description,
  functionName,
  settingsPath,
}: AdsDashboardShellProps) => {
  const { toast } = useToast();
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 6);

  const [since, setSince] = useState(toISODate(sevenDaysAgo));
  const [until, setUntil] = useState(toISODate(today));
  const [rows, setRows] = useState<AdInsightRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [accountLabel, setAccountLabel] = useState<string>("");

  useEffect(() => {
    void checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        method: "GET",
        body: {},
        headers: { "x-path": "status" },
      });
      if (error) throw error;
      setConnected(!!data?.connected);
      setAccountLabel(
        data?.account_name ??
          data?.advertiser_name ??
          data?.account_id ??
          data?.advertiser_id ??
          "",
      );
    } catch (error: any) {
      console.error(error);
      setConnected(false);
    }
  };

  const loadInsights = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke(functionName, {
        method: "POST",
        body: { since, until, level: "account" },
        headers: { "x-path": "insights" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setRows(data?.insights ?? []);
    } catch (error: any) {
      toast({
        title: "Erro ao buscar insights",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totals = useMemo(() => {
    const t = rows.reduce(
      (acc, r) => {
        acc.spend += r.spend || 0;
        acc.impressions += r.impressions || 0;
        acc.clicks += r.clicks || 0;
        return acc;
      },
      { spend: 0, impressions: 0, clicks: 0 },
    );
    const ctr = t.impressions ? (t.clicks / t.impressions) * 100 : 0;
    const cpc = t.clicks ? t.spend / t.clicks : 0;
    return { ...t, ctr, cpc };
  }, [rows]);

  const chartData = rows
    .filter((r) => r.date)
    .sort((a, b) => (a.date! < b.date! ? -1 : 1));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Button variant="outline" asChild>
          <Link to={settingsPath}>Configurações</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {connected ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-500" />
            )}
            {connected ? `Conectado: ${accountLabel}` : "Não conectado"}
          </CardTitle>
          <CardDescription>
            {connected
              ? "Defina o período e carregue os dados da plataforma."
              : `Acesse ${settingsPath} para configurar o token e selecionar a conta.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label htmlFor="since">De</Label>
              <Input
                id="since"
                type="date"
                value={since}
                onChange={(e) => setSince(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="until">Até</Label>
              <Input
                id="until"
                type="date"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
              />
            </div>
            <Button
              onClick={loadInsights}
              disabled={!connected || isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Carregar dados
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Gasto" value={formatBRL(totals.spend)} />
        <KPICard label="Impressões" value={totals.impressions.toLocaleString("pt-BR")} />
        <KPICard label="Cliques" value={totals.clicks.toLocaleString("pt-BR")} />
        <KPICard label="CTR / CPC" value={`${totals.ctr.toFixed(2)}% · ${formatBRL(totals.cpc)}`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evolução diária</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              {isLoading ? "Carregando..." : "Sem dados para o período."}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="spend"
                  stroke="#2563eb"
                  name="Gasto"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="clicks"
                  stroke="#16a34a"
                  name="Cliques"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const KPICard = ({ label, value }: { label: string; value: string }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
