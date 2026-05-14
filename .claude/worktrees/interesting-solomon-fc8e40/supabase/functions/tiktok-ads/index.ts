// supabase/functions/tiktok-ads/index.ts
// Edge Function para integração com TikTok Marketing API (Business)
// Autenticação: Access-Token header (long-lived token gerado no TikTok Business Center)
// Paths suportados (via header x-path):
//   POST save-token     -> salva access_token (+ advertiser_id opcional)
//   GET  status         -> retorna status da integração
//   GET  accounts       -> lista advertisers disponíveis para o token
//   POST select-account -> grava advertiser_id selecionado
//   GET  campaigns      -> lista campanhas do advertiser selecionado
//   POST insights       -> insights agregados por dia
//                          body: { since: 'YYYY-MM-DD', until: 'YYYY-MM-DD', level?: 'AUCTION_ADVERTISER'|'AUCTION_CAMPAIGN' }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-path",
};

const TTK_BASE = "https://business-api.tiktok.com/open_api/v1.3";

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
      const { access_token, advertiser_id, advertiser_name, app_id, app_secret } =
        body;
      if (!access_token) throw new Error("access_token é obrigatório");

      // Valida token pegando a lista de advertisers acessíveis
      const advertisers = await ttkGet(
        "/oauth2/advertiser/get/",
        { app_id: app_id ?? "", secret: app_secret ?? "" },
        access_token,
      ).catch(() => null);

      const { error } = await supabaseClient
        .from("ad_integrations")
        .upsert(
          {
            user_id: user.id,
            platform: "tiktok",
            access_token,
            account_id: advertiser_id ?? null,
            account_name: advertiser_name ?? null,
            app_id: app_id ?? null,
            app_secret: app_secret ?? null,
            metadata: advertisers ? { advertisers } : {},
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,platform" },
        );
      if (error) throw error;

      return json({ message: "Token salvo", advertisers });
    }

    // --- status -------------------------------------------------------
    if (req.method === "GET" && path === "status") {
      const { data } = await supabaseClient
        .from("ad_integrations")
        .select("account_id, account_name, updated_at, metadata")
        .eq("user_id", user.id)
        .eq("platform", "tiktok")
        .maybeSingle();

      return json({
        connected: !!data?.account_id,
        has_token: !!data,
        advertiser_id: data?.account_id ?? null,
        advertiser_name: data?.account_name ?? null,
        updated_at: data?.updated_at ?? null,
      });
    }

    // --- accounts -----------------------------------------------------
    if (req.method === "GET" && path === "accounts") {
      const integ = await getIntegration(supabaseClient, user.id);
      // Requer app_id e app_secret para usar /oauth2/advertiser/get/
      if (!integ.app_id || !integ.app_secret) {
        // Fallback: tenta /user/info/ para pelo menos confirmar o token
        const info = await ttkGet("/user/info/", {}, integ.access_token);
        return json({ accounts: [], user_info: info, note: "Informe app_id e app_secret para listar advertisers" });
      }
      const data = await ttkGet(
        "/oauth2/advertiser/get/",
        { app_id: integ.app_id, secret: integ.app_secret },
        integ.access_token,
      );
      return json({ accounts: data?.list ?? [] });
    }

    // --- select-account ----------------------------------------------
    if (req.method === "POST" && path === "select-account") {
      const { advertiser_id, advertiser_name } = await req.json();
      if (!advertiser_id) throw new Error("advertiser_id é obrigatório");

      const { error } = await supabaseClient
        .from("ad_integrations")
        .update({
          account_id: String(advertiser_id),
          account_name: advertiser_name ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("platform", "tiktok");
      if (error) throw error;
      return json({ message: "Advertiser selecionado", advertiser_id });
    }

    // --- campaigns ----------------------------------------------------
    if (req.method === "GET" && path === "campaigns") {
      const integ = await getIntegration(supabaseClient, user.id);
      if (!integ.account_id) throw new Error("Nenhum advertiser selecionado");

      const data = await ttkGet(
        "/campaign/get/",
        { advertiser_id: integ.account_id, page_size: 100 },
        integ.access_token,
      );
      return json({ campaigns: data?.list ?? [] });
    }

    // --- insights -----------------------------------------------------
    if (req.method === "POST" && path === "insights") {
      const integ = await getIntegration(supabaseClient, user.id);
      if (!integ.account_id) throw new Error("Nenhum advertiser selecionado");

      const { since, until, level = "AUCTION_ADVERTISER" } = await req.json();
      if (!since || !until)
        throw new Error("since e until são obrigatórios (YYYY-MM-DD)");

      const metrics = [
        "spend",
        "impressions",
        "clicks",
        "ctr",
        "cpc",
        "reach",
      ];

      const params: Record<string, unknown> = {
        advertiser_id: integ.account_id,
        report_type: "BASIC",
        data_level: level,
        dimensions: level === "AUCTION_CAMPAIGN"
          ? ["campaign_id", "stat_time_day"]
          : ["advertiser_id", "stat_time_day"],
        metrics,
        start_date: since,
        end_date: until,
        page_size: 500,
      };

      const data = await ttkGet(
        "/report/integrated/get/",
        params,
        integ.access_token,
      );

      const rows = (data?.list ?? []).map((row: any) => {
        const m = row.metrics ?? {};
        const d = row.dimensions ?? {};
        return {
          date: d.stat_time_day ?? null,
          spend: parseFloat(m.spend ?? "0"),
          impressions: parseInt(m.impressions ?? "0", 10),
          clicks: parseInt(m.clicks ?? "0", 10),
          ctr: parseFloat(m.ctr ?? "0"),
          cpc: parseFloat(m.cpc ?? "0"),
          reach: m.reach ? parseInt(m.reach, 10) : null,
          campaign_id: d.campaign_id ?? null,
        };
      });

      return json({ level, insights: rows });
    }

    return json({ error: "Path não suportado", path }, 404);
  } catch (error: any) {
    console.error("[tiktok-ads]", error);
    return json({ error: error.message ?? String(error) }, 400);
  }
});

async function getIntegration(client: any, userId: string) {
  const { data, error } = await client
    .from("ad_integrations")
    .select("access_token, account_id, app_id, app_secret")
    .eq("user_id", userId)
    .eq("platform", "tiktok")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Integração TikTok não configurada");
  return data;
}

async function ttkGet(
  path: string,
  params: Record<string, unknown>,
  accessToken: string,
) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    qs.append(k, typeof v === "string" ? v : JSON.stringify(v));
  }
  const url = `${TTK_BASE}${path}?${qs.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Access-Token": accessToken, "Content-Type": "application/json" },
  });
  const payload = await res.json();
  if (!res.ok || payload.code !== 0) {
    throw new Error(payload.message || `TikTok API error (code=${payload.code})`);
  }
  return payload.data;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
