const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const { sendSuccess, sendError } = require("../utils/responseFormatter");

/**
 * 1. Monthly Expense Summary
 * GET /api/reports/monthly-summary?month=2026-04
 *
 * Uses aggregation pipeline to compute totalIncome, totalExpenses,
 * netSavings, and savingsRate for a given month.
 */
const getMonthlySummary = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { month } = req.query;

		if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
			return sendError(
				res,
				"Month is required in YYYY-MM format (e.g., 2026-04)",
				"INVALID_MONTH",
				400,
			);
		}

		const [year, mon] = month.split("-").map(Number);
		const startDate = new Date(year, mon - 1, 1);
		const endDate = new Date(year, mon, 0, 23, 59, 59, 999);

		const result = await Transaction.aggregate([
			{
				$match: {
					userId: new mongoose.Types.ObjectId(userId),
					transactionDate: { $gte: startDate, $lte: endDate },
				},
			},
			{
				$group: {
					_id: "$type",
					total: { $sum: "$amount" },
					count: { $sum: 1 },
				},
			},
		]);

		let totalIncome = 0;
		let totalExpenses = 0;
		let incomeCount = 0;
		let expenseCount = 0;

		result.forEach((item) => {
			if (item._id === "income") {
				totalIncome = item.total;
				incomeCount = item.count;
			} else if (item._id === "expense") {
				totalExpenses = item.total;
				expenseCount = item.count;
			}
		});

		const netSavings = totalIncome - totalExpenses;
		const savingsRate =
			totalIncome > 0
				? parseFloat(((netSavings / totalIncome) * 100).toFixed(2))
				: 0;

		const monthNames = [
			"January", "February", "March", "April", "May", "June",
			"July", "August", "September", "October", "November", "December",
		];

		sendSuccess(
			res,
			{
				month: monthNames[mon - 1],
				year,
				period: month,
				totalIncome,
				totalExpenses,
				netSavings,
				savingsRate: `${savingsRate}%`,
				transactionCount: {
					income: incomeCount,
					expense: expenseCount,
					total: incomeCount + expenseCount,
				},
			},
			"Monthly summary retrieved successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

/**
 * 2. Category-wise Spending Breakdown
 * GET /api/reports/category-breakdown?month=2026-04
 *
 * Aggregates expenses by category for a given month,
 * showing amount, percentage, and transaction count per category.
 */
const getCategoryBreakdown = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { month } = req.query;

		if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
			return sendError(
				res,
				"Month is required in YYYY-MM format (e.g., 2026-04)",
				"INVALID_MONTH",
				400,
			);
		}

		const [year, mon] = month.split("-").map(Number);
		const startDate = new Date(year, mon - 1, 1);
		const endDate = new Date(year, mon, 0, 23, 59, 59, 999);

		const result = await Transaction.aggregate([
			{
				$match: {
					userId: new mongoose.Types.ObjectId(userId),
					type: "expense",
					transactionDate: { $gte: startDate, $lte: endDate },
				},
			},
			{
				$group: {
					_id: "$category",
					total: { $sum: "$amount" },
					count: { $sum: 1 },
				},
			},
			{
				$sort: { total: -1 },
			},
		]);

		// Calculate grand total for percentage
		const grandTotal = result.reduce((sum, item) => sum + item.total, 0);

		const breakdown = {};
		result.forEach((item) => {
			breakdown[item._id] = {
				amount: item.total,
				percentage: grandTotal > 0
					? parseFloat(((item.total / grandTotal) * 100).toFixed(1))
					: 0,
				transactionCount: item.count,
			};
		});

		sendSuccess(
			res,
			{
				month,
				totalExpenses: grandTotal,
				categories: breakdown,
			},
			"Category breakdown retrieved successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

/**
 * 3. Budget vs Actual Spending
 * GET /api/reports/budget-vs-actual?month=2026-04
 *
 * Compares budgeted amounts against actual spending per category
 * using aggregation to calculate real-time spent amounts.
 */
const getBudgetVsActual = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { month } = req.query;

		if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
			return sendError(
				res,
				"Month is required in YYYY-MM format (e.g., 2026-04)",
				"INVALID_MONTH",
				400,
			);
		}

		const [year, mon] = month.split("-").map(Number);
		const startDate = new Date(year, mon - 1, 1);
		const endDate = new Date(year, mon, 0, 23, 59, 59, 999);

		// Get all budgets for this month
		const budgets = await Budget.find({
			userId,
			month,
		});

		if (budgets.length === 0) {
			return sendSuccess(
				res,
				{ month, comparisons: {} },
				"No budgets found for this month",
				200,
			);
		}

		// Get actual spending by category using aggregation
		const actualSpending = await Transaction.aggregate([
			{
				$match: {
					userId: new mongoose.Types.ObjectId(userId),
					type: "expense",
					transactionDate: { $gte: startDate, $lte: endDate },
				},
			},
			{
				$group: {
					_id: "$category",
					totalSpent: { $sum: "$amount" },
					count: { $sum: 1 },
				},
			},
		]);

		// Create a map of actual spending
		const spendingMap = {};
		actualSpending.forEach((item) => {
			spendingMap[item._id] = {
				totalSpent: item.totalSpent,
				count: item.count,
			};
		});

		// Build comparison
		const comparisons = {};
		budgets.forEach((budget) => {
			const spent = spendingMap[budget.category]?.totalSpent || 0;
			const remaining = budget.monthlyLimit - spent;
			const usagePercentage = budget.monthlyLimit > 0
				? parseFloat(((spent / budget.monthlyLimit) * 100).toFixed(1))
				: 0;

			let status;
			if (spent > budget.monthlyLimit) {
				status = "exceeded";
			} else if (usagePercentage >= 80) {
				status = "warning";
			} else {
				status = "on-track";
			}

			comparisons[budget.category] = {
				budget: budget.monthlyLimit,
				spent,
				remaining,
				usagePercentage,
				status,
				transactionCount: spendingMap[budget.category]?.count || 0,
			};
		});

		sendSuccess(
			res,
			{ month, comparisons },
			"Budget vs actual comparison retrieved successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

/**
 * 4. Income vs Expense Trend
 * GET /api/reports/income-expense-trend?months=6
 *
 * Returns income and expense totals for the last N months
 * for trend/chart visualization.
 */
const getIncomeExpenseTrend = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const months = parseInt(req.query.months, 10) || 6;

		if (months < 1 || months > 24) {
			return sendError(
				res,
				"Months must be between 1 and 24",
				"INVALID_MONTHS",
				400,
			);
		}

		// Calculate the start date (N months ago from the start of current month)
		const now = new Date();
		const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

		const result = await Transaction.aggregate([
			{
				$match: {
					userId: new mongoose.Types.ObjectId(userId),
					transactionDate: { $gte: startDate },
				},
			},
			{
				$group: {
					_id: {
						year: { $year: "$transactionDate" },
						month: { $month: "$transactionDate" },
						type: "$type",
					},
					total: { $sum: "$amount" },
					count: { $sum: 1 },
				},
			},
			{
				$sort: { "_id.year": 1, "_id.month": 1 },
			},
		]);

		// Build monthly trend data
		const monthNames = [
			"January", "February", "March", "April", "May", "June",
			"July", "August", "September", "October", "November", "December",
		];

		const trendMap = {};

		// Initialize all months with zero values
		for (let i = 0; i < months; i++) {
			const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
			trendMap[key] = {
				month: monthNames[d.getMonth()],
				year: d.getFullYear(),
				period: key,
				income: 0,
				expenses: 0,
				netSavings: 0,
			};
		}

		// Fill in actual data
		result.forEach((item) => {
			const key = `${item._id.year}-${String(item._id.month).padStart(2, "0")}`;
			if (trendMap[key]) {
				if (item._id.type === "income") {
					trendMap[key].income = item.total;
				} else if (item._id.type === "expense") {
					trendMap[key].expenses = item.total;
				}
			}
		});

		// Calculate net savings and convert to array
		const trend = Object.values(trendMap).map((entry) => ({
			...entry,
			netSavings: entry.income - entry.expenses,
		}));

		sendSuccess(
			res,
			{
				months,
				trend,
			},
			"Income vs expense trend retrieved successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

/**
 * 5. Spending Comparison (Year-over-Year)
 * GET /api/reports/yoy-comparison?year=2026&previousYear=2025
 *
 * Compares total spending by category between two years.
 */
const getYoyComparison = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const currentYear = parseInt(req.query.year, 10);
		const previousYear = parseInt(req.query.previousYear, 10);

		if (!currentYear || !previousYear) {
			return sendError(
				res,
				"Both year and previousYear are required (e.g., ?year=2026&previousYear=2025)",
				"MISSING_YEARS",
				400,
			);
		}

		if (currentYear <= previousYear) {
			return sendError(
				res,
				"year must be greater than previousYear",
				"INVALID_YEAR_ORDER",
				400,
			);
		}

		// Aggregate expenses for both years
		const result = await Transaction.aggregate([
			{
				$match: {
					userId: new mongoose.Types.ObjectId(userId),
					type: "expense",
					transactionDate: {
						$gte: new Date(previousYear, 0, 1),
						$lte: new Date(currentYear, 11, 31, 23, 59, 59, 999),
					},
				},
			},
			{
				$group: {
					_id: {
						year: { $year: "$transactionDate" },
						category: "$category",
					},
					total: { $sum: "$amount" },
					count: { $sum: 1 },
				},
			},
			{
				$sort: { "_id.category": 1 },
			},
		]);

		// Organize data by category
		const categoryMap = {};

		result.forEach((item) => {
			const category = item._id.category;
			if (!categoryMap[category]) {
				categoryMap[category] = {
					[previousYear]: 0,
					[currentYear]: 0,
					change: 0,
					changePercentage: "0%",
				};
			}
			categoryMap[category][item._id.year] = item.total;
		});

		// Calculate changes
		Object.keys(categoryMap).forEach((category) => {
			const prev = categoryMap[category][previousYear];
			const curr = categoryMap[category][currentYear];
			categoryMap[category].change = curr - prev;
			categoryMap[category].changePercentage = prev > 0
				? `${parseFloat(((curr - prev) / prev * 100).toFixed(1))}%`
				: curr > 0 ? "N/A (no previous data)" : "0%";
		});

		// Calculate totals
		let totalPrevious = 0;
		let totalCurrent = 0;
		Object.values(categoryMap).forEach((cat) => {
			totalPrevious += cat[previousYear];
			totalCurrent += cat[currentYear];
		});

		sendSuccess(
			res,
			{
				currentYear,
				previousYear,
				categories: categoryMap,
				totals: {
					[previousYear]: totalPrevious,
					[currentYear]: totalCurrent,
					change: totalCurrent - totalPrevious,
					changePercentage: totalPrevious > 0
						? `${parseFloat(((totalCurrent - totalPrevious) / totalPrevious * 100).toFixed(1))}%`
						: totalCurrent > 0 ? "N/A" : "0%",
				},
			},
			"Year-over-year comparison retrieved successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

/**
 * 6. Upcoming Bill Alerts
 * GET /api/reports/alerts
 *
 * Returns budgets that are nearing their limits (>80% spent)
 * or have already been exceeded.
 */
const getBudgetAlerts = async (req, res, next) => {
	try {
		const userId = req.user.id;

		// Default to current month
		const now = new Date();
		const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
		const month = req.query.month || currentMonth;

		if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
			return sendError(
				res,
				"Month must be in YYYY-MM format",
				"INVALID_MONTH",
				400,
			);
		}

		const [year, mon] = month.split("-").map(Number);
		const startDate = new Date(year, mon - 1, 1);
		const endDate = new Date(year, mon, 0, 23, 59, 59, 999);

		// Get all budgets for the month
		const budgets = await Budget.find({ userId, month });

		if (budgets.length === 0) {
			return sendSuccess(
				res,
				{ month, alerts: [], summary: { total: 0, exceeded: 0, warning: 0 } },
				"No budgets found for this month",
				200,
			);
		}

		// Get actual spending by category
		const actualSpending = await Transaction.aggregate([
			{
				$match: {
					userId: new mongoose.Types.ObjectId(userId),
					type: "expense",
					transactionDate: { $gte: startDate, $lte: endDate },
				},
			},
			{
				$group: {
					_id: "$category",
					totalSpent: { $sum: "$amount" },
				},
			},
		]);

		const spendingMap = {};
		actualSpending.forEach((item) => {
			spendingMap[item._id] = item.totalSpent;
		});

		// Find budgets at risk (>80% spent or exceeded)
		const alerts = [];
		let exceededCount = 0;
		let warningCount = 0;

		budgets.forEach((budget) => {
			const spent = spendingMap[budget.category] || 0;
			const usagePercentage = budget.monthlyLimit > 0
				? parseFloat(((spent / budget.monthlyLimit) * 100).toFixed(1))
				: 0;

			if (usagePercentage >= 80) {
				const alert = {
					budgetId: budget._id,
					category: budget.category,
					monthlyLimit: budget.monthlyLimit,
					spent,
					remaining: budget.monthlyLimit - spent,
					usagePercentage,
					severity: spent > budget.monthlyLimit ? "exceeded" : "warning",
					message: spent > budget.monthlyLimit
						? `${budget.category} budget exceeded by ${(spent - budget.monthlyLimit).toFixed(2)}`
						: `${budget.category} budget is ${usagePercentage}% used (${(budget.monthlyLimit - spent).toFixed(2)} remaining)`,
				};

				if (alert.severity === "exceeded") exceededCount++;
				else warningCount++;

				alerts.push(alert);
			}
		});

		// Sort: exceeded first, then by usage percentage descending
		alerts.sort((a, b) => {
			if (a.severity === "exceeded" && b.severity !== "exceeded") return -1;
			if (a.severity !== "exceeded" && b.severity === "exceeded") return 1;
			return b.usagePercentage - a.usagePercentage;
		});

		sendSuccess(
			res,
			{
				month,
				alerts,
				summary: {
					total: alerts.length,
					exceeded: exceededCount,
					warning: warningCount,
				},
			},
			alerts.length > 0
				? `${alerts.length} budget alert(s) found`
				: "All budgets are on track",
			200,
		);
	} catch (error) {
		next(error);
	}
};

module.exports = {
	getMonthlySummary,
	getCategoryBreakdown,
	getBudgetVsActual,
	getIncomeExpenseTrend,
	getYoyComparison,
	getBudgetAlerts,
};
