const mongoose = require("mongoose");
const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");
const {
	validateCreateBudget,
	validateUpdateBudget,
} = require("../validators/budgetValidator");
const { sendSuccess, sendError } = require("../utils/responseFormatter");

/**
 * Helper: Calculate spent amount for a given user, category, and month
 * using MongoDB aggregation pipeline.
 */
const calculateSpentAmount = async (userId, category, month) => {
	// Parse month string "YYYY-MM" into date range
	const [year, mon] = month.split("-").map(Number);
	const startDate = new Date(year, mon - 1, 1);
	const endDate = new Date(year, mon, 0, 23, 59, 59, 999); // last day of month

	const result = await Transaction.aggregate([
		{
			$match: {
				userId: new mongoose.Types.ObjectId(userId),
				type: "expense",
				category: category,
				transactionDate: { $gte: startDate, $lte: endDate },
			},
		},
		{
			$group: {
				_id: null,
				totalSpent: { $sum: "$amount" },
			},
		},
	]);

	return result.length > 0 ? result[0].totalSpent : 0;
};

// Create Budget
const createBudget = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { category, monthlyLimit, month } = req.body;

		// Validate input
		const { error, value } = validateCreateBudget({
			category,
			monthlyLimit,
			month,
		});

		if (error) {
			const details = {};
			error.details.forEach((detail) => {
				details[detail.context.key] = detail.message;
			});
			return sendError(
				res,
				"Validation failed",
				"VALIDATION_ERROR",
				422,
				details,
			);
		}

		// Check for duplicate budget (same user, category, month)
		const existingBudget = await Budget.findOne({
			userId,
			category: value.category,
			month: value.month,
		});

		if (existingBudget) {
			return sendError(
				res,
				`Budget for ${value.category} in ${value.month} already exists`,
				"DUPLICATE_BUDGET",
				409,
				{
					category: value.category,
					month: value.month,
				},
			);
		}

		// Calculate current spent amount from transactions
		const spentAmount = await calculateSpentAmount(
			userId,
			value.category,
			value.month,
		);

		// Create budget
		const budget = new Budget({
			userId,
			category: value.category,
			monthlyLimit: value.monthlyLimit,
			spentAmount,
			month: value.month,
		});

		await budget.save();

		sendSuccess(
			res,
			{
				id: budget._id,
				userId: budget.userId,
				category: budget.category,
				monthlyLimit: budget.monthlyLimit,
				spentAmount: budget.spentAmount,
				remainingAmount: budget.remainingAmount,
				month: budget.month,
				createdAt: budget.createdAt,
			},
			"Budget created successfully",
			201,
		);
	} catch (error) {
		next(error);
	}
};

// Get All Budgets (with optional month filter)
const getAllBudgets = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { month } = req.query;

		// Build filter
		const filter = { userId };

		if (month) {
			// Validate month format
			if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
				return sendError(
					res,
					"Invalid month format. Use YYYY-MM",
					"INVALID_MONTH_FORMAT",
					400,
				);
			}
			filter.month = month;
		}

		const budgets = await Budget.find(filter).sort({ month: -1, category: 1 });

		// Recalculate spent amounts from transactions for accuracy
		const budgetsWithCalculations = await Promise.all(
			budgets.map(async (budget) => {
				const spentAmount = await calculateSpentAmount(
					userId,
					budget.category,
					budget.month,
				);

				// Update the budget if spent amount changed
				if (spentAmount !== budget.spentAmount) {
					budget.spentAmount = spentAmount;
					await budget.save();
				}

				return {
					id: budget._id,
					userId: budget.userId,
					category: budget.category,
					monthlyLimit: budget.monthlyLimit,
					spentAmount: budget.spentAmount,
					remainingAmount: budget.remainingAmount,
					month: budget.month,
					status:
						budget.spentAmount > budget.monthlyLimit
							? "exceeded"
							: budget.spentAmount >= budget.monthlyLimit * 0.8
								? "warning"
								: "on-track",
					createdAt: budget.createdAt,
					updatedAt: budget.updatedAt,
				};
			}),
		);

		sendSuccess(
			res,
			{ budgets: budgetsWithCalculations },
			"Budgets retrieved successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

// Get Single Budget
const getBudget = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;

		const budget = await Budget.findOne({ _id: id, userId });

		if (!budget) {
			return sendError(res, "Budget not found", "BUDGET_NOT_FOUND", 404);
		}

		// Recalculate spent amount for accuracy
		const spentAmount = await calculateSpentAmount(
			userId,
			budget.category,
			budget.month,
		);

		if (spentAmount !== budget.spentAmount) {
			budget.spentAmount = spentAmount;
			await budget.save();
		}

		sendSuccess(
			res,
			{
				id: budget._id,
				userId: budget.userId,
				category: budget.category,
				monthlyLimit: budget.monthlyLimit,
				spentAmount: budget.spentAmount,
				remainingAmount: budget.remainingAmount,
				month: budget.month,
				status:
					budget.spentAmount > budget.monthlyLimit
						? "exceeded"
						: budget.spentAmount >= budget.monthlyLimit * 0.8
							? "warning"
							: "on-track",
				createdAt: budget.createdAt,
				updatedAt: budget.updatedAt,
			},
			"Budget retrieved successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

// Update Budget (only monthlyLimit can be updated)
const updateBudget = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;
		const { monthlyLimit } = req.body;

		// Validate input
		const { error } = validateUpdateBudget({ monthlyLimit });

		if (error) {
			const details = {};
			error.details.forEach((detail) => {
				details[detail.context.key] = detail.message;
			});
			return sendError(
				res,
				"Validation failed",
				"VALIDATION_ERROR",
				422,
				details,
			);
		}

		// Find budget
		const budget = await Budget.findOne({ _id: id, userId });

		if (!budget) {
			return sendError(res, "Budget not found", "BUDGET_NOT_FOUND", 404);
		}

		// Recalculate spent amount
		const spentAmount = await calculateSpentAmount(
			userId,
			budget.category,
			budget.month,
		);

		// Update fields
		budget.monthlyLimit = monthlyLimit;
		budget.spentAmount = spentAmount;
		await budget.save();

		sendSuccess(
			res,
			{
				id: budget._id,
				userId: budget.userId,
				category: budget.category,
				monthlyLimit: budget.monthlyLimit,
				spentAmount: budget.spentAmount,
				remainingAmount: budget.remainingAmount,
				month: budget.month,
				status:
					budget.spentAmount > budget.monthlyLimit
						? "exceeded"
						: budget.spentAmount >= budget.monthlyLimit * 0.8
							? "warning"
							: "on-track",
				updatedAt: budget.updatedAt,
			},
			"Budget updated successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

// Delete Budget
const deleteBudget = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;

		const budget = await Budget.findOneAndDelete({ _id: id, userId });

		if (!budget) {
			return sendError(res, "Budget not found", "BUDGET_NOT_FOUND", 404);
		}

		sendSuccess(res, null, "Budget deleted successfully", 200);
	} catch (error) {
		next(error);
	}
};

module.exports = {
	createBudget,
	getAllBudgets,
	getBudget,
	updateBudget,
	deleteBudget,
};
