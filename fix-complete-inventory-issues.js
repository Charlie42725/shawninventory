const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function fixCompleteInventoryIssues() {
  console.log('=== 完整修复库存和成本问题 ===\n')

  try {
    // 1. 修复产品 ID 84 (LabubuA組合)
    console.log('修复 LabubuA組合 (ID: 84)...')
    const labubuA = {
      id: 84,
      stockIns: [
        { qty: 3, cost: 9900 },
        { qty: 27, cost: 81000 }
      ],
      currentSizeStock: { default: 27 }
    }

    const labubuA_totalQty = labubuA.stockIns.reduce((sum, s) => sum + s.qty, 0)
    const labubuA_totalCost = labubuA.stockIns.reduce((sum, s) => sum + s.cost, 0)
    const labubuA_avgCost = labubuA_totalCost / labubuA_totalQty
    const labubuA_currentStock = Object.values(labubuA.currentSizeStock).reduce((sum, qty) => sum + qty, 0)
    const labubuA_totalCostValue = labubuA_avgCost * labubuA_currentStock

    console.log(`  进货总计: ${labubuA_totalQty} 个, 总成本: $${labubuA_totalCost}`)
    console.log(`  平均成本: $${labubuA_avgCost.toFixed(2)}`)
    console.log(`  当前库存: ${labubuA_currentStock}`)
    console.log(`  总成本价值: $${labubuA_totalCostValue.toFixed(2)}`)

    const { error: errorA } = await supabase
      .from('products')
      .update({
        total_stock: labubuA_currentStock,
        avg_unit_cost: labubuA_avgCost,
        total_cost_value: labubuA_totalCostValue
      })
      .eq('id', 84)

    if (errorA) {
      console.error(`  ❌ 更新失败:`, errorA.message)
    } else {
      console.log(`  ✅ 更新成功\n`)
    }

    // 2. 修复产品 ID 85 (LabubuB組合)
    console.log('修复 LabubuB組合 (ID: 85)...')
    const labubuB = {
      id: 85,
      stockIns: [
        { qty: 3, cost: 9900 },
        { qty: 28, cost: 95000.08 }
      ],
      currentSizeStock: { default: 28 }
    }

    const labubuB_totalQty = labubuB.stockIns.reduce((sum, s) => sum + s.qty, 0)
    const labubuB_totalCost = labubuB.stockIns.reduce((sum, s) => sum + s.cost, 0)
    const labubuB_avgCost = labubuB_totalCost / labubuB_totalQty
    const labubuB_currentStock = Object.values(labubuB.currentSizeStock).reduce((sum, qty) => sum + qty, 0)
    const labubuB_totalCostValue = labubuB_avgCost * labubuB_currentStock

    console.log(`  进货总计: ${labubuB_totalQty} 个, 总成本: $${labubuB_totalCost}`)
    console.log(`  平均成本: $${labubuB_avgCost.toFixed(2)}`)
    console.log(`  当前库存: ${labubuB_currentStock}`)
    console.log(`  总成本价值: $${labubuB_totalCostValue.toFixed(2)}`)

    const { error: errorB } = await supabase
      .from('products')
      .update({
        total_stock: labubuB_currentStock,
        avg_unit_cost: labubuB_avgCost,
        total_cost_value: labubuB_totalCostValue
      })
      .eq('id', 85)

    if (errorB) {
      console.error(`  ❌ 更新失败:`, errorB.message)
    } else {
      console.log(`  ✅ 更新成功\n`)
    }

    // 3. 修复产品 ID 3 (Labubu組合B) - 没有进货记录，需要从销售推算
    console.log('修复 Labubu組合B (ID: 3)...')
    console.log('  ⚠️  该产品没有进货记录')
    console.log('  建议手动在系统中补充进货记录，或设置一个估算成本\n')

    // 4. 验证修复
    console.log('=== 验证修复结果 ===\n')
    const { data: verifyProducts } = await supabase
      .from('products')
      .select('*')
      .in('id', [84, 85])

    for (const p of verifyProducts) {
      const sizeStock = p.size_stock || {}
      const calculatedTotal = Object.values(sizeStock).reduce((sum, qty) => sum + qty, 0)

      console.log(`${p.product_name} (ID: ${p.id}):`)
      console.log(`  total_stock: ${p.total_stock}`)
      console.log(`  size_stock总和: ${calculatedTotal}`)
      console.log(`  avg_unit_cost: $${p.avg_unit_cost}`)
      console.log(`  total_cost_value: $${p.total_cost_value}`)
      console.log(`  一致性: ${calculatedTotal === p.total_stock ? '✅' : '❌'}`)
      console.log(`  成本正确: ${p.avg_unit_cost > 0 ? '✅' : '❌'}\n`)
    }

    console.log('=== 修复完成 ===')
    console.log('现在可以运行以下命令补充历史销售的 COGS:')
    console.log('  node backfill-sales-cogs.js')

  } catch (error) {
    console.error('修复过程发生错误:', error)
    process.exit(1)
  }
}

fixCompleteInventoryIssues()
