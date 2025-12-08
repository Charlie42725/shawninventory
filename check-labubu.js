const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://vkbuaxzyfuxbahtqtyfn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrYnVheHp5ZnV4YmFodHF0eWZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDQyMTkzMiwiZXhwIjoyMDUwMDk3OTMyfQ.OnA97KH4xmcQjFtg8Bq5hRAIIBG5F0kxUkMTnmU0nik'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkLabubu() {
  console.log('=== 檢查 Labubu Pulsar 產品狀態 ===\n')

  // 查詢 Labubu Pulsar 產品
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('*')
    .ilike('product_name', '%Labubu%Pulsar%')

  if (productError) {
    console.error('查詢產品錯誤:', productError)
    return
  }

  if (!products || products.length === 0) {
    console.log('找不到 Labubu Pulsar 產品')
    return
  }

  console.log(`找到 ${products.length} 個相關產品:\n`)

  for (const product of products) {
    console.log(`\n📦 產品: ${product.product_name}`)
    console.log(`   ID: ${product.id}`)
    console.log(`   分類: ${product.ip_category || 'N/A'}`)
    console.log(`   顏色: ${product.color || 'N/A'}`)
    console.log(`   總庫存: ${product.total_stock}`)
    console.log(`   平均成本: $${product.avg_unit_cost.toFixed(2)}`)
    console.log(`   庫存成本價值: $${product.total_cost_value.toFixed(2)}`)

    // 計算應該的值
    const expectedValue = product.total_stock * product.avg_unit_cost
    console.log(`   應該的值: $${expectedValue.toFixed(2)}`)

    const diff = Math.abs(product.total_cost_value - expectedValue)
    if (diff > 0.01) {
      console.log(`   ⚠️  不正確! 差異: $${diff.toFixed(2)}`)
    } else {
      console.log(`   ✓ 正確`)
    }

    // 查詢該產品的進貨記錄
    console.log(`\n   進貨記錄:`)
    let stockInQuery = supabase
      .from('stock_in')
      .select('*')
      .eq('category_id', product.category_id)
      .eq('product_name', product.product_name)

    if (product.color) {
      stockInQuery = stockInQuery.eq('color', product.color)
    } else {
      stockInQuery = stockInQuery.is('color', null)
    }

    const { data: stockIns } = await stockInQuery.order('date', { ascending: false })

    if (stockIns && stockIns.length > 0) {
      let totalStockInQty = 0
      let totalStockInCost = 0

      stockIns.forEach(si => {
        console.log(`     - ID ${si.id}: ${si.date} | ${si.order_type} | 數量: ${si.total_quantity} | 單價: $${si.unit_cost.toFixed(2)} | 總成本: $${si.total_cost.toFixed(2)}`)
        totalStockInQty += si.total_quantity
        totalStockInCost += si.total_cost
      })

      console.log(`\n   總進貨數量: ${totalStockInQty}`)
      console.log(`   總進貨成本: $${totalStockInCost.toFixed(2)}`)
      const calculatedAvgCost = totalStockInQty > 0 ? totalStockInCost / totalStockInQty : 0
      console.log(`   計算的平均成本: $${calculatedAvgCost.toFixed(2)}`)
    } else {
      console.log(`     無進貨記錄`)
    }

    // 查詢銷售記錄
    const { data: sales } = await supabase
      .from('sales')
      .select('*')
      .eq('product_id', product.id)

    if (sales && sales.length > 0) {
      console.log(`\n   銷售記錄: (共 ${sales.length} 筆)`)
      let totalSold = 0
      sales.forEach(s => {
        console.log(`     - ID ${s.id}: 數量: ${s.quantity} | COGS: $${s.cost_of_goods_sold?.toFixed(2) || 'N/A'}`)
        totalSold += s.quantity
      })
      console.log(`   總銷售數量: ${totalSold}`)
    } else {
      console.log(`\n   無銷售記錄`)
    }
  }
}

checkLabubu()
