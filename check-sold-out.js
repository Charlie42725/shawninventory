const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSoldOutProducts() {
  console.log('檢查已售完產品的成本狀況...\n')

  try {
    // 查詢庫存為0的產品
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('total_stock', 0)
      .order('updated_at', { ascending: false })

    if (productsError) {
      throw productsError
    }

    console.log(`=== 已售完產品報告 ===`)
    console.log(`總共找到 ${products.length} 個已售完的產品\n`)

    let zeroAvgCostCount = 0
    let zeroTotalCostCount = 0
    let correctCount = 0

    for (const product of products) {
      const hasZeroAvgCost = product.avg_unit_cost === 0
      const hasZeroTotalCost = product.total_cost_value === 0

      if (hasZeroAvgCost || hasZeroTotalCost) {
        console.log(`\n❌ [${product.id}] ${product.product_name}${product.color ? ` (${product.color})` : ''}`)
        console.log(`   類別ID: ${product.category_id}`)
        console.log(`   庫存: ${product.total_stock}`)
        console.log(`   平均成本: $${product.avg_unit_cost}`)
        console.log(`   總成本價值: $${product.total_cost_value}`)
        console.log(`   最後更新: ${new Date(product.updated_at).toLocaleString('zh-TW')}`)

        if (hasZeroAvgCost) zeroAvgCostCount++
        if (hasZeroTotalCost) zeroTotalCostCount++
      } else {
        correctCount++
      }
    }

    console.log(`\n\n=== 統計 ===`)
    console.log(`❌ 平均成本為0: ${zeroAvgCostCount} 個`)
    console.log(`❌ 總成本價值為0: ${zeroTotalCostCount} 個`)
    console.log(`✅ 成本保留正確: ${correctCount} 個`)
    console.log(`總計: ${products.length} 個已售完產品`)

    // 顯示這些產品最後的銷售記錄
    console.log(`\n\n=== 檢查這些產品的最後銷售記錄 ===`)
    const problemProducts = products.filter(p => p.avg_unit_cost === 0 || p.total_cost_value === 0)

    for (const product of problemProducts.slice(0, 5)) {
      console.log(`\n產品: ${product.product_name}${product.color ? ` (${product.color})` : ''}`)

      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('product_id', product.id)
        .order('date', { ascending: false })
        .limit(1)

      if (sales && sales.length > 0) {
        const lastSale = sales[0]
        console.log(`  最後銷售: ${lastSale.date}`)
        console.log(`  售價: $${lastSale.unit_price}`)
        console.log(`  數量: ${lastSale.quantity}`)
      } else {
        console.log(`  ⚠️  找不到銷售記錄`)
      }

      // 查詢進貨記錄
      const { data: stockIn, error: stockInError } = await supabase
        .from('stock_in')
        .select('*')
        .eq('category_id', product.category_id)
        .eq('product_name', product.product_name)

      if (stockIn && stockIn.length > 0) {
        const matchingRecords = stockIn.filter(r => {
          if (product.color === null && (r.color === null || r.color === '')) return true
          return r.color === product.color
        })

        if (matchingRecords.length > 0) {
          const totalQty = matchingRecords.reduce((sum, r) => sum + r.total_quantity, 0)
          const totalCost = matchingRecords.reduce((sum, r) => sum + r.total_cost, 0)
          const avgCost = totalQty > 0 ? totalCost / totalQty : 0

          console.log(`  進貨記錄: ${matchingRecords.length} 筆`)
          console.log(`  總進貨量: ${totalQty}`)
          console.log(`  總進貨成本: $${totalCost}`)
          console.log(`  正確的平均成本: $${avgCost.toFixed(2)}`)
        } else {
          console.log(`  ⚠️  找不到匹配的進貨記錄`)
        }
      }
    }

  } catch (error) {
    console.error('檢查過程發生錯誤:', error)
    process.exit(1)
  }
}

checkSoldOutProducts()
