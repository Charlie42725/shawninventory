const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://vkbuaxzyfuxbahtqtyfn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrYnVheHp5ZnV4YmFodHF0eWZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDQyMTkzMiwiZXhwIjoyMDUwMDk3OTMyfQ.OnA97KH4xmcQjFtg8Bq5hRAIIBG5F0kxUkMTnmU0nik'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixLabubuSpecific() {
  console.log('=== 修復 Labubu Pulsar - Labubu10週年 ===\n')

  // 查詢產品
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('product_name', 'Labubu Pulsar')
    .eq('ip_category', 'Labubu10週年')

  if (productError) {
    console.error('查詢產品錯誤:', productError)
    return
  }

  if (!products || products.length === 0) {
    console.log('找不到該產品')
    return
  }

  const product = products[0]

  console.log(`產品資訊:`)
  console.log(`  ID: ${product.id}`)
  console.log(`  名稱: ${product.product_name}`)
  console.log(`  IP分類: ${product.ip_category}`)
  console.log(`  總庫存: ${product.total_stock}`)
  console.log(`  平均成本: $${product.avg_unit_cost.toFixed(2)}`)
  console.log(`  當前庫存價值: $${product.total_cost_value.toFixed(2)}\n`)

  // 正確的計算
  const correctValue = product.total_stock * product.avg_unit_cost
  console.log(`應該的庫存價值: ${product.total_stock} × $${product.avg_unit_cost.toFixed(2)} = $${correctValue.toFixed(2)}`)

  const diff = Math.abs(product.total_cost_value - correctValue)
  console.log(`差異: $${diff.toFixed(2)}\n`)

  if (diff > 0.01) {
    console.log('⚠️  庫存價值不正確，正在修復...\n')

    const { error: updateError } = await supabase
      .from('products')
      .update({
        total_cost_value: correctValue,
        updated_at: new Date().toISOString()
      })
      .eq('id', product.id)

    if (updateError) {
      console.error('❌ 更新失敗:', updateError)
    } else {
      console.log('✅ 已修復!')
      console.log(`   舊值: $${product.total_cost_value.toFixed(2)}`)
      console.log(`   新值: $${correctValue.toFixed(2)}`)
      console.log(`   修正: $${(correctValue - product.total_cost_value).toFixed(2)}`)
    }
  } else {
    console.log('✓ 庫存價值正確，無需修復')
  }
}

fixLabubuSpecific()
