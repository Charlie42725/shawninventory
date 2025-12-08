/**
 * 修復所有 COGS 為 0 的銷售記錄
 *
 * 這個腳本會：
 * 1. 找出所有 COGS 為 0 或 null 的銷售記錄
 * 2. 使用產品的當前平均成本計算正確的 COGS
 * 3. 更新銷售記錄
 * 4. 生成修復報告
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAllZeroCOGS(dryRun = true) {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║        修復所有 COGS 為 0 的銷售記錄                 ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  if (dryRun) {
    console.log('🔍 預覽模式（不會實際修改數據）\n');
  } else {
    console.log('⚠️  實際修復模式（會修改數據）\n');
  }

  // 1. 查詢所有 COGS 為 0 的銷售記錄
  const { data: zeroCOGSSales, error } = await supabase
    .from('sales')
    .select('id, date, product_id, product_name, quantity, unit_price, cost_of_goods_sold, product:products(avg_unit_cost)')
    .or('cost_of_goods_sold.is.null,cost_of_goods_sold.eq.0')
    .order('date', { ascending: false });

  if (error) {
    console.error('❌ 查詢失敗:', error.message);
    return;
  }

  if (zeroCOGSSales.length === 0) {
    console.log('✅ 沒有需要修復的記錄\n');
    return;
  }

  console.log(`找到 ${zeroCOGSSales.length} 筆需要修復的銷售記錄\n`);
  console.log('='.repeat(60) + '\n');

  let totalFixed = 0;
  let totalCOGSAdded = 0;
  const fixResults = [];

  // 2. 逐筆修復
  for (const sale of zeroCOGSSales) {
    const avgCost = sale.product?.avg_unit_cost || 0;
    const correctCOGS = avgCost * sale.quantity;

    console.log(`📋 銷售記錄 #${sale.id}`);
    console.log(`   日期: ${sale.date}`);
    console.log(`   產品: ${sale.product_name}`);
    console.log(`   數量: ${sale.quantity}`);
    console.log(`   銷售單價: $${sale.unit_price}`);
    console.log(`   當前 COGS: $${sale.cost_of_goods_sold || 0}`);
    console.log(`   產品平均成本: $${avgCost}`);
    console.log(`   修復後 COGS: $${correctCOGS.toFixed(2)}`);

    if (avgCost === 0) {
      console.log('   ⚠️  警告: 產品平均成本為 0，無法計算 COGS，跳過');
      fixResults.push({
        id: sale.id,
        success: false,
        reason: '產品平均成本為 0',
        oldCOGS: sale.cost_of_goods_sold || 0,
        newCOGS: 0,
      });
      console.log('');
      continue;
    }

    if (!dryRun) {
      // 實際更新
      const { error: updateError } = await supabase
        .from('sales')
        .update({ cost_of_goods_sold: correctCOGS })
        .eq('id', sale.id);

      if (updateError) {
        console.log(`   ❌ 修復失敗: ${updateError.message}`);
        fixResults.push({
          id: sale.id,
          success: false,
          reason: updateError.message,
          oldCOGS: sale.cost_of_goods_sold || 0,
          newCOGS: correctCOGS,
        });
      } else {
        console.log(`   ✅ 已修復`);
        totalFixed++;
        totalCOGSAdded += correctCOGS;
        fixResults.push({
          id: sale.id,
          success: true,
          oldCOGS: sale.cost_of_goods_sold || 0,
          newCOGS: correctCOGS,
        });
      }
    } else {
      console.log(`   📝 (預覽模式，未實際修改)`);
      totalFixed++;
      totalCOGSAdded += correctCOGS;
      fixResults.push({
        id: sale.id,
        success: true,
        preview: true,
        oldCOGS: sale.cost_of_goods_sold || 0,
        newCOGS: correctCOGS,
      });
    }

    console.log('');
  }

  // 3. 生成報告
  console.log('='.repeat(60));
  console.log('\n📊 修復報告\n');

  if (dryRun) {
    console.log(`✅ 預計修復: ${totalFixed} 筆`);
    console.log(`💰 預計新增成本: $${totalCOGSAdded.toLocaleString()}`);
    console.log(`\n如果確認無誤，請運行：`);
    console.log(`   node fix-all-zero-cogs.js --execute\n`);
  } else {
    const successCount = fixResults.filter(r => r.success).length;
    const failCount = fixResults.filter(r => !r.success).length;

    console.log(`✅ 成功修復: ${successCount} 筆`);
    if (failCount > 0) {
      console.log(`❌ 修復失敗: ${failCount} 筆`);
    }
    console.log(`💰 新增成本: $${totalCOGSAdded.toLocaleString()}`);
    console.log(`\n修復完成！損益報表現在應該顯示正確的成本了。\n`);
  }

  // 4. 驗證修復結果（僅在實際修復模式）
  if (!dryRun) {
    console.log('🔍 驗證修復結果...\n');

    const { data: remainingZeroCOGS } = await supabase
      .from('sales')
      .select('id')
      .or('cost_of_goods_sold.is.null,cost_of_goods_sold.eq.0');

    if (remainingZeroCOGS && remainingZeroCOGS.length > 0) {
      console.log(`⚠️  仍有 ${remainingZeroCOGS.length} 筆 COGS 為 0 的記錄`);
      console.log(`   這些記錄可能是因為產品平均成本為 0 而無法修復\n`);
    } else {
      console.log('✅ 所有銷售記錄的 COGS 都已正確設置！\n');
    }
  }

  return fixResults;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');

  await fixAllZeroCOGS(dryRun);
}

main().catch(console.error);
