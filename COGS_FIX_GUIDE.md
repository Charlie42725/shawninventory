# COGS 修复指南 - 符合会计原则

## 问题说明

**核心问题**: 损益报表计算销售成本时，使用产品**当前**的平均成本，而不是**销售时**的实际成本。

**影响**:
- 产品售完后再进货，新的平均成本会改变
- 历史销售的成本被错误地用新成本计算
- 导致毛利和净利虚高或虚低

**会计原则**: 成本配比原则 - 销售收入应该配比销售时的实际成本，而不是事后的成本。

---

## 解决方案

在销售记录中添加 `cost_of_goods_sold` 字段，在销售时记录实际成本，永久保存，不受后续进货影响。

---

## 执行步骤

### 步骤 1: 添加数据库字段

在 Supabase Dashboard 的 **SQL Editor** 中运行:

```sql
-- 添加销售成本字段
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS cost_of_goods_sold DECIMAL(10, 2) DEFAULT 0;

COMMENT ON COLUMN sales.cost_of_goods_sold IS '销售成本 (COGS) - 该笔销售时的实际成本，在销售时记录';
```

执行后，验证字段是否添加成功：

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'sales' AND column_name = 'cost_of_goods_sold';
```

---

### 步骤 2: 为历史数据补充 COGS

运行补充脚本：

```bash
node backfill-sales-cogs.js
```

这个脚本会：
1. 读取所有销售记录
2. 对于没有 COGS 的记录，使用产品当前平均成本 × 数量计算
3. 更新销售记录的 COGS 字段

**注意**: 历史数据的 COGS 是估算值（使用产品当前成本），但从现在开始的新销售会使用实际销售时的成本。

---

### 步骤 3: 验证修复结果

运行验证脚本：

```bash
node verify-cogs-fix.js
```

这个脚本会：
1. 检查销售记录的 COGS 完整性
2. 对比新旧方法的损益差异
3. 识别特殊案例（如售完后再进货的产品）

---

### 步骤 4: 测试新销售

创建一笔新的销售，验证 COGS 是否正确保存：

1. 在系统中创建一笔销售
2. 查询数据库验证：

```sql
SELECT
  id,
  date,
  product_name,
  quantity,
  unit_price,
  total_amount,
  cost_of_goods_sold,
  (unit_price * quantity) - cost_of_goods_sold as gross_profit
FROM sales
ORDER BY created_at DESC
LIMIT 5;
```

3. 验证 `cost_of_goods_sold` 是否有值且合理

---

## 代码变更说明

### 1. `inventory-utils.ts` (库存工具函数)

**变更**: `processSale()` 函数现在会计算并保存 COGS

```typescript
// 计算销售成本
const costOfGoodsSold = product.avg_unit_cost * saleData.quantity

// 保存到销售数据
if (saleData.cost_of_goods_sold === undefined || saleData.cost_of_goods_sold === null) {
  saleData.cost_of_goods_sold = costOfGoodsSold
}
```

**关键点**:
- 使用销售时产品的 `avg_unit_cost`
- 在插入销售记录前计算并填充 COGS
- 保持产品的 `avg_unit_cost` 不变（即使售完）

### 2. `reports/route.ts` (损益报表 API)

**变更**: `calculateSalesCostFromInventory()` 函数优先使用保存的 COGS

```typescript
// 优先使用销售记录中保存的实际 COGS
if (sale.cost_of_goods_sold && sale.cost_of_goods_sold > 0) {
  totalSalesCost += sale.cost_of_goods_sold;
} else {
  // 降级方案：使用产品当前平均成本
  const product = products.find((item: any) => item.id === sale.product_id);
  if (product && product.avg_unit_cost) {
    totalSalesCost += (product.avg_unit_cost * sale.quantity);
  }
}
```

**关键点**:
- 优先使用 `sale.cost_of_goods_sold`（实际记录的成本）
- 降级方案：如果没有 COGS，使用产品当前成本
- 兼容历史数据

### 3. 销售 API (无需修改)

`api/sales/route.ts` 不需要修改，因为 `processSale()` 会自动处理 COGS。

---

## 会计原则验证

### ✅ 成本配比原则

- **修复前**: 2024年11月的销售，用2024年12月进货后的新成本计算 ❌
- **修复后**: 2024年11月的销售，用2024年11月销售时的实际成本计算 ✅

### ✅ 历史成本原则

- 销售成本在交易发生时确定，不受后续事件影响 ✅

### ✅ 一致性原则

- 所有销售都使用相同的成本计算方法 ✅

---

## 测试场景

### 场景 1: 正常销售

1. 产品 A 进货 10个，单价 $100，平均成本 = $100
2. 销售 5个，售价 $150
   - 记录 COGS = $100 × 5 = $500
   - 毛利 = $750 - $500 = $250

### 场景 2: 售完后再进货（关键场景）

1. 产品 A 进货 10个，单价 $100，平均成本 = $100
2. 销售 10个（售完），售价 $150
   - 记录 COGS = $100 × 10 = $1000
   - 产品 A 库存 = 0，但保持 avg_unit_cost = $100
3. **再次进货** 10个，单价 $200
   - 新的平均成本 = $200
4. 查看损益报表：
   - **修复前**: 第2步的销售 COGS 会被计算为 $200 × 10 = $2000 ❌
   - **修复后**: 第2步的销售 COGS 仍然是 $1000 ✅

### 场景 3: 加权平均成本

1. 产品 A 进货 10个，单价 $100
2. 销售 5个，记录 COGS = $500
3. 再进货 10个，单价 $120
   - 新平均成本 = ($500 + $1200) / 15 = $113.33
4. 销售 5个，记录 COGS = $113.33 × 5 = $566.65

---

## 故障排除

### 问题 1: 字段添加失败

**症状**: SQL 执行报错
**解决**:
- 检查是否有足够权限
- 在 Supabase Dashboard 的 SQL Editor 中手动执行
- 确认 `sales` 表名正确

### 问题 2: 历史数据 COGS 为 0

**症状**: `backfill-sales-cogs.js` 跳过很多记录
**原因**: 对应产品的 `avg_unit_cost` 为 0
**解决**:
1. 检查这些产品是否有进货记录
2. 如果有进货记录，运行 `fix-all-cost-issues.js` 重新计算产品成本
3. 再次运行 `backfill-sales-cogs.js`

### 问题 3: 损益报表数据异常

**症状**: 毛利率过高或过低
**解决**:
1. 运行 `verify-cogs-fix.js` 查看详细对比
2. 检查最近的销售记录是否有 COGS
3. 查询数据库验证：

```sql
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE cost_of_goods_sold > 0) as with_cogs,
  AVG(cost_of_goods_sold) as avg_cogs
FROM sales
WHERE date >= NOW() - INTERVAL '30 days';
```

---

## 检查清单

执行完成后，请检查以下项目：

- [ ] SQL 字段已成功添加
- [ ] 历史销售记录已补充 COGS（至少 95% 以上）
- [ ] 新建销售会自动记录 COGS
- [ ] 损益报表使用实际 COGS 计算
- [ ] 测试场景 2（售完后再进货）正常
- [ ] 毛利率在合理范围内（根据业务实际情况）

---

## 后续维护

### 日常操作

- **正常销售**: 无需额外操作，系统自动记录 COGS
- **删除销售**: COGS 会随销售记录一起删除
- **修改销售**: 目前不支持修改 COGS（需要删除重建）

### 定期检查

建议每月运行一次 `verify-cogs-fix.js` 确保数据完整性。

### 成本重新计算

如果需要重新计算产品平均成本（如发现进货记录错误）：

1. 运行 `fix-all-cost-issues.js` 修复产品成本
2. **不要**重新运行 `backfill-sales-cogs.js`（保持历史 COGS 不变）
3. 新的销售会使用新的平均成本

---

## 完成确认

修复完成后，您应该看到：

✅ 销售时记录实际成本，不受后续进货影响
✅ 损益报表准确反映每个时期的实际毛利
✅ 符合会计的成本配比原则
✅ 售完后再进货不会影响历史数据

如有任何问题，请参考 `verify-cogs-fix.js` 的输出进行排查。
