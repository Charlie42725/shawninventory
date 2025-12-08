require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkMissingCOGS() {
  console.log('🔍 檢查缺失 COGS 的銷售記錄...\n')

  // 查詢 ID 15 的銷售記錄
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .select('*')
    .eq('id', 15)
    .single()

  if (saleError) {
    console.error('查詢銷售記錄失敗:', saleError)
    return
  }

  console.log('=== 銷售記錄 ID 15 ===')
  console.log('產品名稱:', sale.model || sale.product_name)
  console.log('產品 ID:', sale.product_id)
  console.log('銷售日期:', sale.date)
  console.log('數量:', sale.quantity)
  console.log('單價:', sale.unit_price)
  console.log('總額:', sale.total_amount)
  console.log('COGS:', sale.cost_of_goods_sold || '❌ 缺失')
  console.log()

  // 查詢對應的產品資訊
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', sale.product_id)
    .single()

  if (productError) {
    console.error('查詢產品失敗:', productError)
    return
  }

  console.log('=== 產品資訊 ===')
  console.log('型號:', product.model)
  console.log('當前庫存:', product.total_stock)
  console.log('平均成本:', product.avg_unit_cost)
  console.log('總成本價值:', product.total_cost_value)
  console.log()

  // 查詢該產品的進貨記錄
  const { data: stockIns, error: stockInError } = await supabase
    .from('stock_in')
    .select('*')
    .eq('inventory_id', sale.product_id)
    .order('date', { ascending: false })

  if (stockInError) {
    console.error('查詢進貨記錄失敗:', stockInError)
    return
  }

  console.log('=== 進貨記錄 ===')
  if (stockIns.length === 0) {
    console.log('❌ 沒有進貨記錄')
  } else {
    console.log(`找到 ${stockIns.length} 筆進貨記錄:`)
    stockIns.forEach((si, index) => {
      console.log(`  ${index + 1}. 日期: ${si.date}, 數量: ${si.quantity}, 成本: $${si.unit_cost}`)
    })
  }
  console.log()

  // 計算建議的 COGS
  if (product.avg_unit_cost && product.avg_unit_cost > 0) {
    const suggestedCOGS = product.avg_unit_cost * sale.quantity
    console.log('=== 修復建議 ===')
    console.log(`建議 COGS: ${product.avg_unit_cost} × ${sale.quantity} = $${suggestedCOGS}`)
    console.log()
    console.log('執行以下 SQL 修復:')
    console.log(`UPDATE sales SET cost_of_goods_sold = ${suggestedCOGS} WHERE id = 15;`)
  } else {
    console.log('⚠️  產品沒有平均成本，需要先補充進貨記錄')
  }
}

checkMissingCOGS()
