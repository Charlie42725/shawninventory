const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function deepCheckSalesProductLink() {
  console.log('='.repeat(80))
  console.log('深度检查：销售记录与产品的关联问题')
  console.log('='.repeat(80))
  console.log('')

  try {
    // 1. 查询所有哈利波特的销售记录
    const { data: sales } = await supabase
      .from('sales')
      .select('*')
      .ilike('product_name', '%哈利波特%')
      .order('date', { ascending: true })

    console.log('【第一步】哈利波特的所有销售记录')
    console.log('-'.repeat(80))
    console.log(`找到 ${sales.length} 条销售记录\n`)

    let totalSales = 0
    for (const sale of sales) {
      console.log(`ID ${sale.id}: ${sale.date}`)
      console.log(`  产品名: ${sale.product_name}`)
      console.log(`  颜色/IP: ${sale.color || '(无)'}`)
      console.log(`  product_id: ${sale.product_id}`)
      console.log(`  数量: ${sale.quantity}`)
      console.log(`  单价: $${sale.unit_price}`)
      console.log(`  总额: $${sale.total_amount}`)
      console.log('')
      totalSales += sale.quantity
    }

    console.log(`销售总数: ${totalSales} 个\n`)

    // 2. 查询产品表中的哈利波特
    console.log('【第二步】产品表中的哈利波特记录')
    console.log('-'.repeat(80))

    const { data: products } = await supabase
      .from('products')
      .select('*')
      .ilike('product_name', '%哈利波特%')
      .order('id')

    console.log(`找到 ${products.length} 个产品记录\n`)

    for (const product of products) {
      console.log(`产品 ID ${product.id}: ${product.product_name}`)
      console.log(`  颜色: ${product.color || '(无)'}`)
      console.log(`  库存: ${product.total_stock}`)
      console.log(`  平均成本: $${product.avg_unit_cost}`)
      console.log('')
    }

    // 3. 查询进货表中的哈利波特
    console.log('【第三步】进货记录中的哈利波特')
    console.log('-'.repeat(80))

    const { data: stockIns } = await supabase
      .from('stock_in')
      .select('*')
      .ilike('product_name', '%哈利波特%')
      .order('date', { ascending: true })

    console.log(`找到 ${stockIns.length} 条进货记录\n`)

    let totalStockIn = 0
    for (const stockIn of stockIns) {
      console.log(`${stockIn.date}: ${stockIn.product_name}`)
      console.log(`  颜色: ${stockIn.color || '(无)'}`)
      console.log(`  数量: ${stockIn.total_quantity}`)
      console.log(`  单价: $${stockIn.unit_cost}`)
      console.log(`  总成本: $${stockIn.total_cost}`)
      console.log('')
      totalStockIn += stockIn.total_quantity
    }

    console.log(`进货总数: ${totalStockIn} 个\n`)

    // 4. 分析关联问题
    console.log('【第四步】关联分析')
    console.log('-'.repeat(80))

    console.log(`销售总数: ${totalSales} 个`)
    console.log(`进货总数: ${totalStockIn} 个`)
    console.log(`理论库存: ${totalStockIn - totalSales} 个\n`)

    // 检查每个销售记录是否能找到对应的产品
    console.log('【第五步】检查销售记录的product_id是否正确')
    console.log('-'.repeat(80))

    for (const sale of sales) {
      const matchedProduct = products.find(p => p.id === sale.product_id)

      if (!matchedProduct) {
        console.log(`❌ 销售 ID ${sale.id} 的 product_id=${sale.product_id} 找不到对应产品!`)
        console.log(`   销售记录: ${sale.product_name}, 颜色: ${sale.color || '(无)'}`)
      } else {
        const colorMatch =
          (sale.color === null || sale.color === '') && (matchedProduct.color === null || matchedProduct.color === '') ||
          sale.color === matchedProduct.color

        if (!colorMatch) {
          console.log(`⚠️  销售 ID ${sale.id} 颜色不匹配!`)
          console.log(`   销售颜色: ${sale.color || '(无)'}`)
          console.log(`   产品颜色: ${matchedProduct.color || '(无)'}`)
        }
      }
    }

    // 6. 检查为什么我的脚本找不到进货记录
    console.log('\n【第六步】检查为什么之前的脚本认为"进货0"')
    console.log('-'.repeat(80))

    // 模拟之前的查询逻辑
    if (products.length > 0) {
      const product = products[0] // 取第一个产品
      console.log(`\n以产品 ID ${product.id} (${product.product_name}, 颜色: ${product.color || '(无)'}) 为例:\n`)

      const matchingStockIns = stockIns.filter(s =>
        s.category_id === product.category_id &&
        s.product_name === product.product_name &&
        ((product.color === null && (s.color === null || s.color === '')) || s.color === product.color)
      )

      console.log(`匹配条件:`)
      console.log(`  category_id: ${product.category_id}`)
      console.log(`  product_name: ${product.product_name}`)
      console.log(`  color: ${product.color || '(无)'}`)
      console.log(`\n匹配到的进货记录: ${matchingStockIns.length} 条`)

      if (matchingStockIns.length === 0 && stockIns.length > 0) {
        console.log(`\n🔍 为什么匹配失败？让我们逐条检查进货记录:\n`)

        for (const stockIn of stockIns) {
          console.log(`进货记录: ${stockIn.product_name}, 颜色: ${stockIn.color || '(无)'}`)
          console.log(`  category_id匹配: ${stockIn.category_id === product.category_id ? '✅' : '❌'} (${stockIn.category_id} vs ${product.category_id})`)
          console.log(`  product_name匹配: ${stockIn.product_name === product.product_name ? '✅' : '❌'} ("${stockIn.product_name}" vs "${product.product_name}")`)

          const colorMatch = (product.color === null && (stockIn.color === null || stockIn.color === '')) || stockIn.color === product.color
          console.log(`  color匹配: ${colorMatch ? '✅' : '❌'} ("${stockIn.color || '(无)'}" vs "${product.color || '(无)'}")`)
          console.log('')
        }
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('总结:')
    console.log('1. 检查销售记录中的 product_id 是否正确指向产品')
    console.log('2. 检查产品表和进货表中的颜色字段是否一致')
    console.log('3. 检查产品名称是否完全匹配（包括空格、标点等）')
    console.log('='.repeat(80))

  } catch (error) {
    console.error('检查过程发生错误:', error)
    process.exit(1)
  }
}

deepCheckSalesProductLink()
