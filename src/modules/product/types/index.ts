type ProductOption = {
   option_name: string;
   option_value: string;
};

export type ProductVariantType = {
   sku?: string;
   price: number;
   stock_quantity: number;
   options: ProductOption[];
};

export type ProductTransformedResult = {
   name: string;
   description: string;
   rating_avg: number;
   category_id: number;
   shop_id: number;
   slug: string;
   thumbnail?: string | null;
   variants: ProductVariantType[];
};

export type ProductDataQuery = {
   name: string;
   description: string;
   rating_avg: string;
   category_id: string;
   slug: string;
   shop_id: number;
   thumbnail?: string | null;
   variant_id?: number | null;
   sku?: string;
   price?: string;
   stock_quantity?: number;
   option_name?: string;
   option_value?: string;
}[];
