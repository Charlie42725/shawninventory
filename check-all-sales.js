require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkSales() {
  const { data: sales } = await supabase
    .from('sales')
    .select('id, model, product_name, cost_of_goods_sold, quantity, unit_price')
    .order('id')

  console.log('所有銷售記錄:')
  sales.forEach(s => {
    const cogs = s.cost_of_goods_sold || 0
    console.log(s.id + ' | ' + (s.model || s.product_name) + ' | COGS: $' + cogs.toFixed(2))
  })

  const missing = sales.filter(s => !s.cost_of_goods_sold || s.cost_of_goods_sold === 0)
  console.log('\n缺少 COGS 的銷售記錄:', missing.length)
  if (missing.length > 0) {
    missing.forEach(s => {
      console.log('  - ID ' + s.id + ': ' + (s.model || s.product_name))
    })
  }
}

checkSales().then(() => process.exit(0))
