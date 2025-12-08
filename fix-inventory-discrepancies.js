const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function fixInventoryDiscrepancies() {
  console.log('='.repeat(80))
  console.log('修复库存不一致问题')
  console.log('='.repeat(80))
  console.log('')

  try {
    // 1. 获取所有数据
    const { data: products } = await supabase.from('products').select('*').order('id')
    const { data: sales } = await supabase.from('sales').select('*')
    const { data: stockIns } = await supabase.from('stock_in').select('*')

    console.log(`产品总数: ${products.length}`)
    console.log(`销售记录: ${sales.length}`)
    console.log(`进货记录: ${stockIns.length}\n`)

    const fixes = []

    for (const product of products) {
      const productSales = sales.filter(s => s.product_id === product.id)
      const productStockIns = stockIns.filter(s =>
        s.category_id === product.category_id &&
        s.product_name === product.product_name &&
        ((product.color === null && (s.color === null || s.color === '')) || s.color === product.color)
      )

      const totalStockIn = productStockIns.reduce((sum, s) => sum + (s.total_quantity || 0), 0)
      const totalSold = productSales.reduce((sum, s) => sum + (s.quantity || 0), 0)
      const correctStock = totalStockIn - totalSold

      // 检查是否需要修复
      if (correctStock !== product.total_stock) {
        fixes.push({
          product,
          currentStock: product.total_stock,
          correctStock,
          totalStockIn,
          totalSold,
          difference: product.total_stock - correctStock
        })
      }
    }

    console.log(`需要修复的产品: ${fixes.length} 个\n`)

    if (fixes.length === 0) {
      console.log('✅ 所有库存数据正确!')
      return
    }

    // 显示将要修复的产品
    console.log('将要修复的产品（前20个）:\n')
    for (let i = 0; i < Math.min(20, fixes.length); i++) {
      const fix = fixes[i]
      const p = fix.product

      console.log(`${i + 1}. ${p.product_name}${p.color ? ` (${p.color})` : ''} [ID: ${p.id}]`)
      console.log(`   当前库存: ${fix.currentStock}`)
      console.log(`   正确库存: ${fix.correctStock} (进货${fix.totalStockIn} - 销售${fix.totalSold})`)
      console.log(`   差异: ${fix.difference > 0 ? '+' : ''}${fix.difference}`)
    }

    if (fixes.length > 20) {
      console.log(`\n... 还有 ${fixes.length - 20} 个产品需要修复`)
    }

    console.log('\n' + '-'.repeat(80))
    console.log('开始修复...\n')

    let successCount = 0
    let errorCount = 0

    for (const fix of fixes) {
      try {
        const sizeStock = fix.product.size_stock || {}
        const newTotalStock = fix.correctStock

        // 如果有 size_stock，需要按比例调整
        let newSizeStock = { ...sizeStock }
        if (Object.keys(sizeStock).length > 0) {
          const currentSizeTotal = Object.values(sizeStock).reduce((sum, qty) => sum + qty, 0)

          // 如果目标库存为0，清空所有尺寸
          if (newTotalStock === 0) {
            newSizeStock = {}
          }
          // 如果 size_stock 总和不等于 total_stock，按比例调整
          else if (currentSizeTotal !== fix.currentStock && currentSizeTotal > 0) {
            const ratio = newTotalStock / currentSizeTotal
            for (const size in newSizeStock) {
              newSizeStock[size] = Math.round(newSizeStock[size] * ratio)
            }
            // 确保总和正确（处理四舍五入误差）
            const adjustedTotal = Object.values(newSizeStock).reduce((sum, qty) => sum + qty, 0)
            if (adjustedTotal !== newTotalStock) {
              const firstSize = Object.keys(newSizeStock)[0]
              newSizeStock[firstSize] += (newTotalStock - adjustedTotal)
            }
          }
        }

        // 计算新的总成本价值
        const newTotalCostValue = fix.product.avg_unit_cost * newTotalStock

        const { error } = await supabase
          .from('products')
          .update({
            total_stock: newTotalStock,
            size_stock: newSizeStock,
            total_cost_value: newTotalCostValue
          })
          .eq('id', fix.product.id)

        if (error) {
          console.error(`❌ 修复产品 ${fix.product.id} 失败:`, error.message)
          errorCount++
        } else {
          successCount++
          if (successCount % 10 === 0) {
            console.log(`已修复 ${successCount} 个产品...`)
          }
        }
      } catch (error) {
        console.error(`❌ 修复产品 ${fix.product.id} 时发生异常:`, error.message)
        errorCount++
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('修复完成!')
    console.log('='.repeat(80))
    console.log(`✅ 成功: ${successCount} 个`)
    console.log(`❌ 失败: ${errorCount} 个\n`)

    // 验证修复结果
    console.log('验证修复结果...\n')

    const { data: verifyProducts } = await supabase.from('products').select('*').order('id')

    let stillHaveIssues = 0
    for (const product of verifyProducts) {
      const productSales = sales.filter(s => s.product_id === product.id)
      const productStockIns = stockIns.filter(s =>
        s.category_id === product.category_id &&
        s.product_name === product.product_name &&
        ((product.color === null && (s.color === null || s.color === '')) || s.color === product.color)
      )

      const totalStockIn = productStockIns.reduce((sum, s) => sum + (s.total_quantity || 0), 0)
      const totalSold = productSales.reduce((sum, s) => sum + (s.quantity || 0), 0)
      const correctStock = totalStockIn - totalSold

      if (correctStock !== product.total_stock) {
        stillHaveIssues++
      }
    }

    if (stillHaveIssues === 0) {
      console.log('✅ 所有库存数据已修复!')
    } else {
      console.log(`⚠️  仍有 ${stillHaveIssues} 个产品库存不一致`)
      console.log('建议运行: node complete-system-audit.js 查看详情')
    }

  } catch (error) {
    console.error('修复过程发生错误:', error)
    process.exit(1)
  }
}

fixInventoryDiscrepancies()
