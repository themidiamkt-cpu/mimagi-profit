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

        const body = await req.json()
        const { code, refresh_token } = body

        const { data: config } = await supabaseClient
            .from('ml_config')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle()

        if (!config) throw new Error('ML config not found')

        const payload: any = {
            client_id: config.app_id,
            client_secret: config.secret_key,
        }

        if (code) {
            payload.grant_type = 'authorization_code'
            payload.code = code
            payload.redirect_uri = config.redirect_uri

            // PKCE Implementation
            if (config.code_verifier) {
                payload.code_verifier = config.code_verifier
            }
        } else if (refresh_token) {
            payload.grant_type = 'refresh_token'
            payload.refresh_token = refresh_token
        }

        const response = await fetch('https://api.mercadolivre.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(payload).toString(),
        })

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.message || data.error_description || data.error || 'Failed to fetch token')
        }

        const expiresAt = new Date()
        expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in)

        // Save tokens
        const { error: dbError } = await supabaseClient
            .from('ml_tokens')
            .upsert({
                user_id: user.id,
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_at: expiresAt.toISOString(),
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })

        if (dbError) throw dbError

        // Clear code_verifier after successful use
        if (code) {
            await supabaseClient
                .from('ml_config')
                .update({ code_verifier: null })
                .eq('user_id', user.id)
        }

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
