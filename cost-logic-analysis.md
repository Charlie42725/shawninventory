# 成本邏輯分析報告

## 1. 新增進貨（processStockIn）✅ 正確

**位置**: `src/lib/inventory-utils.ts:10-164`

### 邏輯
```javascript
// 如果產品已存在
newTotalCostValue = previousTotalCostValue + stockInData.total_cost
newAvgUnitCost = newTotalCostValue / newTotalStock

// 如果是新產品
avg_unit_cost = stockInData.unit_cost
total_cost_value = stockInData.total_cost
```

### 評估
✅ **正確** - 使用加權平均成本法

---

## 2. 修改進貨（PUT /api/inventory/stock-in）⚠️ 有風險

**位置**: `src/app/api/inventory/stock-in/route.ts:299-544`

### 情境 A: 只修改日期/類型/備註
- ✅ 不影響成本，正確

### 情境 B: 修改數量（size_quantities）
```javascript
// 計算新成本
const finalUnitCost = unit_cost !== undefined ? parseFloat(unit_cost) : stockInRecord.unit_cost
const newTotalCost = finalUnitCost * newTotalQuantity
const oldTotalCost = stockInRecord.total_cost

// 更新產品總成本
const newTotalCostValue = product.total_cost_value - oldTotalCost + newTotalCost
const newAvgUnitCost = newProductTotalStock > 0 ? newTotalCostValue / newProductTotalStock : 0
```

### ⚠️ 問題 1: 修改數量但不修改單價時
**案例**:
- 原進貨: 10個 @ $100 = $1,000
- 修改為: 15個（但沒傳 unit_cost）
- **實際計算**: finalUnitCost = 舊單價 $100
- **新總成本**: 15 × $100 = $1,500 ✅
- **結論**: 正確

### ⚠️ 問題 2: 只修改單價
```javascript
} else if (unit_cost !== undefined) {
  // 只更新單價,不更新數量
  const newUnitCost = parseFloat(unit_cost)
  const newTotalCost = newUnitCost * stockInRecord.total_quantity
  const oldTotalCost = stockInRecord.total_cost

  const newTotalCostValue = product.total_cost_value - oldTotalCost + newTotalCost
  const newAvgUnitCost = product.total_stock > 0 ? newTotalCostValue / product.total_stock : 0
```

✅ **正確** - 重新計算成本並更新平均成本

### ⚠️ 問題 3: 自動更新銷售COGS
```javascript
// 自動更新該產品所有銷售記錄的 COGS（方案 B）
const oldAvgCost = product.avg_unit_cost
if (Math.abs(newAvgUnitCost - oldAvgCost) > 0.01) {
  const { updated } = await updateProductSalesCOGS(product.id, newAvgUnitCost)
}
```

✅ **正確** - 會自動同步更新所有銷售記錄的COGS

---

## 3. 刪除進貨（DELETE /api/inventory/stock-in）✅ 正確

**位置**: `src/app/api/inventory/stock-in/route.ts:112-296`

### 邏輯
```javascript
// 扣減成本
const newTotalCostValue = product.total_cost_value - stockInRecord.total_cost

// 重新計算平均成本
const newAvgUnitCost = newTotalStock > 0 ? newTotalCostValue / newTotalStock : 0

// 自動更新所有銷售記錄的 COGS
if (Math.abs(newAvgUnitCost - oldAvgCost) > 0.01) {
  await updateProductSalesCOGS(product.id, newAvgUnitCost)
}
```

### 評估
✅ **正確** - 正確回退成本並同步更新銷售COGS

---

## 4. 新增銷售（processSale）⚠️ 發現問題！

**位置**: `src/lib/inventory-utils.ts:170-310`

### 邏輯
```javascript
// 計算 COGS
const costOfGoodsSold = product.avg_unit_cost * saleData.quantity

// 扣減成本
const newTotalCostValue = Math.max(0, product.total_cost_value - costOfGoodsSold)

// 平均成本保持不變
const newAvgUnitCost = product.avg_unit_cost

// 將 COGS 加入銷售數據
if (saleData.cost_of_goods_sold === undefined || saleData.cost_of_goods_sold === null) {
  saleData.cost_of_goods_sold = costOfGoodsSold
}

// 插入銷售記錄
await supabaseAdmin.from('sales').insert([saleData])

// 更新產品
await supabaseAdmin.from('products').update({
  avg_unit_cost: newAvgUnitCost,
  total_cost_value: newTotalCostValue,
})
```

### 🔴 **致命問題**: 異步寫入順序問題

**問題描述**:
1. **先插入銷售記錄**（第214-222行）
2. **後更新產品成本**（第262-274行）

**但是**，saleData 在第258-260行才設置 COGS：
```javascript
// 第258-260行
if (saleData.cost_of_goods_sold === undefined) {
  saleData.cost_of_goods_sold = costOfGoodsSold  // ← 在這裡設置
}

// 但插入已經在第214-222行完成了！
const { data: sale, error: saleError } = await supabaseAdmin
  .from('sales')
  .insert([saleData])  // ← 這時 saleData 可能還沒有 COGS
```

### ⚠️ 實際測試結果
剛才的案例證實了這個問題：
- **進貨時間**: 2025-12-08 17:35:10
- **銷售時間**: 2025-12-08 17:35:53（43秒後）
- **銷售記錄的COGS**: 0 ❌

**原因**: 雖然代碼在插入前設置了COGS，但如果此時 `product.avg_unit_cost` 還是 0（進貨剛創建產品），計算結果就是 0。

---

## 5. 修改銷售 ❓ 未找到API

**搜尋結果**: 沒有找到 PUT /api/sales 的實現

### 可能性
1. 不支持修改銷售（只能刪除重建）
2. API 尚未實現

---

## 6. 刪除銷售（DELETE /api/sales）⚠️ 有問題

**位置**: `src/app/api/sales/route.ts:98-`（需要查看完整代碼）

### 已知邏輯（部分）
```javascript
// 恢復庫存
const newTotalStock = product.total_stock + sale.quantity

// 重新計算成本 (恢復比例)
const restoredCost = (sale.unit_price * sale.quantity)  // ❌ 使用銷售單價估算
const newTotalCostValue = previousTotalCostValue + restoredCost
```

### 🔴 **嚴重錯誤**: 使用銷售單價恢復成本

**問題**:
- 銷售單價 ≠ 進貨成本
- 例: 進貨 $100，賣 $150
- 刪除銷售時應恢復成本 $100，但代碼恢復了 $150 ❌

**正確做法**:
應該使用銷售記錄中的 `cost_of_goods_sold` 來恢復成本：
```javascript
const restoredCost = sale.cost_of_goods_sold || (product.avg_unit_cost * sale.quantity)
```

---

## 總結：發現的問題

### 🔴 嚴重問題

1. **processSale: COGS 可能為 0**
   - 如果產品剛創建，avg_unit_cost 可能還是 0
   - 導致 COGS = 0 × quantity = 0

2. **DELETE /api/sales: 錯誤使用銷售單價恢復成本**
   - 應該使用 cost_of_goods_sold，而不是 unit_price
   - 會導致成本嚴重失真

### ⚠️ 中等風險

3. **缺少修改銷售的 API**
   - 用戶無法修正錯誤的銷售記錄
   - 只能刪除重建（但刪除有問題）

### ✅ 正確的部分

- 新增進貨
- 修改進貨（包含自動同步COGS）
- 刪除進貨（包含自動同步COGS）
