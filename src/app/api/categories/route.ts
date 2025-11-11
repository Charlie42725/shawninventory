import { NextResponse } from 'next/server'
import { getProductCategories } from '@/lib/inventory-utils'

// GET - 取得所有產品類別
export async function GET() {
  try {
    const categories = await getProductCategories()
    return NextResponse.json(categories)
  } catch (error: any) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}
