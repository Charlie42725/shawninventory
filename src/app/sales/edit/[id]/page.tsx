'use client'

import { useState, useEffect, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProtectedLayout from '@/components/ProtectedLayout'

interface Product {
  id: string
  model: string
  price: number
  stock: number
}

interface Sale {
  id: string
  model: string
  quantity: number
  price: number
  note: string
  shipped: boolean
  createdAt: string
}

export default function EditSalePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id: saleId } = use(params)
  
  const [products, setProducts] = useState<Product[]>([])
  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    model: '',
    quantity: 1,
    price: 0,
    note: '',
    shipped: false
  })

  const fetchData = useCallback(async () => {
    try {
      // 獲取庫存產品資料
      const inventoryResponse = await fetch('/api/inventory')
      if (!inventoryResponse.ok) {
        throw new Error('Failed to fetch inventory')
      }
      const inventoryData = await inventoryResponse.json()
      // 轉換庫存資料為產品格式
      const productsData = inventoryData.map((item: any) => ({
        id: item.id,
        product_name: item.product_name,
        normalized_key: item.normalized_key,
        color: item.color,
        model: item.model
      }))
      setProducts(productsData)

      // 獲取銷售資料
      const saleResponse = await fetch(`/api/sales/${saleId}`)
      if (!saleResponse.ok) {
        throw new Error('Failed to fetch sale data')
      }
      const saleData = await saleResponse.json()
      setSale(saleData)
      setFormData({
        model: saleData.model,
        quantity: saleData.quantity,
        price: saleData.price,
        note: saleData.note,
        shipped: saleData.shipped
      })
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [saleId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleProductChange = (model: string) => {
    const product = products.find(p => p.model === model)
    if (product) {
      setFormData({
        ...formData,
        model,
        price: product.price
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.model) {
      alert('請選擇產品型號')
      return
    }

    if (formData.quantity <= 0) {
      alert('數量必須大於0')
      return
    }

    setSaving(true)
    try {
      // 模擬更新銷售記錄
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      alert('銷售記錄已更新')
      router.push('/sales')
    } catch (error) {
      console.error('Error updating sale:', error)
      alert('更新失敗，請重試')
    } finally {
      setSaving(false)
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

  if (!sale) {
    return (
      <ProtectedLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">找不到銷售記錄</h1>
          <Link 
            href="/sales"
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            返回銷售列表
          </Link>
        </div>
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center space-x-3">
          <h1 className="text-3xl font-bold text-gray-900">✏️ 編輯銷售記錄</h1>
          <span className="text-sm text-gray-500">#{sale.id}</span>
        </div>

        <div className="bg-white shadow-sm rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 產品選擇 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                產品型號 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.model}
                onChange={(e) => handleProductChange(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">請選擇產品</option>
                {products.map((product) => (
                  <option key={product.id} value={product.model}>
                    {product.model} (庫存: {product.stock})
                  </option>
                ))}
              </select>
            </div>

            {/* 數量 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                數量 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              {formData.model && (
                <p className="mt-1 text-sm text-gray-500">
                  可用庫存: {products.find(p => p.model === formData.model)?.stock || 0}
                </p>
              )}
            </div>

            {/* 單價 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                單價 (NT$) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                總金額: NT$ {(formData.price * formData.quantity).toLocaleString()}
              </p>
            </div>

            {/* 備註 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                備註
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                rows={3}
                placeholder="訂單號碼、客戶資訊、特殊說明等..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* 寄送狀態 */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="shipped"
                checked={formData.shipped}
                onChange={(e) => setFormData({ ...formData, shipped: e.target.checked })}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="shipped" className="ml-2 block text-sm text-gray-900">
                已寄出
              </label>
            </div>

            {/* 操作按鈕 */}
            <div className="flex space-x-3 pt-6">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                {saving ? '儲存中...' : '💾 儲存變更'}
              </button>
              <Link
                href="/sales"
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md font-medium text-center transition-colors"
              >
                ❌ 取消
              </Link>
            </div>
          </form>
        </div>

        {/* 記錄資訊 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">記錄資訊</h3>
          <div className="text-sm text-gray-600">
            <p>建立時間: {sale.createdAt}</p>
            <p>記錄ID: {sale.id}</p>
          </div>
        </div>

        {/* 快速動作 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">快速動作</h3>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/sales"
              className="text-sm bg-white hover:bg-gray-50 text-gray-700 px-3 py-1 rounded border"
            >
              📊 查看銷售記錄
            </Link>
            <Link
              href="/sales/new"
              className="text-sm bg-white hover:bg-gray-50 text-gray-700 px-3 py-1 rounded border"
            >
              📝 新增銷售
            </Link>
            <Link
              href="/inventory"
              className="text-sm bg-white hover:bg-gray-50 text-gray-700 px-3 py-1 rounded border"
            >
              📦 產品庫存
            </Link>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  )
}