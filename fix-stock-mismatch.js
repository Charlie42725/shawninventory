const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function fixStockMismatch() {
  console.log('修復庫存不一致問題...\n')

  try {
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .order('id')

    if (productsError) {
      throw productsError
    }

    console.log(`檢查 ${products.length} 個產品\n`)

    let fixedCount = 0
    let skippedCount = 0

    for (const product of products) {
      const sizeStock = product.size_stock || {}
      const calculatedTotal = Object.values(sizeStock).reduce((sum, qty) => sum + qty, 0)

      if (calculatedTotal !== product.total_stock) {
        console.log(`\n❌ 發現不一致: ${product.product_name}${product.color ? ` (${product.color})` : ''}`)
        console.log(`   當前 total_stock: ${product.total_stock}`)
        console.log(`   size_stock 總和: ${calculatedTotal}`)
        console.log(`   size_stock 明細: ${JSON.stringify(sizeStock)}`)

        // 決定使用哪個值
        // 策略：優先相信 size_stock 的總和（因為它是詳細記錄）
        const correctTotal = calculatedTotal

        console.log(`   → 修正為: ${correctTotal}`)

        // 更新產品
        const { error: updateError } = await supabase
          .from('products')
          .update({
            total_stock: correctTotal,
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id)

        if (updateError) {
          console.error(`   ✖ 更新失敗: ${updateError.message}`)
        } else {
          console.log(`   ✅ 已修正`)
          fixedCount++

          // 記錄庫存異動
          await supabase.from('inventory_movements').insert({
            product_id: product.id,
            movement_type: 'adjustment',
            size: null,
            quantity: correctTotal - product.total_stock,
            previous_total: product.total_stock,
            current_total: correctTotal,
            reference_type: 'system_correction',
            reference_id: null,
            note: `系統修正：total_stock與size_stock不一致，從${product.total_stock}修正為${correctTotal}`
          })
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

fixStockMismatch()
