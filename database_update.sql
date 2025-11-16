-- =============================================
-- 資料庫更新 SQL
-- 請在 Supabase SQL Editor 執行以下指令
-- =============================================

-- 1. 更新 stock_in 表的 order_type 檢查約束，加入「批發」選項
ALTER TABLE stock_in
DROP CONSTRAINT IF EXISTS stock_in_order_type_check;

ALTER TABLE stock_in
ADD CONSTRAINT stock_in_order_type_check
CHECK (order_type IN ('進貨', '預購', '批發'));

-- 執行完成後，進貨類型就可以選擇「批發」了
