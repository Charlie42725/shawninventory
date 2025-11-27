const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixProductCosts() {
  console.log('開始修復產品成本...\n')

  try {
    // 1. 查詢所有avg_unit_cost異常的產品(為0但有庫存,或total_cost_value與avg_unit_cost * total_stock不符)
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .order('id')

    if (productsError) {
      throw productsError
    }

    console.log(`找到 ${products.length} 個產品\n`)

    let fixedCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const product of products) {
      const needsFix =
        (product.total_stock > 0 && product.avg_unit_cost === 0) ||
        (product.total_stock > 0 && Math.abs(product.total_cost_value - (product.avg_unit_cost * product.total_stock)) > 0.01)

      if (!needsFix) {
        skippedCount++
        continue
      }

      console.log(`\n修復產品: ${product.product_name} (ID: ${product.id})`)
      console.log(`  當前: stock=${product.total_stock}, avg_cost=${product.avg_unit_cost}, total_cost=${product.total_cost_value}`)

      // 2. 從stock_in記錄計算正確的成本
      const { data: stockInRecords, error: stockInError } = await supabase
        .from('stock_in')
        .select('*')
        .eq('category_id', product.category_id)
        .eq('product_name', product.product_name)

      if (stockInError) {
        console.error(`  ❌ 查詢進貨記錄失敗: ${stockInError.message}`)
        errorCount++
        continue
      }

      // 過濾匹配的記錄(考慮color可能為null)
      const matchingRecords = stockInRecords.filter(record => {
        if (product.color === null && record.color === null) return true
        if (product.color === null && record.color === '') return true
        if (product.color === '' && record.color === null) return true
        return record.color === product.color
      })

      if (matchingRecords.length === 0) {
        console.log(`  ⚠️  沒有找到對應的進貨記錄,跳過`)
        skippedCount++
        continue
      }

      // 計算總進貨數量和總成本
      const totalQtyFromStockIn = matchingRecords.reduce((sum, r) => sum + r.total_quantity, 0)
      const totalCostFromStockIn = matchingRecords.reduce((sum, r) => sum + r.total_cost, 0)

      if (totalQtyFromStockIn === 0) {
        console.log(`  ⚠️  進貨總數量為0,跳過`)
        skippedCount++
        continue
      }

      // 計算正確的平均成本
      const correctAvgUnitCost = totalCostFromStockIn / totalQtyFromStockIn

      // 基於當前庫存計算正確的總成本價值
      const correctTotalCostValue = correctAvgUnitCost * product.total_stock

      console.log(`  計算結果: 進貨${totalQtyFromStockIn}個,總成本$${totalCostFromStockIn}`)
      console.log(`  正確的平均成本: $${correctAvgUnitCost.toFixed(2)}`)
      console.log(`  正確的總成本價值: $${correctTotalCostValue.toFixed(2)}`)

      // 3. 更新產品
      const { error: updateError } = await supabase
        .from('products')
        .update({
          avg_unit_cost: correctAvgUnitCost,
          total_cost_value: correctTotalCostValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id)

      if (updateError) {
        console.error(`  ❌ 更新失敗: ${updateError.message}`)
        errorCount++
      } else {
        console.log(`  ✅ 已修復!`)
        fixedCount++
      }
    }

    console.log(`\n\n=== 修復完成 ===`)
    console.log(`✅ 成功修復: ${fixedCount} 個產品`)
    console.log(`⏭️  無需修復: ${skippedCount} 個產品`)
    console.log(`❌ 修復失敗: ${errorCount} 個產品`)
    console.log(`總計: ${products.length} 個產品`)

  } catch (error) {
    console.error('修復過程發生錯誤:', error)
    process.exit(1)
  }
}

fixProductCosts()
