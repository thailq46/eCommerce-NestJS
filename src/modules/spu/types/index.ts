export type ProductVariationsType = {
   name: string;
   options: string[];
   images?: string[];
};

export type SkuItemType = {
   sku_tier_idx: number[];
   sku_price: number;
   sku_stock: number;
   sku_default: boolean;
};
