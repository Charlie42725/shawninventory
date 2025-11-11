'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import ProtectedLayout from '@/components/ProtectedLayout'
import { EXPENSE_CATEGORIES } from '@/lib/expense-categories'

export default function EditExpensePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    date: '',
    note: ''
  })

  useEffect(() => {
    fetchExpense()
  }, [id])

  const fetchExpense = async () => {
    try {
      const response = await fetch('/api/expenses')
      if (!response.ok) {
        throw new Error('Failed to fetch expenses')
      }
      const expenses = await response.json()
      const expense = expenses.find((e: any) => e.id === parseInt(id))

      if (expense) {
        setFormData({
          category: expense.category,
          amount: expense.amount.toString(),
          date: expense.date,
          note: expense.note || ''
        })
      } else {
        alert('找不到此支出記錄')
        router.push('/expenses')
      }
    } catch (error) {
      console.error('Error fetching expense:', error)
      alert('載入失敗')
      router.push('/expenses')
    } finally {
      setLoading(false)
    }
  }

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

    setSaving(true)
    try {
      const response = await fetch('/api/expenses', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: parseInt(id),
          category: formData.category,
          amount: amount,
          date: formData.date,
          note: formData.note || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update expense')
      }

      alert(`支出記錄「${formData.category}」已更新`)
      router.push('/expenses')
    } catch (error) {
      console.error('Error updating expense:', error)
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

  return (
    <ProtectedLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center space-x-3">
          <h1 className="text-3xl font-bold text-gray-900">✏️ 編輯支出</h1>
        </div>

        <div className="bg-white shadow-sm rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 支出類別 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                支出類別 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                金額 (NT$) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* 日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                支出日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
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
                placeholder="供應商資訊、發票號碼、特殊說明等..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
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
                href="/expenses"
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md font-medium text-center transition-colors"
              >
                ❌ 取消
              </Link>
            </div>
          </form>
        </div>
      </div>
    </ProtectedLayout>
  )
}
