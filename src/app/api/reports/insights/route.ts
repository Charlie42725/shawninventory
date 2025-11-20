import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

interface FinancialInsight {
  type: 'success' | 'warning' | 'info' | 'danger';
  category: string;
  title: string;
  message: string;
  metrics?: {
    current: number;
    previous?: number;
    change?: number;
    changePercent?: number;
  };
}

// 計算環比成長率
function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// 生成收益洞察
function generateRevenueInsights(
  currentRevenue: number,
  previousRevenue: number,
  topProducts: any[]
): FinancialInsight[] {
  const insights: FinancialInsight[] = [];
  const growthRate = calculateGrowthRate(currentRevenue, previousRevenue);

  // 營收成長分析
  if (growthRate > 10) {
    insights.push({
      type: 'success',
      category: '收益表現',
      title: '營收成長強勁',
      message: `本期銷售額較上期成長 ${growthRate.toFixed(1)}%,表現優異!`,
      metrics: {
        current: currentRevenue,
        previous: previousRevenue,
        change: currentRevenue - previousRevenue,
        changePercent: growthRate
      }
    });
  } else if (growthRate < -5) {
    insights.push({
      type: 'warning',
      category: '收益表現',
      title: '營收下滑警告',
      message: `本期銷售額較上期下降 ${Math.abs(growthRate).toFixed(1)}%,需要關注市場趨勢並調整策略。`,
      metrics: {
        current: currentRevenue,
        previous: previousRevenue,
        change: currentRevenue - previousRevenue,
        changePercent: growthRate
      }
    });
  } else {
    insights.push({
      type: 'info',
      category: '收益表現',
      title: '營收穩定',
      message: `本期銷售額為 $${currentRevenue.toLocaleString()},較上期變化 ${growthRate.toFixed(1)}%,保持穩定。`,
      metrics: {
        current: currentRevenue,
        previous: previousRevenue,
        change: currentRevenue - previousRevenue,
        changePercent: growthRate
      }
    });
  }

  // 熱銷產品分析
  if (topProducts.length > 0) {
    const topProduct = topProducts[0];
    const topProductShare = (topProduct.revenue / currentRevenue) * 100;

    if (topProductShare > 40) {
      insights.push({
        type: 'warning',
        category: '收益表現',
        title: '產品集中度過高',
        message: `${topProduct.model} 佔總銷售 ${topProductShare.toFixed(1)}%,建議分散產品組合以降低風險。`,
        metrics: {
          current: topProductShare
        }
      });
    } else {
      insights.push({
        type: 'success',
        category: '收益表現',
        title: '主力產品表現',
        message: `${topProduct.model} 為主要收益來源,佔總銷售 ${topProductShare.toFixed(1)}%,表現良好。`,
        metrics: {
          current: topProductShare
        }
      });
    }
  }

  return insights;
}

// 生成成本控制洞察
function generateCostInsights(
  totalRevenue: number,
  costOfGoods: number,
  operatingExpenses: number,
  grossMargin: number,
  netMargin: number
): FinancialInsight[] {
  const insights: FinancialInsight[] = [];
  const cogsPercentage = (costOfGoods / totalRevenue) * 100;
  const opexPercentage = (operatingExpenses / totalRevenue) * 100;

  // 銷售成本分析
  if (cogsPercentage > 70) {
    insights.push({
      type: 'danger',
      category: '成本控制',
      title: '銷售成本過高',
      message: `銷售成本佔營收 ${cogsPercentage.toFixed(1)}%,嚴重壓縮毛利空間,建議優化進貨成本或提高售價。`,
      metrics: {
        current: cogsPercentage
      }
    });
  } else if (cogsPercentage > 60) {
    insights.push({
      type: 'warning',
      category: '成本控制',
      title: '銷售成本偏高',
      message: `銷售成本佔營收 ${cogsPercentage.toFixed(1)}%,建議尋找更優惠的供應商或提升議價能力。`,
      metrics: {
        current: cogsPercentage
      }
    });
  } else {
    insights.push({
      type: 'success',
      category: '成本控制',
      title: '銷售成本控制良好',
      message: `銷售成本佔營收 ${cogsPercentage.toFixed(1)}%,在合理範圍內,繼續保持。`,
      metrics: {
        current: cogsPercentage
      }
    });
  }

  // 營運費用分析
  if (opexPercentage > 20) {
    insights.push({
      type: 'warning',
      category: '成本控制',
      title: '營運支出偏高',
      message: `營運支出佔營收 ${opexPercentage.toFixed(1)}%,建議檢視各項費用並優化不必要的開支。`,
      metrics: {
        current: opexPercentage
      }
    });
  } else if (opexPercentage > 15) {
    insights.push({
      type: 'info',
      category: '成本控制',
      title: '營運支出正常',
      message: `營運支出佔營收 ${opexPercentage.toFixed(1)}%,處於合理範圍。`,
      metrics: {
        current: opexPercentage
      }
    });
  } else {
    insights.push({
      type: 'success',
      category: '成本控制',
      title: '營運效率優秀',
      message: `營運支出僅佔營收 ${opexPercentage.toFixed(1)}%,成本控制效率極佳!`,
      metrics: {
        current: opexPercentage
      }
    });
  }

  // 毛利率分析
  if (grossMargin < 20) {
    insights.push({
      type: 'danger',
      category: '獲利能力',
      title: '毛利率過低',
      message: `毛利率僅 ${grossMargin.toFixed(1)}%,獲利空間不足,急需調整定價策略或降低進貨成本。`,
      metrics: {
        current: grossMargin
      }
    });
  } else if (grossMargin < 30) {
    insights.push({
      type: 'warning',
      category: '獲利能力',
      title: '毛利率偏低',
      message: `毛利率為 ${grossMargin.toFixed(1)}%,建議提升產品附加價值或優化成本結構。`,
      metrics: {
        current: grossMargin
      }
    });
  } else {
    insights.push({
      type: 'success',
      category: '獲利能力',
      title: '毛利率健康',
      message: `毛利率為 ${grossMargin.toFixed(1)}%,產品定價策略良好。`,
      metrics: {
        current: grossMargin
      }
    });
  }

  // 淨利率分析
  if (netMargin < 5) {
    insights.push({
      type: 'danger',
      category: '獲利能力',
      title: '淨利率過低',
      message: `淨利率僅 ${netMargin.toFixed(1)}%,獲利能力不足,需全面檢討營運策略。`,
      metrics: {
        current: netMargin
      }
    });
  } else if (netMargin < 10) {
    insights.push({
      type: 'warning',
      category: '獲利能力',
      title: '淨利率待改善',
      message: `淨利率為 ${netMargin.toFixed(1)}%,建議提升毛利率並控制營運費用。`,
      metrics: {
        current: netMargin
      }
    });
  } else if (netMargin > 20) {
    insights.push({
      type: 'success',
      category: '獲利能力',
      title: '獲利能力優秀',
      message: `淨利率達 ${netMargin.toFixed(1)}%,企業獲利能力極佳!`,
      metrics: {
        current: netMargin
      }
    });
  } else {
    insights.push({
      type: 'success',
      category: '獲利能力',
      title: '獲利能力良好',
      message: `淨利率為 ${netMargin.toFixed(1)}%,維持健康的獲利水平。`,
      metrics: {
        current: netMargin
      }
    });
  }

  return insights;
}

// 生成趨勢洞察
function generateTrendInsights(monthlySales: any[]): FinancialInsight[] {
  const insights: FinancialInsight[] = [];

  if (monthlySales.length < 2) {
    return insights;
  }

  // 分析最近3個月趨勢
  const recentMonths = monthlySales.slice(-3);
  const isGrowing = recentMonths.every((month, idx) => {
    if (idx === 0) return true;
    return month.sales >= recentMonths[idx - 1].sales;
  });

  const isDeclining = recentMonths.every((month, idx) => {
    if (idx === 0) return true;
    return month.sales <= recentMonths[idx - 1].sales;
  });

  if (isGrowing) {
    insights.push({
      type: 'success',
      category: '趨勢分析',
      title: '營收持續成長',
      message: '最近三個月營收呈現穩定成長趨勢,業務發展良好。',
    });
  } else if (isDeclining) {
    insights.push({
      type: 'warning',
      category: '趨勢分析',
      title: '營收連續下滑',
      message: '最近三個月營收持續下降,建議分析原因並採取因應措施。',
    });
  }

  // 分析虧損月份
  const lossMonths = monthlySales.filter(m => m.netProfit < 0);
  if (lossMonths.length > 0) {
    const lossPercentage = (lossMonths.length / monthlySales.length) * 100;
    insights.push({
      type: 'danger',
      category: '趨勢分析',
      title: '存在虧損月份',
      message: `在查詢期間內有 ${lossMonths.length} 個月份出現虧損 (${lossPercentage.toFixed(0)}%),需要檢討營運策略。`,
      metrics: {
        current: lossMonths.length
      }
    });
  }

  return insights;
}

// 生成費用結構洞察
function generateExpenseInsights(expenses: any[], totalRevenue: number): FinancialInsight[] {
  const insights: FinancialInsight[] = [];

  if (expenses.length === 0) {
    insights.push({
      type: 'info',
      category: '費用分析',
      title: '無費用記錄',
      message: '本期無營運費用記錄,建議完整記錄所有支出以便財務分析。',
    });
    return insights;
  }

  // 按類別統計費用
  const expensesByCategory = new Map<string, number>();
  expenses.forEach(expense => {
    const category = expense.category || '其他';
    const current = expensesByCategory.get(category) || 0;
    expensesByCategory.set(category, current + (expense.amount || 0));
  });

  // 找出最大支出類別
  let maxCategory = '';
  let maxAmount = 0;
  expensesByCategory.forEach((amount, category) => {
    if (amount > maxAmount) {
      maxAmount = amount;
      maxCategory = category;
    }
  });

  const maxCategoryPercentage = (maxAmount / totalRevenue) * 100;

  insights.push({
    type: 'info',
    category: '費用分析',
    title: `主要支出項目: ${maxCategory}`,
    message: `${maxCategory} 支出 $${maxAmount.toLocaleString()},佔營收 ${maxCategoryPercentage.toFixed(1)}%`,
    metrics: {
      current: maxAmount,
      changePercent: maxCategoryPercentage
    }
  });

  // 檢查異常高的費用項目
  if (maxCategoryPercentage > 10) {
    insights.push({
      type: 'warning',
      category: '費用分析',
      title: '費用項目佔比過高',
      message: `${maxCategory} 費用佔營收 ${maxCategoryPercentage.toFixed(1)}%,建議尋找優化空間。`,
    });
  }

  return insights;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || 'month';
    const customStartDate = searchParams.get('startDate');
    const customEndDate = searchParams.get('endDate');

    // 獲取當前期間的報表數據
    let reportUrl = `/api/reports?dateRange=${dateRange}`;
    if (customStartDate && customEndDate) {
      reportUrl = `/api/reports?startDate=${customStartDate}&endDate=${customEndDate}`;
    }

    // 計算上一期間的日期範圍
    let previousStartDate: string | undefined;
    let previousEndDate: string | undefined;

    if (customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      const duration = end.getTime() - start.getTime();

      previousEndDate = new Date(start.getTime() - 1).toISOString().split('T')[0];
      previousStartDate = new Date(start.getTime() - duration).toISOString().split('T')[0];
    }

    // 查詢當前期數據
    const [salesResult, expensesResult, productsResult] = await Promise.all([
      supabaseAdmin.from("sales").select("*"),
      supabaseAdmin.from("expenses").select("*"),
      supabaseAdmin.from("products").select("*")
    ]);

    if (salesResult.error) throw salesResult.error;
    if (expensesResult.error) throw expensesResult.error;
    if (productsResult.error) throw productsResult.error;

    const sales = salesResult.data || [];
    const expenses = expensesResult.data || [];
    const products = productsResult.data || [];

    // 計算當前期指標
    const currentRevenue = sales.reduce((sum, sale) => {
      return sum + ((sale.unit_price || 0) * (sale.quantity || 0));
    }, 0);

    const totalExpenses = expenses.reduce((sum, expense) => {
      return sum + (expense.amount || 0);
    }, 0);

    // 計算成本
    let costOfGoods = 0;
    sales.forEach(sale => {
      const product = products.find(p => p.id === sale.product_id);
      if (product && product.avg_unit_cost) {
        costOfGoods += product.avg_unit_cost * (sale.quantity || 0);
      }
      // If no matching product found, cost is 0 (don't estimate)
    });

    const grossProfit = currentRevenue - costOfGoods;
    const netProfit = grossProfit - totalExpenses;
    const grossMargin = currentRevenue > 0 ? (grossProfit / currentRevenue) * 100 : 0;
    const netMargin = currentRevenue > 0 ? (netProfit / currentRevenue) * 100 : 0;

    // 計算上期營收 (用於環比)
    let previousRevenue = currentRevenue * 0.9; // 默認假設

    if (previousStartDate && previousEndDate) {
      const { data: previousSales } = await supabaseAdmin
        .from("sales")
        .select("*")
        .gte('date', previousStartDate)
        .lte('date', previousEndDate);

      if (previousSales) {
        previousRevenue = previousSales.reduce((sum, sale) => {
          return sum + ((sale.unit_price || 0) * (sale.quantity || 0));
        }, 0);
      }
    }

    // 計算熱銷產品
    const productStats = new Map();
    sales.forEach((sale) => {
      const model = sale.product_name || 'Unknown';
      const quantity = Number(sale.quantity) || 0;
      const revenue = (Number(sale.unit_price) || 0) * quantity;

      if (!productStats.has(model)) {
        productStats.set(model, { model, quantity: 0, revenue: 0 });
      }

      const stats = productStats.get(model);
      stats.quantity += quantity;
      stats.revenue += revenue;
    });

    const topProducts = Array.from(productStats.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // 生成月度趨勢 (簡化版)
    const monthlyData = new Map();
    sales.forEach((sale) => {
      const date = new Date(sale.date || sale.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { month: monthKey, sales: 0, netProfit: 0 });
      }

      const monthData = monthlyData.get(monthKey);
      monthData.sales += (sale.unit_price || 0) * (sale.quantity || 0);
    });

    const monthlySales = Array.from(monthlyData.values());

    // 生成洞察
    const insights: FinancialInsight[] = [];

    // 收益洞察
    insights.push(...generateRevenueInsights(currentRevenue, previousRevenue, topProducts));

    // 成本控制洞察
    insights.push(...generateCostInsights(
      currentRevenue,
      costOfGoods,
      totalExpenses,
      grossMargin,
      netMargin
    ));

    // 趨勢洞察
    insights.push(...generateTrendInsights(monthlySales));

    // 費用結構洞察
    insights.push(...generateExpenseInsights(expenses, currentRevenue));

    return NextResponse.json({
      insights,
      summary: {
        totalInsights: insights.length,
        successCount: insights.filter(i => i.type === 'success').length,
        warningCount: insights.filter(i => i.type === 'warning').length,
        dangerCount: insights.filter(i => i.type === 'danger').length,
        infoCount: insights.filter(i => i.type === 'info').length,
      }
    });

  } catch (error) {
    console.error("Error generating financial insights:", error);
    return NextResponse.json(
      { error: "Failed to generate financial insights" },
      { status: 500 }
    );
  }
}
