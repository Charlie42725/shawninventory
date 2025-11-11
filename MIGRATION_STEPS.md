# 系統遷移步驟

## 🚨 重要: 資料庫會被重建,舊資料會遺失

## 1. 備份現有資料 (如果需要)

在 Supabase Dashboard > SQL Editor 執行:
```sql
-- 匯出銷售資料
SELECT * FROM sales ORDER BY created_at DESC;

-- 匯出庫存資料
SELECT * FROM inventory ORDER BY created_at DESC;
```

## 2. 重建資料庫

在 Supabase SQL Editor 執行整個 `supabase_init.sql` 檔案。

這會:
- ✅ 刪除舊表格
- ✅ 創建新表格結構
- ✅ 初始化 4 大產品類別

## 3. 更新程式碼

已完成的檔案:
- ✅ `supabase_init.sql` - 新資料庫結構
- ✅ `src/lib/database.types.ts` - TypeScript 類型
- ✅ `src/lib/inventory-utils.ts` - 核心邏輯

需要手動替換:
```bash
# 刪除 v2 API 路由
rm -rf src/app/api/v2

# 刪除 v2 頁面
rm -rf src/app/inventory-v2
rm -rf src/app/sales-v2
```

## 4. 更新現有 API 路由

### 創建新 API:

**src/app/api/categories/route.ts:**
```typescript
import { NextResponse } from 'next/server'
import { getProductCategories } from '@/lib/inventory-utils'

export async function GET() {
  try {
    const categories = await getProductCategories()
    return NextResponse.json(categories)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

### 更新 inventory API (src/app/api/inventory/route.ts):

替換為使用新的 `getProducts()` 函式。

### 更新 stock-in API:

使用新的 `processStockIn()` 函式。

### 更新 sales API:

使用新的 `processSale()` 函式。

## 5. 更新前端頁面

### src/app/inventory/page.tsx

參考 `src/app/inventory-v2/page.tsx` 的實作,整合到現有頁面。

主要改動:
- 新增類別篩選
- 新增尺寸輸入介面
- 更新 API 呼叫

### src/app/sales/page.tsx

參考 `src/app/sales-v2/page.tsx` 的實作。

主要改動:
- 產品選擇改為從 products 表查詢
- 新增尺寸選擇
- 更新 API 呼叫

## 6. 更新 Navigation

在 `src/components/Navigation.tsx` 中,路由保持不變:
- `/inventory` - 庫存管理
- `/sales` - 銷售記錄

## 7. 測試流程

1. **測試類別查詢**:
   - GET /api/categories
   - 應返回 4 個類別

2. **測試進貨**:
   - 選擇類別: 服飾
   - 產品名稱: 測試T恤
   - 顏色: 白色
   - 尺寸數量: S:10, M:20, L:15
   - 單價: 100

3. **測試銷售**:
   - 選擇產品
   - 選擇尺寸
   - 檢查庫存是否正確扣減

## 8. 清理舊檔案

```bash
# 備份檔案
mv src/lib/inventory-utils-old.ts archive/
mv src/lib/inventory-matcher.ts archive/
mv supabase_init_old.sql archive/

# 刪除 v2 檔案
rm -rf src/app/api/v2
rm -rf src/app/inventory-v2
rm -rf src/app/sales-v2
rm database_schema_v2.sql
rm DEPLOYMENT_V2.md
```

## 9. 文檔更新

- ✅ CLAUDE.md - 已更新
- ✅ 新增使用說明

## 注意事項

1. **這是破壞性更新** - 舊資料會遺失
2. **測試環境先試** - 建議先在測試專案試用
3. **備份環境變數** - 確認 .env.local 正確
4. **逐步測試** - 每個功能測試後再進行下一步

## 快速開始

如果是全新專案:
```bash
# 1. 安裝依賴
npm install

# 2. 配置環境變數
cp .env.example .env.local
# 編輯 .env.local

# 3. 初始化資料庫
# 在 Supabase SQL Editor 執行 supabase_init.sql

# 4. 啟動開發伺服器
npm run dev

# 5. 訪問
# http://localhost:3000/inventory
```
