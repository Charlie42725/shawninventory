require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkInventoryCost() {
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('id')

  console.log('\n所有產品的成本狀態:\n')
  console.log('ID | 產品名稱 | 庫存 | 平均成本 | 總成本價值')
  console.log('='.repeat(80))

  let totalCost = 0
  let totalStock = 0
  let productsWithCost = 0

  products.forEach(p => {
    const cost = p.total_cost_value || 0
    totalCost += cost
    totalStock += p.total_stock || 0

    if (cost > 0) {
      productsWithCost++
    }

    if (p.total_stock > 0 || cost > 0) {
      console.log(
        `${p.id} | ${(p.model || p.product_name || '').substring(0, 20)} | ` +
        `${p.total_stock} | $${(p.avg_unit_cost || 0).toFixed(2)} | $${cost.toFixed(2)}`
      )
    }
  })

  console.log('='.repeat(80))
  console.log(`總計: ${productsWithCost} 個產品有成本 | 總庫存: ${totalStock} | 總成本: $${totalCost.toFixed(2)}`)
}

checkInventoryCost().then(() => process.exit(0))
