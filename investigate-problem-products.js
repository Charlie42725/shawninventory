const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function investigateProduct(productId) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`調查產品 #${productId}`)
  console.log('='.repeat(60))

  // 查詢產品
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single()

  console.log(`\n產品名稱: ${product.product_name}${product.color ? ` (${product.color})` : ''}`)
  console.log(`類別 ID: ${product.category_id}`)
  console.log(`剩餘庫存: ${product.total_stock}`)
  console.log(`平均成本: $${product.avg_unit_cost.toFixed(2)}`)
  console.log(`庫存成本: $${product.total_cost_value.toFixed(2)}`)

  // 查詢進貨記錄
  let stockInQuery = supabase
    .from('stock_in')
    .select('*')
    .eq('category_id', product.category_id)
    .eq('product_name', product.product_name)
    .order('date', { ascending: true })

  if (product.color) {
    stockInQuery = stockInQuery.eq('color', product.color)
  } else {
    stockInQuery = stockInQuery.is('color', null)
  }

  const { data: stockIns } = await stockInQuery

  console.log(`\n📦 進貨記錄 (${stockIns?.length || 0} 筆):`)
  let totalStockInQty = 0
  let totalStockInCost = 0

  if (stockIns && stockIns.length > 0) {
    console.log(`\n${'ID'.padEnd(6)} ${'日期'.padEnd(12)} ${'數量'.padStart(6)} ${'單價'.padStart(10)} ${'總成本'.padStart(12)}`)
    console.log('-'.repeat(60))

    for (const s of stockIns) {
      totalStockInQty += s.total_quantity
      totalStockInCost += s.total_cost
      console.log(
        `${String(s.id).padEnd(6)} ${s.date.padEnd(12)} ` +
        `${String(s.total_quantity).padStart(6)} ` +
        `$${s.unit_cost.toFixed(2).padStart(9)} ` +
        `$${s.total_cost.toFixed(2).padStart(11)}`
      )
    }

    console.log('-'.repeat(60))
    console.log(`${'總計'.padEnd(18)} ${String(totalStockInQty).padStart(6)} ${' '.repeat(10)} $${totalStockInCost.toFixed(2).padStart(11)}`)
  }

  // 查詢銷售記錄
  const { data: sales } = await supabase
    .from('sales')
    .select('*')
    .eq('product_id', productId)
    .order('date', { ascending: true })

  console.log(`\n💰 銷售記錄 (${sales?.length || 0} 筆):`)
  let totalSoldQty = 0
  let totalCOGS = 0
  let totalRevenue = 0

  if (sales && sales.length > 0) {
    console.log(`\n${'ID'.padEnd(6)} ${'日期'.padEnd(12)} ${'數量'.padStart(6)} ${'單價'.padStart(10)} ${'COGS'.padStart(12)} ${'銷售額'.padStart(12)}`)
    console.log('-'.repeat(72))

    for (const s of sales) {
      totalSoldQty += s.quantity
      totalCOGS += s.cost_of_goods_sold || 0
      totalRevenue += s.total_amount
      console.log(
        `${String(s.id).padEnd(6)} ${s.date.padEnd(12)} ` +
        `${String(s.quantity).padStart(6)} ` +
        `$${s.unit_price.toFixed(2).padStart(9)} ` +
        `$${(s.cost_of_goods_sold || 0).toFixed(2).padStart(11)} ` +
        `$${s.total_amount.toFixed(2).padStart(11)}`
      )
    }

    console.log('-'.repeat(72))
    console.log(
      `${'總計'.padEnd(18)} ${String(totalSoldQty).padStart(6)} ${' '.repeat(10)} ` +
      `$${totalCOGS.toFixed(2).padStart(11)} $${totalRevenue.toFixed(2).padStart(11)}`
    )
  }

  // 計算理論值
  console.log(`\n📊 數據分析:`)
  const theoreticalStock = totalStockInQty - totalSoldQty
  const theoreticalRemainingCost = totalStockInCost - totalCOGS
  const theoreticalAvgCost = theoreticalStock > 0 ? theoreticalRemainingCost / theoreticalStock : 0

  console.log(`\n庫存數量:`)
  console.log(`  進貨總量: ${totalStockInQty}`)
  console.log(`  已售數量: ${totalSoldQty}`)
  console.log(`  理論剩餘: ${theoreticalStock}`)
  console.log(`  實際剩餘: ${product.total_stock}`)
  console.log(`  差異: ${theoreticalStock - product.total_stock}`)

  console.log(`\n成本數據:`)
  console.log(`  進貨總成本: $${totalStockInCost.toFixed(2)}`)
  console.log(`  已售 COGS:  $${totalCOGS.toFixed(2)}`)
  console.log(`  理論剩餘成本: $${theoreticalRemainingCost.toFixed(2)}`)
  console.log(`  實際剩餘成本: $${product.total_cost_value.toFixed(2)}`)
  console.log(`  差異: $${(theoreticalRemainingCost - product.total_cost_value).toFixed(2)}`)

  console.log(`\n平均成本:`)
  console.log(`  理論平均成本: $${theoreticalAvgCost.toFixed(2)}`)
  console.log(`  實際平均成本: $${product.avg_unit_cost.toFixed(2)}`)
  console.log(`  差異: $${(theoreticalAvgCost - product.avg_unit_cost).toFixed(2)}`)

  console.log(`\n損益分析:`)
  const grossProfit = totalRevenue - totalCOGS
  const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue * 100) : 0
  console.log(`  銷售額: $${totalRevenue.toFixed(2)}`)
  console.log(`  銷售成本: $${totalCOGS.toFixed(2)}`)
  console.log(`  毛利: $${grossProfit.toFixed(2)}`)
  console.log(`  毛利率: ${grossProfitMargin.toFixed(2)}%`)

  // 診斷問題
  console.log(`\n🔍 問題診斷:`)
  const issues = []

  if (Math.abs(theoreticalStock - product.total_stock) > 0) {
    issues.push(`❌ 庫存數量不一致`)
  }

  if (Math.abs(theoreticalRemainingCost - product.total_cost_value) > 0.01) {
    issues.push(`❌ 剩餘成本不一致`)
  }

  if (Math.abs(theoreticalAvgCost - product.avg_unit_cost) > 0.01) {
    issues.push(`❌ 平均成本不一致`)
  }

  if (totalCOGS > totalStockInCost) {
    issues.push(`❌ 銷售成本超過進貨成本！可能有進貨記錄被刪除`)
  }

  if (sales && sales.some(s => !s.cost_of_goods_sold || s.cost_of_goods_sold === 0)) {
    issues.push(`❌ 有銷售記錄的 COGS 為 0`)
  }

  if (issues.length === 0) {
    console.log(`  ✅ 未發現問題`)
  } else {
    for (const issue of issues) {
      console.log(`  ${issue}`)
    }
  }

  return {
    product,
    stockIns,
    sales,
    totalStockInCost,
    totalCOGS,
    theoreticalRemainingCost,
    theoreticalAvgCost,
    issues,
  }
}

async function main() {
  console.log('🔬 深入調查問題產品...\n')

  const problemProducts = [84, 85, 95]

  const results = []
  for (const productId of problemProducts) {
    const result = await investigateProduct(productId)
    results.push(result)
  }

  console.log(`\n\n${'='.repeat(60)}`)
  console.log('總結')
  console.log('='.repeat(60))

  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    console.log(`\n產品 #${r.product.id}: ${r.product.product_name}`)
    console.log(`  問題數: ${r.issues.length}`)
    if (r.issues.length > 0) {
      for (const issue of r.issues) {
        console.log(`    ${issue}`)
      }
    }
  }

  console.log('\n')
}

main().catch(console.error)
