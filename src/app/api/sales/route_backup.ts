import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: sales, error } = await supabaseAdmin
      .from('sales')
      .select(`
        *,
        products (
          model,
          name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json(sales || [])
  } catch (error) {
    console.error('Error fetching sales:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { product_id, quantity, price, channel, note } = body

    const { data: sale, error } = await supabaseAdmin
      .from('sales')
      .insert([
        {
          product_id,
          quantity,
          price,
          channel,
          note,
          shipped: false,
        }
      ])
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(sale)
  } catch (error) {
    console.error('Error creating sale:', error)
    return NextResponse.json(
      { error: 'Failed to create sale' },
      { status: 500 }
    )
  }
}