const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function finalFixAllCosts() {
  console.log('🔧 最終修復所有成本數據...\n')

  // 查詢所有產品
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('id')

  let fixedCount = 0

  for (const product of products) {
    // 查詢該產品的所有進貨記錄
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

    // 計算進貨總量和總成本
    const totalStockInQty = stockIns?.reduce((sum, s) => sum + (s.total_quantity || 0), 0) || 0
    const totalStockInCost = stockIns?.reduce((sum, s) => sum + (s.total_cost || 0), 0) || 0

    // 計算正確的加權平均成本
    const correctAvgCost = totalStockInQty > 0 ? totalStockInCost / totalStockInQty : 0

    // 查詢該產品的所有銷售記錄
    const { data: sales } = await supabase
      .from('sales')
      .select('*')
      .eq('product_id', product.id)

    const totalSoldQty = sales?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0

    // 計算理論剩餘庫存
    const theoreticalStock = totalStockInQty - totalSoldQty

    // 檢查是否需要修復
    const avgCostDiff = Math.abs(correctAvgCost - product.avg_unit_cost)
    const stockDiff = Math.abs(theoreticalStock - product.total_stock)

    if (avgCostDiff > 0.01 || stockDiff > 0) {
      console.log(`\n修復產品 #${product.id}: ${product.product_name}${product.color ? ` (${product.color})` : ''}`)
      console.log(`  進貨: ${stockIns?.length || 0} 筆, 總量 ${totalStockInQty}, 總成本 $${totalStockInCost.toFixed(2)}`)
      console.log(`  銷售: ${sales?.length || 0} 筆, 總量 ${totalSoldQty}`)
      console.log(`  理論剩餘庫存: ${theoreticalStock}, 實際: ${product.total_stock}`)
      console.log(`  當前平均成本: $${product.avg_unit_cost.toFixed(2)}`)
      console.log(`  正確平均成本: $${correctAvgCost.toFixed(2)} (進貨總成本 / 進貨總量)`)

      // 1. 更新平均成本
      await supabase
        .from('products')
        .update({
          avg_unit_cost: correctAvgCost,
          total_stock: theoreticalStock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id)

      console.log(`  ✅ 已更新平均成本和庫存數量`)

      // 2. 重新計算所有銷售的 COGS
      if (sales && sales.length > 0) {
        let updatedCount = 0
        for (const sale of sales) {
          const newCOGS = correctAvgCost * sale.quantity
          await supabase
            .from('sales')
            .update({ cost_of_goods_sold: newCOGS })
            .eq('id', sale.id)
          updatedCount++
        }

        console.log(`  ✅ 已重新計算 ${updatedCount} 筆銷售的 COGS`)
      }

      // 3. 重新計算剩餘成本
      const totalCOGS = (sales?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0) * correctAvgCost
      const newTotalCostValue = Math.max(0, totalStockInCost - totalCOGS)

      await supabase
        .from('products')
        .update({
          total_cost_value: newTotalCostValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id)

      console.log(`  ✅ 已更新剩餘成本: $${newTotalCostValue.toFixed(2)}`)
      console.log(`     (進貨總成本 $${totalStockInCost.toFixed(2)} - 總 COGS $${totalCOGS.toFixed(2)})`)

      fixedCount++
    }
  }

  console.log(`\n\n========== 修復完成 ==========`)
  console.log(`成功修復 ${fixedCount} 個產品`)
  console.log(`===============================\n`)
}

finalFixAllCosts().catch(console.error)
