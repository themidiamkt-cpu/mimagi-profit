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

        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
        if (userError || !user) throw new Error('Invalid user token')

        const url = new URL(req.url)
        const path = url.pathname.split('/').pop()

        if (req.method === 'POST' && path === 'config') {
            const body = await req.json()
            const { app_id, secret_key, redirect_uri } = body

            const { error } = await supabaseClient
                .from('ml_config')
                .upsert({
                    user_id: user.id,
                    app_id,
                    secret_key,
                    redirect_uri
                }, { onConflict: 'user_id' })

            if (error) throw error

            return new Response(JSON.stringify({ message: 'Configuração salva' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        if (req.method === 'GET' && path === 'config') {
            const { data, error } = await supabaseClient
                .from('ml_config')
                .select('app_id, redirect_uri')
                .eq('user_id', user.id)
                .maybeSingle()

            if (error) throw error

            return new Response(JSON.stringify(data || {}), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        if (req.method === 'GET' && path === 'auth-url') {
            const { data: config } = await supabaseClient
                .from('ml_config')
                .select('app_id, redirect_uri')
                .eq('user_id', user.id)
                .maybeSingle()

            if (!config) throw new Error('Configuração não encontrada')

            const state = Math.random().toString(36).substring(7)
            const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${config.app_id}&redirect_uri=${encodeURIComponent(config.redirect_uri)}&state=${state}`

            return new Response(JSON.stringify({ url: authUrl }), {
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
