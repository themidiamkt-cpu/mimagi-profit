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

type AdAccount = {
  id: string;
  account_id?: string;
  name: string;
  currency?: string;
  account_status?: number;
  business_name?: string;
};

const MetaAdsSettings = () => {
  const { toast } = useToast();
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [status, setStatus] = useState<
    "not_configured" | "token_saved" | "connected"
  >("not_configured");
  const [metaUser, setMetaUser] = useState<{ id: string; name: string } | null>(
    null,
  );

  useEffect(() => {
    void loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke("meta-ads", {
        method: "GET",
        body: {},
        headers: { "x-path": "status" },
      });
      if (error) throw error;
      if (data?.has_token) {
        setStatus(data.connected ? "connected" : "token_saved");
        setSelectedAccount(data.account_id ?? "");
        if (data.meta_user) setMetaUser(data.meta_user);
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
        description: "Cole o Access Token do Meta antes de salvar.",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsSaving(true);
      const { data, error } = await supabase.functions.invoke("meta-ads", {
        method: "POST",
        body: { access_token: accessToken.trim() },
        headers: { "x-path": "save-token" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMetaUser(data?.meta_user ?? null);
      setStatus("token_saved");
      setAccessToken("");
      toast({
        title: "Token validado",
        description: `Conectado como ${data?.meta_user?.name ?? "usuário Meta"}.`,
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
      const { data, error } = await supabase.functions.invoke("meta-ads", {
        method: "GET",
        body: {},
        headers: { "x-path": "accounts" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAccounts(data?.accounts ?? []);
    } catch (error: any) {
      toast({
        title: "Erro ao listar contas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAccount = async () => {
    if (!selectedAccount) return;
    const account = accounts.find(
      (a) => a.id === selectedAccount || a.account_id === selectedAccount,
    );
    try {
      setIsSaving(true);
      const { error } = await supabase.functions.invoke("meta-ads", {
        method: "POST",
        body: {
          account_id: selectedAccount,
          account_name: account?.name ?? null,
        },
        headers: { "x-path": "select-account" },
      });
      if (error) throw error;
      setStatus("connected");
      toast({
        title: "Conta conectada",
        description: account?.name ?? selectedAccount,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao selecionar conta",
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
        <h1 className="text-2xl font-bold">Meta Ads — Configurações</h1>
        <p className="text-muted-foreground">
          Conecte sua conta de anúncios do Facebook/Instagram via Access Token.
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
              ? `Conectado${metaUser ? ` como ${metaUser.name}` : ""} — conta selecionada.`
              : status === "token_saved"
                ? "Token salvo. Selecione a conta de anúncios abaixo."
                : "Ainda não configurado."}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>1. Access Token</CardTitle>
          <CardDescription>
            Gere um token de usuário do sistema com permissões{" "}
            <code>ads_read</code> e <code>business_management</code> no{" "}
            <a
              href="https://business.facebook.com/settings/system-users"
              target="_blank"
              rel="noreferrer"
              className="underline inline-flex items-center gap-1"
            >
              Business Manager <ExternalLink className="w-3 h-3" />
            </a>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="meta-token">Access Token</Label>
            <div className="relative">
              <Input
                id="meta-token"
                type={showToken ? "text" : "password"}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="EAAG..."
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
          <Button onClick={handleSaveToken} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Validar e salvar token
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Conta de anúncios</CardTitle>
          <CardDescription>
            Escolha qual ad account será usada para puxar as métricas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={loadAccounts}
              disabled={isLoading || status === "not_configured"}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Listar contas
            </Button>
          </div>
          {accounts.length > 0 && (
            <div className="space-y-2">
              <Label>Ad Account</Label>
              <Select
                value={selectedAccount}
                onValueChange={setSelectedAccount}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} — {a.id}
                      {a.currency ? ` (${a.currency})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSelectAccount} disabled={isSaving}>
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

export default MetaAdsSettings;
