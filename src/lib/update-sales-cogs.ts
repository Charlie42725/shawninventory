import { supabaseAdmin } from './supabase'

/**
 * 更新指定產品的所有銷售記錄的 COGS，並同步更新產品的 total_cost_value
 * 當進貨記錄被修改或刪除後，需要重新計算該產品的平均成本，
 * 並更新所有相關銷售記錄的 cost_of_goods_sold
 *
 * @param productId 產品ID
 * @param newAvgUnitCost 新的平均單位成本
 * @param totalStockInCost 該產品所有進貨記錄的總成本（可選，如果提供則用於計算剩餘庫存成本）
 */
export async function updateProductSalesCOGS(
  productId: number,
  newAvgUnitCost: number,
  totalStockInCost?: number
): Promise<{ updated: number; totalCOGS: number; error?: string }> {
  try {
    // 1. 查詢該產品的所有銷售記錄
    const { data: sales, error: salesError } = await supabaseAdmin
      .from('sales')
      .select('id, quantity, cost_of_goods_sold')
      .eq('product_id', productId)

    if (salesError) {
      return { updated: 0, totalCOGS: 0, error: salesError.message }
    }

    if (!sales || sales.length === 0) {
      // 沒有銷售記錄，如果提供了總進貨成本，則更新產品的 total_cost_value
      if (totalStockInCost !== undefined) {
        await supabaseAdmin
          .from('products')
          .update({
            total_cost_value: totalStockInCost,
            updated_at: new Date().toISOString(),
          })
          .eq('id', productId)
      }
      return { updated: 0, totalCOGS: 0 }
    }

    // 2. 批量更新所有銷售記錄的 COGS
    const updates = sales.map(sale => ({
      id: sale.id,
      cost_of_goods_sold: newAvgUnitCost * sale.quantity
    }))

    // 使用 upsert 批量更新
    const { error: updateError } = await supabaseAdmin
      .from('sales')
      .upsert(updates, { onConflict: 'id' })

    if (updateError) {
      return { updated: 0, totalCOGS: 0, error: updateError.message }
    }

    // 3. 計算所有銷售的總 COGS
    const totalCOGS = updates.reduce((sum, u) => sum + u.cost_of_goods_sold, 0)

    // 4. 如果提供了總進貨成本，則同步更新產品的 total_cost_value
    if (totalStockInCost !== undefined) {
      const newTotalCostValue = totalStockInCost - totalCOGS

      await supabaseAdmin
        .from('products')
        .update({
          total_cost_value: Math.max(0, newTotalCostValue),
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)

      console.log(
        `✅ 已更新產品 #${productId}:\n` +
        `   - ${updates.length} 筆銷售記錄 COGS (新平均成本: $${newAvgUnitCost.toFixed(2)})\n` +
        `   - 總進貨成本: $${totalStockInCost.toFixed(2)}\n` +
        `   - 總銷售 COGS: $${totalCOGS.toFixed(2)}\n` +
        `   - 剩餘庫存成本: $${newTotalCostValue.toFixed(2)}`
      )
    } else {
      console.log(
        `✅ 已更新產品 #${productId} 的 ${updates.length} 筆銷售記錄 COGS (新平均成本: $${newAvgUnitCost.toFixed(2)})`
      )
    }

    return { updated: updates.length, totalCOGS }
  } catch (error: any) {
    console.error('更新銷售 COGS 失敗:', error)
    return { updated: 0, totalCOGS: 0, error: error.message }
  }
}

/**
 * 記錄 COGS 更新日誌到 inventory_movements
 */
export async function logCOGSUpdate(
  productId: number,
  referenceType: 'stock_in_edit' | 'stock_in_deletion',
  referenceId: number,
  oldAvgCost: number,
  newAvgCost: number,
  affectedSalesCount: number
) {
  try {
    await supabaseAdmin.from('inventory_movements').insert({
      product_id: productId,
      movement_type: 'adjustment',
      size: null,
      quantity: 0,
      previous_total: 0,
      current_total: 0,
      reference_type: referenceType,
      reference_id: referenceId,
      note: `COGS 自動同步更新: 平均成本從 $${oldAvgCost.toFixed(2)} 變更為 $${newAvgCost.toFixed(2)}，影響 ${affectedSalesCount} 筆銷售記錄`,
    })
  } catch (error) {
    console.error('記錄 COGS 更新日誌失敗:', error)
  }
}
