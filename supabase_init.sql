-- ==========================================
-- 庫存管理系統 v2 - 資料庫結構
-- ==========================================

-- 清理舊資料表 (如果需要)
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS stock_in CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;

-- ==========================================
-- 1. 產品類別表
-- ==========================================
CREATE TABLE IF NOT EXISTS product_categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,  -- '服飾', '鞋子', '潮玩', '飾品'
  size_config JSONB,  -- 尺寸配置 { "sizes": ["S", "M", "L", "XL", "2XL", "3XL"] }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入預設類別
INSERT INTO product_categories (name, size_config) VALUES
  ('服飾', '{"sizes": ["S", "M", "L", "XL", "2XL", "3XL"]}'::jsonb),
  ('鞋子', '{"sizes": ["US5.5", "US6", "US6.5", "US7", "US7.5", "US8", "US8.5", "US9", "US9.5", "US10", "US10.5", "US11"]}'::jsonb),
  ('潮玩', '{}'::jsonb),
  ('飾品', '{"sizes": ["US5", "US6", "US7", "US8", "US9", "US10", "US11"]}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- 2. 進貨記錄表 (stock_in)
-- ==========================================
CREATE TABLE IF NOT EXISTS stock_in (
  id BIGSERIAL PRIMARY KEY,

  -- 基本資訊
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  order_type TEXT NOT NULL CHECK (order_type IN ('進貨', '預購')),
  category_id BIGINT NOT NULL REFERENCES product_categories(id),

  -- 產品資訊
  product_name TEXT NOT NULL,
  color TEXT,  -- 顏色 (潮玩類別可為 NULL)
  ip_category TEXT,  -- IP分類 (只用於潮玩)

  -- 尺寸數量 (JSON 結構)
  -- 範例: {"S": 10, "M": 20, "L": 15} 或 {"US7": 5, "US8": 10}
  size_quantities JSONB DEFAULT '{}'::jsonb,

  -- 總計
  total_quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(12,2) NOT NULL,

  -- 備註
  note TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_stock_in_date ON stock_in(date DESC);
CREATE INDEX idx_stock_in_category ON stock_in(category_id);
CREATE INDEX idx_stock_in_product_name ON stock_in(product_name);

-- ==========================================
-- 3. 產品庫存表 (products)
-- ==========================================
-- 這個表追蹤當前庫存狀態 (聚合自 stock_in 和 sales)
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,

  -- 唯一識別 (product_name + color + category)
  category_id BIGINT NOT NULL REFERENCES product_categories(id),
  product_name TEXT NOT NULL,
  color TEXT,
  ip_category TEXT,  -- IP分類 (潮玩專用)

  -- 當前各尺寸庫存
  size_stock JSONB DEFAULT '{}'::jsonb,  -- {"S": 5, "M": 10, "L": 8}

  -- 總庫存
  total_stock INTEGER DEFAULT 0,

  -- 成本資訊 (加權平均)
  avg_unit_cost DECIMAL(10,2) DEFAULT 0,
  total_cost_value DECIMAL(12,2) DEFAULT 0,

  -- 時間戳記
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 唯一約束: 同一類別下的產品名稱+顏色不能重複
  UNIQUE(category_id, product_name, color)
);

-- 索引
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_name ON products(product_name);
CREATE INDEX idx_products_total_stock ON products(total_stock);

-- ==========================================
-- 4. 銷售記錄表 (sales)
-- ==========================================
CREATE TABLE IF NOT EXISTS sales (
  id BIGSERIAL PRIMARY KEY,

  -- 基本資訊
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_type TEXT NOT NULL CHECK (customer_type IN ('零售', '批發', '預購')),

  -- 產品關聯
  product_id BIGINT REFERENCES products(id),  -- 關聯到產品
  product_name TEXT NOT NULL,  -- 冗餘欄位,方便查詢
  size TEXT,  -- 售出的尺寸 (如果有)

  -- 通路與運送
  channel TEXT CHECK (channel IN ('社團', '店家', '國外')),
  shipping_method TEXT CHECK (shipping_method IN ('現貨面交', '店到店', '宅配')),

  -- 金額
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,

  -- 備註
  note TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_sales_date ON sales(date DESC);
CREATE INDEX idx_sales_product_id ON sales(product_id);
CREATE INDEX idx_sales_customer_type ON sales(customer_type);
CREATE INDEX idx_sales_channel ON sales(channel);

-- ==========================================
-- 5. 費用記錄表 (expenses)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
  date DATE NULL,
  category TEXT NULL,
  amount INTEGER NULL,  -- 費用金額 (整數)
  note TEXT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT now(),
  CONSTRAINT expenses_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- 建立索引（分類搜尋用）
CREATE INDEX IF NOT EXISTS idx_expenses_category
  ON public.expenses USING btree (category)
  TABLESPACE pg_default;

-- ==========================================
-- 6. 庫存異動記錄表 (inventory_movements)
-- ==========================================
CREATE TABLE IF NOT EXISTS inventory_movements (
  id BIGSERIAL PRIMARY KEY,

  product_id BIGINT NOT NULL REFERENCES products(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('stock_in', 'sale', 'adjustment')),

  -- 尺寸相關
  size TEXT,  -- 異動的尺寸
  quantity INTEGER NOT NULL,  -- 正數=增加, 負數=減少

  -- 前後庫存
  previous_total INTEGER NOT NULL,
  current_total INTEGER NOT NULL,

  -- 關聯記錄
  reference_type TEXT,  -- 'stock_in', 'sale'
  reference_id BIGINT,  -- stock_in.id 或 sales.id

  -- 備註
  note TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX idx_inventory_movements_created ON inventory_movements(created_at DESC);

-- ==========================================
-- 7. 觸發器: 自動更新 updated_at
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 應用到各表
DROP TRIGGER IF EXISTS update_product_categories_updated_at ON product_categories;
CREATE TRIGGER update_product_categories_updated_at
  BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_in_updated_at ON stock_in;
CREATE TRIGGER update_stock_in_updated_at
  BEFORE UPDATE ON stock_in
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sales_updated_at ON sales;
CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 注意: expenses 表不需要 updated_at 觸發器,因為表中沒有 updated_at 欄位

-- ==========================================
-- 8. Row Level Security (RLS)
-- ==========================================
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_in ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- 允許所有操作 (使用 service role)
CREATE POLICY "Allow all operations" ON product_categories FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON stock_in FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON products FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON sales FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON expenses FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON inventory_movements FOR ALL USING (true);

-- ==========================================
-- 9. 授權
-- ==========================================
GRANT ALL ON product_categories TO postgres, anon, authenticated, service_role;
GRANT ALL ON stock_in TO postgres, anon, authenticated, service_role;
GRANT ALL ON products TO postgres, anon, authenticated, service_role;
GRANT ALL ON sales TO postgres, anon, authenticated, service_role;
GRANT ALL ON expenses TO postgres, anon, authenticated, service_role;
GRANT ALL ON inventory_movements TO postgres, anon, authenticated, service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- ==========================================
-- 10. 驗證查詢
-- ==========================================
SELECT 'product_categories' as table_name, COUNT(*) as record_count FROM product_categories
UNION ALL
SELECT 'stock_in' as table_name, COUNT(*) as record_count FROM stock_in
UNION ALL
SELECT 'products' as table_name, COUNT(*) as record_count FROM products
UNION ALL
SELECT 'sales' as table_name, COUNT(*) as record_count FROM sales
UNION ALL
SELECT 'expenses' as table_name, COUNT(*) as record_count FROM expenses
UNION ALL
SELECT 'inventory_movements' as table_name, COUNT(*) as record_count FROM inventory_movements;
