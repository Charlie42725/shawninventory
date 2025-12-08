import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { processSale } from '@/lib/inventory-utils'

// GET - 查詢銷售記錄
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '100'
    const customerType = searchParams.get('customer_type')

    const query = supabaseAdmin
      .from('sales')
      .select('*, product:products(*, category:product_categories(*))')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))

    if (customerType) {
      query.eq('customer_type', customerType)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error fetching sales:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sales' },
      { status: 500 }
    )
  }
}

// POST - 創建銷售記錄
export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      date,
      customer_type,
      product_id,
      product_name,
      size,
      channel,
      shipping_method,
      unit_price,
      quantity,
      note,
      created_by = 'system',
    } = body

    // 驗證必填欄位
    if (!customer_type || !product_id || !product_name || !unit_price || !quantity) {
      return NextResponse.json(
        { error: '缺少必填欄位: customer_type, product_id, product_name, unit_price, quantity' },
        { status: 400 }
      )
    }

    const total_amount = parseFloat(unit_price) * parseInt(quantity)

    // 處理銷售並扣減庫存
    const result = await processSale({
      date: date || new Date().toISOString().split('T')[0],
      customer_type,
      product_id: parseInt(product_id),
      product_name,
      size: size || null,
      channel: channel || null,
      shipping_method: shipping_method || null,
      unit_price: parseFloat(unit_price),
      quantity: parseInt(quantity),
      total_amount,
      note: note || null,
      created_by,
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: `銷售成功: ${product_name}${size ? ` (${size})` : ''} x ${quantity}`,
    })

  } catch (error: any) {
    console.error('Error creating sale:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create sale' },
      { status: 500 }
    )
  }
}

// DELETE - 刪除銷售記錄 (並恢復庫存)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const saleId = searchParams.get('id')

    if (!saleId) {
      return NextResponse.json(
        { error: '缺少銷售記錄 ID' },
        { status: 400 }
      )
    }

    // 查詢銷售記錄
    const { data: sale, error: saleError } = await supabaseAdmin
      .from('sales')
      .select('*')
      .eq('id', parseInt(saleId))
      .single()

    if (saleError || !sale) {
      return NextResponse.json(
        { error: '找不到銷售記錄' },
        { status: 404 }
      )
    }

    // 查詢產品
    if (sale.product_id) {
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', sale.product_id)
        .single()

      if (!productError && product) {
        // 恢復庫存
        const sizeStock = product.size_stock as Record<string, number> || {}
        const newSizeStock = { ...sizeStock }

        if (sale.size) {
          newSizeStock[sale.size] = (newSizeStock[sale.size] || 0) + sale.quantity
        }

        const newTotalStock = product.total_stock + sale.quantity

        // 刪除銷售記錄時，平均成本不變（產品採購成本沒變）
        // 只需根據新庫存重新計算 total_cost_value
        const newAvgUnitCost = product.avg_unit_cost
        const newTotalCostValue = newTotalStock * newAvgUnitCost

        await supabaseAdmin
          .from('products')
          .update({
            size_stock: newSizeStock,
            total_stock: newTotalStock,
            avg_unit_cost: newAvgUnitCost,
            total_cost_value: newTotalCostValue,
          })
          .eq('id', sale.product_id)

        // 記錄庫存異動
        await supabaseAdmin
          .from('inventory_movements')
          .insert([{
            product_id: sale.product_id,
            movement_type: 'adjustment',
            size: sale.size || null,
            quantity: sale.quantity,  // 正數表示增加
            previous_total: product.total_stock,
            current_total: newTotalStock,
            reference_type: 'sale_deletion',
            reference_id: sale.id,
            note: `刪除銷售記錄恢復庫存: ${sale.product_name}${sale.size ? ` (${sale.size})` : ''}`,
          }])
      }
    }

    // 刪除銷售記錄
    const { error: deleteError } = await supabaseAdmin
      .from('sales')
      .delete()
      .eq('id', parseInt(saleId))

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: '銷售記錄已刪除,庫存已恢復',
    })

  } catch (error: any) {
    console.error('Error deleting sale:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete sale' },
      { status: 500 }
    )
  }
}

// PUT - 更新銷售記錄
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '缺少銷售記錄 ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      date,
      customer_type,
      channel,
      shipping_method,
      unit_price,
      quantity,
      note,
    } = body

    // 1. 先查詢原始銷售記錄
    const { data: originalSale, error: fetchError } = await supabaseAdmin
      .from('sales')
      .select('*')
      .eq('id', parseInt(id))
      .single()

    if (fetchError || !originalSale) {
      return NextResponse.json(
        { error: '找不到銷售記錄' },
        { status: 404 }
      )
    }

    // 允許更新部分欄位(日期、客戶類型、通路、運送方式、單價、數量、備註)
    const updateData: any = {}

    if (date) updateData.date = date
    if (customer_type) updateData.customer_type = customer_type
    if (channel !== undefined) updateData.channel = channel
    if (shipping_method !== undefined) updateData.shipping_method = shipping_method
    if (note !== undefined) updateData.note = note

    // 處理數量或單價變更
    const newQuantity = quantity !== undefined ? parseInt(quantity) : originalSale.quantity
    const newUnitPrice = unit_price !== undefined ? parseFloat(unit_price) : originalSale.unit_price
    const quantityDiff = newQuantity - originalSale.quantity

    // 2. 如果數量有變化，需要處理庫存退補
    if (quantityDiff !== 0) {
      // 查詢產品
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', originalSale.product_id)
        .single()

      if (productError || !product) {
        return NextResponse.json(
          { error: '找不到對應的產品' },
          { status: 404 }
        )
      }

      // 計算需要調整的庫存
      // quantityDiff > 0: 銷售數量增加，需要扣減更多庫存（檢查是否足夠）
      // quantityDiff < 0: 銷售數量減少，需要補回庫存
      const stockAdjustment = -quantityDiff  // 負數表示扣減，正數表示補回

      if (quantityDiff > 0) {
        // 需要扣減更多庫存，檢查是否足夠
        const sizeStock = product.size_stock as Record<string, number> || {}
        const availableQty = originalSale.size
          ? (sizeStock[originalSale.size] || 0)
          : product.total_stock

        if (availableQty < quantityDiff) {
          return NextResponse.json(
            { error: `庫存不足: 可用庫存 ${availableQty}，需要額外 ${quantityDiff}` },
            { status: 400 }
          )
        }
      }

      // 更新產品庫存
      const sizeStock = product.size_stock as Record<string, number> || {}
      const newSizeStock = { ...sizeStock }

      if (originalSale.size && Object.keys(sizeStock).length > 0) {
        // 有尺寸的產品
        newSizeStock[originalSale.size] = (newSizeStock[originalSale.size] || 0) + stockAdjustment
        if (newSizeStock[originalSale.size] === 0) {
          delete newSizeStock[originalSale.size]
        }
      }

      const newTotalStock = product.total_stock + stockAdjustment

      // 重新計算 COGS（根據新數量）
      const newCOGS = product.avg_unit_cost * newQuantity

      // 更新 total_cost_value（根據新庫存重新計算）
      // total_cost_value = 庫存數量 × 平均成本
      const newTotalCostValue = Math.max(0, newTotalStock * product.avg_unit_cost)

      await supabaseAdmin
        .from('products')
        .update({
          size_stock: newSizeStock,
          total_stock: newTotalStock,
          total_cost_value: newTotalCostValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id)

      // 記錄庫存異動
      await supabaseAdmin
        .from('inventory_movements')
        .insert({
          product_id: product.id,
          movement_type: 'adjustment',
          size: originalSale.size || null,
          quantity: stockAdjustment,
          previous_total: product.total_stock,
          current_total: newTotalStock,
          reference_type: 'sale_edit',
          reference_id: originalSale.id,
          note: `編輯銷售記錄 #${id}: 數量從 ${originalSale.quantity} 改為 ${newQuantity} (${stockAdjustment > 0 ? '+' : ''}${stockAdjustment} 庫存)`,
        })

      // 更新銷售記錄的數量和 COGS
      updateData.quantity = newQuantity
      updateData.cost_of_goods_sold = newCOGS
    }

    // 更新單價和總金額
    if (unit_price !== undefined || quantity !== undefined) {
      updateData.unit_price = newUnitPrice
      updateData.total_amount = newUnitPrice * newQuantity
    }

    const { data, error } = await supabaseAdmin
      .from('sales')
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
      message: '銷售記錄已更新' + (quantityDiff !== 0 ? `，庫存已調整 ${quantityDiff > 0 ? '-' : '+'}${Math.abs(quantityDiff)}` : ''),
    })

  } catch (error: any) {
    console.error('Error updating sale:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update sale' },
      { status: 500 }
    )
  }
}
