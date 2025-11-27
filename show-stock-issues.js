const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function showStockIssues() {
  console.log('=== 庫存不一致問題詳情 ===\n')

  try {
    const { data: products } = await supabase.from('products').select('*').order('id')

    const issues = []
    for (const product of products) {
      const sizeStock = product.size_stock || {}
      const calculatedTotal = Object.values(sizeStock).reduce((sum, qty) => sum + qty, 0)

      if (calculatedTotal !== product.total_stock) {
        issues.push({ product, calculatedTotal })
      }
    }

    console.log(`找到 ${issues.length} 個庫存不一致的產品\n`)
    console.log('顯示前10個案例:\n')

    for (let i = 0; i < Math.min(10, issues.length); i++) {
      const { product, calculatedTotal } = issues[i]
      const sizeStock = product.size_stock || {}

      console.log(`\n案例 ${i + 1}: ${product.product_name}${product.color ? ` (${product.color})` : ''}`)
      console.log('─'.repeat(60))
      console.log(`產品ID: ${product.id}`)
      console.log(`類別ID: ${product.category_id}`)
      console.log(`\n📦 庫存數據:`)
      console.log(`   total_stock (總庫存): ${product.total_stock}`)
      console.log(`   size_stock (尺寸庫存):`)

      if (Object.keys(sizeStock).length === 0) {
        console.log(`      (空)`)
      } else {
        for (const [size, qty] of Object.entries(sizeStock)) {
          console.log(`      ${size}: ${qty}`)
        }
      }

      console.log(`   計算的總和: ${calculatedTotal}`)
      console.log(`   差異: ${calculatedTotal - product.total_stock}`)

      // 查詢最近的庫存異動記錄
      const { data: movements } = await supabase
        .from('inventory_movements')
        .select('*')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false })
        .limit(3)

      if (movements && movements.length > 0) {
        console.log(`\n📝 最近3筆庫存異動:`)
        for (const mov of movements) {
          console.log(`   ${mov.created_at.split('T')[0]} | ${mov.movement_type} | 數量: ${mov.quantity} | ${mov.previous_total} → ${mov.current_total}`)
          if (mov.note) console.log(`      備註: ${mov.note}`)
        }
      }

      // 查詢銷售記錄
      const { data: sales } = await supabase
        .from('sales')
        .select('*')
        .eq('product_id', product.id)
        .order('date', { ascending: false })
        .limit(2)

      if (sales && sales.length > 0) {
        console.log(`\n💰 最近2筆銷售:`)
        for (const sale of sales) {
          console.log(`   ${sale.date} | ${sale.size || '無尺寸'} | 數量: ${sale.quantity}`)
        }
      }

      // 查詢進貨記錄
      const { data: stockIns } = await supabase
        .from('stock_in')
        .select('*')
        .eq('category_id', product.category_id)
        .eq('product_name', product.product_name)
        .order('date', { ascending: false })
        .limit(2)

      if (stockIns && stockIns.length > 0) {
        const matching = stockIns.filter(s =>
          (product.color === null && (s.color === null || s.color === '')) ||
          s.color === product.color
        )

        if (matching.length > 0) {
          console.log(`\n📥 最近2筆進貨:`)
          for (const stockIn of matching.slice(0, 2)) {
            console.log(`   ${stockIn.date} | 數量: ${stockIn.total_quantity}`)
            console.log(`      尺寸: ${JSON.stringify(stockIn.size_quantities)}`)
          }
        }
      }
    }

    // 分析問題類型
    console.log('\n\n=== 問題類型分析 ===\n')

    const soldOut = issues.filter(i => i.product.total_stock === 0 && i.calculatedTotal > 0)
    const largeDiscrepancy = issues.filter(i => Math.abs(i.calculatedTotal - i.product.total_stock) > 10)
    const emptySize = issues.filter(i => Object.keys(i.product.size_stock || {}).length === 0)

    console.log(`🔴 total_stock為0但size_stock有庫存: ${soldOut.length} 個`)
    if (soldOut.length > 0) {
      console.log('   可能原因: 銷售時只更新了total_stock，沒清空size_stock')
      soldOut.slice(0, 3).forEach(i => {
        console.log(`   - ${i.product.product_name}: total=0, sizes=${i.calculatedTotal}`)
      })
    }

    console.log(`\n🟠 差異超過10的產品: ${largeDiscrepancy.length} 個`)
    if (largeDiscrepancy.length > 0) {
      console.log('   可能原因: 數據同步問題或手動調整錯誤')
      largeDiscrepancy.slice(0, 3).forEach(i => {
        console.log(`   - ${i.product.product_name}: total=${i.product.total_stock}, sizes=${i.calculatedTotal} (差${i.calculatedTotal - i.product.total_stock})`)
      })
    }

    console.log(`\n🟡 size_stock為空的產品: ${emptySize.length} 個`)
    if (emptySize.length > 0) {
      console.log('   可能原因: 未使用尺寸管理的產品(如潮玩)')
    }

  } catch (error) {
    console.error('查詢發生錯誤:', error)
    process.exit(1)
  }
}

showStockIssues()
