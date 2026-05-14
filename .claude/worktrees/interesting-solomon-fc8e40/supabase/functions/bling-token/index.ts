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
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Pegar o usuário da requisição
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
        if (userError || !user) throw new Error('Invalid user token')

        const body = await req.json()
        const { code, refresh_token } = body

        // Buscar configurações do usuário no banco
        const { data: config, error: configError } = await supabaseClient
            .from('bling_config')
            .select('client_id, client_secret')
            .eq('user_id', user.id)
            .maybeSingle()

        const clientId = config?.client_id || Deno.env.get('BLING_CLIENT_ID')
        const clientSecret = config?.client_secret || Deno.env.get('BLING_CLIENT_SECRET')

        if (!clientId || !clientSecret) {
            throw new Error('Bling Client ID ou Client Secret não configurados. Configure na aba "Configuração" do dashboard.')
        }

        const auth = btoa(`${clientId}:${clientSecret}`)
        let params: Record<string, string> = {}

        if (code) {
            params = {
                grant_type: 'authorization_code',
                code,
            }
        } else if (refresh_token) {
            params = {
                grant_type: 'refresh_token',
                refresh_token,
            }
        } else {
            throw new Error('Either code or refresh_token is required')
        }

        const response = await fetch('https://www.bling.com.br/Api/v3/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${auth}`,
            },
            body: new URLSearchParams(params).toString(),
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('Bling token error:', data)
            throw new Error(data.error_description || data.error || 'Failed to fetch token')
        }

        // Salvar no banco
        const expiresAt = new Date()
        expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in)

        const { error: dbError } = await supabaseClient
            .from('bling_tokens')
            .upsert({
                user_id: user.id,
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_at: expiresAt.toISOString(),
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })

        if (dbError) throw dbError

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
