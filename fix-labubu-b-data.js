require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixLabubuB() {
  console.log('🔧 修復 Labubu組合B 的數據...\n')

  // 1. 查詢銷售記錄
  const { data: sale } = await supabase
    .from('sales')
    .select('*')
    .eq('id', 15)
    .single()

  console.log('銷售記錄 #15:')
  console.log(`  產品: ${sale.model || sale.product_name}`)
  console.log(`  數量: ${sale.quantity}`)
  console.log(`  單價: $${sale.unit_price}`)
  console.log(`  總額: $${sale.total_amount}`)
  console.log(`  當前 COGS: ${sale.cost_of_goods_sold || '缺失'}`)

  // 2. 查詢產品信息
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', sale.product_id)
    .single()

  console.log('\n產品信息:')
  console.log(`  ID: ${product.id}`)
  console.log(`  名稱: ${product.product_name}`)
  console.log(`  分類 ID: ${product.category_id}`)
  console.log(`  當前庫存: ${product.total_stock}`)
  console.log(`  平均成本: $${product.avg_unit_cost}`)

  // 3. 查找類似產品的成本（LabubuA組合）
  const { data: similarProducts } = await supabase
    .from('products')
    .select('*')
    .eq('category_id', product.category_id)
    .ilike('product_name', '%Labubu%組合%')

  console.log('\n類似產品:')
  similarProducts.forEach(p => {
    console.log(`  - ${p.product_name}: 平均成本 $${p.avg_unit_cost}`)
  })

  // 4. 估算成本
  const estimatedCost = 3000 // 基於 LabubuA組合 的成本 $3030
  const estimatedCOGS = estimatedCost * sale.quantity

  console.log('\n' + '='.repeat(80))
  console.log('修復方案:')
  console.log('='.repeat(80))
  console.log(`\n基於類似產品估算成本: $${estimatedCost}/件`)
  console.log(`銷售 COGS: ${estimatedCost} × ${sale.quantity} = $${estimatedCOGS}`)

  console.log('\n執行修復 SQL:')
  console.log(`UPDATE sales SET cost_of_goods_sold = ${estimatedCOGS} WHERE id = 15;`)

  // 5. 執行修復
  const { error } = await supabase
    .from('sales')
    .update({ cost_of_goods_sold: estimatedCOGS })
    .eq('id', 15)

  if (error) {
    console.error('\n❌ 更新失敗:', error)
  } else {
    console.log('\n✅ 成功更新銷售記錄 #15 的 COGS = $' + estimatedCOGS)

    // 驗證
    const { data: updatedSale } = await supabase
      .from('sales')
      .select('cost_of_goods_sold')
      .eq('id', 15)
      .single()

    console.log('✅ 驗證: COGS = $' + updatedSale.cost_of_goods_sold)
  }
}

fixLabubuB().then(() => process.exit(0)).catch(err => {
  console.error('修復失敗:', err)
  process.exit(1)
})
