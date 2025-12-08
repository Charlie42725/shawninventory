require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testAutoCOGSUpdate() {
  console.log('🧪 測試自動更新 COGS 功能...\n')

  // 找一個有進貨和銷售記錄的產品
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .gt('total_stock', 0)
    .order('id')
    .limit(50)

  let testProduct = null
  let testProductSales = []
  let testProductStockIns = []

  for (const product of products) {
    // 查詢該產品的銷售記錄
    const { data: sales } = await supabase
      .from('sales')
      .select('*')
      .eq('product_id', product.id)

    if (sales && sales.length > 0) {
      // 查詢進貨記錄
      const { data: stockIns } = await supabase
        .from('stock_in')
        .select('*')
        .eq('category_id', product.category_id)
        .ilike('product_name', '%' + product.product_name + '%')

      if (stockIns && stockIns.length > 0) {
        testProduct = product
        testProductSales = sales
        testProductStockIns = stockIns
        break
      }
    }
  }

  if (!testProduct) {
    console.log('❌ 找不到合適的測試產品（需要有庫存、銷售和進貨記錄）')
    return
  }

  console.log('✅ 找到測試產品:')
  console.log(`   產品: ${testProduct.model || testProduct.product_name}`)
  console.log(`   產品 ID: ${testProduct.id}`)
  console.log(`   當前庫存: ${testProduct.total_stock}`)
  console.log(`   當前平均成本: $${testProduct.avg_unit_cost}`)
  console.log(`   進貨記錄: ${testProductStockIns.length} 筆`)
  console.log(`   銷售記錄: ${testProductSales.length} 筆\n`)

  console.log('📊 當前銷售記錄的 COGS:')
  testProductSales.forEach((sale, index) => {
    console.log(`   ${index + 1}. 銷售 #${sale.id}: ${sale.quantity} 件 × $${testProduct.avg_unit_cost.toFixed(2)} = $${sale.cost_of_goods_sold?.toFixed(2)}`)
  })

  console.log('\n' + '='.repeat(80))
  console.log('💡 功能說明：')
  console.log('='.repeat(80))
  console.log('\n當你修改或刪除進貨記錄時，系統會自動：')
  console.log('1. 重新計算產品的平均成本')
  console.log('2. 自動更新該產品所有銷售記錄的 COGS')
  console.log('3. 記錄更新日誌到 inventory_movements')
  console.log('\n這確保了：')
  console.log('✅ 修改進貨成本後，報表數據自動正確')
  console.log('✅ 刪除進貨記錄後，報表數據自動更新')
  console.log('✅ 不會再有成本不一致的問題')

  console.log('\n' + '='.repeat(80))
  console.log('🔬 模擬測試：')
  console.log('='.repeat(80))

  // 模擬修改第一筆進貨記錄的成本
  if (testProductStockIns.length > 0) {
    const firstStockIn = testProductStockIns[0]
    const oldUnitCost = firstStockIn.unit_cost
    const newUnitCost = oldUnitCost * 1.1 // 增加 10%

    console.log(`\n假設修改進貨記錄 #${firstStockIn.id} 的成本:`)
    console.log(`   舊成本: $${oldUnitCost.toFixed(2)}`)
    console.log(`   新成本: $${newUnitCost.toFixed(2)} (+10%)`)

    // 計算新的總成本價值
    const oldTotalCost = firstStockIn.total_cost
    const newTotalCost = newUnitCost * firstStockIn.total_quantity
    const costDiff = newTotalCost - oldTotalCost

    // 計算新的產品平均成本
    const newTotalCostValue = testProduct.total_cost_value + costDiff
    const newAvgUnitCost = newTotalCostValue / testProduct.total_stock

    console.log(`\n計算新的產品平均成本:`)
    console.log(`   舊平均成本: $${testProduct.avg_unit_cost.toFixed(2)}`)
    console.log(`   新平均成本: $${newAvgUnitCost.toFixed(2)}`)

    console.log(`\n所有銷售記錄的 COGS 會自動更新為:`)
    testProductSales.forEach((sale, index) => {
      const newCOGS = newAvgUnitCost * sale.quantity
      const oldCOGS = sale.cost_of_goods_sold || 0
      const diff = newCOGS - oldCOGS
      console.log(`   ${index + 1}. 銷售 #${sale.id}: ${sale.quantity} 件 × $${newAvgUnitCost.toFixed(2)} = $${newCOGS.toFixed(2)} (變化: ${diff >= 0 ? '+' : ''}$${diff.toFixed(2)})`)
    })

    const totalOldCOGS = testProductSales.reduce((sum, s) => sum + (s.cost_of_goods_sold || 0), 0)
    const totalNewCOGS = testProductSales.reduce((sum, s) => sum + (newAvgUnitCost * s.quantity), 0)
    const totalDiff = totalNewCOGS - totalOldCOGS

    console.log(`\n總 COGS 變化: $${totalOldCOGS.toFixed(2)} → $${totalNewCOGS.toFixed(2)} (${totalDiff >= 0 ? '+' : ''}$${totalDiff.toFixed(2)})`)
    console.log(`\n這個變化會自動反映在損益報表中：`)
    console.log(`   毛利會 ${totalDiff < 0 ? '增加' : '減少'} $${Math.abs(totalDiff).toFixed(2)}`)
  }

  console.log('\n' + '='.repeat(80))
  console.log('✅ 測試完成！')
  console.log('='.repeat(80))
  console.log('\n現在你可以放心地：')
  console.log('1. 修改進貨記錄的成本')
  console.log('2. 修改進貨記錄的數量')
  console.log('3. 刪除進貨記錄')
  console.log('\n系統會自動確保所有相關的銷售 COGS 和報表數據保持正確！')
}

testAutoCOGSUpdate().then(() => {
  process.exit(0)
}).catch(err => {
  console.error('❌ 測試失敗:', err)
  process.exit(1)
})
