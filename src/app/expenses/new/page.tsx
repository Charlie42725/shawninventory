'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProtectedLayout from '@/components/ProtectedLayout'
import { EXPENSE_CATEGORIES } from '@/lib/expense-categories'

export default function AddExpensePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0], // 今天的日期
    note: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.category) {
      alert('請選擇支出類別')
      return
    }

    const amount = parseFloat(formData.amount)
    if (!formData.amount || amount <= 0) {
      alert('金額必須大於 0')
      return
    }

    if (!formData.date) {
      alert('請選擇日期')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: formData.category,
          amount: amount,
          date: formData.date,
          note: formData.note || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create expense')
      }

      alert(`支出記錄「${formData.category}」已新增成功`)
      router.push('/expenses')
    } catch (error) {
      console.error('Error adding expense:', error)
      alert('新增失敗，請重試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center space-x-3">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">💸 新增支出</h1>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6 transition-colors">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 支出類別 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                支出類別 <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
              >
                <option value="">請選擇類別</option>
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* 金額 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                金額 (NT$) <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
              />
            </div>

            {/* 日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                支出日期 <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
              />
            </div>

            {/* 備註 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                備註
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                rows={3}
                placeholder="供應商資訊、發票號碼、特殊說明等..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors"
              />
            </div>

            {/* 操作按鈕 */}
            <div className="flex space-x-3 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                {loading ? '新增中...' : '💾 新增支出記錄'}
              </button>
              <Link
                href="/expenses"
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md font-medium text-center transition-colors"
              >
                ❌ 取消
              </Link>
            </div>
          </form>
        </div>

        {/* 常用支出模板 */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 transition-colors">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">常用支出模板</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData({
                ...formData,
                category: '進貨成本',
                amount: '240000',
                note: 'iPhone 15 進貨'
              })}
              className="text-sm bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-left transition-colors"
            >
              📱 iPhone 進貨
            </button>
            <button
              type="button"
              onClick={() => setFormData({
                ...formData,
                category: '運費',
                amount: '3500',
                note: '順豐快遞配送費'
              })}
              className="text-sm bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-left transition-colors"
            >
              🚚 快遞運費
            </button>
            <button
              type="button"
              onClick={() => setFormData({
                ...formData,
                category: '行銷推廣',
                amount: '15000',
                note: 'Facebook 廣告投放'
              })}
              className="text-sm bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-left transition-colors"
            >
              📢 廣告投放
            </button>
            <button
              type="button"
              onClick={() => setFormData({
                ...formData,
                category: '平台手續費',
                amount: '2800',
                note: '蝦皮平台手續費'
              })}
              className="text-sm bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-left transition-colors"
            >
              💳 平台手續費
            </button>
          </div>
        </div>

        {/* 注意事項 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 transition-colors">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400 dark:text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                支出記錄注意事項
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-400">
                <ul className="list-disc list-inside space-y-1">
                  <li>請務必選擇正確的支出類別，便於後續財務分析</li>
                  <li>建議上傳或記錄收據資訊，以備稅務查核</li>
                  <li>大額支出（超過10萬）建議在備註中詳細說明</li>
                  <li>定期檢視支出記錄，確保財務狀況透明</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 快速動作 */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 transition-colors">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">快速動作</h3>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/expenses"
              className="text-sm bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1 rounded border border-gray-300 dark:border-gray-600 transition-colors"
            >
              📊 支出列表
            </Link>
            <Link
              href="/reports"
              className="text-sm bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1 rounded border border-gray-300 dark:border-gray-600 transition-colors"
            >
              📈 財務報表
            </Link>
            <Link
              href="/dashboard"
              className="text-sm bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1 rounded border border-gray-300 dark:border-gray-600 transition-colors"
            >
              🏠 系統總覽
            </Link>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  )
}