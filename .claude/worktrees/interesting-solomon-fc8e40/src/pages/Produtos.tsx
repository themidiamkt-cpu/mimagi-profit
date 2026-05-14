import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Box, Search, Plus, Filter, Tag, Package, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface Product {
    id: string;
    codigo: string;
    nome: string;
    marca: string;
    preco?: number;
    categoria?: string;
    user_id: string;
}

const Produtos: React.FC = () => {
    const { user } = useAuthContext();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newProduct, setNewProduct] = useState({
        codigo: '',
        nome: '',
        marca: '',
        preco: '',
        categoria: ''
    });
    const [saving, setSaving] = useState(false);

    const fetchProducts = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
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

    const filteredProducts = (products || []).filter(p => {
        const nameMatch = (p.nome || '').toLowerCase().includes(searchTerm.toLowerCase());
        const codeMatch = (p.codigo || '').toLowerCase().includes(searchTerm.toLowerCase());
        const brandMatch = (p.marca || '').toLowerCase().includes(searchTerm.toLowerCase());
        return nameMatch || codeMatch || brandMatch;
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

            const { error } = await supabase
                .from('bling_produtos')
                .upsert({
                    id: parseInt(productId),
                    codigo: newProduct.codigo,
                    nome: newProduct.nome,
                    marca: newProduct.marca,
                    preco: newProduct.preco ? parseFloat(newProduct.preco) : null,
                    categoria: newProduct.categoria || null,
                    user_id: user.id
                });

            if (error) throw error;

            toast.success('Produto cadastrado com sucesso!');
            setIsAddDialogOpen(false);
            setNewProduct({ codigo: '', nome: '', marca: '', preco: '', categoria: '' });
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
                        <DialogContent className="sm:max-w-[425px]">
                            <form onSubmit={handleAddProduct}>
                                <DialogHeader>
                                    <DialogTitle>Novo Produto</DialogTitle>
                                    <DialogDescription>
                                        Adicione manualmente um produto ao seu catálogo.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="sku">SKU / Código</Label>
                                        <Input
                                            id="sku"
                                            value={newProduct.codigo}
                                            onChange={(e) => setNewProduct({ ...newProduct, codigo: e.target.value })}
                                            placeholder="Ex: PROD-001"
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Nome do Produto</Label>
                                        <Input
                                            id="name"
                                            value={newProduct.nome}
                                            onChange={(e) => setNewProduct({ ...newProduct, nome: e.target.value })}
                                            placeholder="Ex: Conjunto Floral 2 Peças"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="price">Preço (R$)</Label>
                                            <Input
                                                id="price"
                                                type="number"
                                                step="0.01"
                                                value={newProduct.preco}
                                                onChange={(e) => setNewProduct({ ...newProduct, preco: e.target.value })}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="category">Categoria</Label>
                                            <Input
                                                id="category"
                                                value={newProduct.categoria}
                                                onChange={(e) => setNewProduct({ ...newProduct, categoria: e.target.value })}
                                                placeholder="Ex: Vestidos"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="brand">Marca</Label>
                                        <Input
                                            id="brand"
                                            value={newProduct.marca}
                                            onChange={(e) => setNewProduct({ ...newProduct, marca: e.target.value })}
                                            placeholder="Ex: Milon"
                                            required
                                        />
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
                                <TableHead className="w-[120px]">SKU</TableHead>
                                <TableHead>Nome</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Marca</TableHead>
                                <TableHead className="text-right">Preço</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={3}>Carregando...</TableCell></TableRow>
                            ) : filteredProducts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-32 text-center text-slate-400">
                                        Nenhum produto encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProducts.map((product) => (
                                    <TableRow key={String(product.id)}>
                                        <TableCell>{product.codigo}</TableCell>
                                        <TableCell className="font-medium">{product.nome}</TableCell>
                                        <TableCell>{product.categoria || '-'}</TableCell>
                                        <TableCell>{product.marca}</TableCell>
                                        <TableCell className="text-right">
                                            {product.preco ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.preco) : '-'}
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
