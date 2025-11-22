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
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 leading-tight">💸 營運支出</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">管理與檢視所有營運相關支出，快速篩選與匯出報表。</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/reports"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md text-sm font-medium text-gray-800 dark:text-gray-100 transition"
            >
              <span>📊</span>
              <span>財務報表</span>
            </Link>

            <Link
              href="/expenses/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-semibold shadow hover:shadow-lg transition"
            >
              <span className="text-lg">＋</span>
              <span>新增支出</span>
            </Link>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-gray-500">筆數</div>
                <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{filteredExpenses.length}</div>
                <div className="text-xs text-gray-400 mt-1">總支出筆數</div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-600 flex items-center justify-center text-white text-lg">📝</div>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-gray-500">總額</div>
                <div className="mt-2 text-2xl font-bold text-red-600">${totalExpenses.toLocaleString()}</div>
                <div className="text-xs text-gray-400 mt-1">總支出金額</div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-600 flex items-center justify-center text-white text-lg">💰</div>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-gray-500">平均</div>
                <div className="mt-2 text-2xl font-bold text-blue-900">${filteredExpenses.length > 0 ? Math.round(totalExpenses / filteredExpenses.length).toLocaleString() : 0}</div>
                <div className="text-xs text-gray-400 mt-1">平均支出額</div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center text-white text-lg">📊</div>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-gray-500">類別</div>
                <div className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{expensesByCategory.length > 0 ? expensesByCategory.sort((a,b)=>b.amount-a.amount)[0].category : '-'}</div>
                <div className="text-xs text-gray-400 mt-1">主要支出類別</div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-lg">🏷️</div>
            </div>
          </div>
        </div>

        {/* Filters & search */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">搜尋</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜尋支出描述或備註..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">類別</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">📂 所有類別</option>
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">時間</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">📅 所有時間</option>
                <option value="week">最近一週</option>
                <option value="month">最近一個月</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category breakdown */}
        {expensesByCategory.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">📋 支出分類統計</h3>
              <div className="text-xs text-gray-500 dark:text-gray-400">{expensesByCategory.length} 類別</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {expensesByCategory.sort((a, b) => b.amount - a.amount).map((item, index) => {
                const percentage = totalExpenses > 0 ? ((item.amount / totalExpenses) * 100) : 0
                return (
                  <div key={item.category} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {index === 0 && <span className="text-base">👑</span>}
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.category}</div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.count} 筆</div>
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">${item.amount.toLocaleString()}</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${Math.min(percentage, 100)}%` }} />
                      </div>
                      <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">{percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Expenses list / table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">📑 支出明細</h3>
              <div className="text-sm text-gray-500 dark:text-gray-400">{filteredExpenses.length} 筆</div>
            </div>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
            {filteredExpenses.length > 0 ? (
              filteredExpenses.map((expense) => (
                <div key={expense.id} className="p-4 flex flex-col gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getCategoryColor(expense.category)}`}>{expense.category}</span>
                        <div className="text-sm text-gray-500 dark:text-gray-400">📅 {new Date(expense.date).toLocaleDateString('zh-TW')}</div>
                      </div>
                      {expense.note && <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">💬 {expense.note}</div>}
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-xl font-bold text-red-600 dark:text-red-500">${expense.amount.toLocaleString()}</div>
                      <div className="flex gap-2 mt-3">
                        <Link href={`/expenses/edit/${expense.id}`} className="px-3 py-1 rounded-md text-sm bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">✏️</Link>
                        <button onClick={() => handleDelete(expense.id, expense.category)} className="px-3 py-1 rounded-md text-sm bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300">🗑️</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">📭</div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{search || categoryFilter !== 'all' ? '沒有符合條件的支出記錄' : '目前沒有支出記錄'}</p>
              </div>
            )}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">日期</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">類別</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">備註</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">金額</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredExpenses.length > 0 ? (
                  filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{new Date(expense.date).toLocaleDateString('zh-TW')}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getCategoryColor(expense.category)}`}>{expense.category}</span></td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">{expense.note || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600 dark:text-red-500">${expense.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center gap-3">
                          <Link href={`/expenses/edit/${expense.id}`} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 font-medium transition-colors">編輯</Link>
                          <button onClick={() => handleDelete(expense.id, expense.category)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 font-medium transition-colors">刪除</button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center">
                      <div className="text-4xl mb-2">📭</div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{search || categoryFilter !== 'all' ? '沒有符合條件的支出記錄' : '目前沒有支出記錄'}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Floating action on mobile */}
        <div className="fixed bottom-6 right-6 md:hidden">
          <Link href="/expenses/new" className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-600 text-white shadow-lg">＋</Link>
        </div>
      </div>
    </ProtectedLayout>
  )
}