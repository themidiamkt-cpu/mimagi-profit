import { useState, useEffect } from 'react';
import { blingApi } from '@/lib/blingApi';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useBling() {
    const [isConnected, setIsConnected] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [pedidos, setPedidos] = useState<any[]>([]);
    const [contatos, setContatos] = useState<any[]>([]);

    const checkConnection = async () => {
        try {
            const { data, error } = await (supabase as any)
                .from('bling_tokens')
                .select('id')
                .single();

            setIsConnected(!!data && !error);
        } catch (err) {
            setIsConnected(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkConnection();
    }, []);

    const connect = () => {
        blingApi.connect();
    };

    const disconnect = async () => {
        try {
            const { error } = await (supabase as any)
                .from('bling_tokens')
                .delete()
                .match({ user_id: (await supabase.auth.getUser()).data.user?.id });

            if (error) throw error;
            setIsConnected(false);
            setPedidos([]);
            setContatos([]);
            toast.success('Bling desconectado com sucesso');
        } catch (err: any) {
            toast.error('Erro ao desconectar: ' + err.message);
        }
    };

    const fetchDashboardData = async () => {
        if (!isConnected) return;

        setLoading(true);
        try {
            const [pedidosRes, contatosRes] = await Promise.all([
                blingApi.getPedidos(1, 10),
                blingApi.getContatos(1, 10)
            ]);

            setPedidos(pedidosRes.data || []);
            setContatos(contatosRes.data || []);
        } catch (err: any) {
            console.error('Erro ao buscar dados do Bling:', err);
            toast.error('Erro ao sincronizar dados: ' + err.message);
            if (err.message.includes('não conectado') || err.message.includes('expirada')) {
                setIsConnected(false);
            }
        } finally {
            setLoading(false);
        }
    };

    return {
        isConnected,
        loading,
        pedidos,
        contatos,
        connect,
        disconnect,
        fetchDashboardData,
        refreshConnection: checkConnection
    };
}
