const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function fixColorMatchingEverywhere() {
  console.log('='.repeat(80))
  console.log('统一所有表的颜色字段：将空字符串转为 null')
  console.log('='.repeat(80))
  console.log('')

  try {
    // 1. 修复产品表
    console.log('【第一步】修复产品表的颜色字段')
    console.log('-'.repeat(80))

    const { data: productsToFix } = await supabase
      .from('products')
      .select('id, product_name, color')
      .eq('color', '')

    console.log(`找到 ${productsToFix.length} 个产品的 color = '' (空字符串)\n`)

    if (productsToFix.length > 0) {
      for (const p of productsToFix) {
        console.log(`修复产品 ID ${p.id}: ${p.product_name}`)
        const { error } = await supabase
          .from('products')
          .update({ color: null })
          .eq('id', p.id)

        if (error) {
          console.error(`  ❌ 失败: ${error.message}`)
        } else {
          console.log(`  ✅ 成功: color '' → null`)
        }
      }
      console.log('')
    }

    // 2. 验证修复
    console.log('【第二步】验证修复结果')
    console.log('-'.repeat(80))

    const { data: allProducts } = await supabase
      .from('products')
      .select('id, product_name, color')

    let nullCount = 0
    let emptyCount = 0
    let hasValueCount = 0

    for (const p of allProducts) {
      if (p.color === null || p.color === undefined) {
        nullCount++
      } else if (p.color === '') {
        emptyCount++
      } else {
        hasValueCount++
      }
    }

    console.log(`产品表颜色字段统计:`)
    console.log(`  null/undefined: ${nullCount}`)
    console.log(`  空字符串: ${emptyCount}`)
    console.log(`  有值: ${hasValueCount}\n`)

    if (emptyCount > 0) {
      console.log(`⚠️  仍有 ${emptyCount} 个产品的 color 为空字符串`)
    } else {
      console.log(`✅ 所有产品的 color 已统一为 null 或有值`)
    }

    // 3. 重新测试哈利波特的匹配
    console.log('\n【第三步】重新测试哈利波特的匹配')
    console.log('-'.repeat(80))

    const { data: harryProduct } = await supabase
      .from('products')
      .select('*')
      .eq('id', 12)
      .single()

    const { data: harryStockIns } = await supabase
      .from('stock_in')
      .select('*')
      .eq('category_id', harryProduct.category_id)
      .eq('product_name', harryProduct.product_name)

    const normalizeColor = (color) => (color === null || color === '' || color === undefined) ? null : color

    const matching = harryStockIns.filter(s =>
      normalizeColor(s.color) === normalizeColor(harryProduct.color)
    )

    console.log(`哈利波特400% (ID: 12)`)
    console.log(`  产品 color: ${JSON.stringify(harryProduct.color)}`)
    console.log(`  进货记录总数: ${harryStockIns.length}`)
    console.log(`  匹配的进货: ${matching.length} 条`)
    console.log(`  匹配结果: ${matching.length === harryStockIns.length ? '✅ 全部匹配' : '❌ 部分失败'}\n`)

    if (matching.length > 0) {
      const totalQty = matching.reduce((sum, s) => sum + s.total_quantity, 0)
      const totalCost = matching.reduce((sum, s) => sum + s.total_cost, 0)
      const avgCost = totalCost / totalQty

      console.log(`  进货总数: ${totalQty}`)
      console.log(`  总成本: $${totalCost}`)
      console.log(`  平均成本: $${avgCost.toFixed(2)}`)

      // 更新产品成本
      console.log(`\n  更新产品成本...`)
      const { error } = await supabase
        .from('products')
        .update({
          avg_unit_cost: avgCost,
          total_cost_value: avgCost * harryProduct.total_stock
        })
        .eq('id', 12)

      if (error) {
        console.log(`  ❌ 更新失败: ${error.message}`)
      } else {
        console.log(`  ✅ 成本已更新`)
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('修复完成！')
    console.log('建议运行以下脚本重新计算所有产品的成本:')
    console.log('  node fix-all-cost-issues.js')
    console.log('  node backfill-sales-cogs.js')
    console.log('='.repeat(80))

  } catch (error) {
    console.error('修复过程发生错误:', error)
    process.exit(1)
  }
}

fixColorMatchingEverywhere()
