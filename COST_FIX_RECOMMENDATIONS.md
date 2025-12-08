# 成本邏輯修復建議

## 📋 問題總結

經過完整檢查，發現以下問題：

| 問題 | 嚴重程度 | 影響範圍 | 狀態 |
|------|---------|---------|-----|
| **問題 1**: 新增銷售時 COGS 可能為 0 | 🔴 **嚴重** | 損益報表不準確 | 已重現 |
| **問題 2**: 刪除銷售時錯誤使用銷售單價恢復成本 | 🔴 **嚴重** | 產品成本失真 | 已重現 |
| **問題 3**: 修改銷售單價時未更新 COGS | ✅ **非問題** | 無影響（行為正確） | - |

---

## 🔴 問題 1: 新增銷售時 COGS 為 0

### 問題描述

**檔案**: `src/lib/inventory-utils.ts:251`

```javascript
const costOfGoodsSold = product.avg_unit_cost * saleData.quantity
```

如果產品的 `avg_unit_cost` 為 0（例如剛創建但未進貨），計算出的 COGS 就是 0。

### 重現步驟
1. 創建產品（avg_unit_cost = 0）
2. 立即銷售該產品
3. 結果：COGS = 0，損益報表缺少成本

### 影響
- 損益報表的成本少算
- 毛利和淨利虛高
- 財務報表不準確

### 修復方案

#### 方案 A: 防禦性檢查（推薦）

```javascript
// src/lib/inventory-utils.ts:251
const costOfGoodsSold = product.avg_unit_cost * saleData.quantity

// 新增檢查
if (costOfGoodsSold === 0 && product.avg_unit_cost === 0) {
  throw new Error(
    `無法銷售：產品「${saleData.product_name}」的平均成本為 0，` +
    `請先確保已有進貨記錄且成本已正確計算。`
  )
}
```

**優點**:
- 防止錯誤數據進入系統
- 強制用戶先進貨再銷售
- 保證數據一致性

**缺點**:
- 可能影響現有流程（如果有先銷售後進貨的情況）

#### 方案 B: 容錯處理（不推薦）

```javascript
// 如果成本為 0，使用銷售單價的 80% 作為估算
const costOfGoodsSold = product.avg_unit_cost > 0
  ? product.avg_unit_cost * saleData.quantity
  : saleData.unit_price * saleData.quantity * 0.8

if (product.avg_unit_cost === 0) {
  console.warn(`警告：產品「${saleData.product_name}」成本為 0，使用估算值`)
}
```

**缺點**:
- 估算不準確
- 可能掩蓋真實問題

---

## 🔴 問題 2: 刪除銷售時錯誤使用銷售單價恢復成本

### 問題描述

**檔案**: `src/app/api/sales/route.ts:147`

```javascript
// ❌ 錯誤：使用銷售單價
const restoredCost = (sale.unit_price * sale.quantity)
```

### 實例說明

- 進貨成本：$100
- 銷售單價：$150
- 銷售數量：2

**當前邏輯（錯誤）**:
- 銷售時扣除成本：-$200（正確）
- 刪除時恢復成本：+$300（錯誤，應該是 +$200）
- **結果**：成本多出 $100

### 影響
- 產品成本虛高
- 平均成本失真
- 連鎖影響後續所有銷售的 COGS 計算
- 損益報表不準確

### 修復方案（必須修復）

```javascript
// src/app/api/sales/route.ts:145-149

// ❌ 錯誤的代碼
const restoredCost = (sale.unit_price * sale.quantity)

// ✅ 正確的代碼
const restoredCost = sale.cost_of_goods_sold || (product.avg_unit_cost * sale.quantity)
```

**完整修復**:

```javascript
// 重新計算成本 (恢復比例)
const previousTotalCostValue = product.total_cost_value

// 使用銷售記錄中的 COGS 來恢復成本
// 如果 COGS 不存在（歷史數據），則使用當前平均成本估算
const restoredCost = sale.cost_of_goods_sold && sale.cost_of_goods_sold > 0
  ? sale.cost_of_goods_sold
  : product.avg_unit_cost * sale.quantity

const newTotalCostValue = previousTotalCostValue + restoredCost
const newAvgUnitCost = newTotalStock > 0
  ? newTotalCostValue / newTotalStock
  : product.avg_unit_cost

// 如果使用了估算值，記錄警告
if (!sale.cost_of_goods_sold || sale.cost_of_goods_sold === 0) {
  console.warn(
    `警告：銷售記錄 #${sale.id} 的 COGS 為空，` +
    `使用平均成本 $${product.avg_unit_cost} 估算`
  )
}
```

---

## ✅ 問題 3: 修改銷售單價時未更新 COGS（非問題）

### 說明

修改銷售單價時，COGS **不應該**改變，因為：

- **COGS（銷售成本）** = 進貨成本，與售價無關
- **銷售單價** = 賣給客戶的價格，不影響成本

### 現有行為（正確）

```javascript
// src/app/api/sales/route.ts:236-247
if (unit_price !== undefined) {
  updateData.unit_price = parseFloat(unit_price)
  updateData.total_amount = parseFloat(unit_price) * saleRecord.quantity
  // ✅ COGS 不更新 - 這是正確的
}
```

**結論**: 這個行為是正確的，不需要修改。

---

## 🛠️ 修復步驟

### 1. 修復「刪除銷售」邏輯（必須）

**檔案**: `src/app/api/sales/route.ts`

```javascript
// 找到第 145-149 行，替換為：
const previousTotalCostValue = product.total_cost_value

// 使用 COGS 恢復成本，而非銷售單價
const restoredCost = sale.cost_of_goods_sold && sale.cost_of_goods_sold > 0
  ? sale.cost_of_goods_sold
  : product.avg_unit_cost * sale.quantity

const newTotalCostValue = previousTotalCostValue + restoredCost
const newAvgUnitCost = newTotalStock > 0
  ? newTotalCostValue / newTotalStock
  : product.avg_unit_cost

// 記錄警告
if (!sale.cost_of_goods_sold || sale.cost_of_goods_sold === 0) {
  console.warn(
    `[成本恢復] 銷售記錄 #${sale.id} 的 COGS 為 0，` +
    `使用平均成本 $${product.avg_unit_cost} × ${sale.quantity} = $${product.avg_unit_cost * sale.quantity} 估算`
  )
}
```

### 2. 修復「新增銷售」邏輯（推薦）

**檔案**: `src/lib/inventory-utils.ts`

```javascript
// 找到第 251 行附近，修改為：

// 計算 COGS
const costOfGoodsSold = product.avg_unit_cost * saleData.quantity

// 防禦性檢查：禁止銷售成本為 0 的產品
if (costOfGoodsSold === 0) {
  throw new Error(
    `無法銷售：產品「${saleData.product_name}」的平均成本為 0。\n` +
    `這通常表示產品尚未進貨或進貨記錄未正確處理。\n` +
    `請先新增進貨記錄，確保產品有正確的成本後再進行銷售。\n` +
    `當前產品狀態：庫存 ${product.total_stock}，平均成本 $${product.avg_unit_cost}`
  )
}

// 扣減成本（保持不變）
const newTotalCostValue = Math.max(0, product.total_cost_value - costOfGoodsSold)
```

### 3. 驗證修復

運行驗證腳本：

```bash
node test-cost-issues.js
```

應該看到：
- ✅ 測試 1: 銷售時會拋出錯誤（阻止 COGS = 0）
- ✅ 測試 2: 刪除時正確恢復成本

---

## 📊 修復前後對比

### 場景：刪除一筆銷售（進貨成本 $100，銷售單價 $150，數量 2）

| 項目 | 修復前 | 修復後 |
|-----|--------|--------|
| 銷售時扣除成本 | -$200 | -$200 |
| 刪除時恢復成本 | +$300 ❌ | +$200 ✅ |
| 成本差異 | +$100（虛增） | $0（正確） |
| 後續銷售 COGS | 不準確 | 準確 |

---

## ⚠️ 注意事項

### 1. 現有錯誤數據

修復代碼後，**現有的錯誤數據不會自動修正**。需要：

1. 找出所有 COGS = 0 的銷售記錄
2. 使用產品的歷史平均成本補齊
3. 或者標記這些記錄需要人工審核

**查詢腳本**:

```javascript
// 找出所有 COGS = 0 或 null 的銷售記錄
const { data: zeroCOGSSales } = await supabase
  .from('sales')
  .select('id, date, product_name, quantity, unit_price, cost_of_goods_sold')
  .or('cost_of_goods_sold.is.null,cost_of_goods_sold.eq.0')
  .order('date', { ascending: false });

console.log(`找到 ${zeroCOGSSales.length} 筆 COGS 異常的銷售記錄`);
```

### 2. 測試建議

修復後，建議進行以下測試：

1. **新增進貨 → 新增銷售 → 刪除銷售**
   - 驗證成本能正確恢復

2. **新增產品（無進貨）→ 嘗試銷售**
   - 應該被阻擋並顯示錯誤訊息

3. **修改銷售單價**
   - COGS 應該保持不變

4. **修改進貨單價**
   - 所有銷售的 COGS 應該自動更新

### 3. 長期建議

考慮添加數據庫約束或觸發器：

```sql
-- 確保 COGS 不為負數
ALTER TABLE sales
ADD CONSTRAINT check_cogs_non_negative
CHECK (cost_of_goods_sold >= 0);

-- 確保銷售單價不小於成本（可選，根據業務需求）
-- ALTER TABLE sales
-- ADD CONSTRAINT check_price_gt_cost
-- CHECK (unit_price >= cost_of_goods_sold / quantity);
```

---

## 🎯 總結

### 必須修復
1. ✅ **刪除銷售**：使用 COGS 而非銷售單價恢復成本

### 強烈建議修復
2. ⚠️ **新增銷售**：禁止銷售成本為 0 的產品

### 無需修復
3. ✅ **修改銷售單價**：現有行為正確

修復完成後，系統的成本計算將更加準確可靠！
