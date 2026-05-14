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

        // Parse request body for optional date range parameters
        let dateFrom: string | null = null
        let dateTo: string | null = null

        try {
            const body = await req.json()
            if (body?.from) dateFrom = body.from
            if (body?.to) dateTo = body.to
        } catch (_) {
            // Se não houver body, usa o padrão de 30 dias abaixo
        }

        // Fetch real data from database
        const { data: orders } = await supabaseClient
            .from('ml_orders')
            .select('*')
            .eq('user_id', user.id)
            .order('order_date', { ascending: false })

        const { data: ads } = await supabaseClient
            .from('ml_ads')
            .select('*')
            .eq('user_id', user.id)
            .order('stock_quantity', { ascending: true })

        // Filtro de período para o Resumo
        const now = new Date()
        const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
        const finalFrom = dateFrom ? new Date(dateFrom).toISOString() : defaultFrom
        const finalTo = dateTo ? new Date(dateTo).toISOString() : now.toISOString()

        const filteredOrders = (orders || []).filter(order =>
            order.order_date && order.order_date >= finalFrom && order.order_date <= finalTo
        )

        const totalOrders = filteredOrders.length
        const revenue = filteredOrders.reduce((acc, order) => acc + Number(order.total_amount || 0), 0)
        // Tenta com last_error; se a coluna ainda não existe, faz fallback
        let syncMeta: any = null
        const r1 = await supabaseClient
            .from('ml_sync_meta')
            .select('status, last_sync, last_error, total_orders, total_ads')
            .eq('user_id', user.id)
            .maybeSingle()
        if (r1.error) {
            const r2 = await supabaseClient
                .from('ml_sync_meta')
                .select('status, last_sync, total_orders, total_ads')
                .eq('user_id', user.id)
                .maybeSingle()
            syncMeta = r2.data ? { ...r2.data, last_error: null } : null
        } else {
            syncMeta = r1.data
        }

        // Pedidos pendentes = aguardando envio (confirmed) ou pagamento pendente
        const pendingOrders = orders?.filter(order =>
            order.status === 'confirmed' || order.status === 'payment_required'
        ).length || 0
        const activeAds = ads?.length || 0
        const totalVisits = ads?.reduce((acc, ad) => acc + (ad.visits || 0), 0) || 0

        // Product Ads Metrics
        const totalAdCost = ads?.reduce((acc, ad) => acc + Number(ad.cost || 0), 0) || 0
        const totalAdSales = ads?.reduce((acc, ad) => acc + Number(ad.ad_sales || 0), 0) || 0
        const averageAcos = totalAdSales > 0 ? (totalAdCost / totalAdSales) * 100 : 0

        const dashboardData = {
            summary: {
                totalOrders,
                revenue,
                pendingOrders,
                activeAds,
                visits: totalVisits,
                adCost: totalAdCost,
                adSales: totalAdSales,
                acos: averageAcos,
                revenueGrowth: 0,
                ordersGrowth: 0
            },
            recentOrders: (orders || []).slice(0, 5).map(order => ({
                id: order.ml_order_id,
                buyer: order.buyer_nickname || 'N/A',
                status: order.status,
                value: `R$ ${Number(order.total_amount || 0).toFixed(2)}`,
                date: order.order_date ? new Date(order.order_date).toLocaleDateString('pt-BR') : '-'
            })),
            lowStockAds: (ads || []).filter(ad => Number(ad.stock_quantity || 0) < 5).map(ad => ({
                title: ad.title,
                sku: ad.sku || 'N/A',
                qty: Number(ad.stock_quantity || 0)
            })),
            unansweredQuestions: [], // Need a table for questions if real
            chartData: [],
            sync: syncMeta || { status: 'never', last_sync: null, last_error: null, total_orders: 0, total_ads: 0 }
        }

        return new Response(JSON.stringify(dashboardData), {
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
