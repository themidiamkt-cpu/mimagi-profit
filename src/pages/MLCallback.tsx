import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function MLCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (errorParam || errorDescription) {
            const msg = errorDescription || errorParam || 'Autorização negada';
            setError(msg);
            toast.error('Erro na autorização: ' + msg);
            setTimeout(() => navigate('/mercadolivre/configuracoes'), 3000);
            return;
        }

        if (!code) {
            const msg = 'Código de autorização não recebido';
            setError(msg);
            toast.error(msg);
            setTimeout(() => navigate('/mercadolivre/configuracoes'), 3000);
            return;
        }

        const processToken = async () => {
            try {
                const { data, error: fnError } = await supabase.functions.invoke('ml-token', {
                    body: { code },
                });

                if (fnError) throw fnError;
                if (data?.error) throw new Error(data.error);

                toast.success('Mercado Livre conectado com sucesso!');
                navigate('/mercadolivre');
            } catch (err: any) {
                console.error('ML Auth Error (Full):', err);

                let errorMsg = err.message || 'Erro ao processar token';

                // Try to extract JSON error from Edge Function response
                if (err.context?.json) {
                    const json = err.context.json;
                    errorMsg = json.message || json.error || errorMsg;
                    if (json.details && json.details !== 'No additional details') {
                        errorMsg += ` (${json.details})`;
                    }
                }

                setError(errorMsg);
                toast.error('Erro ao conectar: ' + errorMsg);
                setTimeout(() => navigate('/mercadolivre/configuracoes'), 8000);
            }
        };

        processToken();
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
            <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                        {error ? (
                            <span className="text-destructive font-bold text-2xl">!</span>
                        ) : (
                            <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-medium text-foreground">
                        {error ? 'Oops! Algo deu errado' : 'Conectando ao Mercado Livre...'}
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
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"></div>
                    </div>
                )}
            </div>
        </div>
    );
}
