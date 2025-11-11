'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ProtectedLayout from '@/components/ProtectedLayout'
import { EXPENSE_CATEGORIES, getCategoryColor } from '@/lib/expense-categories'

interface Expense {
  id: number
  category: string
  amount: number
  date: string
  note: string | null
  created_at: string
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dateRange, setDateRange] = useState('month')

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/expenses')
      if (!response.ok) {
        throw new Error('Failed to fetch expenses')
      }
      const expensesData = await response.json()
      setExpenses(expensesData)
    } catch (error) {
      console.error('Error fetching expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number, category: string) => {
    if (!confirm(`確定要刪除此筆「${category}」支出記錄嗎？`)) {
      return
    }

    try {
      const response = await fetch(`/api/expenses?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete expense')
      }

      setExpenses(expenses.filter(e => e.id !== id))
      alert('支出記錄已刪除')
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert('刪除失敗')
    }
  }

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.category.toLowerCase().includes(search.toLowerCase()) ||
                         (expense.note && expense.note.toLowerCase().includes(search.toLowerCase()))
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter

    // 日期範圍篩選（簡化版）
    const expenseDate = new Date(expense.date)
    const now = new Date()
    let matchesDate = true

    if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      matchesDate = expenseDate >= weekAgo
    } else if (dateRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      matchesDate = expenseDate >= monthAgo
    }

    return matchesSearch && matchesCategory && matchesDate
  })

  // 統計資訊
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const expensesByCategory = EXPENSE_CATEGORIES.map(category => ({
    category,
    amount: filteredExpenses
      .filter(e => e.category === category)
      .reduce((sum, e) => sum + e.amount, 0),
    count: filteredExpenses.filter(e => e.category === category).length
  })).filter(item => item.amount > 0)

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
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">💸 營運支出</h1>
        </div>

        {/* 統計資訊 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm">
            <h3 className="text-xs sm:text-sm font-medium text-gray-500">總支出筆數</h3>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{filteredExpenses.length}</p>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm">
            <h3 className="text-xs sm:text-sm font-medium text-gray-500">總支出金額</h3>
            <p className="text-lg sm:text-2xl font-bold text-red-600">
              ${totalExpenses.toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm">
            <h3 className="text-xs sm:text-sm font-medium text-gray-500">平均支出</h3>
            <p className="text-lg sm:text-2xl font-bold text-blue-600">
              ${filteredExpenses.length > 0 ? Math.round(totalExpenses / filteredExpenses.length).toLocaleString() : 0}
            </p>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm">
            <h3 className="text-xs sm:text-sm font-medium text-gray-500">主要類別</h3>
            <p className="text-lg sm:text-2xl font-bold text-purple-600 truncate">
              {expensesByCategory.length > 0
                ? expensesByCategory.sort((a, b) => b.amount - a.amount)[0].category
                : '-'
              }
            </p>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard"
            className="bg-gray-500 hover:bg-gray-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors"
          >
            ← 回系統總覽
          </Link>
          <Link
            href="/expenses/new"
            className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors"
          >
            💸 新增支出
          </Link>
          <Link
            href="/reports"
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors"
          >
            📊 財務報表
          </Link>
        </div>

        {/* 搜尋和過濾 */}
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="sm:col-span-2">
              <input
                type="text"
                placeholder="搜尋支出描述或備註..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
            >
              <option value="all">所有類別</option>
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
            >
              <option value="all">所有時間</option>
              <option value="week">最近一週</option>
              <option value="month">最近一個月</option>
            </select>
          </div>
        </div>

        {/* 分類統計 */}
        {expensesByCategory.length > 0 && (
          <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">支出分類統計</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {expensesByCategory.sort((a, b) => b.amount - a.amount).map((item) => (
                <div key={item.category} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm font-medium text-gray-700">{item.category}</span>
                    <span className="text-xs text-gray-500">{item.count}筆</span>
                  </div>
                  <div className="text-base sm:text-lg font-bold text-gray-900">
                    ${item.amount.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {totalExpenses > 0 ? ((item.amount / totalExpenses) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 支出表格 */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    日期
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    類別
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    金額
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    備註
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExpenses.length > 0 ? (
                  filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                        {new Date(expense.date).toLocaleDateString('zh-TW')}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(expense.category)}`}>
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-red-600">
                        ${expense.amount.toLocaleString()}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 max-w-xs truncate hidden md:table-cell">
                        {expense.note || '-'}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium space-x-2">
                        <Link
                          href={`/expenses/edit/${expense.id}`}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors"
                        >
                          編輯
                        </Link>
                        <button
                          onClick={() => handleDelete(expense.id, expense.category)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          刪除
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 sm:px-6 py-4 text-center text-sm text-gray-500">
                      {search || categoryFilter !== 'all'
                        ? '沒有符合條件的支出記錄'
                        : '⚠️ 目前沒有支出記錄'
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  )
}