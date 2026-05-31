import { useEffect, useMemo, useState } from "react";
import { MessageCircle, QrCode, RefreshCw, Copy, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CONNECT_WEBHOOK_URL = "https://automacao2.themidiamarketing.com.br/webhook/conectar-cliente";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);

const getQrCodeSrc = (payload: any): string | null => {
  const value =
    payload?.qrcode?.base64 ||
    payload?.qrcode?.code ||
    payload?.base64 ||
    payload?.qr ||
    payload?.qrCode ||
    payload?.data?.qrcode?.base64 ||
    null;

  if (!value || typeof value !== "string") return null;
  if (value.startsWith("data:image")) return value;
  return `data:image/png;base64,${value.replace(/^data:image\/png;base64,/, "")}`;
};

export default function WhatsAppConnection() {
  const { user, profile } = useAuthContext();
  const storageKey = user ? `whatsapp-evolution-instance:${user.id}` : "whatsapp-evolution-instance";
  const defaultInstanceName = useMemo(() => {
    const base = slugify(profile?.nome_loja || profile?.nome || user?.email || "planejamento-loja");
    const suffix = user?.id ? user.id.slice(0, 8) : "local";
    return `planejamento-loja-${base || "loja"}-${suffix}`;
  }, [profile?.nome_loja, profile?.nome, user?.email, user?.id]);

  const [instanceName, setInstanceName] = useState(defaultInstanceName);
  const [qrCodeSrc, setQrCodeSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    setInstanceName(saved || defaultInstanceName);
  }, [defaultInstanceName, storageKey]);

  const handleConnect = async () => {
    if (!user) {
      toast.error("Faça login para conectar o WhatsApp.");
      return;
    }

    const cleanInstance = instanceName.trim() || defaultInstanceName;
    setLoading(true);
    setQrCodeSrc(null);
    setLastResponse(null);

    try {
      const response = await fetch(CONNECT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceName: cleanInstance,
          restaurante_id: user.id,
          restauranteId: user.id,
          loja_id: user.id,
          user_id: user.id,
          nome_loja: profile?.nome_loja || profile?.nome || null,
          source: "planejamento-loja",
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error("Erro ao conectar com o serviço de automação.");

      const contentType = response.headers.get("content-type") || "";
      let payload: any;

      if (contentType.includes("application/json")) {
        payload = await response.json();
      } else {
        const blob = await response.blob();
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(String(reader.result));
          reader.readAsDataURL(blob);
        });
        payload = { qrcode: { base64: base64Data } };
      }

      const qr = getQrCodeSrc(payload);
      setLastResponse(payload);
      setQrCodeSrc(qr);
      localStorage.setItem(storageKey, cleanInstance);
      setInstanceName(cleanInstance);

      if (qr) {
        toast.success("QR Code gerado. Escaneie com o WhatsApp.");
      } else {
        toast.success("Solicitação enviada para conexão do WhatsApp.");
      }
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível conectar o WhatsApp.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInstance = async () => {
    await navigator.clipboard.writeText(instanceName);
    toast.success("Nome da instância copiado.");
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-medium tracking-tight">WhatsApp</h1>
        <p className="text-muted-foreground">Conecte o número da loja via Evolution API.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Conexão WhatsApp
            </CardTitle>
            <CardDescription>A instância fica vinculada à sua loja.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
              <span className="text-sm font-medium">Status</span>
              <Badge variant={qrCodeSrc ? "default" : "secondary"} className="gap-1">
                {qrCodeSrc ? <QrCode className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                {qrCodeSrc ? "QR gerado" : "Aguardando conexão"}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instanceName">Nome da instância</Label>
              <div className="flex gap-2">
                <Input
                  id="instanceName"
                  value={instanceName}
                  onChange={(event) => setInstanceName(slugify(event.target.value))}
                  className="font-mono text-xs"
                />
                <Button variant="outline" size="icon" onClick={handleCopyInstance} title="Copiar instância">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use uma instância por loja. Se já tiver conectado antes, mantenha o mesmo nome.
              </p>
            </div>

            <Button onClick={handleConnect} disabled={loading} className="w-full gap-2">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              {loading ? "Gerando QR Code..." : "Criar / Gerar QR Code"}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              QR Code para conexão
            </CardTitle>
            <CardDescription>Abra o WhatsApp no celular e escaneie o código.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="min-h-[360px] flex items-center justify-center rounded-xl border bg-white p-6">
              {qrCodeSrc ? (
                <div className="text-center space-y-4">
                  <img src={qrCodeSrc} alt="QR Code WhatsApp" className="mx-auto h-72 w-72 object-contain rounded-lg border p-2" />
                  <div className="flex items-center justify-center gap-2 text-sm text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Escaneie para conectar o número da loja.
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-3 text-muted-foreground">
                  <QrCode className="mx-auto h-14 w-14 opacity-30" />
                  <p>Clique em Criar / Gerar QR Code para iniciar a conexão.</p>
                </div>
              )}
            </div>

            {lastResponse && !qrCodeSrc && (
              <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                {JSON.stringify(lastResponse, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
