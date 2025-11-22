import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

// Helper function to calculate sales cost using products data
function calculateSalesCostFromInventory(sales: any[], products: any[]) {
  let totalSalesCost = 0;

  for (const sale of sales) {
    // Try to find matching product by product_id
    const product = products.find((item: any) => item.id === sale.product_id);

    if (product && product.avg_unit_cost) {
      // Use average unit cost from products table
      totalSalesCost += (product.avg_unit_cost * sale.quantity);
    }
    // If no matching product found, cost is 0 (don't estimate)
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

    let startDate: string;
    let endDate: string | undefined;

    // 如果有自定義日期範圍，優先使用
    if (customStartDate && customEndDate) {
      const customRange = getCustomDateRange(customStartDate, customEndDate);
      startDate = customRange.start;
      endDate = customRange.end;
    } else {
      // 使用預設日期範圍
      startDate = getDateRangeFilter(dateRange || 'month');
    }

    // 構建查詢，如果有 endDate 則添加上限過濾
    let salesQuery = supabaseAdmin.from("sales").select("*").gte('date', startDate);
    let expensesQuery = supabaseAdmin.from("expenses").select("*").gte('date', startDate);

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

    // Generate monthly trend data
    const monthlySales = generateMonthlyTrendData(sales, expenses, products);

    // Calculate top products
    const productStats = new Map();
    sales.forEach((sale) => {
      const model = sale.model || sale.product_name || 'Unknown';
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

    return NextResponse.json({
      totalSales: totalRevenue,
      totalStockCost: totalCostOfGoodsSold,
      totalOperatingExpenses: totalExpenses,
      grossProfit,
      netProfit,
      productsSold: sales.length,
      topProducts,
      monthlySales
    });

  } catch (error) {
    console.error("Error fetching reports data:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports data" },
      { status: 500 }
    );
  }
}

function generateMonthlyTrendData(sales: any[], expenses: any[], products: any[]) {
  const monthlyData = new Map();

  // Process sales data
  sales.forEach((sale) => {
    const date = new Date(sale.date || sale.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' });

    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, {
        month: monthKey,
        monthName,
        sales: 0,
        stockCost: 0,
        operatingExpenses: 0,
        totalExpenses: 0,
        grossProfit: 0,
        netProfit: 0,
        salesData: []
      });
    }

    const monthData = monthlyData.get(monthKey);
    const price = Number(sale.unit_price) || 0;
    const qty = Number(sale.quantity) || 0;
    monthData.sales += price * qty;
    monthData.salesData.push(sale);
  });

  // Process expenses data
  expenses.forEach((expense) => {
    const date = new Date(expense.date || expense.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' });

    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, {
        month: monthKey,
        monthName,
        sales: 0,
        stockCost: 0,
        operatingExpenses: 0,
        totalExpenses: 0,
        grossProfit: 0,
        netProfit: 0,
        salesData: []
      });
    }

    const monthData = monthlyData.get(monthKey);
    monthData.operatingExpenses += Number(expense.amount) || 0;
  });

  // Calculate costs and profits for each month
  for (const [monthKey, monthData] of monthlyData.entries()) {
    if (monthData.salesData.length > 0) {
      monthData.stockCost = calculateSalesCostFromInventory(monthData.salesData, products);
    }

    monthData.totalExpenses = monthData.operatingExpenses;
    monthData.grossProfit = monthData.sales - monthData.stockCost;
    monthData.netProfit = monthData.grossProfit - monthData.totalExpenses;

    // Clean up temporary data
    delete monthData.salesData;
  }

  return Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month));
}
