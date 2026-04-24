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

        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

        const currentMonthOrders = orders?.filter(order => order.order_date >= startOfMonth) || []

        const totalOrders = currentMonthOrders.length
        const revenue = currentMonthOrders.reduce((acc, order) => acc + Number(order.total_amount), 0)
        const pendingOrders = orders?.filter(order => order.status === 'paid' || order.status === 'payment_required').length || 0
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
            recentOrders: orders?.slice(0, 5).map(order => ({
                id: order.ml_order_id,
                buyer: order.buyer_nickname || 'N/A',
                status: order.status,
                value: `R$ ${order.total_amount.toFixed(2)}`,
                date: new Date(order.order_date).toLocaleDateString('pt-BR')
            })) || [],
            lowStockAds: ads?.filter(ad => ad.stock_quantity < 5).map(ad => ({
                title: ad.title,
                sku: ad.sku || 'N/A',
                qty: ad.stock_quantity
            })) || [],
            unansweredQuestions: [], // Need a table for questions if real
            chartData: []
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
