import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Advertiser = {
  advertiser_id?: string | number;
  advertiser_name?: string;
};

const TikTokAdsSettings = () => {
  const { toast } = useToast();
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [selectedAdvertiser, setSelectedAdvertiser] = useState<string>("");
  const [status, setStatus] = useState<
    "not_configured" | "token_saved" | "connected"
  >("not_configured");

  useEffect(() => {
    void loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke("tiktok-ads", {
        method: "GET",
        body: {},
        headers: { "x-path": "status" },
      });
      if (error) throw error;
      if (data?.has_token) {
        setStatus(data.connected ? "connected" : "token_saved");
        if (data.advertiser_id) setSelectedAdvertiser(String(data.advertiser_id));
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToken = async () => {
    if (!accessToken.trim()) {
      toast({
        title: "Token obrigatório",
        description: "Cole o Access Token do TikTok antes de salvar.",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsSaving(true);
      const { data, error } = await supabase.functions.invoke("tiktok-ads", {
        method: "POST",
        body: {
          access_token: accessToken.trim(),
          app_id: appId.trim() || null,
          app_secret: appSecret.trim() || null,
        },
        headers: { "x-path": "save-token" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setStatus("token_saved");
      setAccessToken("");
      setAppSecret("");
      toast({
        title: "Token salvo",
        description: "Agora liste e selecione o advertiser.",
      });
      void loadAccounts();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar token",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke("tiktok-ads", {
        method: "GET",
        body: {},
        headers: { "x-path": "accounts" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAdvertisers(data?.accounts ?? []);
      if (data?.note) {
        toast({
          title: "Atenção",
          description: data.note,
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao listar advertisers",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAdvertiser = async () => {
    if (!selectedAdvertiser) return;
    const adv = advertisers.find(
      (a) => String(a.advertiser_id) === selectedAdvertiser,
    );
    try {
      setIsSaving(true);
      const { error } = await supabase.functions.invoke("tiktok-ads", {
        method: "POST",
        body: {
          advertiser_id: selectedAdvertiser,
          advertiser_name: adv?.advertiser_name ?? null,
        },
        headers: { "x-path": "select-account" },
      });
      if (error) throw error;
      setStatus("connected");
      toast({
        title: "Advertiser conectado",
        description: adv?.advertiser_name ?? selectedAdvertiser,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao selecionar advertiser",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">TikTok Ads — Configurações</h1>
        <p className="text-muted-foreground">
          Conecte sua conta do TikTok Business via Access Token (long-lived).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === "connected" ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-500" />
            )}
            Status
          </CardTitle>
          <CardDescription>
            {status === "connected"
              ? "Conectado — advertiser selecionado."
              : status === "token_saved"
                ? "Token salvo. Liste e selecione o advertiser."
                : "Ainda não configurado."}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>1. Credenciais</CardTitle>
          <CardDescription>
            Gere o Access Token no{" "}
            <a
              href="https://business.tiktok.com/"
              target="_blank"
              rel="noreferrer"
              className="underline inline-flex items-center gap-1"
            >
              TikTok Business Center <ExternalLink className="w-3 h-3" />
            </a>{" "}
            (Developer &gt; Apps). App ID/Secret só são necessários para listar
            múltiplos advertisers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="ttk-token">Access Token</Label>
            <div className="relative">
              <Input
                id="ttk-token"
                type={showToken ? "text" : "password"}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="token de acesso long-lived"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowToken((v) => !v)}
              >
                {showToken ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ttk-app-id">App ID (opcional)</Label>
              <Input
                id="ttk-app-id"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ttk-app-secret">App Secret (opcional)</Label>
              <div className="relative">
                <Input
                  id="ttk-app-secret"
                  type={showSecret ? "text" : "password"}
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowSecret((v) => !v)}
                >
                  {showSecret ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <Button onClick={handleSaveToken} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar credenciais
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Advertiser</CardTitle>
          <CardDescription>
            Escolha qual conta de anúncios será usada para consultar as
            métricas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            onClick={loadAccounts}
            disabled={isLoading || status === "not_configured"}
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Listar advertisers
          </Button>
          {advertisers.length > 0 && (
            <div className="space-y-2">
              <Label>Advertiser</Label>
              <Select
                value={selectedAdvertiser}
                onValueChange={setSelectedAdvertiser}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o advertiser" />
                </SelectTrigger>
                <SelectContent>
                  {advertisers.map((a) => (
                    <SelectItem
                      key={String(a.advertiser_id)}
                      value={String(a.advertiser_id)}
                    >
                      {a.advertiser_name ?? "Sem nome"} — {a.advertiser_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSelectAdvertiser} disabled={isSaving}>
                {isSaving && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Salvar seleção
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TikTokAdsSettings;
