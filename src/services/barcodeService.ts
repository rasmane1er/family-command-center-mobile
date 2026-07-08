export interface BarcodeProduct {
  name: string;
  brand?: string;
  category: string;
  size?: string;
  imageUrl?: string;
}

const CATEGORY_KEYWORDS: Record<string, string> = {
  meat: 'Meat', poultry: 'Meat', fish: 'Meat', seafood: 'Meat',
  dairy: 'Dairy', dairies: 'Dairy', milk: 'Dairy', cheese: 'Dairy', yogurt: 'Dairy', yoghurt: 'Dairy',
  cereal: 'Grains', cereals: 'Grains', bread: 'Grains', pasta: 'Grains', rice: 'Grains', grain: 'Grains',
  frozen: 'Frozen',
  canned: 'Canned', tinned: 'Canned', preserved: 'Canned',
  beverage: 'Beverages', beverages: 'Beverages', drink: 'Beverages', drinks: 'Beverages', soda: 'Beverages', juice: 'Beverages',
  condiment: 'Condiments', condiments: 'Condiments', sauce: 'Condiments', spread: 'Condiments',
  fruit: 'Produce', fruits: 'Produce', vegetable: 'Produce', vegetables: 'Produce', produce: 'Produce',
};

// Open Food Facts' category taxonomy is a verbose, unbounded set of tags
// (e.g. "en:dairies, en:fermented-foods, en:fermented-milk-products") —
// this snaps the first recognizable one to the fixed category chips Pantry
// already filters on, defaulting to Produce (same default the manual "Add
// Item" form already uses) rather than introducing a 9th, scan-only category.
function mapCategory(offCategories?: string): string {
  if (!offCategories) return 'Produce';
  const lower = offCategories.toLowerCase();
  for (const [keyword, category] of Object.entries(CATEGORY_KEYWORDS)) {
    if (lower.includes(keyword)) return category;
  }
  return 'Produce';
}

// Open Food Facts is a free, public, no-auth-required product database
// keyed by UPC/EAN barcode — https://world.openfoodfacts.org/data
export async function lookupBarcode(barcode: string): Promise<BarcodeProduct | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.status !== 1 || !data.product) return null;

    const p = data.product;
    const name = p.product_name || p.product_name_en || p.generic_name;
    if (!name) return null;

    return {
      name,
      brand: p.brands || undefined,
      category: mapCategory(p.categories),
      size: p.quantity || undefined,
      imageUrl: p.image_front_url || p.image_url || undefined,
    };
  } catch {
    return null;
  }
}
