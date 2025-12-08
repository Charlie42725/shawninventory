const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://vkbuaxzyfuxbahtqtyfn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrYnVheHp5ZnV4YmFodHF0eWZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDQyMTkzMiwiZXhwIjoyMDUwMDk3OTMyfQ.OnA97KH4xmcQjFtg8Bq5hRAIIBG5F0kxUkMTnmU0nik'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixTotalCostValue() {
  console.log('=== 修復產品總成本價值 ===\n')

  // 獲取所有產品
  const { data: products, error } = await supabase
    .from('products')
    .select('id, product_name, total_stock, avg_unit_cost, total_cost_value')
    .order('id')

  if (error) {
    console.error('Error fetching products:', error)
    return
  }

  console.log(`共找到 ${products.length} 個產品\n`)

  let fixedCount = 0
  let alreadyCorrect = 0

  for (const product of products) {
    const correctValue = product.total_stock * product.avg_unit_cost
    const diff = Math.abs(product.total_cost_value - correctValue)

    if (diff > 0.01) {
      console.log(`修復: ID ${product.id} - ${product.product_name}`)
      console.log(`  庫存: ${product.total_stock}, 平均成本: $${product.avg_unit_cost.toFixed(2)}`)
      console.log(`  舊值: $${product.total_cost_value.toFixed(2)}`)
      console.log(`  新值: $${correctValue.toFixed(2)}`)

      const { error: updateError } = await supabase
        .from('products')
        .update({
          total_cost_value: correctValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id)

      if (updateError) {
        console.error(`  ❌ 更新失敗:`, updateError)
      } else {
        console.log(`  ✓ 已修復`)
        fixedCount++
      }
      console.log('')
    } else {
      alreadyCorrect++
    }
  }

  console.log('\n=== 修復完成 ===')
  console.log(`總產品數: ${products.length}`)
  console.log(`已修復: ${fixedCount}`)
  console.log(`原本正確: ${alreadyCorrect}`)
}

fixTotalCostValue()
