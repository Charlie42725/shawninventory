const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixCostSyncIssue() {
  console.log('🔧 開始修復成本同步問題...\n')

  // 1. 查詢所有產品
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('id')

  let fixedCount = 0
  let totalIssues = 0

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

    // 計算進貨總成本
    const totalStockInCost = stockInsFiltered?.reduce((sum, s) => sum + (s.total_cost || 0), 0) || 0

    // 計算總銷售數量
    const totalSoldQuantity = sales?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0

    // 使用當前平均成本計算應有的總 COGS
    const expectedTotalCOGS = product.avg_unit_cost * totalSoldQuantity

    // 實際的總 COGS
    const actualTotalCOGS = sales?.reduce((sum, s) => sum + (s.cost_of_goods_sold || 0), 0) || 0

    // 理論上的剩餘庫存成本
    const theoreticalRemainingCost = totalStockInCost - expectedTotalCOGS

    // 實際的剩餘庫存成本
    const actualRemainingCost = product.total_cost_value

    // 計算差異
    const costDifference = Math.abs(theoreticalRemainingCost - actualRemainingCost)
    const cogsDifference = Math.abs(expectedTotalCOGS - actualTotalCOGS)

    if (costDifference > 0.01 || cogsDifference > 0.01) {
      totalIssues++
      console.log(`\n🔧 修復產品 #${product.id}: ${product.product_name}${product.color ? ` (${product.color})` : ''}`)
      console.log(`   進貨總成本: $${totalStockInCost.toFixed(2)}`)
      console.log(`   已售數量: ${totalSoldQuantity}`)
      console.log(`   平均成本: $${product.avg_unit_cost.toFixed(2)}`)
      console.log(`   預期總 COGS: $${expectedTotalCOGS.toFixed(2)}`)
      console.log(`   實際總 COGS: $${actualTotalCOGS.toFixed(2)}`)
      console.log(`   COGS 差異: $${cogsDifference.toFixed(2)}`)
      console.log(`   理論剩餘成本: $${theoreticalRemainingCost.toFixed(2)}`)
      console.log(`   實際剩餘成本: $${actualRemainingCost.toFixed(2)}`)
      console.log(`   成本差異: $${costDifference.toFixed(2)}`)

      try {
        // 1. 更新所有銷售記錄的 COGS
        if (sales && sales.length > 0 && cogsDifference > 0.01) {
          let updatedCount = 0
          for (const sale of sales) {
            const newCOGS = product.avg_unit_cost * sale.quantity
            const { error: salesError } = await supabase
              .from('sales')
              .update({ cost_of_goods_sold: newCOGS })
              .eq('id', sale.id)

            if (salesError) {
              console.error(`   ❌ 更新銷售記錄 #${sale.id} 失敗:`, salesError.message)
            } else {
              updatedCount++
            }
          }

          console.log(`   ✅ 已更新 ${updatedCount}/${sales.length} 筆銷售記錄的 COGS`)
        }

        // 2. 更新產品的 total_cost_value
        if (costDifference > 0.01) {
          const newTotalCostValue = Math.max(0, theoreticalRemainingCost)

          const { error: productError } = await supabase
            .from('products')
            .update({
              total_cost_value: newTotalCostValue,
              updated_at: new Date().toISOString(),
            })
            .eq('id', product.id)

          if (productError) {
            console.error(`   ❌ 更新產品成本失敗:`, productError.message)
            continue
          }

          console.log(`   ✅ 已更新產品的 total_cost_value: $${actualRemainingCost.toFixed(2)} → $${newTotalCostValue.toFixed(2)}`)
        }

        fixedCount++
      } catch (error) {
        console.error(`   ❌ 修復失敗:`, error.message)
      }
    }
  }

  console.log(`\n\n========== 修復完成 ==========`)
  console.log(`總共發現 ${totalIssues} 個問題`)
  console.log(`成功修復 ${fixedCount} 個產品`)
  console.log(`===============================\n`)
}

fixCostSyncIssue().catch(console.error)
