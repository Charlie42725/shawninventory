import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { processStockIn, calculateTotalQuantity } from '@/lib/inventory-utils'
import { SizeQuantities } from '@/lib/database.types'
import { updateProductSalesCOGS, logCOGSUpdate } from '@/lib/update-sales-cogs'

// GET - 查詢進貨記錄
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('category_id')
    const limit = searchParams.get('limit') || '50'

    const query = supabaseAdmin
      .from('stock_in')
      .select('*, category:product_categories(*)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))

    if (categoryId) {
      query.eq('category_id', parseInt(categoryId))
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error fetching stock-in records:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stock-in records' },
      { status: 500 }
    )
  }
}

// POST - 創建進貨記錄
export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      date,
      order_type,
      category_id,
      product_name,
      color,
      ip_category,
      size_quantities,
      unit_cost,
      note,
      created_by = 'system',
    } = body

    // 驗證必填欄位
    if (!order_type || !category_id || !product_name || !unit_cost) {
      return NextResponse.json(
        { error: '缺少必填欄位: order_type, category_id, product_name, unit_cost' },
        { status: 400 }
      )
    }

    // 計算總數量
    const sizeQty = size_quantities as SizeQuantities || {}
    const total_quantity = calculateTotalQuantity(sizeQty)

    if (total_quantity <= 0) {
      return NextResponse.json(
        { error: '總數量必須大於 0' },
        { status: 400 }
      )
    }

    const total_cost = unit_cost * total_quantity

    // 處理進貨
    const result = await processStockIn({
      date: date || new Date().toISOString().split('T')[0],
      order_type,
      category_id: parseInt(category_id),
      product_name,
      color: color || null,
      ip_category: ip_category || null,
      size_quantities: sizeQty,
      total_quantity,
      unit_cost: parseFloat(unit_cost),
      total_cost,
      note: note || null,
      created_by,
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: `進貨成功: ${product_name} x ${total_quantity}`,
    })

  } catch (error: any) {
    console.error('Error creating stock-in:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create stock-in' },
      { status: 500 }
    )
  }
}

// DELETE - 刪除進貨記錄並回退庫存
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const force = searchParams.get('force') === 'true'  // 強制刪除（當產品不存在時）

    if (!id) {
      return NextResponse.json(
        { error: '缺少進貨記錄 ID' },
        { status: 400 }
      )
    }

    // 1. 查詢進貨記錄
    const { data: stockInRecord, error: fetchError } = await supabaseAdmin
      .from('stock_in')
      .select('*')
      .eq('id', parseInt(id))
      .single()

    if (fetchError || !stockInRecord) {
      return NextResponse.json(
        { error: '找不到進貨記錄' },
        { status: 404 }
      )
    }

    // 2. 查詢對應的產品
    let query = supabaseAdmin
      .from('products')
      .select('*')
      .eq('category_id', stockInRecord.category_id)
      .eq('product_name', stockInRecord.product_name)

    // 處理 color 欄位 (可能是 null 或空字串)
    if (stockInRecord.color) {
      query = query.eq('color', stockInRecord.color)
    } else {
      query = query.is('color', null)
    }

    const { data: product, error: productError } = await query.single()

    // 如果找不到產品（可能已被合併或刪除）
    if (productError || !product) {
      // 如果有 force 參數，允許直接刪除進貨記錄（跳過回退庫存）
      if (force) {
        const { error: deleteError } = await supabaseAdmin
          .from('stock_in')
          .delete()
          .eq('id', parseInt(id))

        if (deleteError) {
          throw deleteError
        }

        return NextResponse.json({
          success: true,
          message: `已強制刪除進貨記錄（對應產品已不存在，無法回退庫存）: ${stockInRecord.product_name} x ${stockInRecord.total_quantity}`,
        })
      }

      // 否則返回錯誤，提示用戶可以使用強制刪除
      return NextResponse.json(
        {
          error: '找不到對應的產品，可能已被合併或刪除。如需強制刪除請加上 force=true 參數',
          canForceDelete: true
        },
        { status: 404 }
      )
    }

    // 3. 計算回退後的庫存
    const sizeQuantities = stockInRecord.size_quantities as SizeQuantities || {}
    const currentSizeStock = product.size_stock as Record<string, number> || {}
    const newSizeStock = { ...currentSizeStock }

    // 扣減各尺寸的庫存
    for (const [size, qty] of Object.entries(sizeQuantities)) {
      const currentQty = currentSizeStock[size] || 0
      const decreaseQty = qty as number

      if (currentQty < decreaseQty) {
        return NextResponse.json(
          { error: `無法刪除: ${size} 的庫存不足 (當前: ${currentQty}, 需要: ${decreaseQty})` },
          { status: 400 }
        )
      }

      newSizeStock[size] = currentQty - decreaseQty

      // 如果庫存為 0,移除該尺寸
      if (newSizeStock[size] === 0) {
        delete newSizeStock[size]
      }
    }

    // 4. 計算新的總庫存和成本
    const newTotalStock = product.total_stock - stockInRecord.total_quantity

    if (newTotalStock < 0) {
      return NextResponse.json(
        { error: `無法刪除: 總庫存不足` },
        { status: 400 }
      )
    }

    // 計算新的成本價值(扣除這次進貨的成本)
    const newTotalCostValue = product.total_cost_value - stockInRecord.total_cost

    // 計算新的平均成本
    const newAvgUnitCost = newTotalStock > 0
      ? newTotalCostValue / newTotalStock
      : 0

    // 5. 更新產品庫存
    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update({
        size_stock: newSizeStock,
        total_stock: newTotalStock,
        avg_unit_cost: newAvgUnitCost,
        total_cost_value: newTotalCostValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', product.id)

    if (updateError) {
      throw updateError
    }

    // 5.5 自動更新該產品所有銷售記錄的 COGS（方案 B）
    const oldAvgCost = product.avg_unit_cost
    if (Math.abs(newAvgUnitCost - oldAvgCost) > 0.01) {
      // 查詢該產品所有剩餘的進貨記錄，計算總進貨成本
      let stockInQuery = supabaseAdmin
        .from('stock_in')
        .select('total_cost')
        .eq('category_id', product.category_id)
        .eq('product_name', product.product_name)
        .neq('id', parseInt(id))  // 排除即將刪除的這筆

      if (product.color) {
        stockInQuery = stockInQuery.eq('color', product.color)
      } else {
        stockInQuery = stockInQuery.is('color', null)
      }

      const { data: remainingStockIns } = await stockInQuery
      const totalStockInCost = remainingStockIns?.reduce((sum, s) => sum + (s.total_cost || 0), 0) || 0

      const { updated } = await updateProductSalesCOGS(product.id, newAvgUnitCost, totalStockInCost)
      if (updated > 0) {
        await logCOGSUpdate(
          product.id,
          'stock_in_deletion',
          parseInt(id),
          oldAvgCost,
          newAvgUnitCost,
          updated
        )
      }
    }

    // 6. 記錄庫存異動
    await supabaseAdmin
      .from('inventory_movements')
      .insert({
        product_id: product.id,
        movement_type: 'adjustment',
        size: null,
        quantity: -stockInRecord.total_quantity,
        previous_total: product.total_stock,
        current_total: newTotalStock,
        reference_type: 'stock_in_deletion',
        reference_id: parseInt(id),
        note: `刪除進貨記錄 #${id}: ${stockInRecord.product_name}`,
      })

    // 7. 刪除進貨記錄
    const { error: deleteError } = await supabaseAdmin
      .from('stock_in')
      .delete()
      .eq('id', parseInt(id))

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: `已刪除進貨記錄並回退庫存: ${stockInRecord.product_name} x ${stockInRecord.total_quantity}`,
    })

  } catch (error: any) {
    console.error('Error deleting stock-in:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete stock-in' },
      { status: 500 }
    )
  }
}

// PUT - 更新進貨記錄
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '缺少進貨記錄 ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      date,
      order_type,
      unit_cost,
      note,
      size_quantities,
    } = body

    // 1. 先查詢進貨記錄獲取完整資訊
    const { data: stockInRecord, error: fetchError } = await supabaseAdmin
      .from('stock_in')
      .select('*')
      .eq('id', parseInt(id))
      .single()

    if (fetchError || !stockInRecord) {
      return NextResponse.json(
        { error: '找不到進貨記錄' },
        { status: 404 }
      )
    }

    const updateData: any = {}

    if (date) updateData.date = date
    if (order_type) updateData.order_type = order_type
    if (note !== undefined) updateData.note = note

    // 2. 查詢對應的產品
    let productQuery = supabaseAdmin
      .from('products')
      .select('*')
      .eq('category_id', stockInRecord.category_id)
      .eq('product_name', stockInRecord.product_name)

    // 處理 color 欄位
    if (stockInRecord.color) {
      productQuery = productQuery.eq('color', stockInRecord.color)
    } else {
      productQuery = productQuery.is('color', null)
    }

    const { data: product } = await productQuery.single()

    if (!product) {
      return NextResponse.json(
        { error: '找不到對應的產品' },
        { status: 404 }
      )
    }

    // 處理數量變更
    let newTotalQuantity = stockInRecord.total_quantity
    let quantityDifference = 0
    const oldSizeQuantities = stockInRecord.size_quantities as SizeQuantities || {}

    if (size_quantities) {
      const newSizeQuantities = size_quantities as SizeQuantities
      newTotalQuantity = calculateTotalQuantity(newSizeQuantities)

      if (newTotalQuantity <= 0) {
        return NextResponse.json(
          { error: '總數量必須大於 0' },
          { status: 400 }
        )
      }

      quantityDifference = newTotalQuantity - stockInRecord.total_quantity
      updateData.size_quantities = newSizeQuantities
      updateData.total_quantity = newTotalQuantity

      // 計算產品各尺寸的庫存變化
      const currentSizeStock = product.size_stock as Record<string, number> || {}
      const newSizeStock = { ...currentSizeStock }

      // 先扣除舊的數量,再加上新的數量
      for (const [size, oldQty] of Object.entries(oldSizeQuantities)) {
        const currentQty = currentSizeStock[size] || 0
        newSizeStock[size] = currentQty - (oldQty as number)
      }

      for (const [size, newQty] of Object.entries(newSizeQuantities)) {
        const currentQty = newSizeStock[size] || 0
        newSizeStock[size] = currentQty + (newQty as number)
      }

      // 檢查是否有負庫存
      for (const [size, qty] of Object.entries(newSizeStock)) {
        if (qty < 0) {
          return NextResponse.json(
            { error: `無法更新: ${size} 的庫存將變為負數` },
            { status: 400 }
          )
        }
        // 移除數量為0的尺寸
        if (qty === 0) {
          delete newSizeStock[size]
        }
      }

      // 更新產品庫存
      const newProductTotalStock = product.total_stock + quantityDifference

      if (newProductTotalStock < 0) {
        return NextResponse.json(
          { error: '無法更新: 總庫存將變為負數' },
          { status: 400 }
        )
      }

      // 計算新的成本
      const finalUnitCost = unit_cost !== undefined ? parseFloat(unit_cost) : stockInRecord.unit_cost
      const newTotalCost = finalUnitCost * newTotalQuantity
      const oldTotalCost = stockInRecord.total_cost

      const newTotalCostValue = product.total_cost_value - oldTotalCost + newTotalCost
      const newAvgUnitCost = newProductTotalStock > 0
        ? newTotalCostValue / newProductTotalStock
        : 0

      updateData.unit_cost = finalUnitCost
      updateData.total_cost = newTotalCost

      // 更新產品
      await supabaseAdmin
        .from('products')
        .update({
          size_stock: newSizeStock,
          total_stock: newProductTotalStock,
          avg_unit_cost: newAvgUnitCost,
          total_cost_value: newTotalCostValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id)

      // 自動更新該產品所有銷售記錄的 COGS（方案 B）
      const oldAvgCost = product.avg_unit_cost
      if (Math.abs(newAvgUnitCost - oldAvgCost) > 0.01) {
        // 查詢該產品所有進貨記錄（包含這次修改後的），計算總進貨成本
        let stockInQuery = supabaseAdmin
          .from('stock_in')
          .select('total_cost')
          .eq('category_id', product.category_id)
          .eq('product_name', product.product_name)

        if (product.color) {
          stockInQuery = stockInQuery.eq('color', product.color)
        } else {
          stockInQuery = stockInQuery.is('color', null)
        }

        const { data: allStockIns } = await stockInQuery
        // 排除當前進貨的舊成本，加上新成本
        const otherStockInsCost = allStockIns
          ?.filter(s => s !== null)
          .reduce((sum, s) => sum + (s.total_cost || 0), 0) || 0
        const totalStockInCost = otherStockInsCost - stockInRecord.total_cost + newTotalCost

        const { updated } = await updateProductSalesCOGS(product.id, newAvgUnitCost, totalStockInCost)
        if (updated > 0) {
          await logCOGSUpdate(
            product.id,
            'stock_in_edit',
            parseInt(id),
            oldAvgCost,
            newAvgUnitCost,
            updated
          )
        }
      }

      // 記錄庫存異動
      if (quantityDifference !== 0) {
        await supabaseAdmin
          .from('inventory_movements')
          .insert({
            product_id: product.id,
            movement_type: 'adjustment',
            size: null,
            quantity: quantityDifference,
            previous_total: product.total_stock,
            current_total: newProductTotalStock,
            reference_type: 'stock_in_edit',
            reference_id: parseInt(id),
            note: `編輯進貨記錄 #${id}: ${stockInRecord.product_name} (${quantityDifference > 0 ? '+' : ''}${quantityDifference})`,
          })
      }
    } else if (unit_cost !== undefined) {
      // 只更新單價,不更新數量
      const newUnitCost = parseFloat(unit_cost)
      const newTotalCost = newUnitCost * stockInRecord.total_quantity
      const oldTotalCost = stockInRecord.total_cost

      updateData.unit_cost = newUnitCost
      updateData.total_cost = newTotalCost

      // 重新計算產品的平均成本
      const newTotalCostValue = product.total_cost_value - oldTotalCost + newTotalCost
      const newAvgUnitCost = product.total_stock > 0
        ? newTotalCostValue / product.total_stock
        : 0

      await supabaseAdmin
        .from('products')
        .update({
          avg_unit_cost: newAvgUnitCost,
          total_cost_value: newTotalCostValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id)

      // 自動更新該產品所有銷售記錄的 COGS（方案 B）
      const oldAvgCost = product.avg_unit_cost
      if (Math.abs(newAvgUnitCost - oldAvgCost) > 0.01) {
        // 查詢該產品所有進貨記錄，計算總進貨成本
        let stockInQuery = supabaseAdmin
          .from('stock_in')
          .select('total_cost')
          .eq('category_id', product.category_id)
          .eq('product_name', product.product_name)

        if (product.color) {
          stockInQuery = stockInQuery.eq('color', product.color)
        } else {
          stockInQuery = stockInQuery.is('color', null)
        }

        const { data: allStockIns } = await stockInQuery
        // 排除當前進貨的舊成本，加上新成本
        const otherStockInsCost = allStockIns
          ?.filter(s => s !== null)
          .reduce((sum, s) => sum + (s.total_cost || 0), 0) || 0
        const totalStockInCost = otherStockInsCost - oldTotalCost + newTotalCost

        const { updated } = await updateProductSalesCOGS(product.id, newAvgUnitCost, totalStockInCost)
        if (updated > 0) {
          await logCOGSUpdate(
            product.id,
            'stock_in_edit',
            parseInt(id),
            oldAvgCost,
            newAvgUnitCost,
            updated
          )
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from('stock_in')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data,
      message: '進貨記錄已更新,產品庫存與成本已重新計算',
    })

  } catch (error: any) {
    console.error('Error updating stock-in:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update stock-in' },
      { status: 500 }
    )
  }
}
