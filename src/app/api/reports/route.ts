import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

// Helper function to calculate sales cost using COGS from sales records
// 符合會計原則：使用銷售時記錄的實際成本，而不是產品當前成本
function calculateSalesCostFromInventory(sales: any[], products: any[]) {
  let totalSalesCost = 0;

  for (const sale of sales) {
    // 優先使用銷售記錄中保存的實際 COGS
    if (sale.cost_of_goods_sold && sale.cost_of_goods_sold > 0) {
      totalSalesCost += sale.cost_of_goods_sold;
    } else {
      // 如果沒有保存 COGS（歷史數據），則使用產品當前平均成本估算
      const product = products.find((item: any) => item.id === sale.product_id);
      if (product && product.avg_unit_cost) {
        totalSalesCost += (product.avg_unit_cost * sale.quantity);
      }
    }
  }

  return totalSalesCost;
}

// Helper function to get date range filter
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
    case 'trend':
      // For monthly trend, we want 12 months of data
      startDate.setMonth(now.getMonth() - 12);
      break;
    default:
      startDate.setMonth(now.getMonth() - 1);
  }

  return startDate.toISOString();
}

// Helper function to get custom date range
function getCustomDateRange(startDateStr: string, endDateStr: string) {
  // Parse the start date and set to beginning of day (00:00:00)
  const startDate = new Date(startDateStr);
  startDate.setHours(0, 0, 0, 0);

  // Parse the end date and set to end of day (23:59:59)
  const endDate = new Date(endDateStr);
  endDate.setHours(23, 59, 59, 999);

  return {
    start: startDate.toISOString(),
    end: endDate.toISOString()
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange');
    const customStartDate = searchParams.get('startDate');
    const customEndDate = searchParams.get('endDate');
    const granularity = searchParams.get('granularity') || 'month'; // day, week, month

    let startDate: string | undefined;
    let endDate: string | undefined;

    // 如果有自定義日期範圍，優先使用
    if (customStartDate && customEndDate) {
      const customRange = getCustomDateRange(customStartDate, customEndDate);
      startDate = customRange.start;
      endDate = customRange.end;
    } else if (dateRange !== 'all') {
      // 使用預設日期範圍（如果不是'all'）
      startDate = getDateRangeFilter(dateRange || 'month');
    }
    // 如果 dateRange === 'all'，startDate 和 endDate 都保持 undefined，即查詢所有數據

    // 構建查詢
    let salesQuery = supabaseAdmin.from("sales").select("*");
    let expensesQuery = supabaseAdmin.from("expenses").select("*");

    // 只在有日期範圍時才添加過濾
    if (startDate) {
      salesQuery = salesQuery.gte('date', startDate);
      expensesQuery = expensesQuery.gte('date', startDate);
    }

    if (endDate) {
      salesQuery = salesQuery.lte('date', endDate);
      expensesQuery = expensesQuery.lte('date', endDate);
    }

    const [salesResult, expensesResult, productsResult] = await Promise.all([
      salesQuery,
      expensesQuery,
      supabaseAdmin.from("products").select("*")
    ]);

    if (salesResult.error) throw salesResult.error;
    if (expensesResult.error) throw expensesResult.error;
    if (productsResult.error) throw productsResult.error;

    const sales = salesResult.data;
    const expenses = expensesResult.data;
    const products = productsResult.data;

    // Calculate totals
    const totalRevenue = sales.reduce((sum: number, sale: any) => {
      const price = Number(sale.unit_price) || 0;
      const qty = Number(sale.quantity) || 0;
      return sum + (price * qty);
    }, 0);
    const totalExpenses = expenses.reduce((sum: number, expense: any) => sum + expense.amount, 0);

    // Calculate cost of goods sold using products data
    const totalCostOfGoodsSold = calculateSalesCostFromInventory(sales, products);

    // Calculate profits
    const grossProfit = totalRevenue - totalCostOfGoodsSold;
    const netProfit = grossProfit - totalExpenses;

    // Generate trend data based on granularity
    const monthlySales = generateTrendData(sales, expenses, products, granularity);

    // Calculate top products with COGS and gross margin
    const productStats = new Map();
    sales.forEach((sale) => {
      const model = sale.model || sale.product_name || 'Unknown';
      const quantity = Number(sale.quantity) || 0;
      const revenue = (Number(sale.unit_price) || 0) * quantity;

      // 計算 COGS（優先使用銷售記錄中的實際成本）
      let cogs = 0;
      if (sale.cost_of_goods_sold && sale.cost_of_goods_sold > 0) {
        cogs = sale.cost_of_goods_sold;
      } else {
        // 如果沒有保存 COGS，使用產品當前平均成本估算
        const product = products.find((item: any) => item.id === sale.product_id);
        if (product && product.avg_unit_cost) {
          cogs = product.avg_unit_cost * quantity;
        }
      }

      if (!productStats.has(model)) {
        productStats.set(model, { model, quantity: 0, revenue: 0, cogs: 0 });
      }

      const stats = productStats.get(model);
      stats.quantity += quantity;
      stats.revenue += revenue;
      stats.cogs += cogs;
    });

    const topProducts = Array.from(productStats.values())
      .map(product => {
        const grossProfit = product.revenue - product.cogs;
        const grossMargin = product.revenue > 0 ? (grossProfit / product.revenue) * 100 : 0;
        return {
          ...product,
          grossProfit,
          grossMargin
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // 計算費用分類統計
    const expensesByCategory = new Map();
    expenses.forEach((expense) => {
      const category = expense.category || '其他';
      if (!expensesByCategory.has(category)) {
        expensesByCategory.set(category, 0);
      }
      expensesByCategory.set(category, expensesByCategory.get(category) + expense.amount);
    });

    const expensesBreakdown = Array.from(expensesByCategory.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      totalSales: totalRevenue,
      totalStockCost: totalCostOfGoodsSold,
      totalOperatingExpenses: totalExpenses,
      grossProfit,
      netProfit,
      productsSold: sales.length,
      topProducts,
      monthlySales,
      expensesBreakdown
    });

  } catch (error) {
    console.error("Error fetching reports data:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports data" },
      { status: 500 }
    );
  }
}

function generateTrendData(sales: any[], expenses: any[], products: any[], granularity: string) {
  const trendData = new Map();

  // Helper function to generate key based on granularity
  const getDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    if (granularity === 'day') {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } else if (granularity === 'week') {
      // Get week number
      const firstDayOfYear = new Date(year, 0, 1);
      const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      return `${year}-W${String(weekNumber).padStart(2, '0')}`;
    } else { // month
      return `${year}-${String(month).padStart(2, '0')}`;
    }
  };

  // Helper function to generate readable name
  const getDateName = (date: Date, key: string) => {
    if (granularity === 'day') {
      return date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'short', day: 'numeric' });
    } else if (granularity === 'week') {
      const weekNum = key.split('-W')[1];
      return `${date.getFullYear()} 第${weekNum}週`;
    } else { // month
      return date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' });
    }
  };

  // Process sales data
  sales.forEach((sale) => {
    const date = new Date(sale.date || sale.created_at);
    const dateKey = getDateKey(date);
    const dateName = getDateName(date, dateKey);

    if (!trendData.has(dateKey)) {
      trendData.set(dateKey, {
        month: dateKey,
        monthName: dateName,
        sales: 0,
        stockCost: 0,
        operatingExpenses: 0,
        totalExpenses: 0,
        grossProfit: 0,
        netProfit: 0,
        salesData: []
      });
    }

    const periodData = trendData.get(dateKey);
    const price = Number(sale.unit_price) || 0;
    const qty = Number(sale.quantity) || 0;
    periodData.sales += price * qty;
    periodData.salesData.push(sale);
  });

  // Process expenses data
  expenses.forEach((expense) => {
    const date = new Date(expense.date || expense.created_at);
    const dateKey = getDateKey(date);
    const dateName = getDateName(date, dateKey);

    if (!trendData.has(dateKey)) {
      trendData.set(dateKey, {
        month: dateKey,
        monthName: dateName,
        sales: 0,
        stockCost: 0,
        operatingExpenses: 0,
        totalExpenses: 0,
        grossProfit: 0,
        netProfit: 0,
        salesData: []
      });
    }

    const periodData = trendData.get(dateKey);
    periodData.operatingExpenses += Number(expense.amount) || 0;
  });

  // Calculate costs and profits for each period
  for (const [dateKey, periodData] of trendData.entries()) {
    if (periodData.salesData.length > 0) {
      periodData.stockCost = calculateSalesCostFromInventory(periodData.salesData, products);
    }

    periodData.totalExpenses = periodData.operatingExpenses;
    periodData.grossProfit = periodData.sales - periodData.stockCost;
    periodData.netProfit = periodData.grossProfit - periodData.totalExpenses;

    // Clean up temporary data
    delete periodData.salesData;
  }

  return Array.from(trendData.values()).sort((a, b) => a.month.localeCompare(b.month));
}
