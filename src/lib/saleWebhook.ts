import { supabase } from "@/integrations/supabase/client";

type NotifySaleWebhookInput = {
  source: string;
  sale: Record<string, unknown>;
  customer?: Record<string, unknown> | null;
  table?: "orders" | "bling_pedidos";
};

export async function notifySaleWebhook(input: NotifySaleWebhookInput) {
  const { data, error } = await supabase.functions.invoke("sale-webhook", {
    body: input,
  });

  if (error) {
    console.warn("Falha ao chamar sale-webhook:", error);
    return { success: false, error: error.message };
  }

  if (!data?.success) {
    console.warn("sale-webhook não confirmou envio:", data);
  }

  return data;
}
