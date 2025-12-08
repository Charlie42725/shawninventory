import { supabaseAdmin } from './supabase'

/**
 * 更新指定產品的所有銷售記錄的 COGS
 * 當進貨記錄被修改或刪除後，需要重新計算該產品的平均成本，
 * 並更新所有相關銷售記錄的 cost_of_goods_sold
 */
export async function updateProductSalesCOGS(
  productId: number,
  newAvgUnitCost: number
): Promise<{ updated: number; error?: string }> {
  try {
    // 1. 查詢該產品的所有銷售記錄
    const { data: sales, error: salesError } = await supabaseAdmin
      .from('sales')
      .select('id, quantity, cost_of_goods_sold')
      .eq('product_id', productId)

    if (salesError) {
      return { updated: 0, error: salesError.message }
    }

    if (!sales || sales.length === 0) {
      // 沒有銷售記錄，無需更新
      return { updated: 0 }
    }

    // 2. 批量更新所有銷售記錄的 COGS
    const updates = sales.map(sale => ({
      id: sale.id,
      cost_of_goods_sold: newAvgUnitCost * sale.quantity
    }))

    // 使用 upsert 批量更新
    const { error: updateError, count } = await supabaseAdmin
      .from('sales')
      .upsert(updates, { onConflict: 'id' })

    if (updateError) {
      return { updated: 0, error: updateError.message }
    }

    console.log(
      `✅ 已更新產品 #${productId} 的 ${updates.length} 筆銷售記錄 COGS (新平均成本: $${newAvgUnitCost.toFixed(2)})`
    )

    return { updated: updates.length }
  } catch (error: any) {
    console.error('更新銷售 COGS 失敗:', error)
    return { updated: 0, error: error.message }
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
