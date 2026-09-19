'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Package, Tag, TrendingUp, Layers, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface ProductItem {
  id: string;
  code: string;
  name: string;
  category: 'CFTV' | 'Alarmes' | 'Controle de Acesso' | 'Serviços de TI' | 'Desenvolvimento';
  type: 'Produto' | 'Serviço' | 'Mensalidade';
  price: number;
  cost: number;
  stock?: number;
  status: 'Ativo' | 'Inativo';
}

const INITIAL_PRODUCTS: ProductItem[] = typeof window !== 'undefined' && localStorage.getItem('system_reset') === 'true' ? [] : [
  {
    id: 'PRD-001',
    code: 'CFTV-CAM-IP4M',
    name: 'Câmera IP Bullet 4MP Infravermelho 30m',
    category: 'CFTV',
    type: 'Produto',
    price: 480,
    cost: 260,
    stock: 24,
    status: 'Ativo',
  },
  {
    id: 'PRD-002',
    code: 'CFTV-NVR-16CH',
    name: 'NVR Gravador Digital 16 Canais 4K',
    category: 'CFTV',
    type: 'Produto',
    price: 1850,
    cost: 1100,
    stock: 8,
    status: 'Ativo',
  },
  {
    id: 'PRD-003',
    code: 'ALM-CENTRAL-IP',
    name: 'Central de Alarme Monitorada IP/GPRS',
    category: 'Alarmes',
    type: 'Produto',
    price: 920,
    cost: 510,
    stock: 12,
    status: 'Ativo',
  },
  {
    id: 'PRD-004',
    code: 'SRV-MONIT-24H',
    name: 'Mensalidade de Monitoramento de Alarme 24h',
    category: 'Alarmes',
    type: 'Mensalidade',
    price: 250,
    cost: 45,
    status: 'Ativo',
  },
  {
    id: 'PRD-005',
    code: 'ACC-FACIAL-01',
    name: 'Terminal de Reconhecimento Facial Biométrico',
    category: 'Controle de Acesso',
    type: 'Produto',
    price: 2400,
    cost: 1450,
    stock: 6,
    status: 'Ativo',
  },
  {
    id: 'PRD-006',
    code: 'TI-FORMAT-PC',
    name: 'Formatação e Otimização de PC/Notebook + Backup',
    category: 'Serviços de TI',
    type: 'Serviço',
    price: 150,
    cost: 20,
    status: 'Ativo',
  },
  {
    id: 'PRD-007',
    code: 'DEV-LANDING-PAGE',
    name: 'Criação de Landing Page de Alta Conversão',
    category: 'Desenvolvimento',
    type: 'Serviço',
    price: 1800,
    cost: 300,
    status: 'Ativo',
  },
  {
    id: 'PRD-008',
    code: 'SRV-MANUT-CFTV',
    name: 'Plano Mensal de Manutenção Preventiva CFTV',
    category: 'CFTV',
    type: 'Mensalidade',
    price: 650,
    cost: 120,
    status: 'Ativo',
  }
];

export default function ProductsPage() {
  const confirm = useConfirm();
  const [products, setProducts] = useState<ProductItem[]>(INITIAL_PRODUCTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ProductItem['category']>('CFTV');
  const [formType, setFormType] = useState<ProductItem['type']>('Produto');
  const [formPrice, setFormPrice] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formStock, setFormStock] = useState('10');

  // Cálculos dinâmicos
  const totalItems = products.length;
  const activeItems = products.filter(p => p.status === 'Ativo').length;
  const avgMargin = products.length > 0 
    ? (products.reduce((acc, p) => acc + ((p.price - p.cost) / (p.price || 1)) * 100, 0) / products.length).toFixed(1)
    : '0';

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'Todas' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleOpenNew = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory('CFTV');
    setFormType('Produto');
    setFormPrice('');
    setFormCost('');
    setFormStock('10');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: ProductItem) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormType(product.type);
    setFormPrice(product.price.toString());
    setFormCost(product.cost.toString());
    setFormStock((product.stock || 0).toString());
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const target = products.find(p => p.id === id);
    const confirmed = await confirm({
      title: 'Remover Item do Catálogo',
      description: target 
        ? `Tem certeza que deseja remover "${target.name}" (${target.code}) do catálogo?` 
        : 'Tem certeza que deseja remover este item do catálogo?',
      confirmText: 'Remover Item',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });

    if (confirmed) {
      setProducts(products.filter(p => p.id !== id));
      toast.success('Produto/Serviço removido com sucesso!');
    }
  };

  const handleSaveProduct = () => {
    if (!formName.trim() || !formPrice) {
      toast.error('Preencha o nome e o preço de venda');
      return;
    }

    const priceNum = parseFloat(formPrice) || 0;
    const costNum = parseFloat(formCost) || 0;
    const stockNum = parseInt(formStock, 10) || 0;

    if (editingProduct) {
      setProducts(products.map(p => p.id === editingProduct.id ? {
        ...p,
        name: formName,
        category: formCategory,
        type: formType,
        price: priceNum,
        cost: costNum,
        stock: formType === 'Produto' ? stockNum : undefined,
      } : p));
      toast.success('Item atualizado com sucesso!');
    } else {
      const novo: ProductItem = {
        id: `PRD-${String(products.length + 1).padStart(3, '0')}`,
        code: `${formCategory.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
        name: formName,
        category: formCategory,
        type: formType,
        price: priceNum,
        cost: costNum,
        stock: formType === 'Produto' ? stockNum : undefined,
        status: 'Ativo',
      };
      setProducts([novo, ...products]);
      toast.success('Novo item cadastrado no catálogo!');
    }

    setIsModalOpen(false);
    setEditingProduct(null);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Produtos e Serviços</h1>
          <p className="text-muted-foreground">Catálogo comercial de soluções em segurança e tecnologia</p>
        </div>
        <Button onClick={handleOpenNew}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto / Serviço
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-primary/20 p-3 rounded-full text-primary">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Itens no Catálogo</p>
              <h3 className="text-2xl font-bold text-foreground">{totalItems} itens ({activeItems} ativos)</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-success/20 p-3 rounded-full text-success">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Margem de Lucro Média</p>
              <h3 className="text-2xl font-bold text-success">{avgMargin}%</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-amber-500/20 p-3 rounded-full text-amber-500">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Categorias Ativas</p>
              <h3 className="text-2xl font-bold text-foreground">5 categorias de soluções</h3>
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
            className="w-full bg-background border border-border rounded-md pl-9 pr-3 h-9 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Buscar por produto, serviço ou código SKU..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none w-full md:w-auto"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="Todas">Todas as Categorias</option>
          <option value="CFTV">CFTV</option>
          <option value="Alarmes">Alarmes</option>
          <option value="Controle de Acesso">Controle de Acesso</option>
          <option value="Serviços de TI">Serviços de TI</option>
          <option value="Desenvolvimento">Desenvolvimento</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-accent/50 text-muted-foreground border-b border-border">
              <tr>
                <th className="px-6 py-4">Código / SKU</th>
                <th className="px-6 py-4">Item / Solução</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Preço de Venda</th>
                <th className="px-6 py-4">Custo</th>
                <th className="px-6 py-4">Margem</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                    Nenhum produto ou serviço encontrado.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(item => {
                  const margin = item.price > 0 ? (((item.price - item.cost) / item.price) * 100).toFixed(0) : '0';
                  return (
                    <tr key={item.id} className="border-b border-border hover:bg-cardHover transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                        {item.code}
                      </td>
                      <td className="px-6 py-4 font-bold text-foreground">
                        {item.name}
                        {item.stock !== undefined && (
                          <div className="text-xs font-normal text-muted-foreground">Estoque: {item.stock} un</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2.5 py-1 rounded bg-primary/10 text-primary font-medium">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={item.type === 'Mensalidade' ? 'default' : 'outline'}>
                          {item.type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-bold text-foreground">
                        {formatCurrency(item.price)}
                        {item.type === 'Mensalidade' && <span className="text-xs text-muted-foreground">/mês</span>}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {formatCurrency(item.cost)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-success">
                          {margin}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handleOpenEdit(item)}
                            title="Editar Item"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(item.id)}
                            title="Excluir Item"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Modal Novo / Editar Item */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full max-w-lg rounded-xl border border-border shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-4">{editingProduct ? 'Editar Solução' : 'Novo Produto ou Serviço'}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Nome do Produto ou Serviço</label>
                <input 
                  type="text" 
                  className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1" 
                  placeholder="Ex: Câmera Dome IP 2MP"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Categoria</label>
                  <select 
                    className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1"
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as any)}
                  >
                    <option value="CFTV">CFTV</option>
                    <option value="Alarmes">Alarmes</option>
                    <option value="Controle de Acesso">Controle de Acesso</option>
                    <option value="Serviços de TI">Serviços de TI</option>
                    <option value="Desenvolvimento">Desenvolvimento</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Tipo</label>
                  <select 
                    className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1"
                    value={formType}
                    onChange={e => setFormType(e.target.value as any)}
                  >
                    <option value="Produto">Produto Físico</option>
                    <option value="Serviço">Mão de Obra / Serviço</option>
                    <option value="Mensalidade">Plano Recorrente / Mensal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Preço de Venda (R$)</label>
                  <input 
                    type="number" 
                    className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1" 
                    placeholder="0,00"
                    value={formPrice}
                    onChange={e => setFormPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Custo Estimado (R$)</label>
                  <input 
                    type="number" 
                    className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1" 
                    placeholder="0,00"
                    value={formCost}
                    onChange={e => setFormCost(e.target.value)}
                  />
                </div>
              </div>

              {formType === 'Produto' && (
                <div>
                  <label className="text-sm text-muted-foreground">Quantidade em Estoque</label>
                  <input 
                    type="number" 
                    className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1" 
                    placeholder="Ex: 10"
                    value={formStock}
                    onChange={e => setFormStock(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => { setIsModalOpen(false); setEditingProduct(null); }}>
                Cancelar
              </Button>
              <Button onClick={handleSaveProduct}>
                {editingProduct ? 'Salvar Alterações' : 'Cadastrar Item'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
