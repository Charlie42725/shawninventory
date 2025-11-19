import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET - 獲取產品名稱建議
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || ''
    const categoryId = searchParams.get('category_id')

    // 從 products 表和 stock_in 表獲取唯一的產品名稱
    let productQuery = supabaseAdmin
      .from('products')
      .select('product_name, color, ip_category, category_id')
      .order('product_name')

    if (categoryId) {
      productQuery = productQuery.eq('category_id', parseInt(categoryId))
    }

    if (query) {
      productQuery = productQuery.ilike('product_name', `%${query}%`)
    }

    const { data: products, error } = await productQuery.limit(20)

    if (error) {
      throw error
    }

    // 去重並格式化結果
    const suggestions = products?.map(p => ({
      product_name: p.product_name,
      color: p.color,
      ip_category: p.ip_category,
      category_id: p.category_id
    })) || []

    return NextResponse.json(suggestions)
  } catch (error: any) {
    console.error('Error fetching product suggestions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch suggestions' },
      { status: 500 }
    )
  }
}
