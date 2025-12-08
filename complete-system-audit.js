const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function completeSystemAudit() {
  console.log('='.repeat(80))
  console.log('完整系统审计 - 认真检查所有数据')
  console.log('='.repeat(80))
  console.log('')

  try {
    // 1. 检查销售记录总金额
    console.log('【第一步】检查销售记录总金额')
    console.log('-'.repeat(80))

    const { data: allSales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .order('date', { ascending: true })

    if (salesError) {
      throw new Error(`查询销售记录失败: ${salesError.message}`)
    }

    console.log(`总销售记录数: ${allSales.length} 条\n`)

    // 计算总销售额（多种方法验证）
    let totalByUnitPrice = 0
    let totalByTotalAmount = 0

    for (const sale of allSales) {
      const byUnitPrice = (sale.unit_price || 0) * (sale.quantity || 0)
      const byTotalAmount = sale.total_amount || 0

      totalByUnitPrice += byUnitPrice
      totalByTotalAmount += byTotalAmount

      // 检查不一致
      if (Math.abs(byUnitPrice - byTotalAmount) > 0.01) {
        console.log(`⚠️  销售 ID ${sale.id} 金额不一致:`)
        console.log(`   unit_price × quantity = $${byUnitPrice.toFixed(2)}`)
        console.log(`   total_amount = $${byTotalAmount.toFixed(2)}`)
      }
    }

    console.log(`方法1 (unit_price × quantity): $${totalByUnitPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`)
    console.log(`方法2 (total_amount): $${totalByTotalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`)
    console.log(`差异: $${Math.abs(totalByUnitPrice - totalByTotalAmount).toFixed(2)}`)

    if (Math.abs(totalByUnitPrice - totalByTotalAmount) > 1) {
      console.log(`❌ 销售金额计算不一致！`)
    } else {
      console.log(`✅ 销售金额一致`)
    }
    console.log('')

    // 2. 检查每个产品的库存与销售
    console.log('【第二步】检查库存与销售记录一致性')
    console.log('-'.repeat(80))

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .order('id')

    if (productsError) {
      throw new Error(`查询产品失败: ${productsError.message}`)
    }

    const { data: stockIns, error: stockInsError } = await supabase
      .from('stock_in')
      .select('*')

    if (stockInsError) {
      throw new Error(`查询进货记录失败: ${stockInsError.message}`)
    }

    console.log(`总产品数: ${products.length} 个\n`)

    const issues = []

    for (const product of products) {
      const productSales = allSales.filter(s => s.product_id === product.id)
      const productStockIns = stockIns.filter(s =>
        s.category_id === product.category_id &&
        s.product_name === product.product_name &&
        ((product.color === null && (s.color === null || s.color === '')) || s.color === product.color)
      )

      // 计算理论库存
      const totalStockIn = productStockIns.reduce((sum, s) => sum + (s.total_quantity || 0), 0)
      const totalSold = productSales.reduce((sum, s) => sum + (s.quantity || 0), 0)
      const theoreticalStock = totalStockIn - totalSold

      // 实际库存
      const sizeStock = product.size_stock || {}
      const actualSizeStockTotal = Object.values(sizeStock).reduce((sum, qty) => sum + qty, 0)
      const actualTotalStock = product.total_stock

      // 检查问题
      const hasIssue =
        theoreticalStock !== actualTotalStock ||
        (Object.keys(sizeStock).length > 0 && actualSizeStockTotal !== actualTotalStock) ||
        theoreticalStock < 0

      if (hasIssue || productSales.length > 0 || totalStockIn > 0) {
        const issue = {
          product,
          totalStockIn,
          totalSold,
          theoreticalStock,
          actualTotalStock,
          actualSizeStockTotal,
          productSales: productSales.length,
          productStockIns: productStockIns.length,
          hasIssue
        }
        issues.push(issue)
      }
    }

    console.log(`有进货/销售记录的产品: ${issues.length} 个`)
    console.log(`有问题的产品: ${issues.filter(i => i.hasIssue).length} 个\n`)

    // 显示前20个有问题的产品
    const problemProducts = issues.filter(i => i.hasIssue)
    if (problemProducts.length > 0) {
      console.log('❌ 发现库存问题:\n')

      for (let i = 0; i < Math.min(20, problemProducts.length); i++) {
        const issue = problemProducts[i]
        const p = issue.product

        console.log(`${i + 1}. ${p.product_name}${p.color ? ` (${p.color})` : ''} [ID: ${p.id}]`)
        console.log(`   进货总数: ${issue.totalStockIn}`)
        console.log(`   销售总数: ${issue.totalSold}`)
        console.log(`   理论库存: ${issue.theoreticalStock}`)
        console.log(`   实际 total_stock: ${issue.actualTotalStock}`)
        console.log(`   实际 size_stock 总和: ${issue.actualSizeStockTotal}`)

        if (issue.theoreticalStock !== issue.actualTotalStock) {
          console.log(`   ⚠️  库存不符! 差异: ${issue.actualTotalStock - issue.theoreticalStock}`)
        }

        if (Object.keys(p.size_stock || {}).length > 0 && issue.actualSizeStockTotal !== issue.actualTotalStock) {
          console.log(`   ⚠️  size_stock 不一致! total=${issue.actualTotalStock}, sizes=${issue.actualSizeStockTotal}`)
        }

        if (issue.theoreticalStock < 0) {
          console.log(`   🔴 严重: 理论库存为负数! 卖出多于进货`)
        }

        console.log('')
      }
    } else {
      console.log('✅ 所有产品库存一致\n')
    }

    // 3. 检查销售成本 (COGS)
    console.log('【第三步】检查销售成本 (COGS)')
    console.log('-'.repeat(80))

    let totalCOGS = 0
    let missingCOGS = []

    for (const sale of allSales) {
      if (sale.cost_of_goods_sold && sale.cost_of_goods_sold > 0) {
        totalCOGS += sale.cost_of_goods_sold
      } else {
        missingCOGS.push(sale)
      }
    }

    console.log(`总销售成本 (COGS): $${totalCOGS.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`)
    console.log(`有 COGS 的销售: ${allSales.length - missingCOGS.length} 条`)
    console.log(`缺少 COGS 的销售: ${missingCOGS.length} 条`)

    if (missingCOGS.length > 0) {
      console.log(`\n⚠️  缺少 COGS 的销售记录:`)
      missingCOGS.forEach((sale, i) => {
        if (i < 10) {
          console.log(`   - ID ${sale.id}: ${sale.product_name}, 日期: ${sale.date}, 数量: ${sale.quantity}, 售价: $${sale.unit_price}`)
        }
      })
      if (missingCOGS.length > 10) {
        console.log(`   ... 还有 ${missingCOGS.length - 10} 条`)
      }
    }
    console.log('')

    // 4. 检查损益报表数据
    console.log('【第四步】检查损益报表计算')
    console.log('-'.repeat(80))

    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('*')

    if (expensesError) {
      throw new Error(`查询支出失败: ${expensesError.message}`)
    }

    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)

    console.log(`总收入: $${totalByTotalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`)
    console.log(`总销售成本 (COGS): $${totalCOGS.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`)
    console.log(`总营运支出: $${totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`)
    console.log('')
    console.log(`毛利 (收入 - COGS): $${(totalByTotalAmount - totalCOGS).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`)
    console.log(`毛利率: ${((totalByTotalAmount - totalCOGS) / totalByTotalAmount * 100).toFixed(2)}%`)
    console.log(`净利 (毛利 - 营运支出): $${(totalByTotalAmount - totalCOGS - totalExpenses).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`)
    console.log(`净利率: ${((totalByTotalAmount - totalCOGS - totalExpenses) / totalByTotalAmount * 100).toFixed(2)}%`)
    console.log('')

    // 5. 总结
    console.log('='.repeat(80))
    console.log('【审计总结】')
    console.log('='.repeat(80))
    console.log('')

    console.log(`1️⃣  销售数据:`)
    console.log(`   - 总销售记录: ${allSales.length} 条`)
    console.log(`   - 总销售金额: $${totalByTotalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`)
    console.log(`   - 金额计算一致性: ${Math.abs(totalByUnitPrice - totalByTotalAmount) <= 1 ? '✅' : '❌'}`)
    console.log('')

    console.log(`2️⃣  库存数据:`)
    console.log(`   - 总产品数: ${products.length}`)
    console.log(`   - 有问题的产品: ${problemProducts.length} (${(problemProducts.length / products.length * 100).toFixed(1)}%)`)
    console.log(`   - 库存准确性: ${problemProducts.length === 0 ? '✅' : '❌'}`)
    console.log('')

    console.log(`3️⃣  成本数据:`)
    console.log(`   - 总 COGS: $${totalCOGS.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`)
    console.log(`   - COGS 完整性: ${missingCOGS.length === 0 ? '✅' : `⚠️ (${missingCOGS.length} 条缺失)`}`)
    console.log('')

    console.log(`4️⃣  损益数据:`)
    console.log(`   - 毛利: $${(totalByTotalAmount - totalCOGS).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} (${((totalByTotalAmount - totalCOGS) / totalByTotalAmount * 100).toFixed(2)}%)`)
    console.log(`   - 净利: $${(totalByTotalAmount - totalCOGS - totalExpenses).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} (${((totalByTotalAmount - totalCOGS - totalExpenses) / totalByTotalAmount * 100).toFixed(2)}%)`)
    console.log('')

    if (problemProducts.length > 0 || missingCOGS.length > 0) {
      console.log('🔧 建议执行以下修复:')
      if (problemProducts.length > 0) {
        console.log('   1. 运行: node fix-all-cost-issues.js')
      }
      if (missingCOGS.length > 0) {
        console.log('   2. 运行: node backfill-sales-cogs.js')
      }
    } else {
      console.log('✅ 系统数据完全正确!')
    }

    console.log('')
    console.log('='.repeat(80))

  } catch (error) {
    console.error('审计过程发生错误:', error)
    process.exit(1)
  }
}

completeSystemAudit()
