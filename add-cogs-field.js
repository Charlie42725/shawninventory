const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function addCogsField() {
  console.log('=== 添加 cost_of_goods_sold 字段到 sales 表 ===\n')

  try {
    // 尝试添加字段
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE sales
        ADD COLUMN IF NOT EXISTS cost_of_goods_sold DECIMAL(10, 2) DEFAULT 0;
      `
    })

    if (error) {
      // 如果没有 exec_sql 函数，我们可以尝试通过查询来检查
      console.log('尝试通过其他方式添加字段...')

      // 先检查字段是否已存在
      const { data: columns, error: columnsError } = await supabase
        .from('sales')
        .select('cost_of_goods_sold')
        .limit(1)

      if (columnsError && columnsError.message.includes('column')) {
        console.log('字段不存在，需要手动添加')
        console.log('\n请在 Supabase Dashboard 的 SQL Editor 中运行以下 SQL:')
        console.log('─'.repeat(60))
        console.log(`
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS cost_of_goods_sold DECIMAL(10, 2) DEFAULT 0;

COMMENT ON COLUMN sales.cost_of_goods_sold IS '销售成本 (COGS) - 该笔销售的实际成本，在销售时记录';
        `)
        console.log('─'.repeat(60))
      } else {
        console.log('✅ 字段已存在')
      }
    } else {
      console.log('✅ 字段添加成功')
    }

  } catch (error) {
    console.error('发生错误:', error)
    console.log('\n请在 Supabase Dashboard 的 SQL Editor 中手动运行以下 SQL:')
    console.log('─'.repeat(60))
    console.log(`
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS cost_of_goods_sold DECIMAL(10, 2) DEFAULT 0;

COMMENT ON COLUMN sales.cost_of_goods_sold IS '销售成本 (COGS) - 该笔销售的实际成本，在销售时记录';
    `)
    console.log('─'.repeat(60))
  }
}

addCogsField()
