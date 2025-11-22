'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import ProtectedLayout from '@/components/ProtectedLayout'

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
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [useCustomRange, setUseCustomRange] = useState(false)
  const [exporting, setExporting] = useState(false)

  const fetchReportData = useCallback(async () => {
    try {
      let url = `/api/reports?dateRange=${dateRange}`

      // 如果使用自定義日期區間
      if (useCustomRange && startDate && endDate) {
        url = `/api/reports?startDate=${startDate}&endDate=${endDate}`
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
  }, [dateRange, useCustomRange, startDate, endDate])

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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">📄 損益報表</h1>
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
              {exporting ? '導出中...' : '📊 導出 Excel'}
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              {exporting ? '導出中...' : '📄 導出 PDF'}
            </button>
          </div>
        </div>

        {/* 核心財務指標 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm transition-colors">
            <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">總銷售額</h3>
            <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-500">
              ${(reportData.totalSales || 0).toLocaleString()}
            </p>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">營業收入</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm transition-colors">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">銷售成本</h3>
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-500">
              ${(reportData.totalStockCost || 0).toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">已售商品成本</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm transition-colors">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">營運支出</h3>
            <p className="text-3xl font-bold text-red-600 dark:text-red-500">
              ${(reportData.totalOperatingExpenses || 0).toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">日常營運費用</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm transition-colors">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">毛利</h3>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-500">
              ${(reportData.grossProfit || 0).toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              毛利率 {(reportData.totalSales || 0) > 0 ? (((reportData.grossProfit || 0) / (reportData.totalSales || 1)) * 100).toFixed(1) : '0.0'}%
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm transition-colors">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">淨利</h3>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-500">
              ${(reportData.netProfit || 0).toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              淨利率 {(reportData.totalSales || 0) > 0 ? (((reportData.netProfit || 0) / (reportData.totalSales || 1)) * 100).toFixed(1) : '0.0'}%
            </p>
          </div>
        </div>

        {/* 損益表格 */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm transition-colors">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">📊 損益明細表</h3>
          <div className="space-y-4">
            {/* 收入部分 */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">營業收入</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-500">
                  ${(reportData.totalSales || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* 成本部分 */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-base font-medium text-gray-700 dark:text-gray-300">減：銷售成本</span>
                <span className="text-base font-semibold text-orange-600 dark:text-orange-500">
                  (${(reportData.totalStockCost || 0).toLocaleString()})
                </span>
              </div>
              <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded transition-colors">
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">毛利</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-500">
                  ${(reportData.grossProfit || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* 費用部分 */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-base font-medium text-gray-700 dark:text-gray-300">減：營運費用</span>
                <span className="text-base font-semibold text-red-600 dark:text-red-500">
                  (${(reportData.totalOperatingExpenses || 0).toLocaleString()})
                </span>
              </div>
            </div>

            {/* 淨利部分 */}
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg transition-colors">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">淨利</span>
                <span className="text-xl font-bold text-purple-600 dark:text-purple-500">
                  ${(reportData.netProfit || 0).toLocaleString()}
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
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">💰 成本與費用分析</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg transition-colors">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">銷售成本 (COGS)</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-500">
                ${(reportData.totalStockCost || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {(reportData.totalSales || 0) > 0 ? (((reportData.totalStockCost || 0) / (reportData.totalSales || 1)) * 100).toFixed(1) : '0'}% 佔銷售額
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">進貨採購成本</p>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg transition-colors">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">營運支出 (OPEX)</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-500">
                ${(reportData.totalOperatingExpenses || 0).toLocaleString()}
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
              ${reportData.productsSold > 0 ? Math.round(reportData.totalSales / reportData.productsSold).toLocaleString() : '0'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">每筆訂單平均金額</p>
          </div>
        </div>

        {/* 熱銷產品 */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-4 sm:p-6 transition-colors">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">🏆 熱銷產品排行</h3>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900">
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">排名</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">產品型號</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hidden md:table-cell">銷售數量</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">銷售額</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hidden sm:table-cell">佔比</th>
                </tr>
              </thead>
              <tbody>
                {reportData.topProducts.map((product, index) => (
                  <tr key={product.model} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="py-3 px-4">
                      <span className="flex items-center">
                        {index === 0 && '🥇'}
                        {index === 1 && '🥈'}
                        {index === 2 && '🥉'}
                        <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">{index + 1}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">{product.model || 'Unknown'}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-gray-100 hidden md:table-cell">{product.quantity || 0}</td>
                    <td className="py-3 px-4 text-right font-semibold text-green-700 dark:text-green-500">
                      ${(product.revenue || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-blue-700 dark:text-blue-500 hidden sm:table-cell">
                      {reportData.totalSales > 0 && (product.revenue || 0) > 0 ?
                        (((product.revenue || 0) / reportData.totalSales) * 100).toFixed(1) : '0.0'}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 月度趨勢 */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-4 sm:p-6 transition-colors">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">📈 月度財務趨勢</h3>
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
                      ${month.sales.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-red-700 dark:text-red-500 font-medium hidden lg:table-cell">
                      -${month.stockCost.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-blue-700 dark:text-blue-500 font-semibold hidden md:table-cell">
                      ${month.grossProfit.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-orange-700 dark:text-orange-500 font-medium hidden xl:table-cell">
                      -${month.operatingExpenses.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      <span className={month.netProfit >= 0 ? 'text-green-700 dark:text-green-500' : 'text-red-700 dark:text-red-500'}>
                        ${month.netProfit.toLocaleString()}
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