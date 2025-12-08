const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkColorFieldValues() {
  console.log('='.repeat(80))
  console.log('检查颜色字段的实际值（包括 null vs 空字符串）')
  console.log('='.repeat(80))
  console.log('')

  try {
    // 1. 检查哈利波特产品的颜色字段
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', 12)
      .single()

    console.log('【产品表】哈利波特400% (ID: 12)')
    console.log('-'.repeat(80))
    console.log(`color 值: ${JSON.stringify(product.color)}`)
    console.log(`color 类型: ${typeof product.color}`)
    console.log(`color === null: ${product.color === null}`)
    console.log(`color === '': ${product.color === ''}`)
    console.log(`color === undefined: ${product.color === undefined}`)
    console.log('')

    // 2. 检查进货记录的颜色字段
    const { data: stockIns } = await supabase
      .from('stock_in')
      .select('*')
      .ilike('product_name', '%哈利波特%')
      .order('date', { ascending: true })

    console.log('【进货表】哈利波特的进货记录')
    console.log('-'.repeat(80))
    stockIns.forEach((s, i) => {
      console.log(`记录 ${i + 1}: ${s.date}`)
      console.log(`  color 值: ${JSON.stringify(s.color)}`)
      console.log(`  color 类型: ${typeof s.color}`)
      console.log(`  color === null: ${s.color === null}`)
      console.log(`  color === '': ${s.color === ''}`)
      console.log(`  与产品的 color 严格相等: ${s.color === product.color}`)
      console.log('')
    })

    // 3. 测试匹配逻辑
    console.log('【匹配测试】')
    console.log('-'.repeat(80))

    for (const stockIn of stockIns) {
      console.log(`进货记录: ${stockIn.date}`)

      // 旧的匹配逻辑
      const oldLogic = (product.color === null && (stockIn.color === null || stockIn.color === '')) || stockIn.color === product.color
      console.log(`  旧逻辑结果: ${oldLogic}`)

      // 详细分解
      console.log(`  详细检查:`)
      console.log(`    product.color === null: ${product.color === null}`)
      console.log(`    stockIn.color === null: ${stockIn.color === null}`)
      console.log(`    stockIn.color === '': ${stockIn.color === ''}`)
      console.log(`    stockIn.color === product.color: ${stockIn.color === product.color}`)

      // 新的匹配逻辑建议
      const normalizeColor = (color) => (color === null || color === '' || color === undefined) ? null : color
      const newLogic = normalizeColor(stockIn.color) === normalizeColor(product.color)
      console.log(`  新逻辑结果: ${newLogic}`)
      console.log('')
    }

    // 4. 检查销售记录
    console.log('【销售表】哈利波特的销售记录')
    console.log('-'.repeat(80))

    const { data: sales } = await supabase
      .from('sales')
      .select('*')
      .eq('product_id', 12)
      .order('date', { ascending: true })

    sales.forEach((s, i) => {
      console.log(`销售 ID ${s.id}: ${s.date}`)
      console.log(`  color 值: ${JSON.stringify(s.color)}`)
      console.log(`  color 类型: ${typeof s.color}`)
      console.log(`  color === null: ${s.color === null}`)
      console.log(`  color === '': ${s.color === ''}`)
      console.log('')
    })

    // 5. 统计所有产品的颜色字段分布
    console.log('【统计】所有产品的颜色字段分布')
    console.log('-'.repeat(80))

    const { data: allProducts } = await supabase
      .from('products')
      .select('id, product_name, color')

    let nullCount = 0
    let emptyStringCount = 0
    let hasValueCount = 0

    for (const p of allProducts) {
      if (p.color === null) {
        nullCount++
      } else if (p.color === '') {
        emptyStringCount++
      } else {
        hasValueCount++
      }
    }

    console.log(`total: ${allProducts.length} 个产品`)
    console.log(`color = null: ${nullCount} 个`)
    console.log(`color = '': ${emptyStringCount} 个`)
    console.log(`color = 有值: ${hasValueCount} 个\n`)

    // 6. 统计进货记录的颜色字段
    console.log('【统计】所有进货记录的颜色字段分布')
    console.log('-'.repeat(80))

    const { data: allStockIns } = await supabase
      .from('stock_in')
      .select('id, product_name, color')

    nullCount = 0
    emptyStringCount = 0
    hasValueCount = 0

    for (const s of allStockIns) {
      if (s.color === null) {
        nullCount++
      } else if (s.color === '') {
        emptyStringCount++
      } else {
        hasValueCount++
      }
    }

    console.log(`total: ${allStockIns.length} 条进货记录`)
    console.log(`color = null: ${nullCount} 条`)
    console.log(`color = '': ${emptyStringCount} 条`)
    console.log(`color = 有值: ${hasValueCount} 条\n`)

    console.log('='.repeat(80))
    console.log('结论:')
    console.log('如果产品表用 null，但进货表用空字符串 \'\'，匹配就会失败！')
    console.log('需要统一处理：null 和空字符串 \'\' 都视为"无颜色"')
    console.log('='.repeat(80))

  } catch (error) {
    console.error('检查过程发生错误:', error)
    process.exit(1)
  }
}

checkColorFieldValues()
