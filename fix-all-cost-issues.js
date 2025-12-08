const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function fixAllCostIssues() {
  console.log('=== 全面修复成本和库存问题 ===\n')

  try {
    // 1. 获取所有产品
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .order('id')

    console.log(`找到 ${products.length} 个产品\n`)

    const fixes = []

    for (const product of products) {
      const issues = []
      const updates = {}

      // 检查1: size_stock 和 total_stock 是否一致
      const sizeStock = product.size_stock || {}
      const calculatedTotal = Object.values(sizeStock).reduce((sum, qty) => sum + qty, 0)

      // 对于有 size_stock 的产品，total_stock 应该等于 size_stock 的总和
      if (Object.keys(sizeStock).length > 0 && calculatedTotal !== product.total_stock) {
        issues.push(`库存不一致: size_stock总和=${calculatedTotal}, total_stock=${product.total_stock}`)
        updates.total_stock = calculatedTotal
      }

      // 检查2: 有库存但成本为0 - 需要从进货记录重新计算
      const actualStock = Object.keys(sizeStock).length > 0 ? calculatedTotal : product.total_stock
      if (actualStock > 0 && product.avg_unit_cost === 0) {
        issues.push(`有库存(${actualStock})但成本为0`)

        // 从进货记录重新计算成本
        const { data: stockIns } = await supabase
          .from('stock_in')
          .select('*')
          .eq('category_id', product.category_id)
          .eq('product_name', product.product_name)

        if (stockIns && stockIns.length > 0) {
          const matching = stockIns.filter(s =>
            (product.color === null && (s.color === null || s.color === '')) || s.color === product.color
          )

          if (matching.length > 0) {
            const totalQty = matching.reduce((sum, s) => sum + s.total_quantity, 0)
            const totalCost = matching.reduce((sum, s) => sum + s.total_cost, 0)
            const avgCost = totalQty > 0 ? totalCost / totalQty : 0

            if (avgCost > 0) {
              updates.avg_unit_cost = avgCost
              updates.total_cost_value = avgCost * (updates.total_stock ?? product.total_stock)
              issues.push(`从进货记录恢复成本: $${avgCost.toFixed(2)}`)
            }
          }
        }
      }

      // 检查3: total_cost_value 和 avg_unit_cost * total_stock 不一致
      const finalStock = updates.total_stock ?? (Object.keys(sizeStock).length > 0 ? calculatedTotal : product.total_stock)
      const finalAvgCost = updates.avg_unit_cost ?? product.avg_unit_cost
      const expectedTotalCost = finalAvgCost * finalStock
      const currentTotalCost = updates.total_cost_value ?? product.total_cost_value
      const diff = Math.abs(currentTotalCost - expectedTotalCost)

      if (diff > 0.01) {
        issues.push(`总成本价值不一致: 当前=${currentTotalCost.toFixed(2)}, 预期=${expectedTotalCost.toFixed(2)}`)
        updates.total_cost_value = expectedTotalCost
      }

      // 检查4: 售完但成本不为0（这是正常的，保留用于损益计算）
      if (finalStock === 0 && finalAvgCost > 0) {
        // 售完时应该保持 avg_unit_cost，但 total_cost_value 应该为 0
        if (Math.abs(currentTotalCost) > 0.01) {
          issues.push(`售完但total_cost_value不为0: $${currentTotalCost.toFixed(2)}`)
          updates.total_cost_value = 0
        }
      }

      if (issues.length > 0) {
        fixes.push({
          product,
          issues,
          updates
        })
      }
    }

    console.log(`发现 ${fixes.length} 个产品需要修复\n`)

    if (fixes.length === 0) {
      console.log('✅ 所有产品数据都正常！')
      return
    }

    // 显示前10个需要修复的产品
    console.log('=== 需要修复的产品（前10个）===\n')
    for (let i = 0; i < Math.min(10, fixes.length); i++) {
      const { product, issues, updates } = fixes[i]
      console.log(`${i + 1}. ${product.product_name}${product.color ? ` (${product.color})` : ''} [ID: ${product.id}]`)
      console.log(`   问题:`)
      issues.forEach(issue => console.log(`     - ${issue}`))
      console.log(`   修复:`)
      Object.entries(updates).forEach(([key, value]) => {
        if (typeof value === 'number') {
          console.log(`     ${key}: ${product[key]} → ${typeof value === 'number' ? value.toFixed(2) : value}`)
        } else {
          console.log(`     ${key}: ${product[key]} → ${value}`)
        }
      })
      console.log('')
    }

    // 询问是否执行修复
    console.log(`\n准备修复 ${fixes.length} 个产品`)
    console.log('执行修复? (这将自动执行)\n')

    // 执行修复
    let successCount = 0
    let errorCount = 0

    for (const { product, updates } of fixes) {
      try {
        const { error } = await supabase
          .from('products')
          .update(updates)
          .eq('id', product.id)

        if (error) {
          console.error(`❌ 修复产品 ${product.id} 失败:`, error.message)
          errorCount++
        } else {
          successCount++
        }
      } catch (error) {
        console.error(`❌ 修复产品 ${product.id} 时发生异常:`, error.message)
        errorCount++
      }
    }

    console.log('\n=== 修复完成 ===')
    console.log(`✅ 成功: ${successCount} 个`)
    console.log(`❌ 失败: ${errorCount} 个`)

    // 验证修复结果
    console.log('\n=== 验证修复结果 ===')
    const { data: verifyProducts } = await supabase
      .from('products')
      .select('*')

    const stillHaveIssues = []
    for (const product of verifyProducts) {
      const sizeStock = product.size_stock || {}
      const calculatedTotal = Object.values(sizeStock).reduce((sum, qty) => sum + qty, 0)

      if (calculatedTotal !== product.total_stock) {
        stillHaveIssues.push({ product, issue: '库存不一致' })
      }

      if (calculatedTotal > 0 && product.avg_unit_cost === 0) {
        stillHaveIssues.push({ product, issue: '有库存但成本为0' })
      }
    }

    if (stillHaveIssues.length === 0) {
      console.log('✅ 所有问题已修复！')
    } else {
      console.log(`⚠️  仍有 ${stillHaveIssues.length} 个产品存在问题:`)
      stillHaveIssues.slice(0, 5).forEach(({ product, issue }) => {
        console.log(`  - ${product.product_name}: ${issue}`)
      })
    }

  } catch (error) {
    console.error('修复过程发生错误:', error)
    process.exit(1)
  }
}

fixAllCostIssues()
