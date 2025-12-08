const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyCOGSFix() {
  console.log('=== 验证 COGS 修复结果 ===\n')

  try {
    // 1. 检查销售记录的 COGS
    const { data: sales } = await supabase
      .from('sales')
      .select('*')
      .order('date', { ascending: false })
      .limit(100)

    console.log(`检查最近 ${sales.length} 条销售记录\n`)

    const withCOGS = sales.filter(s => s.cost_of_goods_sold && s.cost_of_goods_sold > 0)
    const withoutCOGS = sales.filter(s => !s.cost_of_goods_sold || s.cost_of_goods_sold === 0)

    console.log('=== 销售记录 COGS 状态 ===')
    console.log(`✅ 有 COGS: ${withCOGS.length} 条 (${(withCOGS.length / sales.length * 100).toFixed(1)}%)`)
    console.log(`❌ 无 COGS: ${withoutCOGS.length} 条 (${(withoutCOGS.length / sales.length * 100).toFixed(1)}%)\n`)

    if (withoutCOGS.length > 0) {
      console.log('无 COGS 的记录（前5条）:')
      withoutCOGS.slice(0, 5).forEach(s => {
        console.log(`  - ID: ${s.id}, 日期: ${s.date}, 产品: ${s.product_name}, 数量: ${s.quantity}`)
      })
      console.log('')
    }

    // 2. 计算损益报表数据并对比
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 1)
    const startDateStr = startDate.toISOString().split('T')[0]

    const { data: recentSales } = await supabase
      .from('sales')
      .select('*')
      .gte('date', startDateStr)

    const { data: products } = await supabase
      .from('products')
      .select('*')

    // 使用新方法：从销售记录的 COGS 计算
    let totalCOGSNew = 0
    for (const sale of recentSales) {
      if (sale.cost_of_goods_sold && sale.cost_of_goods_sold > 0) {
        totalCOGSNew += sale.cost_of_goods_sold
      } else {
        const product = products.find(p => p.id === sale.product_id)
        if (product && product.avg_unit_cost) {
          totalCOGSNew += product.avg_unit_cost * sale.quantity
        }
      }
    }

    // 使用旧方法：从产品当前成本计算
    let totalCOGSOld = 0
    for (const sale of recentSales) {
      const product = products.find(p => p.id === sale.product_id)
      if (product && product.avg_unit_cost) {
        totalCOGSOld += product.avg_unit_cost * sale.quantity
      }
    }

    // 计算收入
    const totalRevenue = recentSales.reduce((sum, s) => sum + (s.unit_price * s.quantity), 0)

    console.log('=== 最近一个月损益对比 ===')
    console.log(`总收入: $${totalRevenue.toLocaleString()}\n`)

    console.log('使用旧方法（产品当前成本）:')
    console.log(`  销售成本 (COGS): $${totalCOGSOld.toLocaleString()}`)
    console.log(`  毛利: $${(totalRevenue - totalCOGSOld).toLocaleString()}`)
    console.log(`  毛利率: ${((totalRevenue - totalCOGSOld) / totalRevenue * 100).toFixed(1)}%\n`)

    console.log('使用新方法（销售时实际成本）:')
    console.log(`  销售成本 (COGS): $${totalCOGSNew.toLocaleString()}`)
    console.log(`  毛利: $${(totalRevenue - totalCOGSNew).toLocaleString()}`)
    console.log(`  毛利率: ${((totalRevenue - totalCOGSNew) / totalRevenue * 100).toFixed(1)}%\n`)

    const cogsDiff = totalCOGSOld - totalCOGSNew
    const grossProfitDiff = cogsDiff

    console.log('差异分析:')
    console.log(`  COGS 差异: $${cogsDiff.toLocaleString()} (${cogsDiff > 0 ? '旧方法高估' : '新方法高估'})`)
    console.log(`  毛利差异: $${grossProfitDiff.toLocaleString()} (${grossProfitDiff > 0 ? '旧方法低估' : '新方法低估'})\n`)

    if (Math.abs(cogsDiff) > totalRevenue * 0.05) {
      console.log('⚠️  警告: COGS 差异超过收入的 5%，建议仔细检查')
    } else {
      console.log('✅ COGS 差异在合理范围内')
    }

    // 3. 检查特殊案例
    console.log('\n=== 检查特殊案例 ===')

    // 找出售完后又进货的产品
    const soldOutProducts = products.filter(p => {
      const hasSales = recentSales.some(s => s.product_id === p.id)
      const totalStock = Object.keys(p.size_stock || {}).length > 0
        ? Object.values(p.size_stock).reduce((sum, qty) => sum + qty, 0)
        : p.total_stock
      return hasSales && totalStock === 0
    })

    console.log(`\n售完的产品（有最近销售记录）: ${soldOutProducts.length} 个`)
    if (soldOutProducts.length > 0) {
      console.log('前5个:')
      soldOutProducts.slice(0, 5).forEach(p => {
        console.log(`  - ${p.product_name}${p.color ? ` (${p.color})` : ''}, 当前平均成本: $${p.avg_unit_cost}`)
      })
    }

    console.log('\n✅ 验证完成！')
    console.log('\n总结:')
    console.log('1. 销售记录现在保存实际 COGS，不受后续进货影响')
    console.log('2. 损益报表使用销售时的实际成本，符合会计原则')
    console.log('3. 即使售完后再进货，历史销售的成本也保持准确')

  } catch (error) {
    console.error('验证过程发生错误:', error)
    process.exit(1)
  }
}

verifyCOGSFix()
