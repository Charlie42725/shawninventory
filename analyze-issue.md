# 庫存價值計算問題分析

## 問題現象
- 產品：Labubu Pulsar (Labubu10週年)
- 總庫存：4 個
- 平均成本：$13,366.99
- **當前庫存價值：$203,340.00** ❌
- **應該的值：4 × $13,366.99 = $53,467.96** ✅

## 數字分析
- $203,340.00 / 4 = $50,835.00
- 用戶修改的進貨總成本 = $50,834.96
- **$203,340.00 ≈ 4 × $50,834.96**

這表明系統可能使用了：
```
total_cost_value = 某個數量 × 進貨總成本
```
而不是正確的：
```
total_cost_value = 當前庫存 × 平均成本
```

## 兩套計算邏輯

### 邏輯 1：新增進貨 (inventory-utils.ts:66)
```typescript
// 累加所有進貨成本
const newTotalCostValue = previousTotalCostValue + stockInData.total_cost
const newAvgUnitCost = newTotalStock > 0 ? newTotalCostValue / newTotalStock : 0
```

**概念：total_cost_value = 累加所有進貨的總成本**

### 邏輯 2：編輯進貨/更新COGS (update-sales-cogs.ts:79)
```typescript
// 基於當前庫存計算
const newTotalCostValue = product.total_stock * newAvgUnitCost
```

**概念：total_cost_value = 當前庫存數量 × 平均成本**

## 正確的概念

在有銷售的情況下：
- **總進貨數量** = 當前庫存 + 已售出數量
- **總進貨成本** = 當前庫存成本 + 已售出成本 (COGS)

因此：
```
total_cost_value (當前庫存成本價值) = 總進貨成本 - 總COGS
                                    = 當前庫存數量 × 平均成本
```

## 問題根源

inventory-utils.ts 中的 processStockIn 邏輯有誤！

**錯誤邏輯 (第 66-67 行)：**
```typescript
const newTotalCostValue = previousTotalCostValue + stockInData.total_cost
const newAvgUnitCost = newTotalStock > 0 ? newTotalCostValue / newTotalStock : 0
```

這個邏輯在**沒有銷售**時是對的，但是當有銷售後：
- newTotalStock = 當前庫存（已扣除銷售）
- newTotalCostValue = 所有進貨的總成本（包含已售出的成本）
- newAvgUnitCost 是對的
- 但 total_cost_value 應該是 `newTotalStock × newAvgUnitCost`，而不是累加值！

**正確邏輯應該是：**
```typescript
const newTotalStock = previousStock + stockInData.total_quantity

// 計算新的加權平均成本（基於總進貨）
const totalStockInCost = previousTotalCostValue + stockInData.total_cost  // 總進貨成本
const totalStockInQty = newTotalStock + totalSoldQty  // 總進貨數量（需要查詢銷售）

const newAvgUnitCost = totalStockInQty > 0 ? totalStockInCost / totalStockInQty : 0

// 當前庫存的成本價值
const newTotalCostValue = newTotalStock * newAvgUnitCost
```

## 修復方案

修改 inventory-utils.ts 的 processStockIn 函數，將 total_cost_value 的計算改為：
```typescript
total_cost_value = newTotalStock × newAvgUnitCost
```

而不是：
```typescript
total_cost_value = previousTotalCostValue + stockInData.total_cost
```
