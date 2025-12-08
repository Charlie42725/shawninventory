const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugZeroCostProducts() {
  console.log('=== 调试平均成本为0的产品 ===\n')

  try {
    // 查询成本为0的产品
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('avg_unit_cost', 0)
      .order('id')

    console.log(`找到 ${products.length} 个产品:\n`)

    for (const product of products) {
      console.log('='.repeat(70))
      console.log(`产品 ID: ${product.id}`)
      console.log(`名称: ${product.product_name}`)
      console.log(`颜色: ${product.color || '(无)'}`)
      console.log(`类别 ID: ${product.category_id}`)
      console.log(`库存: ${product.total_stock}`)
      console.log(`尺寸库存: ${JSON.stringify(product.size_stock)}`)
      console.log(`平均成本: $${product.avg_unit_cost}`)
      console.log(`总成本价值: $${product.total_cost_value}`)

      // 查询类别信息
      const { data: category } = await supabase
        .from('product_categories')
        .select('*')
        .eq('id', product.category_id)
        .single()

      console.log(`类别名称: ${category?.name || '未知'}`)

      // 查询所有可能匹配的进货记录
      console.log('\n尝试查找进货记录...')

      // 方法1: 精确匹配
      const { data: exactMatch } = await supabase
        .from('stock_in')
        .select('*')
        .eq('category_id', product.category_id)
        .eq('product_name', product.product_name)

      console.log(`精确匹配 (category_id=${product.category_id}, product_name="${product.product_name}"): ${exactMatch?.length || 0} 条`)
      if (exactMatch && exactMatch.length > 0) {
        exactMatch.forEach((s, i) => {
          console.log(`  ${i + 1}. 日期: ${s.date}, 颜色: ${s.color || '(无)'}, 数量: ${s.total_quantity}, 成本: $${s.total_cost}`)
        })
      }

      // 方法2: 模糊匹配产品名
      const { data: fuzzyMatch } = await supabase
        .from('stock_in')
        .select('*')
        .eq('category_id', product.category_id)
        .ilike('product_name', `%${product.product_name.substring(0, 5)}%`)

      console.log(`模糊匹配 (前5个字符): ${fuzzyMatch?.length || 0} 条`)
      if (fuzzyMatch && fuzzyMatch.length > 0) {
        fuzzyMatch.forEach((s, i) => {
          console.log(`  ${i + 1}. 产品名: ${s.product_name}, 颜色: ${s.color || '(无)'}, 数量: ${s.total_quantity}`)
        })
      }

      // 方法3: 查询该类别的所有进货
      const { data: allInCategory } = await supabase
        .from('stock_in')
        .select('product_name')
        .eq('category_id', product.category_id)

      if (allInCategory && allInCategory.length > 0) {
        const uniqueNames = [...new Set(allInCategory.map(s => s.product_name))]
        console.log(`该类别所有产品名称 (${uniqueNames.length} 个):`)
        uniqueNames.forEach(name => console.log(`  - ${name}`))
      }

      // 查询销售记录
      const { data: sales } = await supabase
        .from('sales')
        .select('*')
        .eq('product_id', product.id)
        .order('date', { ascending: false })
        .limit(5)

      console.log(`\n销售记录: ${sales?.length || 0} 条（最近5条）`)
      if (sales && sales.length > 0) {
        sales.forEach((s, i) => {
          console.log(`  ${i + 1}. 日期: ${s.date}, 数量: ${s.quantity}, 售价: $${s.unit_price}, COGS: $${s.cost_of_goods_sold || 0}`)
        })
      }

      console.log('\n')
    }

    console.log('\n=== 建议 ===')
    console.log('1. 检查产品名称是否与进货记录匹配')
    console.log('2. 如果是组合产品，可能需要手动设置成本')
    console.log('3. 如果进货记录使用了不同的名称，需要统一命名')

  } catch (error) {
    console.error('调试过程发生错误:', error)
    process.exit(1)
  }
}

debugZeroCostProducts()
