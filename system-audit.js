const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const issues = []

function addIssue(category, severity, title, description, impact = '', suggestion = '') {
  issues.push({ category, severity, title, description, impact, suggestion })
}

async function auditDataIntegrity() {
  console.log('\n📊 === 檢查數據一致性 ===\n')

  // 1. 檢查產品庫存與size_stock的一致性
  const { data: products } = await supabase.from('products').select('*')

  let stockMismatchCount = 0
  for (const product of products) {
    const sizeStock = product.size_stock || {}
    const sizeKeys = Object.keys(sizeStock)
    const calculatedTotal = Object.values(sizeStock).reduce((sum, qty) => sum + qty, 0)

    // 無尺寸產品（size_stock為空）是正常的，不報錯
    const isNoSizeProduct = sizeKeys.length === 0

    if (!isNoSizeProduct && calculatedTotal !== product.total_stock) {
      stockMismatchCount++
      addIssue(
        '數據一致性',
        '高',
        `產品庫存不一致: ${product.product_name}`,
        `total_stock=${product.total_stock} 但 size_stock總和=${calculatedTotal}`,
        '庫存數據不準確，影響銷售和報表',
        '重新計算total_stock或檢查size_stock數據'
      )
    }
  }

  // 2. 檢查avg_unit_cost與total_cost_value的一致性
  let costMismatchCount = 0
  for (const product of products) {
    if (product.total_stock > 0) {
      const expectedTotalCost = product.avg_unit_cost * product.total_stock
      const diff = Math.abs(product.total_cost_value - expectedTotalCost)

      if (diff > 1) {
        costMismatchCount++
        addIssue(
          '數據一致性',
          '高',
          `產品成本不一致: ${product.product_name}`,
          `avg_unit_cost * total_stock = ${expectedTotalCost.toFixed(2)} 但 total_cost_value = ${product.total_cost_value}`,
          '成本數據錯誤，導致損益表不準確',
          '執行成本修復腳本重新計算'
        )
      }
    }
  }

  // 3. 檢查是否有產品沒有對應的進貨記錄
  let noStockInCount = 0
  for (const product of products) {
    const { data: stockIn } = await supabase
      .from('stock_in')
      .select('id')
      .eq('category_id', product.category_id)
      .eq('product_name', product.product_name)
      .limit(1)

    if (!stockIn || stockIn.length === 0) {
      noStockInCount++
      addIssue(
        '數據完整性',
        '中',
        `產品缺少進貨記錄: ${product.product_name}`,
        `產品ID ${product.id} 沒有任何進貨記錄`,
        '無法追溯產品來源和計算正確成本',
        '檢查是否為手動創建的產品，需補充進貨記錄'
      )
    }
  }

  // 4. 檢查銷售記錄是否有關聯不存在的產品
  const { data: sales } = await supabase.from('sales').select('*')
  let orphanSalesCount = 0

  for (const sale of sales) {
    if (sale.product_id) {
      const product = products.find(p => p.id === sale.product_id)
      if (!product) {
        orphanSalesCount++
        addIssue(
          '數據完整性',
          '高',
          `銷售記錄關聯不存在的產品`,
          `銷售記錄 ${sale.id} 關聯的產品 ${sale.product_id} 不存在`,
          '銷售數據無效，影響報表統計',
          '刪除無效銷售記錄或修復product_id'
        )
      }
    }
  }

  // 5. 檢查負庫存
  let negativeStockCount = 0
  for (const product of products) {
    if (product.total_stock < 0) {
      negativeStockCount++
      addIssue(
        '數據邏輯錯誤',
        '嚴重',
        `產品庫存為負數: ${product.product_name}`,
        `total_stock = ${product.total_stock}`,
        '嚴重邏輯錯誤，庫存不可能為負',
        '檢查銷售和進貨記錄，修正庫存數量'
      )
    }

    const sizeStock = product.size_stock || {}
    for (const [size, qty] of Object.entries(sizeStock)) {
      if (qty < 0) {
        negativeStockCount++
        addIssue(
          '數據邏輯錯誤',
          '嚴重',
          `產品尺寸庫存為負數: ${product.product_name} (${size})`,
          `size_stock[${size}] = ${qty}`,
          '嚴重邏輯錯誤，庫存不可能為負',
          '檢查該尺寸的銷售記錄，修正庫存'
        )
      }
    }
  }

  console.log(`庫存不一致: ${stockMismatchCount} 個`)
  console.log(`成本不一致: ${costMismatchCount} 個`)
  console.log(`缺少進貨記錄: ${noStockInCount} 個`)
  console.log(`孤立銷售記錄: ${orphanSalesCount} 個`)
  console.log(`負庫存: ${negativeStockCount} 個`)
}

async function auditBusinessLogic() {
  console.log('\n🔍 === 檢查業務邏輯問題 ===\n')

  // 1. 檢查是否有銷售價格低於成本的情況
  const { data: sales } = await supabase
    .from('sales')
    .select('*, product:products(*)')

  let belowCostCount = 0
  for (const sale of sales) {
    if (sale.product && sale.product.avg_unit_cost > 0) {
      if (sale.unit_price < sale.product.avg_unit_cost * 0.5) {
        belowCostCount++
        addIssue(
          '業務邏輯',
          '中',
          `銷售價格異常低: ${sale.product_name}`,
          `售價 $${sale.unit_price} 遠低於成本 $${sale.product.avg_unit_cost}`,
          '可能是定價錯誤或特殊銷售',
          '檢查是否為數據錄入錯誤'
        )
      }
    }
  }

  // 2. 檢查是否有重複的銷售記錄
  const salesMap = new Map()
  let duplicateSalesCount = 0

  for (const sale of sales) {
    const key = `${sale.date}_${sale.product_name}_${sale.size}_${sale.quantity}_${sale.unit_price}`
    if (salesMap.has(key)) {
      duplicateSalesCount++
      addIssue(
        '數據重複',
        '中',
        `可能重複的銷售記錄`,
        `${sale.date} ${sale.product_name} 有相同的銷售記錄`,
        '可能造成銷售額重複計算',
        '檢查是否為重複錄入'
      )
    }
    salesMap.set(key, sale.id)
  }

  // 3. 檢查進貨單價異常
  const { data: stockIns } = await supabase.from('stock_in').select('*')

  const productCostMap = new Map()
  for (const stockIn of stockIns) {
    const key = stockIn.product_name
    if (!productCostMap.has(key)) {
      productCostMap.set(key, [])
    }
    productCostMap.get(key).push(stockIn.unit_cost)
  }

  let abnormalCostCount = 0
  for (const [productName, costs] of productCostMap) {
    if (costs.length > 1) {
      const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length
      const maxDiff = Math.max(...costs.map(c => Math.abs(c - avgCost)))

      if (maxDiff > avgCost * 0.5) {
        abnormalCostCount++
        addIssue(
          '業務邏輯',
          '低',
          `進貨成本差異大: ${productName}`,
          `成本範圍: $${Math.min(...costs)} - $${Math.max(...costs)}`,
          '可能是不同批次或供應商，需注意',
          '檢查是否為正常價格波動或錄入錯誤'
        )
      }
    }
  }

  console.log(`銷售價格異常低: ${belowCostCount} 個`)
  console.log(`可能重複銷售: ${duplicateSalesCount} 個`)
  console.log(`進貨成本異常: ${abnormalCostCount} 個`)
}

async function auditMissingFeatures() {
  console.log('\n🎯 === 檢查缺失功能 ===\n')

  // 這些是已知的缺失功能
  addIssue(
    '缺失功能',
    '高',
    '缺少退貨功能',
    '系統無法處理客戶退貨和供應商退貨',
    '無法處理退貨業務，影響庫存和財務準確性',
    '實作完整的退貨系統（sale_return, stock_return）'
  )

  addIssue(
    '缺失功能',
    '中',
    '缺少批量操作',
    '無法批量導入進貨、批量修改價格等',
    '操作效率低，大量數據錄入困難',
    '添加Excel批量導入功能'
  )

  addIssue(
    '缺失功能',
    '中',
    '缺少庫存預警',
    '沒有低庫存提醒、缺貨預警',
    '可能錯過補貨時機',
    '添加庫存預警功能和通知'
  )

  addIssue(
    '缺失功能',
    '中',
    '缺少供應商管理',
    '沒有供應商資料、進貨歷史追蹤',
    '無法管理供應商關係和比價',
    '添加供應商管理模塊'
  )

  addIssue(
    '缺失功能',
    '低',
    '缺少客戶管理',
    '沒有客戶資料、購買歷史',
    '無法做客戶分析和VIP管理',
    '添加客戶管理模塊'
  )

  addIssue(
    '缺失功能',
    '低',
    '缺少條碼掃描',
    '沒有條碼/二維碼掃描功能',
    '進貨和銷售錄入效率低',
    '添加條碼掃描支持'
  )

  addIssue(
    '缺失功能',
    '中',
    '缺少數據導出',
    '無法導出完整的Excel報表',
    '難以進行外部分析或存檔',
    '添加各種報表的Excel導出'
  )

  addIssue(
    '缺失功能',
    '低',
    '缺少權限管理',
    '沒有角色權限控制',
    '無法區分管理員、店員等不同權限',
    '實作RBAC權限系統'
  )

  console.log('已記錄所有缺失功能')
}

async function auditCodeQuality() {
  console.log('\n💻 === 檢查代碼質量問題 ===\n')

  addIssue(
    '代碼質量',
    '中',
    'API錯誤處理不完整',
    '部分API路由缺少完整的錯誤處理和事務回滾',
    '可能導致數據不一致',
    '添加try-catch和事務處理'
  )

  addIssue(
    '代碼質量',
    '低',
    '缺少輸入驗證',
    '前端和後端的數據驗證不夠完整',
    '可能導致無效數據進入數據庫',
    '添加Zod或Yup進行schema驗證'
  )

  addIssue(
    '代碼質量',
    '低',
    '重複代碼較多',
    '成本計算邏輯在多處重複',
    '維護困難，容易產生不一致',
    '抽取共用函數，建立utilities'
  )

  addIssue(
    '安全性',
    '中',
    'SQL注入風險',
    '雖然使用Supabase但部分查詢可能有注入風險',
    '潛在安全漏洞',
    '檢查所有動態查詢，使用參數化查詢'
  )

  addIssue(
    '性能',
    '中',
    '缺少分頁',
    '產品列表、銷售記錄等沒有分頁',
    '數據量大時頁面載入慢',
    '添加分頁和虛擬滾動'
  )

  addIssue(
    '性能',
    '低',
    '缺少緩存',
    '每次都重新查詢數據庫',
    '響應速度慢，數據庫負載高',
    '添加React Query或SWR做數據緩存'
  )

  console.log('已記錄代碼質量問題')
}

async function generateReport() {
  console.log('\n\n')
  console.log('='.repeat(80))
  console.log('                    系統健康檢查報告')
  console.log('='.repeat(80))
  console.log(`\n生成時間: ${new Date().toLocaleString('zh-TW')}\n`)

  // 按嚴重程度分類
  const critical = issues.filter(i => i.severity === '嚴重')
  const high = issues.filter(i => i.severity === '高')
  const medium = issues.filter(i => i.severity === '中')
  const low = issues.filter(i => i.severity === '低')

  console.log('📈 問題統計:')
  console.log(`   🔴 嚴重: ${critical.length} 個`)
  console.log(`   🟠 高: ${high.length} 個`)
  console.log(`   🟡 中: ${medium.length} 個`)
  console.log(`   🟢 低: ${low.length} 個`)
  console.log(`   📊 總計: ${issues.length} 個問題\n`)

  // 按類別統計
  const categories = [...new Set(issues.map(i => i.category))]
  console.log('📋 問題分布:')
  for (const cat of categories) {
    const count = issues.filter(i => i.category === cat).length
    console.log(`   ${cat}: ${count} 個`)
  }

  // 詳細問題列表
  console.log('\n\n' + '='.repeat(80))
  console.log('詳細問題列表')
  console.log('='.repeat(80))

  const allIssues = [...critical, ...high, ...medium, ...low]

  for (let i = 0; i < allIssues.length; i++) {
    const issue = allIssues[i]
    const severityIcon = {
      '嚴重': '🔴',
      '高': '🟠',
      '中': '🟡',
      '低': '🟢'
    }[issue.severity]

    console.log(`\n${i + 1}. ${severityIcon} [${issue.severity}] ${issue.title}`)
    console.log(`   類別: ${issue.category}`)
    console.log(`   問題: ${issue.description}`)
    if (issue.impact) console.log(`   影響: ${issue.impact}`)
    if (issue.suggestion) console.log(`   建議: ${issue.suggestion}`)
  }

  console.log('\n\n' + '='.repeat(80))
  console.log('優先修復建議')
  console.log('='.repeat(80))

  console.log('\n🔴 立即修復（嚴重）:')
  critical.forEach((issue, i) => {
    console.log(`   ${i + 1}. ${issue.title}`)
  })

  console.log('\n🟠 優先修復（高）:')
  high.slice(0, 5).forEach((issue, i) => {
    console.log(`   ${i + 1}. ${issue.title}`)
  })

  console.log('\n🟡 計劃修復（中）:')
  medium.slice(0, 3).forEach((issue, i) => {
    console.log(`   ${i + 1}. ${issue.title}`)
  })

  console.log('\n\n' + '='.repeat(80))
  console.log('檢查完成！')
  console.log('='.repeat(80))
}

async function runAudit() {
  console.log('🚀 開始系統健康檢查...')

  try {
    await auditDataIntegrity()
    await auditBusinessLogic()
    await auditMissingFeatures()
    await auditCodeQuality()
    await generateReport()
  } catch (error) {
    console.error('檢查過程發生錯誤:', error)
    process.exit(1)
  }
}

runAudit()
