const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugProduct() {
  console.log('=== 调试产品 ID: 3 (Labubu組合B) ===\n')

  try {
    // 查询产品信息
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', 3)
      .single()

    console.log('产品当前状态:')
    console.log(JSON.stringify(product, null, 2))

    // 查询所有进货记录
    console.log('\n\n=== 进货记录 ===')
    const { data: stockIns } = await supabase
      .from('stock_in')
      .select('*')
      .eq('category_id', product.category_id)
      .eq('product_name', product.product_name)
      .order('date', { ascending: true })

    if (stockIns && stockIns.length > 0) {
      const matching = stockIns.filter(s =>
        (product.color === null && (s.color === null || s.color === '')) || s.color === product.color
      )

      console.log(`找到 ${matching.length} 条进货记录:\n`)
      matching.forEach((s, i) => {
        console.log(`${i + 1}. 日期: ${s.date}`)
        console.log(`   数量: ${s.total_quantity}`)
        console.log(`   单价: $${s.unit_cost}`)
        console.log(`   总成本: $${s.total_cost}`)
        console.log(`   尺寸: ${JSON.stringify(s.size_quantities)}`)
        console.log('')
      })

      // 计算理论成本
      const totalQty = matching.reduce((sum, s) => sum + s.total_quantity, 0)
      const totalCost = matching.reduce((sum, s) => sum + s.total_cost, 0)
      const avgCost = totalQty > 0 ? totalCost / totalQty : 0
      console.log(`进货总计:`)
      console.log(`  总数量: ${totalQty}`)
      console.log(`  总成本: $${totalCost}`)
      console.log(`  理论平均成本: $${avgCost.toFixed(2)}`)
    } else {
      console.log('没有找到进货记录')
    }

    // 查询所有销售记录
    console.log('\n\n=== 销售记录 ===')
    const { data: sales } = await supabase
      .from('sales')
      .select('*')
      .eq('product_id', 3)
      .order('date', { ascending: true })

    if (sales && sales.length > 0) {
      console.log(`找到 ${sales.length} 条销售记录:\n`)
      sales.forEach((s, i) => {
        console.log(`${i + 1}. 日期: ${s.date}`)
        console.log(`   数量: ${s.quantity}`)
        console.log(`   售价: $${s.unit_price}`)
        console.log(`   尺寸: ${s.size || '无'}`)
        console.log(`   创建时间: ${s.created_at}`)
        console.log('')
      })

      const totalSold = sales.reduce((sum, s) => sum + s.quantity, 0)
      console.log(`销售总计: ${totalSold} 个`)
    } else {
      console.log('没有找到销售记录')
    }

    // 查询库存异动记录
    console.log('\n\n=== 库存异动记录 ===')
    const { data: movements } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('product_id', 3)
      .order('created_at', { ascending: true })

    if (movements && movements.length > 0) {
      console.log(`找到 ${movements.length} 条异动记录:\n`)
      movements.forEach((m, i) => {
        console.log(`${i + 1}. ${m.created_at.split('T')[0]} - ${m.movement_type}`)
        console.log(`   数量变化: ${m.quantity}`)
        console.log(`   库存: ${m.previous_total} → ${m.current_total}`)
        console.log(`   备注: ${m.note}`)
        console.log('')
      })
    } else {
      console.log('没有找到异动记录')
    }

    // 分析问题
    console.log('\n\n=== 问题分析 ===')
    if (product.total_stock > 0 && product.avg_unit_cost === 0) {
      console.log('🔴 确认问题：产品有库存但平均成本为0')
      console.log('\n可能的原因：')
      console.log('1. 进货记录丢失或未正确关联')
      console.log('2. 之前的成本计算逻辑有误')
      console.log('3. 售完后又补货，但补货时成本计算错误')
      console.log('4. 手动调整数据时出错')
    }

  } catch (error) {
    console.error('调试过程发生错误:', error)
    process.exit(1)
  }
}

debugProduct()
