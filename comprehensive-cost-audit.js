require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function comprehensiveCostAudit() {
  console.log('🔍 開始完整成本驗算...\n')

  // 1. 獲取所有數據
  const { data: products } = await supabase.from('products').select('*').order('id')
  const { data: stockIns } = await supabase.from('stock_in').select('*').order('date')
  const { data: sales } = await supabase.from('sales').select('*').order('date')

  console.log(`📊 數據總覽:`)
  console.log(`  產品: ${products.length} 個`)
  console.log(`  進貨記錄: ${stockIns.length} 筆`)
  console.log(`  銷售記錄: ${sales.length} 筆\n`)

  const issues = []
  const criticalIssues = []

  // ============================================================================
  // 第一步：驗證產品的平均成本和總成本價值計算
  // ============================================================================
  console.log('=' .repeat(80))
  console.log('📋 第一步：驗證產品成本計算')
  console.log('=' .repeat(80))

  for (const product of products) {
    // 找出該產品的所有進貨記錄
    const productStockIns = stockIns.filter(si =>
      si.category_id === product.category_id &&
      si.product_name === product.product_name &&
      (si.color || null) === (product.color || null)
    )

    // 找出該產品的所有銷售記錄
    const productSales = sales.filter(s => s.product_id === product.id)

    // 計算理論上的總成本價值
    let theoreticalTotalCost = 0
    let theoreticalTotalQty = 0

    // 加入所有進貨
    for (const si of productStockIns) {
      theoreticalTotalCost += si.total_cost || 0
      theoreticalTotalQty += si.total_quantity || 0
    }

    // 減去所有銷售（使用銷售時的實際成本）
    for (const sale of productSales) {
      const saleCost = sale.cost_of_goods_sold || 0
      theoreticalTotalCost -= saleCost
      theoreticalTotalQty -= sale.quantity || 0
    }

    // 計算理論平均成本
    const theoreticalAvgCost = theoreticalTotalQty > 0
      ? theoreticalTotalCost / theoreticalTotalQty
      : 0

    // 檢查是否一致
    const totalCostDiff = Math.abs((product.total_cost_value || 0) - theoreticalTotalCost)
    const avgCostDiff = Math.abs((product.avg_unit_cost || 0) - theoreticalAvgCost)
    const stockDiff = Math.abs((product.total_stock || 0) - theoreticalTotalQty)

    if (totalCostDiff > 0.01 || avgCostDiff > 0.01 || stockDiff > 0) {
      const issue = {
        type: 'PRODUCT_COST_MISMATCH',
        severity: totalCostDiff > 100 ? 'CRITICAL' : 'WARNING',
        product_id: product.id,
        product_name: product.model || product.product_name,
        details: {
          庫存差異: stockDiff,
          實際庫存: product.total_stock,
          理論庫存: theoreticalTotalQty,
          總成本價值差異: totalCostDiff.toFixed(2),
          實際總成本: product.total_cost_value?.toFixed(2),
          理論總成本: theoreticalTotalCost.toFixed(2),
          平均成本差異: avgCostDiff.toFixed(2),
          實際平均成本: product.avg_unit_cost?.toFixed(2),
          理論平均成本: theoreticalAvgCost.toFixed(2),
          進貨筆數: productStockIns.length,
          銷售筆數: productSales.length,
        }
      }

      if (issue.severity === 'CRITICAL') {
        criticalIssues.push(issue)
      } else {
        issues.push(issue)
      }

      console.log(`\n⚠️  產品成本不一致: ${issue.product_name}`)
      console.log(`   庫存: 實際 ${product.total_stock} vs 理論 ${theoreticalTotalQty} (差異: ${stockDiff})`)
      console.log(`   總成本: 實際 $${product.total_cost_value?.toFixed(2)} vs 理論 $${theoreticalTotalCost.toFixed(2)} (差異: $${totalCostDiff.toFixed(2)})`)
      console.log(`   平均成本: 實際 $${product.avg_unit_cost?.toFixed(2)} vs 理論 $${theoreticalAvgCost.toFixed(2)} (差異: $${avgCostDiff.toFixed(2)})`)
    }
  }

  if (criticalIssues.length === 0 && issues.filter(i => i.type === 'PRODUCT_COST_MISMATCH').length === 0) {
    console.log('\n✅ 所有產品成本計算正確')
  }

  // ============================================================================
  // 第二步：驗證銷售記錄的 COGS
  // ============================================================================
  console.log('\n' + '='.repeat(80))
  console.log('📋 第二步：驗證銷售記錄的 COGS')
  console.log('='.repeat(80))

  let missingSalesCOGS = []
  let incorrectSalesCOGS = []

  for (const sale of sales) {
    const product = products.find(p => p.id === sale.product_id)

    if (!product) {
      criticalIssues.push({
        type: 'ORPHAN_SALE',
        severity: 'CRITICAL',
        sale_id: sale.id,
        details: `銷售記錄 #${sale.id} 找不到對應產品 (product_id: ${sale.product_id})`
      })
      continue
    }

    // 檢查是否缺少 COGS
    if (!sale.cost_of_goods_sold || sale.cost_of_goods_sold === 0) {
      missingSalesCOGS.push({
        sale_id: sale.id,
        date: sale.date,
        product_name: sale.model || sale.product_name,
        quantity: sale.quantity,
        unit_price: sale.unit_price,
        current_avg_cost: product.avg_unit_cost,
        suggested_cogs: product.avg_unit_cost * sale.quantity
      })
    } else {
      // 檢查 COGS 是否合理（與當前平均成本對比）
      const expectedCOGS = product.avg_unit_cost * sale.quantity
      const cogsDiff = Math.abs(sale.cost_of_goods_sold - expectedCOGS)
      const cogsPercentDiff = expectedCOGS > 0 ? (cogsDiff / expectedCOGS) * 100 : 0

      // 如果差異超過 10%，標記為可能不正確
      if (cogsPercentDiff > 10 && cogsDiff > 10) {
        incorrectSalesCOGS.push({
          sale_id: sale.id,
          date: sale.date,
          product_name: sale.model || sale.product_name,
          quantity: sale.quantity,
          recorded_cogs: sale.cost_of_goods_sold,
          current_avg_cost: product.avg_unit_cost,
          expected_cogs: expectedCOGS,
          difference: cogsDiff.toFixed(2),
          percent_diff: cogsPercentDiff.toFixed(1) + '%'
        })
      }
    }
  }

  console.log(`\n缺少 COGS 的銷售記錄: ${missingSalesCOGS.length} 筆`)
  if (missingSalesCOGS.length > 0) {
    console.log('前 5 筆:')
    missingSalesCOGS.slice(0, 5).forEach(s => {
      console.log(`  - ID ${s.sale_id}: ${s.product_name} x${s.quantity}, 建議 COGS: $${s.suggested_cogs?.toFixed(2)}`)
    })
  }

  console.log(`\nCOGS 可能不正確的銷售記錄: ${incorrectSalesCOGS.length} 筆`)
  if (incorrectSalesCOGS.length > 0) {
    console.log('前 10 筆 (差異超過 10%):')
    incorrectSalesCOGS.slice(0, 10).forEach(s => {
      console.log(`  - ID ${s.sale_id}: ${s.product_name}`)
      console.log(`    記錄 COGS: $${s.recorded_cogs.toFixed(2)}, 當前應為: $${s.expected_cogs.toFixed(2)} (差異: $${s.difference}, ${s.percent_diff})`)
    })
  }

  // ============================================================================
  // 第三步：檢查進貨記錄與產品的關聯
  // ============================================================================
  console.log('\n' + '='.repeat(80))
  console.log('📋 第三步：檢查進貨記錄完整性')
  console.log('='.repeat(80))

  let orphanStockIns = []

  for (const si of stockIns) {
    const matchingProduct = products.find(p =>
      p.category_id === si.category_id &&
      p.product_name === si.product_name &&
      (p.color || null) === (si.color || null)
    )

    if (!matchingProduct) {
      orphanStockIns.push({
        stock_in_id: si.id,
        date: si.date,
        product_name: si.product_name,
        color: si.color,
        quantity: si.total_quantity,
        total_cost: si.total_cost
      })
    }
  }

  console.log(`\n找不到對應產品的進貨記錄: ${orphanStockIns.length} 筆`)
  if (orphanStockIns.length > 0) {
    console.log('前 5 筆:')
    orphanStockIns.slice(0, 5).forEach(si => {
      console.log(`  - ID ${si.stock_in_id}: ${si.product_name} ${si.color || ''} x${si.quantity}`)
    })
  }

  // ============================================================================
  // 總結報告
  // ============================================================================
  console.log('\n' + '='.repeat(80))
  console.log('📊 驗算總結')
  console.log('='.repeat(80))

  console.log(`\n🔴 嚴重問題: ${criticalIssues.length} 個`)
  console.log(`🟡 警告: ${issues.length} 個`)
  console.log(`❌ 缺少 COGS 的銷售: ${missingSalesCOGS.length} 筆`)
  console.log(`⚠️  COGS 可能不正確: ${incorrectSalesCOGS.length} 筆`)
  console.log(`🔗 孤立的進貨記錄: ${orphanStockIns.length} 筆`)

  const totalIssues = criticalIssues.length + issues.length + missingSalesCOGS.length + incorrectSalesCOGS.length + orphanStockIns.length

  if (totalIssues === 0) {
    console.log('\n✅ 恭喜！所有成本數據都是正確的！')
  } else {
    console.log(`\n⚠️  共發現 ${totalIssues} 個問題需要處理`)
    console.log('\n建議修復順序:')
    console.log('1. 先修復嚴重問題（產品成本嚴重不一致）')
    console.log('2. 補充缺少的銷售 COGS')
    console.log('3. 檢查並修正 COGS 不正確的銷售記錄')
    console.log('4. 清理孤立的進貨記錄')
  }

  // 保存詳細報告
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total_products: products.length,
      total_stock_ins: stockIns.length,
      total_sales: sales.length,
      critical_issues: criticalIssues.length,
      warnings: issues.length,
      missing_cogs: missingSalesCOGS.length,
      incorrect_cogs: incorrectSalesCOGS.length,
      orphan_stock_ins: orphanStockIns.length,
    },
    critical_issues: criticalIssues,
    warnings: issues,
    missing_sales_cogs: missingSalesCOGS,
    incorrect_sales_cogs: incorrectSalesCOGS,
    orphan_stock_ins: orphanStockIns,
  }

  const fs = require('fs')
  fs.writeFileSync(
    'COST_AUDIT_REPORT.json',
    JSON.stringify(report, null, 2)
  )

  console.log('\n📄 詳細報告已保存至: COST_AUDIT_REPORT.json')

  return report
}

comprehensiveCostAudit().then(() => {
  console.log('\n✅ 驗算完成！')
  process.exit(0)
}).catch(err => {
  console.error('❌ 驗算失敗:', err)
  process.exit(1)
})
