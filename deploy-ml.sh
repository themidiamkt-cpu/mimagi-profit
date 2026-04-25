#!/bin/bash
# Deploy das Edge Functions do Mercado Livre
cd "$(dirname "$0")"

echo "📦 Fazendo deploy das funções ML..."

supabase functions deploy ml-sync && echo "✅ ml-sync OK"
supabase functions deploy ml-debug && echo "✅ ml-debug OK"
supabase functions deploy ml-dashboard && echo "✅ ml-dashboard OK"

echo ""
echo "🏗️  Buildando o frontend..."
npm run build && echo "✅ Build OK"

echo ""
echo "🚀 Pronto! Agora acesse o dashboard e clique em 'Sincronizar' e depois 'Diagnóstico API'."
