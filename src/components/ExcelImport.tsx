'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'

interface ExcelImportProps {
  onImportSuccess: () => void
}

interface ExcelRow {
  [key: string]: string | number | null | undefined
}

interface SalesData {
  store_name?: string
  order_date?: string
  order_number: string
  status?: string
  pickup_datetime?: string
  product_name: string
  unit_price: string | number
  quantity: string | number
  subtotal?: string | number
  note?: string
}

export default function ExcelImport({ onImportSuccess }: ExcelImportProps) {
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<SalesData[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [availableSheets, setAvailableSheets] = useState<string[]>([])
  const [selectedSheet, setSelectedSheet] = useState<string>('')
  const [allData, setAllData] = useState<SalesData[]>([]) // 儲存全部資料
  const [importCount, setImportCount] = useState<number | 'all'>('all') // 匯入筆數設定

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setImporting(true)
      
      // 讀取 Excel 文件
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      
      // 顯示所有工作表名稱
      console.log('Excel 工作表列表:', workbook.SheetNames);
      setAvailableSheets(workbook.SheetNames);
      
      // 選擇工作表
      const sheetName = selectedSheet || workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      console.log('正在讀取工作表:', sheetName);
      
      if (!selectedSheet) {
        setSelectedSheet(sheetName);
      }
      
      // 先獲取整個工作表的範圍資訊
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      console.log('Excel 工作表範圍:', {
        startRow: range.s.r,
        endRow: range.e.r,
        startCol: range.s.c,
        endCol: range.e.c,
        totalRows: range.e.r + 1,
        totalCols: range.e.c + 1
      });

      // 從第一列開始讀取
      const jsonData: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { 
        defval: "" // 空值默認為空字串
      })
      
      console.log(`讀取到 ${jsonData.length} 筆資料`);
      
      if (jsonData.length === 0) {
        alert(`Excel 文件沒有資料

工作表資訊：
- 總列數：${range.e.r + 1}
- 總欄數：${range.e.c + 1}

建議：
1. 檢查 Excel 文件是否有資料行
2. 確認資料不是在其他工作表中`)
        return
      }

      // 調試：顯示 Excel 資訊
      console.log('=== Excel 資料分析 ===');
      
      // 顯示工作表的原始內容（前10列）
      try {
        const rawData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, // 以陣列形式返回
          defval: "",
          range: `A1:${XLSX.utils.encode_col(range.e.c)}${Math.min(range.e.r + 1, 10)}` // 只取前10列
        });
        
        console.log('=== Excel 原始內容（前10列）===');
        rawData.forEach((row, index) => {
          if (Array.isArray(row) && row.some(cell => cell !== '')) {
            console.log(`列${index + 1}:`, row);
          }
        });
      } catch (e) {
        console.log('讀取原始內容時發生錯誤:', e);
      }
      
      // 調試：顯示 Excel 欄位名稱
      if (jsonData.length > 0) {
        console.log('偵測到的欄位名稱:', Object.keys(jsonData[0]));
        console.log('第一筆資料範例:', jsonData[0]);
        console.log(`總共 ${jsonData.length} 筆資料`);
      }

      // 轉換為我們需要的格式
      const salesData = jsonData.map((row, index) => {
        const mappedRow = mapExcelRow(row)
        
        // 調試：顯示映射結果
        if (index < 3) { // 只顯示前3筆的調試信息
          console.log(`Row ${index + 2} 映射結果:`, mappedRow);
        }
        
        // 驗證必要欄位
        if (!mappedRow.order_number || !mappedRow.product_name || !mappedRow.unit_price) {
          console.warn(`Row ${index + 2} missing required data:`, {
            order_number: mappedRow.order_number,
            product_name: mappedRow.product_name,
            unit_price: mappedRow.unit_price,
            原始資料: row
          });
          return null
        }
        
        return mappedRow
      }).filter((item): item is SalesData => item !== null)

      console.log(`解析到 ${salesData.length} 筆有效資料`)

      if (salesData.length === 0) {
        // 更詳細的錯誤提示
        const detectedColumns = Object.keys(jsonData[0] || {});
        const errorMessage = `沒有有效的資料可以匯入。

偵測到的欄位: 
${detectedColumns.join(', ')}

需要的關鍵欄位:
- 訂單編號 (必須)
- 商品名稱(品名/規格) (必須)  
- 單價 (必須)
- 數量 (必須)

建議：
1. 檢查瀏覽器 Console (F12) 查看原始內容
2. 確認欄位名稱是否正確
3. 檢查 Excel 文件格式`;
        
        alert(errorMessage);
        console.log('偵測到的所有欄位:', detectedColumns);
        return
      }

      // 儲存全部資料和顯示預覽
      setAllData(salesData) // 儲存全部資料
      setPreview(salesData.slice(0, 5)) // 只顯示前5筆預覽
      setShowPreview(true)
      
    } catch (error) {
      console.error('Error reading Excel file:', error)
      alert('讀取 Excel 文件失敗：' + (error as Error).message)
    } finally {
      setImporting(false)
    }
  }

  const mapExcelRow = (row: ExcelRow): SalesData => {
    // 彈性映射欄位名稱 - 特別針對你的 Excel 格式
    const fieldMappings = {
      store_name: findField(row, ['賣場名稱', '店名', '商店', '平台', 'store', 'platform']),
      order_date: findField(row, ['訂購日期', '下單日期', '訂單日期', '日期', 'order_date', 'date']),
      order_number: findField(row, ['訂單編號', '訂單號', '編號', 'order_number', 'order_id', '單號']),
      status: findField(row, ['狀態', '訂單狀態', '處理狀態', 'status', '出貨狀態']),
      pickup_datetime: findField(row, ['已取件日期時間', '取件時間', '完成時間', '出貨時間', 'pickup_time']),
      product_name: findField(row, [
        '商品名稱(品名/規格)', 
        '商品名稱\n(品名/規格)', 
        '商品名稱', 
        '品名', 
        '產品名稱', 
        '商品', 
        'product', 
        'item'
      ]),
      unit_price: findField(row, ['單價', '價格', '售價', 'price', 'unit_price', '金額']),
      quantity: findField(row, ['數量', '購買數量', '件數', 'quantity', 'qty', '數']),
      subtotal: findField(row, [
        '小計(A)', 
        '小計\n(A)', 
        '小計', 
        '總計', 
        '金額', 
        'subtotal', 
        'total', 
        '總價'
      ])
    }

    return {
      store_name: String(fieldMappings.store_name || ''),
      order_date: parseDate(fieldMappings.order_date) || undefined,
      order_number: String(fieldMappings.order_number || '').trim(),
      status: String(fieldMappings.status || ''),
      pickup_datetime: parseDate(fieldMappings.pickup_datetime) || undefined,
      product_name: String(fieldMappings.product_name || '').trim(),
      unit_price: parseNumber(fieldMappings.unit_price),
      quantity: parseInt(String(fieldMappings.quantity || '1')) || 1,
      subtotal: parseNumber(fieldMappings.subtotal) || (parseNumber(fieldMappings.unit_price) * (parseInt(String(fieldMappings.quantity || '1')) || 1))
    }
  }

  const findField = (row: ExcelRow, possibleKeys: string[]): string | number | null | undefined => {
    // 先嘗試完全匹配
    for (const key of possibleKeys) {
      if (row[key] !== undefined) return row[key]
    }
    
    // 然後嘗試更靈活的匹配
    for (const key of possibleKeys) {
      const matchingKey = Object.keys(row).find(k => {
        // 標準化字串：移除空格、換行、括號等特殊字符
        const normalizeString = (str: string) => 
          str.toLowerCase()
             .replace(/[\s\n\r\t()（）]/g, '')
             .replace(/[()]/g, '');
        
        const normalizedKey = normalizeString(key);
        const normalizedRowKey = normalizeString(k);
        
        // 檢查是否包含關鍵字
        return normalizedRowKey.includes(normalizedKey) || 
               normalizedKey.includes(normalizedRowKey);
      });
      
      if (matchingKey && row[matchingKey] !== undefined) {
        return row[matchingKey];
      }
    }
    
    return null;
  }

  const parseNumber = (value: string | number | null | undefined): number => {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      // 移除貨幣符號、逗號等
      const cleaned = value.replace(/[,$￥¥]/g, '').trim()
      const parsed = parseFloat(cleaned)
      return isNaN(parsed) ? 0 : parsed
    }
    return 0
  }

  const parseDate = (value: string | number | null | undefined): string | null => {
    if (!value) return null
    
    try {
      // Excel 日期可能是數字格式
      if (typeof value === 'number') {
        // Excel 日期轉換
        const date = XLSX.SSF.parse_date_code(value)
        if (date) {
          return new Date(date.y, date.m - 1, date.d, date.H || 0, date.M || 0, date.S || 0).toISOString()
        }
      }
      
      // 字符串格式日期
      const date = new Date(value)
      return isNaN(date.getTime()) ? null : date.toISOString()
    } catch {
      return null
    }
  }

  const confirmImport = async () => {
    try {
      setImporting(true)
      
      // 根據設定決定要匯入的資料量
      const dataToImport = importCount === 'all' ? allData : allData.slice(0, Number(importCount))
      
      const response = await fetch('/api/sales/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sales: dataToImport
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Import failed')
      }

      // 顯示詳細的匯入結果
      let message = result.message || `處理完成`

      // 顯示處理統計
      if (result.imported > 0 || result.updated > 0 || result.skipped > 0) {
        message += `\n\n📊 詳細統計：`
        if (result.imported > 0) message += `\n✅ 新增：${result.imported} 筆`
        if (result.updated > 0) message += `\n🔄 更新：${result.updated} 筆`
        if (result.skipped > 0) message += `\n⏭️ 略過：${result.skipped} 筆（完全相同）`
      }

      // 顯示庫存扣減結果
      if (result.inventory_updated > 0 || (result.inventory_errors && result.inventory_errors.length > 0)) {
        message += `\n\n📦 庫存扣減：`
        if (result.inventory_updated > 0) {
          message += `\n✅ 成功扣減：${result.inventory_updated} 項產品`
        }
        if (result.inventory_errors && result.inventory_errors.length > 0) {
          message += `\n⚠️ 無法匹配：${result.inventory_errors.length} 項產品`
          // 顯示前3個無法匹配的產品
          result.inventory_errors.slice(0, 3).forEach((err: any) => {
            message += `\n  - ${err.product_name} (信心度: ${err.confidence || 0}%)`
          })
          if (result.inventory_errors.length > 3) {
            message += `\n  ... 還有 ${result.inventory_errors.length - 3} 項`
          }
        }
      }

      // 顯示銷售匯入錯誤
      if (result.errors && result.errors.length > 0) {
        message += `\n\n❌ 失敗的訂單：`
        result.errors.slice(0, 5).forEach((err: { order_number: string; error: string }) => {
          message += `\n- ${err.order_number}: ${err.error}`
        })
        if (result.errors.length > 5) {
          message += `\n... 還有 ${result.errors.length - 5} 個錯誤`
        }
      }

      // 打印詳細的庫存扣減結果到 console（供調試）
      if (result.inventory_results && result.inventory_results.length > 0) {
        console.log('📦 庫存扣減詳情:', result.inventory_results)
      }
      if (result.inventory_errors && result.inventory_errors.length > 0) {
        console.log('⚠️ 無法匹配的產品:', result.inventory_errors)
      }

      alert(message)
      setShowPreview(false)
      setPreview([])
      setAllData([])
      onImportSuccess()
      
    } catch (error) {
      console.error('Error importing data:', error)
      alert('匯入失敗：' + (error as Error).message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 設定和文件選擇 */}
      <div className="flex items-center gap-4">
        <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium cursor-pointer flex items-center gap-2">
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          匯入 Excel
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            disabled={importing}
            className="hidden"
          />
        </label>
        

        
        {/* 匯入筆數選擇 */}
        {allData.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="importCount" className="text-gray-700 whitespace-nowrap">
              匯入筆數：
            </label>
            <select
              id="importCount"
              value={importCount}
              onChange={(e) => setImportCount(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm bg-white"
            >
              <option value="all">全部 ({allData.length} 筆)</option>
              <option value="10">前 10 筆</option>
              <option value="50">前 50 筆</option>
              <option value="100">前 100 筆</option>
              <option value="500">前 500 筆</option>
            </select>
          </div>
        )}

        {/* 工作表選擇 */}
        {availableSheets.length > 1 && (
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="sheetSelect" className="text-gray-700">
              工作表：
            </label>
            <select
              id="sheetSelect"
              value={selectedSheet}
              onChange={(e) => setSelectedSheet(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm bg-white"
            >
              {availableSheets.map(sheet => (
                <option key={sheet} value={sheet}>{sheet}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      {importing && (
        <div className="flex items-center text-blue-600 text-sm">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          處理中...
        </div>
      )}

      {/* 資料預覽 */}
      {showPreview && preview.length > 0 && (
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            資料預覽 (前 5 筆，將匯入 {importCount === 'all' ? `全部 ${allData.length}` : importCount} 筆)
          </h3>
          
          {/* 統計信息 */}
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              資料統計：
              <span className="ml-2 font-semibold text-blue-800 dark:text-blue-300">
                {new Set(allData.map(sale => sale.order_number)).size} 個不重複訂單
              </span>
              <span className="ml-2 font-semibold text-green-800 dark:text-green-300">
                {allData.length} 項產品
              </span>
              {allData.length > new Set(allData.map(sale => sale.order_number)).size && (
                <span className="ml-2 text-orange-600 dark:text-orange-400">
                  (包含多項產品訂單)
                </span>
              )}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-700 font-medium">訂單編號</th>
                  <th className="px-3 py-2 text-left text-gray-700 font-medium">賣場</th>
                  <th className="px-3 py-2 text-left text-gray-700 font-medium">商品名稱</th>
                  <th className="px-3 py-2 text-left text-gray-700 font-medium">數量</th>
                  <th className="px-3 py-2 text-left text-gray-700 font-medium">單價</th>
                  <th className="px-3 py-2 text-left text-gray-700 font-medium">小計</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {preview.map((sale, index) => {
                  // 檢查是否與前一筆有相同的訂單編號
                  const prevSale = index > 0 ? preview[index - 1] : null;
                  const isSameOrder = prevSale && prevSale.order_number === sale.order_number;
                  
                  return (
                    <tr key={index} className={`hover:bg-gray-50 ${isSameOrder ? 'bg-blue-50 border-l-4 border-l-blue-300' : ''}`}>
                      <td className={`px-3 py-2 font-mono ${isSameOrder ? 'text-gray-400' : 'text-gray-800'}`}>
                        {isSameOrder ? '└─ 同訂單' : sale.order_number}
                      </td>
                      <td className={`px-3 py-2 ${isSameOrder ? 'text-gray-400' : 'text-gray-700'}`}>
                        {isSameOrder ? '' : sale.store_name}
                      </td>
                      <td className="px-3 py-2 text-gray-800">{sale.product_name}</td>
                      <td className="px-3 py-2 text-gray-700 text-center">{sale.quantity}</td>
                      <td className="px-3 py-2 text-gray-800 font-mono">${sale.unit_price}</td>
                      <td className="px-3 py-2 text-gray-800 font-mono font-semibold">${sale.subtotal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="flex gap-4 mt-4">
            <button
              onClick={confirmImport}
              disabled={importing}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {importing ? '處理中...' : `確認匯入 ${importCount === 'all' ? `全部 (${allData.length})` : importCount} 筆`}
            </button>
            <button
              onClick={() => {
                setShowPreview(false)
                setPreview([])
                setAllData([])
                setImportCount('all')
              }}
              disabled={importing}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}