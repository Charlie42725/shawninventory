-- ==========================================
-- 添加費用表 (expenses) - 增量更新腳本
-- ==========================================
-- 說明: 此腳本用於在現有資料庫中添加 expenses 表
-- 使用方法: 在 Supabase SQL Editor 中執行此腳本

-- 刪除舊表 (如果存在)
DROP TABLE IF EXISTS public.expenses CASCADE;

-- 重新建立 expenses 資料表
CREATE TABLE public.expenses (
  id BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
  date DATE NULL,
  category TEXT NULL,
  amount INTEGER NULL,
  note TEXT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT now(),
  CONSTRAINT expenses_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- 建立索引（分類搜尋用）
CREATE INDEX IF NOT EXISTS idx_expenses_category
  ON public.expenses USING btree (category)
  TABLESPACE pg_default;

-- Row Level Security (RLS)
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 允許所有操作 (使用 service role)
DROP POLICY IF EXISTS "Allow all operations" ON public.expenses;
CREATE POLICY "Allow all operations" ON public.expenses FOR ALL USING (true);

-- 授權
GRANT ALL ON public.expenses TO postgres, anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE expenses_id_seq TO postgres, anon, authenticated, service_role;

-- 驗證
SELECT 'expenses' as table_name, COUNT(*) as record_count FROM public.expenses;
