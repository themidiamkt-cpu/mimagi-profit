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

        // Get user from request
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
        if (userError || !user) throw new Error('Invalid user token')

        // Fetch real data from database
        const { data: orders, error: ordersError } = await supabaseClient
            .from('shopee_orders')
            .select('*')
            .eq('user_id', user.id)
            .order('order_date', { ascending: false })

        if (ordersError) throw ordersError

        const { data: products, error: productsError } = await supabaseClient
            .from('shopee_products')
            .select('*')
            .eq('user_id', user.id)
            .lt('stock_quantity', 10) // Low stock threshold
            .order('stock_quantity', { ascending: true })

        if (productsError) throw productsError

        const { data: allProducts, error: allProductsError } = await supabaseClient
            .from('shopee_products')
            .select('id')
            .eq('user_id', user.id)

        if (allProductsError) throw allProductsError

        // Calculate summary
        const totalOrders = orders?.length || 0
        const revenue = orders?.reduce((acc, order) => acc + Number(order.total_amount), 0) || 0
        const pendingOrders = orders?.filter(order => order.status === 'READY_TO_SHIP' || order.status === 'PROCESSED').length || 0
        const activeProducts = allProducts?.length || 0

        const dashboardData = {
            summary: {
                totalOrders,
                revenue,
                pendingOrders,
                activeProducts,
                revenueGrowth: 0, // Need historical data for this
                ordersGrowth: 0
            },
            recentOrders: orders?.slice(0, 5).map(order => ({
                id: order.shopee_order_id,
                status: order.status,
                value: `R$ ${order.total_amount.toFixed(2)}`,
                date: new Date(order.order_date).toLocaleDateString('pt-BR')
            })) || [],
            lowStockProducts: products?.map(product => ({
                name: product.name,
                sku: product.sku || 'N/A',
                qty: product.stock_quantity
            })) || [],
            chartData: [] // Would need more complex query for daily orders
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
