-- ==========================================
-- 添加销售成本字段并补充历史数据
-- ==========================================
-- 目的：在销售时记录实际成本，而不是事后用产品当前成本计算
-- 符合会计的成本配比原则

-- 步骤1: 添加 cost_of_goods_sold 字段
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS cost_of_goods_sold DECIMAL(10, 2) DEFAULT 0;

COMMENT ON COLUMN sales.cost_of_goods_sold IS '销售成本 (COGS) - 该笔销售时的实际成本，在销售时记录';

-- 步骤2: 为历史销售记录补充 COGS 数据
-- 使用产品当前的平均成本来估算历史销售的成本
UPDATE sales s
SET cost_of_goods_sold = p.avg_unit_cost * s.quantity
FROM products p
WHERE s.product_id = p.id
  AND (s.cost_of_goods_sold = 0 OR s.cost_of_goods_sold IS NULL)
  AND p.avg_unit_cost > 0;

-- 步骤3: 验证更新结果
SELECT
  COUNT(*) as total_sales,
  COUNT(*) FILTER (WHERE cost_of_goods_sold > 0) as sales_with_cogs,
  COUNT(*) FILTER (WHERE cost_of_goods_sold = 0) as sales_without_cogs,
  SUM(cost_of_goods_sold) as total_cogs
FROM sales;

-- 步骤4: 查看需要手动处理的销售记录（成本为0的）
SELECT
  s.id,
  s.date,
  s.product_name,
  s.quantity,
  s.unit_price,
  s.cost_of_goods_sold,
  p.avg_unit_cost as current_product_cost
FROM sales s
LEFT JOIN products p ON s.product_id = p.id
WHERE s.cost_of_goods_sold = 0
ORDER BY s.date DESC
LIMIT 20;
