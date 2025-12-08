const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://vkbuaxzyfuxbahtqtyfn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrYnVheHp5ZnV4YmFodHF0eWZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDQyMTkzMiwiZXhwIjoyMDUwMDk3OTMyfQ.OnA97KH4xmcQjFtg8Bq5hRAIIBG5F0kxUkMTnmU0nik'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTotalCostValue() {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, product_name, total_stock, avg_unit_cost, total_cost_value')
    .order('id')
    .limit(15)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('=== 檢查產品總成本價值 ===\n')
  let wrongCount = 0

  products.forEach(p => {
    const expected = p.total_stock * p.avg_unit_cost
    const diff = Math.abs(p.total_cost_value - expected)
    const isWrong = diff > 0.01

    if (isWrong) wrongCount++

    console.log(`ID: ${p.id} - ${p.product_name}`)
    console.log(`  庫存: ${p.total_stock}`)
    console.log(`  平均成本: $${p.avg_unit_cost.toFixed(2)}`)
    console.log(`  總成本價值 (實際): $${p.total_cost_value.toFixed(2)}`)
    console.log(`  總成本價值 (應該): $${expected.toFixed(2)}`)
    if (isWrong) {
      console.log(`  ⚠️  不正確! 差異: $${diff.toFixed(2)}`)
    } else {
      console.log(`  ✓ 正確`)
    }
    console.log('')
  })

  console.log(`\n總共檢查: ${products.length} 筆`)
  console.log(`錯誤數量: ${wrongCount} 筆`)
}

checkTotalCostValue()
