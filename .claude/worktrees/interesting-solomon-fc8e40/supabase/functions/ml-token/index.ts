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

        if (!code && !refresh_token) {
            throw new Error('Faltou o parâmetro "code" (ou "refresh_token") no corpo da requisição.')
        }

        // 1. Get Config (explicitly naming columns to avoid failure if some are missing)
        const { data: config, error: configError } = await supabaseClient
            .from('ml_config')
            .select('app_id, secret_key, redirect_uri, code_verifier')
            .eq('user_id', user.id)
            .maybeSingle()

        if (configError) {
            console.error('Config fetch error:', configError);
            throw new Error(`Database error: ${configError.message}`);
        }
        if (!config) throw new Error('ML config not found');

        // 2. Prepare Payload
        const payload: any = {
            client_id: config.app_id,
            client_secret: config.secret_key,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: config.redirect_uri,
        }

        // PKCE Implementation (optional if column exists)
        if (config.code_verifier) {
            payload.code_verifier = config.code_verifier
        }

        console.log('Exchanging token for user:', user.id);
        const apiUrl = 'https://api.mercadolibre.com/oauth/token';

        // 3. Exchange Token
        let response;
        try {
            console.log(`Fetching from ${apiUrl}...`);
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(payload).toString(),
            })
        } catch (fetchErr: any) {
            console.error('Fetch error details:', fetchErr);
            throw new Error(`Cuidado: O servidor do Mercado Livre não pôde ser alcançado (${fetchErr.message}). Tente novamente em alguns segundos.`);
        }

        const data = await response.json()

        if (!response.ok) {
            console.error('ML API Error response:', data);
            const code = (data.error || '').toString();
            const msg = (data.message || data.error_description || data.error || '').toString();
            // Traduz erros frequentes para algo acionável
            if (code === 'invalid_grant') {
                throw new Error(`Mercado Livre rejeitou o código de autorização. Causas comuns: o código já foi usado, expirou, o redirect_uri salvo não bate com o cadastrado no app do ML, ou o code_verifier (PKCE) ficou desalinhado. Solução: na tela de Configurações, clique em "Resetar conexão" e autorize novamente. Detalhe ML: ${msg}`);
            }
            if (code === 'invalid_client') {
                throw new Error(`App ID ou Secret Key incorretos. Confira em developers.mercadolivre.com.br e salve novamente. Detalhe ML: ${msg}`);
            }
            if (code === 'forbidden' || code === 'unauthorized_client') {
                throw new Error(`A conta autorizada não pode ler estes dados (provavelmente é colaborador, não dono). Use a conta principal do vendedor. Detalhe ML: ${msg}`);
            }
            throw new Error(`Erro do Mercado Livre [${code || response.status}]: ${msg}`)
        }

        const sellerId = data.user_id;
        let accountName = 'Mercado Livre Account';

        // Fetch User Info to get Nickname
        try {
            const userRes = await fetch(`https://api.mercadolibre.com/users/${sellerId}`, {
                headers: { 'Authorization': `Bearer ${data.access_token}` }
            });
            if (userRes.ok) {
                const userData = await userRes.json();
                accountName = userData.nickname || accountName;
            }
        } catch (e) {
            console.error('Error fetching user info:', e);
        }

        const expiresAt = new Date()
        expiresAt.setSeconds(expiresAt.getSeconds() + (data.expires_in || 21600));

        // 4. Save tokens
        const { error: dbError } = await supabaseClient
            .from('ml_tokens')
            .upsert({
                user_id: user.id,
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_at: expiresAt.toISOString(),
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })

        if (dbError) {
            console.error('Token save error:', dbError);
            throw new Error(`Database error saving tokens: ${dbError.message}`);
        }

        // 5. Update Config with Seller Info and clear code_verifier
        await supabaseClient
            .from('ml_config')
            .update({
                seller_id: sellerId,
                account_name: accountName,
                code_verifier: null
            })
            .eq('user_id', user.id)

        return new Response(JSON.stringify({ success: true, ...data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error('ML Token Edge Function Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.name || 'Error',
            message: error.message,
            details: error.details || error.hint || 'No additional details',
            context: 'ml-token'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    }
})
