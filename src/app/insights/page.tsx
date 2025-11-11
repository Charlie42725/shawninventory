'use client'

import { useState } from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'

interface AnalysisResult {
  analysis: string
  recommendations: string[]
  risks: string[]
  opportunities: string[]
}

export default function InsightsPage() {
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [useCustomRange, setUseCustomRange] = useState(false)

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true)
      setError(null)

      let url = `/api/insights/analyze?dateRange=${dateRange}`
      if (useCustomRange && startDate && endDate) {
        url = `/api/insights/analyze?startDate=${startDate}&endDate=${endDate}`
      }

      const response = await fetch(url, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('分析失敗')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生未知錯誤')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <ProtectedLayout>
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
        {/* 標題 */}
        <div className="flex flex-col space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">🤖 AI 財務分析洞察</h1>
          <p className="text-sm sm:text-base text-gray-600">使用 Google Gemini AI 深度分析您的財務數據,獲取專業建議</p>
        </div>

        {/* 操作區域 */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">分析設定</h2>

          <div className="space-y-3 sm:space-y-4">
            {/* 日期範圍模式選擇 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                選擇分析期間
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setUseCustomRange(false)}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    !useCustomRange
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  預設區間
                </button>
                <button
                  onClick={() => setUseCustomRange(true)}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    useCustomRange
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  自定義區間
                </button>
              </div>
            </div>

            {/* 預設日期區間 */}
            {!useCustomRange && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  日期範圍
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                >
                  <option value="week">最近一週</option>
                  <option value="month">最近一個月</option>
                  <option value="quarter">最近一季</option>
                  <option value="year">最近一年</option>
                </select>
              </div>
            )}

            {/* 自定義日期區間 */}
            {useCustomRange && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    開始日期
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    結束日期
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 text-sm sm:text-base"
                  />
                </div>
              </div>
            )}

            {/* 分析按鈕 */}
            <button
              onClick={handleAnalyze}
              disabled={analyzing || (useCustomRange && (!startDate || !endDate))}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-md text-base font-medium transition-colors"
            >
              {analyzing ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  AI 分析中...
                </span>
              ) : (
                '🤖 開始 AI 分析'
              )}
            </button>
          </div>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-start sm:items-center">
              <span className="text-red-600 text-base sm:text-lg mr-2 flex-shrink-0">⚠️</span>
              <p className="text-sm sm:text-base text-red-800 break-words">{error}</p>
            </div>
          </div>
        )}

        {/* 分析結果 */}
        {result && (
          <div className="space-y-4 sm:space-y-6">
            {/* AI 分析總結 */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-indigo-900 mb-3 sm:mb-4 flex items-center">
                <span className="text-xl sm:text-2xl mr-2">🤖</span>
                AI 深度分析
              </h2>
              <div className="prose prose-indigo max-w-none">
                <div className="text-sm sm:text-base text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {result.analysis}
                </div>
              </div>
            </div>

            {/* 建議事項 */}
            {result.recommendations && result.recommendations.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-green-900 mb-3 sm:mb-4 flex items-center">
                  <span className="text-lg sm:text-xl mr-2">✅</span>
                  行動建議
                </h3>
                <ul className="space-y-2 sm:space-y-3">
                  {result.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-600 mr-2 mt-1 flex-shrink-0">•</span>
                      <span className="text-sm sm:text-base text-gray-800">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 風險警示 */}
            {result.risks && result.risks.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-red-900 mb-3 sm:mb-4 flex items-center">
                  <span className="text-lg sm:text-xl mr-2">⚠️</span>
                  風險警示
                </h3>
                <ul className="space-y-2 sm:space-y-3">
                  {result.risks.map((risk, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-red-600 mr-2 mt-1 flex-shrink-0">•</span>
                      <span className="text-sm sm:text-base text-gray-800">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 成長機會 */}
            {result.opportunities && result.opportunities.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-blue-900 mb-3 sm:mb-4 flex items-center">
                  <span className="text-lg sm:text-xl mr-2">🚀</span>
                  成長機會
                </h3>
                <ul className="space-y-2 sm:space-y-3">
                  {result.opportunities.map((opp, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-600 mr-2 mt-1 flex-shrink-0">•</span>
                      <span className="text-sm sm:text-base text-gray-800">{opp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 使用說明 */}
        {!result && !analyzing && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3">💡 使用說明</h3>
            <ul className="space-y-2 text-sm sm:text-base text-gray-700">
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2 font-medium flex-shrink-0">1.</span>
                <span>選擇要分析的日期範圍</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2 font-medium flex-shrink-0">2.</span>
                <span>點擊「開始 AI 分析」按鈕</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2 font-medium flex-shrink-0">3.</span>
                <span>AI 會分析您的銷售、成本、費用等數據</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2 font-medium flex-shrink-0">4.</span>
                <span>獲得專業的財務洞察和可執行的建議</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </ProtectedLayout>
  )
}
