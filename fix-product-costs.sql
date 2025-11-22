-- ==========================================
-- 修复产品成本计算错误
-- ==========================================
-- 说明：之前的销售逻辑使用按比例扣减，导致 avg_unit_cost 计算错误
-- 这个脚本会从进货记录重新计算每个产品的正确成本

-- 第一步：重置所有产品的成本为 0
UPDATE products
SET
  avg_unit_cost = 0,
  total_cost_value = 0;

-- 第二步：从进货记录重新计算每个产品的成本
-- 注意：这需要逐个产品处理，以下是一个示例模板

-- 为每个产品重新计算（需要针对每个产品执行）
-- 替换 {product_name}, {color}, {category_id} 为实际值

/*
-- 示例：重新计算某个产品的成本
WITH stock_in_totals AS (
  SELECT
    category_id,
    product_name,
    color,
    SUM(total_quantity) as total_qty,
    SUM(total_cost) as total_cost
  FROM stock_in
  WHERE category_id = 3
    AND product_name = '睡蓮400%'
    AND color IS NULL
  GROUP BY category_id, product_name, color
)
UPDATE products p
SET
  avg_unit_cost = CASE
    WHEN t.total_qty > 0 THEN t.total_cost / t.total_qty
    ELSE 0
  END,
  total_cost_value = CASE
    WHEN p.total_stock > 0 AND t.total_qty > 0
    THEN (t.total_cost / t.total_qty) * p.total_stock
    ELSE 0
  END
FROM stock_in_totals t
WHERE p.category_id = t.category_id
  AND p.product_name = t.product_name
  AND COALESCE(p.color, '') = COALESCE(t.color, '');
*/

-- ==========================================
-- 自动修复脚本（为所有产品重新计算）
-- ==========================================

-- 方案1：基于进货记录的总成本和总数量计算平均成本
WITH product_costs AS (
  SELECT
    p.id as product_id,
    p.total_stock,
    COALESCE(SUM(si.total_cost), 0) as total_cost_from_stock_in,
    COALESCE(SUM(si.total_quantity), 0) as total_qty_from_stock_in
  FROM products p
  LEFT JOIN stock_in si
    ON si.category_id = p.category_id
    AND si.product_name = p.product_name
    AND COALESCE(si.color, '') = COALESCE(p.color, '')
  GROUP BY p.id, p.total_stock
)
UPDATE products p
SET
  avg_unit_cost = CASE
    WHEN pc.total_qty_from_stock_in > 0
    THEN pc.total_cost_from_stock_in / pc.total_qty_from_stock_in
    ELSE 0
  END,
  total_cost_value = CASE
    WHEN p.total_stock > 0 AND pc.total_qty_from_stock_in > 0
    THEN (pc.total_cost_from_stock_in / pc.total_qty_from_stock_in) * p.total_stock
    ELSE 0
  END
FROM product_costs pc
WHERE p.id = pc.product_id;

-- 验证结果
SELECT
  id,
  product_name,
  total_stock,
  avg_unit_cost,
  total_cost_value,
  CASE
    WHEN total_stock > 0
    THEN total_cost_value / total_stock
    ELSE 0
  END as calculated_avg
FROM products
ORDER BY avg_unit_cost DESC
LIMIT 20;
