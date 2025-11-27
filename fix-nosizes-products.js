const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function fixNoSizesProducts() {
  console.log('修復無尺寸產品的 size_stock...\n')

  try {
    const { data: products } = await supabase.from('products').select('*').order('id')

    console.log(`檢查 ${products.length} 個產品\n`)

    let fixedCount = 0
    let skippedCount = 0

    for (const product of products) {
      const sizeStock = product.size_stock || {}
      const keys = Object.keys(sizeStock)

      // 判斷是否為"假尺寸"產品（只有 default 或其他不是真實尺寸的key）
      const hasOnlyDefault = keys.length === 1 && keys[0] === 'default'
      const hasDefaultKey = sizeStock.hasOwnProperty('default')

      if (hasOnlyDefault || (hasDefaultKey && keys.length > 0)) {
        console.log(`\n修復: ${product.product_name}${product.color ? ` (${product.color})` : ''}`)
        console.log(`  當前 size_stock: ${JSON.stringify(sizeStock)}`)

        // 計算正確的 total_stock
        let correctTotal = product.total_stock
        if (hasOnlyDefault) {
          // 如果只有default，且total_stock為0但default有值，使用default的值
          if (product.total_stock === 0 && sizeStock.default > 0) {
            correctTotal = sizeStock.default
            console.log(`  ⚠️  total_stock為0但default為${sizeStock.default}，修正total_stock`)
          }
        }

        // 清空 size_stock（無尺寸產品不應該有）
        const { error: updateError } = await supabase
          .from('products')
          .update({
            size_stock: {},
            total_stock: correctTotal,
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id)

        if (updateError) {
          console.error(`  ✖ 更新失敗: ${updateError.message}`)
        } else {
          console.log(`  ✅ 已清空 size_stock，total_stock=${correctTotal}`)
          fixedCount++

          // 記錄異動
          if (product.total_stock !== correctTotal) {
            await supabase.from('inventory_movements').insert({
              product_id: product.id,
              movement_type: 'adjustment',
              size: null,
              quantity: correctTotal - product.total_stock,
              previous_total: product.total_stock,
              current_total: correctTotal,
              reference_type: 'system_correction',
              reference_id: null,
              note: `系統修正：無尺寸產品清空size_stock，total_stock從${product.total_stock}修正為${correctTotal}`
            })
          }
        }
      } else if (keys.length === 0) {
        // 已經是空的，無需處理
        skippedCount++
      } else {
        // 有真實尺寸，不處理
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

fixNoSizesProducts()
