const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * 測試場景：
 * 1. 產品已售完（庫存 = 0，total_cost_value 應該 = 0）
 * 2. 模擬修改進貨成本（例如從 $3400 改成 $4000）
 * 3. 驗證：
 *    - total_cost_value 應該還是 0（因為售完了）
 *    - 銷售的 COGS 應該被更新為新的平均成本
 */
async function testSoldOutCostEdit() {
  console.log('=== 測試售完產品修改進貨成本 ===\n')

  // 1. 找一個售完的產品
  const { data: soldOutProducts } = await supabase
    .from('products')
    .select('*')
    .eq('total_stock', 0)
    .limit(1)

  if (!soldOutProducts || soldOutProducts.length === 0) {
    console.log('❌ 沒有找到售完的產品')
    return
  }

  const product = soldOutProducts[0]
  console.log(`找到售完產品: ${product.product_name} (ID: ${product.id})`)
  console.log(`當前庫存: ${product.total_stock}`)
  console.log(`當前平均成本: $${product.avg_unit_cost?.toFixed(2) || 0}`)
  console.log(`當前總成本價值: $${product.total_cost_value?.toFixed(2) || 0}\n`)

  // 2. 查詢進貨記錄
  let stockInQuery = supabase
    .from('stock_in')
    .select('*')
    .eq('category_id', product.category_id)
    .eq('product_name', product.product_name)

  if (product.color) {
    stockInQuery = stockInQuery.eq('color', product.color)
  } else {
    stockInQuery = stockInQuery.is('color', null)
  }

  const { data: stockIns } = await stockInQuery

  if (!stockIns || stockIns.length === 0) {
    console.log('❌ 這個產品沒有進貨記錄')
    return
  }

  console.log(`進貨記錄: ${stockIns.length} 筆`)
  const totalStockInCost = stockIns.reduce((sum, si) => sum + si.total_cost, 0)
  const totalStockInQty = stockIns.reduce((sum, si) => sum + si.total_quantity, 0)
  console.log(`總進貨: ${totalStockInQty} 個，成本 $${totalStockInCost.toFixed(2)}\n`)

  // 3. 查詢銷售記錄
  const { data: sales } = await supabase
    .from('sales')
    .select('*')
    .eq('product_id', product.id)

  if (!sales || sales.length === 0) {
    console.log('❌ 這個產品沒有銷售記錄')
    return
  }

  console.log(`銷售記錄: ${sales.length} 筆`)
  const totalSalesQty = sales.reduce((sum, s) => sum + s.quantity, 0)
  const oldTotalCOGS = sales.reduce((sum, s) => sum + (s.cost_of_goods_sold || 0), 0)
  console.log(`總銷售: ${totalSalesQty} 個，COGS $${oldTotalCOGS.toFixed(2)}\n`)

  // 4. 驗證初始狀態
  console.log('=== 初始狀態驗證 ===')
  const initialExpectedRemainingCost = totalStockInCost - oldTotalCOGS
  console.log(`理論剩餘成本: $${initialExpectedRemainingCost.toFixed(2)}`)
  console.log(`實際剩餘成本: $${product.total_cost_value?.toFixed(2) || 0}`)

  if (Math.abs(product.total_cost_value - initialExpectedRemainingCost) < 0.1) {
    console.log('✅ 初始成本計算正確\n')
  } else {
    console.log(`⚠️ 初始成本有誤差: ${Math.abs(product.total_cost_value - initialExpectedRemainingCost).toFixed(2)}\n`)
  }

  // 5. 模擬修改第一筆進貨的成本（增加 20%）
  const firstStockIn = stockIns[0]
  const oldUnitCost = firstStockIn.unit_cost
  const newUnitCost = oldUnitCost * 1.2
  const newTotalCost = newUnitCost * firstStockIn.total_quantity

  console.log('=== 模擬修改進貨成本 ===')
  console.log(`進貨記錄 ID: ${firstStockIn.id}`)
  console.log(`舊單價: $${oldUnitCost} → 新單價: $${newUnitCost}`)
  console.log(`舊總成本: $${firstStockIn.total_cost} → 新總成本: $${newTotalCost}\n`)

  // 計算修改後的理論值
  const newTotalStockInCost = totalStockInCost - firstStockIn.total_cost + newTotalCost
  const newAvgUnitCost = newTotalStockInCost / totalStockInQty
  const newExpectedCOGS = newAvgUnitCost * totalSalesQty
  const newExpectedRemainingCost = newTotalStockInCost - newExpectedCOGS

  console.log('=== 預期結果 ===')
  console.log(`新總進貨成本: $${newTotalStockInCost.toFixed(2)}`)
  console.log(`新平均成本: $${newAvgUnitCost.toFixed(2)}`)
  console.log(`新總銷售 COGS: $${newExpectedCOGS.toFixed(2)}`)
  console.log(`預期剩餘成本: $${newExpectedRemainingCost.toFixed(2)}`)
  console.log(`預期剩餘庫存: 0\n`)

  console.log('✅ 測試場景設定完成')
  console.log('💡 請在前端修改進貨記錄 ID ' + firstStockIn.id + ' 的單價')
  console.log(`   從 $${oldUnitCost} 改為 $${newUnitCost}`)
  console.log('   然後重新執行此腳本驗證結果')
}

testSoldOutCostEdit().catch(console.error)
