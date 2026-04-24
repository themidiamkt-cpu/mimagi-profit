import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

        // 1. Get Tokens
        const { data: tokenData, error: tokenError } = await supabase
            .from('ml_tokens')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (tokenError || !tokenData) throw new Error('Mercado Livre account not connected')

        let accessToken = tokenData.access_token
        const expiresAt = new Date(tokenData.expires_at)

        // Refresh token if expired
        if (expiresAt <= new Date()) {
            console.log('Refreshing ML token...');
            const { data: config } = await supabase
                .from('ml_config')
                .select('app_id, secret_key')
                .eq('user_id', user.id)
                .single()

            if (!config) throw new Error('ML config not found for refresh')

            const refreshRes = await fetch('https://api.mercadolibre.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    client_id: config.app_id.toString(),
                    client_secret: config.secret_key,
                    refresh_token: tokenData.refresh_token
                }).toString(),
            })

            const refreshData = await refreshRes.json()
            if (!refreshRes.ok) throw new Error('Failed to refresh ML token')

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

        if (!config?.seller_id) throw new Error('Seller ID not found in config')

        // 2. Sync Orders
        console.log('Syncing ML Orders...');
        const ordersRes = await fetch(`https://api.mercadolibre.com/orders/search?seller=${config.seller_id}&order.status=paid`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        const ordersData = await ordersRes.json()
        const rawOrders = ordersData.results || []

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
            const { error: ordErr } = await supabase.from('ml_orders').upsert(mappedOrders, { onConflict: 'user_id,ml_order_id' })
            if (ordErr) console.error('Error upserting orders:', ordErr)
        }

        // 3. Sync Ads (Items)
        console.log('Syncing ML Ads...');
        const itemsRes = await fetch(`https://api.mercadolibre.com/users/${config.seller_id}/items/search`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        const itemsData = await itemsRes.json()
        const itemIds = itemsData.results || []

        if (itemIds.length > 0) {
            // Multiget items for details
            const detailRes = await fetch(`https://api.mercadolibre.com/items?ids=${itemIds.slice(0, 20).join(',')}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })
            const details = await detailRes.json()

            const mappedAds = details.map((res: any) => {
                const item = res.body;
                if (!item) return null;
                return {
                    user_id: user.id,
                    ml_item_id: item.id,
                    title: item.title,
                    sku: item.seller_custom_field || item.id,
                    stock_quantity: item.available_quantity || 0,
                    price: item.price,
                    status: item.status,
                    visits: item.health || 0, // Simplified visits
                    updated_at: new Date().toISOString()
                }
            }).filter((a: any) => a !== null)

            if (mappedAds.length > 0) {
                // Now fetch Performance Metrics for these items
                try {
                    const today = new Date().toISOString().split('T')[0];
                    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

                    const metricsRes = await fetch(`https://api.mercadolibre.com/advertising/product_ads/ads/metrics?date_from=${sevenDaysAgo}&date_to=${today}&ids=${itemIds.slice(0, 50).join(',')}`, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });

                    if (metricsRes.ok) {
                        const metricsData = await metricsRes.json();
                        // API returns an array or object per ID
                        const metricsMap: Record<string, any> = {};
                        if (Array.isArray(metricsData)) {
                            metricsData.forEach((m: any) => {
                                metricsMap[m.ad_id || m.id] = m;
                            });
                        }

                        // Update mappedAds with metrics
                        mappedAds.forEach((ad: any) => {
                            const m = metricsMap[ad.ml_item_id];
                            if (m) {
                                ad.impressions = m.impressions || 0;
                                ad.clicks = m.clicks || 0;
                                ad.cost = m.cost || 0;
                                ad.ad_sales = m.sales_amount || m.revenue || 0;
                                ad.acos = m.acos || 0;
                                ad.ctr = m.ctr || 0;
                            }
                        });
                    }
                } catch (metricsErr) {
                    console.error('Error fetching Ads metrics:', metricsErr);
                }

                // Fetch Real Visits for these items
                try {
                    const visitsRes = await fetch(`https://api.mercadolibre.com/visits/items?ids=${itemIds.slice(0, 50).join(',')}`, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });
                    if (visitsRes.ok) {
                        const visitsData = await visitsRes.json();
                        mappedAds.forEach((ad: any) => {
                            if (visitsData[ad.ml_item_id]) {
                                ad.visits = visitsData[ad.ml_item_id] || 0;
                            }
                        });
                    }
                } catch (vErr) {
                    console.error('Error fetching visits:', vErr);
                }

                const { error: adErr } = await supabase.from('ml_ads').upsert(mappedAds, { onConflict: 'user_id,ml_item_id' })
                if (adErr) console.error('Error upserting ads:', adErr)
            }
        }

        // 4. Update Meta
        await supabase.from('ml_sync_meta').upsert({
            user_id: user.id,
            status: 'done',
            last_sync: new Date().toISOString(),
            total_orders: mappedOrders.length,
            total_ads: itemIds.length,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

        return new Response(JSON.stringify({
            success: true,
            orders: mappedOrders.length,
            ads: itemIds.length
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error('ML Sync Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    }
})
