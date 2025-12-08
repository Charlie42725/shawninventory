const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testStockInModification() {
  console.log('🧪 測試修改進貨記錄的成本同步功能...\n')

  // 選擇一個有庫存和銷售記錄的產品進行測試
  const testProductId = 59 // 比奇堡系列盲盒

  // 1. 記錄修改前的狀態
  console.log('📊 第一步：查詢修改前的狀態\n')

  const { data: productBefore } = await supabase
    .from('products')
    .select('*')
    .eq('id', testProductId)
    .single()

  const { data: salesBefore } = await supabase
    .from('sales')
    .select('*')
    .eq('product_id', testProductId)

  let stockInQuery = supabase
    .from('stock_in')
    .select('*')
    .eq('category_id', productBefore.category_id)
    .eq('product_name', productBefore.product_name)

  if (productBefore.color) {
    stockInQuery = stockInQuery.eq('color', productBefore.color)
  } else {
    stockInQuery = stockInQuery.is('color', null)
  }

  const { data: stockInsBefore } = await stockInQuery

  console.log(`產品：${productBefore.product_name}`)
  console.log(`\n修改前狀態：`)
  console.log(`- 進貨記錄數：${stockInsBefore?.length || 0}`)
  console.log(`- 進貨總成本：$${stockInsBefore?.reduce((sum, s) => sum + s.total_cost, 0).toFixed(2)}`)
  console.log(`- 產品平均成本：$${productBefore.avg_unit_cost.toFixed(2)}`)
  console.log(`- 產品庫存成本：$${productBefore.total_cost_value.toFixed(2)}`)
  console.log(`- 產品剩餘庫存：${productBefore.total_stock}`)
  console.log(`- 銷售記錄數：${salesBefore?.length || 0}`)
  if (salesBefore && salesBefore.length > 0) {
    const totalSoldQty = salesBefore.reduce((sum, s) => sum + s.quantity, 0)
    const totalCOGS = salesBefore.reduce((sum, s) => sum + (s.cost_of_goods_sold || 0), 0)
    console.log(`- 已售數量：${totalSoldQty}`)
    console.log(`- 已售 COGS：$${totalCOGS.toFixed(2)}`)
  }

  // 2. 找一個進貨記錄來修改
  if (!stockInsBefore || stockInsBefore.length === 0) {
    console.log('\n❌ 沒有進貨記錄可測試')
    return
  }

  const stockInToModify = stockInsBefore[0]
  const originalCost = stockInToModify.unit_cost
  const newCost = originalCost * 1.1 // 提高 10%

  console.log(`\n📝 第二步：修改進貨記錄 #${stockInToModify.id}`)
  console.log(`   原始單位成本：$${originalCost.toFixed(2)}`)
  console.log(`   新單位成本：$${newCost.toFixed(2)} (提高 10%)`)

  // 3. 調用 API 修改進貨記錄
  const response = await fetch(
    `http://localhost:3000/api/inventory/stock-in?id=${stockInToModify.id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unit_cost: newCost })
    }
  )

  const result = await response.json()

  if (!result.success) {
    console.log(`\n❌ 修改失敗：${result.error}`)
    return
  }

  console.log(`\n✅ 修改成功`)

  // 4. 查詢修改後的狀態
  console.log(`\n📊 第三步：查詢修改後的狀態\n`)

  const { data: productAfter } = await supabase
    .from('products')
    .select('*')
    .eq('id', testProductId)
    .single()

  const { data: salesAfter } = await supabase
    .from('sales')
    .select('*')
    .eq('product_id', testProductId)

  const { data: stockInsAfter } = await stockInQuery

  console.log(`修改後狀態：`)
  console.log(`- 進貨總成本：$${stockInsAfter?.reduce((sum, s) => sum + s.total_cost, 0).toFixed(2)}`)
  console.log(`- 產品平均成本：$${productAfter.avg_unit_cost.toFixed(2)}`)
  console.log(`- 產品庫存成本：$${productAfter.total_cost_value.toFixed(2)}`)
  console.log(`- 產品剩餘庫存：${productAfter.total_stock}`)
  if (salesAfter && salesAfter.length > 0) {
    const totalSoldQty = salesAfter.reduce((sum, s) => sum + s.quantity, 0)
    const totalCOGS = salesAfter.reduce((sum, s) => sum + (s.cost_of_goods_sold || 0), 0)
    console.log(`- 已售數量：${totalSoldQty}`)
    console.log(`- 已售 COGS：$${totalCOGS.toFixed(2)}`)
  }

  // 5. 驗證數據一致性
  console.log(`\n🔍 第四步：驗證數據一致性\n`)

  const totalStockInCost = stockInsAfter?.reduce((sum, s) => sum + s.total_cost, 0) || 0
  const totalCOGS = salesAfter?.reduce((sum, s) => sum + (s.cost_of_goods_sold || 0), 0) || 0
  const expectedRemainingCost = totalStockInCost - totalCOGS
  const actualRemainingCost = productAfter.total_cost_value

  console.log(`驗證結果：`)
  console.log(`- 進貨總成本：$${totalStockInCost.toFixed(2)}`)
  console.log(`- 已售 COGS：$${totalCOGS.toFixed(2)}`)
  console.log(`- 預期剩餘成本：$${expectedRemainingCost.toFixed(2)}`)
  console.log(`- 實際剩餘成本：$${actualRemainingCost.toFixed(2)}`)
  console.log(`- 差異：$${Math.abs(expectedRemainingCost - actualRemainingCost).toFixed(2)}`)

  if (Math.abs(expectedRemainingCost - actualRemainingCost) < 0.01) {
    console.log(`\n✅ 數據一致性驗證通過！`)
  } else {
    console.log(`\n❌ 數據一致性驗證失敗！`)
  }

  // 6. 恢復原始成本
  console.log(`\n🔄 第五步：恢復原始成本\n`)

  const restoreResponse = await fetch(
    `http://localhost:3000/api/inventory/stock-in?id=${stockInToModify.id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unit_cost: originalCost })
    }
  )

  const restoreResult = await restoreResponse.json()

  if (restoreResult.success) {
    console.log(`✅ 已恢復原始成本`)
  } else {
    console.log(`❌ 恢復失敗：${restoreResult.error}`)
  }

  console.log(`\n========== 測試完成 ==========\n`)
}

testStockInModification().catch(console.error)
