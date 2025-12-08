const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function comprehensiveAudit() {
  console.log('🔍 開始全面審計系統數據...\n')

  // 1. 查詢所有產品
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('id')

  // 2. 查詢所有進貨記錄
  const { data: allStockIns } = await supabase
    .from('stock_in')
    .select('*')

  // 3. 查詢所有銷售記錄
  const { data: allSales } = await supabase
    .from('sales')
    .select('*')

  console.log(`📊 系統總覽`)
  console.log(`- 產品總數: ${products.length}`)
  console.log(`- 進貨記錄總數: ${allStockIns.length}`)
  console.log(`- 銷售記錄總數: ${allSales.length}`)
  console.log()

  let totalIssues = 0
  let criticalIssues = 0
  let minorIssues = 0

  const issueProducts = []

  for (const product of products) {
    // 查詢該產品的所有進貨記錄
    let stockIns = allStockIns.filter(s =>
      s.category_id === product.category_id &&
      s.product_name === product.product_name
    )

    // 處理 color 匹配
    if (product.color) {
      stockIns = stockIns.filter(s => s.color === product.color)
    } else {
      stockIns = stockIns.filter(s => !s.color || s.color === null)
    }

    // 查詢該產品的所有銷售記錄
    const sales = allSales.filter(s => s.product_id === product.id)

    // 計算理論值
    const totalStockInQty = stockIns.reduce((sum, s) => sum + (s.total_quantity || 0), 0)
    const totalStockInCost = stockIns.reduce((sum, s) => sum + (s.total_cost || 0), 0)
    const totalSoldQty = sales.reduce((sum, s) => sum + (s.quantity || 0), 0)
    const totalCOGS = sales.reduce((sum, s) => sum + (s.cost_of_goods_sold || 0), 0)

    // 理論剩餘庫存
    const theoreticalStock = totalStockInQty - totalSoldQty

    // 理論剩餘成本（使用實際的 COGS）
    const theoreticalRemainingCost = totalStockInCost - totalCOGS

    // 實際值
    const actualStock = product.total_stock
    const actualRemainingCost = product.total_cost_value
    const actualAvgCost = product.avg_unit_cost

    // 計算理論平均成本
    const theoreticalAvgCost = theoreticalStock > 0
      ? theoreticalRemainingCost / theoreticalStock
      : actualAvgCost

    // 檢查差異
    const stockDiff = Math.abs(theoreticalStock - actualStock)
    const costDiff = Math.abs(theoreticalRemainingCost - actualRemainingCost)
    const avgCostDiff = Math.abs(theoreticalAvgCost - actualAvgCost)

    // 檢查 COGS 問題
    let hasCogsIssue = false
    let zeroCogsCount = 0
    for (const sale of sales) {
      if (!sale.cost_of_goods_sold || sale.cost_of_goods_sold === 0) {
        zeroCogsCount++
        hasCogsIssue = true
      }
    }

    // 判定問題嚴重性
    const isCritical = (
      stockDiff > 1 ||
      costDiff > 100 ||
      avgCostDiff > 10 ||
      hasCogsIssue
    )

    const isMinor = (
      stockDiff > 0 ||
      costDiff > 0.01 ||
      avgCostDiff > 0.01
    )

    if (isCritical || isMinor) {
      totalIssues++
      if (isCritical) criticalIssues++
      else minorIssues++

      issueProducts.push({
        id: product.id,
        name: product.product_name,
        color: product.color,
        isCritical,
        stockIns: stockIns.length,
        sales: sales.length,
        totalStockInQty,
        totalStockInCost,
        totalSoldQty,
        totalCOGS,
        theoreticalStock,
        actualStock,
        stockDiff,
        theoreticalRemainingCost,
        actualRemainingCost,
        costDiff,
        theoreticalAvgCost,
        actualAvgCost,
        avgCostDiff,
        zeroCogsCount,
      })
    }
  }

  console.log(`\n========== 審計結果 ==========`)
  console.log(`發現問題的產品數: ${totalIssues}`)
  console.log(`- 🔴 嚴重問題: ${criticalIssues}`)
  console.log(`- 🟡 輕微問題: ${minorIssues}`)
  console.log(`===============================\n`)

  // 顯示嚴重問題
  if (criticalIssues > 0) {
    console.log(`\n🔴 嚴重問題列表：\n`)
    const critical = issueProducts.filter(p => p.isCritical)
    for (const p of critical) {
      console.log(`產品 #${p.id}: ${p.name}${p.color ? ` (${p.color})` : ''}`)
      console.log(`  進貨: ${p.stockIns} 筆, 總量 ${p.totalStockInQty}, 總成本 $${p.totalStockInCost.toFixed(2)}`)
      console.log(`  銷售: ${p.sales} 筆, 總量 ${p.totalSoldQty}, 總 COGS $${p.totalCOGS.toFixed(2)}`)

      if (p.stockDiff > 1) {
        console.log(`  ⚠️ 庫存差異: 理論 ${p.theoreticalStock}, 實際 ${p.actualStock}, 差 ${p.stockDiff}`)
      }

      if (p.costDiff > 100) {
        console.log(`  ⚠️ 成本差異: 理論 $${p.theoreticalRemainingCost.toFixed(2)}, 實際 $${p.actualRemainingCost.toFixed(2)}, 差 $${p.costDiff.toFixed(2)}`)
      }

      if (p.avgCostDiff > 10) {
        console.log(`  ⚠️ 平均成本差異: 理論 $${p.theoreticalAvgCost.toFixed(2)}, 實際 $${p.actualAvgCost.toFixed(2)}, 差 $${p.avgCostDiff.toFixed(2)}`)
      }

      if (p.zeroCogsCount > 0) {
        console.log(`  ⚠️ 有 ${p.zeroCogsCount} 筆銷售記錄的 COGS 為 0`)
      }

      console.log()
    }
  }

  // 顯示輕微問題
  if (minorIssues > 0) {
    console.log(`\n🟡 輕微問題列表（僅顯示前 10 個）：\n`)
    const minor = issueProducts.filter(p => !p.isCritical).slice(0, 10)
    for (const p of minor) {
      console.log(`產品 #${p.id}: ${p.name}${p.color ? ` (${p.color})` : ''}`)
      if (p.stockDiff > 0) {
        console.log(`  庫存差異: ${p.stockDiff}`)
      }
      if (p.costDiff > 0.01) {
        console.log(`  成本差異: $${p.costDiff.toFixed(2)} (理論: $${p.theoreticalRemainingCost.toFixed(2)}, 實際: $${p.actualRemainingCost.toFixed(2)})`)
      }
      console.log()
    }
  }

  // 計算系統總體數據
  console.log(`\n========== 系統總體數據 ==========`)

  const totalStockInCost = allStockIns.reduce((sum, s) => sum + (s.total_cost || 0), 0)
  const totalSalesCOGS = allSales.reduce((sum, s) => sum + (s.cost_of_goods_sold || 0), 0)
  const totalProductCostValue = products.reduce((sum, p) => sum + (p.total_cost_value || 0), 0)

  console.log(`總進貨成本: $${totalStockInCost.toFixed(2)}`)
  console.log(`總銷售 COGS: $${totalSalesCOGS.toFixed(2)}`)
  console.log(`產品剩餘成本總和: $${totalProductCostValue.toFixed(2)}`)
  console.log(`理論剩餘成本: $${(totalStockInCost - totalSalesCOGS).toFixed(2)}`)
  console.log(`差異: $${Math.abs(totalStockInCost - totalSalesCOGS - totalProductCostValue).toFixed(2)}`)

  // 計算損益
  const totalSalesRevenue = allSales.reduce((sum, s) => sum + (s.total_amount || 0), 0)
  const grossProfit = totalSalesRevenue - totalSalesCOGS
  const grossProfitMargin = totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue * 100) : 0

  console.log(`\n總銷售額: $${totalSalesRevenue.toFixed(2)}`)
  console.log(`總銷售成本 (COGS): $${totalSalesCOGS.toFixed(2)}`)
  console.log(`毛利: $${grossProfit.toFixed(2)}`)
  console.log(`毛利率: ${grossProfitMargin.toFixed(2)}%`)

  console.log(`===================================\n`)
}

comprehensiveAudit().catch(console.error)
