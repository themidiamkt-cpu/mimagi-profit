import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Eye, EyeOff, ExternalLink, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const ShopeeSettings = () => {
    const { toast } = useToast();
    const [showPartnerKey, setShowPartnerKey] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<"not_configured" | "saved" | "connected">("not_configured");

    const [formData, setFormData] = useState({
        partnerId: "",
        partnerKey: "",
        shopId: "",
        redirectUri: "https://seusite.com/shopee/callback",
        environment: "sandbox",
    });

    const handleSave = async () => {
        setIsLoading(true);
        // Mock save logic
        setTimeout(() => {
            setIsLoading(false);
            setStatus("saved");
            toast({
                title: "Configurações salvas",
                description: "Suas credenciais foram armazenadas com sucesso.",
            });
        }, 1000);
    };

    const handleAuthorize = () => {
        const authUrl = `https://partner.shopeemobile.com/api/v2/shop/auth_partner?partner_id=${formData.partnerId}&redirect=${formData.redirectUri}`;
        window.open(authUrl, "_blank");
    };

    const handleTestConnection = () => {
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            toast({
                title: "Conexão testada",
                description: "A conexão com a API da Shopee foi estabelecida com sucesso.",
            });
        }, 1000);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Configurações Shopee</h1>
                <div className="flex items-center gap-2">
                    {status === "not_configured" && (
                        <span className="flex items-center gap-1 text-sm font-medium text-red-500">
                            <AlertCircle className="h-4 w-4" /> Não configurado
                        </span>
                    )}
                    {status === "saved" && (
                        <span className="flex items-center gap-1 text-sm font-medium text-yellow-500">
                            <AlertCircle className="h-4 w-4" /> Credenciais salvas, aguardando autorização
                        </span>
                    )}
                    {status === "connected" && (
                        <span className="flex items-center gap-1 text-sm font-medium text-green-500">
                            <CheckCircle2 className="h-4 w-4" /> Conectado — Loja: Mimagi Kids
                        </span>
                    )}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Passo a Passo para Integração</CardTitle>
                            <CardDescription>Siga as instruções abaixo para obter suas credenciais</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="step-1">
                                    <AccordionTrigger>Passo 1 — Criar conta de parceiro</AccordionTrigger>
                                    <AccordionContent className="space-y-2">
                                        <p>Acesse <a href="https://open.shopee.com" target="_blank" rel="noreferrer" className="text-orange-600 underline inline-flex items-center gap-1">open.shopee.com <ExternalLink className="h-3 w-3" /></a> e faça login com sua conta Shopee.</p>
                                        <p>Clique em <strong>"Become a Partner"</strong> e preencha os dados da empresa.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="step-2">
                                    <AccordionTrigger>Passo 2 — Criar um aplicativo</AccordionTrigger>
                                    <AccordionContent className="space-y-2">
                                        <p>No painel do Open Platform, vá em <strong>"My Apps"</strong> → <strong>"Create App"</strong>.</p>
                                        <p>Preencha nome, descrição e selecione <strong>"Open API"</strong>. Em "Redirect URL" coloque a URL do seu sistema.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="step-3">
                                    <AccordionTrigger>Passo 3 — Obter as credenciais</AccordionTrigger>
                                    <AccordionContent className="space-y-2">
                                        <p>Após criar o app, copie o <strong>Partner ID</strong> e o <strong>Partner Key</strong> que aparecerão na tela do app.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="step-4">
                                    <AccordionTrigger>Passo 4 — Autorizar a loja</AccordionTrigger>
                                    <AccordionContent className="space-y-2">
                                        <p>Clique no botão <strong>"Autorizar com Shopee"</strong> ao lado. Você será redirecionado para o login da Shopee para autorizar o acesso à sua loja.</p>
                                        <p>Ao concluir, o sistema salvará automaticamente os tokens de acesso.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="step-5">
                                    <AccordionTrigger>Passo 5 — Pronto!</AccordionTrigger>
                                    <AccordionContent>
                                        <p>Após autorizar, o dashboard será preenchido com os dados reais da sua loja.</p>
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
                            <CardDescription>Insira os dados obtidos no portal do desenvolvedor Shopee</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="partnerId">Partner ID</Label>
                                <Input
                                    id="partnerId"
                                    type="number"
                                    placeholder="Ex: 123456"
                                    value={formData.partnerId}
                                    onChange={(e) => setFormData({ ...formData, partnerId: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="partnerKey">Partner Key</Label>
                                <div className="relative">
                                    <Input
                                        id="partnerKey"
                                        type={showPartnerKey ? "text" : "password"}
                                        placeholder="Cole sua Partner Key aqui"
                                        value={formData.partnerKey}
                                        onChange={(e) => setFormData({ ...formData, partnerKey: e.target.value })}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                                        onClick={() => setShowPartnerKey(!showPartnerKey)}
                                    >
                                        {showPartnerKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="shopId">Shop ID</Label>
                                <Input
                                    id="shopId"
                                    type="number"
                                    placeholder="Ex: 789012"
                                    value={formData.shopId}
                                    onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="redirectUri">Redirect URI</Label>
                                <Input
                                    id="redirectUri"
                                    placeholder="https://seusite.com/shopee/callback"
                                    value={formData.redirectUri}
                                    onChange={(e) => setFormData({ ...formData, redirectUri: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="environment">Ambiente</Label>
                                <Select
                                    value={formData.environment}
                                    onValueChange={(value) => setFormData({ ...formData, environment: value })}
                                >
                                    <SelectTrigger id="environment">
                                        <SelectValue placeholder="Selecione o ambiente" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="production">Produção</SelectItem>
                                        <SelectItem value="sandbox">Sandbox</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-3 pt-4">
                                <Button onClick={handleSave} disabled={isLoading} className="w-full">
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Salvar credenciais
                                </Button>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button variant="outline" onClick={handleAuthorize} className="border-orange-600 text-orange-600 hover:bg-orange-50">
                                        Autorizar com Shopee
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

export default ShopeeSettings;
