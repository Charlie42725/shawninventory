# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# 庫存管理系統 - Claude 技術文檔

## 🏗️ 系統概述

這是一個使用 Next.js 15 + Supabase 構建的全功能庫存管理系統,支援 4 大產品類別 (服飾/鞋子/潮玩/飾品) 並提供彈性的尺寸管理。

## 技術棧

- **框架**: Next.js 15 (App Router), React 19, TypeScript
- **樣式**: Tailwind CSS v4
- **資料庫**: Supabase (PostgreSQL)
- **認證**: Supabase Auth
- **UI 元件**: Radix UI
- **圖表**: Recharts
- **Excel 處理**: XLSX
- **PDF 生成**: jsPDF

## 開發命令

```bash
# 啟動開發伺服器
npm run dev

# 生產環境構建
npm run build

# 啟動生產伺服器
npm start

# 執行 ESLint
npm run lint
```

## 📊 資料庫架構

### 核心表格

#### 1. `product_categories` - 產品類別
存儲 4 大類別及其尺寸配置:
- 服飾 (S, M, L, XL, 2XL, 3XL)
- 鞋子 (US5.5, US6, US6.5, ..., US13)
- 潮玩 (無尺寸)
- 飾品 (US5, US6, US7, ..., US11)

```sql
CREATE TABLE product_categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  size_config JSONB,  -- {"sizes": ["S", "M", "L"]}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. `products` - 產品庫存
存儲所有產品的庫存資訊:
```sql
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT NOT NULL REFERENCES product_categories(id),
  product_name TEXT NOT NULL,
  color TEXT,
  ip_category TEXT,  -- 潮玩專用
  size_stock JSONB DEFAULT '{}'::jsonb,  -- {"S": 10, "M": 20}
  total_stock INTEGER DEFAULT 0,
  avg_unit_cost DECIMAL(10,2) DEFAULT 0,
  total_cost_value DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id, product_name, color)
);
```

**核心欄位說明:**
- `size_stock`: JSONB 格式儲存各尺寸庫存,例如 `{"S": 10, "M": 20, "L": 15}`
- `total_stock`: 總庫存數(自動計算)
- `avg_unit_cost`: 平均單位成本(加權平均)
- `total_cost_value`: 總成本價值 = avg_unit_cost × total_stock

#### 3. `stock_in` - 進貨記錄
```sql
CREATE TABLE stock_in (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  order_type TEXT NOT NULL,  -- '進貨' 或 '預購'
  category_id BIGINT NOT NULL REFERENCES product_categories(id),
  product_name TEXT NOT NULL,
  color TEXT,
  ip_category TEXT,
  size_quantities JSONB DEFAULT '{}'::jsonb,
  total_quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(12,2) NOT NULL,
  note TEXT,
  created_by TEXT DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4. `sales` - 銷售記錄
```sql
CREATE TABLE sales (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_type TEXT NOT NULL,  -- '零售', '批發', '預購'
  product_id BIGINT REFERENCES products(id),
  product_name TEXT NOT NULL,
  size TEXT,
  channel TEXT,  -- '社團', '店家', '國外'
  shipping_method TEXT,  -- '現貨面交', '店到店', '宅配'
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  note TEXT,
  created_by TEXT DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5. `inventory_movements` - 庫存異動記錄
追蹤所有庫存變化:
```sql
CREATE TABLE inventory_movements (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id),
  movement_type TEXT NOT NULL,  -- 'stock_in', 'sale', 'adjustment'
  size TEXT,
  quantity INTEGER NOT NULL,
  previous_total INTEGER NOT NULL,
  current_total INTEGER NOT NULL,
  reference_type TEXT,  -- 'stock_in', 'sale', 'sale_deletion'
  reference_id BIGINT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔄 核心業務邏輯

### 1. 進貨流程 (`processStockIn`)

**位置**: `src/lib/inventory-utils.ts`

**流程**:
1. 根據 (category_id, product_name, color) 查找或創建產品
2. 合併尺寸庫存: `newStock[size] = oldStock[size] + incomingQty`
3. 計算加權平均成本:
   ```typescript
   newAvgCost = (oldTotalCostValue + newTotalCost) / newTotalStock
   ```
4. 更新 products 表
5. 創建 stock_in 記錄
6. 記錄 inventory_movements

### 2. 銷售流程 (`processSale`)

**位置**: `src/lib/inventory-utils.ts`

**流程**:
1. 檢查產品是否存在
2. **庫存檢查**:
   - 有尺寸: 檢查 `size_stock[size] >= quantity`
   - 無尺寸: 檢查 `total_stock >= quantity`
3. 扣減庫存:
   ```typescript
   newSizeStock[size] = oldSizeStock[size] - quantity
   newTotalStock = oldTotalStock - quantity
   ```
4. **成本計算**(按比例扣減):
   ```typescript
   costReduction = avg_unit_cost × quantity
   newTotalCostValue = oldTotalCostValue - costReduction
   newAvgCost = newTotalStock > 0 ? newTotalCostValue / newTotalStock : avg_unit_cost
   ```
5. 創建 sales 記錄
6. 記錄 inventory_movements

### 3. 刪除銷售記錄

**位置**: `src/app/api/sales/route.ts` (DELETE)

**流程**:
1. 查詢銷售記錄
2. **恢復庫存**:
   ```typescript
   restoredStock[size] = currentStock[size] + quantity
   ```
3. **恢復成本**:
   ```typescript
   restoredCost = unit_price × quantity  // 使用銷售單價估算
   newTotalCostValue = currentTotalCostValue + restoredCost
   ```
4. 刪除 sales 記錄
5. 記錄 inventory_movements (movement_type: 'adjustment', reference_type: 'sale_deletion')

## 📁 專案結構

```
inventory/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── categories/route.ts      # 類別查詢
│   │   │   ├── inventory/
│   │   │   │   ├── route.ts             # 產品查詢
│   │   │   │   ├── stock-in/route.ts    # 進貨 API
│   │   │   │   └── movements/route.ts   # 異動記錄
│   │   │   └── sales/route.ts           # 銷售 API
│   │   ├── inventory/page.tsx           # 庫存管理頁面
│   │   ├── sales/page.tsx               # 銷售管理頁面
│   │   ├── expenses/page.tsx            # 費用管理
│   │   └── reports/page.tsx             # 報表查詢
│   ├── lib/
│   │   ├── database.types.ts            # TypeScript 類型定義
│   │   ├── inventory-utils.ts           # 核心業務邏輯
│   │   └── supabase.ts                  # Supabase 客戶端
│   └── components/
│       ├── Navigation.tsx               # 導航欄
│       └── ProtectedLayout.tsx          # 受保護頁面布局
├── supabase_init.sql                    # 資料庫初始化 SQL
└── MIGRATION_STEPS.md                   # 遷移步驟文檔
```

## 🎯 API 端點

### 類別相關
- `GET /api/categories` - 查詢所有類別

### 產品相關
- `GET /api/inventory?category_id={id}` - 查詢產品(可選類別篩選)

### 進貨相關
- `GET /api/inventory/stock-in?category_id={id}` - 查詢進貨記錄
- `POST /api/inventory/stock-in` - 創建進貨記錄
  ```json
  {
    "date": "2025-01-01",
    "order_type": "進貨",
    "category_id": 1,
    "product_name": "測試T恤",
    "color": "白色",
    "size_quantities": {"S": 10, "M": 20, "L": 15},
    "unit_cost": 100,
    "note": "備註"
  }
  ```

### 銷售相關
- `GET /api/sales?limit=100&customer_type={type}` - 查詢銷售記錄
- `POST /api/sales` - 創建銷售記錄
  ```json
  {
    "date": "2025-01-01",
    "customer_type": "零售",
    "product_id": 1,
    "product_name": "測試T恤",
    "size": "M",
    "channel": "社團",
    "shipping_method": "現貨面交",
    "unit_price": 500,
    "quantity": 2,
    "note": "備註"
  }
  ```
- `DELETE /api/sales?id={id}` - 刪除銷售記錄(自動恢復庫存)

### 異動記錄
- `GET /api/inventory/movements?limit=50` - 查詢庫存異動記錄

## 🔐 環境變數

需要在 `.env.local` 設定:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🚀 部署步驟

### 1. 資料庫初始化
在 Supabase SQL Editor 執行 `supabase_init.sql`

### 2. 安裝依賴
```bash
npm install
```

### 3. 配置環境變數
複製 `.env.example` 到 `.env.local` 並填入 Supabase 憑證

### 4. 啟動開發伺服器
```bash
npm run dev
```

### 5. 訪問應用
- 登入頁面: `http://localhost:3000/login`
- 庫存管理: `http://localhost:3000/inventory`
- 銷售管理: `http://localhost:3000/sales`

## 📝 關鍵特性

### 1. 彈性尺寸管理
- 使用 JSONB 儲存尺寸庫存,不同類別有不同尺寸配置
- 服飾: S/M/L/XL/2XL/3XL
- 鞋子: US5.5~US13
- 潮玩: 無尺寸
- 飾品: US5~US11

### 2. 加權平均成本
每次進貨自動計算新的平均成本:
```
新平均成本 = (舊總成本價值 + 本次進貨成本) / 新總庫存
```

### 3. 自動庫存扣減
銷售時自動:
- 扣減指定尺寸庫存
- 更新總庫存
- 按比例扣減成本價值
- 記錄異動日誌

### 4. 庫存恢復機制
刪除銷售記錄時:
- 自動恢復尺寸庫存
- 恢復總庫存
- 估算並恢復成本價值

### 5. 完整異動追蹤
所有庫存變化都記錄在 `inventory_movements` 表:
- 進貨 (stock_in)
- 銷售 (sale)
- 調整 (adjustment,如銷售刪除)

## 🔍 常見問題

### Q: 如何修改尺寸配置?
A: 在 `src/lib/database.types.ts` 修改 `SIZE_CONFIGS` 常數,並在 Supabase SQL Editor 更新對應類別的 `size_config` 欄位。

### Q: 成本計算方式?
A: 使用加權平均法。每次進貨會重新計算平均成本,銷售時按平均成本扣減。

### Q: 如何處理庫存盤點差異?
A: 未來可以擴展 `movement_type` 為 'adjustment',手動調整庫存並記錄原因。

### Q: 支援多幣別嗎?
A: 目前所有金額統一使用單一幣別(預設台幣),如需支援多幣別需擴展資料庫架構。

## 🛠️ 開發注意事項

1. **TypeScript 類型**: 所有資料庫類型定義在 `src/lib/database.types.ts`
2. **Supabase Admin**: API 路由使用 `supabaseAdmin` 以繞過 RLS
3. **成本精度**: 使用 `DECIMAL(10,2)` 儲存金額,避免浮點數精度問題
4. **事務處理**: 進貨和銷售邏輯包含多個資料庫操作,建議未來加入事務處理
5. **錯誤處理**: 所有 API 端點都有完整的錯誤處理和返回訊息
6. **路徑別名**: `@/*` 對應到 `src/*` 目錄

## 常見開發任務

### 新增產品類別

1. 在 Supabase SQL Editor 新增類別:
```sql
INSERT INTO product_categories (name, size_config)
VALUES ('新類別', '{"sizes": ["尺寸1", "尺寸2"]}'::jsonb);
```

2. 更新 `src/lib/database.types.ts`:
```typescript
export const SIZE_CONFIGS: Record<ProductCategoryName, string[]> = {
  // ... 現有類別
  新類別: ['尺寸1', '尺寸2'],
}
```

### 新增尺寸

直接修改類別的 `size_config`:
```sql
UPDATE product_categories
SET size_config = '{"sizes": ["S", "M", "L", "XL", "2XL", "3XL", "4XL"]}'::jsonb
WHERE name = '服飾';
```

### 修改成本計算邏輯

編輯 `src/lib/inventory-utils.ts` 中的:
- `processStockIn()`: 進貨成本計算
- `processSale()`: 銷售成本計算

## 資料庫維護

### 查詢庫存警示

```sql
SELECT
  pc.name as category,
  p.product_name,
  p.color,
  p.total_stock,
  p.size_stock
FROM products p
JOIN product_categories pc ON p.category_id = pc.id
WHERE p.total_stock < 10
ORDER BY p.total_stock ASC;
```

### 查詢銷售統計

```sql
SELECT
  pc.name as category,
  p.product_name,
  COUNT(s.id) as sale_count,
  SUM(s.quantity) as total_sold,
  SUM(s.total_amount) as total_revenue
FROM sales s
JOIN products p ON s.product_id = p.id
JOIN product_categories pc ON p.category_id = pc.id
WHERE s.date >= '2025-01-01'
GROUP BY pc.name, p.product_name
ORDER BY total_revenue DESC;
```

## 📈 未來擴展方向

- [ ] 批量進貨/銷售
- [ ] 庫存警告通知(低庫存、缺貨)
- [ ] 進階報表(利潤分析、銷售趨勢)
- [ ] 供應商管理
- [ ] 多倉庫支援
- [ ] Excel 匯入/匯出增強
- [ ] 圖片管理
- [ ] 條碼掃描

## 重要檔案參考

- `supabase_init.sql`: 資料庫結構定義
- `src/lib/database.types.ts`: TypeScript 類型定義
- `src/lib/inventory-utils.ts`: 核心業務邏輯
- `src/app/inventory/page.tsx`: 庫存管理頁面
- `src/app/sales/page.tsx`: 銷售管理頁面
- `MIGRATION_STEPS.md`: 系統遷移步驟
