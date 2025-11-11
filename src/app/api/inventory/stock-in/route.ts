import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { processStockIn, calculateTotalQuantity } from '@/lib/inventory-utils'
import { SizeQuantities } from '@/lib/database.types'

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
