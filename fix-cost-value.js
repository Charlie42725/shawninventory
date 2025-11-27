const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function fixCostValue() {
  console.log('修復產品 total_cost_value...\n')

  try {
    const { data: products } = await supabase.from('products').select('*')

    console.log(`檢查 ${products.length} 個產品\n`)

    let fixedCount = 0
    let skippedCount = 0

    for (const product of products) {
      // 檢查成本是否一致
      if (product.total_stock > 0 && product.avg_unit_cost > 0) {
        const expectedTotalCost = product.avg_unit_cost * product.total_stock
        const diff = Math.abs(product.total_cost_value - expectedTotalCost)

        if (diff > 1) {
          console.log(`\n修復: ${product.product_name}${product.color ? ` (${product.color})` : ''}`)
          console.log(`  庫存: ${product.total_stock}`)
          console.log(`  平均成本: $${product.avg_unit_cost}`)
          console.log(`  當前 total_cost_value: $${product.total_cost_value}`)
          console.log(`  應該是: $${expectedTotalCost.toFixed(2)}`)

          const { error: updateError } = await supabase
            .from('products')
            .update({
              total_cost_value: expectedTotalCost,
              updated_at: new Date().toISOString()
            })
            .eq('id', product.id)

          if (updateError) {
            console.error(`  ✖ 更新失敗: ${updateError.message}`)
          } else {
            console.log(`  ✅ 已修復`)
            fixedCount++
          }
        } else {
          skippedCount++
        }
      } else {
        skippedCount++
      }
    }

    console.log(`\n\n=== 修復完成 ===`)
    console.log(`✅ 成功修復: ${fixedCount} 個產品`)
    console.log(`⏭️  無需修復: ${skippedCount} 個產品`)
    console.log(`總計: ${products.length} 個產品`)

  } catch (error) {
    console.error('修復過程發生錯誤:', error)
    process.exit(1)
  }
}

fixCostValue()
