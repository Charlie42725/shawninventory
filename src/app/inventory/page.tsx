'use client'

import { useEffect, useState } from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import { ORDER_TYPES } from '@/lib/database.types'

interface Category {
  id: number
  name: string
  size_config: { sizes?: string[] }
}

interface Product {
  id: number
  category_id: number
  product_name: string
  color: string | null
  ip_category: string | null
  size_stock: Record<string, number>
  total_stock: number
  avg_unit_cost: number
  total_cost_value: number
  category?: Category
}

interface StockInRecord {
  id: number
  date: string
  order_type: string
  product_name: string
  color: string | null
  ip_category: string | null
  total_quantity: number
  unit_cost: number
  total_cost: number
  note: string | null
  category?: Category
}

interface InventoryMovement {
  id: number
  product_id: number
  movement_type: string
  size: string | null
  quantity: number
  previous_total: number
  current_total: number
  reference_type: string
  reference_id: number | null
  note: string | null
  created_at: string
  product?: Product
}

export default function InventoryPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [stockInRecords, setStockInRecords] = useState<StockInRecord[]>([])
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'inventory' | 'stock-in' | 'movements'>('inventory')
  const [showStockInModal, setShowStockInModal] = useState(false)

  useEffect(() => {
    fetchData()
  }, [selectedCategory])

  const fetchData = async () => {
    setLoading(true)
    try {
      const categoryUrl = '/api/categories'
      const productUrl = selectedCategory
        ? `/api/inventory?category_id=${selectedCategory}`
        : '/api/inventory'
      const stockInUrl = selectedCategory
        ? `/api/inventory/stock-in?category_id=${selectedCategory}`
        : '/api/inventory/stock-in'
      const movementsUrl = '/api/inventory/movements?limit=50'

      const [categoriesRes, productsRes, stockInRes, movementsRes] = await Promise.all([
        fetch(categoryUrl),
        fetch(productUrl),
        fetch(stockInUrl),
        fetch(movementsUrl)
      ])

      if (!categoriesRes.ok || !productsRes.ok || !stockInRes.ok || !movementsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [categoriesData, productsData, stockInData, movementsData] = await Promise.all([
        categoriesRes.json(),
        productsRes.json(),
        stockInRes.json(),
        movementsRes.json()
      ])

      setCategories(categoriesData)
      setProducts(productsData)
      setStockInRecords(stockInData)
      setMovements(movementsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </ProtectedLayout>
    )
  }

  // 計算庫存統計
  const inventoryStats = {
    total: products.length,
    lowStock: products.filter(p => p.total_stock > 0 && p.total_stock < 10).length,
    outOfStock: products.filter(p => p.total_stock === 0).length,
    totalValue: products.reduce((sum, p) => sum + p.total_cost_value, 0)
  }

  return (
    <ProtectedLayout>
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">庫存管理</h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">管理產品庫存、進貨記錄與庫存異動</p>
          </div>
          <button
            onClick={() => setShowStockInModal(true)}
            className="btn bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center justify-center text-sm sm:text-base transition-colors whitespace-nowrap"
          >
            <span className="mr-2">+</span>
            新增進貨
          </button>
        </div>

        {/* 庫存統計卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-3 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-xs sm:text-sm">📊</span>
                  </div>
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">總產品數</dt>
                    <dd className="text-base sm:text-lg font-medium text-gray-900">{inventoryStats.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-3 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-xs sm:text-sm">⚠️</span>
                  </div>
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">低庫存</dt>
                    <dd className="text-base sm:text-lg font-medium text-yellow-600">{inventoryStats.lowStock}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-3 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-red-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-xs sm:text-sm">🚫</span>
                  </div>
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">缺貨</dt>
                    <dd className="text-base sm:text-lg font-medium text-red-600">{inventoryStats.outOfStock}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-3 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-xs sm:text-sm">💰</span>
                  </div>
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">庫存總值</dt>
                    <dd className="text-base sm:text-lg font-medium text-green-600">${inventoryStats.totalValue.toFixed(2)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 類別篩選 */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-sm sm:text-base font-medium transition-colors ${
              !selectedCategory
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            全部類別
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-sm sm:text-base font-medium transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* 頁籤 */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 px-4 sm:px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'inventory'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                當前庫存
              </button>
              <button
                onClick={() => setActiveTab('stock-in')}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'stock-in'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                進貨記錄
              </button>
              <button
                onClick={() => setActiveTab('movements')}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'movements'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                異動記錄
              </button>
            </nav>
          </div>

          <div className="p-3 sm:p-6">
            {activeTab === 'inventory' && <InventoryTable products={products} />}
            {activeTab === 'stock-in' && <StockInTable records={stockInRecords} />}
            {activeTab === 'movements' && <MovementsTable movements={movements} />}
          </div>
        </div>

        {/* 進貨 Modal */}
        {showStockInModal && (
          <StockInModal
            categories={categories}
            onClose={() => setShowStockInModal(false)}
            onSuccess={() => {
              setShowStockInModal(false)
              fetchData()
            }}
          />
        )}
      </div>
    </ProtectedLayout>
  )
}

// 庫存列表組件
function InventoryTable({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-4xl">📦</span>
        <h3 className="mt-2 text-sm font-medium text-gray-900">尚無庫存資料</h3>
        <p className="mt-1 text-sm text-gray-500">請先進行進貨操作</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto -mx-3 sm:mx-0">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              類別
            </th>
            <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              產品名稱
            </th>
            <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
              顏色/IP
            </th>
            <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
              尺寸庫存
            </th>
            <th className="px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              總庫存
            </th>
            <th className="px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
              平均成本
            </th>
            <th className="px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
              總成本價值
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-gray-50">
              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  {product.category?.name}
                </span>
              </td>
              <td className="px-3 sm:px-6 py-3 sm:py-4">
                <div className="text-xs sm:text-sm font-medium text-gray-900 break-words min-w-[100px] max-w-[150px] sm:max-w-none">
                  {product.product_name}
                  <div className="lg:hidden text-xs text-gray-500 mt-1">
                    {product.color || product.ip_category || ''}
                  </div>
                </div>
              </td>
              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden lg:table-cell">
                <span className="text-sm text-gray-600">
                  {product.color || product.ip_category || '-'}
                </span>
              </td>
              <td className="px-3 sm:px-6 py-3 sm:py-4 hidden xl:table-cell">
                <div className="text-sm text-gray-600 max-w-xs">
                  {Object.entries(product.size_stock).length > 0
                    ? Object.entries(product.size_stock)
                        .filter(([_, qty]) => qty > 0)
                        .map(([size, qty]) => `${size}:${qty}`)
                        .join(', ')
                    : '-'}
                </div>
              </td>
              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  product.total_stock === 0
                    ? 'bg-red-100 text-red-800'
                    : product.total_stock < 10
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                }`}>
                  {product.total_stock}
                </span>
              </td>
              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center text-xs sm:text-sm text-gray-900 hidden md:table-cell">
                ${product.avg_unit_cost.toFixed(2)}
              </td>
              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center text-xs sm:text-sm font-medium text-gray-900 hidden sm:table-cell">
                ${product.total_cost_value.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// 進貨記錄組件
function StockInTable({ records }: { records: StockInRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-4xl">📝</span>
        <h3 className="mt-2 text-sm font-medium text-gray-900">尚無進貨記錄</h3>
        <p className="mt-1 text-sm text-gray-500">進貨記錄會顯示在這裡</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              日期
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              類型
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              類別
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              產品名稱
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              顏色/IP
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              數量
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              單價
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              總成本
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {records.map((record) => (
            <tr key={record.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {new Date(record.date).toLocaleDateString('zh-TW')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  record.order_type === '進貨'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {record.order_type}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {record.category?.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {record.product_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {record.color || record.ip_category || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">
                {record.total_quantity}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                ${record.unit_cost.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900">
                ${record.total_cost.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// 異動記錄組件
function MovementsTable({ movements }: { movements: InventoryMovement[] }) {
  if (movements.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-4xl">📋</span>
        <h3 className="mt-2 text-sm font-medium text-gray-900">尚無異動記錄</h3>
        <p className="mt-1 text-sm text-gray-500">庫存異動會自動記錄在這裡</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              產品
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              尺寸
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              異動類型
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              數量變化
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              庫存變化
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              備註
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              時間
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {movements.map((movement) => (
            <tr key={movement.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {movement.product?.product_name || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                {movement.size || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  movement.movement_type === 'stock_in'
                    ? 'bg-green-100 text-green-800'
                    : movement.movement_type === 'sale'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                }`}>
                  {movement.movement_type === 'stock_in' ? '進貨' :
                   movement.movement_type === 'sale' ? '銷售' : '調整'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <span className={`font-medium ${
                  movement.quantity > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                {movement.previous_total} → {movement.current_total}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                <div className="truncate" title={movement.note || ''}>
                  {movement.note || '-'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                {new Date(movement.created_at).toLocaleDateString('zh-TW')}
                <div className="text-xs">
                  {new Date(movement.created_at).toLocaleTimeString('zh-TW')}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// 進貨 Modal
function StockInModal({
  categories,
  onClose,
  onSuccess
}: {
  categories: Category[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    order_type: '進貨',
    category_id: '',
    product_name: '',
    color: '',
    ip_category: '',
    size_quantities: {} as Record<string, number>,
    unit_cost: '',
    note: ''
  })
  const [loading, setLoading] = useState(false)

  const selectedCategory = categories.find(c => c.id === parseInt(formData.category_id || '0'))
  const availableSizes = selectedCategory?.size_config?.sizes || []

  const updateSizeQuantity = (size: string, value: string) => {
    const qty = parseInt(value) || 0
    setFormData(prev => ({
      ...prev,
      size_quantities: {
        ...prev.size_quantities,
        [size]: qty
      }
    }))
  }

  const calculateTotal = () => {
    const totalQty = Object.values(formData.size_quantities).reduce((sum, qty) => sum + qty, 0)
    const unitCost = parseFloat(formData.unit_cost) || 0
    return (totalQty * unitCost).toFixed(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/inventory/stock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (data.success) {
        alert(data.message)
        onSuccess()
      } else {
        alert(`錯誤: ${data.error}`)
        setLoading(false)
      }
    } catch (error) {
      console.error('Failed to submit stock-in:', error)
      alert('進貨失敗')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">新增進貨</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1">日期</label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1">類型</label>
              <select
                value={formData.order_type}
                onChange={e => setFormData({...formData, order_type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 text-sm"
                required
              >
                {ORDER_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">類別 *</label>
            <select
              value={formData.category_id}
              onChange={e => setFormData({...formData, category_id: e.target.value, size_quantities: {}})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              required
            >
              <option value="">請選擇類別</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">產品名稱 *</label>
            <input
              type="text"
              value={formData.product_name}
              onChange={e => setFormData({...formData, product_name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              required
            />
          </div>

          {selectedCategory?.name !== '潮玩' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">顏色</label>
              <input
                type="text"
                value={formData.color}
                onChange={e => setFormData({...formData, color: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                placeholder="例如: 黑色、白色"
              />
            </div>
          )}

          {selectedCategory?.name === '潮玩' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">IP分類</label>
              <input
                type="text"
                value={formData.ip_category}
                onChange={e => setFormData({...formData, ip_category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                placeholder="例如: 海賊王、火影忍者"
              />
            </div>
          )}

          {/* 尺寸數量輸入 */}
          {availableSizes.length > 0 && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-2">各尺寸數量</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableSizes.map(size => (
                  <div key={size} className="flex items-center gap-2">
                    <label className="w-12 sm:w-16 text-xs sm:text-sm text-gray-700 flex-shrink-0">{size}:</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.size_quantities[size] || ''}
                      onChange={e => updateSizeQuantity(size, e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {availableSizes.length === 0 && formData.category_id && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">數量 *</label>
              <input
                type="number"
                min="1"
                value={formData.size_quantities['default'] || ''}
                onChange={e => updateSizeQuantity('default', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">單價成本 ($) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.unit_cost}
              onChange={e => setFormData({...formData, unit_cost: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">備註</label>
            <textarea
              rows={2}
              value={formData.note}
              onChange={e => setFormData({...formData, note: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              placeholder="選填"
            />
          </div>

          <div className="bg-gray-100 p-3 sm:p-4 rounded">
            <p className="text-base sm:text-lg font-bold text-gray-900">
              總成本: ${calculateTotal()}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm sm:text-base text-gray-700 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md text-sm sm:text-base hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '處理中...' : '確認進貨'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
