const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function backfillSalesCOGS() {
  console.log('=== 为历史销售记录补充 COGS 数据 ===\n')

  try {
    // 1. 获取所有销售记录
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .order('date', { ascending: true })

    if (salesError) {
      throw new Error(`查询销售记录失败: ${salesError.message}`)
    }

    console.log(`找到 ${sales.length} 条销售记录\n`)

    // 2. 获取所有产品信息
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')

    if (productsError) {
      throw new Error(`查询产品失败: ${productsError.message}`)
    }

    console.log(`找到 ${products.length} 个产品\n`)

    // 3. 统计需要补充的记录
    const needsBackfill = sales.filter(s => !s.cost_of_goods_sold || s.cost_of_goods_sold === 0)
    console.log(`需要补充 COGS 的记录: ${needsBackfill.length} 条\n`)

    if (needsBackfill.length === 0) {
      console.log('✅ 所有销售记录都已有 COGS 数据！')
      return
    }

    // 4. 为每条销售记录补充 COGS
    let successCount = 0
    let errorCount = 0
    let skippedCount = 0

    console.log('开始补充数据...\n')

    for (const sale of needsBackfill) {
      try {
        // 查找对应的产品
        const product = products.find(p => p.id === sale.product_id)

        if (!product) {
          console.log(`⚠️  跳过 ID ${sale.id}: 找不到产品 ${sale.product_name}`)
          skippedCount++
          continue
        }

        if (product.avg_unit_cost === 0) {
          console.log(`⚠️  跳过 ID ${sale.id}: 产品 ${sale.product_name} 的平均成本为 0`)
          skippedCount++
          continue
        }

        // 计算 COGS
        const cogs = product.avg_unit_cost * sale.quantity

        // 更新销售记录
        const { error: updateError } = await supabase
          .from('sales')
          .update({ cost_of_goods_sold: cogs })
          .eq('id', sale.id)

        if (updateError) {
          console.error(`❌ 更新 ID ${sale.id} 失败:`, updateError.message)
          errorCount++
        } else {
          successCount++
          if (successCount % 10 === 0) {
            console.log(`已处理 ${successCount} 条...`)
          }
        }

      } catch (error) {
        console.error(`❌ 处理 ID ${sale.id} 时发生异常:`, error.message)
        errorCount++
      }
    }

    console.log('\n=== 补充完成 ===')
    console.log(`✅ 成功: ${successCount} 条`)
    console.log(`⚠️  跳过: ${skippedCount} 条`)
    console.log(`❌ 失败: ${errorCount} 条\n`)

    // 5. 验证结果
    console.log('=== 验证结果 ===')
    const { data: verifiedSales } = await supabase
      .from('sales')
      .select('id, cost_of_goods_sold')

    const withCOGS = verifiedSales.filter(s => s.cost_of_goods_sold > 0).length
    const withoutCOGS = verifiedSales.filter(s => !s.cost_of_goods_sold || s.cost_of_goods_sold === 0).length

    console.log(`有 COGS 的销售记录: ${withCOGS} 条`)
    console.log(`无 COGS 的销售记录: ${withoutCOGS} 条\n`)

    if (withoutCOGS > 0) {
      console.log('仍有部分记录没有 COGS，请检查这些记录的产品成本是否为 0')
    } else {
      console.log('✅ 所有销售记录都已补充 COGS！')
    }

  } catch (error) {
    console.error('补充过程发生错误:', error)
    process.exit(1)
  }
}

backfillSalesCOGS()
