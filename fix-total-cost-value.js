const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://vkbuaxzyfuxbahtqtyfn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrYnVheHp5ZnV4YmFodHF0eWZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDQyMTkzMiwiZXhwIjoyMDUwMDk3OTMyfQ.OnA97KH4xmcQjFtg8Bq5hRAIIBG5F0kxUkMTnmU0nik'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixTotalCostValue() {
  console.log('=== 修復產品總成本價值 ===\n')

  // 獲取所有產品
  const { data: products, error } = await supabase
    .from('products')
    .select('id, product_name, category_id, color, total_stock, avg_unit_cost, total_cost_value')
    .order('id')

  if (error) {
    console.error('Error fetching products:', error)
    return
  }

  console.log(`共找到 ${products.length} 個產品\n`)

  let fixedCount = 0
  let alreadyCorrect = 0

  for (const product of products) {
    // === 重新計算正確的平均成本和庫存價值 ===
    // 1. 查詢該產品的所有進貨記錄
    let stockInQuery = supabase
      .from('stock_in')
      .select('total_cost, total_quantity')
      .eq('category_id', product.category_id)
      .eq('product_name', product.product_name)

    if (product.color) {
      stockInQuery = stockInQuery.eq('color', product.color)
    } else {
      stockInQuery = stockInQuery.is('color', null)
    }

    const { data: stockIns } = await stockInQuery

    // 2. 計算總進貨成本和數量
    let totalStockInCost = 0
    let totalStockInQty = 0

    stockIns?.forEach(si => {
      totalStockInCost += si.total_cost || 0
      totalStockInQty += si.total_quantity || 0
    })

    // 3. 計算正確的平均成本（基於總進貨）
    const correctAvgUnitCost = totalStockInQty > 0 ? totalStockInCost / totalStockInQty : 0

    // 4. 計算正確的庫存價值（基於當前庫存）
    const correctTotalCostValue = product.total_stock * correctAvgUnitCost

    // 檢查是否需要修復
    const avgCostDiff = Math.abs(product.avg_unit_cost - correctAvgUnitCost)
    const costValueDiff = Math.abs(product.total_cost_value - correctTotalCostValue)

    if (avgCostDiff > 0.01 || costValueDiff > 0.01) {
      console.log(`修復: ID ${product.id} - ${product.product_name}`)
      console.log(`  庫存: ${product.total_stock}`)
      console.log(`  平均成本: $${product.avg_unit_cost.toFixed(2)} -> $${correctAvgUnitCost.toFixed(2)}`)
      console.log(`  庫存價值: $${product.total_cost_value.toFixed(2)} -> $${correctTotalCostValue.toFixed(2)}`)

      const { error: updateError } = await supabase
        .from('products')
        .update({
          avg_unit_cost: correctAvgUnitCost,
          total_cost_value: correctTotalCostValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id)

      if (updateError) {
        console.error(`  ❌ 更新失敗:`, updateError)
      } else {
        console.log(`  ✓ 已修復`)
        fixedCount++
      }
      console.log('')
    } else {
      alreadyCorrect++
    }
  }

  console.log('\n=== 修復完成 ===')
  console.log(`總產品數: ${products.length}`)
  console.log(`已修復: ${fixedCount}`)
  console.log(`原本正確: ${alreadyCorrect}`)
}

fixTotalCostValue()
