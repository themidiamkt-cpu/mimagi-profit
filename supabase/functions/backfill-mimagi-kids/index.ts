import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAIN_ACCOUNT_EMAIL = "mimagikidslojainfantil@gmail.com";

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

    if ((user.email || "").toLowerCase().trim() !== MAIN_ACCOUNT_EMAIL) {
      throw new Error("Not allowed");
    }

    // Backfill orphaned rows that were created before multi-tenant isolation.
    const { count: customersUpdated, error: customersError } = await supabase
      .from("growth_customers")
      .update({ user_id: user.id })
      .is("user_id", null)
      .select("id", { count: "exact", head: true });

    if (customersError) throw customersError;

    const { count: childrenUpdated, error: childrenError } = await supabase
      .from("children")
      .update({ user_id: user.id })
      .is("user_id", null)
      .select("id", { count: "exact", head: true });

    if (childrenError) throw childrenError;

    return new Response(
      JSON.stringify({
        success: true,
        customers_updated: customersUpdated || 0,
        children_updated: childrenUpdated || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("[BACKFILL-MIMAGI-KIDS ERROR]", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  }
});

