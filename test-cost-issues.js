/**
 * 測試成本邏輯問題
 *
 * 這個腳本會測試所有發現的成本問題：
 * 1. 新增銷售時 COGS 可能為 0
 * 2. 刪除銷售時錯誤使用銷售單價恢復成本
 * 3. 修改銷售單價時未更新 COGS
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 測試數據
const TEST_CATEGORY_ID = 3; // 潮玩
const TEST_PRODUCT_NAME = '測試產品_成本邏輯測試';

async function cleanup() {
  console.log('🧹 清理測試數據...');

  // 刪除測試產品相關的銷售記錄
  await supabase.from('sales').delete().ilike('product_name', '%測試產品_成本邏輯測試%');

  // 刪除測試產品相關的進貨記錄
  await supabase.from('stock_in').delete().ilike('product_name', '%測試產品_成本邏輯測試%');

  // 刪除測試產品
  await supabase.from('products').delete().ilike('product_name', '%測試產品_成本邏輯測試%');

  console.log('✅ 清理完成\n');
}

async function test1_NewSaleWithZeroCOGS() {
  console.log('=== 測試 1: 新增銷售時 COGS 為 0 ===\n');

  try {
    // 步驟 1: 創建產品（avg_unit_cost = 0）
    const { data: newProduct, error: productError } = await supabase
      .from('products')
      .insert({
        category_id: TEST_CATEGORY_ID,
        product_name: TEST_PRODUCT_NAME,
        size_stock: { default: 10 },
        total_stock: 10,
        avg_unit_cost: 0,  // ← 模擬成本未設置的情況
        total_cost_value: 0,
      })
      .select()
      .single();

    if (productError) throw productError;
    console.log(`✅ 已創建測試產品 (ID: ${newProduct.id}, avg_unit_cost: ${newProduct.avg_unit_cost})`);

    // 步驟 2: 直接銷售（模擬進貨和銷售快速連續發生）
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        date: new Date().toISOString().split('T')[0],
        customer_type: '零售',
        product_id: newProduct.id,
        product_name: TEST_PRODUCT_NAME,
        unit_price: 150,
        quantity: 2,
        total_amount: 300,
        cost_of_goods_sold: newProduct.avg_unit_cost * 2,  // ← 這裡會是 0
      })
      .select()
      .single();

    if (saleError) throw saleError;

    console.log(`\n🔴 問題重現！`);
    console.log(`   銷售記錄 ID: ${sale.id}`);
    console.log(`   COGS: ${sale.cost_of_goods_sold} ← 應該是實際成本，但現在是 0`);
    console.log(`   這會導致損益報表缺少這筆銷售的成本\n`);

    return { productId: newProduct.id, saleId: sale.id };

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    return null;
  }
}

async function test2_DeleteSaleWithWrongCost() {
  console.log('\n=== 測試 2: 刪除銷售時錯誤使用銷售單價恢復成本 ===\n');

  try {
    // 步驟 1: 創建產品並設置正確成本
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        category_id: TEST_CATEGORY_ID,
        product_name: TEST_PRODUCT_NAME + '_DELETE',
        size_stock: { default: 8 },
        total_stock: 8,
        avg_unit_cost: 100,  // 進貨成本 $100
        total_cost_value: 800,  // 8 × $100
      })
      .select()
      .single();

    if (productError) throw productError;
    console.log(`✅ 已創建產品 (ID: ${product.id})`);
    console.log(`   庫存: ${product.total_stock}`);
    console.log(`   平均成本: $${product.avg_unit_cost}`);
    console.log(`   總成本價值: $${product.total_cost_value}`);

    // 步驟 2: 銷售 2 個（售價 $150）
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        date: new Date().toISOString().split('T')[0],
        customer_type: '零售',
        product_id: product.id,
        product_name: TEST_PRODUCT_NAME + '_DELETE',
        unit_price: 150,  // 銷售單價 $150
        quantity: 2,
        total_amount: 300,
        cost_of_goods_sold: 200,  // 正確的 COGS = 2 × $100
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // 更新產品庫存（模擬銷售後的狀態）
    await supabase
      .from('products')
      .update({
        total_stock: 6,  // 8 - 2
        size_stock: { default: 6 },
        total_cost_value: 600,  // 800 - 200
      })
      .eq('id', product.id);

    console.log(`\n✅ 已創建銷售記錄 (ID: ${sale.id})`);
    console.log(`   數量: ${sale.quantity}`);
    console.log(`   銷售單價: $${sale.unit_price}`);
    console.log(`   COGS: $${sale.cost_of_goods_sold}`);

    // 查詢銷售前的產品狀態
    const { data: beforeDelete } = await supabase
      .from('products')
      .select('*')
      .eq('id', product.id)
      .single();

    console.log(`\n📊 刪除銷售前的產品狀態:`);
    console.log(`   庫存: ${beforeDelete.total_stock}`);
    console.log(`   平均成本: $${beforeDelete.avg_unit_cost}`);
    console.log(`   總成本價值: $${beforeDelete.total_cost_value}`);

    // 步驟 3: 刪除銷售（模擬當前邏輯）
    console.log(`\n🗑️  執行刪除銷售（使用當前邏輯）...`);

    // 當前邏輯：使用 sale.unit_price 恢復成本
    const restoredCostWrong = sale.unit_price * sale.quantity;  // 150 × 2 = 300 ❌
    const restoredCostCorrect = sale.cost_of_goods_sold;  // 200 ✅

    console.log(`\n🔴 問題重現！`);
    console.log(`   應該恢復的成本: $${restoredCostCorrect} (來自 COGS)`);
    console.log(`   實際恢復的成本: $${restoredCostWrong} (來自銷售單價)`);
    console.log(`   差異: $${restoredCostWrong - restoredCostCorrect} ← 多加了這麼多成本！`);

    const wrongNewTotal = beforeDelete.total_cost_value + restoredCostWrong;
    const correctNewTotal = beforeDelete.total_cost_value + restoredCostCorrect;

    console.log(`\n   刪除後總成本價值（錯誤）: $${wrongNewTotal}`);
    console.log(`   刪除後總成本價值（正確）: $${correctNewTotal}`);
    console.log(`   原始總成本價值: $${product.total_cost_value}`);
    console.log(`   ⚠️  錯誤邏輯會導致成本多出 $${wrongNewTotal - product.total_cost_value}\n`);

    return { productId: product.id, saleId: sale.id };

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    return null;
  }
}

async function test3_UpdateSalePriceWithoutCOGS() {
  console.log('\n=== 測試 3: 修改銷售單價時未更新 COGS ===\n');

  try {
    // 步驟 1: 創建產品
    const { data: product } = await supabase
      .from('products')
      .insert({
        category_id: TEST_CATEGORY_ID,
        product_name: TEST_PRODUCT_NAME + '_UPDATE',
        size_stock: { default: 5 },
        total_stock: 5,
        avg_unit_cost: 80,
        total_cost_value: 400,
      })
      .select()
      .single();

    console.log(`✅ 已創建產品 (ID: ${product.id}, 平均成本: $${product.avg_unit_cost})`);

    // 步驟 2: 創建銷售
    const { data: sale } = await supabase
      .from('sales')
      .insert({
        date: new Date().toISOString().split('T')[0],
        customer_type: '零售',
        product_id: product.id,
        product_name: TEST_PRODUCT_NAME + '_UPDATE',
        unit_price: 120,
        quantity: 2,
        total_amount: 240,
        cost_of_goods_sold: 160,  // 2 × $80
      })
      .select()
      .single();

    console.log(`✅ 已創建銷售 (ID: ${sale.id})`);
    console.log(`   原單價: $${sale.unit_price}`);
    console.log(`   原 COGS: $${sale.cost_of_goods_sold}`);

    // 步驟 3: 修改單價（模擬當前 PUT 邏輯）
    const newUnitPrice = 150;
    const newTotalAmount = newUnitPrice * sale.quantity;

    console.log(`\n📝 修改銷售單價為 $${newUnitPrice}...`);

    const { data: updatedSale } = await supabase
      .from('sales')
      .update({
        unit_price: newUnitPrice,
        total_amount: newTotalAmount,
        // ❌ 注意：COGS 沒有更新！
      })
      .eq('id', sale.id)
      .select()
      .single();

    console.log(`\n🔴 問題重現！`);
    console.log(`   新單價: $${updatedSale.unit_price}`);
    console.log(`   新總額: $${updatedSale.total_amount}`);
    console.log(`   COGS: $${updatedSale.cost_of_goods_sold} ← 沒有改變`);
    console.log(`   ⚠️  COGS 應該保持不變（成本不會因售價改變而改變）`);
    console.log(`   ✅ 這個行為其實是正確的！銷售單價改變不影響成本\n`);

    return { productId: product.id, saleId: sale.id };

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    return null;
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║        成本邏輯問題測試                              ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // 清理舊數據
  await cleanup();

  // 測試 1
  await test1_NewSaleWithZeroCOGS();

  // 測試 2
  await test2_DeleteSaleWithWrongCost();

  // 測試 3
  await test3_UpdateSalePriceWithoutCOGS();

  // 最終清理
  console.log('\n' + '='.repeat(60));
  await cleanup();

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  測試完成！請查看 cost-logic-analysis.md 了解詳情   ║');
  console.log('╚══════════════════════════════════════════════════════╝');
}

main().catch(console.error);
