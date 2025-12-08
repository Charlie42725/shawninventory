require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkOrphan() {
  const { data } = await supabase
    .from('stock_in')
    .select('*')
    .eq('id', 3)
    .single()

  console.log('孤立的進貨記錄 #3:')
  console.log('  產品名稱:', data.product_name)
  console.log('  數量:', data.total_quantity)
  console.log('  單價:', data.unit_cost)
  console.log('  總成本:', data.total_cost)
  console.log('  日期:', data.date)
}

checkOrphan().then(() => process.exit(0))
