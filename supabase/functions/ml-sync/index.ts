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

        // ── 2. Pedidos (últimos 30 dias, pagos) — com PAGINAÇÃO ───────
        console.log('[ml-sync] Buscando pedidos (paginado)...')
        const rawOrders: any[] = []
        const ORDER_PAGE_SIZE = 50
        let ordersOffset = 0
        let ordersTotal = 0
        // ML retorna até 50 por página; iteramos até consumir paging.total
        while (true) {
            const ordersUrl =
                `https://api.mercadolibre.com/orders/search?seller=${sellerId}` +
                `&order.status=paid` +
                `&order.date_created.from=${thirtyDaysAgo}T00:00:00.000-00:00` +
                `&sort=date_desc&offset=${ordersOffset}&limit=${ORDER_PAGE_SIZE}`
            const ordersRes = await fetch(ordersUrl, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })
            if (!ordersRes.ok) {
                const errText = await ordersRes.text()
                console.warn('[ml-sync] orders/search erro:', ordersRes.status, errText.slice(0, 300))
                break
            }
            const ordersJson = await ordersRes.json()
            const pageResults = ordersJson.results || []
            ordersTotal = ordersJson.paging?.total ?? ordersTotal
            rawOrders.push(...pageResults)
            console.log(`[ml-sync] pedidos: offset=${ordersOffset}, página=${pageResults.length}, acumulado=${rawOrders.length}/${ordersTotal}`)
            if (pageResults.length < ORDER_PAGE_SIZE) break
            ordersOffset += ORDER_PAGE_SIZE
            // ML tem teto de offset ~10k — paramos antes para não tomar 4xx
            if (ordersOffset >= 10000) {
                console.warn('[ml-sync] Limite de offset (10k) atingido em pedidos — parando.')
                break
            }
        }
        console.log(`[ml-sync] ${rawOrders.length} pedidos encontrados (total API: ${ordersTotal})`)

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
            // upsert em lotes de 500 para evitar payloads enormes
            for (let i = 0; i < mappedOrders.length; i += 500) {
                const batch = mappedOrders.slice(i, i + 500)
                const { error: ordErr } = await supabase
                    .from('ml_orders')
                    .upsert(batch, { onConflict: 'user_id,ml_order_id' })
                if (ordErr) {
                    console.error('[ml-sync] Erro ao salvar pedidos:', ordErr)
                    throw new Error(`Erro ao salvar pedidos no banco: ${ordErr.message}`)
                }
            }
        }

        // ── 3. Anúncios — com PAGINAÇÃO (offset/limit; troca p/ scan se >1000) ─
        console.log('[ml-sync] Buscando anúncios (paginado)...')
        const itemIds: string[] = []
        const ITEMS_PAGE_SIZE = 100 // máx aceito pelo endpoint
        let itemsOffset = 0
        let itemsTotal = 0
        let useScan = false
        let scrollId: string | null = null

        while (true) {
            const baseUrl = `https://api.mercadolibre.com/users/${sellerId}/items/search`
            const url = useScan
                ? `${baseUrl}?search_type=scan&limit=${ITEMS_PAGE_SIZE}${scrollId ? `&scroll_id=${scrollId}` : ''}`
                : `${baseUrl}?offset=${itemsOffset}&limit=${ITEMS_PAGE_SIZE}`
            const itemsRes = await fetch(url, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })
            if (!itemsRes.ok) {
                const errText = await itemsRes.text()
                console.warn('[ml-sync] items/search erro:', itemsRes.status, errText.slice(0, 300))
                break
            }
            const itemsJson = await itemsRes.json()
            const pageResults: string[] = itemsJson.results || []
            itemsTotal = itemsJson.paging?.total ?? itemsTotal
            itemIds.push(...pageResults)
            console.log(`[ml-sync] anúncios: ${useScan ? 'scan' : `offset=${itemsOffset}`}, página=${pageResults.length}, acumulado=${itemIds.length}/${itemsTotal}`)
            if (pageResults.length < ITEMS_PAGE_SIZE) break
            // Se vamos passar de 1000 com offset, alterna para scan (limite ML)
            if (!useScan) {
                itemsOffset += ITEMS_PAGE_SIZE
                if (itemsOffset >= 1000 && itemsTotal > 1000) {
                    console.log('[ml-sync] Mudando para search_type=scan (>1000 anúncios)')
                    useScan = true
                    scrollId = itemsJson.scroll_id || null
                }
            } else {
                scrollId = itemsJson.scroll_id || null
                if (!scrollId) break
            }
        }
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

            // ── 4. Visitas — em chunks de 50 ids ───────────────────────
            // Endpoint: /items/visits?ids=MLB1,MLB2&date_from=...&date_to=...
            console.log('[ml-sync] Buscando visitas (em chunks)...')
            const VISITS_CHUNK = 50
            for (let i = 0; i < itemIds.length; i += VISITS_CHUNK) {
                const chunkIds = itemIds.slice(i, i + VISITS_CHUNK)
                try {
                    const visitsRes = await fetch(
                        `https://api.mercadolibre.com/items/visits?ids=${chunkIds.join(',')}&date_from=${thirtyDaysAgo}&date_to=${today}`,
                        { headers: { 'Authorization': `Bearer ${accessToken}` } }
                    )
                    if (!visitsRes.ok) {
                        const errText = await visitsRes.text()
                        console.warn(`[ml-sync] Visitas chunk ${i} erro:`, visitsRes.status, errText.slice(0, 200))
                        continue
                    }
                    const visitsData = await visitsRes.json()
                    // Resposta pode vir como array [{item_id,total_visits}] ou objeto {"MLB123":N}
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
                } catch (vErr) {
                    console.error(`[ml-sync] Erro ao buscar visitas chunk ${i}:`, vErr)
                }
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

                        // 5b. Buscar ads com métricas por período (PAGINADO)
                        const ADS_PAGE = 50
                        let adsOffset = 0
                        let adsTotal = 0
                        const allAdsMetrics: any[] = []
                        while (true) {
                            const adsMetricsRes = await fetch(
                                `https://api.mercadolibre.com/marketplace/advertising/MLB/advertisers/${advertiserId}/product_ads/ads?date_from=${sevenDaysAgo}&date_to=${today}&metrics=clicks,prints,cost,direct_amount,acos,ctr&limit=${ADS_PAGE}&offset=${adsOffset}`,
                                { headers: { 'Authorization': `Bearer ${accessToken}` } }
                            )
                            console.log(`[ml-sync] Ads metrics offset=${adsOffset} status=${adsMetricsRes.status}`)
                            if (!adsMetricsRes.ok) {
                                const errBody = await adsMetricsRes.text()
                                console.warn('[ml-sync] Ads metrics erro:', adsMetricsRes.status, errBody.slice(0, 300))
                                break
                            }
                            const adsMetricsData = await adsMetricsRes.json()
                            const adsArray = adsMetricsData.results || adsMetricsData.ads || (Array.isArray(adsMetricsData) ? adsMetricsData : [])
                            adsTotal = adsMetricsData.paging?.total ?? adsTotal
                            allAdsMetrics.push(...adsArray)
                            if (adsArray.length < ADS_PAGE) break
                            adsOffset += ADS_PAGE
                            if (adsOffset >= 5000) break // segurança
                        }
                        console.log(`[ml-sync] Product Ads coletados: ${allAdsMetrics.length}/${adsTotal}`)

                        allAdsMetrics.forEach((adMetric: any) => {
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
                        console.warn('[ml-sync] Nenhum advertiser_id encontrado. O seller pode não ter Product Ads ativos.')
                    }
                } else {
                    const errBody = await advRes.text()
                    console.warn('[ml-sync] Advertisers erro:', advRes.status, errBody.slice(0, 300))
                }
            } catch (adsErr) {
                console.error('[ml-sync] Erro ao buscar Product Ads:', adsErr)
            }

            // ── 6. Salvar anúncios (em lotes) ──────────────────────────
            if (mappedAds.length > 0) {
                for (let i = 0; i < mappedAds.length; i += 500) {
                    const batch = mappedAds.slice(i, i + 500)
                    const { error: adErr } = await supabase
                        .from('ml_ads')
                        .upsert(batch, { onConflict: 'user_id,ml_item_id' })
                    if (adErr) {
                        console.error('[ml-sync] Erro ao salvar anúncios:', adErr)
                        throw new Error(`Erro ao salvar anúncios no banco: ${adErr.message}`)
                    }
                }
            }
        }

        // ── 7. Atualizar metadados de sync ────────────────────────────
        // Tenta com last_error; se a coluna ainda não existe, faz fallback
        const metaPayload: any = {
            user_id: user.id,
            status: 'done',
            last_sync: new Date().toISOString(),
            total_orders: mappedOrders.length,
            total_ads: itemIds.length,
            updated_at: new Date().toISOString(),
        }
        const { error: metaErr } = await supabase
            .from('ml_sync_meta')
            .upsert({ ...metaPayload, last_error: null }, { onConflict: 'user_id' })
        if (metaErr) {
            // Fallback se coluna last_error ainda não existe
            await supabase.from('ml_sync_meta').upsert(metaPayload, { onConflict: 'user_id' })
        }

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
        // Tenta gravar o erro em ml_sync_meta para o dashboard exibir
        try {
            const supabase = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )
            const authHeader = req.headers.get('Authorization')
            if (authHeader) {
                const token = authHeader.replace('Bearer ', '')
                const { data: { user } } = await supabase.auth.getUser(token)
                if (user) {
                    const errPayload: any = {
                        user_id: user.id,
                        status: 'error',
                        updated_at: new Date().toISOString(),
                    }
                    const { error: e1 } = await supabase
                        .from('ml_sync_meta')
                        .upsert({ ...errPayload, last_error: String(error.message).slice(0, 500) }, { onConflict: 'user_id' })
                    if (e1) {
                        await supabase.from('ml_sync_meta').upsert(errPayload, { onConflict: 'user_id' })
                    }
                }
            }
        } catch (_) { /* swallow */ }

        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    }
})
