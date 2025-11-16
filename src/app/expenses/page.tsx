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
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-4 md:px-0">
        {/* 標題與快捷操作 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">💸 營運支出</h1>

          {/* 主要操作按鈕 - 移動端優化 */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Link
              href="/expenses/new"
              className="flex-1 sm:flex-none bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-1.5"
            >
              <span className="text-base">+</span>
              <span>新增支出</span>
            </Link>
            <Link
              href="/reports"
              className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-1.5"
            >
              <span>📊</span>
              <span>財務報表</span>
            </Link>
          </div>
        </div>

        {/* 統計資訊卡片 - App 風格 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 p-4 rounded-xl shadow-sm border border-purple-200 dark:border-purple-800 transition-all hover:shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-600 dark:bg-purple-700 flex items-center justify-center text-white text-sm">
                📝
              </div>
              <h3 className="text-xs sm:text-sm font-medium text-purple-900 dark:text-purple-300">筆數</h3>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-purple-900 dark:text-purple-100">{filteredExpenses.length}</p>
            <p className="text-xs text-purple-700 dark:text-purple-400 mt-1">總支出筆數</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20 p-4 rounded-xl shadow-sm border border-red-200 dark:border-red-800 transition-all hover:shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-red-600 dark:bg-red-700 flex items-center justify-center text-white text-sm">
                💰
              </div>
              <h3 className="text-xs sm:text-sm font-medium text-red-900 dark:text-red-300">總額</h3>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-red-900 dark:text-red-100">
              ${totalExpenses.toLocaleString()}
            </p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-1">總支出金額</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 p-4 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800 transition-all hover:shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 dark:bg-blue-700 flex items-center justify-center text-white text-sm">
                📊
              </div>
              <h3 className="text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-300">平均</h3>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-blue-100">
              ${filteredExpenses.length > 0 ? Math.round(totalExpenses / filteredExpenses.length).toLocaleString() : 0}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">平均支出額</p>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/20 p-4 rounded-xl shadow-sm border border-indigo-200 dark:border-indigo-800 transition-all hover:shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 dark:bg-indigo-700 flex items-center justify-center text-white text-sm">
                🏷️
              </div>
              <h3 className="text-xs sm:text-sm font-medium text-indigo-900 dark:text-indigo-300">類別</h3>
            </div>
            <p className="text-lg sm:text-xl font-bold text-indigo-900 dark:text-indigo-100 truncate">
              {expensesByCategory.length > 0
                ? expensesByCategory.sort((a, b) => b.amount - a.amount)[0].category
                : '-'
              }
            </p>
            <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-1">主要支出類別</p>
          </div>
        </div>

        {/* 返回按鈕 - 優化位置 */}
        <div className="flex">
          <Link
            href="/inventory"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <span>←</span>
            <span>回系統總覽</span>
          </Link>
        </div>

        {/* 搜尋和過濾 - App 風格 */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-xl shadow-sm transition-colors border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔍</span>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">篩選與搜尋</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">搜尋關鍵字</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜尋支出描述或備註..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-4 py-2.5 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">類別篩選</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all"
              >
                <option value="all">📂 所有類別</option>
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">時間範圍</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all"
              >
                <option value="all">📅 所有時間</option>
                <option value="week">最近一週</option>
                <option value="month">最近一個月</option>
              </select>
            </div>
          </div>
        </div>

        {/* 分類統計 - 改進版 */}
        {expensesByCategory.length > 0 && (
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-4 sm:p-6 transition-colors border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <span className="text-xl">📋</span>
                <span>支出分類統計</span>
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                {expensesByCategory.length} 個類別
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {expensesByCategory.sort((a, b) => b.amount - a.amount).map((item, index) => {
                const percentage = totalExpenses > 0 ? ((item.amount / totalExpenses) * 100) : 0
                return (
                  <div
                    key={item.category}
                    className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 p-4 rounded-xl transition-all hover:shadow-md border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {index === 0 && <span className="text-base">👑</span>}
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.category}</span>
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 px-2 py-0.5 rounded-full">
                        {item.count}筆
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                      ${item.amount.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-indigo-600 to-indigo-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 min-w-[3rem] text-right">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 支出表格 - 響應式卡片設計 */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl overflow-hidden transition-colors border border-gray-200 dark:border-gray-700">
          {/* 表格標題 */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span className="text-xl">📑</span>
              <span>支出明細</span>
            </h3>
          </div>

          {/* 移動端卡片視圖 - 小於 md */}
          <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
            {filteredExpenses.length > 0 ? (
              filteredExpenses.map((expense) => (
                <div key={expense.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getCategoryColor(expense.category)}`}>
                        {expense.category}
                      </span>
                    </div>
                    <span className="text-xl font-bold text-red-600 dark:text-red-500">
                      ${expense.amount.toLocaleString()}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    📅 {new Date(expense.date).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>

                  {expense.note && (
                    <div className="text-sm text-gray-700 dark:text-gray-300 mb-3 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                      💬 {expense.note}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link
                      href={`/expenses/edit/${expense.id}`}
                      className="flex-1 text-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      ✏️ 編輯
                    </Link>
                    <button
                      onClick={() => handleDelete(expense.id, expense.category)}
                      className="flex-1 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      🗑️ 刪除
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">📭</div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {search || categoryFilter !== 'all'
                    ? '沒有符合條件的支出記錄'
                    : '目前沒有支出記錄'
                  }
                </p>
              </div>
            )}
          </div>

          {/* 桌面端表格視圖 - md 以上 */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    日期
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    類別
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    金額
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    備註
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredExpenses.length > 0 ? (
                  filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {new Date(expense.date).toLocaleDateString('zh-TW')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getCategoryColor(expense.category)}`}>
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600 dark:text-red-500">
                        ${expense.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                        {expense.note || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center gap-3">
                          <Link
                            href={`/expenses/edit/${expense.id}`}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 font-medium transition-colors"
                          >
                            編輯
                          </Link>
                          <button
                            onClick={() => handleDelete(expense.id, expense.category)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 font-medium transition-colors"
                          >
                            刪除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center">
                      <div className="text-4xl mb-2">📭</div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {search || categoryFilter !== 'all'
                          ? '沒有符合條件的支出記錄'
                          : '目前沒有支出記錄'
                        }
                      </p>
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