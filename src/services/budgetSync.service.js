const mongoose = require("mongoose");
const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");

/**
 * Budget Sync Service
 *
 * Recalculates budget spentAmount from actual transaction data.
 * Called after CSV imports and manual transaction creates/deletes.
 *
 * Design: Pull-based reconciliation (query actual transactions) rather than
 * push-based increments — eliminates drift and ensures consistency even if
 * transactions are manually deleted.
 */

/**
 * Sync all budgets for a user in the given months.
 *
 * @param {string} userId
 * @param {string[]} months - Array of "YYYY-MM" strings
 * @returns {Object[]} Array of budgets that were updated, with old/new spent amounts
 */
const syncBudgets = async (userId, months) => {
	if (!userId || !months || months.length === 0) return [];

	const userObjId = new mongoose.Types.ObjectId(userId);
	const updatedBudgets = [];

	for (const month of months) {
		// Find all budgets for this user+month
		const budgets = await Budget.find({ userId, month });

		if (budgets.length === 0) continue;

		// Parse month range
		const [year, mon] = month.split("-").map(Number);
		const startDate = new Date(year, mon - 1, 1);
		const endDate = new Date(year, mon, 0, 23, 59, 59, 999);

		// Aggregate actual spending per category for this month
		const spendingByCategory = await Transaction.aggregate([
			{
				$match: {
					userId: userObjId,
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

		// Build lookup map
		const spendingMap = {};
		spendingByCategory.forEach((item) => {
			spendingMap[item._id] = item.totalSpent;
		});

		// Update each budget
		for (const budget of budgets) {
			const oldSpent = budget.spentAmount;
			const newSpent = spendingMap[budget.category] || 0;

			// Only update if changed (avoid unnecessary writes)
			if (Math.abs(oldSpent - newSpent) >= 0.01) {
				budget.spentAmount = newSpent;
				await budget.save(); // Triggers pre-save hook for remainingAmount

				updatedBudgets.push({
					budgetId: budget._id,
					category: budget.category,
					month: budget.month,
					monthlyLimit: budget.monthlyLimit,
					oldSpent,
					newSpent,
					remaining: budget.remainingAmount,
					percentUsed: budget.monthlyLimit > 0
						? Math.round((newSpent / budget.monthlyLimit) * 100)
						: 0,
				});
			}
		}
	}

	return updatedBudgets;
};

/**
 * Get budget status summary for a user's month.
 *
 * @param {string} userId
 * @param {string} month - "YYYY-MM"
 * @returns {Object} Summary of budget health
 */
const getBudgetHealth = async (userId, month) => {
	const budgets = await Budget.find({ userId, month }).lean();

	if (budgets.length === 0) return { total: 0, onTrack: 0, warning: 0, exceeded: 0, budgets: [] };

	const result = {
		total: budgets.length,
		onTrack: 0,
		warning: 0,
		exceeded: 0,
		budgets: [],
	};

	budgets.forEach((b) => {
		const pct = b.monthlyLimit > 0 ? (b.spentAmount / b.monthlyLimit) * 100 : 0;
		let status;

		if (pct >= 100) {
			status = "exceeded";
			result.exceeded++;
		} else if (pct >= 80) {
			status = "warning";
			result.warning++;
		} else {
			status = "on-track";
			result.onTrack++;
		}

		result.budgets.push({ ...b, percentUsed: Math.round(pct), status });
	});

	return result;
};

module.exports = { syncBudgets, getBudgetHealth };
