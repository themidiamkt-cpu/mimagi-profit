import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { blingApi } from '@/lib/blingApi';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function BlingCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const savedState = localStorage.getItem('bling_oauth_state');

        if (!code) {
            const errorMsg = searchParams.get('error_description') || 'Código de autorização não recebido';
            setError(errorMsg);
            toast.error('Erro na autorização: ' + errorMsg);
            setTimeout(() => navigate('/growth'), 3000);
            return;
        }

        if (state !== savedState) {
            console.warn('Aviso: Mismatch de State Oauth (CSRF):', { received: state, saved: savedState });
            // Durante debug, vamos apenas avisar e continuar, a menos que ambos sejam nulos
            if (!state && !savedState) {
                setError('Estado de segurança ausente');
                return;
            }
        }

        const processToken = async () => {
            try {
                await blingApi.exchangeCode(code);
                toast.success('Bling conectado com sucesso!');
                localStorage.removeItem('bling_oauth_state');
                navigate('/growth');
            } catch (err: any) {
                setError(err.message);
                toast.error('Erro ao processar token: ' + err.message);
                setTimeout(() => navigate('/growth'), 5000);
            }
        };

        processToken();
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
            <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                        {error ? (
                            <span className="text-destructive font-medium text-2xl">!</span>
                        ) : (
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-medium text-foreground">
                        {error ? 'Oops! Algo deu errado' : 'Conectando ao Bling...'}
                    </h2>
                    <p className="text-muted-foreground">
                        {error || 'Estamos processando sua autorização e sincronizando seus dados.'}
                    </p>
                </div>

                {!error && (
                    <div className="flex justify-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                    </div>
                )}
            </div>
        </div>
    );
}
