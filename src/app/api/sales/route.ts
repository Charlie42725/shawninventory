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

        // 重新計算成本 (恢復比例)
        const previousTotalCostValue = product.total_cost_value
        const restoredCost = (sale.unit_price * sale.quantity)  // 使用銷售單價估算
        const newTotalCostValue = previousTotalCostValue + restoredCost
        const newAvgUnitCost = newTotalStock > 0 ? newTotalCostValue / newTotalStock : product.avg_unit_cost

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
      note,
    } = body

    // 只允許更新部分欄位(日期、客戶類型、通路、運送方式、單價、備註)
    // 不允許更改產品、尺寸、數量等核心欄位(需要先刪除再新增)
    const updateData: any = {}

    if (date) updateData.date = date
    if (customer_type) updateData.customer_type = customer_type
    if (channel !== undefined) updateData.channel = channel
    if (shipping_method !== undefined) updateData.shipping_method = shipping_method
    if (note !== undefined) updateData.note = note

    // 如果要更新單價,需要重新計算總金額
    if (unit_price !== undefined) {
      // 先查詢銷售記錄獲取數量
      const { data: saleRecord } = await supabaseAdmin
        .from('sales')
        .select('quantity')
        .eq('id', parseInt(id))
        .single()

      if (saleRecord) {
        updateData.unit_price = parseFloat(unit_price)
        updateData.total_amount = parseFloat(unit_price) * saleRecord.quantity
      }
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
      message: '銷售記錄已更新',
    })

  } catch (error: any) {
    console.error('Error updating sale:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update sale' },
      { status: 500 }
    )
  }
}
