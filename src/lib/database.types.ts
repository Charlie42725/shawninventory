// Supabase 資料庫類型定義 v2

// ==========================================
// 輔助類型定義 (必須先定義)
// ==========================================

// 尺寸配置 (用於 product_categories)
export interface SizeConfig {
  sizes?: string[]
}

// 尺寸數量 (用於 stock_in 和 products)
export interface SizeQuantities {
  [size: string]: number
}

// ==========================================
// Database 主類型定義
// ==========================================

export interface Database {
  public: {
    Tables: {
      product_categories: {
        Row: {
          id: number
          name: string
          size_config: SizeConfig | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          size_config?: SizeConfig | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          size_config?: SizeConfig | null
          created_at?: string
          updated_at?: string
        }
      }
      stock_in: {
        Row: {
          id: number
          date: string
          order_type: '進貨' | '預購'
          category_id: number
          product_name: string
          color: string | null
          ip_category: string | null
          size_quantities: SizeQuantities
          total_quantity: number
          unit_cost: number
          total_cost: number
          note: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          date?: string
          order_type: '進貨' | '預購'
          category_id: number
          product_name: string
          color?: string | null
          ip_category?: string | null
          size_quantities?: SizeQuantities
          total_quantity: number
          unit_cost: number
          total_cost: number
          note?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          date?: string
          order_type?: '進貨' | '預購'
          category_id?: number
          product_name?: string
          color?: string | null
          ip_category?: string | null
          size_quantities?: SizeQuantities
          total_quantity?: number
          unit_cost?: number
          total_cost?: number
          note?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: number
          category_id: number
          product_name: string
          color: string | null
          ip_category: string | null
          size_stock: SizeQuantities
          total_stock: number
          avg_unit_cost: number
          total_cost_value: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          category_id: number
          product_name: string
          color?: string | null
          ip_category?: string | null
          size_stock?: SizeQuantities
          total_stock?: number
          avg_unit_cost?: number
          total_cost_value?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          category_id?: number
          product_name?: string
          color?: string | null
          ip_category?: string | null
          size_stock?: SizeQuantities
          total_stock?: number
          avg_unit_cost?: number
          total_cost_value?: number
          created_at?: string
          updated_at?: string
        }
      }
      sales: {
        Row: {
          id: number
          date: string
          customer_type: '零售' | '批發' | '預購'
          product_id: number | null
          product_name: string
          size: string | null
          channel: '社團' | '店家' | '國外' | null
          shipping_method: '現貨面交' | '店到店' | '宅配' | null
          unit_price: number
          quantity: number
          total_amount: number
          note: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          date?: string
          customer_type: '零售' | '批發' | '預購'
          product_id?: number | null
          product_name: string
          size?: string | null
          channel?: '社團' | '店家' | '國外' | null
          shipping_method?: '現貨面交' | '店到店' | '宅配' | null
          unit_price: number
          quantity: number
          total_amount: number
          note?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          date?: string
          customer_type?: '零售' | '批發' | '預購'
          product_id?: number | null
          product_name?: string
          size?: string | null
          channel?: '社團' | '店家' | '國外' | null
          shipping_method?: '現貨面交' | '店到店' | '宅配' | null
          unit_price?: number
          quantity?: number
          total_amount?: number
          note?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      inventory_movements: {
        Row: {
          id: number
          product_id: number
          movement_type: 'stock_in' | 'sale' | 'adjustment'
          size: string | null
          quantity: number
          previous_total: number
          current_total: number
          reference_type: string | null
          reference_id: number | null
          note: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: number
          product_id: number
          movement_type: 'stock_in' | 'sale' | 'adjustment'
          size?: string | null
          quantity: number
          previous_total: number
          current_total: number
          reference_type?: string | null
          reference_id?: number | null
          note?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          product_id?: number
          movement_type?: 'stock_in' | 'sale' | 'adjustment'
          size?: string | null
          quantity?: number
          previous_total?: number
          current_total?: number
          reference_type?: string | null
          reference_id?: number | null
          note?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// ==========================================
// 產品類別常數
// ==========================================

export const PRODUCT_CATEGORIES = {
  CLOTHING: '服飾',
  SHOES: '鞋子',
  TOYS: '潮玩',
  ACCESSORIES: '飾品',
} as const

export type ProductCategoryName = typeof PRODUCT_CATEGORIES[keyof typeof PRODUCT_CATEGORIES]

// ==========================================
// 尺寸配置
// ==========================================

export const SIZE_CONFIGS: Record<ProductCategoryName, string[]> = {
  服飾: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
  鞋子: ['US5.5', 'US6', 'US6.5', 'US7', 'US7.5', 'US8', 'US8.5', 'US9', 'US9.5', 'US10', 'US10.5', 'US11'],
  潮玩: [], // 無尺寸
  飾品: ['US5', 'US6', 'US7', 'US8', 'US9', 'US10', 'US11'],
}

// ==========================================
// 選項常數
// ==========================================

export const ORDER_TYPES = ['進貨', '預購', '批發'] as const
export const CUSTOMER_TYPES = ['零售', '批發', '預購'] as const
export const CHANNELS = ['社團', '店家', '國外'] as const
export const SHIPPING_METHODS = ['現貨面交', '店到店', '宅配'] as const

// ==========================================
// 擴展類型 (包含關聯資料)
// ==========================================

// 使用 type 而非 interface,因為 TypeScript 不允許 interface 直接擴展索引訪問類型
export type ProductWithCategory = Database['public']['Tables']['products']['Row'] & {
  category?: Database['public']['Tables']['product_categories']['Row']
}

export type StockInWithCategory = Database['public']['Tables']['stock_in']['Row'] & {
  category?: Database['public']['Tables']['product_categories']['Row']
}

export type SaleWithProduct = Database['public']['Tables']['sales']['Row'] & {
  product?: Database['public']['Tables']['products']['Row']
}
