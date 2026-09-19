export interface CategoryInfo {
  category: string;
  subcategory: string;
  icon: string;
  color: string;
  badge: string;
}

// Preset metadata map for standard subcategories
const PRESET_SUBCATEGORIES: Record<string, { category: string; icon: string; color: string; badge: string }> = {
  'Padaria': { category: 'Alimentação', icon: 'Store', color: '#F59E0B', badge: '🥖 Padaria' },
  'Pet Shop': { category: 'Serviços Pet', icon: 'Store', color: '#10B981', badge: '🐾 Pet Shop' },
  'Barbearia': { category: 'Beleza & Estética', icon: 'Scissors', color: '#8B5CF6', badge: '💈 Barbearia' },
  'Salão & Estética': { category: 'Beleza & Estética', icon: 'Sparkles', color: '#EC4899', badge: '💇 Salão & Estética' },
  'Farmácia': { category: 'Saúde', icon: 'Pill', color: '#06B6D4', badge: '💊 Farmácia' },
  'Supermercado': { category: 'Varejo & Comércio', icon: 'ShoppingCart', color: '#3B82F6', badge: '🛒 Supermercado' },
  'Restaurante': { category: 'Alimentação', icon: 'Utensils', color: '#EF4444', badge: '🍽️ Restaurante' },
  'Lanchonete': { category: 'Alimentação', icon: 'Utensils', color: '#F97316', badge: '🍔 Lanchonete' },
  'Academia': { category: 'Esportes & Lazer', icon: 'Dumbbell', color: '#F97316', badge: '🏋️ Academia' },
  'Oficina & Auto': { category: 'Automotivo', icon: 'Wrench', color: '#64748B', badge: '🚗 Auto & Oficina' },
  'Clínica & Consultório': { category: 'Saúde', icon: 'Stethoscope', color: '#14B8A6', badge: '🩺 Saúde & Clínica' },
  'Odontologia': { category: 'Saúde', icon: 'Stethoscope', color: '#0284C7', badge: '🦷 Odontologia' },
  'Hotel & Hospedagem': { category: 'Turismo & Hotelaria', icon: 'Building2', color: '#6366F1', badge: '🏨 Hotel & Hospedagem' },
  'Educação & Escolas': { category: 'Educação', icon: 'GraduationCap', color: '#4F46E5', badge: '🎓 Educação & Escolas' },
  'Moda & Roupas': { category: 'Moda & Vestuário', icon: 'ShoppingBag', color: '#D946EF', badge: '👗 Moda & Roupas' },
  'Imobiliária': { category: 'Imóveis & Condomínios', icon: 'Building2', color: '#84CC16', badge: '🏠 Imobiliária' },
  'Condomínio': { category: 'Imóveis & Condomínios', icon: 'Building2', color: '#84CC16', badge: '🏢 Condomínio' },
  'Gráfica & Impressão': { category: 'Serviços B2B', icon: 'Printer', color: '#0EA5E9', badge: '🖨️ Gráfica & Impressão' },
  'Ótica & Joias': { category: 'Varejo Especializado', icon: 'Eye', color: '#A855F7', badge: '👓 Ótica & Joias' },
  'Contabilidade & Finanças': { category: 'Serviços Profissionais', icon: 'Briefcase', color: '#10B981', badge: '📊 Contabilidade & Finanças' },
  'Advocacia & Jurídico': { category: 'Serviços Profissionais', icon: 'Scale', color: '#475569', badge: '⚖️ Advocacia & Jurídico' },
  'Lavanderia': { category: 'Serviços Gerais', icon: 'Shirt', color: '#38BDF8', badge: '🧺 Lavanderia' },
  'Informática & Celulares': { category: 'Tecnologia', icon: 'Smartphone', color: '#2563EB', badge: '📱 Informática & Celulares' },
  'Construção & Materiais': { category: 'Construção Civil', icon: 'Hammer', color: '#EA580C', badge: '🏗️ Construção & Materiais' },
  'Açougue & Frigorífico': { category: 'Alimentação', icon: 'Store', color: '#BE123C', badge: '🥩 Açougue & Carnes' },
  'Móveis & Decoração': { category: 'Casa & Decoração', icon: 'Armchair', color: '#7C3AED', badge: '🛋️ Móveis & Decoração' },
  'Posto de Combustível': { category: 'Automotivo', icon: 'Fuel', color: '#D97706', badge: '⛽ Posto de Combustível' },
};

// Vibrant color palette for dynamic categories
const DYNAMIC_PALETTES = [
  { color: '#3B82F6', icon: 'Folder', emoji: '📁' },
  { color: '#10B981', icon: 'Tag', emoji: '🏷️' },
  { color: '#8B5CF6', icon: 'Layers', emoji: '📂' },
  { color: '#EC4899', icon: 'Sparkles', emoji: '✨' },
  { color: '#F59E0B', icon: 'Star', emoji: '⭐' },
  { color: '#06B6D4', icon: 'Compass', emoji: '🧭' },
  { color: '#14B8A6', icon: 'Bookmark', emoji: '🔖' },
  { color: '#6366F1', icon: 'Box', emoji: '📦' },
];

/**
 * Returns complete category styling and badge for ANY subcategory,
 * whether it is a preset or a newly imported/user-created folder.
 */
export function getCategoryMeta(subcategoryName: string): CategoryInfo {
  if (!subcategoryName) {
    return {
      category: 'Geral',
      subcategory: 'Geral',
      icon: 'Folder',
      color: '#3B82F6',
      badge: '📁 Geral',
    };
  }

  const clean = subcategoryName.trim();

  // Check direct preset match
  if (PRESET_SUBCATEGORIES[clean]) {
    return {
      subcategory: clean,
      ...PRESET_SUBCATEGORIES[clean],
    };
  }

  // Check case-insensitive match
  const lower = clean.toLowerCase();
  for (const [key, val] of Object.entries(PRESET_SUBCATEGORIES)) {
    if (key.toLowerCase() === lower) {
      return {
        subcategory: key,
        ...val,
      };
    }
  }

  // Generate deterministic dynamic folder metadata for any newly imported or custom category
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const palette = DYNAMIC_PALETTES[Math.abs(hash) % DYNAMIC_PALETTES.length];

  // Capitalize nicely
  const formattedName = clean
    .replace(/_/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  return {
    category: 'Personalizado',
    subcategory: formattedName,
    icon: palette.icon,
    color: palette.color,
    badge: `${palette.emoji} ${formattedName}`,
  };
}

/**
 * Detects category and subcategory from name, Google types, or address.
 * Covers all major business segments in Manaus and automatically formats any new category.
 */
export function detectCategory(name: string = '', types: string[] = [], address: string = ''): CategoryInfo {
  const text = `${name} ${types.join(' ')} ${address}`.toLowerCase();

  // 1. Padaria / Confeitaria / Panificadora
  if (
    text.includes('padaria') ||
    text.includes('panificadora') ||
    text.includes('confeitaria') ||
    text.includes('pão') ||
    text.includes('pao') ||
    text.includes('bakery')
  ) {
    return getCategoryMeta('Padaria');
  }

  // 2. Pet Shop / Veterinária
  if (
    text.includes('pet') ||
    text.includes('veterin') ||
    text.includes('banho e tosa') ||
    text.includes('pet_store') ||
    text.includes('veterinary_care') ||
    text.includes('ração') ||
    text.includes('racoes')
  ) {
    return getCategoryMeta('Pet Shop');
  }

  // 3. Barbearia
  if (
    text.includes('barbearia') ||
    text.includes('barber') ||
    text.includes('barbeiro') ||
    text.includes('barber_shop')
  ) {
    return getCategoryMeta('Barbearia');
  }

  // 4. Salão de Beleza / Estética
  if (
    text.includes('salão') ||
    text.includes('salao') ||
    text.includes('cabelereir') ||
    text.includes('cabeleireir') ||
    text.includes('estética') ||
    text.includes('estetica') ||
    text.includes('beauty_salon') ||
    text.includes('hair_care') ||
    text.includes('spa')
  ) {
    return getCategoryMeta('Salão & Estética');
  }

  // 5. Farmácia / Drogaria
  if (
    text.includes('farmácia') ||
    text.includes('farmacia') ||
    text.includes('drogaria') ||
    text.includes('pharmacy') ||
    text.includes('drugstore') ||
    text.includes('remédio') ||
    text.includes('remedio')
  ) {
    return getCategoryMeta('Farmácia');
  }

  // 6. Supermercado / Mercearia / Hortifruti
  if (
    text.includes('supermercado') ||
    text.includes('mercado') ||
    text.includes('hipermercado') ||
    text.includes('hortifruti') ||
    text.includes('supermarket') ||
    text.includes('grocery') ||
    text.includes('atacadão') ||
    text.includes('atacadao') ||
    text.includes('assaí') ||
    text.includes('assai')
  ) {
    return getCategoryMeta('Supermercado');
  }

  // 7. Academia / Fitness
  if (
    text.includes('academia') ||
    text.includes('fitness') ||
    text.includes('crossfit') ||
    text.includes('musculação') ||
    text.includes('musculacao') ||
    text.includes('pilates') ||
    text.includes('gym')
  ) {
    return getCategoryMeta('Academia');
  }

  // 8. Odontologia / Dentista
  if (
    text.includes('dentista') ||
    text.includes('odont') ||
    text.includes('ortodont') ||
    text.includes('dental')
  ) {
    return getCategoryMeta('Odontologia');
  }

  // 9. Clínicas & Consultórios Médicos
  if (
    text.includes('clínica') ||
    text.includes('clinica') ||
    text.includes('hospital') ||
    text.includes('consultório') ||
    text.includes('consultorio') ||
    text.includes('médic') ||
    text.includes('medic') ||
    text.includes('health') ||
    text.includes('doctor') ||
    text.includes('laboratório') ||
    text.includes('laboratorio')
  ) {
    return getCategoryMeta('Clínica & Consultório');
  }

  // 10. Restaurante / Gastronomia
  if (
    text.includes('restaurante') ||
    text.includes('pizzaria') ||
    text.includes('sushi') ||
    text.includes('churrascaria') ||
    text.includes('restaurant') ||
    text.includes('peixaria') ||
    text.includes('bistrô') ||
    text.includes('bistro')
  ) {
    return getCategoryMeta('Restaurante');
  }

  // 11. Lanchonete / Cafeteria / Fast Food
  if (
    text.includes('hamburguer') ||
    text.includes('burger') ||
    text.includes('lanche') ||
    text.includes('lanchonete') ||
    text.includes('café') ||
    text.includes('cafe') ||
    text.includes('açaí') ||
    text.includes('acai') ||
    text.includes('fast_food') ||
    text.includes('sorvete') ||
    text.includes('sorveteria')
  ) {
    return getCategoryMeta('Lanchonete');
  }

  // 12. Hotelaria / Pousada / Hospedagem
  if (
    text.includes('hotel') ||
    text.includes('pousada') ||
    text.includes('hostel') ||
    text.includes('resort') ||
    text.includes('lodging')
  ) {
    return getCategoryMeta('Hotel & Hospedagem');
  }

  // 13. Educação / Escolas / Cursos
  if (
    text.includes('escola') ||
    text.includes('colégio') ||
    text.includes('colegio') ||
    text.includes('faculdade') ||
    text.includes('universidade') ||
    text.includes('curso') ||
    text.includes('school') ||
    text.includes('educa') ||
    text.includes('creche')
  ) {
    return getCategoryMeta('Educação & Escolas');
  }

  // 14. Moda / Roupas / Vestuário
  if (
    text.includes('moda') ||
    text.includes('roupa') ||
    text.includes('boutique') ||
    text.includes('clothing_store') ||
    text.includes('calçado') ||
    text.includes('calcado') ||
    text.includes('vestuário') ||
    text.includes('vestuario')
  ) {
    return getCategoryMeta('Moda & Roupas');
  }

  // 15. Imobiliária & Condomínio
  if (
    text.includes('imobili') ||
    text.includes('corretor de imóveis') ||
    text.includes('real_estate')
  ) {
    return getCategoryMeta('Imobiliária');
  }

  if (
    text.includes('condom') ||
    text.includes('residencial') ||
    text.includes('edifício') ||
    text.includes('edificio')
  ) {
    return getCategoryMeta('Condomínio');
  }

  // 16. Ótica & Joalheria
  if (
    text.includes('ótica') ||
    text.includes('otica') ||
    text.includes('óculos') ||
    text.includes('oculos') ||
    text.includes('joalheria') ||
    text.includes('relojoaria')
  ) {
    return getCategoryMeta('Ótica & Joias');
  }

  // 17. Automotivo / Oficina
  if (
    text.includes('oficina') ||
    text.includes('auto') ||
    text.includes('mecânica') ||
    text.includes('mecanica') ||
    text.includes('car_repair') ||
    text.includes('pneus') ||
    text.includes('troca de óleo')
  ) {
    return getCategoryMeta('Oficina & Auto');
  }

  // 18. Posto de Combustível
  if (
    text.includes('posto') ||
    text.includes('combustível') ||
    text.includes('combustivel') ||
    text.includes('gas_station')
  ) {
    return getCategoryMeta('Posto de Combustível');
  }

  // 19. Gráfica & Impressão
  if (
    text.includes('gráfica') ||
    text.includes('grafica') ||
    text.includes('impressão') ||
    text.includes('comunicação visual') ||
    text.includes('brindes')
  ) {
    return getCategoryMeta('Gráfica & Impressão');
  }

  // 20. Informática & Celulares
  if (
    text.includes('celular') ||
    text.includes('informática') ||
    text.includes('informatica') ||
    text.includes('computador') ||
    text.includes('assistência técnica') ||
    text.includes('smartphone')
  ) {
    return getCategoryMeta('Informática & Celulares');
  }

  // 21. Açougue & Carnes
  if (
    text.includes('açougue') ||
    text.includes('acougue') ||
    text.includes('frigorífico') ||
    text.includes('frigorifico') ||
    text.includes('carnes')
  ) {
    return getCategoryMeta('Açougue & Frigorífico');
  }

  // 22. Móveis & Decoração
  if (
    text.includes('móveis') ||
    text.includes('moveis') ||
    text.includes('decoração') ||
    text.includes('decoracao') ||
    text.includes('colchões') ||
    text.includes('colchoes')
  ) {
    return getCategoryMeta('Móveis & Decoração');
  }

  // 23. Contabilidade & Finanças
  if (
    text.includes('contabil') ||
    text.includes('contabilidade') ||
    text.includes('contador') ||
    text.includes('financeir') ||
    text.includes('seguros')
  ) {
    return getCategoryMeta('Contabilidade & Finanças');
  }

  // 24. Advocacia & Jurídico
  if (
    text.includes('advoca') ||
    text.includes('advogad') ||
    text.includes('jurídic') ||
    text.includes('juridic') ||
    text.includes('lawyer')
  ) {
    return getCategoryMeta('Advocacia & Jurídico');
  }

  // 25. Lavanderia
  if (
    text.includes('lavanderia') ||
    text.includes('laundry')
  ) {
    return getCategoryMeta('Lavanderia');
  }

  // 26. Construção & Materiais
  if (
    text.includes('construção') ||
    text.includes('construcao') ||
    text.includes('materiais de construção') ||
    text.includes('vidraçaria') ||
    text.includes('vidracaria') ||
    text.includes('serralheria') ||
    text.includes('marmoraria')
  ) {
    return getCategoryMeta('Construção & Materiais');
  }

  // Dynamic fallback: If Google Places has a specific type (e.g. 'florist', 'book_store', 'gym')
  const validGoogleType = types.find(t => 
    t && 
    t !== 'establishment' && 
    t !== 'point_of_interest' && 
    t !== 'food' && 
    t !== 'store'
  );

  if (validGoogleType) {
    return getCategoryMeta(validGoogleType);
  }

  return getCategoryMeta('Comércio Geral');
}

