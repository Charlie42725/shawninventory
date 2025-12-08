const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testCostUpdate() {
  console.log('測試成本更新邏輯...\n')

  // 找一個已售完的產品測試
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('total_stock', 0)
    .limit(1)

  if (!products || products.length === 0) {
    console.log('沒有找到售完的產品')
    return
  }

  const product = products[0]
  console.log(`測試產品: ${product.product_name} (ID: ${product.id})`)
  console.log(`當前庫存: ${product.total_stock}`)
  console.log(`當前總成本: $${product.total_cost_value?.toFixed(2) || 0}`)
  console.log(`當前平均成本: $${product.avg_unit_cost?.toFixed(2) || 0}\n`)

  // 查詢進貨記錄
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

  console.log(`進貨記錄: ${stockIns?.length || 0} 筆`)
  stockIns?.forEach(si => {
    console.log(`  ID ${si.id}: 數量 ${si.total_quantity}, 單價 $${si.unit_cost}, 總成本 $${si.total_cost}`)
  })

  // 查詢銷售記錄
  const { data: sales } = await supabase
    .from('sales')
    .select('*')
    .eq('product_id', product.id)

  console.log(`\n銷售記錄: ${sales?.length || 0} 筆`)
  sales?.forEach(s => {
    console.log(`  ID ${s.id}: 數量 ${s.quantity}, COGS $${s.cost_of_goods_sold}`)
  })

  // 手動計算理論值
  const totalStockInCost = stockIns?.reduce((sum, si) => sum + si.total_cost, 0) || 0
  const totalStockInQty = stockIns?.reduce((sum, si) => sum + si.total_quantity, 0) || 0
  const totalSalesCOGS = sales?.reduce((sum, s) => sum + (s.cost_of_goods_sold || 0), 0) || 0
  const totalSalesQty = sales?.reduce((sum, s) => sum + s.quantity, 0) || 0

  console.log(`\n=== 理論計算 ===`)
  console.log(`總進貨: ${totalStockInQty} 個, 成本 $${totalStockInCost.toFixed(2)}`)
  console.log(`總銷售: ${totalSalesQty} 個, COGS $${totalSalesCOGS.toFixed(2)}`)
  console.log(`理論剩餘庫存: ${totalStockInQty - totalSalesQty}`)
  console.log(`理論剩餘成本: $${(totalStockInCost - totalSalesCOGS).toFixed(2)}`)
  console.log(`\n實際剩餘庫存: ${product.total_stock}`)
  console.log(`實際剩餘成本: $${product.total_cost_value?.toFixed(2) || 0}`)

  const diff = Math.abs(product.total_cost_value - (totalStockInCost - totalSalesCOGS))
  if (diff > 0.02) {
    console.log(`\n⚠️ 發現差異: $${diff.toFixed(2)}`)
  } else {
    console.log(`\n✅ 成本計算正確`)
  }
}

testCostUpdate().catch(console.error)
