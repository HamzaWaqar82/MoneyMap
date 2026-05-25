const mongoose = require("mongoose");
const MonthlySummary = require("../models/MonthlySummary");
const Transaction = require("../models/Transaction");
const Category = require("../models/Category");

/**
 * Monthly Summary Service
 *
 * Maintains materialized monthly summaries for fast dashboard queries.
 * Rebuilt incrementally when transactions are added/updated/deleted.
 *
 * This avoids running expensive aggregation pipelines on every dashboard load.
 * Instead, we pre-compute and store the results, updating them only when
 * the underlying data changes.
 */

/**
 * Rebuild the monthly summary for a specific user, month, and category.
 *
 * @param {string} userId - User ID
 * @param {string} month - Month in YYYY-MM format
 * @param {string} categoryName - Category name (maps to Category collection)
 * @param {string} type - "income" or "expense"
 */
const rebuildSummary = async (userId, month, categoryName, type) => {
	const [year, mon] = month.split("-").map(Number);
	const startDate = new Date(year, mon - 1, 1);
	const endDate = new Date(year, mon, 0, 23, 59, 59, 999);

	// Aggregate actual transactions for this user/month/category
	const result = await Transaction.aggregate([
		{
			$match: {
				userId: new mongoose.Types.ObjectId(userId),
				category: categoryName,
				type: type,
				transactionDate: { $gte: startDate, $lte: endDate },
			},
		},
		{
			$group: {
				_id: null,
				totalAmount: { $sum: "$amount" },
				totalAmountPaisas: {
					$sum: {
						$ifNull: ["$amountPaisas", { $multiply: ["$amount", 100] }],
					},
				},
				count: { $sum: 1 },
			},
		},
	]);

	// Find the category document
	const category = await Category.findOne({ name: categoryName }).lean();

	if (!category) {
		// Category doesn't exist in the new system — skip
		return;
	}

	const totalAmountPaisas = result.length > 0 ? Math.round(result[0].totalAmountPaisas) : 0;
	const transactionCount = result.length > 0 ? result[0].count : 0;

	if (transactionCount === 0) {
		// No transactions — remove the summary entry if it exists
		await MonthlySummary.deleteOne({
			userId: new mongoose.Types.ObjectId(userId),
			month,
			categoryId: category._id,
		});
		return;
	}

	// Upsert the summary
	await MonthlySummary.findOneAndUpdate(
		{
			userId: new mongoose.Types.ObjectId(userId),
			month,
			categoryId: category._id,
		},
		{
			$set: {
				categoryName: category.name,
				type,
				totalAmountPaisas,
				transactionCount,
				lastUpdated: new Date(),
			},
		},
		{ upsert: true, new: true },
	);
};

/**
 * Rebuild all monthly summaries for a user's month.
 * Called when bulk importing transactions.
 *
 * @param {string} userId - User ID
 * @param {string} month - Month in YYYY-MM format
 */
const rebuildMonthFull = async (userId, month) => {
	const [year, mon] = month.split("-").map(Number);
	const startDate = new Date(year, mon - 1, 1);
	const endDate = new Date(year, mon, 0, 23, 59, 59, 999);

	// Get all categories used in this month
	const usedCategories = await Transaction.aggregate([
		{
			$match: {
				userId: new mongoose.Types.ObjectId(userId),
				transactionDate: { $gte: startDate, $lte: endDate },
			},
		},
		{
			$group: {
				_id: { category: "$category", type: "$type" },
			},
		},
	]);

	// Rebuild each category summary
	for (const item of usedCategories) {
		await rebuildSummary(userId, month, item._id.category, item._id.type);
	}
};

/**
 * Trigger summary rebuild when a transaction changes.
 * Call this after create/update/delete transaction operations.
 *
 * @param {string} userId - User ID
 * @param {Date} transactionDate - The transaction's date
 * @param {string} category - Category name
 * @param {string} type - "income" or "expense"
 */
const onTransactionChange = async (userId, transactionDate, category, type) => {
	const date = new Date(transactionDate);
	const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
	await rebuildSummary(userId, month, category, type);
};

/**
 * Get monthly summary for a user.
 *
 * @param {string} userId - User ID
 * @param {string} month - Month in YYYY-MM format
 * @returns {Promise<Object>} Summary with totals, breakdown, etc.
 */
const getMonthlySummary = async (userId, month) => {
	const summaries = await MonthlySummary.find({
		userId: new mongoose.Types.ObjectId(userId),
		month,
	})
		.populate("categoryId", "name icon color type")
		.lean();

	let totalIncomePaisas = 0;
	let totalExpensePaisas = 0;
	const categories = [];

	for (const summary of summaries) {
		if (summary.type === "income") {
			totalIncomePaisas += summary.totalAmountPaisas;
		} else {
			totalExpensePaisas += summary.totalAmountPaisas;
		}

		categories.push({
			categoryId: summary.categoryId?._id || summary.categoryId,
			name: summary.categoryName,
			icon: summary.categoryId?.icon || "",
			color: summary.categoryId?.color || "#7F8C8D",
			type: summary.type,
			totalAmountPaisas: summary.totalAmountPaisas,
			totalAmountPKR: summary.totalAmountPaisas / 100,
			transactionCount: summary.transactionCount,
		});
	}

	const netSavingsPaisas = totalIncomePaisas - totalExpensePaisas;
	const savingsRate = totalIncomePaisas > 0
		? parseFloat(((netSavingsPaisas / totalIncomePaisas) * 100).toFixed(2))
		: 0;

	return {
		month,
		totalIncomePKR: totalIncomePaisas / 100,
		totalExpensePKR: totalExpensePaisas / 100,
		netSavingsPKR: netSavingsPaisas / 100,
		savingsRate: `${savingsRate}%`,
		categories: categories.sort((a, b) => b.totalAmountPaisas - a.totalAmountPaisas),
	};
};

module.exports = {
	rebuildSummary,
	rebuildMonthFull,
	onTransactionChange,
	getMonthlySummary,
};
