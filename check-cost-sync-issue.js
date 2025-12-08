const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkCostSyncIssue() {
  console.log('🔍 檢查進貨修改後的成本同步問題...\n')

  // 1. 查詢所有產品及其進貨和銷售記錄
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('id')

  for (const product of products) {
    // 查詢該產品的所有進貨記錄
    const { data: stockIns } = await supabase
      .from('stock_in')
      .select('*')
      .eq('category_id', product.category_id)
      .eq('product_name', product.product_name)

    // 處理 color 匹配
    let stockInsFiltered = stockIns
    if (product.color) {
      stockInsFiltered = stockIns?.filter(s => s.color === product.color)
    } else {
      stockInsFiltered = stockIns?.filter(s => !s.color || s.color === null)
    }

    // 查詢該產品的所有銷售記錄
    const { data: sales } = await supabase
      .from('sales')
      .select('*')
      .eq('product_id', product.id)

    // 計算理論值
    const totalStockInCost = stockInsFiltered?.reduce((sum, s) => sum + (s.total_cost || 0), 0) || 0
    const totalSoldQuantity = sales?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0
    const totalCOGS = sales?.reduce((sum, s) => sum + (s.cost_of_goods_sold || 0), 0) || 0

    // 理論上的剩餘庫存成本
    const theoreticalRemainingCost = totalStockInCost - totalCOGS

    // 實際的剩餘庫存成本
    const actualRemainingCost = product.total_cost_value

    // 計算差異
    const costDifference = Math.abs(theoreticalRemainingCost - actualRemainingCost)

    if (costDifference > 0.01) {
      console.log(`❌ 產品 #${product.id}: ${product.product_name}${product.color ? ` (${product.color})` : ''}`)
      console.log(`   進貨總成本: $${totalStockInCost.toFixed(2)}`)
      console.log(`   已售數量: ${totalSoldQuantity}`)
      console.log(`   已售 COGS: $${totalCOGS.toFixed(2)}`)
      console.log(`   理論剩餘成本: $${theoreticalRemainingCost.toFixed(2)}`)
      console.log(`   實際剩餘成本: $${actualRemainingCost.toFixed(2)}`)
      console.log(`   差異: $${costDifference.toFixed(2)} ⚠️`)
      console.log(`   平均成本: $${product.avg_unit_cost.toFixed(2)}`)
      console.log(`   剩餘庫存: ${product.total_stock}`)
      console.log()
    }
  }

  console.log('\n✅ 檢查完成')
}

checkCostSyncIssue().catch(console.error)
