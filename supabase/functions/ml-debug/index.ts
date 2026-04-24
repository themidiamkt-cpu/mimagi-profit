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

        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabase.auth.getUser(token)
        if (userError || !user) throw new Error('Invalid user token')

        const { data: tokenData } = await supabase
            .from('ml_tokens').select('*').eq('user_id', user.id).maybeSingle()
        if (!tokenData) throw new Error('Token não encontrado — autorize o ML primeiro.')

        const { data: config } = await supabase
            .from('ml_config').select('seller_id, app_id').eq('user_id', user.id).maybeSingle()
        if (!config?.seller_id) throw new Error('seller_id não encontrado — sync pelo menos uma vez.')

        const accessToken = tokenData.access_token
        const sellerId = config.seller_id
        const today = new Date().toISOString().split('T')[0]
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        const results: Record<string, any> = {
            seller_id: sellerId,
            token_expires_at: tokenData.expires_at,
            token_expirado: new Date(tokenData.expires_at) <= new Date(),
            periodo: { de: thirtyDaysAgo, ate: today },
        }

        // 1. Identidade
        const meRes = await fetch('https://api.mercadolibre.com/users/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        results.usuario = { status: meRes.status, data: await meRes.json() }

        // 2. IDs dos anúncios
        const itemsRes = await fetch(`https://api.mercadolibre.com/users/${sellerId}/items/search`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        const itemsJson = await itemsRes.json()
        const itemIds: string[] = (itemsJson.results || []).slice(0, 10)
        results.anuncios = {
            status: itemsRes.status,
            total: itemsJson.paging?.total ?? 0,
            primeiros_ids: itemIds,
        }

        if (itemIds.length > 0) {
            // 3. Visitas — endpoint correto
            const visitsRes = await fetch(
                `https://api.mercadolibre.com/items/visits?ids=${itemIds.join(',')}&date_from=${thirtyDaysAgo}&date_to=${today}`,
                { headers: { 'Authorization': `Bearer ${accessToken}` } }
            )
            results.visitas = {
                status: visitsRes.status,
                url: `https://api.mercadolibre.com/items/visits?ids=${itemIds.slice(0,3).join(',')}...&date_from=${thirtyDaysAgo}&date_to=${today}`,
                data: visitsRes.ok ? await visitsRes.json() : await visitsRes.text(),
            }

            // 4. Product Ads — passo 1: buscar advertiser_id
            const advRes = await fetch(
                `https://api.mercadolibre.com/marketplace/advertising/MLB/advertisers?seller_id=${sellerId}`,
                { headers: { 'Authorization': `Bearer ${accessToken}` } }
            )
            const advJson = advRes.ok ? await advRes.json() : await advRes.text()
            results.product_ads_advertisers = {
                status: advRes.status,
                url: `https://api.mercadolibre.com/marketplace/advertising/MLB/advertisers?seller_id=${sellerId}`,
                data: advJson,
            }

            // 4b. Se achou advertiser_id, buscar métricas
            if (advRes.ok && typeof advJson === 'object') {
                const advertisers = advJson.results || advJson.advertisers || (Array.isArray(advJson) ? advJson : [])
                const advertiserId = advertisers[0]?.advertiser_id || advertisers[0]?.id

                results.advertiser_id_encontrado = advertiserId || null

                if (advertiserId) {
                    const metricsRes = await fetch(
                        `https://api.mercadolibre.com/marketplace/advertising/MLB/advertisers/${advertiserId}/product_ads/ads?date_from=${sevenDaysAgo}&date_to=${today}&metrics=clicks,prints,cost,direct_amount,acos,ctr&limit=5`,
                        { headers: { 'Authorization': `Bearer ${accessToken}` } }
                    )
                    results.product_ads_metrics = {
                        status: metricsRes.status,
                        url: `.../${advertiserId}/product_ads/ads?date_from=${sevenDaysAgo}&date_to=${today}&metrics=clicks,prints,cost,direct_amount,acos,ctr`,
                        data: metricsRes.ok ? await metricsRes.json() : await metricsRes.text(),
                    }
                }
            }

            // 5. Pedidos (amostra)
            const ordersRes = await fetch(
                `https://api.mercadolibre.com/orders/search?seller=${sellerId}&order.status=paid&order.date_created.from=${thirtyDaysAgo}T00:00:00.000-00:00&sort=date_desc`,
                { headers: { 'Authorization': `Bearer ${accessToken}` } }
            )
            const ordersJson = await ordersRes.json()
            results.pedidos = {
                status: ordersRes.status,
                total_na_api: ordersJson.paging?.total ?? 0,
                retornados: (ordersJson.results || []).length,
                primeiros_3: (ordersJson.results || []).slice(0, 3).map((o: any) => ({
                    id: o.id,
                    status: o.status,
                    total_amount: o.total_amount,
                    date_created: o.date_created,
                    buyer: o.buyer?.nickname
                })),
                erro: ordersJson.error || null,
            }
        }

        return new Response(JSON.stringify(results, null, 2), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    }
})
