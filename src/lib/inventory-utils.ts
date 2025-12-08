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
    let productQuery = supabaseAdmin
      .from('products')
      .select('*')
      .eq('category_id', stockInData.category_id)
      .eq('product_name', stockInData.product_name)

    // 正確處理 null 值匹配
    if (stockInData.color) {
      productQuery = productQuery.eq('color', stockInData.color)
    } else {
      productQuery = productQuery.is('color', null)
    }

    const { data: existingProduct, error: findError } = await productQuery.maybeSingle()

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
  cost_of_goods_sold?: number | null  // 新增：銷售成本字段
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

    // 如果產品使用尺寸管理（size_stock 不為空）
    if (Object.keys(sizeStock).length > 0) {
      // 確定要扣減的尺寸 key
      const sizeKey = saleData.size || 'default'

      // 扣減對應尺寸的庫存
      if (newSizeStock[sizeKey] !== undefined) {
        newSizeStock[sizeKey] = Math.max(0, (newSizeStock[sizeKey] || 0) - saleData.quantity)
      } else {
        // 如果指定的尺寸不存在，嘗試 default
        if (newSizeStock['default'] !== undefined) {
          newSizeStock['default'] = Math.max(0, (newSizeStock['default'] || 0) - saleData.quantity)
        }
      }
    }
    // 無尺寸產品（size_stock 為空對象）不需要處理 size_stock

    // 計算新的總庫存（從 size_stock 計算以確保一致性）
    const newTotalStock = Object.keys(newSizeStock).length > 0
      ? Object.values(newSizeStock).reduce((sum, qty) => sum + qty, 0)
      : product.total_stock - saleData.quantity

    // 計算新的成本 (扣減實際銷售的成本)
    // 使用加權平均成本，銷售成本 = 平均單位成本 × 銷售數量
    const costOfGoodsSold = product.avg_unit_cost * saleData.quantity

    // 防禦性檢查：禁止銷售成本為 0 的產品
    if (costOfGoodsSold === 0) {
      throw new Error(
        `無法銷售：產品「${saleData.product_name}」的平均成本為 0。\n` +
        `這通常表示產品尚未進貨或進貨記錄未正確處理。\n` +
        `請先新增進貨記錄，確保產品有正確的成本後再進行銷售。\n` +
        `當前產品狀態：庫存 ${product.total_stock}，平均成本 $${product.avg_unit_cost}`
      )
    }

    const newTotalCostValue = Math.max(0, product.total_cost_value - costOfGoodsSold)

    // 平均成本保持不變（即使庫存清空也要保留，用於財務報表計算）
    const newAvgUnitCost = product.avg_unit_cost

    // 將計算出的 COGS 加入銷售數據（如果未提供）
    if (saleData.cost_of_goods_sold === undefined || saleData.cost_of_goods_sold === null) {
      saleData.cost_of_goods_sold = costOfGoodsSold
    }

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
  let query = supabaseAdmin
    .from('products')
    .select('*, category:product_categories(*)')

  if (params.category_id) {
    query = query.eq('category_id', params.category_id)
  }

  // 精確匹配
  query = query.eq('product_name', params.product_name)

  // 正確處理 null 值匹配
  if (params.color) {
    query = query.eq('color', params.color)
  } else {
    query = query.is('color', null)
  }

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
