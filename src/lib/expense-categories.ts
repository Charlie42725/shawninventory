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
 * 類別顏色映射（用於UI顯示）
 */
export const CATEGORY_COLORS: Record<string, string> = {
  '公關品': 'bg-purple-100 text-purple-800',
  '進貨成本': 'bg-red-100 text-red-800',
  '運費': 'bg-blue-100 text-blue-800',
  '行銷推廣': 'bg-green-100 text-green-800',
  '平台手續費': 'bg-yellow-100 text-yellow-800',
  '辦公用品': 'bg-gray-100 text-gray-800',
  '差旅費': 'bg-indigo-100 text-indigo-800',
  '租金': 'bg-orange-100 text-orange-800',
  '水電費': 'bg-cyan-100 text-cyan-800',
  '電信費': 'bg-teal-100 text-teal-800',
  '保險費': 'bg-pink-100 text-pink-800',
  '稅費': 'bg-rose-100 text-rose-800',
  '其他': 'bg-slate-100 text-slate-800',
}

/**
 * 獲取類別顏色
 */
export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-800'
}
