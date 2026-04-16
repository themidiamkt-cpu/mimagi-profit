import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Link2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const GrowthSettings = () => {
  const [blingApiKey, setBlingApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleSaveApiKey = async () => {
    if (!blingApiKey.trim()) {
      toast.error("Informe a chave da API do Bling");
      return;
    }

    setIsSaving(true);
    // TODO: Implement Bling API key storage and validation
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Chave da API salva com sucesso!");
      setIsConnected(true);
    }, 1500);
  };

  const handleSyncOrders = async () => {
    if (!isConnected) {
      toast.error("Configure a integração com o Bling primeiro");
      return;
    }

    toast.info("Sincronização em desenvolvimento...");
    // TODO: Implement Bling sync
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Integração Bling
              </CardTitle>
              <CardDescription>
                Configure a integração com o Bling para importar pedidos automaticamente
              </CardDescription>
            </div>
            <Badge variant={isConnected ? "default" : "secondary"} className="flex items-center gap-1">
              {isConnected ? (
                <>
                  <CheckCircle className="h-3 w-3" />
                  Conectado
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3" />
                  Desconectado
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="bling_api_key">Chave da API</Label>
            <Input
              id="bling_api_key"
              type="password"
              placeholder="Cole sua chave da API do Bling aqui"
              value={blingApiKey}
              onChange={(e) => setBlingApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Obtenha sua chave em: Bling &gt; Configurações &gt; API
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleSaveApiKey} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar Chave"}
            </Button>
            <Button variant="outline" onClick={handleSyncOrders} disabled={!isConnected}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sincronizar Pedidos
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">1. Configure a API:</strong> Cole sua chave da API do Bling acima.
          </p>
          <p>
            <strong className="text-foreground">2. Sincronização automática:</strong> Os pedidos serão importados automaticamente.
          </p>
          <p>
            <strong className="text-foreground">3. Relacionamento:</strong> O sistema relaciona clientes por CPF, email ou telefone.
          </p>
          <p>
            <strong className="text-foreground">4. Métricas:</strong> Todas as métricas (LTV, RFM, etc.) são atualizadas automaticamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
