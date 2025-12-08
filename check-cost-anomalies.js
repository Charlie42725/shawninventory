/**
 * 檢查現有數據中的成本異常
 *
 * 這個腳本會檢查：
 * 1. COGS 為 0 或 null 的銷售記錄
 * 2. 平均成本為 0 但有庫存的產品
 * 3. 成本價值與庫存不匹配的產品
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkZeroCOGSSales() {
  console.log('=== 檢查 COGS 為 0 的銷售記錄 ===\n');

  const { data: sales, error } = await supabase
    .from('sales')
    .select('id, date, product_name, quantity, unit_price, cost_of_goods_sold, product:products(avg_unit_cost)')
    .or('cost_of_goods_sold.is.null,cost_of_goods_sold.eq.0')
    .order('date', { ascending: false });

  if (error) {
    console.error('查詢失敗:', error.message);
    return;
  }

  if (sales.length === 0) {
    console.log('✅ 沒有找到 COGS 為 0 的銷售記錄\n');
    return;
  }

  console.log(`⚠️  找到 ${sales.length} 筆 COGS 異常的銷售記錄：\n`);

  let totalMissingCost = 0;

  sales.forEach(sale => {
    const avgCost = sale.product?.avg_unit_cost || 0;
    const estimatedCOGS = avgCost * sale.quantity;
    totalMissingCost += estimatedCOGS;

    console.log(`📋 ID: ${sale.id}`);
    console.log(`   日期: ${sale.date}`);
    console.log(`   產品: ${sale.product_name}`);
    console.log(`   數量: ${sale.quantity}`);
    console.log(`   銷售單價: $${sale.unit_price}`);
    console.log(`   記錄的 COGS: $${sale.cost_of_goods_sold || 0}`);
    console.log(`   產品平均成本: $${avgCost}`);
    console.log(`   估算應有 COGS: $${estimatedCOGS.toFixed(2)}`);
    console.log('');
  });

  console.log(`💰 總共缺少的成本: $${totalMissingCost.toLocaleString()}`);
  console.log(`   這會導致損益報表的成本少計算這麼多\n`);

  return sales;
}

async function checkZeroCostProducts() {
  console.log('=== 檢查平均成本為 0 的產品 ===\n');

  const { data: products, error } = await supabase
    .from('products')
    .select('id, product_name, total_stock, avg_unit_cost, total_cost_value')
    .eq('avg_unit_cost', 0)
    .gt('total_stock', 0)
    .order('total_stock', { ascending: false });

  if (error) {
    console.error('查詢失敗:', error.message);
    return;
  }

  if (products.length === 0) {
    console.log('✅ 沒有找到平均成本為 0 但有庫存的產品\n');
    return;
  }

  console.log(`⚠️  找到 ${products.length} 個平均成本為 0 但有庫存的產品：\n`);

  products.forEach(product => {
    console.log(`📦 ID: ${product.id}`);
    console.log(`   產品: ${product.product_name}`);
    console.log(`   庫存: ${product.total_stock}`);
    console.log(`   平均成本: $${product.avg_unit_cost}`);
    console.log(`   總成本價值: $${product.total_cost_value}`);
    console.log(`   ⚠️  這個產品無法正確計算銷售成本\n`);
  });

  return products;
}

async function checkCostValueMismatch() {
  console.log('=== 檢查成本價值不匹配的產品 ===\n');

  const { data: products, error } = await supabase
    .from('products')
    .select('id, product_name, total_stock, avg_unit_cost, total_cost_value');

  if (error) {
    console.error('查詢失敗:', error.message);
    return;
  }

  const mismatches = products.filter(product => {
    if (product.total_stock === 0 && product.total_cost_value === 0) {
      return false; // 庫存為 0 時成本為 0 是正常的
    }

    const expectedCostValue = product.avg_unit_cost * product.total_stock;
    const diff = Math.abs(product.total_cost_value - expectedCostValue);

    // 允許 0.01 的誤差（浮點數精度問題）
    return diff > 0.01;
  });

  if (mismatches.length === 0) {
    console.log('✅ 所有產品的成本價值都正確\n');
    return;
  }

  console.log(`⚠️  找到 ${mismatches.length} 個成本價值不匹配的產品：\n`);

  mismatches.forEach(product => {
    const expectedCostValue = product.avg_unit_cost * product.total_stock;
    const diff = product.total_cost_value - expectedCostValue;

    console.log(`📦 ID: ${product.id}`);
    console.log(`   產品: ${product.product_name}`);
    console.log(`   庫存: ${product.total_stock}`);
    console.log(`   平均成本: $${product.avg_unit_cost}`);
    console.log(`   記錄的總成本: $${product.total_cost_value.toFixed(2)}`);
    console.log(`   應有的總成本: $${expectedCostValue.toFixed(2)}`);
    console.log(`   差異: $${diff.toFixed(2)} (${diff > 0 ? '多' : '少'}了 $${Math.abs(diff).toFixed(2)})\n`);
  });

  return mismatches;
}

async function checkSalesVsStockIn() {
  console.log('=== 檢查銷售記錄與進貨記錄的一致性 ===\n');

  // 查詢所有產品的進貨和銷售總量
  const { data: products } = await supabase
    .from('products')
    .select('id, product_name, total_stock');

  let inconsistencies = [];

  for (const product of products) {
    // 查詢進貨總量
    const { data: stockIns } = await supabase
      .from('stock_in')
      .select('total_quantity')
      .eq('product_name', product.product_name);

    const totalStockIn = stockIns?.reduce((sum, s) => sum + s.total_quantity, 0) || 0;

    // 查詢銷售總量
    const { data: sales } = await supabase
      .from('sales')
      .select('quantity')
      .eq('product_id', product.id);

    const totalSold = sales?.reduce((sum, s) => sum + s.quantity, 0) || 0;

    // 計算預期庫存
    const expectedStock = totalStockIn - totalSold;

    // 檢查是否一致
    if (Math.abs(expectedStock - product.total_stock) > 0) {
      inconsistencies.push({
        ...product,
        totalStockIn,
        totalSold,
        expectedStock,
        actualStock: product.total_stock,
        diff: product.total_stock - expectedStock
      });
    }
  }

  if (inconsistencies.length === 0) {
    console.log('✅ 所有產品的庫存都與進貨/銷售記錄一致\n');
    return;
  }

  console.log(`⚠️  找到 ${inconsistencies.length} 個庫存不一致的產品：\n`);

  inconsistencies.forEach(item => {
    console.log(`📦 產品: ${item.product_name}`);
    console.log(`   進貨總量: ${item.totalStockIn}`);
    console.log(`   銷售總量: ${item.totalSold}`);
    console.log(`   預期庫存: ${item.expectedStock}`);
    console.log(`   實際庫存: ${item.actualStock}`);
    console.log(`   差異: ${item.diff > 0 ? '+' : ''}${item.diff}\n`);
  });

  return inconsistencies;
}

async function generateSummaryReport(zeroCOGSSales, zeroCostProducts, costMismatches) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 總結報告');
  console.log('='.repeat(60) + '\n');

  const totalIssues =
    (zeroCOGSSales?.length || 0) +
    (zeroCostProducts?.length || 0) +
    (costMismatches?.length || 0);

  if (totalIssues === 0) {
    console.log('🎉 恭喜！沒有發現任何成本異常問題！\n');
    return;
  }

  console.log(`⚠️  發現 ${totalIssues} 個問題：\n`);

  if (zeroCOGSSales && zeroCOGSSales.length > 0) {
    console.log(`1. COGS 為 0 的銷售記錄: ${zeroCOGSSales.length} 筆`);
    console.log(`   影響: 損益報表成本少計算`);
    console.log(`   建議: 運行 fix-labubu-cogs.js 修復\n`);
  }

  if (zeroCostProducts && zeroCostProducts.length > 0) {
    console.log(`2. 平均成本為 0 的產品: ${zeroCostProducts.length} 個`);
    console.log(`   影響: 無法正確計算未來銷售的成本`);
    console.log(`   建議: 檢查進貨記錄，補齊成本數據\n`);
  }

  if (costMismatches && costMismatches.length > 0) {
    console.log(`3. 成本價值不匹配: ${costMismatches.length} 個產品`);
    console.log(`   影響: 成本計算可能不準確`);
    console.log(`   建議: 重新計算平均成本\n`);
  }

  console.log('請查看 COST_FIX_RECOMMENDATIONS.md 了解詳細的修復建議。\n');
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║        成本異常檢查報告                              ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const zeroCOGSSales = await checkZeroCOGSSales();
  const zeroCostProducts = await checkZeroCostProducts();
  const costMismatches = await checkCostValueMismatch();
  await checkSalesVsStockIn();

  await generateSummaryReport(zeroCOGSSales, zeroCostProducts, costMismatches);
}

main().catch(console.error);
