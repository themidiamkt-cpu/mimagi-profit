import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Search, Plus, Package, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Product {
    id: string;
    codigo: string;
    nome: string;
    marca: string;
    preco?: number | null;
    categoria?: string | null;
    imagem_url?: string | null;
    descricao?: string | null;
    colecao?: string | null;
    tamanho?: string | null;
    cor?: string | null;
    genero?: string | null;
    custo?: number | null;
    estoque_atual?: number | null;
    estoque_minimo?: number | null;
    fornecedor?: string | null;
    codigo_barras?: string | null;
    ncm?: string | null;
    status?: string | null;
    observacoes?: string | null;
    user_id: string;
}

const emptyProductForm = {
    codigo: '',
    nome: '',
    marca: '',
    preco: '',
    categoria: '',
    imagem_url: '',
    descricao: '',
    colecao: '',
    tamanho: '',
    cor: '',
    genero: 'unissex',
    custo: '',
    estoque_atual: '',
    estoque_minimo: '',
    fornecedor: '',
    codigo_barras: '',
    ncm: '',
    status: 'ativo',
    observacoes: ''
};

const parseOptionalNumber = (value: string) => {
    if (!value.trim()) return null;
    const normalized = value.replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};

const formatMoney = (value?: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const Produtos: React.FC = () => {
    const { user } = useAuthContext();
    const productImageInputRef = useRef<HTMLInputElement | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newProduct, setNewProduct] = useState(emptyProductForm);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    const fetchProducts = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const { data, error } = await (supabase as any)
                .from('bling_produtos')
                .select('*')
                .eq('user_id', user.id);

            if (error) throw error;
            setProducts(data || []);
        } catch (error: any) {
            console.error('Erro ao buscar produtos:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchProducts();
    }, [user]);

    const filteredProducts = (products || []).filter((p) => {
        const query = searchTerm.toLowerCase();
        const haystack = [
            p.nome,
            p.codigo,
            p.marca,
            p.categoria,
            p.colecao,
            p.cor,
            p.tamanho,
            p.fornecedor,
            p.codigo_barras
        ].join(' ').toLowerCase();
        return haystack.includes(query);
    });

    const generateHashId = async (sku: string, userId: string) => {
        const input = `${userId}|${sku.toLowerCase().trim()}`;
        const msgUint8 = new TextEncoder().encode(input);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        let id = 0n;
        // Uso de 6 bytes para ficar dentro do limite do BIGINT do Postgres e Number.MAX_SAFE_INTEGER do JS
        for (let i = 0; i < 6; i++) {
            id = (id << 8n) | BigInt(hashArray[i]);
        }
        return id.toString();
    };

    const uploadProductImage = async (file: File) => {
        if (!user) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Selecione um arquivo de imagem.');
            return;
        }

        try {
            setUploadingImage(true);
            const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
            const safeSku = (newProduct.codigo || 'produto')
                .toLowerCase()
                .replace(/[^a-z0-9_-]+/g, '-')
                .replace(/^-+|-+$/g, '') || 'produto';
            const filePath = `${user.id}/${safeSku}-${Date.now()}.${extension}`;

            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);

            setNewProduct((current) => ({
                ...current,
                imagem_url: data.publicUrl,
            }));
            toast.success('Imagem enviada com sucesso!');
        } catch (error: any) {
            console.error('Erro ao enviar imagem do produto:', error);
            toast.error('Erro ao enviar imagem: ' + (error.message || 'verifique o bucket product-images'));
        } finally {
            setUploadingImage(false);
            if (productImageInputRef.current) productImageInputRef.current.value = '';
        }
    };

    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!newProduct.codigo || !newProduct.nome || !newProduct.marca) {
            toast.error('Preencha os campos obrigatórios (Código, Nome e Marca)');
            return;
        }

        try {
            setSaving(true);
            const productId = await generateHashId(newProduct.codigo, user.id);
            const productCode = newProduct.codigo.trim();
            const productPayload = {
                codigo: productCode,
                nome: newProduct.nome.trim(),
                marca: newProduct.marca.trim(),
                preco: parseOptionalNumber(newProduct.preco),
                categoria: newProduct.categoria || null,
                imagem_url: newProduct.imagem_url || null,
                descricao: newProduct.descricao || null,
                colecao: newProduct.colecao || null,
                tamanho: newProduct.tamanho || null,
                cor: newProduct.cor || null,
                genero: newProduct.genero || 'unissex',
                custo: parseOptionalNumber(newProduct.custo),
                estoque_atual: parseOptionalNumber(newProduct.estoque_atual),
                estoque_minimo: parseOptionalNumber(newProduct.estoque_minimo),
                fornecedor: newProduct.fornecedor || null,
                codigo_barras: newProduct.codigo_barras || null,
                ncm: newProduct.ncm || null,
                status: newProduct.status || 'ativo',
                observacoes: newProduct.observacoes || null,
                user_id: user.id
            };

            const { data: existingProduct, error: findError } = await (supabase as any)
                .from('bling_produtos')
                .select('id')
                .eq('user_id', user.id)
                .eq('codigo', productCode)
                .maybeSingle();

            if (findError) throw findError;

            const { error } = existingProduct?.id
                ? await (supabase as any)
                    .from('bling_produtos')
                    .update(productPayload)
                    .eq('id', existingProduct.id)
                    .eq('user_id', user.id)
                : await (supabase as any)
                    .from('bling_produtos')
                    .insert({
                    id: parseInt(productId),
                    ...productPayload
                });

            if (error) throw error;

            toast.success(existingProduct?.id ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!');
            setIsAddDialogOpen(false);
            setNewProduct(emptyProductForm);
            fetchProducts();
        } catch (error: any) {
            console.error('Erro ao cadastrar produto:', error);
            toast.error('Erro ao cadastrar: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const totalBrands = new Set((products || []).map(p => p.marca || 'Sem Marca')).size;

    return (
        <div className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-1">Catálogo de Produtos</h1>
                    <p className="text-slate-500">Gerencie seu catálogo mestre de produtos e variações.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-lg">
                                <Plus className="h-4 w-4" />
                                Novo Produto
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[920px] max-h-[90vh] overflow-y-auto">
                            <form onSubmit={handleAddProduct}>
                                <DialogHeader>
                                    <DialogTitle>Novo Produto</DialogTitle>
                                    <DialogDescription>
                                        Cadastre imagem, dados comerciais, estoque e identificação do produto.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-6 py-5 lg:grid-cols-[260px_1fr]">
                                    <div className="space-y-4">
                                        <button
                                            type="button"
                                            className="group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border bg-slate-50 transition hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
                                            onClick={() => productImageInputRef.current?.click()}
                                        >
                                            {newProduct.imagem_url ? (
                                                <img
                                                    src={newProduct.imagem_url}
                                                    alt="Prévia do produto"
                                                    className="h-full w-full object-cover"
                                                    onError={(event) => {
                                                        event.currentTarget.style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center gap-3 text-slate-400">
                                                    <ImageIcon className="h-12 w-12" />
                                                    <span className="text-sm">{uploadingImage ? 'Enviando...' : 'Clique para enviar imagem'}</span>
                                                </div>
                                            )}
                                            {newProduct.imagem_url && (
                                                <div className="absolute inset-x-0 bottom-0 bg-black/55 px-3 py-2 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                                                    {uploadingImage ? 'Enviando...' : 'Trocar imagem'}
                                                </div>
                                            )}
                                        </button>
                                        <input
                                            ref={productImageInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(event) => {
                                                const file = event.target.files?.[0];
                                                if (file) uploadProductImage(file);
                                            }}
                                        />
                                        <div className="grid gap-2">
                                            <Label htmlFor="image">URL da imagem</Label>
                                            <Input
                                                id="image"
                                                value={newProduct.imagem_url}
                                                onChange={(e) => setNewProduct({ ...newProduct, imagem_url: e.target.value })}
                                                placeholder="https://..."
                                                disabled={uploadingImage}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="status">Status</Label>
                                            <Select
                                                value={newProduct.status}
                                                onValueChange={(value) => setNewProduct({ ...newProduct, status: value })}
                                            >
                                                <SelectTrigger id="status">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ativo">Ativo</SelectItem>
                                                    <SelectItem value="pausado">Pausado</SelectItem>
                                                    <SelectItem value="inativo">Inativo</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-5">
                                        <div className="grid gap-4 md:grid-cols-3">
                                            <div className="grid gap-2">
                                                <Label htmlFor="sku">SKU / Código</Label>
                                                <Input
                                                    id="sku"
                                                    value={newProduct.codigo}
                                                    onChange={(e) => setNewProduct({ ...newProduct, codigo: e.target.value })}
                                                    placeholder="PROD-001"
                                                    required
                                                />
                                            </div>
                                            <div className="grid gap-2 md:col-span-2">
                                                <Label htmlFor="name">Nome do produto</Label>
                                                <Input
                                                    id="name"
                                                    value={newProduct.nome}
                                                    onChange={(e) => setNewProduct({ ...newProduct, nome: e.target.value })}
                                                    placeholder="Conjunto Floral 2 Peças"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-3">
                                            <div className="grid gap-2">
                                                <Label htmlFor="brand">Marca</Label>
                                                <Input
                                                    id="brand"
                                                    value={newProduct.marca}
                                                    onChange={(e) => setNewProduct({ ...newProduct, marca: e.target.value })}
                                                    placeholder="Milon"
                                                    required
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="category">Categoria</Label>
                                                <Input
                                                    id="category"
                                                    value={newProduct.categoria}
                                                    onChange={(e) => setNewProduct({ ...newProduct, categoria: e.target.value })}
                                                    placeholder="Vestidos"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="collection">Coleção</Label>
                                                <Input
                                                    id="collection"
                                                    value={newProduct.colecao}
                                                    onChange={(e) => setNewProduct({ ...newProduct, colecao: e.target.value })}
                                                    placeholder="Inverno 2026"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="size">Tamanho</Label>
                                                <Input
                                                    id="size"
                                                    value={newProduct.tamanho}
                                                    onChange={(e) => setNewProduct({ ...newProduct, tamanho: e.target.value })}
                                                    placeholder="4, 6, 8..."
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="color">Cor</Label>
                                                <Input
                                                    id="color"
                                                    value={newProduct.cor}
                                                    onChange={(e) => setNewProduct({ ...newProduct, cor: e.target.value })}
                                                    placeholder="Rosa"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="audience">Público</Label>
                                                <Select
                                                    value={newProduct.genero}
                                                    onValueChange={(value) => setNewProduct({ ...newProduct, genero: value })}
                                                >
                                                    <SelectTrigger id="audience">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="unissex">Unissex</SelectItem>
                                                        <SelectItem value="menina">Menina</SelectItem>
                                                        <SelectItem value="menino">Menino</SelectItem>
                                                        <SelectItem value="bebe">Bebê</SelectItem>
                                                        <SelectItem value="adulto">Adulto</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="supplier">Fornecedor</Label>
                                                <Input
                                                    id="supplier"
                                                    value={newProduct.fornecedor}
                                                    onChange={(e) => setNewProduct({ ...newProduct, fornecedor: e.target.value })}
                                                    placeholder="Fornecedor"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="price">Preço venda (R$)</Label>
                                                <Input
                                                    id="price"
                                                    type="number"
                                                    step="0.01"
                                                    value={newProduct.preco}
                                                    onChange={(e) => setNewProduct({ ...newProduct, preco: e.target.value })}
                                                    placeholder="0,00"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="cost">Custo (R$)</Label>
                                                <Input
                                                    id="cost"
                                                    type="number"
                                                    step="0.01"
                                                    value={newProduct.custo}
                                                    onChange={(e) => setNewProduct({ ...newProduct, custo: e.target.value })}
                                                    placeholder="0,00"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="stock">Estoque atual</Label>
                                                <Input
                                                    id="stock"
                                                    type="number"
                                                    step="1"
                                                    value={newProduct.estoque_atual}
                                                    onChange={(e) => setNewProduct({ ...newProduct, estoque_atual: e.target.value })}
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="min-stock">Estoque mínimo</Label>
                                                <Input
                                                    id="min-stock"
                                                    type="number"
                                                    step="1"
                                                    value={newProduct.estoque_minimo}
                                                    onChange={(e) => setNewProduct({ ...newProduct, estoque_minimo: e.target.value })}
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="grid gap-2">
                                                <Label htmlFor="barcode">Código de barras</Label>
                                                <Input
                                                    id="barcode"
                                                    value={newProduct.codigo_barras}
                                                    onChange={(e) => setNewProduct({ ...newProduct, codigo_barras: e.target.value })}
                                                    placeholder="EAN / GTIN"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="ncm">NCM</Label>
                                                <Input
                                                    id="ncm"
                                                    value={newProduct.ncm}
                                                    onChange={(e) => setNewProduct({ ...newProduct, ncm: e.target.value })}
                                                    placeholder="00000000"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="description">Descrição</Label>
                                            <Textarea
                                                id="description"
                                                value={newProduct.descricao}
                                                onChange={(e) => setNewProduct({ ...newProduct, descricao: e.target.value })}
                                                placeholder="Descrição comercial do produto"
                                                rows={3}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="notes">Observações internas</Label>
                                            <Textarea
                                                id="notes"
                                                value={newProduct.observacoes}
                                                onChange={(e) => setNewProduct({ ...newProduct, observacoes: e.target.value })}
                                                placeholder="Informações de compra, grade, reposição ou venda"
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={saving}>
                                        {saving ? 'Salvando...' : 'Salvar Produto'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription>Total de Produtos</CardDescription>
                        <CardTitle className="text-2xl">{products?.length || 0}</CardTitle>
                    </CardHeader>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription>Total de Marcas</CardDescription>
                        <CardTitle className="text-2xl">{totalBrands}</CardTitle>
                    </CardHeader>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription>Status</CardDescription>
                        <CardTitle className="text-xl">Ativo</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Card className="shadow-md">
                <CardHeader className="pb-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Pesquisar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Produto</TableHead>
                                <TableHead className="w-[120px]">SKU</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Marca</TableHead>
                                <TableHead>Estoque</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Preço</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={7}>Carregando...</TableCell></TableRow>
                            ) : filteredProducts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-slate-400">
                                        Nenhum produto encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProducts.map((product) => (
                                    <TableRow key={String(product.id)}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-slate-50">
                                                    {product.imagem_url ? (
                                                        <img src={product.imagem_url} alt={product.nome} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <Package className="h-5 w-5 text-slate-400" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-medium text-slate-900">{product.nome}</div>
                                                    <div className="truncate text-xs text-slate-500">
                                                        {[product.cor, product.tamanho, product.colecao].filter(Boolean).join(' · ') || product.descricao || 'Sem detalhes'}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{product.codigo}</TableCell>
                                        <TableCell>{product.categoria || '-'}</TableCell>
                                        <TableCell>{product.marca}</TableCell>
                                        <TableCell>
                                            {product.estoque_atual ?? '-'}
                                            {product.estoque_minimo !== null && product.estoque_minimo !== undefined ? (
                                                <span className="text-xs text-slate-400"> / mín. {product.estoque_minimo}</span>
                                            ) : null}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={product.status === 'ativo' ? 'default' : 'secondary'}>
                                                {product.status || 'ativo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatMoney(product.preco)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default Produtos;
