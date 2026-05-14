import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const suggestionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    suggestions: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          action: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          reason: { type: "string" },
        },
        required: ["title", "summary", "action", "priority", "reason"],
      },
    },
  },
  required: ["suggestions"],
};

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
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Invalid user token");
    }

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
      return new Response(JSON.stringify({ suggestions: [], configured: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const payload = await req.json();

    const systemPrompt = [
      "Você é um analista sênior de e-commerce infantil.",
      "Receberá um snapshot já calculado da página Visão Geral.",
      "Use apenas os números fornecidos. Não invente dados.",
      "Seu papel é sugerir a próxima ação prática para melhorar o resultado.",
      "Priorize recomendações acionáveis como campanha, canal, marca ou meta diária.",
      "Se houver pouca informação, devolva menos sugestões em vez de inventar.",
      "Escreva em português do Brasil, de forma objetiva.",
    ].join(" ");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_OVERVIEW_MODEL") ?? "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: systemPrompt }],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: JSON.stringify(payload) }],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "overview_ai_suggestions",
            strict: true,
            schema: suggestionSchema,
          },
        },
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      const apiError = responseData?.error?.message || "OpenAI request failed";
      throw new Error(apiError);
    }

    const rawText = responseData.output_text
      || responseData.output?.[0]?.content?.find((item: any) => item.type === "output_text")?.text
      || "{\"suggestions\": []}";

    const parsed = JSON.parse(rawText);

    return new Response(JSON.stringify({
      suggestions: Array.isArray(parsed?.suggestions) ? parsed.suggestions : [],
      configured: true,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("[OPENAI-OVERVIEW-ALERTS ERROR]", error);

    return new Response(JSON.stringify({
      suggestions: [],
      configured: true,
      error: error.message,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
