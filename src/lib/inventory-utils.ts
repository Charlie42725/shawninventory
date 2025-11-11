import { supabaseAdmin } from './supabase'
import { SizeQuantities, Database } from './database.types'

type Product = Database['public']['Tables']['products']['Row']
type StockIn = Database['public']['Tables']['stock_in']['Insert']

/**
 * 處理進貨並更新庫存
 */
export async function processStockIn(stockInData: StockIn) {
  try {
    // 1. 插入進貨記錄
    const { data: stockIn, error: stockInError } = await supabaseAdmin
      .from('stock_in')
      .insert([stockInData])
      .select()
      .single()

    if (stockInError) {
      throw new Error(`插入進貨記錄失敗: ${stockInError.message}`)
    }

    // 2. 查找或創建產品
    const { data: existingProduct, error: findError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('category_id', stockInData.category_id)
      .eq('product_name', stockInData.product_name)
      .eq('color', stockInData.color || null)
      .maybeSingle()

    if (findError) {
      throw new Error(`查詢產品失敗: ${findError.message}`)
    }

    let productId: number
    let previousStock = 0
    let previousSizeStock: SizeQuantities = {}
    let previousTotalCostValue = 0

    if (existingProduct) {
      // 產品已存在，更新庫存
      productId = existingProduct.id
      previousStock = existingProduct.total_stock
      previousSizeStock = existingProduct.size_stock as SizeQuantities || {}
      previousTotalCostValue = existingProduct.total_cost_value

      // 合併尺寸庫存
      const newSizeStock = { ...previousSizeStock }
      const incomingSizes = stockInData.size_quantities as SizeQuantities || {}

      for (const [size, qty] of Object.entries(incomingSizes)) {
        newSizeStock[size] = (newSizeStock[size] || 0) + qty
      }

      const newTotalStock = previousStock + stockInData.total_quantity

      // 計算新的加權平均成本
      const newTotalCostValue = previousTotalCostValue + stockInData.total_cost
      const newAvgUnitCost = newTotalStock > 0 ? newTotalCostValue / newTotalStock : 0

      // 更新產品
      const { error: updateError } = await supabaseAdmin
        .from('products')
        .update({
          size_stock: newSizeStock,
          total_stock: newTotalStock,
          avg_unit_cost: newAvgUnitCost,
          total_cost_value: newTotalCostValue,
        })
        .eq('id', productId)

      if (updateError) {
        throw new Error(`更新產品失敗: ${updateError.message}`)
      }

    } else {
      // 創建新產品
      const { data: newProduct, error: insertError } = await supabaseAdmin
        .from('products')
        .insert([{
          category_id: stockInData.category_id,
          product_name: stockInData.product_name,
          color: stockInData.color,
          ip_category: stockInData.ip_category,
          size_stock: stockInData.size_quantities || {},
          total_stock: stockInData.total_quantity,
          avg_unit_cost: stockInData.unit_cost,
          total_cost_value: stockInData.total_cost,
        }])
        .select()
        .single()

      if (insertError) {
        throw new Error(`創建產品失敗: ${insertError.message}`)
      }

      productId = newProduct.id
    }

    // 3. 記錄庫存異動 (每個尺寸一筆記錄)
    const movements = []
    const incomingSizes = stockInData.size_quantities as SizeQuantities || {}

    if (Object.keys(incomingSizes).length > 0) {
      // 有尺寸的產品
      for (const [size, qty] of Object.entries(incomingSizes)) {
        const previousSizeQty = previousSizeStock[size] || 0
        movements.push({
          product_id: productId,
          movement_type: 'stock_in' as const,
          size: size,
          quantity: qty,
          previous_total: previousSizeQty,
          current_total: previousSizeQty + qty,
          reference_type: 'stock_in',
          reference_id: stockIn.id,
          note: `進貨: ${stockInData.product_name} (${size})`,
          created_by: stockInData.created_by,
        })
      }
    } else {
      // 無尺寸的產品 (如潮玩)
      movements.push({
        product_id: productId,
        movement_type: 'stock_in' as const,
        size: null,
        quantity: stockInData.total_quantity,
        previous_total: previousStock,
        current_total: previousStock + stockInData.total_quantity,
        reference_type: 'stock_in',
        reference_id: stockIn.id,
        note: `進貨: ${stockInData.product_name}`,
        created_by: stockInData.created_by,
      })
    }

    if (movements.length > 0) {
      const { error: movementError } = await supabaseAdmin
        .from('inventory_movements')
        .insert(movements)

      if (movementError) {
        console.error('記錄庫存異動失敗:', movementError)
      }
    }

    return {
      success: true,
      stockIn,
      productId,
    }

  } catch (error: any) {
    console.error('處理進貨失敗:', error)
    throw error
  }
}

/**
 * 處理銷售並扣減庫存
 */
export async function processSale(saleData: {
  date?: string
  customer_type: '零售' | '批發' | '預購'
  product_id: number
  product_name: string
  size?: string | null
  channel?: '社團' | '店家' | '國外' | null
  shipping_method?: '現貨面交' | '店到店' | '宅配' | null
  unit_price: number
  quantity: number
  total_amount: number
  note?: string | null
  created_by?: string | null
}) {
  try {
    // 1. 查詢產品當前庫存
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', saleData.product_id)
      .single()

    if (productError || !product) {
      throw new Error(`找不到產品: ${saleData.product_id}`)
    }

    // 2. 檢查庫存是否足夠
    const sizeStock = product.size_stock as SizeQuantities || {}

    if (saleData.size) {
      // 有尺寸的產品
      const availableQty = sizeStock[saleData.size] || 0
      if (availableQty < saleData.quantity) {
        throw new Error(`庫存不足: ${saleData.product_name} (${saleData.size}) - 可用: ${availableQty}, 需要: ${saleData.quantity}`)
      }
    } else {
      // 無尺寸的產品
      if (product.total_stock < saleData.quantity) {
        throw new Error(`庫存不足: ${saleData.product_name} - 可用: ${product.total_stock}, 需要: ${saleData.quantity}`)
      }
    }

    // 3. 插入銷售記錄
    const { data: sale, error: saleError } = await supabaseAdmin
      .from('sales')
      .insert([saleData])
      .select()
      .single()

    if (saleError) {
      throw new Error(`插入銷售記錄失敗: ${saleError.message}`)
    }

    // 4. 扣減庫存
    const newSizeStock = { ...sizeStock }
    let newTotalStock = product.total_stock - saleData.quantity

    if (saleData.size) {
      newSizeStock[saleData.size] = (newSizeStock[saleData.size] || 0) - saleData.quantity
    }

    // 計算新的成本 (按比例減少)
    const costReductionRatio = newTotalStock / product.total_stock
    const newTotalCostValue = product.total_cost_value * costReductionRatio
    const newAvgUnitCost = newTotalStock > 0 ? newTotalCostValue / newTotalStock : product.avg_unit_cost

    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update({
        size_stock: newSizeStock,
        total_stock: newTotalStock,
        avg_unit_cost: newAvgUnitCost,
        total_cost_value: newTotalCostValue,
      })
      .eq('id', saleData.product_id)

    if (updateError) {
      throw new Error(`更新庫存失敗: ${updateError.message}`)
    }

    // 5. 記錄庫存異動
    const previousQty = saleData.size ? (sizeStock[saleData.size] || 0) : product.total_stock
    const currentQty = previousQty - saleData.quantity

    const { error: movementError } = await supabaseAdmin
      .from('inventory_movements')
      .insert([{
        product_id: saleData.product_id,
        movement_type: 'sale',
        size: saleData.size || null,
        quantity: -saleData.quantity,  // 負數表示減少
        previous_total: previousQty,
        current_total: currentQty,
        reference_type: 'sale',
        reference_id: sale.id,
        note: `銷售: ${saleData.product_name}${saleData.size ? ` (${saleData.size})` : ''}`,
        created_by: saleData.created_by,
      }])

    if (movementError) {
      console.error('記錄庫存異動失敗:', movementError)
    }

    return {
      success: true,
      sale,
      previousStock: product.total_stock,
      newStock: newTotalStock,
    }

  } catch (error: any) {
    console.error('處理銷售失敗:', error)
    throw error
  }
}

/**
 * 查詢產品 (支援模糊搜尋)
 */
export async function findProduct(params: {
  category_id?: number
  product_name: string
  color?: string | null
}) {
  const query = supabaseAdmin
    .from('products')
    .select('*, category:product_categories(*)')

  if (params.category_id) {
    query.eq('category_id', params.category_id)
  }

  // 精確匹配
  query.eq('product_name', params.product_name)
  query.eq('color', params.color || null)

  const { data, error } = await query.maybeSingle()

  if (error) {
    throw new Error(`查詢產品失敗: ${error.message}`)
  }

  return data
}

/**
 * 查詢產品列表 (支援分類篩選)
 */
export async function getProducts(categoryId?: number) {
  const query = supabaseAdmin
    .from('products')
    .select('*, category:product_categories(*)')
    .order('updated_at', { ascending: false })

  if (categoryId) {
    query.eq('category_id', categoryId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`查詢產品列表失敗: ${error.message}`)
  }

  return data
}

/**
 * 取得產品類別列表
 */
export async function getProductCategories() {
  const { data, error } = await supabaseAdmin
    .from('product_categories')
    .select('*')
    .order('id')

  if (error) {
    throw new Error(`查詢產品類別失敗: ${error.message}`)
  }

  return data
}

/**
 * 計算尺寸總數量
 */
export function calculateTotalQuantity(sizeQuantities: SizeQuantities): number {
  return Object.values(sizeQuantities).reduce((sum, qty) => sum + qty, 0)
}

/**
 * 驗證尺寸配置
 */
export function validateSizes(sizes: string[], allowedSizes: string[]): boolean {
  if (allowedSizes.length === 0) {
    // 無尺寸限制 (如潮玩)
    return sizes.length === 0
  }

  return sizes.every(size => allowedSizes.includes(size))
}
