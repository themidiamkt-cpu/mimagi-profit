import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Verify it's a scheduled job or service role call
        const authHeader = req.headers.get('Authorization')
        if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
            // Check if it's a valid user token if not service role (manual trigger from admin maybe)
            const token = authHeader?.replace('Bearer ', '')
            if (token) {
                const { data: { user }, error: userError } = await supabase.auth.getUser(token)
                if (userError || !user) throw new Error('Unauthorized')
            } else {
                throw new Error('Unauthorized')
            }
        }

        console.log('[ml-auto-sync] Iniciando processamento de todos os sellers...')

        // 1. Buscar todos os sellers ativos
        const { data: tokens, error: tokensError } = await supabase
            .from('ml_tokens')
            .select('user_id')

        if (tokensError) throw tokensError
        if (!tokens || tokens.length === 0) {
            return new Response(JSON.stringify({ message: 'Nenhum seller para sincronizar' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        console.log(`[ml-auto-sync] Encontrados ${tokens.length} sellers.`)

        const results = []
        for (const token of tokens) {
            try {
                console.log(`[ml-auto-sync] Sincronizando user: ${token.user_id}`)

                // Chamamos a função de sync individual
                // Passamos o service role key para autorização
                const syncRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ml-sync`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ user_id: token.user_id, days: 7 }) // Sync curto para ser rápido no auto-sync
                })

                const syncData = await syncRes.json()
                results.push({ user_id: token.user_id, success: syncRes.ok && syncData.success, orders: syncData.orders })
            } catch (err: any) {
                console.error(`[ml-auto-sync] Erro ao sincronizar user ${token.user_id}:`, err.message)
                results.push({ user_id: token.user_id, success: false, error: err.message })
            }
        }

        return new Response(JSON.stringify({
            success: true,
            total: tokens.length,
            results
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error('[ml-auto-sync] Erro fatal:', error.message)
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
