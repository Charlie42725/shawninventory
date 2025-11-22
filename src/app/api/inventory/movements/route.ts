import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET - 獲取庫存異動記錄
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const normalized_key = searchParams.get('normalized_key')
    const movement_type = searchParams.get('movement_type')
    const limit = parseInt(searchParams.get('limit') || '100')

    let query = supabaseAdmin
      .from('inventory_movements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (movement_type) {
      query = query.eq('movement_type', movement_type)
    }

    const { data: movements, error } = await query

    if (error) {
      throw error
    }

    // 為每個異動記錄添加產品資訊
    const enrichedMovements = await Promise.all(
      movements?.map(async (movement) => {
        if (movement.product_id) {
          const { data: product } = await supabaseAdmin
            .from('products')
            .select('product_name, color, ip_category')
            .eq('id', movement.product_id)
            .single()

          return {
            ...movement,
            product_info: product || {
              product_name: 'Unknown',
              color: null,
              ip_category: null
            }
          }
        }
        return movement
      }) || []
    )

    return NextResponse.json(enrichedMovements)
  } catch (error) {
    console.error('Error fetching stock movements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock movements' },
      { status: 500 }
    )
  }
}