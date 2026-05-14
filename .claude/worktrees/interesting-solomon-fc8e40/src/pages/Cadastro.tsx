import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShoppingBag } from 'lucide-react';

export default function Cadastro() {
  const [formData, setFormData] = useState({
    nome: '',
    whatsapp: '',
    email: '',
    password: '',
    confirmPassword: '',
    nome_loja: '',
    instagram_loja: '',
    faturamento_atual: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signUp } = useAuthContext();
  const navigate = useNavigate();

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }
    if (!formData.whatsapp.trim()) {
      newErrors.whatsapp = 'WhatsApp é obrigatório';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Senhas não conferem';
    }
    if (!formData.nome_loja.trim()) {
      newErrors.nome_loja = 'Nome da loja é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsLoading(true);
    const result = await signUp({
      nome: formData.nome.trim(),
      whatsapp: formData.whatsapp.trim(),
      email: formData.email.trim(),
      password: formData.password,
      nome_loja: formData.nome_loja.trim(),
      instagram_loja: formData.instagram_loja.trim(),
      faturamento_atual: parseFloat(formData.faturamento_atual) || 0,
    });
    setIsLoading(false);

    if (result.success) {
      navigate('/aguardando-aprovacao', { replace: true });
    }
  };

  const formatCurrency = (value: string) => {
    const num = value.replace(/\D/g, '');
    const formatted = (parseInt(num || '0') / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatted;
  };

  const handleFaturamentoChange = (value: string) => {
    const rawValue = value.replace(/\D/g, '');
    const numValue = parseInt(rawValue || '0') / 100;
    setFormData(prev => ({ ...prev, faturamento_atual: numValue.toString() }));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 text-accent" />
            </div>
          </div>
          <CardTitle className="text-2xl font-medium">Criar sua conta</CardTitle>
          <CardDescription>Preencha os dados para começar seu planejamento financeiro</CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Dados Pessoais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  placeholder="Seu nome"
                  value={formData.nome}
                  onChange={(e) => handleChange('nome', e.target.value)}
                  disabled={isLoading}
                  className={errors.nome ? 'border-destructive' : ''}
                />
                {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp *</Label>
                <Input
                  id="whatsapp"
                  placeholder="(00) 00000-0000"
                  value={formData.whatsapp}
                  onChange={(e) => handleChange('whatsapp', e.target.value)}
                  disabled={isLoading}
                  className={errors.whatsapp ? 'border-destructive' : ''}
                />
                {errors.whatsapp && <p className="text-xs text-destructive">{errors.whatsapp}</p>}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                disabled={isLoading}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            {/* Senha */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  disabled={isLoading}
                  className={errors.password ? 'border-destructive' : ''}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  disabled={isLoading}
                  className={errors.confirmPassword ? 'border-destructive' : ''}
                />
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
              </div>
            </div>

            {/* Dados da Loja */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Dados da Loja</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome_loja">Nome da Loja *</Label>
                  <Input
                    id="nome_loja"
                    placeholder="Nome da sua loja"
                    value={formData.nome_loja}
                    onChange={(e) => handleChange('nome_loja', e.target.value)}
                    disabled={isLoading}
                    className={errors.nome_loja ? 'border-destructive' : ''}
                  />
                  {errors.nome_loja && <p className="text-xs text-destructive">{errors.nome_loja}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="instagram_loja">Instagram da Loja</Label>
                  <Input
                    id="instagram_loja"
                    placeholder="@sualoja"
                    value={formData.instagram_loja}
                    onChange={(e) => handleChange('instagram_loja', e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label htmlFor="faturamento_atual">Faturamento Mensal Atual</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                  <Input
                    id="faturamento_atual"
                    placeholder="0,00"
                    value={formData.faturamento_atual ? formatCurrency((parseFloat(formData.faturamento_atual) * 100).toString()) : ''}
                    onChange={(e) => handleFaturamentoChange(e.target.value)}
                    disabled={isLoading}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Opcional - ajuda no planejamento inicial</p>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Criar Conta'
              )}
            </Button>
            
            <p className="text-sm text-muted-foreground text-center">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-accent hover:underline font-medium">
                Faça login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
