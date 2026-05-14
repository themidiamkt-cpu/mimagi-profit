import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function generateSign(partnerKey: string, path: string, timestamp: number, partnerId: number, shopId?: number) {
    let baseString = `${partnerId}${path}${timestamp}`
    if (shopId) {
        baseString += shopId
    }

    const encoder = new TextEncoder()
    const keyData = encoder.encode(partnerKey)
    const messageData = encoder.encode(baseString)

    const key = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    )

    const signature = await crypto.subtle.sign("HMAC", key, messageData)
    return Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
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

        const body = await req.json()
        const { code, refresh_token } = body

        // Get config
        const { data: config, error: configError } = await supabaseClient
            .from('shopee_config')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle()

        if (configError || !config) throw new Error('Shopee config not found')

        const timestamp = Math.floor(Date.now() / 1000)
        const path = code ? '/api/v2/auth/token/get' : '/api/v2/auth/access_token/get'
        const sign = await generateSign(config.partner_key, path, timestamp, config.partner_id)

        const baseUrl = config.environment === 'production'
            ? 'https://partner.shopeemobile.com'
            : 'https://partner.test-stable.shopeemobile.com'

        const url = new URL(`${baseUrl}${path}`)
        url.searchParams.append('partner_id', config.partner_id.toString())
        url.searchParams.append('timestamp', timestamp.toString())
        url.searchParams.append('sign', sign)

        const payload: any = {
            partner_id: config.partner_id,
        }

        if (code) {
            payload.code = code
            payload.shop_id = config.shop_id
        } else if (refresh_token) {
            payload.refresh_token = refresh_token
            payload.shop_id = config.shop_id
        }

        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })

        const data = await response.json()

        if (!response.ok || data.error) {
            throw new Error(data.message || data.error || 'Failed to fetch token')
        }

        // Save tokens
        const expiresAt = new Date()
        expiresAt.setSeconds(expiresAt.getSeconds() + data.expire_in)

        const { error: dbError } = await supabaseClient
            .from('shopee_tokens')
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
