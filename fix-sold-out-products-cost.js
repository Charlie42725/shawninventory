const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function fixSoldOutProductsCost() {
  console.log('=== 修复售完产品的平均成本 ===\n')
  console.log('目标：从进货记录恢复售完产品的平均成本，用于计算历史销售的 COGS\n')

  try {
    // 1. 找出所有平均成本为0的产品
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('avg_unit_cost', 0)
      .order('id')

    if (productsError) {
      throw new Error(`查询产品失败: ${productsError.message}`)
    }

    console.log(`找到 ${products.length} 个平均成本为0的产品\n`)

    if (products.length === 0) {
      console.log('✅ 所有产品的平均成本都正常！')
      return
    }

    // 2. 为每个产品从进货记录恢复成本
    let successCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const product of products) {
      try {
        // 查询进货记录
        const { data: stockIns, error: stockInsError } = await supabase
          .from('stock_in')
          .select('*')
          .eq('category_id', product.category_id)
          .eq('product_name', product.product_name)
          .order('date', { ascending: true })

        if (stockInsError) {
          throw new Error(`查询进货记录失败: ${stockInsError.message}`)
        }

        // 过滤匹配颜色的进货记录
        const matching = stockIns.filter(s =>
          (product.color === null && (s.color === null || s.color === '')) || s.color === product.color
        )

        if (matching.length === 0) {
          console.log(`⚠️  跳过 ${product.product_name}${product.color ? ` (${product.color})` : ''}: 没有找到进货记录`)
          skippedCount++
          continue
        }

        // 计算加权平均成本
        const totalQty = matching.reduce((sum, s) => sum + s.total_quantity, 0)
        const totalCost = matching.reduce((sum, s) => sum + s.total_cost, 0)
        const avgCost = totalQty > 0 ? totalCost / totalQty : 0

        if (avgCost === 0) {
          console.log(`⚠️  跳过 ${product.product_name}${product.color ? ` (${product.color})` : ''}: 计算出的平均成本为0`)
          skippedCount++
          continue
        }

        // 计算当前库存（从 size_stock 或 total_stock）
        const sizeStock = product.size_stock || {}
        const currentStock = Object.keys(sizeStock).length > 0
          ? Object.values(sizeStock).reduce((sum, qty) => sum + qty, 0)
          : product.total_stock

        // 计算总成本价值
        const totalCostValue = avgCost * currentStock

        console.log(`✅ ${product.product_name}${product.color ? ` (${product.color})` : ''}`)
        console.log(`   进货记录: ${matching.length} 条`)
        console.log(`   总进货: ${totalQty} 个，总成本: $${totalCost.toFixed(2)}`)
        console.log(`   计算平均成本: $${avgCost.toFixed(2)}`)
        console.log(`   当前库存: ${currentStock}`)
        console.log(`   总成本价值: $${totalCostValue.toFixed(2)}`)

        // 更新产品
        const { error: updateError } = await supabase
          .from('products')
          .update({
            avg_unit_cost: avgCost,
            total_cost_value: totalCostValue
          })
          .eq('id', product.id)

        if (updateError) {
          console.error(`   ❌ 更新失败: ${updateError.message}`)
          errorCount++
        } else {
          console.log(`   ✅ 更新成功\n`)
          successCount++
        }

      } catch (error) {
        console.error(`❌ 处理产品 ${product.id} 时发生异常:`, error.message)
        errorCount++
      }
    }

    console.log('\n=== 修复完成 ===')
    console.log(`✅ 成功: ${successCount} 个`)
    console.log(`⚠️  跳过: ${skippedCount} 个`)
    console.log(`❌ 失败: ${errorCount} 个\n`)

    if (successCount > 0) {
      console.log('现在可以运行 backfill-sales-cogs.js 来补充历史销售的 COGS')
    }

  } catch (error) {
    console.error('修复过程发生错误:', error)
    process.exit(1)
  }
}

fixSoldOutProductsCost()
