const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixAvgUnitCost() {
  console.log('🔧 修復平均單位成本...\n')

  // 查詢所有產品
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('id')

  let fixedCount = 0

  for (const product of products) {
    // 計算理論平均成本
    const theoreticalAvgCost = product.total_stock > 0
      ? product.total_cost_value / product.total_stock
      : product.avg_unit_cost

    const costDiff = Math.abs(theoreticalAvgCost - product.avg_unit_cost)

    // 如果差異超過 $0.01，則修復
    if (costDiff > 0.01 && product.total_stock > 0) {
      console.log(`\n修復產品 #${product.id}: ${product.product_name}${product.color ? ` (${product.color})` : ''}`)
      console.log(`  剩餘庫存: ${product.total_stock}`)
      console.log(`  剩餘成本: $${product.total_cost_value.toFixed(2)}`)
      console.log(`  當前平均成本: $${product.avg_unit_cost.toFixed(2)}`)
      console.log(`  正確平均成本: $${theoreticalAvgCost.toFixed(2)}`)
      console.log(`  差異: $${costDiff.toFixed(2)}`)

      // 更新平均成本
      const { error } = await supabase
        .from('products')
        .update({
          avg_unit_cost: theoreticalAvgCost,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id)

      if (error) {
        console.error(`  ❌ 更新失敗:`, error.message)
      } else {
        console.log(`  ✅ 已更新平均成本`)

        // 重新計算該產品所有銷售的 COGS
        const { data: sales } = await supabase
          .from('sales')
          .select('id, quantity')
          .eq('product_id', product.id)

        if (sales && sales.length > 0) {
          let updatedSales = 0
          for (const sale of sales) {
            const newCOGS = theoreticalAvgCost * sale.quantity
            const { error: saleError } = await supabase
              .from('sales')
              .update({ cost_of_goods_sold: newCOGS })
              .eq('id', sale.id)

            if (!saleError) {
              updatedSales++
            }
          }

          console.log(`  ✅ 已重新計算 ${updatedSales}/${sales.length} 筆銷售的 COGS`)

          // 重新計算 total_cost_value（因為 COGS 變了）
          const { data: stockIns } = await supabase
            .from('stock_in')
            .select('total_cost')
            .eq('category_id', product.category_id)
            .eq('product_name', product.product_name)
            .then(result => {
              let filtered = result.data
              if (product.color) {
                filtered = result.data?.filter(s => s.color === product.color)
              } else {
                filtered = result.data?.filter(s => !s.color || s.color === null)
              }
              return { data: filtered }
            })

          const totalStockInCost = stockIns?.reduce((sum, s) => sum + (s.total_cost || 0), 0) || 0

          const { data: allSales } = await supabase
            .from('sales')
            .select('cost_of_goods_sold')
            .eq('product_id', product.id)

          const totalCOGS = allSales?.reduce((sum, s) => sum + (s.cost_of_goods_sold || 0), 0) || 0
          const newTotalCostValue = Math.max(0, totalStockInCost - totalCOGS)

          await supabase
            .from('products')
            .update({
              total_cost_value: newTotalCostValue,
              updated_at: new Date().toISOString(),
            })
            .eq('id', product.id)

          console.log(`  ✅ 已重新計算剩餘成本: $${product.total_cost_value.toFixed(2)} → $${newTotalCostValue.toFixed(2)}`)
        }

        fixedCount++
      }
    }
  }

  console.log(`\n\n========== 修復完成 ==========`)
  console.log(`成功修復 ${fixedCount} 個產品的平均成本`)
  console.log(`===============================\n`)
}

fixAvgUnitCost().catch(console.error)
