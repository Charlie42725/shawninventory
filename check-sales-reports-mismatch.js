const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSalesReportsMismatch() {
  console.log('='.repeat(80))
  console.log('检查销售金额与损益报表不一致问题')
  console.log('='.repeat(80))
  console.log('')

  try {
    // 1. 获取所有销售记录
    const { data: allSales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .order('date', { ascending: true })

    if (salesError) {
      throw new Error(`查询销售记录失败: ${salesError.message}`)
    }

    console.log('【第一步】检查所有销售记录')
    console.log('-'.repeat(80))
    console.log(`总销售记录数: ${allSales.length} 条\n`)

    // 计算总销售额
    let totalSales = 0
    let salesByDate = {}

    for (const sale of allSales) {
      const amount = sale.total_amount || (sale.unit_price * sale.quantity)
      totalSales += amount

      const date = sale.date || sale.created_at.split('T')[0]
      if (!salesByDate[date]) {
        salesByDate[date] = []
      }
      salesByDate[date].push({ ...sale, calculated_amount: amount })
    }

    console.log(`所有销售总额: $${totalSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`)
    console.log(`日期范围: ${allSales[0]?.date} ~ ${allSales[allSales.length - 1]?.date}\n`)

    // 2. 按日期显示销售
    console.log('【第二步】按日期分组的销售')
    console.log('-'.repeat(80))

    const sortedDates = Object.keys(salesByDate).sort()
    let runningTotal = 0

    for (const date of sortedDates) {
      const daySales = salesByDate[date]
      const dayTotal = daySales.reduce((sum, s) => sum + s.calculated_amount, 0)
      runningTotal += dayTotal

      console.log(`${date}: ${daySales.length} 笔, $${dayTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} (累计: $${runningTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})})`)

      // 显示该日期的销售详情
      daySales.forEach(s => {
        console.log(`  - ID ${s.id}: ${s.product_name}, ${s.quantity}个 × $${s.unit_price} = $${s.calculated_amount.toFixed(2)}`)
      })
    }

    console.log('\n' + '-'.repeat(80))
    console.log(`总计: $${totalSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n`)

    // 3. 检查损益报表 API 会如何计算
    console.log('【第三步】模拟损益报表 API 计算')
    console.log('-'.repeat(80))

    // 检查最近1个月的数据（默认）
    const now = new Date()
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(now.getMonth() - 1)
    const startDate = oneMonthAgo.toISOString()

    console.log(`损益报表默认日期范围: ${oneMonthAgo.toISOString().split('T')[0]} ~ ${now.toISOString().split('T')[0]}\n`)

    const recentSales = allSales.filter(s => {
      const saleDate = new Date(s.date || s.created_at)
      return saleDate >= oneMonthAgo
    })

    const recentTotal = recentSales.reduce((sum, s) => sum + (s.total_amount || (s.unit_price * s.quantity)), 0)

    console.log(`最近1个月销售记录: ${recentSales.length} 条`)
    console.log(`最近1个月销售总额: $${recentTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n`)

    // 4. 检查是否有日期为空或异常的销售
    console.log('【第四步】检查异常销售记录')
    console.log('-'.repeat(80))

    const noDateSales = allSales.filter(s => !s.date)
    const futureSales = allSales.filter(s => new Date(s.date) > now)
    const oldSales = allSales.filter(s => {
      const saleDate = new Date(s.date || s.created_at)
      return saleDate < oneMonthAgo
    })

    console.log(`没有日期的销售: ${noDateSales.length} 条`)
    if (noDateSales.length > 0) {
      console.log('详情:')
      noDateSales.forEach(s => {
        console.log(`  - ID ${s.id}: ${s.product_name}, $${s.total_amount}`)
      })
    }

    console.log(`\n未来日期的销售: ${futureSales.length} 条`)
    if (futureSales.length > 0) {
      console.log('详情:')
      futureSales.forEach(s => {
        console.log(`  - ID ${s.id}: ${s.date}, ${s.product_name}, $${s.total_amount}`)
      })
    }

    console.log(`\n超过1个月的旧销售: ${oldSales.length} 条`)
    const oldTotal = oldSales.reduce((sum, s) => sum + (s.total_amount || (s.unit_price * s.quantity)), 0)
    console.log(`旧销售总额: $${oldTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n`)

    // 5. 分析差异
    console.log('【第五步】差异分析')
    console.log('-'.repeat(80))

    const userReportedTotal = 877010
    const actualTotal = totalSales
    const difference = actualTotal - userReportedTotal

    console.log(`用户看到的损益报表总额: $${userReportedTotal.toLocaleString()}`)
    console.log(`数据库实际总销售额: $${actualTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`)
    console.log(`差异: $${difference.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n`)

    if (Math.abs(difference - oldTotal) < 1) {
      console.log('🔍 发现原因: 损益报表只显示最近1个月的数据!')
      console.log(`旧销售总额 ($${oldTotal.toLocaleString()}) 约等于差异 ($${difference.toLocaleString()})`)
      console.log('\n解决方案: 损益报表应该显示所有时间的数据，或者明确标注日期范围')
    } else if (Math.abs(difference - recentTotal) < 1) {
      console.log('🔍 发现原因: 可能有日期筛选问题')
    } else {
      console.log('🔍 需要进一步调查差异原因')
      console.log('\n可能的原因:')
      console.log('1. 损益报表使用了日期筛选')
      console.log('2. 某些销售记录没有被包含在报表中')
      console.log('3. 前端显示的数据与后端不一致')
    }

    console.log('\n' + '='.repeat(80))
    console.log('建议:')
    console.log('1. 检查损益报表页面的日期筛选设置')
    console.log('2. 如果要显示所有销售，需要修改报表的日期范围')
    console.log('3. 或者在报表上明确显示当前的日期范围')
    console.log('='.repeat(80))

  } catch (error) {
    console.error('检查过程发生错误:', error)
    process.exit(1)
  }
}

checkSalesReportsMismatch()
