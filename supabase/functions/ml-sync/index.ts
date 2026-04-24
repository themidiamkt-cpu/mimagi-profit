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

        // ── 1. Buscar token ────────────────────────────────────────────
        const { data: tokenData, error: tokenError } = await supabase
            .from('ml_tokens')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (tokenError || !tokenData) throw new Error('Conta do Mercado Livre não conectada')

        let accessToken = tokenData.access_token
        const expiresAt = new Date(tokenData.expires_at)

        // Refresh token se expirado
        if (expiresAt <= new Date()) {
            console.log('[ml-sync] Renovando token...')
            const { data: cfg } = await supabase
                .from('ml_config')
                .select('app_id, secret_key')
                .eq('user_id', user.id)
                .single()

            if (!cfg) throw new Error('Configuração do ML não encontrada para renovar token')

            const refreshRes = await fetch('https://api.mercadolibre.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    client_id: cfg.app_id.toString(),
                    client_secret: cfg.secret_key,
                    refresh_token: tokenData.refresh_token
                }).toString(),
            })

            const refreshData = await refreshRes.json()
            if (!refreshRes.ok) throw new Error(`Falha ao renovar token: ${refreshData.message || refreshData.error}`)

            accessToken = refreshData.access_token
            const newExp = new Date()
            newExp.setSeconds(newExp.getSeconds() + refreshData.expires_in)

            await supabase.from('ml_tokens').update({
                access_token: refreshData.access_token,
                refresh_token: refreshData.refresh_token,
                expires_at: newExp.toISOString(),
                updated_at: new Date().toISOString(),
            }).eq('user_id', user.id)
        }

        const { data: config } = await supabase
            .from('ml_config')
            .select('seller_id')
            .eq('user_id', user.id)
            .single()

        if (!config?.seller_id) throw new Error('seller_id não encontrado — reconecte a conta do ML')

        const sellerId = config.seller_id
        const today = new Date().toISOString().split('T')[0]
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        // ── 2. Pedidos (últimos 30 dias, pagos) ───────────────────────
        console.log('[ml-sync] Buscando pedidos...')
        const ordersRes = await fetch(
            `https://api.mercadolibre.com/orders/search?seller=${sellerId}&order.status=paid&order.date_created.from=${thirtyDaysAgo}T00:00:00.000-00:00&sort=date_desc`,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
        )
        const ordersJson = await ordersRes.json()
        const rawOrders = ordersJson.results || []
        console.log(`[ml-sync] ${rawOrders.length} pedidos encontrados (total: ${ordersJson.paging?.total ?? '?'})`)

        const mappedOrders = rawOrders.map((o: any) => ({
            user_id: user.id,
            ml_order_id: o.id.toString(),
            status: o.status,
            total_amount: o.total_amount,
            currency: o.currency_id,
            order_date: o.date_created,
            buyer_nickname: o.buyer?.nickname || 'N/A',
            updated_at: new Date().toISOString()
        }))

        if (mappedOrders.length > 0) {
            const { error: ordErr } = await supabase
                .from('ml_orders')
                .upsert(mappedOrders, { onConflict: 'user_id,ml_order_id' })
            if (ordErr) console.error('[ml-sync] Erro ao salvar pedidos:', ordErr)
        }

        // ── 3. Anúncios ───────────────────────────────────────────────
        console.log('[ml-sync] Buscando anúncios...')
        const itemsRes = await fetch(
            `https://api.mercadolibre.com/users/${sellerId}/items/search`,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
        )
        const itemsJson = await itemsRes.json()
        const itemIds: string[] = itemsJson.results || []
        console.log(`[ml-sync] ${itemIds.length} anúncios encontrados`)

        let mappedAds: any[] = []

        if (itemIds.length > 0) {
            // Detalhes dos anúncios (máx 20 por chamada — API ML limit)
            const chunks = []
            for (let i = 0; i < itemIds.length; i += 20) {
                chunks.push(itemIds.slice(i, i + 20))
            }

            for (const chunk of chunks) {
                const detailRes = await fetch(
                    `https://api.mercadolibre.com/items?ids=${chunk.join(',')}`,
                    { headers: { 'Authorization': `Bearer ${accessToken}` } }
                )
                const details = await detailRes.json()

                const chunkAds = details
                    .map((res: any) => {
                        const item = res.body
                        if (!item) return null
                        return {
                            user_id: user.id,
                            ml_item_id: item.id,
                            title: item.title,
                            sku: item.seller_custom_field || item.id,
                            stock_quantity: item.available_quantity || 0,
                            price: item.price,
                            status: item.status,
                            visits: 0,
                            impressions: 0,
                            clicks: 0,
                            cost: 0,
                            ad_sales: 0,
                            acos: 0,
                            ctr: 0,
                            updated_at: new Date().toISOString()
                        }
                    })
                    .filter(Boolean)

                mappedAds = [...mappedAds, ...chunkAds]
            }

            // ── 4. Visitas ─────────────────────────────────────────────
            // Endpoint correto: /items/visits?ids=MLB1,MLB2&date_from=...&date_to=...
            console.log('[ml-sync] Buscando visitas...')
            try {
                const visitsRes = await fetch(
                    `https://api.mercadolibre.com/items/visits?ids=${itemIds.slice(0, 50).join(',')}&date_from=${thirtyDaysAgo}&date_to=${today}`,
                    { headers: { 'Authorization': `Bearer ${accessToken}` } }
                )
                console.log(`[ml-sync] Visitas status: ${visitsRes.status}`)

                if (visitsRes.ok) {
                    const visitsData = await visitsRes.json()
                    console.log('[ml-sync] Visitas sample:', JSON.stringify(visitsData).slice(0, 300))

                    // Resposta pode ser array [{item_id, total_visits}] ou objeto {"MLB123": N}
                    if (Array.isArray(visitsData)) {
                        visitsData.forEach((v: any) => {
                            const itemId = v.item_id || v.id
                            const ad = mappedAds.find((a: any) => a.ml_item_id === itemId)
                            if (ad) ad.visits = Number(v.total_visits || v.visits || 0)
                        })
                    } else if (typeof visitsData === 'object') {
                        Object.entries(visitsData).forEach(([itemId, val]: [string, any]) => {
                            const ad = mappedAds.find((a: any) => a.ml_item_id === itemId)
                            if (ad) ad.visits = Number(val?.total_visits ?? val ?? 0)
                        })
                    }
                } else {
                    const errText = await visitsRes.text()
                    console.warn('[ml-sync] Visitas erro:', visitsRes.status, errText.slice(0, 200))
                }
            } catch (vErr) {
                console.error('[ml-sync] Erro ao buscar visitas:', vErr)
            }

            // ── 5. Product Ads (métricas de publicidade) ───────────────
            // Fluxo: seller_id → advertiser_id → métricas de ads
            console.log('[ml-sync] Buscando métricas de Product Ads...')
            try {
                // 5a. Obter advertiser_id do vendedor
                const advRes = await fetch(
                    `https://api.mercadolibre.com/marketplace/advertising/MLB/advertisers?seller_id=${sellerId}`,
                    { headers: { 'Authorization': `Bearer ${accessToken}` } }
                )
                console.log(`[ml-sync] Advertisers status: ${advRes.status}`)

                if (advRes.ok) {
                    const advData = await advRes.json()
                    console.log('[ml-sync] Advertisers data:', JSON.stringify(advData).slice(0, 300))

                    const advertisers = advData.results || advData.advertisers || (Array.isArray(advData) ? advData : [])
                    const advertiserId = advertisers[0]?.advertiser_id || advertisers[0]?.id

                    if (advertiserId) {
                        console.log(`[ml-sync] advertiser_id: ${advertiserId}`)

                        // 5b. Buscar ads com métricas por período
                        const adsMetricsRes = await fetch(
                            `https://api.mercadolibre.com/marketplace/advertising/MLB/advertisers/${advertiserId}/product_ads/ads?date_from=${sevenDaysAgo}&date_to=${today}&metrics=clicks,prints,cost,direct_amount,acos,ctr&limit=50`,
                            { headers: { 'Authorization': `Bearer ${accessToken}` } }
                        )
                        console.log(`[ml-sync] Ads metrics status: ${adsMetricsRes.status}`)

                        if (adsMetricsRes.ok) {
                            const adsMetricsData = await adsMetricsRes.json()
                            console.log('[ml-sync] Ads metrics sample:', JSON.stringify(adsMetricsData).slice(0, 500))

                            const adsArray = adsMetricsData.results || adsMetricsData.ads || (Array.isArray(adsMetricsData) ? adsMetricsData : [])

                            adsArray.forEach((adMetric: any) => {
                                // O item_id pode estar em diferentes campos
                                const itemId = adMetric.item_id || adMetric.product_id || adMetric.ad_id
                                const ad = mappedAds.find((a: any) => a.ml_item_id === itemId)
                                if (ad) {
                                    const m = adMetric.metrics || adMetric
                                    ad.impressions = Number(m.prints || m.impressions || 0)
                                    ad.clicks = Number(m.clicks || 0)
                                    ad.cost = Number(m.cost || 0)
                                    ad.ad_sales = Number(m.direct_amount || m.total_amount || m.ad_sales || 0)
                                    ad.acos = Number(m.acos || 0)
                                    ad.ctr = Number(m.ctr || 0)
                                }
                            })
                        } else {
                            const errBody = await adsMetricsRes.text()
                            console.warn('[ml-sync] Ads metrics erro:', adsMetricsRes.status, errBody.slice(0, 300))
                        }
                    } else {
                        console.warn('[ml-sync] Nenhum advertiser_id encontrado. O seller pode não ter Product Ads ativos.')
                    }
                } else {
                    const errBody = await advRes.text()
                    console.warn('[ml-sync] Advertisers erro:', advRes.status, errBody.slice(0, 300))
                }
            } catch (adsErr) {
                console.error('[ml-sync] Erro ao buscar Product Ads:', adsErr)
            }

            // ── 6. Salvar anúncios ─────────────────────────────────────
            if (mappedAds.length > 0) {
                const { error: adErr } = await supabase
                    .from('ml_ads')
                    .upsert(mappedAds, { onConflict: 'user_id,ml_item_id' })
                if (adErr) console.error('[ml-sync] Erro ao salvar anúncios:', adErr)
            }
        }

        // ── 7. Atualizar metadados de sync ────────────────────────────
        await supabase.from('ml_sync_meta').upsert({
            user_id: user.id,
            status: 'done',
            last_sync: new Date().toISOString(),
            total_orders: mappedOrders.length,
            total_ads: itemIds.length,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

        console.log('[ml-sync] Concluído ✓')
        return new Response(JSON.stringify({
            success: true,
            orders: mappedOrders.length,
            ads: itemIds.length,
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error('[ml-sync] Erro fatal:', error.message)
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    }
})
