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

        // Get user from request
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
        if (userError || !user) throw new Error('Invalid user token')

        const url = new URL(req.url)
        const path = url.pathname.split('/').pop()

        if (req.method === 'POST' && path === 'config') {
            const body = await req.json()
            const { partner_id, partner_key, shop_id, redirect_uri, environment } = body

            const { error } = await supabaseClient
                .from('shopee_config')
                .upsert({
                    user_id: user.id,
                    partner_id,
                    partner_key,
                    shop_id,
                    redirect_uri,
                    environment
                }, { onConflict: 'user_id' })

            if (error) throw error

            return new Response(JSON.stringify({ message: 'Configuração salva com sucesso' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        if (req.method === 'GET' && path === 'config') {
            const { data, error } = await supabaseClient
                .from('shopee_config')
                .select('partner_id, shop_id, redirect_uri, environment')
                .eq('user_id', user.id)
                .maybeSingle()

            if (error) throw error

            return new Response(JSON.stringify(data || {}), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        if (req.method === 'GET' && path === 'auth-url') {
            const { data: config, error: configError } = await supabaseClient
                .from('shopee_config')
                .select('partner_id, redirect_uri, environment')
                .eq('user_id', user.id)
                .maybeSingle()

            if (configError || !config) throw new Error('Configuração não encontrada')

            const baseUrl = config.environment === 'production'
                ? 'https://partner.shopeemobile.com'
                : 'https://partner.test-stable.shopeemobile.com'

            const authUrl = `${baseUrl}/api/v2/shop/auth_partner?partner_id=${config.partner_id}&redirect=${encodeURIComponent(config.redirect_uri)}`

            return new Response(JSON.stringify({ url: authUrl }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        if (req.method === 'GET' && path === 'status') {
            const { data: config } = await supabaseClient
                .from('shopee_config')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle()

            const { data: token } = await supabaseClient
                .from('shopee_tokens')
                .select('expires_at')
                .eq('user_id', user.id)
                .maybeSingle()

            let status = 'not_configured'
            if (config) {
                status = 'configured'
                if (token) {
                    const isExpired = new Date(token.expires_at) < new Date()
                    status = isExpired ? 'expired' : 'connected'
                }
            }

            return new Response(JSON.stringify({ status }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        throw new Error('Not Found')

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
