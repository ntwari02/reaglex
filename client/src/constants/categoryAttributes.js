export const CATEGORY_ATTRIBUTES = {
  size_and_color: [
    'clothing', 'fashion', 'apparel', 'shoes', 'footwear',
    'bags', 'accessories', 'sportswear', 'kids fashion',
    'men fashion', 'women fashion', 'kids clothing',
    'traditional wear', 'uniforms', 'swimwear',
    'jerseys', 'jackets', 'shirts', 'dresses', 'trousers',
    'suits', 'hoodies', 'sweaters', 'shorts', 'skirts',
    'coats', 'lingerie', 'underwear', 'socks', 'ties',
  ],
  color_only: [
    'furniture', 'home decor', 'paint', 'car accessories',
    'phone cases', 'covers', 'curtains', 'bedding',
    'wall art', 'rugs', 'cushions', 'stationery',
    'school supplies',
  ],
  size_only: [
    'tires', 'rings', 'belts', 'hats', 'caps',
    'helmets', 'gloves', 'watches',
  ],
};

export const categoryNeedsSize = (category) => {
  if (!category) return false;
  const cat = category.toLowerCase().trim();
  const all = [
    ...CATEGORY_ATTRIBUTES.size_and_color,
    ...CATEGORY_ATTRIBUTES.size_only,
  ];
  return all.some((c) => cat.includes(c) || c.includes(cat));
};

export const categoryNeedsColor = (category) => {
  if (!category) return false;
  const cat = category.toLowerCase().trim();
  const all = [
    ...CATEGORY_ATTRIBUTES.size_and_color,
    ...CATEGORY_ATTRIBUTES.color_only,
  ];
  return all.some((c) => cat.includes(c) || c.includes(cat));
};
