const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCostAfterSale() {
  console.log('=== 检查售出后产品的成本状态 ===\n')

  try {
    // 1. 查找所有有销售记录的产品
    const { data: sales } = await supabase
      .from('sales')
      .select('product_id')
      .order('created_at', { ascending: false })
      .limit(100)

    const productIds = [...new Set(sales.map(s => s.product_id))]
    console.log(`找到 ${productIds.length} 个有销售记录的产品\n`)

    // 2. 查询这些产品的当前成本状态
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)
      .order('id')

    // 分类统计
    const soldOutWithZeroCost = []
    const soldOutWithNonZeroCost = []
    const inStockWithZeroCost = []
    const inStockWithInconsistentCost = []

    for (const product of products) {
      const expectedTotalCost = product.avg_unit_cost * product.total_stock
      const diff = Math.abs(product.total_cost_value - expectedTotalCost)

      if (product.total_stock === 0) {
        if (product.avg_unit_cost === 0) {
          soldOutWithZeroCost.push(product)
        } else {
          soldOutWithNonZeroCost.push(product)
        }
      } else {
        if (product.avg_unit_cost === 0) {
          inStockWithZeroCost.push(product)
        } else if (diff > 0.01) {
          inStockWithInconsistentCost.push({ ...product, diff })
        }
      }
    }

    console.log('=== 统计结果 ===\n')
    console.log(`✅ 售完且成本为0 (正常): ${soldOutWithZeroCost.length} 个`)
    console.log(`⚠️  售完但成本不为0 (异常): ${soldOutWithNonZeroCost.length} 个`)
    console.log(`🔴 有库存但平均成本为0 (严重问题): ${inStockWithZeroCost.length} 个`)
    console.log(`⚠️  有库存但total_cost_value不一致: ${inStockWithInconsistentCost.length} 个\n`)

    // 显示问题详情
    if (inStockWithZeroCost.length > 0) {
      console.log('\n🔴 严重问题：有库存但平均成本为0的产品\n')
      console.log('这些产品有库存但平均成本是0，这会导致损益表成本计算错误！\n')

      for (let i = 0; i < Math.min(5, inStockWithZeroCost.length); i++) {
        const p = inStockWithZeroCost[i]
        console.log(`${i + 1}. ${p.product_name}${p.color ? ` (${p.color})` : ''}`)
        console.log(`   ID: ${p.id}`)
        console.log(`   库存: ${p.total_stock}`)
        console.log(`   平均成本: $${p.avg_unit_cost}`)
        console.log(`   总成本价值: $${p.total_cost_value}`)

        // 查询最近的销售记录
        const { data: recentSales } = await supabase
          .from('sales')
          .select('*')
          .eq('product_id', p.id)
          .order('created_at', { ascending: false })
          .limit(3)

        if (recentSales && recentSales.length > 0) {
          console.log(`   最近销售:`)
          recentSales.forEach(s => {
            console.log(`     - ${s.date}: 售出 ${s.quantity} 个`)
          })
        }

        // 查询进货记录
        const { data: stockIns } = await supabase
          .from('stock_in')
          .select('*')
          .eq('category_id', p.category_id)
          .eq('product_name', p.product_name)
          .order('date', { ascending: false })
          .limit(2)

        if (stockIns && stockIns.length > 0) {
          const matching = stockIns.filter(s =>
            (p.color === null && (s.color === null || s.color === '')) || s.color === p.color
          )
          if (matching.length > 0) {
            console.log(`   最近进货:`)
            matching.forEach(s => {
              console.log(`     - ${s.date}: 进货 ${s.total_quantity} 个, 单价 $${s.unit_cost}`)
            })
          }
        }
        console.log('')
      }
    }

    if (soldOutWithNonZeroCost.length > 0) {
      console.log('\n⚠️  售完但成本不为0的产品（前5个）\n')
      for (let i = 0; i < Math.min(5, soldOutWithNonZeroCost.length); i++) {
        const p = soldOutWithNonZeroCost[i]
        console.log(`${i + 1}. ${p.product_name}${p.color ? ` (${p.color})` : ''}`)
        console.log(`   库存: ${p.total_stock}`)
        console.log(`   平均成本: $${p.avg_unit_cost}`)
        console.log(`   总成本价值: $${p.total_cost_value}`)
        console.log('')
      }
    }

    if (inStockWithInconsistentCost.length > 0) {
      console.log('\n⚠️  成本不一致的产品（前5个）\n')
      for (let i = 0; i < Math.min(5, inStockWithInconsistentCost.length); i++) {
        const p = inStockWithInconsistentCost[i]
        console.log(`${i + 1}. ${p.product_name}${p.color ? ` (${p.color})` : ''}`)
        console.log(`   库存: ${p.total_stock}`)
        console.log(`   平均成本: $${p.avg_unit_cost}`)
        console.log(`   总成本价值: $${p.total_cost_value}`)
        console.log(`   预期总成本: $${(p.avg_unit_cost * p.total_stock).toFixed(2)}`)
        console.log(`   差异: $${p.diff.toFixed(2)}`)
        console.log('')
      }
    }

  } catch (error) {
    console.error('检查过程发生错误:', error)
    process.exit(1)
  }
}

checkCostAfterSale()
