require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkTotalCOGS() {
  console.log('🔍 檢查實際的銷售成本總和...\n')

  // 1. 獲取所有銷售記錄
  const { data: sales, error } = await supabase
    .from('sales')
    .select('*')
    .order('date')

  if (error) {
    console.error('查詢失敗:', error)
    return
  }

  console.log(`總銷售記錄: ${sales.length} 筆\n`)

  // 2. 計算總銷售額
  let totalRevenue = 0
  let totalCOGS = 0
  let missingSalesCOGS = 0

  sales.forEach(sale => {
    const revenue = (sale.unit_price || 0) * (sale.quantity || 0)
    totalRevenue += revenue

    if (sale.cost_of_goods_sold && sale.cost_of_goods_sold > 0) {
      totalCOGS += sale.cost_of_goods_sold
    } else {
      missingSalesCOGS++
    }
  })

  console.log('=' .repeat(80))
  console.log('💰 財務數據總覽')
  console.log('=' .repeat(80))
  console.log(`總銷售額: $${totalRevenue.toLocaleString()}`)
  console.log(`總銷售成本 (COGS): $${totalCOGS.toLocaleString()}`)
  console.log(`毛利: $${(totalRevenue - totalCOGS).toLocaleString()}`)
  console.log(`毛利率: ${((totalRevenue - totalCOGS) / totalRevenue * 100).toFixed(2)}%`)
  console.log(`缺少 COGS 的銷售: ${missingSalesCOGS} 筆`)

  // 3. 列出 COGS 最高的前 10 筆銷售
  console.log('\n' + '=' .repeat(80))
  console.log('📊 COGS 最高的 10 筆銷售')
  console.log('=' .repeat(80))

  const topCOGS = [...sales]
    .filter(s => s.cost_of_goods_sold > 0)
    .sort((a, b) => b.cost_of_goods_sold - a.cost_of_goods_sold)
    .slice(0, 10)

  topCOGS.forEach((sale, index) => {
    console.log(`${index + 1}. 銷售 #${sale.id} (${sale.date}): ${sale.model || sale.product_name}`)
    console.log(`   數量: ${sale.quantity}, COGS: $${sale.cost_of_goods_sold.toLocaleString()}, 單價: $${sale.unit_price}`)
  })

  // 4. 獲取所有產品的總成本價值
  const { data: products } = await supabase
    .from('products')
    .select('total_cost_value, total_stock, model, product_name')

  let totalInventoryCost = 0
  if (products) {
    products.forEach(p => {
      totalInventoryCost += (p.total_cost_value || 0)
    })
  }

  console.log('\n' + '=' .repeat(80))
  console.log('📦 庫存成本總覽')
  console.log('=' .repeat(80))
  console.log(`當前庫存總成本價值: $${totalInventoryCost.toLocaleString()}`)

  // 5. 獲取所有進貨的總成本
  const { data: stockIns } = await supabase
    .from('stock_in')
    .select('total_cost')

  let totalStockInCost = 0
  if (stockIns) {
    stockIns.forEach(si => {
      totalStockInCost += (si.total_cost || 0)
    })
  }

  console.log(`所有進貨總成本: $${totalStockInCost.toLocaleString()}`)

  // 6. 成本平衡驗證
  console.log('\n' + '=' .repeat(80))
  console.log('✅ 成本平衡驗證')
  console.log('=' .repeat(80))
  console.log('\n公式: 進貨總成本 = 當前庫存成本 + 已售出成本 (COGS)')
  console.log(`\n進貨總成本: $${totalStockInCost.toLocaleString()}`)
  console.log(`當前庫存成本: $${totalInventoryCost.toLocaleString()}`)
  console.log(`已售出成本 (COGS): $${totalCOGS.toLocaleString()}`)
  console.log(`庫存成本 + COGS: $${(totalInventoryCost + totalCOGS).toLocaleString()}`)

  const difference = totalStockInCost - (totalInventoryCost + totalCOGS)
  console.log(`\n差異: $${difference.toLocaleString()}`)

  if (Math.abs(difference) < 1) {
    console.log('✅ 成本平衡！數據正確！')
  } else if (Math.abs(difference) < 100) {
    console.log('⚠️  有輕微差異（可能是四捨五入誤差）')
  } else {
    console.log('❌ 成本不平衡！有重大問題！')
  }
}

checkTotalCOGS().then(() => {
  process.exit(0)
}).catch(err => {
  console.error('檢查失敗:', err)
  process.exit(1)
})
