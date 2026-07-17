// Shared between PantryScreen (browse/filter) and ScanItemScreen (barcode/photo
// scan review) so the category list and icon set can't drift between the two
// entry points into the same PantryItem.category field. Also mirrored (order
// and content) by family-command-center-api's pantry.ts KNOWN_CATEGORIES,
// which steers the AI photo-scan prompt onto categories this UI recognizes.
export const PANTRY_CATEGORIES = [
  'Produce', 'Meat', 'Dairy', 'Grains', 'Frozen', 'Canned', 'Beverages', 'Condiments',
];

export const PANTRY_CATEGORY_ICONS: Record<string, string> = {
  Produce: 'nutrition',
  Meat: 'fast-food',
  Dairy: 'water',
  Grains: 'leaf',
  Frozen: 'snow',
  Canned: 'cube',
  Beverages: 'wine',
  Condiments: 'flask',
};
