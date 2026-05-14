#!/bin/bash
# Script para commitar as alterações da integração Meta/TikTok Ads
# e disparar o deploy automático na Vercel
# Uso: bash deploy-ads.sh
set -e

cd "$(dirname "$0")"

echo "==> git status"
git status

echo ""
echo "==> Adicionando arquivos da integração Ads..."
git add \
  supabase/migrations/20260424_ad_integrations.sql \
  supabase/functions/meta-ads/index.ts \
  supabase/functions/tiktok-ads/index.ts \
  src/pages/MetaAds.tsx \
  src/pages/MetaAdsSettings.tsx \
  src/pages/TikTokAds.tsx \
  src/pages/TikTokAdsSettings.tsx \
  src/components/ads/AdsDashboardShell.tsx \
  src/App.tsx \
  src/components/layout/AppSidebar.tsx \
  deploy-ads.sh

echo ""
echo "==> Commitando..."
git commit -m "feat(ads): integração Meta Ads e TikTok Ads via token

- tabela ad_integrations + ad_insights_cache com RLS por usuário
- edge functions meta-ads e tiktok-ads (save-token, status, accounts,
  select-account, campaigns, insights)
- páginas MetaAds/TikTokAds (dashboard com spend/impressões/cliques/CTR/CPC)
- páginas MetaAdsSettings/TikTokAdsSettings (configuração de token e conta)
- shell compartilhado AdsDashboardShell com filtro de data e gráfico diário
- links no AppSidebar e rotas em App.tsx"

echo ""
echo "==> Fazendo push para origin/main (Vercel detecta e dá deploy)..."
git push origin HEAD

echo ""
echo "✅ Push concluído. O Vercel já deve ter disparado o deploy automaticamente."
echo "   Acompanhe em: https://vercel.com/dashboard"
echo ""
echo "👉 Não esqueça de rodar a migration no Supabase:"
echo "   supabase db push   (ou copie o SQL de supabase/migrations/20260424_ad_integrations.sql e rode no SQL Editor)"
echo ""
echo "👉 E fazer o deploy das edge functions:"
echo "   supabase functions deploy meta-ads"
echo "   supabase functions deploy tiktok-ads"
