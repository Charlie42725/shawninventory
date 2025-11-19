'use client'

import { useEffect, useState } from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import ConfirmDialog from '@/components/ConfirmDialog'
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
  size_quantities: Record<string, number>
  total_quantity: number
  unit_cost: number
  total_cost: number
  note: string | null
  category_id: number
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
  const [editingStockIn, setEditingStockIn] = useState<StockInRecord | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  })
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    id: number | null
    name: string
    type: 'product' | 'stock-in'
  }>({
    isOpen: false,
    id: null,
    name: '',
    type: 'product'
  })

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

  const handleDeleteProduct = async (id: number, name: string) => {
    setDeleteConfirm({
      isOpen: true,
      id,
      name,
      type: 'product'
    })
  }

  const handleDeleteStockIn = async (id: number, name: string) => {
    setDeleteConfirm({
      isOpen: true,
      id,
      name,
      type: 'stock-in'
    })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return

    try {
      const endpoint = deleteConfirm.type === 'product'
        ? `/api/inventory?id=${deleteConfirm.id}`
        : `/api/inventory/stock-in?id=${deleteConfirm.id}`

      const res = await fetch(endpoint, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (data.success) {
        alert(data.message)
        fetchData()
      } else {
        alert(`錯誤: ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting:', error)
      alert('刪除失敗')
    } finally {
      setDeleteConfirm({ isOpen: false, id: null, name: '', type: 'product' })
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">庫存管理</h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">管理產品庫存、進貨記錄與庫存異動</p>
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
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg transition-colors">
            <div className="p-3 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-xs sm:text-sm">📊</span>
                  </div>
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">總產品數</dt>
                    <dd className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100">{inventoryStats.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg transition-colors">
            <div className="p-3 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-xs sm:text-sm">⚠️</span>
                  </div>
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">低庫存</dt>
                    <dd className="text-base sm:text-lg font-medium text-yellow-600 dark:text-yellow-500">{inventoryStats.lowStock}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg transition-colors">
            <div className="p-3 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-red-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-xs sm:text-sm">🚫</span>
                  </div>
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">缺貨</dt>
                    <dd className="text-base sm:text-lg font-medium text-red-600 dark:text-red-500">{inventoryStats.outOfStock}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg transition-colors">
            <div className="p-3 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-xs sm:text-sm">💰</span>
                  </div>
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">庫存總值</dt>
                    <dd className="text-base sm:text-lg font-medium text-green-600 dark:text-green-500">${inventoryStats.totalValue.toFixed(2)}</dd>
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
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
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
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* 頁籤 */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg transition-colors">
          <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 px-4 sm:px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'inventory'
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                當前庫存
              </button>
              <button
                onClick={() => setActiveTab('stock-in')}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'stock-in'
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                進貨記錄
              </button>
              <button
                onClick={() => setActiveTab('movements')}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'movements'
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                異動記錄
              </button>
            </nav>
          </div>

          <div className="p-3 sm:p-6">
            {activeTab === 'inventory' && (
              <InventoryTable
                products={products}
                onEdit={setEditingProduct}
                onDelete={handleDeleteProduct}
              />
            )}
            {activeTab === 'stock-in' && (
              <div className="space-y-4">
                {/* 日期篩選 */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">開始日期</label>
                    <input
                      type="date"
                      value={dateFilter.startDate}
                      onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">結束日期</label>
                    <input
                      type="date"
                      value={dateFilter.endDate}
                      onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors"
                    />
                  </div>
                  {(dateFilter.startDate || dateFilter.endDate) && (
                    <div className="flex items-end">
                      <button
                        onClick={() => setDateFilter({ startDate: '', endDate: '' })}
                        className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
                      >
                        清除篩選
                      </button>
                    </div>
                  )}
                </div>
                <StockInTable
                  records={stockInRecords}
                  onDelete={handleDeleteStockIn}
                  onEdit={setEditingStockIn}
                  dateFilter={dateFilter}
                />
              </div>
            )}
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

        {/* 編輯進貨 Modal */}
        {editingStockIn && (
          <EditStockInModal
            record={editingStockIn}
            categories={categories}
            onClose={() => setEditingStockIn(null)}
            onSuccess={() => {
              setEditingStockIn(null)
              fetchData()
            }}
          />
        )}

        {/* 編輯產品 Modal */}
        {editingProduct && (
          <EditProductModal
            product={editingProduct}
            categories={categories}
            onClose={() => setEditingProduct(null)}
            onSuccess={() => {
              setEditingProduct(null)
              fetchData()
            }}
          />
        )}

        {/* 刪除確認對話框 */}
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          title="確認刪除"
          message={
            deleteConfirm.type === 'product'
              ? `確定要刪除產品「${deleteConfirm.name}」嗎？只能刪除庫存為 0 且無銷售記錄的產品。`
              : `確定要刪除進貨記錄「${deleteConfirm.name}」嗎？庫存將會回退。`
          }
          confirmText="刪除"
          cancelText="取消"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm({ isOpen: false, id: null, name: '', type: 'product' })}
          type="danger"
        />
      </div>
    </ProtectedLayout>
  )
}

// 分頁組件
function Pagination({
  currentPage,
  totalPages,
  onPageChange
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
      }
    }
    return pages
  }

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mt-4 flex-wrap">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        上一頁
      </button>
      {getPageNumbers().map((page, index) => (
        typeof page === 'number' ? (
          <button
            key={index}
            onClick={() => onPageChange(page)}
            className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition-colors ${
              currentPage === page
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {page}
          </button>
        ) : (
          <span key={index} className="px-1 sm:px-2 text-gray-500 dark:text-gray-400">...</span>
        )
      ))}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        下一頁
      </button>
    </div>
  )
}

// 庫存列表組件
function InventoryTable({
  products,
  onEdit,
  onDelete
}: {
  products: Product[]
  onEdit: (product: Product) => void
  onDelete: (id: number, name: string) => void
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50
  const totalPages = Math.ceil(products.length / itemsPerPage)
  const paginatedProducts = products.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // 當資料變更時重置頁碼
  useEffect(() => {
    setCurrentPage(1)
  }, [products.length])

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-4xl">📦</span>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">尚無庫存資料</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">請先進行進貨操作或手動新增產品</p>
      </div>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto -mx-3 sm:mx-0">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                類別
              </th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                產品名稱
              </th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                顏色/IP
              </th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden xl:table-cell">
                尺寸庫存
              </th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                總庫存
              </th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                平均成本
              </th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                總成本價值
              </th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedProducts.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                  <span className="px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {product.category?.name}
                  </span>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4">
                  <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 break-words min-w-[100px] max-w-[150px] sm:max-w-none">
                    {product.product_name}
                    <div className="lg:hidden text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {product.color || product.ip_category || ''}
                    </div>
                  </div>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden lg:table-cell">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {product.color || product.ip_category || '-'}
                  </span>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 hidden xl:table-cell">
                  <div className="text-sm text-gray-600 dark:text-gray-400 max-w-xs">
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
                      ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                      : product.total_stock < 10
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                        : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  }`}>
                    {product.total_stock}
                  </span>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center text-xs sm:text-sm text-gray-900 dark:text-gray-100 hidden md:table-cell">
                  ${product.avg_unit_cost.toFixed(2)}
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 hidden sm:table-cell">
                  ${product.total_cost_value.toFixed(2)}
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center text-xs sm:text-sm font-medium">
                  <button
                    onClick={() => onEdit(product)}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-3 transition-colors"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => onDelete(product.id, product.product_name)}
                    className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors"
                  >
                    刪除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center">
        共 {products.length} 筆資料，第 {currentPage} / {totalPages} 頁
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  )
}

// 進貨記錄組件
function StockInTable({
  records,
  onDelete,
  onEdit,
  dateFilter
}: {
  records: StockInRecord[]
  onDelete: (id: number, name: string) => void
  onEdit: (record: StockInRecord) => void
  dateFilter: { startDate: string; endDate: string }
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // 日期篩選
  const filteredRecords = records.filter((record) => {
    const recordDate = new Date(record.date)
    const start = dateFilter.startDate ? new Date(dateFilter.startDate) : null
    const end = dateFilter.endDate ? new Date(dateFilter.endDate) : null

    if (start && recordDate < start) return false
    if (end && recordDate > end) return false
    return true
  })

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage)
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // 當篩選變更時重置頁碼
  useEffect(() => {
    setCurrentPage(1)
  }, [dateFilter.startDate, dateFilter.endDate, records.length])

  if (filteredRecords.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-4xl">📝</span>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">尚無進貨記錄</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {dateFilter.startDate || dateFilter.endDate ? '沒有符合篩選條件的記錄' : '進貨記錄會顯示在這裡'}
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                日期
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                類型
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                類別
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                產品名稱
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                顏色/IP
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                數量
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                單價
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                總成本
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                備註
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedRecords.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  {new Date(record.date).toLocaleDateString('zh-TW')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    record.order_type === '進貨'
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                  }`}>
                    {record.order_type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  {record.category?.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  {record.product_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  {record.color || record.ip_category || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900 dark:text-gray-100">
                  {record.total_quantity}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600 dark:text-gray-400">
                  ${record.unit_cost.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900 dark:text-gray-100">
                  ${record.total_cost.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                  <div className="truncate" title={record.note || ''}>
                    {record.note || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <button
                    onClick={() => onEdit(record)}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-3 transition-colors"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => onDelete(record.id, record.product_name)}
                    className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors"
                  >
                    刪除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center">
        共 {filteredRecords.length} 筆資料，第 {currentPage} / {totalPages} 頁
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  )
}

// 異動記錄組件
function MovementsTable({ movements }: { movements: InventoryMovement[] }) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50
  const totalPages = Math.ceil(movements.length / itemsPerPage)
  const paginatedMovements = movements.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // 當資料變更時重置頁碼
  useEffect(() => {
    setCurrentPage(1)
  }, [movements.length])

  if (movements.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-4xl">📋</span>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">尚無異動記錄</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">庫存異動會自動記錄在這裡</p>
      </div>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                產品
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                尺寸
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                異動類型
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                數量變化
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                庫存變化
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                備註
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                時間
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedMovements.map((movement) => (
              <tr key={movement.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  {movement.product?.product_name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600 dark:text-gray-400">
                  {movement.size || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    movement.movement_type === 'stock_in'
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      : movement.movement_type === 'sale'
                        ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                  }`}>
                    {movement.movement_type === 'stock_in' ? '進貨' :
                     movement.movement_type === 'sale' ? '銷售' : '調整'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`font-medium ${
                    movement.quantity > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                  {movement.previous_total} → {movement.current_total}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                  <div className="truncate" title={movement.note || ''}>
                    {movement.note || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
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
      <div className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center">
        共 {movements.length} 筆資料，第 {currentPage} / {totalPages} 頁
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
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
  const [costInputMode, setCostInputMode] = useState<'unit' | 'total'>('unit') // 'unit' = 單價, 'total' = 總成本
  const [totalCostInput, setTotalCostInput] = useState('')
  const [suggestions, setSuggestions] = useState<Array<{
    product_name: string
    color: string | null
    ip_category: string | null
    category_id: number
  }>>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionLoading, setSuggestionLoading] = useState(false)

  // 獲取產品名稱建議
  const fetchSuggestions = async (query: string, categoryId: string) => {
    if (!query || query.length < 1) {
      setSuggestions([])
      return
    }

    setSuggestionLoading(true)
    try {
      const url = categoryId
        ? `/api/inventory/suggestions?query=${encodeURIComponent(query)}&category_id=${categoryId}`
        : `/api/inventory/suggestions?query=${encodeURIComponent(query)}`

      const res = await fetch(url)
      const data = await res.json()

      if (Array.isArray(data)) {
        setSuggestions(data)
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error)
    } finally {
      setSuggestionLoading(false)
    }
  }

  // 當產品名稱輸入變化時
  const handleProductNameChange = (value: string) => {
    setFormData(prev => ({ ...prev, product_name: value }))
    fetchSuggestions(value, formData.category_id)
    setShowSuggestions(true)
  }

  // 選擇建議
  const selectSuggestion = (suggestion: typeof suggestions[0]) => {
    setFormData(prev => ({
      ...prev,
      product_name: suggestion.product_name,
      color: suggestion.color || '',
      ip_category: suggestion.ip_category || ''
    }))
    setShowSuggestions(false)
    setSuggestions([])
  }

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

  const getTotalQuantity = () => {
    return Object.values(formData.size_quantities).reduce((sum, qty) => sum + qty, 0)
  }

  const calculateTotal = () => {
    const totalQty = getTotalQuantity()
    const unitCost = parseFloat(formData.unit_cost) || 0
    return (totalQty * unitCost).toFixed(2)
  }

  // 當輸入總成本時,自動計算單價
  const handleTotalCostChange = (value: string) => {
    setTotalCostInput(value)
    const totalQty = getTotalQuantity()
    if (totalQty > 0 && value) {
      const totalCost = parseFloat(value)
      const unitCost = (totalCost / totalQty).toFixed(2)
      setFormData(prev => ({ ...prev, unit_cost: unitCost }))
    }
  }

  // 當輸入單價時,同步清空總成本輸入
  const handleUnitCostChange = (value: string) => {
    setFormData(prev => ({ ...prev, unit_cost: value }))
    setTotalCostInput('')
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
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto transition-colors">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">新增進貨</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl transition-colors">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">日期</label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 text-sm transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">類型</label>
              <select
                value={formData.order_type}
                onChange={e => setFormData({...formData, order_type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 text-sm transition-colors"
                required
              >
                {ORDER_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">類別 *</label>
            <select
              value={formData.category_id}
              onChange={e => setFormData({...formData, category_id: e.target.value, size_quantities: {}})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors"
              required
            >
              <option value="">請選擇類別</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">產品名稱 *</label>
            <input
              type="text"
              value={formData.product_name}
              onChange={e => handleProductNameChange(e.target.value)}
              onFocus={() => formData.product_name && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors"
              placeholder="輸入關鍵字搜尋現有產品"
              required
              autoComplete="off"
            />
            {/* 自動完成下拉選單 */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectSuggestion(suggestion)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 text-sm transition-colors"
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">{suggestion.product_name}</div>
                    {(suggestion.color || suggestion.ip_category) && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {suggestion.color || suggestion.ip_category}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
            {showSuggestions && suggestionLoading && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg p-3 text-sm text-gray-500 dark:text-gray-400">
                搜尋中...
              </div>
            )}
          </div>

          {selectedCategory?.name !== '潮玩' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">顏色</label>
              <input
                type="text"
                value={formData.color}
                onChange={e => setFormData({...formData, color: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors"
                placeholder="例如: 黑色、白色"
              />
            </div>
          )}

          {selectedCategory?.name === '潮玩' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">IP分類</label>
              <input
                type="text"
                value={formData.ip_category}
                onChange={e => setFormData({...formData, ip_category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors"
                placeholder="例如: 海賊王、火影忍者"
              />
            </div>
          )}

          {/* 尺寸數量輸入 */}
          {availableSizes.length > 0 && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">各尺寸數量</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableSizes.map(size => (
                  <div key={size} className="flex items-center gap-2">
                    <label className="w-12 sm:w-16 text-xs sm:text-sm text-gray-700 dark:text-gray-300 flex-shrink-0">{size}:</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.size_quantities[size] || ''}
                      onChange={e => updateSizeQuantity(size, e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 text-sm transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {availableSizes.length === 0 && formData.category_id && (
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">數量 *</label>
              <input
                type="number"
                min="1"
                value={formData.size_quantities['default'] || ''}
                onChange={e => updateSizeQuantity('default', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors"
                required
              />
            </div>
          )}

          {/* 成本輸入區域 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">成本 *</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCostInputMode('unit')}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    costInputMode === 'unit'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  輸入單價
                </button>
                <button
                  type="button"
                  onClick={() => setCostInputMode('total')}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    costInputMode === 'total'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  輸入總成本
                </button>
              </div>
            </div>

            {costInputMode === 'unit' ? (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">單價 ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unit_cost}
                  onChange={e => handleUnitCostChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors"
                  placeholder="每件商品的成本"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">總成本 ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalCostInput}
                  onChange={e => handleTotalCostChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors"
                  placeholder="全部商品的總成本"
                  required={costInputMode === 'total'}
                />
                {formData.unit_cost && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    自動計算單價: ${formData.unit_cost}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">備註</label>
            <textarea
              rows={2}
              value={formData.note}
              onChange={e => setFormData({...formData, note: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors"
              placeholder="選填"
            />
          </div>

          <div className="bg-gray-100 dark:bg-gray-900 p-3 sm:p-4 rounded transition-colors">
            <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
              總成本: ${calculateTotal()}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm sm:text-base text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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

// 編輯進貨 Modal
function EditStockInModal({
  record,
  categories,
  onClose,
  onSuccess
}: {
  record: StockInRecord
  categories: Category[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    date: record.date,
    order_type: record.order_type,
    unit_cost: record.unit_cost.toString(),
    note: record.note || '',
    size_quantities: { ...record.size_quantities } as Record<string, number>
  })
  const [loading, setLoading] = useState(false)
  const [costInputMode, setCostInputMode] = useState<'unit' | 'total'>('unit')
  const [totalCostInput, setTotalCostInput] = useState('')

  const selectedCategory = categories.find(c => c.id === record.category_id)
  const availableSizes = selectedCategory?.size_config?.sizes || []

  const getTotalQuantity = () => {
    return Object.values(formData.size_quantities).reduce((sum, qty) => sum + qty, 0)
  }

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
    const unitCost = parseFloat(formData.unit_cost) || 0
    const totalQty = getTotalQuantity()
    return (totalQty * unitCost).toFixed(2)
  }

  // 當輸入總成本時,自動計算單價
  const handleTotalCostChange = (value: string) => {
    setTotalCostInput(value)
    const totalQty = getTotalQuantity()
    if (value && totalQty > 0) {
      const totalCost = parseFloat(value)
      const unitCost = (totalCost / totalQty).toFixed(2)
      setFormData(prev => ({ ...prev, unit_cost: unitCost }))
    }
  }

  // 當輸入單價時,同步清空總成本輸入
  const handleUnitCostChange = (value: string) => {
    setFormData(prev => ({ ...prev, unit_cost: value }))
    setTotalCostInput('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch(`/api/inventory/stock-in?id=${record.id}`, {
        method: 'PUT',
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
      console.error('Failed to update stock-in:', error)
      alert('更新失敗')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto transition-colors">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">編輯進貨記錄</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl transition-colors">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* 顯示產品信息(只讀) */}
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md transition-colors">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">產品資訊</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">類別:</span> <span className="text-gray-900 dark:text-gray-100">{record.category?.name}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">產品:</span> <span className="text-gray-900 dark:text-gray-100">{record.product_name}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">顏色/IP:</span> <span className="text-gray-900 dark:text-gray-100">{record.color || record.ip_category || '-'}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              註:產品名稱無法修改,如需變更請刪除後重新建立
            </p>
          </div>

          {/* 尺寸數量輸入 */}
          {availableSizes.length > 0 ? (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">各尺寸數量</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableSizes.map(size => (
                  <div key={size} className="flex items-center gap-2">
                    <label className="w-12 sm:w-16 text-xs sm:text-sm text-gray-700 dark:text-gray-300 flex-shrink-0">{size}:</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.size_quantities[size] || ''}
                      onChange={e => updateSizeQuantity(size, e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 text-sm transition-colors"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                總數量: {getTotalQuantity()}
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">數量 *</label>
              <input
                type="number"
                min="1"
                value={formData.size_quantities['default'] || ''}
                onChange={e => updateSizeQuantity('default', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">日期</label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 text-sm transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">類型</label>
              <select
                value={formData.order_type}
                onChange={e => setFormData({...formData, order_type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 text-sm transition-colors"
                required
              >
                {ORDER_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 成本輸入區域 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">成本 *</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCostInputMode('unit')}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    costInputMode === 'unit'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  輸入單價
                </button>
                <button
                  type="button"
                  onClick={() => setCostInputMode('total')}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    costInputMode === 'total'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  輸入總成本
                </button>
              </div>
            </div>

            {costInputMode === 'unit' ? (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">單價 ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unit_cost}
                  onChange={e => handleUnitCostChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors"
                  placeholder="每件商品的成本"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">總成本 ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalCostInput}
                  onChange={e => handleTotalCostChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors"
                  placeholder="全部商品的總成本"
                  required={costInputMode === 'total'}
                />
                {formData.unit_cost && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    自動計算單價: ${formData.unit_cost}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">備註</label>
            <textarea
              rows={2}
              value={formData.note}
              onChange={e => setFormData({...formData, note: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors"
              placeholder="選填"
            />
          </div>

          <div className="bg-gray-100 dark:bg-gray-900 p-3 sm:p-4 rounded transition-colors">
            <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
              總成本: ${calculateTotal()}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm sm:text-base text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm sm:text-base hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '處理中...' : '儲存變更'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// 編輯產品 Modal
function EditProductModal({
  product,
  categories,
  onClose,
  onSuccess
}: {
  product: Product
  categories: Category[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    product_name: product.product_name,
    color: product.color || '',
    ip_category: product.ip_category || '',
    size_stock: { ...product.size_stock }
  })
  const [loading, setLoading] = useState(false)

  const selectedCategory = categories.find(c => c.id === product.category_id)
  const availableSizes = selectedCategory?.size_config?.sizes || []

  const updateSizeQuantity = (size: string, value: string) => {
    const qty = parseInt(value) || 0
    setFormData(prev => ({
      ...prev,
      size_stock: {
        ...prev.size_stock,
        [size]: qty
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch(`/api/inventory?id=${product.id}`, {
        method: 'PUT',
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
      console.error('Failed to update product:', error)
      alert('更新失敗')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto transition-colors">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">編輯產品</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl transition-colors">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* 顯示類別信息(只讀) */}
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md transition-colors">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium">類別:</span> {selectedCategory?.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              註:類別無法修改
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">產品名稱 *</label>
            <input
              type="text"
              value={formData.product_name}
              onChange={e => setFormData({...formData, product_name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors"
              required
            />
          </div>

          {selectedCategory?.name !== '潮玩' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">顏色</label>
              <input
                type="text"
                value={formData.color}
                onChange={e => setFormData({...formData, color: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder="例如: 黑色、白色"
              />
            </div>
          )}

          {selectedCategory?.name === '潮玩' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">IP分類</label>
              <input
                type="text"
                value={formData.ip_category}
                onChange={e => setFormData({...formData, ip_category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder="例如: 海賊王、火影忍者"
              />
            </div>
          )}

          {/* 尺寸庫存調整 */}
          {availableSizes.length > 0 ? (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">各尺寸庫存</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableSizes.map(size => (
                  <div key={size} className="flex items-center gap-2">
                    <label className="w-12 sm:w-16 text-xs sm:text-sm text-gray-700 dark:text-gray-300 flex-shrink-0">{size}:</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.size_stock[size] || 0}
                      onChange={e => updateSizeQuantity(size, e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 text-sm transition-colors"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                註:調整庫存會記錄為手動調整
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">庫存數量</label>
              <input
                type="number"
                min="0"
                value={formData.size_stock['default'] || 0}
                onChange={e => updateSizeQuantity('default', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                註:調整庫存會記錄為手動調整
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm sm:text-base text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm sm:text-base hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '處理中...' : '儲存變更'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

