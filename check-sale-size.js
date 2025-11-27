const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSaleSize() {
  console.log('檢查銷售記錄的 size 欄位...\n')

  // 查詢 Vans400% 的銷售記錄
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('product_name', 'Vans400%')
    .single()

  console.log('產品: Vans400%')
  console.log(`  total_stock: ${product.total_stock}`)
  console.log(`  size_stock: ${JSON.stringify(product.size_stock)}`)

  const { data: sales } = await supabase
    .from('sales')
    .select('*')
    .eq('product_id', product.id)
    .order('date', { ascending: false })

  console.log(`\n銷售記錄 (${sales.length} 筆):`)
  for (const sale of sales) {
    console.log(`\n  ID: ${sale.id}`)
    console.log(`  日期: ${sale.date}`)
    console.log(`  size: ${JSON.stringify(sale.size)} (type: ${typeof sale.size})`)
    console.log(`  數量: ${sale.quantity}`)
  }

  // 查看進貨記錄
  const { data: stockIns } = await supabase
    .from('stock_in')
    .select('*')
    .eq('product_name', 'Vans400%')

  console.log(`\n進貨記錄 (${stockIns.length} 筆):`)
  for (const stockIn of stockIns) {
    console.log(`\n  ID: ${stockIn.id}`)
    console.log(`  日期: ${stockIn.date}`)
    console.log(`  size_quantities: ${JSON.stringify(stockIn.size_quantities)}`)
    console.log(`  數量: ${stockIn.total_quantity}`)
  }
}

checkSaleSize()
