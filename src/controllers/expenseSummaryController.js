const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const Category = require("../models/Category");
const { getMonthlySummary } = require("../services/monthlySummary.service");
const { validateReviewTransaction } = require("../validators/csvImportValidator");
const { sendSuccess, sendError } = require("../utils/responseFormatter");

/**
 * Get expense tracker monthly summary (materialized)
 * GET /api/expense-tracker/summary
 * Query: ?month=2026-05
 */
const getExpenseSummary = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { month } = req.query;

		if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
			return sendError(
				res,
				"Month is required in YYYY-MM format (e.g., 2026-05)",
				"INVALID_MONTH",
				400,
			);
		}

		const summary = await getMonthlySummary(userId, month);

		sendSuccess(
			res,
			summary,
			"Expense summary retrieved successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

/**
 * Get per-account spending summary
 * GET /api/expense-tracker/summary/:accountId
 * Query: ?month=2026-05
 */
const getAccountSummary = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { accountId } = req.params;
		const { month } = req.query;

		if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
			return sendError(
				res,
				"Month is required in YYYY-MM format",
				"INVALID_MONTH",
				400,
			);
		}

		const [year, mon] = month.split("-").map(Number);
		const startDate = new Date(year, mon - 1, 1);
		const endDate = new Date(year, mon, 0, 23, 59, 59, 999);

		// Aggregate by category for this specific account
		const result = await Transaction.aggregate([
			{
				$match: {
					userId: new mongoose.Types.ObjectId(userId),
					accountId: new mongoose.Types.ObjectId(accountId),
					transactionDate: { $gte: startDate, $lte: endDate },
				},
			},
			{
				$group: {
					_id: { category: "$category", type: "$type" },
					totalAmount: { $sum: "$amount" },
					count: { $sum: 1 },
				},
			},
			{
				$sort: { totalAmount: -1 },
			},
		]);

		let totalIncome = 0;
		let totalExpenses = 0;
		const categories = [];

		result.forEach((item) => {
			if (item._id.type === "income") {
				totalIncome += item.totalAmount;
			} else {
				totalExpenses += item.totalAmount;
			}
			categories.push({
				category: item._id.category,
				type: item._id.type,
				totalAmountPKR: item.totalAmount,
				transactionCount: item.count,
			});
		});

		sendSuccess(
			res,
			{
				accountId,
				month,
				totalIncomePKR: totalIncome,
				totalExpensePKR: totalExpenses,
				netPKR: totalIncome - totalExpenses,
				categories,
			},
			"Account summary retrieved successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

/**
 * Get review queue — transactions with low confidence categorization
 * GET /api/expense-tracker/review-queue
 * Query: ?page=1&limit=20
 */
const getReviewQueue = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const page = parseInt(req.query.page, 10) || 1;
		const limit = parseInt(req.query.limit, 10) || 20;

		if (page < 1 || limit < 1) {
			return sendError(
				res,
				"Page and limit must be greater than 0",
				"INVALID_PAGINATION",
				400,
			);
		}

		const skip = (page - 1) * limit;

		const filter = {
			userId,
			needsReview: true,
		};

		const total = await Transaction.countDocuments(filter);
		const totalPages = Math.ceil(total / limit);

		const transactions = await Transaction.find(filter)
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.lean();

		// Get all categories for the review UI
		const categories = await Category.find({
			$or: [{ isSystem: true }, { userId }],
		})
			.select("name icon color type")
			.lean();

		sendSuccess(
			res,
			{
				transactions,
				availableCategories: categories,
				pagination: {
					page,
					limit,
					total,
					totalPages,
					hasNextPage: page < totalPages,
					hasPreviousPage: page > 1,
				},
			},
			`${total} transaction(s) need review`,
			200,
		);
	} catch (error) {
		next(error);
	}
};

/**
 * Review and correct a transaction's category
 * PUT /api/expense-tracker/review/:transactionId
 *
 * User confirms or corrects the auto-assigned category.
 * This also trains the categorization engine by adding keywords.
 */
const reviewTransaction = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { transactionId } = req.params;

		const { error, value } = validateReviewTransaction(req.body);

		if (error) {
			const details = {};
			error.details.forEach((detail) => {
				details[detail.context.key] = detail.message;
			});
			return sendError(res, "Validation failed", "VALIDATION_ERROR", 422, details);
		}

		const transaction = await Transaction.findOne({
			_id: transactionId,
			userId,
		});

		if (!transaction) {
			return sendError(
				res,
				"Transaction not found",
				"TRANSACTION_NOT_FOUND",
				404,
			);
		}

		// Get the new category
		const newCategory = await Category.findById(value.categoryId);

		if (!newCategory) {
			return sendError(
				res,
				"Category not found",
				"CATEGORY_NOT_FOUND",
				404,
			);
		}

		// Map to existing category enum for backward compat
		const type = transaction.type;
		const incomeCategories = [
			"Salary", "Freelance", "Investment", "Bonus", "Gift", "Other Income",
		];
		const expenseCategories = [
			"Food", "Transport", "Shopping", "Utilities", "Entertainment",
			"Healthcare", "Education", "Rent", "Insurance", "Other Expense",
		];
		const allExisting = [...incomeCategories, ...expenseCategories];

		let mappedCategory = newCategory.name;
		if (!allExisting.includes(mappedCategory)) {
			// Map new category to closest existing one
			const mapping = {
				"Food & Dining": "Food",
				"Kiryana Store": "Food",
				"Chai & Nashta": "Food",
				"Groceries": "Food",
				"Mobile Topup": "Utilities",
				"Bills & Utilities": "Utilities",
				"Cash Withdrawal": "Other Expense",
				"Transfer": type === "income" ? "Other Income" : "Other Expense",
				"Other": type === "income" ? "Other Income" : "Other Expense",
			};
			mappedCategory = mapping[mappedCategory] ||
				(type === "income" ? "Other Income" : "Other Expense");
		}

		// Update the transaction
		transaction.category = mappedCategory;
		transaction.needsReview = false;
		transaction.confidence = 1.0; // User-confirmed = 100% confidence
		await transaction.save();

		// Optionally: learn from user corrections
		// Extract keywords from description and add to category
		// (This is the "user corrections feed back into rules" pattern)
		const descWords = transaction.description
			?.toLowerCase()
			.split(/[\s\/\-_]+/)
			.filter((w) => w.length >= 3);

		if (descWords && descWords.length > 0) {
			// Add the most distinctive word as a keyword (simple learning)
			const existingKeywords = newCategory.keywords || [];
			const newKeywords = descWords.filter(
				(w) => !existingKeywords.includes(w) && w.length >= 4,
			);

			if (newKeywords.length > 0) {
				// Add up to 2 new keywords per correction
				const toAdd = newKeywords.slice(0, 2);
				await Category.updateOne(
					{ _id: newCategory._id },
					{ $addToSet: { keywords: { $each: toAdd } } },
				);
			}
		}

		sendSuccess(
			res,
			{
				transactionId: transaction._id,
				category: mappedCategory,
				categoryId: newCategory._id,
				confidence: 1.0,
			},
			"Transaction category updated successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

module.exports = {
	getExpenseSummary,
	getAccountSummary,
	getReviewQueue,
	reviewTransaction,
};
