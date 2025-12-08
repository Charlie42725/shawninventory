/**
 * 修復 LabubuB組合 銷售記錄的 COGS
 *
 * 問題：
 * - 2025-11-25 的銷售記錄（ID: 89）COGS 為 0，應該是 10 × 3490 = 34900
 * - 2025-11-28 的銷售記錄（ID: 90）COGS 為 0，應該是 15 × 3700 = 55500
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixLabubuCOGS() {
  console.log('=== 修復 LabubuB組合 的 COGS ===\n');

  // 1. 檢查當前狀態
  const { data: sales } = await supabase
    .from('sales')
    .select('*')
    .in('id', [89, 90])
    .order('date', { ascending: true });

  console.log('修復前的銷售記錄：');
  sales?.forEach(sale => {
    console.log(`  ID: ${sale.id}, 日期: ${sale.date}, 數量: ${sale.quantity}, COGS: ${sale.cost_of_goods_sold}`);
  });

  // 2. 修復 COGS
  const fixes = [
    { id: 89, date: '2025-11-25', quantity: 10, unit_cost: 3490, cogs: 34900 },
    { id: 90, date: '2025-11-28', quantity: 15, unit_cost: 3700, cogs: 55500 }
  ];

  console.log('\n開始修復...');
  for (const fix of fixes) {
    const { error } = await supabase
      .from('sales')
      .update({ cost_of_goods_sold: fix.cogs })
      .eq('id', fix.id);

    if (error) {
      console.error(`  ❌ 修復失敗 (ID: ${fix.id}):`, error.message);
    } else {
      console.log(`  ✅ 已修復 ID: ${fix.id}, 日期: ${fix.date}, COGS: ${fix.cogs}`);
    }
  }

  // 3. 驗證修復結果
  const { data: verifiedSales } = await supabase
    .from('sales')
    .select('*')
    .in('id', [89, 90])
    .order('date', { ascending: true });

  console.log('\n修復後的銷售記錄：');
  verifiedSales?.forEach(sale => {
    console.log(`  ID: ${sale.id}, 日期: ${sale.date}, 數量: ${sale.quantity}, COGS: ${sale.cost_of_goods_sold}`);
  });

  // 4. 計算修復後的總 COGS
  const { data: allSales } = await supabase
    .from('sales')
    .select('cost_of_goods_sold')
    .eq('product_id', 85);

  const totalCOGS = allSales?.reduce((sum, sale) => sum + (sale.cost_of_goods_sold || 0), 0) || 0;
  console.log(`\n✅ LabubuB組合 所有銷售的總 COGS: $${totalCOGS.toLocaleString()}`);

  console.log('\n修復完成！現在損益報表應該能正確顯示成本了。');
}

fixLabubuCOGS().catch(console.error);
