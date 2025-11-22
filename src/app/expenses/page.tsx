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
  const [dateRange, setDateRange] = useState('all')

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
  
  // 獲取資料中實際出現的類別
  const activeCategories = Array.from(new Set(filteredExpenses.map(e => e.category)))
  
  const expensesByCategory = activeCategories.map(category => ({
    category,
    amount: filteredExpenses
      .filter(e => e.category === category)
      .reduce((sum, e) => sum + e.amount, 0),
    count: filteredExpenses.filter(e => e.category === category).length
  })).sort((a, b) => b.amount - a.amount)

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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">營運支出</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">管理與檢視所有營運相關支出</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link
              href="/reports"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              報表
            </Link>

            <Link
              href="/expenses/new"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新增支出
            </Link>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">總筆數</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{filteredExpenses.length}</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">總支出</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-500">${totalExpenses.toLocaleString()}</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">平均金額</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">${filteredExpenses.length > 0 ? Math.round(totalExpenses / filteredExpenses.length).toLocaleString() : 0}</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">主要類別</div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{expensesByCategory.length > 0 ? expensesByCategory.sort((a,b)=>b.amount-a.amount)[0].category : '-'}</div>
          </div>
        </div>

        {/* Filters & search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="搜尋支出描述或備註..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-40 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">所有類別</option>
            {Array.from(new Set([...EXPENSE_CATEGORIES, ...expenses.map(e => e.category)])).map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full sm:w-40 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">所有時間</option>
            <option value="week">最近一週</option>
            <option value="month">最近一個月</option>
          </select>
        </div>

        {/* Category breakdown */}
        {expensesByCategory.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">分類統計</h3>
              <div className="text-xs text-gray-500 dark:text-gray-400">{expensesByCategory.length} 個類別</div>
            </div>
            <div className="space-y-3">
              {expensesByCategory.sort((a, b) => b.amount - a.amount).map((item, index) => {
                const percentage = totalExpenses > 0 ? ((item.amount / totalExpenses) * 100) : 0
                return (
                  <div key={item.category} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          {index === 0 && (
                            <svg className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          )}
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.category}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">({item.count})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">${item.amount.toLocaleString()}</span>
                          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 w-12 text-right">{percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${Math.min(percentage, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Expenses list / table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">支出明細</h3>
              <div className="text-sm text-gray-500 dark:text-gray-400">{filteredExpenses.length} 筆</div>
            </div>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
            {filteredExpenses.length > 0 ? (
              filteredExpenses.map((expense) => (
                <div key={expense.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${getCategoryColor(expense.category)}`}>{expense.category}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(expense.date).toLocaleDateString('zh-TW')}</span>
                      </div>
                      {expense.note && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5">{expense.note}</p>
                      )}
                    </div>
                    <div className="text-lg font-bold text-red-600 dark:text-red-500 whitespace-nowrap">${expense.amount.toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Link href={`/expenses/edit/${expense.id}`} className="flex-1 px-3 py-1.5 rounded-md text-xs text-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                      編輯
                    </Link>
                    <button onClick={() => handleDelete(expense.id, expense.category)} className="flex-1 px-3 py-1.5 rounded-md text-xs text-center bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
                      刪除
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
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
                    <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{new Date(expense.date).toLocaleDateString('zh-TW')}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${getCategoryColor(expense.category)}`}>{expense.category}</span></td>
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
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
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