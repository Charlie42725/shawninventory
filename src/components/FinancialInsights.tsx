'use client'

import { useEffect, useState } from 'react'

interface FinancialInsight {
  type: 'success' | 'warning' | 'info' | 'danger'
  category: string
  title: string
  message: string
  metrics?: {
    current: number
    previous?: number
    change?: number
    changePercent?: number
  }
}

interface InsightsData {
  insights: FinancialInsight[]
  summary: {
    totalInsights: number
    successCount: number
    warningCount: number
    dangerCount: number
    infoCount: number
  }
}

interface Props {
  dateRange: string
  startDate?: string
  endDate?: string
}

export default function FinancialInsights({ dateRange, startDate, endDate }: Props) {
  const [insights, setInsights] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInsights()
  }, [dateRange, startDate, endDate])

  const fetchInsights = async () => {
    try {
      setLoading(true)
      let url = `/api/reports/insights?dateRange=${dateRange}`

      if (startDate && endDate) {
        url = `/api/reports/insights?startDate=${startDate}&endDate=${endDate}`
      }

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch insights')
      }

      const data = await response.json()
      setInsights(data)
    } catch (error) {
      console.error('Error fetching insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅'
      case 'warning': return '⚠️'
      case 'danger': return '🚨'
      case 'info': return 'ℹ️'
      default: return '📊'
    }
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200 text-green-900'
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-900'
      case 'danger': return 'bg-red-50 border-red-200 text-red-900'
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-900'
      default: return 'bg-gray-50 border-gray-200 text-gray-900'
    }
  }

  const getTitleColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-800'
      case 'warning': return 'text-yellow-800'
      case 'danger': return 'text-red-800'
      case 'info': return 'text-blue-800'
      default: return 'text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">💡 財務分析洞察</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-600">分析中...</span>
        </div>
      </div>
    )
  }

  if (!insights || insights.insights.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">💡 財務分析洞察</h3>
        <p className="text-gray-600">目前沒有足夠的數據進行分析</p>
      </div>
    )
  }

  // 按類別分組洞察
  const insightsByCategory = insights.insights.reduce((acc, insight) => {
    if (!acc[insight.category]) {
      acc[insight.category] = []
    }
    acc[insight.category].push(insight)
    return acc
  }, {} as Record<string, FinancialInsight[]>)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">💡 財務分析洞察</h3>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
            ✅ {insights.summary.successCount}
          </span>
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
            ⚠️ {insights.summary.warningCount}
          </span>
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full">
            🚨 {insights.summary.dangerCount}
          </span>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
            ℹ️ {insights.summary.infoCount}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(insightsByCategory).map(([category, categoryInsights]) => (
          <div key={category}>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">📊 {category}</h4>
            <div className="space-y-2">
              {categoryInsights.map((insight, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-3 ${getInsightColor(insight.type)}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">{getInsightIcon(insight.type)}</span>
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${getTitleColor(insight.type)}`}>
                        {insight.title}
                      </p>
                      <p className="text-sm mt-1">{insight.message}</p>

                      {insight.metrics && (
                        <div className="mt-2 flex gap-3 text-xs">
                          {insight.metrics.current !== undefined && (
                            <span className="font-medium">
                              當前: {insight.metrics.current.toLocaleString()}
                              {insight.metrics.changePercent !== undefined && '%'}
                            </span>
                          )}
                          {insight.metrics.previous !== undefined && (
                            <span className="text-gray-600">
                              上期: {insight.metrics.previous.toLocaleString()}
                            </span>
                          )}
                          {insight.metrics.changePercent !== undefined && insight.metrics.changePercent !== insight.metrics.current && (
                            <span className={insight.metrics.changePercent >= 0 ? 'text-green-700' : 'text-red-700'}>
                              {insight.metrics.changePercent >= 0 ? '↑' : '↓'}
                              {Math.abs(insight.metrics.changePercent).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          💡 以上洞察基於您的實際財務數據自動生成,建議定期檢視以優化營運策略。
        </p>
      </div>
    </div>
  )
}
