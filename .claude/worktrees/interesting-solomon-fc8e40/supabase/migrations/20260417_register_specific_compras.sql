-- Register specific purchase records provided by the user
INSERT INTO public.compras (
    id, estacao, marca, valor_total, prazo_pagamento, num_entregas, 
    data_entrega_1, data_entrega_2, data_entrega_3, data_entrega_4, 
    created_at, updated_at, categoria, user_id, is_sapatos, qtd_pecas, planejamento_id
) VALUES 
(
    '26e15c20-1095-4b1e-b598-b425a4ee4528', 'Inverno', 'Mon sucré', 20440, 150, 4, 
    '2026-04-15', '2026-05-01', '2026-05-15', '2026-06-01', 
    '2026-04-16 23:20:39.86684+00', '2026-04-16 23:35:16.38751+00', 
    'menina', '688e07c7-2340-4a5b-b71d-7221f01d675e', false, 1,
    (SELECT id FROM public.planejamentos_financeiros WHERE user_id = '688e07c7-2340-4a5b-b71d-7221f01d675e' ORDER BY updated_at DESC LIMIT 1)
),
(
    '28479caf-fec6-45dc-b1ec-bf0792013940', 'Inverno', 'Mini Bear', 25200, 150, 4, 
    '2026-04-15', '2026-05-01', '2026-05-15', '2026-06-01', 
    '2026-04-16 23:20:39.86684+00', '2026-04-16 23:35:16.38751+00', 
    'menina', '688e07c7-2340-4a5b-b71d-7221f01d675e', false, 1,
    (SELECT id FROM public.planejamentos_financeiros WHERE user_id = '688e07c7-2340-4a5b-b71d-7221f01d675e' ORDER BY updated_at DESC LIMIT 1)
),
(
    '9442c256-68e5-40a9-a30e-2652428f7901', 'Inverno', 'Nini Bambini', 19393, 180, 4, 
    '2026-04-15', '2026-05-01', '2026-05-15', '2026-06-01', 
    '2026-04-16 23:20:39.86684+00', '2026-04-16 23:35:16.38751+00', 
    'menina', '688e07c7-2340-4a5b-b71d-7221f01d675e', false, 1,
    (SELECT id FROM public.planejamentos_financeiros WHERE user_id = '688e07c7-2340-4a5b-b71d-7221f01d675e' ORDER BY updated_at DESC LIMIT 1)
),
(
    '97e85381-172d-42e4-8464-499d8336f61b', 'Inverno', 'Petit Cherie', 33629, 150, 4, 
    '2026-04-15', '2026-05-01', '2026-05-15', '2026-06-01', 
    '2026-04-16 23:20:39.86684+00', '2026-04-16 23:35:16.38751+00', 
    'menina', '688e07c7-2340-4a5b-b71d-7221f01d675e', false, 1,
    (SELECT id FROM public.planejamentos_financeiros WHERE user_id = '688e07c7-2340-4a5b-b71d-7221f01d675e' ORDER BY updated_at DESC LIMIT 1)
),
(
    'ba17dcb6-8490-4470-b380-e80000e25ea4', 'Inverno', 'Nini Bambini', 12550, 180, 3, 
    '2026-03-01', '2026-03-15', '2026-04-01', NULL, 
    '2026-04-16 23:20:39.86684+00', '2026-04-16 23:35:16.38751+00', 
    'menina', '688e07c7-2340-4a5b-b71d-7221f01d675e', false, 1,
    (SELECT id FROM public.planejamentos_financeiros WHERE user_id = '688e07c7-2340-4a5b-b71d-7221f01d675e' ORDER BY updated_at DESC LIMIT 1)
)
ON CONFLICT (id) DO UPDATE SET
    valor_total = EXCLUDED.valor_total,
    marca = EXCLUDED.marca,
    num_entregas = EXCLUDED.num_entregas,
    updated_at = EXCLUDED.updated_at;
