# 庫存系統計算邏輯全面檢查報告

**檢查日期：** 2025-12-10
**狀態：** ✅ 所有邏輯已修復並通過檢查

---

## 📊 核心計算公式

系統使用統一的計算邏輯：

```
avg_unit_cost = 總進貨成本 ÷ 總進貨數量
total_cost_value = 當前庫存數量 × avg_unit_cost
COGS (每筆銷售) = avg_unit_cost × 銷售數量
```

---

## ✅ 檢查結果總覽

| 功能模組 | 文件位置 | 狀態 | 備註 |
|---------|---------|------|------|
| **新增進貨** | `inventory-utils.ts:processStockIn` | ✅ 已修復 | 已改用正確的計算邏輯 |
| **編輯進貨** | `api/inventory/stock-in:PUT` | ✅ 正確 | 使用 updateProductSalesCOGS |
| **刪除進貨** | `api/inventory/stock-in:DELETE` | ✅ 正確 | 使用 updateProductSalesCOGS |
| **新增銷售** | `inventory-utils.ts:processSale` | ✅ 正確 | 平均成本不變，重算庫存價值 |
| **編輯銷售** | `api/sales:PUT` | ✅ 正確 | 平均成本不變，更新 COGS |
| **刪除銷售** | `api/sales:DELETE` | ✅ 正確 | 平均成本不變，重算庫存價值 |
| **COGS 同步** | `update-sales-cogs.ts` | ✅ 正確 | 批量更新銷售 COGS 和庫存價值 |
| **修復工具** | `api/fix-total-cost-value` | ✅ 已更新 | 重算所有產品的平均成本和庫存價值 |

---

## 🔍 詳細檢查

### 1. ✅ 新增進貨 (processStockIn)

**文件：** `src/lib/inventory-utils.ts:65-94`

**修復前（錯誤）：**
```typescript
const newTotalCostValue = previousTotalCostValue + stockInData.total_cost
const newAvgUnitCost = newTotalStock > 0 ? newTotalCostValue / newTotalStock : 0
```
❌ 問題：用「當前庫存」計算平均成本，在有銷售時會錯誤

**修復後（正確）：**
```typescript
// 1. 查詢該產品的所有進貨記錄
// 2. 計算總進貨成本和總進貨數量
const newAvgUnitCost = totalStockInQty > 0 ? totalStockInCost / totalStockInQty : 0
// 3. 當前庫存的成本價值
const newTotalCostValue = newTotalStock * newAvgUnitCost
```
✅ 正確：用「總進貨數量」計算平均成本

**數據更新：**
- ✅ `size_stock` - 合併尺寸庫存
- ✅ `total_stock` - 增加庫存數量
- ✅ `avg_unit_cost` - 基於總進貨重新計算
- ✅ `total_cost_value` - 當前庫存 × 平均成本

---

### 2. ✅ 編輯進貨 (PUT /api/inventory/stock-in)

**文件：** `src/app/api/inventory/stock-in/route.ts:305-607`

**邏輯流程：**
1. 查詢原始進貨記錄
2. 如果修改數量：調整產品庫存
3. 查詢所有進貨記錄，重新計算總進貨成本和數量
4. 計算新的平均成本
5. 調用 `updateProductSalesCOGS()` 更新：
   - 所有銷售記錄的 COGS
   - 產品的 total_cost_value

**數據連動：**
- ✅ 產品庫存（如果數量變化）
- ✅ 產品平均成本
- ✅ 所有銷售記錄的 COGS
- ✅ 產品庫存價值
- ✅ 庫存異動記錄

**正確性驗證：**
```typescript
// 重新計算平均成本（基於所有進貨記錄）
const newAvgUnitCost = totalStockInQty > 0 ? totalStockInCost / totalStockInQty : 0

// 調用 updateProductSalesCOGS 更新 COGS 和 total_cost_value
await updateProductSalesCOGS(product.id, newAvgUnitCost, totalStockInCost)
```
✅ 正確

---

### 3. ✅ 刪除進貨 (DELETE /api/inventory/stock-in)

**文件：** `src/app/api/inventory/stock-in/route.ts:112-302`

**邏輯流程：**
1. 查詢進貨記錄和對應產品
2. 檢查總庫存是否足夠回退
3. 調整尺寸庫存和總庫存
4. 查詢剩餘的進貨記錄，重新計算平均成本
5. 調用 `updateProductSalesCOGS()` 更新 COGS 和庫存價值
6. 刪除進貨記錄

**數據連動：**
- ✅ 產品庫存（扣減）
- ✅ 產品平均成本（基於剩餘進貨重新計算）
- ✅ 所有銷售記錄的 COGS
- ✅ 產品庫存價值
- ✅ 庫存異動記錄

**正確性驗證：**
```typescript
// 計算剩餘進貨的平均成本
const newAvgUnitCost = totalStockInQty > 0 ? totalStockInCost / totalStockInQty : 0

// 調用 updateProductSalesCOGS 更新所有相關數據
await updateProductSalesCOGS(product.id, newAvgUnitCost, totalStockInCost)
```
✅ 正確

---

### 4. ✅ 新增銷售 (processSale)

**文件：** `src/lib/inventory-utils.ts:290-308`

**邏輯流程：**
1. 檢查庫存是否足夠
2. 插入銷售記錄
3. 扣減庫存（尺寸庫存和總庫存）
4. 計算 COGS = avg_unit_cost × 數量
5. 更新產品：
   - 平均成本保持不變
   - total_cost_value = 新庫存 × 平均成本

**數據連動：**
- ✅ 產品庫存（扣減）
- ✅ 產品平均成本（不變）
- ✅ 產品庫存價值（重新計算）
- ✅ 銷售記錄的 COGS
- ✅ 庫存異動記錄

**正確性驗證：**
```typescript
const newAvgUnitCost = product.avg_unit_cost  // 不變
const newTotalCostValue = newTotalStock * newAvgUnitCost
```
✅ 正確：銷售時平均成本不應變動，只重新計算庫存價值

---

### 5. ✅ 編輯銷售 (PUT /api/sales)

**文件：** `src/app/api/sales/route.ts:202-370`

**邏輯流程（數量變更時）：**
1. 查詢原始銷售記錄
2. 計算數量差異
3. 如果數量增加：檢查庫存是否足夠
4. 調整產品庫存（補回或扣減）
5. 重新計算 COGS = avg_unit_cost × 新數量
6. 重新計算 total_cost_value = 新庫存 × avg_unit_cost

**數據連動：**
- ✅ 產品庫存（根據數量變化調整）
- ✅ 產品平均成本（不變）
- ✅ 產品庫存價值（重新計算）
- ✅ 銷售記錄的 COGS（重新計算）
- ✅ 庫存異動記錄

**正確性驗證：**
```typescript
const newCOGS = product.avg_unit_cost * newQuantity
const newTotalCostValue = Math.max(0, newTotalStock * product.avg_unit_cost)
```
✅ 正確

---

### 6. ✅ 刪除銷售 (DELETE /api/sales)

**文件：** `src/app/api/sales/route.ts:100-199`

**邏輯流程：**
1. 查詢銷售記錄和對應產品
2. 恢復庫存（尺寸庫存和總庫存）
3. 平均成本保持不變
4. 重新計算 total_cost_value = 新庫存 × avg_unit_cost
5. 刪除銷售記錄

**數據連動：**
- ✅ 產品庫存（恢復）
- ✅ 產品平均成本（不變）
- ✅ 產品庫存價值（重新計算）
- ✅ 庫存異動記錄

**正確性驗證：**
```typescript
const newAvgUnitCost = product.avg_unit_cost  // 不變
const newTotalCostValue = newTotalStock * newAvgUnitCost
```
✅ 正確

---

### 7. ✅ COGS 同步更新 (updateProductSalesCOGS)

**文件：** `src/lib/update-sales-cogs.ts`

**功能：** 當進貨記錄被修改或刪除時，重新計算該產品所有銷售的 COGS

**邏輯流程：**
1. 查詢該產品的所有銷售記錄
2. 批量更新所有銷售的 COGS = newAvgUnitCost × quantity
3. 計算總 COGS
4. 更新產品的 total_cost_value = total_stock × newAvgUnitCost

**數據連動：**
- ✅ 所有銷售記錄的 cost_of_goods_sold
- ✅ 產品的 total_cost_value

**正確性驗證：**
```typescript
// 更新每筆銷售的 COGS
cost_of_goods_sold: newAvgUnitCost * sale.quantity

// 更新產品庫存價值
total_cost_value: product.total_stock * newAvgUnitCost
```
✅ 正確

---

### 8. ✅ 修復工具 (fix-total-cost-value)

**文件：**
- `src/app/api/fix-total-cost-value/route.ts`
- `fix-total-cost-value.js`
- `fix-cost-value.html`

**功能：** 重新計算所有產品的平均成本和庫存價值

**邏輯流程：**
1. 查詢所有產品
2. 對每個產品：
   - 查詢所有進貨記錄
   - 計算總進貨成本和總進貨數量
   - 重新計算 avg_unit_cost = 總成本 ÷ 總數量
   - 重新計算 total_cost_value = 當前庫存 × avg_unit_cost
3. 更新有差異的產品

**正確性驗證：**
```typescript
const correctAvgUnitCost = totalStockInQty > 0 ? totalStockInCost / totalStockInQty : 0
const correctTotalCostValue = product.total_stock * correctAvgUnitCost
```
✅ 正確

---

## 🎯 數據連動檢查

### 進貨操作的連動關係

| 操作 | avg_unit_cost | total_cost_value | 銷售 COGS | 庫存 |
|-----|---------------|------------------|-----------|------|
| 新增進貨 | ✅ 重新計算 | ✅ 重新計算 | ❌ 不影響 | ✅ 增加 |
| 編輯進貨（成本） | ✅ 重新計算 | ✅ 重新計算 | ✅ 批量更新 | ❌ 不變 |
| 編輯進貨（數量） | ✅ 重新計算 | ✅ 重新計算 | ✅ 批量更新 | ✅ 調整 |
| 刪除進貨 | ✅ 重新計算 | ✅ 重新計算 | ✅ 批量更新 | ✅ 扣減 |

### 銷售操作的連動關係

| 操作 | avg_unit_cost | total_cost_value | COGS | 庫存 |
|-----|---------------|------------------|------|------|
| 新增銷售 | ❌ 不變 | ✅ 重新計算 | ✅ 計算 | ✅ 扣減 |
| 編輯銷售（數量） | ❌ 不變 | ✅ 重新計算 | ✅ 重新計算 | ✅ 調整 |
| 編輯銷售（單價） | ❌ 不變 | ❌ 不影響 | ❌ 不影響 | ❌ 不變 |
| 刪除銷售 | ❌ 不變 | ✅ 重新計算 | ❌ 刪除 | ✅ 恢復 |

---

## 💡 關鍵概念說明

### 1. 為什麼銷售不影響平均成本？

**原理：**
- `avg_unit_cost` 是**進貨成本**的加權平均，不是庫存成本
- 銷售只是將庫存轉移給客戶，不改變進貨成本
- 只有進貨操作（新增、編輯、刪除）才會改變平均成本

**正確流程：**
```
進貨 10 個 @ $10 → avg_unit_cost = $10
銷售 6 個        → avg_unit_cost = $10 (不變)
進貨 5 個 @ $20  → avg_unit_cost = ($10×10 + $20×5) / 15 = $13.33
```

### 2. total_cost_value 的意義

**概念：** 當前庫存的成本價值（剩餘資產價值）

**計算：**
```
total_cost_value = 當前庫存數量 × 平均成本
```

**變化時機：**
- ✅ 庫存數量變化時（進貨、銷售、調整）
- ✅ 平均成本變化時（進貨記錄的編輯或刪除）

### 3. COGS 的同步更新

**何時需要更新：** 當進貨記錄被修改或刪除，導致平均成本變化時

**為什麼要更新：** 確保所有歷史銷售記錄使用正確的成本，財務報表才準確

**更新範圍：** 該產品的所有銷售記錄

---

## 🔒 數據一致性保證

### 1. 平均成本的一致性

**公式：**
```
avg_unit_cost = (∑ 所有進貨的 total_cost) ÷ (∑ 所有進貨的 total_quantity)
```

**保證方式：**
- ✅ 所有進貨操作都重新查詢進貨記錄計算
- ✅ 不使用增量計算，避免累積誤差

### 2. 庫存價值的一致性

**公式：**
```
total_cost_value = total_stock × avg_unit_cost
```

**保證方式：**
- ✅ 所有影響庫存或成本的操作都重新計算
- ✅ 使用 Math.max(0, ...) 防止負值

### 3. COGS 的一致性

**公式：**
```
cost_of_goods_sold = avg_unit_cost × quantity
```

**保證方式：**
- ✅ 新增銷售時自動計算
- ✅ 編輯銷售數量時重新計算
- ✅ 平均成本變化時批量更新所有銷售

---

## ⚠️ 注意事項

### 1. 精度處理
- 所有金額計算使用 JavaScript number（雙精度浮點數）
- 比較時使用 `Math.abs(a - b) > 0.01` 容許 1 分錢誤差
- 顯示時使用 `toFixed(2)` 保留兩位小數

### 2. 邊界情況
- ✅ 庫存為 0 時，avg_unit_cost 保持不變（用於財務報表）
- ✅ total_cost_value 使用 Math.max(0, ...) 防止負值
- ✅ 刪除進貨時檢查庫存是否足夠回退
- ✅ 銷售時檢查成本是否為 0，防止零成本銷售

### 3. 事務處理
- ⚠️ 目前沒有使用數據庫事務
- 如果某個步驟失敗，可能導致數據不一致
- 建議：未來考慮使用 Supabase 的事務功能

---

## 📈 測試建議

### 測試場景 1：基本進貨和銷售
```
1. 進貨 10 個 @ $10 → 庫存 10, 成本 $10, 價值 $100
2. 銷售 6 個        → 庫存 4, 成本 $10, 價值 $40
3. 進貨 5 個 @ $20  → 庫存 9, 成本 $13.33, 價值 $120
```

### 測試場景 2：編輯進貨成本
```
1. 進貨 10 個 @ $10
2. 銷售 3 個 (COGS = $30)
3. 編輯進貨成本為 $15
   → avg_unit_cost = $15
   → total_cost_value = 7 × $15 = $105
   → 銷售 COGS 更新為 $45
```

### 測試場景 3：刪除進貨
```
1. 進貨 A: 10 個 @ $10
2. 進貨 B: 5 個 @ $20
3. 銷售 8 個 (COGS = 8 × $13.33 = $106.67)
4. 刪除進貨 B
   → avg_unit_cost = $10
   → total_stock = 7
   → total_cost_value = 7 × $10 = $70
   → 銷售 COGS 更新為 8 × $10 = $80
```

---

## ✅ 結論

**系統狀態：** 🟢 健康

所有數字計算邏輯和資料連動已經過全面檢查，修復了唯一的問題（processStockIn 的平均成本計算），現在系統使用統一且正確的計算邏輯。

**核心原則：**
1. ✅ 平均成本基於**總進貨**計算，不受庫存影響
2. ✅ 庫存價值 = 當前庫存 × 平均成本
3. ✅ COGS = 平均成本 × 銷售數量
4. ✅ 進貨變動會同步更新所有相關銷售的 COGS

**下一步建議：**
1. 執行 `fix-total-cost-value` 修復現有數據
2. 進行上述測試場景驗證
3. 考慮添加數據庫事務保證操作原子性
4. 添加單元測試覆蓋核心計算邏輯
