import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST() {
  try {
    console.log('開始初始化庫存管理系統...')

    // 檢查 inventory 表是否存在，嘗試查詢一下
    const { error: inventoryCheckError } = await supabaseAdmin
      .from('inventory')
      .select('id')
      .limit(1)

    if (inventoryCheckError) {
      return NextResponse.json({
        success: false,
        message: '庫存表尚未創建，請先在 Supabase 控制台中執行 SQL 腳本創建所需的表',
        error: inventoryCheckError.message
      }, { status: 400 })
    }

    // 基於現有產品數據初始化庫存記錄
    console.log('正在基於銷售數據初始化庫存記錄...')

    // 獲取產品數據 (使用現有的產品 API 邏輯)
    const { data: salesData, error: salesFetchError } = await supabaseAdmin
      .from('sales')
      .select('product_name')
      .limit(1000)

    if (salesFetchError) {
      throw salesFetchError
    }

    if (!salesData || salesData.length === 0) {
      return NextResponse.json({
        success: true,
        message: '庫存系統初始化完成，但沒有找到銷售數據來創建產品記錄',
        tables_created: true,
        products_initialized: 0
      })
    }

    // 使用簡化的產品正規化邏輯
    const normalizedProducts = new Map()

    salesData.forEach((sale) => {
      try {
        const originalName = sale.product_name
        if (!originalName || typeof originalName !== 'string') return

        // 基本清理
        const cleanText = originalName
          .replace(/[（）「」【】〈〉]/g, '')
          .replace(/現貨|預購|售完不補|優惠免運中|限量|熱銷/g, '')
          .replace(/\s+/g, ' ')
          .trim()

        // 提取顏色
        let color = 'default'
        const colorMatch = cleanText.match(/顏色[-:]([^,，]+)/)
        if (colorMatch) {
          color = colorMatch[1].trim()
        } else {
          // 尋找常見顏色
          const colors = ['黑色', '白色', '透明', '熔岩黑', '骨白', '透紅', '透黑']
          for (const c of colors) {
            if (cleanText.includes(c)) {
              color = c
              break
            }
          }
        }

        // 提取型號
        let model = 'default'
        const modelMatch = cleanText.match(/型號[-:]([^,，]+)/)
        if (modelMatch) {
          model = modelMatch[1].trim()
        } else if (cleanText.includes('AirPods')) {
          if (cleanText.includes('pro/pro2通用')) {
            model = 'AirPods pro/pro2通用'
          } else if (cleanText.match(/\d+代/)) {
            const genMatch = cleanText.match(/(\d+代)/)
            if (genMatch) {
              model = `AirPods ${genMatch[1]}`
            }
          }
        }

        // 生成主名稱
        let mainName = cleanText
          .replace(/顏色[-:][^,，]+/g, '')
          .replace(/型號[-:][^,，]+/g, '')
          .replace(new RegExp(color, 'g'), '')
          .replace(/pro\/pro2通用|\d+代/g, '')
          .replace(/[,，]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()

        if (!mainName) {
          mainName = originalName.slice(0, 20) // 使用原始名稱的前20個字符
        }

        // 統一產品名稱
        if (mainName.match(/HY320|Hy320/i)) {
          mainName = 'HY320 Mini 智慧投影機'
        }

        const normalizedKey = `${mainName}|${color}|${model}`

        if (!normalizedProducts.has(normalizedKey)) {
          normalizedProducts.set(normalizedKey, {
            normalized_key: normalizedKey,
            product_name: mainName,
            color: color,
            model: model,
            current_stock: 0,
            min_stock: 10,
            max_stock: 100,
            unit_cost: 0
          })
        }
      } catch (error) {
        console.error('處理產品時發生錯誤:', error)
      }
    })

    // 插入庫存記錄
    const inventoryRecords = Array.from(normalizedProducts.values())
    console.log(`準備插入 ${inventoryRecords.length} 個產品記錄`)

    if (inventoryRecords.length > 0) {
      // 分批插入，避免一次插入太多記錄
      const batchSize = 50
      let insertedCount = 0

      for (let i = 0; i < inventoryRecords.length; i += batchSize) {
        const batch = inventoryRecords.slice(i, i + batchSize)
        
        try {
          const { error: insertError } = await supabaseAdmin
            .from('inventory')
            .upsert(batch, { 
              onConflict: 'normalized_key',
              ignoreDuplicates: true 
            })

          if (insertError) {
            console.error(`批次 ${Math.floor(i/batchSize) + 1} 插入失敗:`, insertError)
          } else {
            insertedCount += batch.length
            console.log(`已插入批次 ${Math.floor(i/batchSize) + 1}, 累計: ${insertedCount}`)
          }
        } catch (error) {
          console.error(`批次插入失敗:`, error)
        }
      }

      return NextResponse.json({
        success: true,
        message: '庫存管理系統初始化完成！',
        tables_created: true,
        products_initialized: insertedCount,
        total_products_found: inventoryRecords.length
      })
    }

    return NextResponse.json({
      success: true,
      message: '庫存管理系統初始化完成，但沒有找到有效的產品數據',
      tables_created: true,
      products_initialized: 0
    })

  } catch (error) {
    console.error('庫存系統初始化失敗:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '初始化失敗: ' + (error instanceof Error ? error.message : String(error))
      },
      { status: 500 }
    )
  }
}