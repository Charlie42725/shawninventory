'use client'

import { useEffect, useState } from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import ConfirmDialog from '@/components/ConfirmDialog'
import { CUSTOMER_TYPES, CHANNELS, SHIPPING_METHODS } from '@/lib/database.types'

interface Product {
  id: number
  category_id: number
  product_name: string
  color: string | null
  ip_category: string | null
  size_stock: Record<string, number>
  total_stock: number
  avg_unit_cost: number
  category?: {
    id: number
    name: string
    size_config: { sizes?: string[] }
  }
}

interface Sale {
  id: number
  date: string
  customer_type: string
  product_name: string
  size: string | null
  channel: string | null
  shipping_method: string | null
  unit_price: number
  quantity: number
  total_amount: number
  note: string | null
  created_at: string
  product?: Product
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [search, setSearch] = useState('')
  const [customerFilter, setCustomerFilter] = useState<string>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    id: number | null
    name: string
  }>({
    isOpen: false,
    id: null,
    name: ''
  })

  useEffect(() => {
    fetchData()
  }, [customerFilter])

  const fetchData = async () => {
    setLoading(true)
    try {
      const salesUrl = customerFilter === 'all'
        ? '/api/sales?limit=200'
        : `/api/sales?limit=200&customer_type=${customerFilter}`

      const [salesRes, productsRes] = await Promise.all([
        fetch(salesUrl),
        fetch('/api/inventory')
      ])

      if (!salesRes.ok || !productsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [salesData, productsData] = await Promise.all([
        salesRes.json(),
        productsRes.json()
      ])

      setSales(salesData)
      setProducts(productsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    setDeleteConfirm({
      isOpen: true,
      id,
      name
    })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return

    try {
      const res = await fetch(`/api/sales?id=${deleteConfirm.id}`, {
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
      console.error('Error deleting sale:', error)
      alert('刪除失敗')
    } finally {
      setDeleteConfirm({ isOpen: false, id: null, name: '' })
    }
  }

  const filteredSales = sales.filter(sale =>
    sale.product_name.toLowerCase().includes(search.toLowerCase()) ||
    (sale.note && sale.note.toLowerCase().includes(search.toLowerCase())) ||
    (sale.size && sale.size.toLowerCase().includes(search.toLowerCase()))
  )

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </ProtectedLayout>
    )
  }

  // 計算統計
  const stats = {
    total: filteredSales.length,
    totalAmount: filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0),
    totalQuantity: filteredSales.reduce((sum, sale) => sum + sale.quantity, 0),
    avgPrice: filteredSales.length > 0
      ? filteredSales.reduce((sum, sale) => sum + sale.unit_price, 0) / filteredSales.length
      : 0
  }

  return (
    <ProtectedLayout>
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">銷售記錄</h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">管理銷售記錄並自動扣減庫存</p>
          </div>
          <button
            onClick={() => setShowSaleModal(true)}
            className="btn bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center justify-center text-sm sm:text-base transition-colors whitespace-nowrap"
          >
            <span className="mr-2">+</span>
            新增銷售
          </button>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg transition-colors">
            <div className="p-3 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-xs sm:text-sm">📝</span>
                  </div>
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">總銷售筆數</dt>
                    <dd className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100">{stats.total}</dd>
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
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">總銷售金額</dt>
                    <dd className="text-base sm:text-lg font-medium text-green-600 dark:text-green-500">${stats.totalAmount.toFixed(2)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg transition-colors">
            <div className="p-3 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-xs sm:text-sm">📦</span>
                  </div>
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">總銷售數量</dt>
                    <dd className="text-base sm:text-lg font-medium text-purple-600 dark:text-purple-500">{stats.totalQuantity}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg transition-colors">
            <div className="p-3 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-orange-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-xs sm:text-sm">💵</span>
                  </div>
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">平均單價</dt>
                    <dd className="text-base sm:text-lg font-medium text-orange-600 dark:text-orange-500">${stats.avgPrice.toFixed(2)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 篩選與搜尋 */}
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm transition-colors">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              <button
                onClick={() => setCustomerFilter('all')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-sm sm:text-base font-medium whitespace-nowrap transition-colors ${
                  customerFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                全部
              </button>
              {CUSTOMER_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => setCustomerFilter(type)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-sm sm:text-base font-medium whitespace-nowrap transition-colors ${
                    customerFilter === type
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="flex-1">
              <input
                type="text"
                placeholder="搜尋產品名稱、尺寸或備註..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm sm:text-base
                          focus:outline-none focus:ring-indigo-500 focus:border-indigo-500
                          bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* 銷售表格 */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden transition-colors">
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    日期
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    客戶類型
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    產品名稱
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                    尺寸
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden xl:table-cell">
                    通路
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden xl:table-cell">
                    運送方式
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                    單價
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                    數量
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    總計
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                    備註
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredSales.length > 0 ? (
                  filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        {new Date(sale.date).toLocaleDateString('zh-TW')}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          sale.customer_type === '零售'
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                            : sale.customer_type === '批發'
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                              : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                        }`}>
                          {sale.customer_type}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                        <div className="min-w-[100px] max-w-[150px] sm:max-w-none break-words">
                          {sale.product_name}
                          <div className="lg:hidden text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {sale.size || ''}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                        {sale.size || '-'}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 hidden xl:table-cell">
                        {sale.channel || '-'}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 hidden xl:table-cell">
                        {sale.shipping_method || '-'}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center text-xs sm:text-sm text-gray-900 dark:text-gray-100 hidden md:table-cell">
                        ${sale.unit_price.toFixed(2)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 hidden sm:table-cell">
                        {sale.quantity}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100">
                        ${sale.total_amount.toFixed(2)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 max-w-xs hidden lg:table-cell">
                        <div className="truncate" title={sale.note || ''}>
                          {sale.note || '-'}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center text-xs sm:text-sm font-medium">
                        <button
                          onClick={() => setEditingSale(sale)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-3 transition-colors"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => handleDelete(sale.id, sale.product_name)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors"
                        >
                          刪除
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="px-3 sm:px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {search ? '沒有符合搜尋條件的銷售記錄' : '目前沒有銷售記錄'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 銷售 Modal */}
        {showSaleModal && (
          <SaleModal
            products={products}
            onClose={() => setShowSaleModal(false)}
            onSuccess={() => {
              setShowSaleModal(false)
              fetchData()
            }}
          />
        )}

        {/* 編輯銷售 Modal */}
        {editingSale && (
          <EditSaleModal
            sale={editingSale}
            onClose={() => setEditingSale(null)}
            onSuccess={() => {
              setEditingSale(null)
              fetchData()
            }}
          />
        )}

        {/* 刪除確認對話框 */}
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          title="確認刪除"
          message={`確定要刪除銷售記錄「${deleteConfirm.name}」嗎？庫存將會恢復。`}
          confirmText="刪除"
          cancelText="取消"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm({ isOpen: false, id: null, name: '' })}
          type="danger"
        />
      </div>
    </ProtectedLayout>
  )
}

// 銷售 Modal
function SaleModal({
  products,
  onClose,
  onSuccess
}: {
  products: Product[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    customer_type: '零售',
    product_id: '',
    size: '',
    channel: '',
    shipping_method: '',
    unit_price: '',
    quantity: '',
    note: ''
  })
  const [loading, setLoading] = useState(false)

  const selectedProduct = products.find(p => p.id === parseInt(formData.product_id || '0'))
  const availableSizes = selectedProduct?.category?.size_config?.sizes || []
  const hasSize = availableSizes.length > 0

  const calculateTotal = () => {
    const price = parseFloat(formData.unit_price) || 0
    const qty = parseInt(formData.quantity) || 0
    return (price * qty).toFixed(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedProduct) {
      alert('請選擇產品')
      return
    }

    // 檢查庫存
    if (hasSize && formData.size) {
      const sizeStock = selectedProduct.size_stock[formData.size] || 0
      const qty = parseInt(formData.quantity)
      if (sizeStock < qty) {
        alert(`庫存不足！${formData.size} 的庫存只有 ${sizeStock}`)
        return
      }
    } else if (!hasSize) {
      const qty = parseInt(formData.quantity)
      if (selectedProduct.total_stock < qty) {
        alert(`庫存不足！當前庫存只有 ${selectedProduct.total_stock}`)
        return
      }
    }

    setLoading(true)

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          product_name: selectedProduct.product_name,
          size: formData.size || null,
          channel: formData.channel || null,
          shipping_method: formData.shipping_method || null,
        }),
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
      console.error('Failed to submit sale:', error)
      alert('銷售失敗')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto transition-colors">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">新增銷售</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl transition-colors">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">日期</label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">客戶類型 *</label>
              <select
                value={formData.customer_type}
                onChange={e => setFormData({...formData, customer_type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors"
                required
              >
                {CUSTOMER_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">產品 *</label>
            <select
              value={formData.product_id}
              onChange={e => setFormData({...formData, product_id: e.target.value, size: ''})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors"
              required
            >
              <option value="">請選擇產品</option>
              {products
                .filter(p => p.total_stock > 0)
                .map(product => {
                  const avgCost = product.avg_unit_cost || 0
                  return (
                    <option key={product.id} value={product.id}>
                      {product.product_name} {product.color ? `(${product.color})` : ''} - 庫存: {product.total_stock} (成本: ${avgCost.toFixed(2)})
                    </option>
                  )
                })}
            </select>
          </div>

          {hasSize && (
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">尺寸 *</label>
              <select
                value={formData.size}
                onChange={e => setFormData({...formData, size: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors"
                required
              >
                <option value="">請選擇尺寸</option>
                {availableSizes
                  .filter(size => (selectedProduct?.size_stock[size] || 0) > 0)
                  .map(size => (
                    <option key={size} value={size}>
                      {size} - 庫存: {selectedProduct?.size_stock[size] || 0}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">通路</label>
              <select
                value={formData.channel}
                onChange={e => setFormData({...formData, channel: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 text-sm transition-colors"
              >
                <option value="">請選擇</option>
                {CHANNELS.map(channel => (
                  <option key={channel} value={channel}>{channel}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">運送方式</label>
              <select
                value={formData.shipping_method}
                onChange={e => setFormData({...formData, shipping_method: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 text-sm transition-colors"
              >
                <option value="">請選擇</option>
                {SHIPPING_METHODS.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">單價 ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.unit_price}
                onChange={e => setFormData({...formData, unit_price: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 text-sm transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">數量 *</label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={e => setFormData({...formData, quantity: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 text-sm transition-colors"
                required
              />
            </div>
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
              總計: ${calculateTotal()}
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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm sm:text-base hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '處理中...' : '確認銷售'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// 編輯銷售 Modal
function EditSaleModal({
  sale,
  onClose,
  onSuccess
}: {
  sale: Sale
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    date: sale.date,
    customer_type: sale.customer_type,
    channel: sale.channel || '',
    shipping_method: sale.shipping_method || '',
    unit_price: sale.unit_price.toString(),
    note: sale.note || ''
  })
  const [loading, setLoading] = useState(false)

  const calculateTotal = () => {
    const price = parseFloat(formData.unit_price) || 0
    return (price * sale.quantity).toFixed(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch(`/api/sales?id=${sale.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          channel: formData.channel || null,
          shipping_method: formData.shipping_method || null,
        }),
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
      console.error('Failed to update sale:', error)
      alert('更新失敗')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto transition-colors">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">編輯銷售記錄</h3>
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
                <span className="text-gray-500 dark:text-gray-400">產品:</span> <span className="text-gray-900 dark:text-gray-100">{sale.product_name}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">尺寸:</span> <span className="text-gray-900 dark:text-gray-100">{sale.size || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">數量:</span> <span className="text-gray-900 dark:text-gray-100">{sale.quantity}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">原單價:</span> <span className="text-gray-900 dark:text-gray-100">${sale.unit_price.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              註:產品、尺寸、數量等核心資訊無法修改,如需變更請刪除後重新建立
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">日期</label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">客戶類型 *</label>
              <select
                value={formData.customer_type}
                onChange={e => setFormData({...formData, customer_type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors"
                required
              >
                {CUSTOMER_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">通路</label>
              <select
                value={formData.channel}
                onChange={e => setFormData({...formData, channel: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 text-sm transition-colors"
              >
                <option value="">請選擇</option>
                {CHANNELS.map(channel => (
                  <option key={channel} value={channel}>{channel}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">運送方式</label>
              <select
                value={formData.shipping_method}
                onChange={e => setFormData({...formData, shipping_method: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 text-sm transition-colors"
              >
                <option value="">請選擇</option>
                {SHIPPING_METHODS.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">單價 ($) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.unit_price}
              onChange={e => setFormData({...formData, unit_price: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors"
              required
            />
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
              總計: ${calculateTotal()}
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
