require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function deleteOrphan() {
  console.log('刪除孤立的進貨記錄 #3...')
  
  const { error } = await supabase
    .from('stock_in')
    .delete()
    .eq('id', 3)

  if (error) {
    console.error('刪除失敗:', error)
  } else {
    console.log('✅ 成功刪除孤立的進貨記錄 #3 (B組合, $7,600)')
  }
}

deleteOrphan().then(() => process.exit(0))
