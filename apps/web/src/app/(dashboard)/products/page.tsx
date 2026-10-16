'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Package, 
  PackagePlus,
  Tag, 
  TrendingUp, 
  Layers, 
  Edit, 
  Trash2, 
  X
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

export interface ProductItem {
  id: string;
  code: string;
  name: string;
  category: string;
  type: string;
  price: number;
  cost: number;
  stock?: number;
  description?: string;
  status: 'Ativo' | 'Inativo';
}

export default function ProductsPage() {
  const confirm = useConfirm();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formType, setFormType] = useState('Produto');
  const [formPrice, setFormPrice] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Carregar produtos do localStorage - ZERO exemplos pré-carregados
  useEffect(() => {
    try {
      const saved = localStorage.getItem('radar_custom_products');
      if (saved) {
        const parsed: ProductItem[] = JSON.parse(saved);
        // Remove quaisquer exemplos antigos padrão (PRD-001, PRD-002, PRD-003) se existirem
        const cleanList = Array.isArray(parsed)
          ? parsed.filter(p => !['PRD-001', 'PRD-002', 'PRD-003'].includes(p.id))
          : [];
        setProducts(cleanList);
        localStorage.setItem('radar_custom_products', JSON.stringify(cleanList));
      } else {
        setProducts([]);
        localStorage.setItem('radar_custom_products', JSON.stringify([]));
      }
    } catch {
      setProducts([]);
    }
    setIsLoaded(true);
  }, []);

  // Salvar no localStorage sempre que mudar
  const persistProducts = (newProducts: ProductItem[]) => {
    setProducts(newProducts);
    try {
      localStorage.setItem('radar_custom_products', JSON.stringify(newProducts));
    } catch (e) {
      console.error('Erro ao salvar produtos:', e);
    }
  };

  // Extrair categorias existentes dinamicamente
  const existingCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [products]);

  // Cálculos dinâmicos
  const totalItems = products.length;
  const activeItems = products.filter(p => p.status === 'Ativo').length;
  const avgMargin = products.length > 0 
    ? (products.reduce((acc, p) => acc + ((p.price - (p.cost || 0)) / (p.price || 1)) * 100, 0) / products.length).toFixed(1)
    : '0';

  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'Todas' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleOpenNew = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory('');
    setFormType('Produto');
    setFormPrice('');
    setFormCost('');
    setFormStock('');
    setFormDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: ProductItem) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormType(product.type);
    setFormPrice(product.price.toString());
    setFormCost(product.cost ? product.cost.toString() : '');
    setFormStock((product.stock !== undefined ? product.stock : '').toString());
    setFormDescription(product.description || '');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const target = products.find(p => p.id === id);
    const confirmed = await confirm({
      title: 'Excluir Item do Catálogo',
      description: target 
        ? `Tem certeza que deseja excluir "${target.name}"? Esta ação não pode ser desfeita.` 
        : 'Tem certeza que deseja excluir este item do catálogo?',
      confirmText: 'Sim, Excluir',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });

    if (confirmed) {
      persistProducts(products.filter(p => p.id !== id));
      toast.success('Item excluído com sucesso!');
    }
  };

  const handleClearAll = async () => {
    const confirmed = await confirm({
      title: 'Limpar Todos os Itens do Catálogo',
      description: 'Deseja remover todos os produtos e serviços cadastrados? Seu catálogo ficará totalmente zerado.',
      confirmText: 'Sim, Limpar Tudo',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });

    if (confirmed) {
      persistProducts([]);
      toast.success('Catálogo limpo com sucesso!');
    }
  };

  const handleSaveProduct = () => {
    if (!formName.trim() || !formPrice) {
      toast.error('Preencha o nome e o preço de venda');
      return;
    }

    const priceNum = parseFloat(formPrice.replace(',', '.')) || 0;
    const costNum = parseFloat(formCost.replace(',', '.')) || 0;
    const stockNum = formStock ? parseInt(formStock, 10) : undefined;
    const finalCategory = formCategory.trim() || 'Geral';

    if (editingProduct) {
      const updated = products.map(p => p.id === editingProduct.id ? {
        ...p,
        name: formName.trim(),
        category: finalCategory,
        type: formType,
        price: priceNum,
        cost: costNum,
        stock: formType === 'Produto' ? stockNum : undefined,
        description: formDescription.trim(),
      } : p);
      persistProducts(updated);
      toast.success('Item atualizado com sucesso!');
    } else {
      const novo: ProductItem = {
        id: `PRD-${Date.now().toString().slice(-6)}`,
        code: `${finalCategory.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
        name: formName.trim(),
        category: finalCategory,
        type: formType,
        price: priceNum,
        cost: costNum,
        stock: formType === 'Produto' ? stockNum : undefined,
        description: formDescription.trim(),
        status: 'Ativo',
      };
      persistProducts([novo, ...products]);
      toast.success('Item cadastrado com sucesso!');
    }

    setIsModalOpen(false);
    setEditingProduct(null);
  };

  if (!isLoaded) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse text-xs">
        Carregando catálogo...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Produtos & Serviços</h1>
            <Badge variant="outline" className="text-xs bg-muted/60 text-muted-foreground border-border">
              Catálogo Próprio
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs mt-1">
            Cadastre e gerencie de forma simples os produtos e serviços que sua empresa vende.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {products.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearAll}
              className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive h-9"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Limpar Catálogo
            </Button>
          )}

          <Button 
            onClick={handleOpenNew} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-sm h-9"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            + Novo Produto ou Serviço
          </Button>
        </div>
      </div>

      {/* Zero Examples / Empty State */}
      {products.length === 0 ? (
        <div className="bg-card rounded-2xl border border-dashed border-border p-12 text-center max-w-xl mx-auto my-8 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto mb-4">
            <PackagePlus className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Nenhum produto ou serviço cadastrado</h3>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
            Seu catálogo está completamente limpo e pronto para uso. Adicione apenas o que você realmente comercializa, sem exemplos complexos ou informações desnecessárias.
          </p>
          <div className="mt-6 flex justify-center">
            <Button 
              onClick={handleOpenNew}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md h-10 px-5"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Cadastrar Meu Primeiro Item
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Cards Simplificados */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="bg-card border-border shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Itens Cadastrados</p>
                  <h3 className="text-lg font-black text-foreground font-mono">
                    {totalItems} {totalItems === 1 ? 'item' : 'itens'}
                  </h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Margem Estimada</p>
                  <h3 className="text-lg font-black text-emerald-500 font-mono">{avgMargin}%</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Categorias</p>
                  <h3 className="text-lg font-black text-foreground font-mono">
                    {existingCategories.length} {existingCategories.length === 1 ? 'categoria' : 'categorias'}
                  </h3>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter & Search */}
          <div className="flex flex-col md:flex-row gap-3 bg-card p-3 rounded-xl border border-border items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input 
                type="text"
                className="w-full bg-background border border-border rounded-lg pl-9 pr-3 h-9 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Buscar por nome, código ou categoria..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {existingCategories.length > 1 && (
              <select 
                className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none w-full md:w-auto"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              >
                <option value="Todas">Todas as Categorias</option>
                {existingCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
          </div>

          {/* Products Table */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] uppercase bg-muted/40 text-muted-foreground border-b border-border font-bold">
                  <tr>
                    <th className="px-5 py-3">Código</th>
                    <th className="px-5 py-3">Item / Solução</th>
                    <th className="px-5 py-3">Categoria</th>
                    <th className="px-5 py-3">Tipo</th>
                    <th className="px-5 py-3">Preço de Venda</th>
                    <th className="px-5 py-3">Custo</th>
                    <th className="px-5 py-3">Margem</th>
                    <th className="px-5 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-muted-foreground">
                        <p className="text-xs">Nenhum resultado encontrado para a busca "{searchTerm}".</p>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map(item => {
                      const margin = item.price > 0 ? (((item.price - (item.cost || 0)) / item.price) * 100).toFixed(0) : '0';
                      return (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-3.5 font-mono text-muted-foreground">
                            {item.code}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-foreground">{item.name}</div>
                            {item.description && (
                              <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{item.description}</div>
                            )}
                            {item.stock !== undefined && (
                              <div className="text-[11px] text-muted-foreground font-normal">Estoque: {item.stock} un</div>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-foreground font-medium border border-border">
                              {item.category}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge variant={item.type === 'Mensalidade' ? 'default' : 'outline'} className="text-[10px]">
                              {item.type}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 font-bold text-foreground font-mono">
                            {formatCurrency(item.price)}
                            {item.type === 'Mensalidade' && <span className="text-[10px] text-muted-foreground ml-1">/mês</span>}
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground font-mono">
                            {item.cost ? formatCurrency(item.cost) : '—'}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="font-bold text-emerald-500 font-mono">
                              {margin}%
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                onClick={() => handleOpenEdit(item)}
                                title="Editar Item"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDelete(item.id)}
                                title="Excluir Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal Novo / Editar Item */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  {editingProduct ? 'Editar Item' : 'Cadastrar Produto ou Serviço'}
                </h2>
                <p className="text-xs text-muted-foreground">Preencha os dados de forma rápida e simples</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => { setIsModalOpen(false); setEditingProduct(null); }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Nome do Produto ou Serviço *</label>
                <input 
                  type="text" 
                  className="w-full h-9 bg-background border border-border rounded-lg px-3 mt-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none" 
                  placeholder="Nome do produto ou serviço"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Tipo de Venda</label>
                  <select 
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 mt-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    value={formType}
                    onChange={e => setFormType(e.target.value)}
                  >
                    <option value="Produto">Produto Físico</option>
                    <option value="Serviço">Serviço</option>
                    <option value="Mensalidade">Plano Mensal / Recorrência</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Categoria</label>
                  <input 
                    type="text" 
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 mt-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    placeholder="Ex: Geral, Manutenção, etc."
                    list="category-suggestions"
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                  />
                  <datalist id="category-suggestions">
                    {existingCategories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Preço de Venda (R$) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 mt-1 text-xs font-mono focus:ring-1 focus:ring-primary focus:outline-none" 
                    placeholder="0.00"
                    value={formPrice}
                    onChange={e => setFormPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Custo Estimado (R$) <span className="text-[10px] text-muted-foreground font-normal">(Opcional)</span></label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 mt-1 text-xs font-mono focus:ring-1 focus:ring-primary focus:outline-none" 
                    placeholder="0.00"
                    value={formCost}
                    onChange={e => setFormCost(e.target.value)}
                  />
                </div>
              </div>

              {formType === 'Produto' && (
                <div>
                  <label className="text-xs font-semibold text-foreground">Quantidade em Estoque <span className="text-[10px] text-muted-foreground font-normal">(Opcional)</span></label>
                  <input 
                    type="number" 
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 mt-1 text-xs font-mono focus:ring-1 focus:ring-primary focus:outline-none" 
                    placeholder="Ex: 10"
                    value={formStock}
                    onChange={e => setFormStock(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-foreground">Detalhes ou Observações <span className="text-[10px] text-muted-foreground font-normal">(Opcional)</span></label>
                <textarea 
                  rows={2}
                  className="w-full bg-background border border-border rounded-lg p-2.5 mt-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                  placeholder="Informações adicionais ou garantia..."
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => { setIsModalOpen(false); setEditingProduct(null); }}
              >
                Cancelar
              </Button>
              <Button 
                size="sm"
                onClick={handleSaveProduct}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              >
                {editingProduct ? 'Salvar Alterações' : 'Salvar Item'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
