require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixSale15() {
  console.log('🔍 檢查並修復銷售記錄 ID 15 的 COGS...\n')

  // 1. 查詢銷售記錄
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .select('*')
    .eq('id', 15)
    .single()

  if (saleError) {
    console.error('❌ 查詢銷售記錄失敗:', saleError)
    return
  }

  console.log('=== 銷售記錄 ID 15 ===')
  console.log('產品名稱:', sale.model || sale.product_name)
  console.log('產品 ID:', sale.product_id)
  console.log('銷售日期:', sale.date)
  console.log('數量:', sale.quantity)
  console.log('單價:', sale.unit_price)
  console.log('總額:', sale.total_amount)
  console.log('當前 COGS:', sale.cost_of_goods_sold || '❌ 缺失')
  console.log()

  // 2. 查詢產品資訊
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', sale.product_id)
    .single()

  if (productError) {
    console.error('❌ 查詢產品失敗:', productError)
    return
  }

  console.log('=== 產品資訊 ===')
  console.log('型號:', product.model)
  console.log('分類 ID:', product.category_id)
  console.log('當前庫存:', product.total_stock)
  console.log('平均成本:', product.avg_unit_cost)
  console.log('總成本價值:', product.total_cost_value)
  console.log()

  // 3. 查詢該產品的進貨記錄 (使用 category_id 和 product_name)
  const { data: stockIns, error: stockInError } = await supabase
    .from('stock_in')
    .select('*')
    .eq('category_id', product.category_id)
    .ilike('product_name', '%' + (product.model || sale.model || sale.product_name) + '%')
    .order('date', { ascending: false })

  if (stockInError) {
    console.error('❌ 查詢進貨記錄失敗:', stockInError)
    return
  }

  console.log('=== 進貨記錄 ===')
  if (stockIns.length === 0) {
    console.log('❌ 沒有找到進貨記錄')
    console.log('   可能原因:')
    console.log('   1. 產品名稱不匹配')
    console.log('   2. 產品是手動創建的，沒有實際進貨')
    console.log()

    // 嘗試用更寬鬆的條件查詢
    const { data: allCategoryStockIns } = await supabase
      .from('stock_in')
      .select('distinct product_name')
      .eq('category_id', product.category_id)
      .limit(20)

    if (allCategoryStockIns && allCategoryStockIns.length > 0) {
      console.log('   該分類下的其他產品進貨記錄:')
      allCategoryStockIns.forEach(si => {
        console.log('   -', si.product_name)
      })
    }
  } else {
    console.log(`✅ 找到 ${stockIns.length} 筆進貨記錄:`)
    stockIns.slice(0, 5).forEach((si, index) => {
      console.log(`   ${index + 1}. 日期: ${si.date}, 數量: ${si.quantity}, 成本: $${si.unit_cost}`)
    })
  }
  console.log()

  // 4. 判斷修復方案
  console.log('=== 修復建議 ===')

  if (!sale.cost_of_goods_sold || sale.cost_of_goods_sold === 0) {
    if (product.avg_unit_cost && product.avg_unit_cost > 0) {
      const suggestedCOGS = product.avg_unit_cost * sale.quantity
      console.log(`✅ 可以使用產品平均成本修復`)
      console.log(`   建議 COGS: ${product.avg_unit_cost} × ${sale.quantity} = $${suggestedCOGS}`)
      console.log()
      console.log('   是否執行修復？(需手動執行 SQL):')
      console.log(`   UPDATE sales SET cost_of_goods_sold = ${suggestedCOGS} WHERE id = 15;`)
    } else if (stockIns.length > 0) {
      // 使用最近的進貨成本
      const latestCost = stockIns[0].unit_cost
      const suggestedCOGS = latestCost * sale.quantity
      console.log(`✅ 可以使用最近進貨成本修復`)
      console.log(`   建議 COGS: ${latestCost} × ${sale.quantity} = $${suggestedCOGS}`)
      console.log()
      console.log('   是否執行修復？(需手動執行 SQL):')
      console.log(`   UPDATE sales SET cost_of_goods_sold = ${suggestedCOGS} WHERE id = 15;`)
    } else {
      console.log(`⚠️  無法自動修復：`)
      console.log(`   - 產品平均成本為 0`)
      console.log(`   - 沒有進貨記錄`)
      console.log()
      console.log(`   建議手動估算成本或補充進貨記錄`)
    }
  } else {
    console.log('✅ COGS 已存在，無需修復')
  }
}

fixSale15()
