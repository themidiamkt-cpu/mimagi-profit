// supabase/functions/meta-ads/index.ts
// Edge Function para integração com Meta Marketing API (Facebook/Instagram Ads)
// Paths suportados (via header x-path):
//   POST save-token     -> salva access_token (+ account opcional)
//   GET  status         -> retorna status da integração
//   GET  accounts       -> lista ad_accounts do usuário
//   POST select-account -> grava ad_account selecionada
//   GET  campaigns      -> lista campanhas da conta selecionada
//   POST insights       -> retorna insights (spend, impressions, clicks, ctr, cpc)
//                          body: { since: 'YYYY-MM-DD', until: 'YYYY-MM-DD', level?: 'account'|'campaign' }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-path",
};

const META_API_VERSION = "v20.0";
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const userJwt = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(userJwt);
    if (userError || !user) throw new Error("Invalid user token");

    const path = req.headers.get("x-path") || "";

    // --- save-token ---------------------------------------------------
    if (req.method === "POST" && path === "save-token") {
      const body = await req.json();
      const { access_token, account_id, account_name, app_id, app_secret } =
        body;

      if (!access_token) throw new Error("access_token é obrigatório");

      // Validação rápida: busca /me para confirmar que o token é válido
      const meRes = await fetch(
        `${META_BASE}/me?fields=id,name&access_token=${encodeURIComponent(
          access_token,
        )}`,
      );
      const meData = await meRes.json();
      if (!meRes.ok || meData.error) {
        throw new Error(
          meData.error?.message || "Token inválido no Meta Graph API",
        );
      }

      const { error } = await supabaseClient
        .from("ad_integrations")
        .upsert(
          {
            user_id: user.id,
            platform: "meta",
            access_token,
            account_id: account_id ?? null,
            account_name: account_name ?? null,
            app_id: app_id ?? null,
            app_secret: app_secret ?? null,
            metadata: { meta_user: meData },
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,platform" },
        );

      if (error) throw error;

      return json({
        message: "Token salvo",
        meta_user: meData,
      });
    }

    // --- status -------------------------------------------------------
    if (req.method === "GET" && path === "status") {
      const { data } = await supabaseClient
        .from("ad_integrations")
        .select("account_id, account_name, updated_at, metadata")
        .eq("user_id", user.id)
        .eq("platform", "meta")
        .maybeSingle();

      return json({
        connected: !!data?.account_id,
        has_token: !!data,
        account_id: data?.account_id ?? null,
        account_name: data?.account_name ?? null,
        meta_user: data?.metadata?.meta_user ?? null,
        updated_at: data?.updated_at ?? null,
      });
    }

    // --- accounts -----------------------------------------------------
    if (req.method === "GET" && path === "accounts") {
      const integ = await getIntegration(supabaseClient, user.id);
      const url = `${META_BASE}/me/adaccounts?fields=id,account_id,name,currency,account_status,business_name&limit=100&access_token=${encodeURIComponent(
        integ.access_token,
      )}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.error?.message || "Falha ao listar ad accounts");
      return json({ accounts: data.data ?? [] });
    }

    // --- select-account ----------------------------------------------
    if (req.method === "POST" && path === "select-account") {
      const { account_id, account_name } = await req.json();
      if (!account_id) throw new Error("account_id é obrigatório");

      const { error } = await supabaseClient
        .from("ad_integrations")
        .update({
          account_id,
          account_name: account_name ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("platform", "meta");

      if (error) throw error;
      return json({ message: "Conta selecionada", account_id });
    }

    // --- campaigns ----------------------------------------------------
    if (req.method === "GET" && path === "campaigns") {
      const integ = await getIntegration(supabaseClient, user.id);
      if (!integ.account_id) throw new Error("Nenhuma ad account selecionada");

      const url = `${META_BASE}/${integ.account_id}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,effective_status&limit=200&access_token=${encodeURIComponent(
        integ.access_token,
      )}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.error?.message || "Falha ao listar campanhas");
      return json({ campaigns: data.data ?? [] });
    }

    // --- insights -----------------------------------------------------
    if (req.method === "POST" && path === "insights") {
      const integ = await getIntegration(supabaseClient, user.id);
      if (!integ.account_id) throw new Error("Nenhuma ad account selecionada");

      const { since, until, level = "account" } = await req.json();
      if (!since || !until)
        throw new Error("since e until são obrigatórios (YYYY-MM-DD)");

      const fields = [
        "spend",
        "impressions",
        "clicks",
        "ctr",
        "cpc",
        "reach",
        "campaign_name",
        "campaign_id",
      ].join(",");

      const params = new URLSearchParams({
        fields,
        level,
        time_range: JSON.stringify({ since, until }),
        time_increment: "1",
        limit: "500",
        access_token: integ.access_token,
      });

      const url = `${META_BASE}/${integ.account_id}/insights?${params.toString()}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.error?.message || "Falha ao buscar insights");

      const rows = (data.data ?? []).map((r: any) => ({
        date: r.date_start ?? null,
        spend: parseFloat(r.spend ?? "0"),
        impressions: parseInt(r.impressions ?? "0", 10),
        clicks: parseInt(r.clicks ?? "0", 10),
        ctr: parseFloat(r.ctr ?? "0"),
        cpc: parseFloat(r.cpc ?? "0"),
        reach: r.reach ? parseInt(r.reach, 10) : null,
        campaign_id: r.campaign_id ?? null,
        campaign_name: r.campaign_name ?? null,
      }));

      return json({ level, insights: rows });
    }

    return json({ error: "Path não suportado", path }, 404);
  } catch (error: any) {
    console.error("[meta-ads]", error);
    return json({ error: error.message ?? String(error) }, 400);
  }
});

async function getIntegration(client: any, userId: string) {
  const { data, error } = await client
    .from("ad_integrations")
    .select("access_token, account_id")
    .eq("user_id", userId)
    .eq("platform", "meta")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Integração Meta não configurada");
  return data;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
