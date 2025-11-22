import { NextResponse } from 'next/server'
import { getProducts } from '@/lib/inventory-utils'
import { supabaseAdmin } from '@/lib/supabase'

// GET - 取得產品列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('category_id')

    const products = await getProducts(
      categoryId ? parseInt(categoryId) : undefined
    )

    return NextResponse.json(products)
  } catch (error: any) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// PUT - 更新產品資訊
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '缺少產品 ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      product_name,
      color,
      ip_category,
      size_stock,
    } = body

    // 查詢現有產品
    const { data: existingProduct, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', parseInt(id))
      .single()

    if (fetchError || !existingProduct) {
      return NextResponse.json(
        { error: '找不到產品' },
        { status: 404 }
      )
    }

    const updateData: any = {}

    // 更新產品名稱
    if (product_name) updateData.product_name = product_name

    // 更新顏色或IP分類
    if (color !== undefined) updateData.color = color
    if (ip_category !== undefined) updateData.ip_category = ip_category

    // 如果更新尺寸庫存，需要重新計算總庫存
    if (size_stock !== undefined) {
      const newSizeStock = size_stock as Record<string, number>
      const newTotalStock = Object.values(newSizeStock).reduce((sum, qty) => sum + qty, 0)

      updateData.size_stock = newSizeStock
      updateData.total_stock = newTotalStock

      // 重新計算總成本價值（保持平均成本不變）
      if (existingProduct.avg_unit_cost) {
        updateData.total_cost_value = existingProduct.avg_unit_cost * newTotalStock
      }
    }

    updateData.updated_at = new Date().toISOString()

    // 更新產品
    const { data, error } = await supabaseAdmin
      .from('products')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single()

    if (error) {
      throw error
    }

    // 記錄庫存異動（如果有庫存變化）
    if (size_stock !== undefined) {
      await supabaseAdmin
        .from('inventory_movements')
        .insert({
          product_id: parseInt(id),
          movement_type: 'adjustment',
          size: null,
          quantity: updateData.total_stock - existingProduct.total_stock,
          previous_total: existingProduct.total_stock,
          current_total: updateData.total_stock,
          reference_type: 'manual_adjustment',
          reference_id: null,
          note: '手動調整庫存',
        })
    }

    return NextResponse.json({
      success: true,
      data,
      message: '產品資訊已更新',
    })

  } catch (error: any) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update product' },
      { status: 500 }
    )
  }
}

// DELETE - 刪除產品
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '缺少產品 ID' },
        { status: 400 }
      )
    }

    // 查詢產品
    const { data: product, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('product_name, total_stock')
      .eq('id', parseInt(id))
      .single()

    if (fetchError || !product) {
      return NextResponse.json(
        { error: '找不到產品' },
        { status: 404 }
      )
    }

    // 檢查是否有庫存
    if (product.total_stock > 0) {
      return NextResponse.json(
        { error: '無法刪除有庫存的產品，請先清空庫存' },
        { status: 400 }
      )
    }

    // 檢查是否有相關的銷售記錄
    const { data: salesRecords } = await supabaseAdmin
      .from('sales')
      .select('id')
      .eq('product_id', parseInt(id))
      .limit(1)

    if (salesRecords && salesRecords.length > 0) {
      return NextResponse.json(
        { error: '無法刪除有銷售記錄的產品' },
        { status: 400 }
      )
    }

    // 刪除相關的庫存異動記錄
    await supabaseAdmin
      .from('inventory_movements')
      .delete()
      .eq('product_id', parseInt(id))

    // 刪除產品
    const { error: deleteError } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', parseInt(id))

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: `產品「${product.product_name}」已刪除`,
    })

  } catch (error: any) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete product' },
      { status: 500 }
    )
  }
}

// POST - 手動創建產品
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      category_id,
      product_name,
      color,
      ip_category,
      size_stock,
    } = body

    // 驗證必填欄位
    if (!category_id || !product_name) {
      return NextResponse.json(
        { error: '缺少必填欄位: category_id, product_name' },
        { status: 400 }
      )
    }

    // 檢查產品是否已存在
    const { data: existingProduct } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('category_id', parseInt(category_id))
      .eq('product_name', product_name)
      .eq('color', color || null)
      .single()

    if (existingProduct) {
      return NextResponse.json(
        { error: '產品已存在，無法重複創建' },
        { status: 400 }
      )
    }

    // 計算總庫存
    const sizeStockData = size_stock as Record<string, number> || {}
    const total_stock = Object.values(sizeStockData).reduce((sum, qty) => sum + qty, 0)

    // 創建產品
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        category_id: parseInt(category_id),
        product_name,
        color: color || null,
        ip_category: ip_category || null,
        size_stock: sizeStockData,
        total_stock,
        avg_unit_cost: 0,
        total_cost_value: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data,
      message: `產品「${product_name}」已創建`,
    })

  } catch (error: any) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create product' },
      { status: 500 }
    )
  }
}
