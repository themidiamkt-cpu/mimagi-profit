import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendSaleWebhook } from "../_shared/saleWebhook.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Invalid user token");

    const body = await req.json().catch(() => ({}));
    const sale = body.sale;
    if (!sale || typeof sale !== "object") throw new Error("Missing sale payload");

    const source = String(body.source || sale.source || sale.channel || "manual");
    const result = await sendSaleWebhook(supabase, user.id, {
      source,
      sale,
      customer: body.customer || null,
    });

    if (result.ok && sale.id) {
      const table = body.table === "bling_pedidos" ? "bling_pedidos" : "orders";
      let updateQuery = supabase
        .from(table)
        .update({ sent_to_webhook: true })
        .eq("id", sale.id);

      if (sale.user_id) {
        updateQuery = updateQuery.eq("user_id", user.id);
      }

      await updateQuery;
    }

    return new Response(JSON.stringify({ success: result.ok, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("[SALE-WEBHOOK ERROR]", error);
    return new Response(JSON.stringify({
      success: false,
      error: error?.message || "Unknown error",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
