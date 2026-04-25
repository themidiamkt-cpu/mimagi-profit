#!/bin/bash
# =====================================================================
# Deploy COMPLETO da integração Mercado Livre
# Aplica migrations -> regera types -> deploya edge functions -> build
# =====================================================================
set -e
cd "$(dirname "$0")"

PROJECT_ID="mujaacymoymysjvkvtdm"

echo "🗄️  1/4 — Aplicando migrations no Supabase..."
supabase db push --linked && echo "✅ Migrations aplicadas"

echo ""
echo "🧬 2/4 — Regerando types do TypeScript a partir do schema..."
supabase gen types typescript --project-id "$PROJECT_ID" \
  > src/integrations/supabase/types.ts \
  && echo "✅ types.ts atualizado"

echo ""
echo "📦 3/4 — Deploy das Edge Functions ML..."
supabase functions deploy ml-integration && echo "✅ ml-integration"
supabase functions deploy ml-token       && echo "✅ ml-token"
supabase functions deploy ml-sync        && echo "✅ ml-sync"
supabase functions deploy ml-debug       && echo "✅ ml-debug"
supabase functions deploy ml-dashboard   && echo "✅ ml-dashboard"

echo ""
echo "🏗️  4/4 — Buildando o frontend..."
npm run build && echo "✅ Build OK"

echo ""
echo "🚀 Pronto! Próximos passos:"
echo "   1. Acesse /mercadolivre/configuracoes"
echo "   2. Salve App ID, Secret Key e Redirect URI"
echo "   3. Clique em 'Autorizar com ML' e conclua o OAuth"
echo "   4. Volte ao dashboard e clique em 'Sincronizar'"
echo "   5. Em caso de problema rode 'Diagnóstico API'"
