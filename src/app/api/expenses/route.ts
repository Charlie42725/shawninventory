import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: expenses, error } = await supabaseAdmin
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json(expenses || [])
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { category, amount, note, date } = body

    // 驗證必填欄位
    if (!category || !amount || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: category, amount, date' },
        { status: 400 }
      )
    }

    const { data: expense, error } = await supabaseAdmin
      .from('expenses')
      .insert([
        {
          category,
          amount: parseInt(amount.toString()),
          note: note || null,
          date,
        }
      ])
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(expense)
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, category, amount, note, date } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Missing expense ID' },
        { status: 400 }
      )
    }

    const { data: expense, error } = await supabaseAdmin
      .from('expenses')
      .update({
        category,
        amount: parseInt(amount.toString()),
        note: note || null,
        date,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(expense)
  } catch (error) {
    console.error('Error updating expense:', error)
    return NextResponse.json(
      { error: 'Failed to update expense' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing expense ID' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('expenses')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    )
  }
}