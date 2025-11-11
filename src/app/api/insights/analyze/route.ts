import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

// 獲取日期範圍
function getDateRangeFilter(dateRange: string) {
  const now = new Date();
  const startDate = new Date();

  switch (dateRange) {
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setMonth(now.getMonth() - 1);
  }

  return startDate.toISOString();
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || 'month';
    const customStartDate = searchParams.get('startDate');
    const customEndDate = searchParams.get('endDate');

    let startDate: string;
    let endDate: string | undefined;

    if (customStartDate && customEndDate) {
      startDate = new Date(customStartDate).toISOString();
      endDate = new Date(customEndDate).toISOString();
    } else {
      startDate = getDateRangeFilter(dateRange);
    }

    // 查詢數據
    let salesQuery = supabaseAdmin.from("sales").select("*").gte('date', startDate);
    let expensesQuery = supabaseAdmin.from("expenses").select("*").gte('date', startDate);
    let stockInQuery = supabaseAdmin.from("stock_in").select("*").gte('date', startDate);

    if (endDate) {
      salesQuery = salesQuery.lte('date', endDate);
      expensesQuery = expensesQuery.lte('date', endDate);
      stockInQuery = stockInQuery.lte('date', endDate);
    }

    const [salesResult, expensesResult, productsResult, stockInResult, categoriesResult] = await Promise.all([
      salesQuery,
      expensesQuery,
      supabaseAdmin.from("products").select("*"),
      stockInQuery,
      supabaseAdmin.from("product_categories").select("*")
    ]);

    if (salesResult.error) throw salesResult.error;
    if (expensesResult.error) throw expensesResult.error;
    if (productsResult.error) throw productsResult.error;
    if (stockInResult.error) throw stockInResult.error;
    if (categoriesResult.error) throw categoriesResult.error;

    const sales = salesResult.data || [];
    const expenses = expensesResult.data || [];
    const products = productsResult.data || [];
    const stockIns = stockInResult.data || [];
    const categories = categoriesResult.data || [];

    // 計算財務指標
    const totalRevenue = sales.reduce((sum, sale) => {
      return sum + ((sale.unit_price || 0) * (sale.quantity || 0));
    }, 0);

    const totalExpenses = expenses.reduce((sum, expense) => {
      return sum + (expense.amount || 0);
    }, 0);

    let totalCostOfGoods = 0;
    sales.forEach(sale => {
      const product = products.find(p => p.id === sale.product_id);
      if (product && product.avg_unit_cost) {
        totalCostOfGoods += product.avg_unit_cost * (sale.quantity || 0);
      } else {
        totalCostOfGoods += (sale.unit_price || 0) * 0.6 * (sale.quantity || 0);
      }
    });

    const grossProfit = totalRevenue - totalCostOfGoods;
    const netProfit = grossProfit - totalExpenses;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const cogsPercentage = totalRevenue > 0 ? (totalCostOfGoods / totalRevenue) * 100 : 0;
    const opexPercentage = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;

    // 計算進貨總額
    const totalPurchases = stockIns.reduce((sum, stockIn) => {
      return sum + (stockIn.total_cost || 0);
    }, 0);

    // 按類別統計
    const salesByCategory = new Map();
    sales.forEach(sale => {
      const product = products.find(p => p.id === sale.product_id);
      if (product) {
        const category = categories.find(c => c.id === product.category_id);
        const categoryName = category?.name || 'Unknown';
        const current = salesByCategory.get(categoryName) || { revenue: 0, quantity: 0 };
        current.revenue += (sale.unit_price || 0) * (sale.quantity || 0);
        current.quantity += sale.quantity || 0;
        salesByCategory.set(categoryName, current);
      }
    });

    // 按費用類別統計
    const expensesByCategory = new Map();
    expenses.forEach(expense => {
      const category = expense.category || '其他';
      const current = expensesByCategory.get(category) || 0;
      expensesByCategory.set(category, current + (expense.amount || 0));
    });

    // 熱銷產品
    const productStats = new Map();
    sales.forEach((sale) => {
      const name = sale.product_name || 'Unknown';
      const quantity = Number(sale.quantity) || 0;
      const revenue = (Number(sale.unit_price) || 0) * quantity;

      if (!productStats.has(name)) {
        productStats.set(name, { name, quantity: 0, revenue: 0 });
      }

      const stats = productStats.get(name);
      stats.quantity += quantity;
      stats.revenue += revenue;
    });

    const topProducts = Array.from(productStats.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // 準備發送給 AI 的數據摘要
    const financialSummary = {
      period: {
        start: startDate.split('T')[0],
        end: endDate ? endDate.split('T')[0] : new Date().toISOString().split('T')[0],
        range: dateRange
      },
      revenue: {
        total: totalRevenue,
        transactionCount: sales.length,
        averageTransaction: sales.length > 0 ? totalRevenue / sales.length : 0
      },
      costs: {
        costOfGoods: totalCostOfGoods,
        cogsPercentage: cogsPercentage.toFixed(1),
        operatingExpenses: totalExpenses,
        opexPercentage: opexPercentage.toFixed(1),
        totalPurchases: totalPurchases
      },
      profitability: {
        grossProfit: grossProfit,
        grossMargin: grossMargin.toFixed(1),
        netProfit: netProfit,
        netMargin: netMargin.toFixed(1)
      },
      salesByCategory: Object.fromEntries(salesByCategory),
      expensesByCategory: Object.fromEntries(expensesByCategory),
      topProducts: topProducts.map(p => ({
        name: p.name,
        revenue: p.revenue,
        quantity: p.quantity,
        percentage: ((p.revenue / totalRevenue) * 100).toFixed(1)
      })),
      inventory: {
        totalProducts: products.length,
        totalStockValue: products.reduce((sum, p) => sum + ((p.avg_unit_cost || 0) * (p.total_stock || 0)), 0),
        lowStockProducts: products.filter(p => (p.total_stock || 0) < 10).length
      }
    };

    // 調用 Google Gemini API 進行分析
    const geminiApiKey = process.env.GEMINI_API_KEY || 'AIzaSyAwX3koqLXUlhGrZLtXumHCbYn1cz572ZU';

    // 構建給 AI 的提示
    const prompt = `你是一位專業的財務分析師。請基於以下財務數據進行深度分析，並提供專業建議。

財務數據摘要:
${JSON.stringify(financialSummary, null, 2)}

請以繁體中文回答，並按照以下格式提供內容:

1. 整體財務狀況分析
[這裡寫200-300字的整體分析]

2. 具體行動建議
- [建議1]
- [建議2]
- [建議3]
- [建議4]
- [建議5]

3. 潛在風險警示
- [風險1]
- [風險2]
- [風險3]
- [風險4]

4. 成長機會建議
- [機會1]
- [機會2]
- [機會3]
- [機會4]

請確保分析具體、專業且可執行。`;

    // 調用 Google Gemini API
    let aiAnalysis = '';

    try {
      const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE"
            }
          ]
        })
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('Gemini API Error:', errorText);

        // 如果 API 呼叫失敗,返回基於規則的分析
        return NextResponse.json({
          analysis: generateFallbackAnalysis(financialSummary),
          recommendations: generateFallbackRecommendations(financialSummary),
          risks: generateFallbackRisks(financialSummary),
          opportunities: generateFallbackOpportunities(financialSummary),
        });
      }

      const aiResult = await aiResponse.json();
      aiAnalysis = aiResult.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!aiAnalysis) {
        // 如果沒有得到回應,使用備用分析
        return NextResponse.json({
          analysis: generateFallbackAnalysis(financialSummary),
          recommendations: generateFallbackRecommendations(financialSummary),
          risks: generateFallbackRisks(financialSummary),
          opportunities: generateFallbackOpportunities(financialSummary),
        });
      }
    } catch (apiError) {
      console.error('Gemini API Exception:', apiError);

      // API 異常時使用備用分析
      return NextResponse.json({
        analysis: generateFallbackAnalysis(financialSummary),
        recommendations: generateFallbackRecommendations(financialSummary),
        risks: generateFallbackRisks(financialSummary),
        opportunities: generateFallbackOpportunities(financialSummary),
      });
    }

    // 解析 AI 回應 (簡單的文本分割)
    const sections = aiAnalysis.split(/\d+\.\s+/);

    return NextResponse.json({
      analysis: sections[1] || aiAnalysis,
      recommendations: extractListItems(sections[2] || ''),
      risks: extractListItems(sections[3] || ''),
      opportunities: extractListItems(sections[4] || ''),
      rawData: financialSummary // 調試用
    });

  } catch (error) {
    console.error("Error in AI analysis:", error);
    return NextResponse.json(
      {
        error: "AI 分析失敗",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// 輔助函數: 從文本中提取列表項目
function extractListItems(text: string): string[] {
  const lines = text.split('\n').filter(line => line.trim());
  const items: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // 匹配各種列表格式
    const match = trimmed.match(/^[-•*]\s+(.+)$/) ||
                  trimmed.match(/^\d+[\.)]\s+(.+)$/) ||
                  (trimmed.length > 10 ? [null, trimmed] : null);

    if (match && match[1]) {
      items.push(match[1].trim());
    }
  }

  return items.slice(0, 5); // 最多返回5項
}

// 備用分析函數: 基於規則的財務分析
function generateFallbackAnalysis(summary: any): string {
  const { revenue, costs, profitability } = summary;

  let analysis = `財務狀況分析報告\n\n`;

  // 營收分析
  if (revenue.total > 0) {
    analysis += `在本分析期間,總營收達到 $${revenue.total.toLocaleString()},`;
    analysis += `共完成 ${revenue.transactionCount} 筆交易,`;
    analysis += `平均每筆交易金額為 $${Math.round(revenue.averageTransaction).toLocaleString()}。`;
  } else {
    analysis += `本期間尚無營收記錄,建議加強業務推廣。`;
  }

  analysis += `\n\n`;

  // 成本與獲利分析
  if (revenue.total > 0) {
    const grossMarginNum = parseFloat(profitability.grossMargin);
    const netMarginNum = parseFloat(profitability.netMargin);

    analysis += `成本方面,銷售成本佔營收的 ${costs.cogsPercentage}%,`;
    analysis += `營運費用佔 ${costs.opexPercentage}%。`;
    analysis += `毛利率為 ${profitability.grossMargin}%,`;
    analysis += `淨利率為 ${profitability.netMargin}%。`;

    if (grossMarginNum > 40) {
      analysis += ` 毛利率表現優秀,顯示產品定價策略得當。`;
    } else if (grossMarginNum > 30) {
      analysis += ` 毛利率處於健康水平。`;
    } else if (grossMarginNum > 20) {
      analysis += ` 毛利率偏低,建議考慮提高售價或降低進貨成本。`;
    } else {
      analysis += ` 毛利率過低,急需優化成本結構。`;
    }

    if (netMarginNum > 15) {
      analysis += ` 淨利率表現亮眼,整體營運效率佳。`;
    } else if (netMarginNum > 8) {
      analysis += ` 淨利率在合理範圍內。`;
    } else if (netMarginNum > 0) {
      analysis += ` 淨利率偏低,需要控制營運費用。`;
    } else {
      analysis += ` 本期處於虧損狀態,需要立即採取改善措施。`;
    }
  }

  return analysis;
}

function generateFallbackRecommendations(summary: any): string[] {
  const recommendations: string[] = [];
  const { revenue, costs, profitability, topProducts } = summary;

  const grossMarginNum = parseFloat(profitability.grossMargin);
  const netMarginNum = parseFloat(profitability.netMargin);
  const cogsNum = parseFloat(costs.cogsPercentage);

  // 基於毛利率的建議
  if (grossMarginNum < 30) {
    recommendations.push('考慮提高產品售價 5-10%,或尋找成本更低的供應商');
  }

  // 基於成本的建議
  if (cogsNum > 65) {
    recommendations.push('銷售成本偏高,建議談判更優惠的進貨價格或考慮大量採購折扣');
  }

  // 基於營運費用的建議
  if (parseFloat(costs.opexPercentage) > 20) {
    recommendations.push('營運費用佔比較高,建議檢視各項費用並削減非必要開支');
  }

  // 基於產品的建議
  if (topProducts && topProducts.length > 0) {
    const topProduct = topProducts[0];
    if (parseFloat(topProduct.percentage) > 50) {
      recommendations.push(`${topProduct.name} 銷售佔比過高(${topProduct.percentage}%),建議擴充產品線以分散風險`);
    } else {
      recommendations.push(`持續推廣熱銷產品 ${topProduct.name},同時開發相關產品增加銷售機會`);
    }
  }

  // 基於淨利的建議
  if (netMarginNum < 5 && netMarginNum > 0) {
    recommendations.push('淨利率較低,建議同時優化成本結構和提升營收規模');
  }

  // 通用建議
  if (recommendations.length < 3) {
    recommendations.push('建立客戶忠誠度計畫,提高回購率和客戶終身價值');
    recommendations.push('優化庫存管理,減少資金積壓和降低倉儲成本');
    recommendations.push('投資數位行銷,擴大市場觸及率並提升品牌知名度');
  }

  return recommendations.slice(0, 5);
}

function generateFallbackRisks(summary: any): string[] {
  const risks: string[] = [];
  const { revenue, costs, profitability, inventory, topProducts } = summary;

  const netMarginNum = parseFloat(profitability.netMargin);

  // 獲利能力風險
  if (netMarginNum < 0) {
    risks.push('目前處於虧損狀態,現金流壓力大,可能影響營運持續性');
  } else if (netMarginNum < 5) {
    risks.push('淨利率過低,抗風險能力弱,任何市場波動都可能導致虧損');
  }

  // 成本風險
  if (parseFloat(costs.cogsPercentage) > 70) {
    risks.push('銷售成本過高嚴重壓縮利潤空間,若市場競爭加劇可能無法維持');
  }

  // 產品集中度風險
  if (topProducts && topProducts.length > 0) {
    const topProduct = topProducts[0];
    if (parseFloat(topProduct.percentage) > 60) {
      risks.push(`過度依賴單一產品 ${topProduct.name}(${topProduct.percentage}%),若該產品銷售下滑將嚴重影響整體營收`);
    }
  }

  // 庫存風險
  if (inventory.lowStockProducts > inventory.totalProducts * 0.3) {
    risks.push(`${inventory.lowStockProducts} 項產品庫存不足,可能錯失銷售機會`);
  }

  // 通用風險
  if (risks.length < 2) {
    risks.push('市場競爭加劇和消費者偏好改變可能影響銷售表現');
    risks.push('供應鏈不穩定可能導致進貨成本上升或缺貨');
  }

  return risks.slice(0, 4);
}

function generateFallbackOpportunities(summary: any): string[] {
  const opportunities: string[] = [];
  const { revenue, profitability, topProducts, salesByCategory } = summary;

  const grossMarginNum = parseFloat(profitability.grossMargin);

  // 基於毛利率的機會
  if (grossMarginNum > 35) {
    opportunities.push('毛利率健康,可以投資於品牌建設和市場擴張');
  }

  // 基於類別的機會
  if (salesByCategory) {
    const categories = Object.entries(salesByCategory as Record<string, any>);
    if (categories.length < 3) {
      opportunities.push('目前產品類別較少,可以考慮拓展新類別增加營收來源');
    }
  }

  // 基於熱銷產品的機會
  if (topProducts && topProducts.length > 0) {
    const topProduct = topProducts[0];
    opportunities.push(`${topProduct.name} 表現優異,可考慮推出相關配件或週邊商品`);
  }

  // 數位轉型機會
  opportunities.push('開發線上銷售渠道,突破地域限制擴大市場');

  // 會員制度機會
  if (revenue.transactionCount > 20) {
    opportunities.push('建立會員分級制度,提供專屬優惠增加客戶黏性和復購率');
  }

  // 通用機會
  if (opportunities.length < 3) {
    opportunities.push('與互補品牌合作推出聯名產品,拓展客戶群');
    opportunities.push('利用社群媒體行銷降低獲客成本並提升品牌曝光');
  }

  return opportunities.slice(0, 4);
}
