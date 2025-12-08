/**
 * 數字格式化工具函數
 */

/**
 * 格式化數字為千分位格式（會計格式）
 * @param value 要格式化的數字
 * @param decimals 小數位數，默認 2
 * @returns 格式化後的字符串，例如：1,234.56
 */
export function formatNumber(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.' + '0'.repeat(decimals)
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * 格式化貨幣（帶 $ 符號）
 * @param value 要格式化的金額
 * @param decimals 小數位數，默認 2
 * @returns 格式化後的字符串，例如：$1,234.56
 */
export function formatCurrency(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0.' + '0'.repeat(decimals)
  }

  return '$' + formatNumber(value, decimals)
}

/**
 * 格式化整數（不帶小數）
 * @param value 要格式化的數字
 * @returns 格式化後的字符串，例如：1,234
 */
export function formatInteger(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0'
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

/**
 * 格式化百分比
 * @param value 要格式化的百分比（0-100）
 * @param decimals 小數位數，默認 2
 * @returns 格式化後的字符串，例如：12.34%
 */
export function formatPercent(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.' + '0'.repeat(decimals) + '%'
  }

  return formatNumber(value, decimals) + '%'
}
