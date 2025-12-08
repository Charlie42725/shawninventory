import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    console.log('=== 開始修復產品總成本價值 ===')

    // 獲取所有產品
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('id, product_name, total_stock, avg_unit_cost, total_cost_value')
      .order('id')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const results = []
    let fixedCount = 0
    let alreadyCorrect = 0

    for (const product of products) {
      const correctValue = product.total_stock * product.avg_unit_cost
      const diff = Math.abs(product.total_cost_value - correctValue)

      if (diff > 0.01) {
        const { error: updateError } = await supabaseAdmin
          .from('products')
          .update({
            total_cost_value: correctValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id)

        if (updateError) {
          results.push({
            id: product.id,
            name: product.product_name,
            status: 'error',
            error: updateError.message
          })
        } else {
          fixedCount++
          results.push({
            id: product.id,
            name: product.product_name,
            status: 'fixed',
            oldValue: product.total_cost_value,
            newValue: correctValue,
            diff: correctValue - product.total_cost_value
          })
        }
      } else {
        alreadyCorrect++
      }
    }

    return NextResponse.json({
      success: true,
      total: products.length,
      fixed: fixedCount,
      alreadyCorrect,
      results: results.filter(r => r.status === 'fixed')
    })

  } catch (error: any) {
    console.error('Fix total_cost_value error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
