import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/config';

const BLING_API_BASE = 'https://api.bling.com.br/Api/v3';
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const AVG_DAYS_PER_MONTH = 30.4375;

export interface BlingToken {
    access_token: string;
    refresh_token: string;
    expires_at: string;
}

export const blingApi = {
    /**
     * Redireciona para a página de autorização do Bling
     */
    connect: (customClientId?: string) => {
        // Fallbacks caso o .env não esteja configurado
        const clientId = customClientId || import.meta.env.VITE_BLING_CLIENT_ID || 'faff2861c0437caf6e9d433b2a84c3fe814e5ec7';
        const redirectUri = import.meta.env.VITE_BLING_REDIRECT_URI || 'https://planejamentoloja.themidiamarketing.com.br/bling/callback';

        console.log('Iniciando conexão Bling...', { clientId, redirectUri });

        if (!clientId || !redirectUri) {
            console.error('Configurações do Bling ausentes');
            return;
        }

        const state = crypto.randomUUID();
        localStorage.setItem('bling_oauth_state', state);

        const url = `https://www.bling.com.br/Api/v3/oauth/authorize?` +
            `response_type=code&` +
            `client_id=${clientId}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `state=${state}&` +
            `scope=${encodeURIComponent('pedidos.vendas.read vendas.read contatos.read produtos.read estoques.read')}`;

        window.location.href = url;
    },

    /**
     * Troca o code pelo token via Edge Function
     */
    exchangeCode: async (code: string) => {
        const { data, error } = await supabase.functions.invoke('bling-token', {
            body: { code }
        });

        if (error) {
            console.error('Falha ao obter token do Bling:', error);
            throw new Error(error.message || 'Falha ao obter token do Bling');
        }

        return data;
    },

    /**
     * Busca token válido (e renova se necessário)
     */
    getValidToken: async (): Promise<string | null> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data: tokenData, error } = await (supabase as any)
            .from('bling_tokens')
            .select('*')
            .single();

        if (error || !tokenData) return null;

        const expiresAt = new Date(tokenData.expires_at);
        const now = new Date();

        // Se falta menos de 5 minutos para expirar, renova
        if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
            return blingApi.refreshStoredToken((tokenData as any).refresh_token);
        }

        return (tokenData as any).access_token;
    },

    /**
     * Renova token via Edge Function
     */
    refreshStoredToken: async (refreshToken: string): Promise<string> => {
        const { data, error } = await supabase.functions.invoke('bling-token', {
            body: { refresh_token: refreshToken }
        });

        if (error) throw new Error(error.message || 'Falha ao renovar token do Bling');
        return data.access_token;
    },

    /**
     * Chamada genérica para a API do Bling
     * Helper genérico para chamadas à API através do Proxy (CORS Fix)
     */
    _fetch: async (endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', params?: any) => {
        const { data, error } = await supabase.functions.invoke('bling-proxy', {
            body: { endpoint, method, params }
        });

        if (error) {
            console.error('Erro na comunicação com o Bling (Proxy):', error);
            throw new Error(error.message || 'Erro na comunicação com o Bling');
        }

        return data;
    },

    calculateCustomerLifetimeMetrics: ({
        totalSpent,
        totalOrders,
        firstPurchase,
        lastPurchase,
        margin = 0.3
    }: {
        totalSpent: number;
        totalOrders: number;
        firstPurchase?: string | null;
        lastPurchase?: string | null;
        margin?: number;
    }) => {
        const ticketMedio = totalOrders > 0 ? totalSpent / totalOrders : 0;

        if (!firstPurchase || !lastPurchase || totalOrders <= 0) {
            return {
                ticketMedio,
                averageFrequency: totalOrders > 0 ? totalOrders : 0,
                retentionMonths: totalOrders > 0 ? 1 : 0,
                ltv: totalSpent,
                ltvProfit: totalSpent * margin
            };
        }

        const firstDate = new Date(firstPurchase);
        const lastDate = new Date(lastPurchase);

        // Tempo de Retenção em meses
        const diffInMonths = Math.max(1, ((lastDate.getTime() - firstDate.getTime()) / MS_PER_DAY) / AVG_DAYS_PER_MONTH);
        const retentionMonths = Number(diffInMonths.toFixed(2));

        // Frequência (pedidos por mês)
        const averageFrequency = totalOrders / retentionMonths;

        // LTV = Ticket Médio * (Freq * Tempo) = Total Gasto
        const ltv = ticketMedio * averageFrequency * retentionMonths;

        return {
            ticketMedio,
            averageFrequency,
            retentionMonths,
            ltv,
            ltvProfit: ltv * margin
        };
    },

    /**
     * Busca pedidos de venda com suporte a filtros e paginação
     */
    getPedidos: (pagina = 1, limite = 100, status?: number, dataInicial?: string, dataFinal?: string) => {
        // expand[]=itens é CRÍTICO para análise de marcas no dashboard
        let endpoint = `/pedidos/vendas?pagina=${pagina}&limite=${limite}&expand[]=itens`;
        if (status) endpoint += `&situacao=${status}`;
        if (dataInicial) endpoint += `&dataInicial=${dataInicial}`;
        if (dataFinal) endpoint += `&dataFinal=${dataFinal}`;

        return blingApi._fetch(endpoint);
    },

    /**
     * Lê pedidos do cache local (tabela bling_pedidos no Supabase)
     * Muito mais rápido que buscar no Bling a cada acesso.
     */
    getLocalPedidos: async (dataInicial?: string, dataFinal?: string): Promise<any[]> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        let allData: any[] = [];
        let page = 0;
        let hasMore = true;

        while (hasMore) {
            let query = (supabase as any)
                .from('bling_pedidos')
                .select('*')
                .eq('user_id', user.id)
                .order('data', { ascending: false });

            if (dataInicial) query = query.gte('data', dataInicial);
            if (dataFinal) query = query.lte('data', dataFinal);

            query = query.range(page * 1000, (page + 1) * 1000 - 1);

            const { data, error } = await query;
            if (error) throw new Error('Erro ao ler pedidos locais: ' + error.message);

            if (data && data.length > 0) {
                allData = [...allData, ...data];
                page++;
            } else {
                hasMore = false;
            }
        }
        return allData;
    },

    /**
     * Dispara a Edge Function bling-sync para atualizar o cache local.
     * Retorna estatísticas da sincronização.
     */
    syncPedidosToLocal: async (dateStart?: string, dateEnd?: string, page?: number): Promise<{
        fetched: number; upserted: number; totalInDb: number; partial: boolean; nextPage: number | null; sync_status: string;
    }> => {
        const { data, error } = await supabase.functions.invoke('bling-sync', {
            body: { dateStart, dateEnd, page }
        });

        if (error) {
            console.error('Erro na sincronização Bling:', error);
            throw new Error(error.message || 'Erro na sincronização');
        }

        return data;
    },

    /**
     * Retorna os metadados da última sincronização (data, status, total)
     */
    getSyncMeta: async (): Promise<{ last_sync: string; total_rows: number; status: string } | null> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await (supabase as any)
            .from('bling_sync_meta')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) return null;
        return data;
    },

    updateSyncStatus: async (active: boolean) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await (supabase as any)
            .from('bling_sync_meta')
            .upsert({
                user_id: user.id,
                status: active ? 'active' : 'inactive',
                last_sync: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (error) throw error;
    },

    /**
     * Busca canais de venda (lojas integradas)
     */
    getCanaisVenda: () => {
        return blingApi._fetch('/canais-venda');
    },

    /**
     * Busca um contato específico pelo ID (completo com observações)
     */
    getContato: (id: number) => {
        return blingApi._fetch(`/contatos/${id}`);
    },

    /**
     * Normaliza nomes para comparação (remove acentos e caixa alta)
     */
    normalizeName: (name: string): string => {
        if (!name) return '';
        return name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
    },

    /**
     * Normaliza nomes de marcas para unificação (remove acentos e caixa alta)
     */
    normalizeBrand: (name: string): string => {
        if (!name) return 'Outros / Sem Marca';
        return name
            .normalize('NFD') // Decompõe acentos
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/[&]/g, ' ') // Trata & como espaço para unificar (Nini & Bambini = Nini Bambini)
            .replace(/\s+/g, ' ') // Remove espaços duplicados
            .trim()
            .toLowerCase();
    },

    /**
     * Extrai dados de filhos/família das observações
     */
    extractFamilyData: (observacao: string) => {
        if (!observacao) return [];
        const children: { nome: string; dataNascimento: string; idade: number }[] = [];
        const lines = observacao.split(/\n|,|;/);
        const dateRegex = /(\d{2})\/(\d{2})\/(\d{4})/;

        lines.forEach(line => {
            const match = line.match(dateRegex);
            if (match) {
                const dateStr = match[0];
                const name = line.replace(dateStr, '').replace(/[:\-–—]/g, '').trim();
                if (name) {
                    const [day, month, year] = dateStr.split('/').map(Number);
                    const birthDate = new Date(year, month - 1, day);
                    const today = new Date();
                    let age = today.getFullYear() - year;
                    const m = today.getMonth() - (month - 1);
                    if (m < 0 || (m === 0 && today.getDate() < day)) {
                        age--;
                    }
                    children.push({ nome: name, dataNascimento: dateStr, idade: age });
                }
            }
        });
        return children;
    },

    /**
     * Extrai a marca do nome do produto se o campo marca estiver vazio
     */
    extractBrandFromName: (name: string) => {
        if (!name) return 'Sem Marca';

        const knownBrands = [
            'Petit Cherie', 'Mon Sucré', 'Anjos Baby', 'Momi', 'Mini & Co', 'Kyly',
            'Milon', 'Bugbee', 'Siri', 'Alphabeto', 'Molekinha', 'Nini & Bambini',
            'King&Joe', 'Molekinho', 'Marlan', 'Grow Up', 'Jaca Lelé', 'Youccie',
            'Elian', 'Puket', 'Brandili', 'Lilica Ripilica', 'Tigor T. Tigre',
            'Marisol', 'Carinhoso', 'Hering Kids', 'Malwee Kids', 'Pulla Bulla',
            'Fakini', 'Tilli', 'Cativa', 'Kely Kety', 'Um Mais Um', '1+1', 'Bibe',
            'Lápis de Cor', 'Pimpolho', 'Klin', 'Tip Top', 'Up Baby', 'Tileesol',
            'Boca Grande', 'Rovitex', 'Kamylus', 'Trick Nick', 'Nanai', 'Alakazoo',
            'Colorittá', 'Mundi', 'Duduka', 'Duda Senne', 'Abrange', 'Angerô', 'Bee Loop',
            'Luluzinha', 'Oliver', 'Johnny Fox', 'Luluca', 'Lupo', 'Be Little', 'Carter\'s',
            'Winslow', 'Animê', 'Milli & Nina', 'Melissa', 'Nini & Bambini'
        ];

        // 1. Limpeza e quebra por linhas
        const lines = name.split('\n').map(l => l.trim()).filter(l => l);

        // 2. Tenta Match Direto por Marcas Conhecidas (Priority)
        const normalizedInput = blingApi.normalizeBrand(name);

        for (const brand of knownBrands) {
            const normalizedKnown = blingApi.normalizeBrand(brand);
            if (normalizedInput.includes(normalizedKnown)) {
                return brand; // Retorna a versão bonita (Capitalized) do array
            }
        }

        // 3. Tenta encontrar a marca na linha que contém gênero (ex: "Menina Bugbee")
        const genderKeywords = ['menina', 'menino', 'infantil', 'bebe', 'bebê', 'unissex', 'teen'];

        for (const line of lines) {
            const lowerLine = line.toLowerCase();

            for (const kw of genderKeywords) {
                // Tenta encontrar o padrão "Gênero Marca " (ex: "Menina Momi")
                if (lowerLine.startsWith(kw)) {
                    let brand = line.substring(kw.length).trim();
                    brand = brand.replace(/^[:\-–—\s/]+/, '').trim();

                    // Pega apenas a primeira palavra após o gênero como marca, 
                    // a menos que seja uma marca composta conhecida
                    if (brand) {
                        const words = brand.split(/\s+/);
                        const firstTwo = words.slice(0, 2).join(' ');
                        const isCompound = knownBrands.some(kb => kb.toLowerCase() === firstTwo.toLowerCase());

                        if (isCompound) return knownBrands.find(kb => kb.toLowerCase() === firstTwo.toLowerCase()) || firstTwo;
                        return words[0];
                    }
                }
            }
        }

        // Fallback 4: Tentar encontrar padrões como "Marca: XXXXX"
        for (const line of lines) {
            if (line.toLowerCase().includes('marca:')) {
                const parts = line.split(/marca:/i);
                if (parts[1]) return parts[1].trim();
            }
        }

        return 'Sem Marca';
    },

    /**
     * Busca contatos (clientes) com paginação
     */
    getContatos: (pagina = 1, limite = 100) => {
        return (blingApi as any)._fetch(`/contatos?pagina=${pagina}&limite=${limite}`);
    },

    /**
     * Busca produtos com paginação
     */
    getProdutos: (pagina = 1, limite = 100) => {
        return (blingApi as any)._fetch(`/produtos?pagina=${pagina}&limite=${limite}`);
    },

    /**
     * Sincroniza o catálogo de produtos para obter as marcas
     */
    syncAllProducts: async (onProgress?: (current: number) => void) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        let syncedCount = 0;
        let hasMore = true;
        let page = 1;

        console.log('Iniciando sincronização total de produtos do Bling...');

        while (hasMore) {
            const response = await blingApi.getProdutos(page, 100);

            // Tratamento de Erro da API Bling v3 (Via Proxy)
            if (response.error || response.errors) {
                const errorData = response.error || (response.errors && response.errors[0]);
                const msg = errorData?.message || errorData?.description || 'Erro na API do Bling';
                console.error(`Erro na página ${page}:`, response);
                throw new Error(`Erro do Bling: ${msg}. Certifique-se de que você desconectou e conectou novamente na aba "Conexão" para ativar as permissões de produtos.`);
            }

            const products = response.data || [];

            if (products.length === 0) {
                console.log(`Nenhum produto encontrado na página ${page}. Finalizando.`);
                hasMore = false;
                break;
            }

            const rows = products.map((p: any) => {
                let marca = p.marca?.trim() || '';

                // Se a marca estiver vazia, tenta extrair do nome
                if (!marca || marca.toLowerCase() === 'sem marca') {
                    marca = blingApi.extractBrandFromName(p.nome || '');
                }

                return {
                    id: p.id,
                    codigo: String(p.codigo || p.id).trim(),
                    nome: p.nome,
                    marca: marca,
                    user_id: user.id,
                    updated_at: new Date().toISOString()
                };
            });

            const { error: dbError } = await (supabase as any)
                .from('bling_produtos')
                .upsert(rows, { onConflict: 'id' });

            if (dbError) {
                console.error('Erro ao salvar produtos no banco:', dbError);
                throw new Error(`Erro de Banco: ${dbError.message}`);
            }

            syncedCount += rows.length;
            if (onProgress) onProgress(syncedCount);

            console.log(`Página ${page} sincronizada: ${rows.length} produtos.`);

            page++;
            if (page > 200) hasMore = false; // Suporta até 20.000 produtos
            await new Promise(r => setTimeout(r, 200));
        }

        return syncedCount;
    },

    reprocessBrands: async (onProgress?: (current: number, total: number) => void) => {
        const { data: products, error } = await (supabase as any)
            .from('bling_produtos')
            .select('*');

        if (error) throw error;
        if (!products || products.length === 0) return 0;

        let updatedCount = 0;
        const total = products.length;

        for (let i = 0; i < products.length; i++) {
            const p = products[i];
            const newMarca = blingApi.extractBrandFromName(p.nome || '');

            // Só atualiza se for diferente e não for "Sem Marca" (a menos que a antiga fosse vazia)
            if (newMarca !== p.marca && newMarca !== 'Sem Marca') {
                await (supabase as any)
                    .from('bling_produtos')
                    .update({ marca: newMarca, updated_at: new Date().toISOString() })
                    .eq('id', p.id);
                updatedCount++;
            }

            if (onProgress && i % 10 === 0) onProgress(i + 1, total);
        }

        return updatedCount;
    },

    /**
     * Calcula métricas de CRM (LTV, Ticket Médio, etc) a partir de uma lista de pedidos
     */
    calculateMetrics: (pedidos: any[], lojaNames?: Record<string, string>, brandFilter?: string, brandMap?: Record<string, string>) => {
        const customerMetrics: Record<string, {
            nome: string;
            contatoId: number | string;
            totalGasto: number;
            qtdPedidos: number;
            primeiraVenda: string;
            ultimaVenda: string;
            ultimaLojaId?: number | string;
            pedidos: any[];
        }> = {};

        const channelMetrics: Record<string, {
            nome: string;
            faturamento: number;
            qtdPedidos: number;
        }> = {};

        const evolutionMap: Record<string, number> = {};

        let totalFaturamento = 0;
        let totalPedidos = 0;
        let totalItems = 0;

        const normalizedFilter = brandFilter ? blingApi.normalizeBrand(brandFilter) : null;

        pedidos.forEach(p => {
            // Suporte a formato Bling API (p.situacao.id) ou Supabase Flat (p.situacao_id)
            const situacaoId = p.situacao?.id ?? p.situacao_id;
            const situacaoNome = p.situacao?.nome ?? p.situacao_nome;

            // Ignorar pedidos cancelados (ID 12 no Bling v3)
            if (situacaoId === 12) return;

            let orderValueForBrand = 0;
            let hasItemsOfBrand = false;

            // Se temos filtro de marca, precisamos olhar os itens
            if (normalizedFilter) {
                const itens = Array.isArray(p.itens) ? p.itens : (Array.isArray(p.itens?.data) ? p.itens.data : []);

                itens.forEach((item: any) => {
                    const sku = String(item.codigo || '').trim();
                    let itemMarca = (sku && brandMap?.[sku]) || '';

                    if (!itemMarca || itemMarca.toLowerCase() === 'sem marca' || itemMarca === 'Outros / Sem Marca' || itemMarca === 'N/A') {
                        const extracted = blingApi.extractBrandFromName(item.nome || item.descricao || '');
                        itemMarca = extracted !== 'Sem Marca' ? extracted : 'Outros / Sem Marca';
                    }

                    if (blingApi.normalizeBrand(itemMarca) === normalizedFilter) {
                        hasItemsOfBrand = true;
                        const itemValor = Number(item.valorUnidade || item.valor || 0) * Number(item.quantidade || 1);
                        orderValueForBrand += itemValor;
                    }
                });

                if (!hasItemsOfBrand) return; // Pula este pedido se não tiver a marca
            } else {
                orderValueForBrand = parseFloat(p.total || 0);
                hasItemsOfBrand = true;
            }

            totalFaturamento += orderValueForBrand;
            totalPedidos += 1;

            // Contabilizar itens
            const itens = Array.isArray(p.itens) ? p.itens : (Array.isArray(p.itens?.data) ? p.itens.data : []);
            itens.forEach((item: any) => {
                const sku = String(item.codigo || '').trim();
                let itemMarca = (sku && brandMap?.[sku]) || '';

                if (!itemMarca || itemMarca.toLowerCase() === 'sem marca' || itemMarca === 'Outros / Sem Marca' || itemMarca === 'N/A') {
                    const extracted = blingApi.extractBrandFromName(item.nome || item.descricao || '');
                    itemMarca = extracted !== 'Sem Marca' ? extracted : 'Outros / Sem Marca';
                }

                // Se houver filtro de marca, só conta itens dessa marca
                if (!normalizedFilter || blingApi.normalizeBrand(itemMarca) === normalizedFilter) {
                    totalItems += Number(item.quantidade || 1);
                }
            });

            // Métricas por Cliente
            const clienteId = p.contato?.id ?? p.contato_id;
            const clienteNome = p.contato?.nome ?? p.contato_nome;

            if (clienteId) {
                if (!customerMetrics[clienteId]) {
                    customerMetrics[clienteId] = {
                        nome: clienteNome || 'Cliente não identificado',
                        contatoId: clienteId,
                        totalGasto: 0,
                        qtdPedidos: 0,
                        primeiraVenda: p.data,
                        ultimaVenda: p.data,
                        ultimaLojaId: p.loja?.id ?? p.loja_id ?? 'padrão',
                        pedidos: []
                    };
                }

                customerMetrics[clienteId].totalGasto += orderValueForBrand;
                customerMetrics[clienteId].qtdPedidos += 1;
                customerMetrics[clienteId].pedidos.push(p);

                if (p.data > customerMetrics[clienteId].ultimaVenda) {
                    customerMetrics[clienteId].ultimaVenda = p.data;
                    customerMetrics[clienteId].ultimaLojaId = p.loja?.id ?? p.loja_id ?? 'padrão';
                }
                if (p.data < customerMetrics[clienteId].primeiraVenda) {
                    customerMetrics[clienteId].primeiraVenda = p.data;
                }
            }

            // Métricas por Canal (Loja)
            const lojaId = p.loja?.id ?? p.loja_id ?? 'padrão';
            const realLojaId = p.loja?.id ?? p.loja_id;

            const lojaNome = p.loja_descricao ||
                p.loja?.descricao ||
                (realLojaId ? (lojaNames?.[String(realLojaId)] || `Canal ${realLojaId}`) : 'Venda Direta / Outros');

            if (!channelMetrics[lojaId]) {
                channelMetrics[lojaId] = {
                    nome: lojaNome,
                    faturamento: 0,
                    qtdPedidos: 0
                };
            }
            channelMetrics[lojaId].faturamento += orderValueForBrand;
            channelMetrics[lojaId].qtdPedidos += 1;

            // Evolução Temporal
            if (p.data) {
                const dateParts = p.data.split('-');
                const displayDate = `${dateParts[2]}/${dateParts[1]}`; // DD/MM
                evolutionMap[displayDate] = (evolutionMap[displayDate] || 0) + orderValueForBrand;
            }
        });

        const sortedCustomers = Object.values(customerMetrics)
            .map((customer) => {
                const lifetimeMetrics = blingApi.calculateCustomerLifetimeMetrics({
                    totalSpent: customer.totalGasto,
                    totalOrders: customer.qtdPedidos,
                    firstPurchase: customer.primeiraVenda,
                    lastPurchase: customer.ultimaVenda,
                    margin: 0.3 // Default margin as requested
                });

                return {
                    ...customer,
                    ticketMedio: lifetimeMetrics.ticketMedio,
                    ltv: lifetimeMetrics.ltv,
                    ltvProfit: lifetimeMetrics.ltvProfit,
                    averageFrequency: lifetimeMetrics.averageFrequency,
                    retentionMonths: lifetimeMetrics.retentionMonths,
                };
            })
            .sort((a, b) => b.totalGasto - a.totalGasto);
        const sortedChannels = Object.values(channelMetrics).sort((a, b) => b.faturamento - a.faturamento);

        const ticketMedio = totalPedidos > 0 ? totalFaturamento / totalPedidos : 0;

        // Formata e ordena evolução (limitando aos últimos 30 pontos para não poluir)
        const evolution = Object.keys(evolutionMap)
            .sort((a, b) => {
                const [da, ma] = a.split('/').map(Number);
                const [db, mb] = b.split('/').map(Number);
                return (ma * 100 + da) - (mb * 100 + db);
            })
            .map(date => ({ date, total: evolutionMap[date] }));

        return {
            customers: sortedCustomers,
            channels: sortedChannels,
            totalFaturamento,
            ticketMedio,
            totalPedidos,
            totalItems,
            evolution
        };
    },

    /**
     * Retorna o intervalo de datas para um mês no formato "Mês YYYY" ou "YYYY-MM"
     */
    getMonthDateRange: (monthStr: string): { start: string; end: string } => {
        let year: number;
        let month: number;

        if (monthStr.includes(' ')) {
            // Formato "Mês YYYY"
            const [mesNome, anoStr] = monthStr.split(' ');
            const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            month = months.indexOf(mesNome);
            year = parseInt(anoStr);
        } else {
            // Formato "YYYY-MM"
            const [anoStr, mesStr] = monthStr.split('-');
            year = parseInt(anoStr);
            month = parseInt(mesStr) - 1;
        }

        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);

        const format = (d: Date) => d.toISOString().split('T')[0];

        return {
            start: format(start),
            end: format(end)
        };
    },

    /**
     * Calcula métricas semanais por canal para um determinado mês
     */
    getWeeklyChannelMetrics: (pedidos: any[], monthStr: string, lojaNames?: Record<string, string>, brandMap?: Record<string, string>) => {
        const { start } = blingApi.getMonthDateRange(monthStr);
        const startDate = new Date(start + 'T00:00:00');
        const year = startDate.getFullYear();
        const month = startDate.getMonth();

        // Define as 4 semanas (1-7, 8-14, 15-21, 22-fim)
        const weekBoundaries = [
            { start: new Date(year, month, 1), end: new Date(year, month, 7, 23, 59, 59) },
            { start: new Date(year, month, 8), end: new Date(year, month, 14, 23, 59, 59) },
            { start: new Date(year, month, 15), end: new Date(year, month, 21, 23, 59, 59) },
            { start: new Date(year, month, 22), end: new Date(year, month + 1, 0, 23, 59, 59) },
        ];

        const weeklyData: Record<string, any[]> = {
            week1: [],
            week2: [],
            week3: [],
            week4: [],
        };

        pedidos.forEach(p => {
            const pedidoDate = new Date(p.data + 'T12:00:00');
            weekBoundaries.forEach((boundary, idx) => {
                if (pedidoDate >= boundary.start && pedidoDate <= boundary.end) {
                    weeklyData[`week${idx + 1}`].push(p);
                }
            });
        });

        const results: Record<string, any> = {};
        Object.entries(weeklyData).forEach(([week, weekPedidos]) => {
            results[week] = blingApi.calculateMetrics(weekPedidos, lojaNames, undefined, brandMap);
        });

        return results;
    },

    /**
     * Sincroniza uma lista de clientes processados com o CRM do Supabase
     */
    syncCustomersToCRM: async (customers: any[], onProgress?: (current: number, total: number) => void) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        let syncedCount = 0;
        let childrenCount = 0;

        for (let i = 0; i < customers.length; i++) {
            const c = customers[i];
            if (onProgress) onProgress(i + 1, customers.length);

            try {
                // 1. Normalizar dados do cliente
                const firstPedido = c.pedidos?.[0];
                const name = c.nome;
                const phone = c.telefone || firstPedido?.contato?.celular || firstPedido?.contato?.fone || '';
                const email = c.email || firstPedido?.contato?.email || '';
                const cpf = c.cpf || firstPedido?.contato?.numeroDocumento || '';
                const city = c.cidade || firstPedido?.transporte?.contato?.cidade || '';
                const blingId = c.contatoId || firstPedido?.contato?.id || null;

                // Métricas calculadas
                const totalSpent = c.totalGasto || 0;
                const totalOrders = c.qtdPedidos || 0;
                const ticketMedio = totalOrders > 0 ? totalSpent / totalOrders : 0;
                const lastPurchase = c.ultimaVenda || null;
                const firstPurchase = c.primeiraVenda || null;
                const origin = c.vendaOrigem || null;

                const lifetimeMetrics = blingApi.calculateCustomerLifetimeMetrics({
                    totalSpent,
                    totalOrders,
                    firstPurchase,
                    lastPurchase,
                });
                const ltvFinal = lifetimeMetrics.ltv;

                // Determinar segmento RFM básico (será refinado pelo recalculateRFM)
                let segment = 'novo';
                if (totalSpent > 2000) segment = 'vip';
                else if (totalOrders > 3) segment = 'recorrente';

                // 2. Tentar encontrar cliente existente
                let existingCustomer: any = null;

                if (blingId) {
                    const { data } = await (supabase as any)
                        .from('growth_customers')
                        .select('id')
                        .eq('bling_id', blingId)
                        .eq('user_id', user.id)
                        .maybeSingle();
                    existingCustomer = data;
                }

                if (!existingCustomer && cpf && cpf.trim()) {
                    const { data } = await (supabase as any)
                        .from('growth_customers')
                        .select('id')
                        .eq('cpf', cpf.trim())
                        .eq('user_id', user.id)
                        .maybeSingle();
                    existingCustomer = data;
                }

                if (!existingCustomer && phone && phone.trim()) {
                    const { data } = await (supabase as any)
                        .from('growth_customers')
                        .select('id')
                        .eq('phone', phone.trim())
                        .eq('user_id', user.id)
                        .maybeSingle();
                    existingCustomer = data;
                }

                let customerId: string;

                const customerData = {
                    name,
                    email: email || null,
                    phone: phone || null,
                    cpf: cpf || null,
                    city: city || null,
                    bling_id: blingId ? Number(blingId) : null,
                    total_orders: totalOrders,
                    total_spent: totalSpent,
                    ticket_medio: ticketMedio,
                    ltv: ltvFinal,
                    rfm_segment: segment,
                    last_purchase_date: lastPurchase,
                    venda_origem: origin,
                    user_id: user.id,
                    updated_at: new Date().toISOString()
                };

                if (existingCustomer) {
                    customerId = existingCustomer.id;
                    await (supabase as any)
                        .from('growth_customers')
                        .update(customerData)
                        .eq('id', customerId);
                } else {
                    const { data, error } = await (supabase as any)
                        .from('growth_customers')
                        .insert([customerData])
                        .select('id')
                        .single();

                    if (error) throw error;
                    customerId = data.id;
                }

                syncedCount++;

                // 3. Processar filhos
                const allObservations = c.pedidos.map((p: any) => p.observacoes || '').join('\n');
                const familyData = blingApi.extractFamilyData(allObservations);

                for (const child of familyData) {
                    const dateParts = child.dataNascimento.split('/');
                    if (dateParts.length !== 3) continue;

                    const [d, m, y] = dateParts.map(Number);
                    const birthDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

                    const { data: existingChild } = await (supabase as any)
                        .from('children')
                        .select('id')
                        .eq('customer_id', customerId)
                        .eq('name', child.nome)
                        .maybeSingle();

                    if (!existingChild) {
                        await (supabase as any).from('children').insert([{
                            customer_id: customerId,
                            name: child.nome,
                            birth_date: birthDate,
                            gender: null,
                            user_id: user.id
                        }]);
                        childrenCount++;
                    }
                }
            } catch (error) {
                console.error(`Erro ao sincronizar cliente ${c.nome}:`, error);
            }
        }

        return { syncedCount, childrenCount };
    },

    /**
     * Sincroniza contatos do Bling para o CRM (Processo Lento/Batch)
     */
    syncAllContactsToCRM: async (onProgress?: (current: number, total: number) => void, limit?: number) => {
        let page = 1;
        let allBasicContatos: any[] = [];
        let hasMore = true;

        while (hasMore) {
            const response = await blingApi.getContatos(page, 100);
            const data = response.data || [];
            if (data.length > 0) {
                allBasicContatos = [...allBasicContatos, ...data];
                if (limit && allBasicContatos.length >= limit) {
                    allBasicContatos = allBasicContatos.slice(0, limit);
                    hasMore = false;
                    break;
                }
                page++;
                await new Promise(r => setTimeout(r, 200));
            } else {
                hasMore = false;
            }
        }

        let syncedCount = 0;
        let childrenCount = 0;
        const total = allBasicContatos.length;

        for (let i = 0; i < allBasicContatos.length; i++) {
            const basic = allBasicContatos[i];
            try {
                if (onProgress) onProgress(i + 1, total);

                const detailResponse = await blingApi.getContato(basic.id);
                const contact = detailResponse.data;
                if (!contact || !contact.nome) continue;

                const name = contact.nome?.trim() || '';
                const phone = (contact.celular || contact.telefone || '').trim();
                const email = (contact.email || '').trim();
                const cpf = (contact.numeroDocumento || '').trim();
                const city = (contact.endereco?.municipio || '').trim();
                const obs = (contact.obs || contact.observacoes || '').trim();
                const blingId = contact.id;

                if (!name) continue;

                let existingCustomer: any = null;

                if (blingId) {
                    const { data } = await (supabase as any)
                        .from('growth_customers')
                        .select('id')
                        .eq('bling_id', blingId)
                        .maybeSingle();
                    existingCustomer = data;
                }

                if (!existingCustomer && cpf) {
                    const { data } = await (supabase as any)
                        .from('growth_customers')
                        .select('id')
                        .eq('cpf', cpf)
                        .maybeSingle();
                    existingCustomer = data;
                }

                const contactFields = {
                    name,
                    email: email || null,
                    phone: phone || null,
                    cpf: cpf || null,
                    city: city || null,
                    bling_id: blingId ? Number(blingId) : null,
                    observacoes: obs || null,
                    updated_at: new Date().toISOString()
                };

                let customerId: string;

                if (existingCustomer) {
                    customerId = existingCustomer.id;
                    await (supabase as any)
                        .from('growth_customers')
                        .update(contactFields)
                        .eq('id', customerId);
                } else {
                    const { data, error } = await (supabase as any)
                        .from('growth_customers')
                        .insert([{
                            ...contactFields,
                            total_orders: 0,
                            total_spent: 0,
                            ticket_medio: 0,
                            ltv: 0,
                            rfm_segment: 'novo',
                            last_purchase_date: null
                        }])
                        .select('id')
                        .single();

                    if (error) throw error;
                    customerId = data.id;
                }

                syncedCount++;

                if (obs) {
                    const familyData = blingApi.extractFamilyData(obs);
                    for (const child of familyData) {
                        const dateParts = child.dataNascimento.split('/');
                        if (dateParts.length !== 3) continue;
                        const [d, m, y] = dateParts.map(Number);
                        if (!d || !m || !y) continue;
                        const birthDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

                        const { data: existingChild } = await (supabase as any)
                            .from('children')
                            .select('id')
                            .eq('customer_id', customerId)
                            .eq('name', child.nome)
                            .maybeSingle();

                        if (!existingChild) {
                            await (supabase as any).from('children').insert([{
                                customer_id: customerId,
                                name: child.nome,
                                birth_date: birthDate,
                                gender: null
                            }]);
                            childrenCount++;
                        }
                    }
                }

                await new Promise(r => setTimeout(r, 400));
            } catch (err) {
                console.error(`Erro ao sincronizar contato ${basic.id}:`, err);
            }
        }

        return { syncedCount, childrenCount };
    },

    /**
     * Recalcula a Matriz RFM para todos os clientes baseando-se no histórico de pedidos local (bling_pedidos)
     */
    recalculateRFM: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        console.log("Iniciando recálculo RFM consolidado para usuário:", user.id);

        // 1. Buscar todos os pedidos (em lotes)
        let allPedidos: any[] = [];
        let pedPage = 0;
        let hasMorePeds = true;

        while (hasMorePeds) {
            const { data, error } = await (supabase as any)
                .from('bling_pedidos')
                .select('contato_id, contato_nome, total, data, situacao_id')
                .eq('user_id', user.id)
                .range(pedPage * 1000, (pedPage + 1) * 1000 - 1);

            if (error) throw error;
            if (data && data.length > 0) {
                allPedidos = [...allPedidos, ...data];
                pedPage++;
            } else {
                hasMorePeds = false;
            }
        }

        if (allPedidos.length === 0) {
            console.log("Nenhum pedido encontrado no banco para este usuário");
            return 0;
        }

        // 2. Buscar todos os clientes do CRM (em lotes)
        let allCustomers: any[] = [];
        let custPage = 0;
        let hasMoreCusts = true;

        while (hasMoreCusts) {
            const { data, error } = await (supabase as any)
                .from('growth_customers')
                .select('id, name, bling_id')
                .eq('user_id', user.id)
                .range(custPage * 1000, (custPage + 1) * 1000 - 1);

            if (error) throw error;
            if (data && data.length > 0) {
                allCustomers = [...allCustomers, ...data];
                custPage++;
            } else {
                hasMoreCusts = false;
            }
        }

        if (allCustomers.length === 0) throw new Error("Nenhum cliente no CRM");

        // 3. Criar mapas de busca rápida
        const idMap: Record<string, string> = {};
        const nameMap: Record<string, string> = {};

        allCustomers.forEach(c => {
            idMap[String(c.id)] = c.id;
            if (c.bling_id) idMap[String(c.bling_id)] = c.id;
            if (c.name) nameMap[blingApi.normalizeName(c.name)] = c.id;
        });

        // 4. Consolidar por CustomerID (CRM)
        const consolidated: Record<string, {
            count: number,
            total: number,
            firstDate: Date,
            lastDate: Date,
            bling_id: number | null
        }> = {};

        allPedidos.forEach((p: any) => {
            if (p.situacao_id === 12) return; // Ignorar cancelados
            if (p.contato_nome?.toLowerCase().includes('consumidor final')) return; // Ignorar genérico

            // Tenta encontrar o cliente no CRM
            let cId = idMap[String(p.contato_id)];

            if (!cId && p.contato_nome) {
                const cleanName = blingApi.normalizeName(p.contato_nome);

                // Busca agressiva: encontrar todos que começam com esse nome e pegar o mais longo
                // Isso resolve o caso de existir "Genielly" e "Genielly Brito" (unifica no maior)
                const matches = allCustomers.filter(c => {
                    const normCustName = blingApi.normalizeName(c.name || '');
                    return normCustName.startsWith(cleanName) || cleanName.startsWith(normCustName);
                });

                if (matches.length > 0) {
                    // Ordenar por comprimento do nome decrescente para pegar o mais completo
                    const bestMatch = matches.sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0))[0];
                    cId = bestMatch.id;
                }
            }

            if (!cId) return;

            const pDate = new Date(p.data);
            const pTotal = Number(p.total || 0);

            if (!consolidated[cId]) {
                consolidated[cId] = {
                    count: 1,
                    total: pTotal,
                    firstDate: pDate,
                    lastDate: pDate,
                    bling_id: p.contato_id ? Number(p.contato_id) : null
                };
            } else {
                consolidated[cId].count += 1;
                consolidated[cId].total += pTotal;
                if (pDate > consolidated[cId].lastDate) {
                    consolidated[cId].lastDate = pDate;
                }
                if (pDate < consolidated[cId].firstDate) {
                    consolidated[cId].firstDate = pDate;
                }
            }
        });

        const now = new Date();
        let updatedCount = 0;

        // 5. Calcular RFM e Salvar para TODOS os clientes do usuário
        for (const customer of allCustomers) {
            const cId = customer.id;
            const stats = consolidated[cId];

            let updateFields: any;

            if (!stats || stats.count === 0) {
                // Reset metrics for customers with no orders
                updateFields = {
                    total_orders: 0,
                    total_spent: 0,
                    ltv: 0,
                    ticket_medio: 0,
                    last_purchase_date: null,
                    rfm_recency: 1,
                    rfm_frequency: 1,
                    rfm_monetary: 1,
                    rfm_segment: 'perdido',
                    updated_at: new Date().toISOString(),
                    bling_id: customer.bling_id
                };
            } else {
                // --- Recência (R) ---
                const diffDays = Math.floor((now.getTime() - stats.lastDate.getTime()) / (1000 * 60 * 60 * 24));
                let rScore = 1;
                if (diffDays <= 30) rScore = 5;
                else if (diffDays <= 90) rScore = 4;
                else if (diffDays <= 180) rScore = 3;
                else if (diffDays <= 365) rScore = 2;

                // --- Frequência (F) ---
                let fScore = 1;
                if (stats.count > 10) fScore = 5;
                else if (stats.count >= 6) fScore = 4;
                else if (stats.count >= 3) fScore = 3;
                else if (stats.count === 2) fScore = 2;

                // --- Monetário (M) ---
                let mScore = 1;
                if (stats.total > 5000) mScore = 5;
                else if (stats.total > 2000) mScore = 4;
                else if (stats.total > 1000) mScore = 3;
                else if (stats.total > 500) mScore = 2;

                // --- Definir Segmento ---
                const avgScore = (rScore + fScore + mScore) / 3;
                let segment = 'novo';

                if (rScore >= 4 && fScore >= 4 && mScore >= 4) segment = 'campeao';
                else if (rScore >= 3 && fScore >= 3 && mScore >= 3) segment = 'leal';
                else if (rScore >= 4 && fScore === 1) segment = 'novo';
                else if (rScore <= 2 && stats.count >= 2) segment = 'em_risco';
                else if (rScore === 1 && stats.count === 1) segment = 'perdido';
                else if (avgScore >= 4) segment = 'campeao';
                else if (avgScore >= 3) segment = 'recorrente';

                const lifetimeMetrics = blingApi.calculateCustomerLifetimeMetrics({
                    totalSpent: stats.total,
                    totalOrders: stats.count,
                    firstPurchase: stats.firstDate.toISOString(),
                    lastPurchase: stats.lastDate.toISOString(),
                });

                updateFields = {
                    total_orders: stats.count,
                    total_spent: stats.total,
                    ltv: lifetimeMetrics.ltv,
                    ticket_medio: lifetimeMetrics.ticketMedio,
                    last_purchase_date: stats.lastDate.toISOString().split('T')[0],
                    rfm_recency: rScore,
                    rfm_frequency: fScore,
                    rfm_monetary: mScore,
                    rfm_segment: segment,
                    updated_at: new Date().toISOString(),
                    bling_id: stats.bling_id
                };
            }

            const { error: errUpd } = await (supabase as any)
                .from('growth_customers')
                .update(updateFields)
                .eq('id', cId);

            if (!errUpd) updatedCount++;
        }

        return updatedCount;
    },

    /**
     * Calcula faturamento por marca cruzando os itens dos pedidos com o cache de produtos
     */
    getSalesByBrand: async (dataInicial?: string, dataFinal?: string) => {
        // 1. Pegar todos os pedidos no período
        const pedidos = await blingApi.getLocalPedidos(dataInicial, dataFinal);

        // 2. Pegar catálogo de marcas (cache)
        const { data: produtos } = await (supabase as any)
            .from('bling_produtos')
            .select('codigo, marca');

        const brandMap: Record<string, string> = {};
        produtos?.forEach((p: any) => {
            if (p.codigo) brandMap[p.codigo.trim()] = p.marca;
        });

        // 3. Agregar por marca
        const brandMetrics: Record<string, { label: string; faturamento: number; qtdItens: number }> = {};

        pedidos.forEach((p: any) => {
            // Ignorar cancelados (ID 12 no Bling v3)
            if (p.situacao_id === 12) return;

            // Suporta formato novo (array normalizado) ou antigo (p.itens.data)
            const itens = Array.isArray(p.itens) ? p.itens : (Array.isArray(p.itens?.data) ? p.itens.data : []);

            if (itens.length === 0) {
                // Se um pedido não tiver nenhum item (sync antigo), não descarta o faturamento
                const fallbackMarca = "Sem Detalhamento (Resync necessário)";
                const totalItem = Number(p.total || 0);
                const normName = blingApi.normalizeBrand(fallbackMarca);
                if (!brandMetrics[normName]) {
                    brandMetrics[normName] = { label: fallbackMarca, faturamento: 0, qtdItens: 0 };
                }
                brandMetrics[normName].faturamento += totalItem;
                brandMetrics[normName].qtdItens += 1;
                return;
            }

            itens.forEach((item: any) => {
                const sku = String(item.codigo || '').trim();

                // Camada 1: Se existir catálogo em bling_produtos, cruza pelo codigo do item
                let rawMarca = (sku && brandMap[sku]) || '';

                // Camada 2: Se não encontrar marca pelo catálogo, usa extractBrandFromName(item.nome)
                if (!rawMarca || rawMarca.toLowerCase() === 'sem marca' || rawMarca === 'Outros / Sem Marca' || rawMarca === 'N/A') {
                    const extracted = blingApi.extractBrandFromName(item.nome || item.descricao || '');
                    rawMarca = extracted !== 'Sem Marca' ? extracted : 'Outros / Sem Marca';
                }

                // Camada 3: Fallback para "Outros / Sem Marca" se ainda estiver vazio
                if (!rawMarca) rawMarca = 'Outros / Sem Marca';

                // UNIFICAÇÃO: Normalizamos para agrupar, mas mantemos o nome "bonito" no mapa se for uma marca conhecida
                const normName = blingApi.normalizeBrand(rawMarca);

                // Tenta achar o nome original "mais bonito" para exibição
                // Se já temos essa marca normalizada no grupo, somamos nela
                // Se não, criamos a entrada

                // Helper para encontrar o label de exibição:
                const displayLabel = rawMarca;

                if (!brandMetrics[normName]) {
                    brandMetrics[normName] = {
                        label: displayLabel,
                        faturamento: 0,
                        qtdItens: 0
                    };
                }

                // Se o label atual for "mais feio" (ex: tudo minúsculo) que o novo rawMarca, atualiza o label
                if (detailIsBetter(rawMarca, brandMetrics[normName].label)) {
                    brandMetrics[normName].label = rawMarca;
                }

                // Cálculo do valor do item suportando os dois campos possíveis
                const totalItem = Number(item.valorUnidade || item.valor || 0) * Number(item.quantidade || 1);

                brandMetrics[normName].faturamento += totalItem;
                brandMetrics[normName].qtdItens += Number(item.quantidade || 1);
            });
        });

        // Helper para decidir qual label é melhor (com acento vs sem, ou Capitalized vs lower)
        function detailIsBetter(newLabel: string, currentLabel: string) {
            if (!currentLabel) return true;
            if (newLabel.length > currentLabel.length) return true;
            // Se o novo tem acento e o antigo não
            const hasAccent = (str: string) => /[áàâãéèêíïóôõöúçñ]/i.test(str);
            if (hasAccent(newLabel) && !hasAccent(currentLabel)) return true;
            return false;
        }

        return Object.entries(brandMetrics)
            .map(([norm, stats]) => ({
                marca: stats.label,
                ...stats,
                ticketMedio: stats.qtdItens > 0 ? stats.faturamento / stats.qtdItens : 0
            }))
            .sort((a, b) => b.faturamento - a.faturamento);
    },

    /**
     * Agrega as vendas por produto (ranking de itens)
     */
    getSalesByProduct: async (dataInicial?: string, dataFinal?: string) => {
        const pedidos = await blingApi.getLocalPedidos(dataInicial, dataFinal);

        // Pegar catálogo de marcas para cruzamento
        const { data: produtos } = await (supabase as any)
            .from('bling_produtos')
            .select('codigo, marca');

        const brandMap: Record<string, string> = {};
        produtos?.forEach((p: any) => {
            if (p.codigo) brandMap[p.codigo.trim()] = p.marca;
        });

        const productMetrics: Record<string, { nome: string; codigo: string; marca: string; faturamento: number; qtd: number }> = {};

        pedidos.forEach((p: any) => {
            if (p.situacao_id === 12) return;

            const itens = Array.isArray(p.itens) ? p.itens : (Array.isArray(p.itens?.data) ? p.itens.data : []);

            itens.forEach((item: any) => {
                const sku = String(item.codigo || '').trim();
                const key = sku || item.nome || item.descricao;
                if (!key) return;

                if (!productMetrics[key]) {
                    // Camada 1: Catálogo
                    let marca = (sku && brandMap[sku]) || '';

                    // Camada 2: Heurística
                    if (!marca || marca.toLowerCase() === 'sem marca' || marca === 'Outros / Sem Marca' || marca === 'N/A') {
                        const extracted = blingApi.extractBrandFromName(item.nome || item.descricao || '');
                        marca = extracted !== 'Sem Marca' ? extracted : 'Outros / Sem Marca';
                    }

                    productMetrics[key] = {
                        nome: String(item.nome || item.descricao || 'Produto sem nome'),
                        codigo: sku,
                        marca: marca,
                        faturamento: 0,
                        qtd: 0
                    };
                }

                const totalItem = Number(item.valorUnidade || item.valor || 0) * Number(item.quantidade || 1);
                productMetrics[key].faturamento += totalItem;
                productMetrics[key].qtd += Number(item.quantidade || 1);
            });
        });

        return Object.values(productMetrics)
            .sort((a, b) => b.faturamento - a.faturamento);
    }
};
