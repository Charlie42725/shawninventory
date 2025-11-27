const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSaleProcess() {
  console.log('測試銷售流程對成本的影響...\n')

  try {
    // 1. 找一個有庫存的產品進行測試
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .gt('total_stock', 1)
      .gt('avg_unit_cost', 0)
      .limit(1)
      .single()

    if (productsError || !products) {
      console.log('沒有找到合適的測試產品')
      return
    }

    const product = products
    console.log(`=== 測試產品 ===`)
    console.log(`ID: ${product.id}`)
    console.log(`名稱: ${product.product_name}${product.color ? ` (${product.color})` : ''}`)
    console.log(`\n銷售前狀態:`)
    console.log(`  庫存: ${product.total_stock}`)
    console.log(`  平均成本: $${product.avg_unit_cost}`)
    console.log(`  總成本價值: $${product.total_cost_value}`)
    console.log(`  預期總成本: $${(product.avg_unit_cost * product.total_stock).toFixed(2)}`)

    // 2. 模擬銷售計算(不實際創建銷售記錄)
    const saleQuantity = 1
    const costOfGoodsSold = product.avg_unit_cost * saleQuantity
    const newTotalCostValue = Math.max(0, product.total_cost_value - costOfGoodsSold)
    const newTotalStock = product.total_stock - saleQuantity
    const newAvgUnitCost = newTotalStock > 0 ? product.avg_unit_cost : 0

    console.log(`\n模擬售出 ${saleQuantity} 個:`)
    console.log(`  銷售成本: $${costOfGoodsSold.toFixed(2)}`)
    console.log(`  新庫存: ${newTotalStock}`)
    console.log(`  新平均成本: $${newAvgUnitCost}`)
    console.log(`  新總成本價值: $${newTotalCostValue.toFixed(2)}`)
    console.log(`  預期新總成本: $${(newAvgUnitCost * newTotalStock).toFixed(2)}`)

    // 3. 檢查計算是否正確
    const expectedNewTotalCost = newAvgUnitCost * newTotalStock
    const diff = Math.abs(newTotalCostValue - expectedNewTotalCost)

    console.log(`\n=== 驗證 ===`)
    if (diff < 0.01) {
      console.log(`✅ 計算正確! 成本保持一致`)
    } else {
      console.log(`❌ 計算錯誤! 差異: $${diff.toFixed(2)}`)
    }

    if (newAvgUnitCost === 0 && newTotalStock > 0) {
      console.log(`❌ 錯誤: 平均成本變成0但還有庫存!`)
    } else if (newTotalStock > 0) {
      console.log(`✅ 平均成本正確維持在 $${newAvgUnitCost}`)
    }

    // 4. 測試多次銷售
    console.log(`\n\n=== 測試連續銷售 ===`)
    let currentStock = product.total_stock
    let currentTotalCost = product.total_cost_value
    let currentAvgCost = product.avg_unit_cost

    for (let i = 1; i <= Math.min(3, product.total_stock); i++) {
      const costSold = currentAvgCost * 1
      currentTotalCost = Math.max(0, currentTotalCost - costSold)
      currentStock -= 1
      currentAvgCost = currentStock > 0 ? currentAvgCost : 0

      console.log(`\n第 ${i} 次銷售後:`)
      console.log(`  庫存: ${currentStock}`)
      console.log(`  平均成本: $${currentAvgCost}`)
      console.log(`  總成本價值: $${currentTotalCost.toFixed(2)}`)
      console.log(`  預期總成本: $${(currentAvgCost * currentStock).toFixed(2)}`)

      const iterDiff = Math.abs(currentTotalCost - (currentAvgCost * currentStock))
      if (iterDiff > 0.01) {
        console.log(`  ❌ 不一致! 差異: $${iterDiff.toFixed(2)}`)
      } else {
        console.log(`  ✅ 一致`)
      }
    }

  } catch (error) {
    console.error('測試過程發生錯誤:', error)
    process.exit(1)
  }
}

testSaleProcess()
