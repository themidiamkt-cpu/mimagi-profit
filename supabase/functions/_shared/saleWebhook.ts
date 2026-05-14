type WebhookResult = {
  ok: boolean;
  skipped?: boolean;
  status?: number;
  error?: string;
};

type SendSaleWebhookInput = {
  sale: Record<string, unknown>;
  customer?: Record<string, unknown> | null;
  source: string;
};

const DEFAULT_SALE_WEBHOOK_URL = "https://automacao2.themidiamarketing.com.br/webhook/saas-vendas";

export async function sendSaleWebhook(
  supabase: any,
  userId: string,
  input: SendSaleWebhookInput,
): Promise<WebhookResult> {
  const webhookUrl =
    Deno.env.get("SALE_WEBHOOK_URL") ||
    Deno.env.get("WEBHOOK_URL") ||
    Deno.env.get("N8N_SALE_WEBHOOK_URL") ||
    DEFAULT_SALE_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("[SALE-WEBHOOK] SALE_WEBHOOK_URL não configurado; envio ignorado.");
    return { ok: false, skipped: true, error: "SALE_WEBHOOK_URL not configured" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, nome, email, whatsapp, nome_loja")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("[SALE-WEBHOOK] Erro ao buscar profile:", profileError);
  }

  const saleProducts = Array.isArray(input.sale.products)
    ? input.sale.products
    : Array.isArray(input.sale.items)
      ? input.sale.items
      : Array.isArray(input.sale.itens)
        ? input.sale.itens
        : [];
  const saleProductNames = Array.isArray(input.sale.product_names)
    ? input.sale.product_names
    : saleProducts
      .map((product: any) => product?.name || product?.nome || product?.title || product?.description)
      .filter(Boolean);
  const saleProductName =
    input.sale.product_name ||
    saleProductNames[0] ||
    null;

  const payload = {
    event: "sale.created",
    sent_at: new Date().toISOString(),
    source: input.source,
    user_id: userId,
    user_whatsapp: profile?.whatsapp || null,
    product_name: saleProductName,
    product_names: saleProductNames,
    products: saleProducts,
    user: {
      id: userId,
      name: profile?.nome || null,
      email: profile?.email || null,
      whatsapp: profile?.whatsapp || null,
      store_name: profile?.nome_loja || null,
    },
    sale: input.sale,
    customer: input.customer || null,
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("[SALE-WEBHOOK] Webhook respondeu erro:", response.status, body);
      return { ok: false, status: response.status, error: body || response.statusText };
    }

    return { ok: true, status: response.status };
  } catch (error: any) {
    console.error("[SALE-WEBHOOK] Falha ao enviar webhook:", error);
    return { ok: false, error: error?.message || "Unknown webhook error" };
  }
}
