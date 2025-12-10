'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import ProtectedLayout from '@/components/ProtectedLayout'
import { formatCurrency, formatInteger } from '@/lib/format-utils'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface ReportData {
  totalSales: number
  totalExpenses: number
  totalStockCost: number
  totalOperatingExpenses: number
  grossProfit: number
  netProfit: number
  productsSold: number
  topProducts: Array<{
    model: string
    quantity: number
    revenue: number
    cogs: number
    grossProfit: number
    grossMargin: number
  }>
  monthlySales: Array<{
    month: string
    monthName: string
    sales: number
    stockCost: number
    operatingExpenses: number
    totalExpenses: number
    grossProfit: number
    netProfit: number
  }>
  expensesBreakdown: Array<{
    category: string
    amount: number
  }>
}

// 費用類別顏色映射（用於圖表）
const EXPENSE_CHART_COLORS: Record<string, string> = {
  '公關品': '#a855f7',      // purple-500
  '進貨成本': '#ef4444',    // red-500
  '運費': '#3b82f6',        // blue-500
  '行銷推廣': '#10b981',    // green-500
  '平台手續費': '#f59e0b',  // yellow-500
  '辦公用品': '#6b7280',    // gray-500
  '差旅費': '#6366f1',      // indigo-500
  '租金': '#f97316',        // orange-500
  '水電費': '#06b6d4',      // cyan-500
  '電信費': '#14b8a6',      // teal-500
  '保險費': '#ec4899',      // pink-500
  '稅費': '#f43f5e',        // rose-500
  '其他': '#64748b',        // slate-500
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('all')  // 改为默认显示所有时间
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [useCustomRange, setUseCustomRange] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('month')

  const fetchReportData = useCallback(async () => {
    try {
      let url = `/api/reports?dateRange=${dateRange}&granularity=${granularity}`

      // 如果使用自定義日期區間
      if (useCustomRange && startDate && endDate) {
        url = `/api/reports?startDate=${startDate}&endDate=${endDate}&granularity=${granularity}`
      }

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch report data')
      }
      const reportData = await response.json()
      console.log('Report Data:', reportData) // Debug log
      setReportData(reportData)
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }, [dateRange, useCustomRange, startDate, endDate, granularity])

  useEffect(() => {
    fetchReportData()
  }, [fetchReportData])

  const handleExport = async (format: 'excel' | 'pdf') => {
    setExporting(true)
    try {
      // 模擬導出功能
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      if (format === 'excel') {
        alert('Excel 報表已生成並下載')
      } else {
        alert('PDF 報表已生成並下載')
      }
    } catch (error) {
      console.error('Error exporting report:', error)
      alert('導出失敗，請重試')
    } finally {
      setExporting(false)
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

  if (!reportData) {
    return (
      <ProtectedLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">載入報表資料失敗</h1>
          <button
            onClick={fetchReportData}
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors"
          >
            重新載入
          </button>
        </div>
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            損益報表
          </h1>
        </div>

        {/* 操作區域 */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            <Link
              href="/dashboard"
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              ← 回系統總覽
            </Link>

            {/* 日期範圍模式選擇 */}
            <div className="flex gap-2">
              <button
                onClick={() => setUseCustomRange(false)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  !useCustomRange
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                預設區間
              </button>
              <button
                onClick={() => setUseCustomRange(true)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  useCustomRange
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                自定義區間
              </button>
            </div>

            {/* 預設日期區間選擇 */}
            {!useCustomRange && (
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors"
              >
                <option value="week">最近一週</option>
                <option value="month">最近一個月</option>
                <option value="quarter">最近一季</option>
                <option value="year">最近一年</option>
                <option value="trend">月度趨勢 (過去12個月)</option>
              </select>
            )}

            {/* 自定義日期區間選擇 */}
            {useCustomRange && (
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors"
                />
                <span className="text-gray-600 dark:text-gray-400">至</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 transition-colors"
                />
                <button
                  onClick={fetchReportData}
                  disabled={!startDate || !endDate}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  查詢
                </button>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('excel')}
              disabled={exporting}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              {exporting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 sm:h-5 sm:h-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  導出中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  導出 Excel
                </span>
              )}
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              {exporting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 sm:h-5 sm:h-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  導出中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  導出 PDF
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 核心財務指標 - 提升質感版 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4">
          <div className="group bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-green-100 dark:border-green-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-green-700 dark:text-green-400">總銷售額</h3>
              <svg className="w-8 h-8 text-green-600 dark:text-green-400 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent break-words">
              {formatCurrency(reportData.totalSales || 0)}
            </p>
            <p className="text-xs text-green-600 dark:text-green-500 mt-2 font-medium">營業收入</p>
          </div>

          <div className="group bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-orange-100 dark:border-orange-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-400">銷售成本</h3>
              <svg className="w-8 h-8 text-orange-600 dark:text-orange-400 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 dark:from-orange-400 dark:to-amber-400 bg-clip-text text-transparent break-words">
              {formatCurrency(reportData.totalStockCost || 0)}
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-500 mt-2 font-medium">已售商品成本</p>
          </div>

          <div className="group bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-red-100 dark:border-red-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">營運支出</h3>
              <svg className="w-8 h-8 text-red-600 dark:text-red-400 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-red-600 to-rose-600 dark:from-red-400 dark:to-rose-400 bg-clip-text text-transparent break-words">
              {formatCurrency(reportData.totalOperatingExpenses || 0)}
            </p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-2 font-medium">日常營運費用</p>
          </div>

          <div className="group bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-blue-100 dark:border-blue-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400">毛利</h3>
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent break-words">
              {formatCurrency(reportData.grossProfit || 0)}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-500 mt-2 font-medium">
              毛利率 {(reportData.totalSales || 0) > 0 ? (((reportData.grossProfit || 0) / (reportData.totalSales || 1)) * 100).toFixed(1) : '0.0'}%
            </p>
          </div>

          <div className="group bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-purple-100 dark:border-purple-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-400">淨利</h3>
              <svg className="w-8 h-8 text-purple-600 dark:text-purple-400 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 dark:from-purple-400 dark:to-violet-400 bg-clip-text text-transparent break-words">
              {formatCurrency(reportData.netProfit || 0)}
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-500 mt-2 font-medium">
              淨利率 {(reportData.totalSales || 0) > 0 ? (((reportData.netProfit || 0) / (reportData.totalSales || 1)) * 100).toFixed(1) : '0.0'}%
            </p>
          </div>
        </div>

        {/* 損益表格 */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm transition-colors">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-3 sm:mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            損益明細表
          </h3>
          <div className="space-y-4">
            {/* 收入部分 */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">營業收入</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-500">
                  {formatCurrency(reportData.totalSales || 0)}
                </span>
              </div>
            </div>

            {/* 成本部分 */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-base font-medium text-gray-700 dark:text-gray-300">減：銷售成本</span>
                <span className="text-base font-semibold text-orange-600 dark:text-orange-500">
                  ({formatCurrency(reportData.totalStockCost || 0)})
                </span>
              </div>
              <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded transition-colors">
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">毛利</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-500">
                  {formatCurrency(reportData.grossProfit || 0)}
                </span>
              </div>
            </div>

            {/* 費用部分 */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-base font-medium text-gray-700 dark:text-gray-300">減：營運費用</span>
                <span className="text-base font-semibold text-red-600 dark:text-red-500">
                  ({formatCurrency(reportData.totalOperatingExpenses || 0)})
                </span>
              </div>
            </div>

            {/* 淨利部分 */}
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg transition-colors">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">淨利</span>
                <span className="text-xl font-bold text-purple-600 dark:text-purple-500">
                  {formatCurrency(reportData.netProfit || 0)}
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                淨利率: {(reportData.totalSales || 0) > 0 ? (((reportData.netProfit || 0) / (reportData.totalSales || 1)) * 100).toFixed(1) : '0.0'}% |
                毛利率: {(reportData.totalSales || 0) > 0 ? (((reportData.grossProfit || 0) / (reportData.totalSales || 1)) * 100).toFixed(1) : '0.0'}%
              </div>
            </div>
          </div>
        </div>

        {/* 成本分解 */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm transition-colors">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            成本與費用分析
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg transition-colors">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">銷售成本 (COGS)</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-500">
                {formatCurrency(reportData.totalStockCost || 0)}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {(reportData.totalSales || 0) > 0 ? (((reportData.totalStockCost || 0) / (reportData.totalSales || 1)) * 100).toFixed(1) : '0'}% 佔銷售額
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">進貨採購成本</p>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg transition-colors">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">營運支出 (OPEX)</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-500">
                {formatCurrency(reportData.totalOperatingExpenses || 0)}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {(reportData.totalSales || 0) > 0 ? (((reportData.totalOperatingExpenses || 0) / (reportData.totalSales || 1)) * 100).toFixed(1) : '0'}% 佔銷售額
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">日常營運費用</p>
            </div>
          </div>
        </div>

        {/* 營運指標 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm transition-colors">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">總銷售數量</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{reportData.productsSold}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">件商品已售出</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm transition-colors">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">平均訂單價值</h3>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-500">
              {reportData.productsSold > 0 ? formatCurrency(reportData.totalSales / reportData.productsSold) : formatCurrency(0)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">每筆訂單平均金額</p>
          </div>
        </div>

        {/* 熱銷產品 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-100 dark:border-gray-700 transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-500 dark:text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            熱銷產品排行
          </h3>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900">
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">排名</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">產品型號</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hidden md:table-cell">銷售數量</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">銷售額</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hidden lg:table-cell">成本</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hidden xl:table-cell">毛利</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">毛利率</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hidden sm:table-cell">佔比</th>
                </tr>
              </thead>
              <tbody>
                {reportData.topProducts.map((product, index) => (
                  <tr key={product.model} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        index === 1 ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                        index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                        'text-gray-500 dark:text-gray-400'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">{product.model || 'Unknown'}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-gray-100 hidden md:table-cell">{formatInteger(product.quantity || 0)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-green-700 dark:text-green-500">
                      {formatCurrency(product.revenue || 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-orange-700 dark:text-orange-500 hidden lg:table-cell">
                      {formatCurrency(product.cogs || 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-blue-700 dark:text-blue-500 hidden xl:table-cell">
                      {formatCurrency(product.grossProfit || 0)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        (product.grossMargin || 0) >= 30
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                          : (product.grossMargin || 0) >= 15
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                      }`}>
                        {(product.grossMargin || 0).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-700 dark:text-gray-400 hidden sm:table-cell">
                      {reportData.totalSales > 0 && (product.revenue || 0) > 0 ?
                        (((product.revenue || 0) / reportData.totalSales) * 100).toFixed(1) : '0.0'}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 財務趨勢圖表 - 提升質感版 */}
        <div className="group bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800 dark:to-blue-900/10 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                📈 財務趨勢分析
              </h3>

              {/* 日期範圍控制 */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex gap-2">
                  <button
                    onClick={() => setUseCustomRange(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      !useCustomRange
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    預設
                  </button>
                  <button
                    onClick={() => setUseCustomRange(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      useCustomRange
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    自定義
                  </button>
                </div>

                {!useCustomRange && (
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                  >
                    <option value="all">所有時間</option>
                    <option value="week">最近一週</option>
                    <option value="month">最近一個月</option>
                    <option value="quarter">最近一季</option>
                    <option value="year">最近一年</option>
                    <option value="trend">過去12個月</option>
                  </select>
                )}

                {useCustomRange && (
                  <div className="flex gap-2 items-center">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                    />
                    <span className="text-xs text-gray-500">至</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                    />
                    <button
                      onClick={fetchReportData}
                      disabled={!startDate || !endDate}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    >
                      查詢
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 數據粒度切換 */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">查看密度：</span>
              <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-1">
                <button
                  onClick={() => setGranularity('day')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    granularity === 'day'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  日
                </button>
                <button
                  onClick={() => setGranularity('week')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    granularity === 'week'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  週
                </button>
                <button
                  onClick={() => setGranularity('month')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    granularity === 'month'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  月
                </button>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart
              data={reportData.monthlySales}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" stroke="#cbd5e1" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                stroke="#94a3b8"
                className="text-gray-600 dark:text-gray-400"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#94a3b8"
                className="text-gray-600 dark:text-gray-400"
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                  padding: '12px 16px'
                }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend
                wrapperStyle={{ fontSize: '14px', fontWeight: '500' }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey="sales"
                name="銷售額"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 5, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 7, strokeWidth: 2 }}
                animationBegin={0}
                animationDuration={1000}
              />
              <Line
                type="monotone"
                dataKey="stockCost"
                name="銷售成本"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', r: 4, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6 }}
                animationBegin={200}
                animationDuration={1000}
              />
              <Line
                type="monotone"
                dataKey="grossProfit"
                name="毛利"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 5, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 7, strokeWidth: 2 }}
                animationBegin={400}
                animationDuration={1000}
              />
              <Line
                type="monotone"
                dataKey="netProfit"
                name="淨利"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', r: 5, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 7, strokeWidth: 2 }}
                animationBegin={600}
                animationDuration={1000}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 營業費用分析與熱銷產品 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 營業費用分類餅圖 - 提升質感版 */}
          <div className="group bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-purple-600 dark:text-purple-400 flex items-center gap-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                💰 營業費用結構
              </h3>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                總計 {formatCurrency(reportData.totalOperatingExpenses)}
              </div>
            </div>

            {reportData.expensesBreakdown && reportData.expensesBreakdown.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={reportData.expensesBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: any) => {
                        const percent = reportData.totalOperatingExpenses > 0
                          ? ((entry.amount / reportData.totalOperatingExpenses) * 100).toFixed(1)
                          : '0.0'
                        return parseFloat(percent) > 5 ? `${entry.category} ${percent}%` : ''
                      }}
                      outerRadius={85}
                      innerRadius={45}
                      fill="#8884d8"
                      dataKey="amount"
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {reportData.expensesBreakdown.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={EXPENSE_CHART_COLORS[entry.category] || '#64748b'}
                          className="hover:opacity-80 transition-opacity cursor-pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                        padding: '12px 16px'
                      }}
                      formatter={(value: number) => [formatCurrency(value), '金額']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-6 grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {reportData.expensesBreakdown.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: EXPENSE_CHART_COLORS[item.category] || '#64748b' }}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                          {item.category}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatCurrency(item.amount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
                暫無費用數據
              </div>
            )}
          </div>

          {/* 熱銷產品橫條圖 - 提升質感版 */}
          <div className="group bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
                🏆 Top 5 熱銷產品
              </h3>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                毛利分析
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={reportData.topProducts.slice(0, 5)}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={1}/>
                  </linearGradient>
                  <linearGradient id="costGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.6}/>
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.9}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" stroke="#cbd5e1" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  stroke="#94a3b8"
                />
                <YAxis
                  dataKey="model"
                  type="category"
                  tick={{ fontSize: 10 }}
                  width={80}
                  stroke="#94a3b8"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                    padding: '12px 16px'
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'grossMargin') return [`${value.toFixed(1)}%`, '毛利率']
                    return [formatCurrency(value), name === 'grossProfit' ? '毛利' : '成本']
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '13px', fontWeight: '500' }} />
                <Bar
                  dataKey="grossProfit"
                  name="毛利"
                  fill="url(#profitGradient)"
                  stackId="a"
                  radius={[0, 8, 8, 0]}
                  animationBegin={0}
                  animationDuration={800}
                />
                <Bar
                  dataKey="cogs"
                  name="成本"
                  fill="url(#costGradient)"
                  stackId="a"
                  radius={[0, 8, 8, 0]}
                  animationBegin={200}
                  animationDuration={800}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 月度趨勢表格 */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-4 sm:p-6 transition-colors">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-3 sm:mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            📊 月度財務明細
          </h3>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900">
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">月份</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">銷售額</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hidden lg:table-cell">銷售成本</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hidden md:table-cell">毛利</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hidden xl:table-cell">營運支出</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">淨利</th>
                  <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hidden sm:table-cell">淨利率</th>
                </tr>
              </thead>
              <tbody>
                {reportData.monthlySales.map((month) => (
                  <tr key={month.month} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="py-3 px-4 font-medium">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{month.monthName}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{month.month}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-green-700 dark:text-green-500 font-semibold">
                      {formatCurrency(month.sales)}
                    </td>
                    <td className="py-3 px-4 text-right text-red-700 dark:text-red-500 font-medium hidden lg:table-cell">
                      -{formatCurrency(month.stockCost)}
                    </td>
                    <td className="py-3 px-4 text-right text-blue-700 dark:text-blue-500 font-semibold hidden md:table-cell">
                      {formatCurrency(month.grossProfit)}
                    </td>
                    <td className="py-3 px-4 text-right text-orange-700 dark:text-orange-500 font-medium hidden xl:table-cell">
                      -{formatCurrency(month.operatingExpenses)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      <span className={month.netProfit >= 0 ? 'text-green-700 dark:text-green-500' : 'text-red-700 dark:text-red-500'}>
                        {formatCurrency(month.netProfit)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center hidden sm:table-cell">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        month.netProfit >= 0
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                      }`}>
                        {month.sales > 0 ? ((month.netProfit / month.sales) * 100).toFixed(1) : '0.0'}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </ProtectedLayout>
  )
}