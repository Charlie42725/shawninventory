import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    console.log('=== 開始修復產品總成本價值 ===')

    // 獲取所有產品
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('id, product_name, category_id, color, total_stock, avg_unit_cost, total_cost_value')
      .order('id')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const results = []
    let fixedCount = 0
    let alreadyCorrect = 0

    for (const product of products) {
      // === 重新計算正確的平均成本和庫存價值 ===
      // 1. 查詢該產品的所有進貨記錄
      let stockInQuery = supabaseAdmin
        .from('stock_in')
        .select('total_cost, total_quantity')
        .eq('category_id', product.category_id)
        .eq('product_name', product.product_name)

      if (product.color) {
        stockInQuery = stockInQuery.eq('color', product.color)
      } else {
        stockInQuery = stockInQuery.is('color', null)
      }

      const { data: stockIns } = await stockInQuery

      // 2. 計算總進貨成本和數量
      let totalStockInCost = 0
      let totalStockInQty = 0

      stockIns?.forEach(si => {
        totalStockInCost += si.total_cost || 0
        totalStockInQty += si.total_quantity || 0
      })

      // 3. 計算正確的平均成本（基於總進貨）
      const correctAvgUnitCost = totalStockInQty > 0 ? totalStockInCost / totalStockInQty : 0

      // 4. 計算正確的庫存價值（基於當前庫存）
      const correctTotalCostValue = product.total_stock * correctAvgUnitCost

      // 檢查是否需要修復
      const avgCostDiff = Math.abs(product.avg_unit_cost - correctAvgUnitCost)
      const costValueDiff = Math.abs(product.total_cost_value - correctTotalCostValue)

      if (avgCostDiff > 0.01 || costValueDiff > 0.01) {
        const { error: updateError } = await supabaseAdmin
          .from('products')
          .update({
            avg_unit_cost: correctAvgUnitCost,
            total_cost_value: correctTotalCostValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id)

        if (updateError) {
          results.push({
            id: product.id,
            name: product.product_name,
            status: 'error',
            error: updateError.message
          })
        } else {
          fixedCount++
          results.push({
            id: product.id,
            name: product.product_name,
            status: 'fixed',
            totalStock: product.total_stock,
            oldAvgCost: product.avg_unit_cost,
            newAvgCost: correctAvgUnitCost,
            oldValue: product.total_cost_value,
            newValue: correctTotalCostValue,
            avgCostDiff: correctAvgUnitCost - product.avg_unit_cost,
            valueDiff: correctTotalCostValue - product.total_cost_value
          })
        }
      } else {
        alreadyCorrect++
      }
    }

    return NextResponse.json({
      success: true,
      total: products.length,
      fixed: fixedCount,
      alreadyCorrect,
      results: results.filter(r => r.status === 'fixed')
    })

  } catch (error: any) {
    console.error('Fix total_cost_value error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
