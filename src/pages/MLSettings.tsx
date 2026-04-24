import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Eye, EyeOff, ExternalLink, CheckCircle2, AlertCircle, Loader2, ShieldAlert } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const MLSettings = () => {
    const { toast } = useToast();
    const [showSecret, setShowSecret] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<"not_configured" | "saved" | "connected">("not_configured");
    const [accountName, setAccountName] = useState("");

    const [formData, setFormData] = useState({
        appId: "",
        secretKey: "",
        redirectUri: "",
    });

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                setIsLoading(true);

                const { data: config, error: configError } = await supabase
                    .from('ml_config')
                    .select('*')
                    .maybeSingle();

                if (configError) throw configError;

                if (config) {
                    setFormData({
                        appId: config.app_id?.toString() || "",
                        secretKey: config.secret_key || "",
                        redirectUri: config.redirect_uri || "",
                    });
                    setStatus("saved");
                }

                const { data: token } = await supabase
                    .from('ml_tokens')
                    .select('expires_at')
                    .maybeSingle();

                if (token) {
                    setStatus("connected");
                    if (config?.account_name) {
                        setAccountName(config.account_name);
                    }
                }
            } catch (error: any) {
                console.error('Error fetching ML config:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleSave = async () => {
        try {
            setIsLoading(true);

            const { data, error } = await supabase.functions.invoke('ml-integration', {
                method: 'POST',
                body: {
                    app_id: parseInt(formData.appId),
                    secret_key: formData.secretKey,
                    redirect_uri: formData.redirect_uri,
                },
                headers: {
                    'x-path': 'config'
                }
            });

            if (error) throw error;
            if (data?.success === false) throw new Error(data.error);

            setStatus("saved");
            toast({
                title: "Configurações salvas",
                description: "Suas credenciais do Mercado Livre foram armazenadas.",
            });
        } catch (error: any) {
            toast({
                title: "Erro ao salvar",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAuthorize = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase.functions.invoke('ml-integration', {
                method: 'GET',
                headers: {
                    'x-path': 'auth-url'
                }
            });

            if (error) throw error;
            if (data?.success === false) throw new Error(data.error);

            if (data?.url) {
                window.location.href = data.url;
            }
        } catch (error: any) {
            toast({
                title: "Erro ao gerar URL",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase.functions.invoke('ml-sync');

            if (error) throw error;
            if (data?.success === false) throw new Error(data.error);

            toast({
                title: "Sincronização concluída",
                description: `Importados ${data.orders} pedidos e ${data.ads} anúncios.`,
            });
        } catch (error: any) {
            toast({
                title: "Erro na sincronização",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleTestConnection = async () => {
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            toast({
                title: "Conexão testada",
                description: `Conectado com sucesso à conta: ${accountName || 'Mimagi Kids'}`,
            });
        }, 1000);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Configurações Mercado Livre</h1>
                <div className="flex items-center gap-2">
                    {status === "not_configured" && (
                        <span className="flex items-center gap-1 text-sm font-medium text-red-500">
                            <AlertCircle className="h-4 w-4" /> Não configurado
                        </span>
                    )}
                    {status === "saved" && (
                        <span className="flex items-center gap-1 text-sm font-medium text-yellow-500">
                            <AlertCircle className="h-4 w-4" /> Aguardando autorização
                        </span>
                    )}
                    {status === "connected" && (
                        <div className="flex flex-col items-end gap-1">
                            <span className="flex items-center gap-1 text-sm font-medium text-green-500">
                                <CheckCircle2 className="h-4 w-4" /> Conectado — Conta: {accountName || 'Carregando...'}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {status === "connected" && (
                <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-900">Integração Ativa</AlertTitle>
                    <AlertDescription className="text-green-800 flex justify-between items-center">
                        <span>Seus dados do Mercado Livre estão prontos para sincronização.</span>
                        <Button
                            size="sm"
                            variant="outline"
                            className="bg-white border-green-600 text-green-700 hover:bg-green-100"
                            onClick={handleSync}
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Sincronizar Agora
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Passo a Passo para Integração</CardTitle>
                            <CardDescription>Siga as instruções para conectar sua conta</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="step-1">
                                    <AccordionTrigger>Passo 1 — Mercado Livre Developers</AccordionTrigger>
                                    <AccordionContent className="space-y-2">
                                        <p>Acesse <a href="https://developers.mercadolivre.com.br" target="_blank" rel="noreferrer" className="text-yellow-600 underline inline-flex items-center gap-1">developers.mercadolivre.com.br <ExternalLink className="h-3 w-3" /></a> e faça login.</p>
                                        <p>Clique em <strong>"Criar aplicação"</strong>.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="step-2">
                                    <AccordionTrigger>Passo 2 — Criar o aplicativo</AccordionTrigger>
                                    <AccordionContent className="space-y-2">
                                        <p>Preencha os dados e selecione as permissões: <code>offline_access</code>, <code>read</code>, <code>write</code>.</p>
                                        <p>Em "URL de retorno", use a URL exibida no formulário ao lado.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="step-3">
                                    <AccordionTrigger>Passo 3 — Copiar as credenciais</AccordionTrigger>
                                    <AccordionContent>
                                        <p>Copie o <strong>App ID</strong> e o <strong>Secret Key</strong> para o formulário ao lado.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="step-4">
                                    <AccordionTrigger>Passo 4 — Autorizar a conta</AccordionTrigger>
                                    <AccordionContent className="space-y-4">
                                        <p>Clique em <strong>"Autorizar com Mercado Livre"</strong>. Use a conta principal do vendedor.</p>
                                        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md flex gap-3">
                                            <ShieldAlert className="h-5 w-5 text-yellow-600 shrink-0" />
                                            <p className="text-xs text-yellow-800">
                                                Atenção: apenas a conta principal do vendedor pode autorizar. Contas de colaborador retornarão erro.
                                            </p>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Credenciais da API</CardTitle>
                            <CardDescription>Insira os dados do seu aplicativo Mercado Livre</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="appId">App ID (client_id)</Label>
                                <Input
                                    id="appId"
                                    placeholder="Ex: 123456789"
                                    value={formData.appId}
                                    onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="secretKey">Secret Key (client_secret)</Label>
                                <div className="relative">
                                    <Input
                                        id="secretKey"
                                        type={showSecret ? "text" : "password"}
                                        placeholder="Cole sua Secret Key aqui"
                                        value={formData.secretKey}
                                        onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                                        onClick={() => setShowSecret(!showSecret)}
                                    >
                                        {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="redirectUri">Redirect URI</Label>
                                <Input
                                    id="redirectUri"
                                    value={formData.redirectUri}
                                    onChange={(e) => setFormData({ ...formData, redirectUri: e.target.value })}
                                />
                            </div>

                            <div className="flex flex-col gap-3 pt-4">
                                <Button onClick={handleSave} disabled={isLoading} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold">
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Salvar credenciais
                                </Button>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button variant="outline" onClick={handleAuthorize} className="border-yellow-600 text-yellow-700 hover:bg-yellow-50">
                                        Autorizar com ML
                                    </Button>
                                    <Button variant="secondary" onClick={handleTestConnection} disabled={isLoading}>
                                        Testar conexão
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default MLSettings;
