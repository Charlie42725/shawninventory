import { NextResponse } from 'next/server'
import { getProducts } from '@/lib/inventory-utils'

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
