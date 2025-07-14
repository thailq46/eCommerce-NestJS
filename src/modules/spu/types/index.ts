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

export interface SpuCacheData {
   spu_id: number;
   product_name: string;
   product_desc: string;
   product_slug: string;
   product_thumb: string | null;
   product_category: number;
   product_shop: number;
   product_price: number;
   product_quantity: number;
   product_rating_avg: number;
   product_variations: string;
}

export interface SpuCacheResponse {
   message: string;
   data?: SpuCacheData;
}
