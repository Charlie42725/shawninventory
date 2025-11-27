/**
 * 支出類別定義
 * 統一管理所有支出類別，確保系統中的類別一致
 */

export const EXPENSE_CATEGORIES = [
  '公關品',
  '進貨成本',
  '運費',
  '行銷推廣',
  '平台手續費',
  '辦公用品',
  '差旅費',
  '租金',
  '水電費',
  '電信費',
  '保險費',
  '稅費',
  '其他'
] as const

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]

/**
 * 檢查類別是否有效
 */
export function isValidExpenseCategory(category: string): category is ExpenseCategory {
  return EXPENSE_CATEGORIES.includes(category as ExpenseCategory)
}

/**
 * 類別顏色映射（用於UI顯示，支援深色模式）
 */
export const CATEGORY_COLORS: Record<string, string> = {
  '公關品': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
  '進貨成本': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800',
  '運費': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
  '行銷推廣': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800',
  '平台手續費': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800',
  '辦公用品': 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600',
  '差旅費': 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
  '租金': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800',
  '水電費': 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800',
  '電信費': 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800',
  '保險費': 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800',
  '稅費': 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
  '税費': 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
  '稅捐': 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
  '税捐': 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
  '其他': 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600',
  '雜支': 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600',
  '郵電費': 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800',
  '運輸費': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
  '交通費': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
}

/**
 * 獲取類別顏色
 */
export function getCategoryColor(category: string): string {
  if (!category) return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
  
  // 1. 嘗試直接匹配
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category]
  
  // 2. 嘗試去除前後空白
  const trimmed = category.trim()
  if (CATEGORY_COLORS[trimmed]) return CATEGORY_COLORS[trimmed]
  
  return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
}
