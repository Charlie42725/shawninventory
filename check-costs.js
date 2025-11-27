const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkProductCosts() {
  console.log('檢查產品成本狀態...\n')

  try {
    // 查詢所有產品
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .order('id')

    if (productsError) {
      throw productsError
    }

    console.log(`=== 產品成本狀態報告 ===\n`)

    let problemCount = 0
    let zeroAvgCostCount = 0
    let missingTotalCostCount = 0
    let inconsistentCount = 0

    for (const product of products) {
      let hasProblem = false
      let issues = []

      // 檢查1: avg_unit_cost為0但有庫存
      if (product.total_stock > 0 && product.avg_unit_cost === 0) {
        issues.push('avg_unit_cost為0但有庫存')
        zeroAvgCostCount++
        hasProblem = true
      }

      // 檢查2: total_cost_value為0但有庫存
      if (product.total_stock > 0 && product.total_cost_value === 0) {
        issues.push('total_cost_value為0但有庫存')
        missingTotalCostCount++
        hasProblem = true
      }

      // 檢查3: total_cost_value與計算值不一致(超過1元誤差)
      if (product.total_stock > 0 && product.avg_unit_cost > 0) {
        const expectedTotalCost = product.avg_unit_cost * product.total_stock
        const diff = Math.abs(product.total_cost_value - expectedTotalCost)
        if (diff > 1) {
          issues.push(`成本不一致(差異: $${diff.toFixed(2)})`)
          inconsistentCount++
          hasProblem = true
        }
      }

      if (hasProblem) {
        console.log(`\n❌ [${product.id}] ${product.product_name}${product.color ? ` (${product.color})` : ''}`)
        console.log(`   庫存: ${product.total_stock}`)
        console.log(`   平均成本: $${product.avg_unit_cost}`)
        console.log(`   總成本價值: $${product.total_cost_value}`)
        console.log(`   預期總成本: $${(product.avg_unit_cost * product.total_stock).toFixed(2)}`)
        console.log(`   問題: ${issues.join(', ')}`)
        problemCount++
      }
    }

    if (problemCount === 0) {
      console.log('✅ 所有產品的成本狀態正常!\n')
    } else {
      console.log(`\n\n=== 統計 ===`)
      console.log(`❌ 有問題的產品: ${problemCount} 個`)
      console.log(`   - 平均成本為0: ${zeroAvgCostCount} 個`)
      console.log(`   - 總成本為0: ${missingTotalCostCount} 個`)
      console.log(`   - 成本不一致: ${inconsistentCount} 個`)
      console.log(`✅ 正常的產品: ${products.length - problemCount} 個`)
      console.log(`總計: ${products.length} 個產品`)
    }

    // 檢查最近的銷售記錄
    console.log(`\n\n=== 檢查最近的銷售記錄 ===\n`)
    const { data: recentSales, error: salesError } = await supabase
      .from('sales')
      .select('*, product:products(*)')
      .order('created_at', { ascending: false })
      .limit(5)

    if (salesError) {
      throw salesError
    }

    console.log(`最近5筆銷售:`)
    for (const sale of recentSales) {
      console.log(`\n- [${sale.id}] ${sale.product_name}${sale.size ? ` (${sale.size})` : ''} x${sale.quantity}`)
      console.log(`  銷售日期: ${sale.date}`)
      console.log(`  售價: $${sale.unit_price}`)
      console.log(`  產品當前狀態:`)
      console.log(`    庫存: ${sale.product?.total_stock || 'N/A'}`)
      console.log(`    平均成本: $${sale.product?.avg_unit_cost || 'N/A'}`)
      console.log(`    總成本價值: $${sale.product?.total_cost_value || 'N/A'}`)
    }

  } catch (error) {
    console.error('檢查過程發生錯誤:', error)
    process.exit(1)
  }
}

checkProductCosts()
