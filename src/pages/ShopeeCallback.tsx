import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function ShopeeCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');

        if (errorParam) {
            const msg = errorParam || 'Autorização negada';
            setError(msg);
            toast.error('Erro na autorização: ' + msg);
            setTimeout(() => navigate('/shopee/configuracoes'), 3000);
            return;
        }

        if (!code) {
            const msg = 'Código de autorização não recebido';
            setError(msg);
            toast.error(msg);
            setTimeout(() => navigate('/shopee/configuracoes'), 3000);
            return;
        }

        const processToken = async () => {
            try {
                const { data, error: fnError } = await supabase.functions.invoke('shopee-token', {
                    body: { code },
                });

                if (fnError) throw fnError;
                if (data?.error) throw new Error(data.message || data.error);

                toast.success('Shopee conectada com sucesso!');
                navigate('/shopee');
            } catch (err: any) {
                const msg = err.message || 'Erro ao processar token';
                setError(msg);
                toast.error('Erro ao conectar: ' + msg);
                setTimeout(() => navigate('/shopee/configuracoes'), 5000);
            }
        };

        processToken();
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
            <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                        {error ? (
                            <span className="text-destructive font-bold text-2xl">!</span>
                        ) : (
                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-medium text-foreground">
                        {error ? 'Oops! Algo deu errado' : 'Conectando à Shopee...'}
                    </h2>
                    <p className="text-muted-foreground">
                        {error || 'Estamos processando sua autorização. Aguarde um momento.'}
                    </p>
                    {error && (
                        <p className="text-sm text-muted-foreground">
                            Redirecionando para configurações...
                        </p>
                    )}
                </div>

                {!error && (
                    <div className="flex justify-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                    </div>
                )}
            </div>
        </div>
    );
}
