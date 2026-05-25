const Transaction = require("../models/Transaction");
const {
	validateCreateTransaction,
	validateUpdateTransaction,
} = require("../validators/transactionValidator");
const { sendSuccess, sendError } = require("../utils/responseFormatter");
const User = require("../models/User");
const { syncBudgets } = require("../services/budgetSync.service");
const { checkAndNotify } = require("../services/notificationTrigger.service");
const { dispatchNotification } = require("../services/pushNotification.service");

const getMonthKey = (date) => {
	const d = new Date(date);
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	return `${year}-${month}`;
};

// Create Transaction
const createTransaction = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const {
			type,
			amount,
			category,
			description,
			transactionDate,
			paymentMethod,
			accountId,
		} = req.body;

		// Validate input
		const { error, value } = validateCreateTransaction({
			type,
			amount,
			category,
			description,
			transactionDate,
			paymentMethod,
			accountId,
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

		// Create transaction
		const transaction = new Transaction({
			userId,
			type: value.type,
			amount: value.amount,
			category: value.category,
			description: value.description,
			transactionDate: value.transactionDate,
			paymentMethod: value.paymentMethod,
			accountId: value.accountId || null,
		});

		await transaction.save();

		// Check for large transaction
		if (transaction.type === "expense" && transaction.amount >= 50000) {
			const user = await User.findById(userId);
			if (user) {
				await dispatchNotification(
					user,
					"transaction_confirmation",
					`Heads up! A large expense of Rs. ${transaction.amount} was recorded for ${transaction.category}.`,
					"high"
				).catch(err => console.error("Dispatch error:", err));
			}
		}

		let alertsTriggered = 0;
		let pushSent = false;
		try {
			const month = getMonthKey(transaction.transactionDate);
			const updatedBudgets = await syncBudgets(userId, [month]);
			const created = await checkAndNotify(userId, updatedBudgets);
			alertsTriggered = created.length;
			pushSent = created.some((r) => r?.pushSent);
		} catch (budgetErr) {
			console.error("Budget sync error:", budgetErr);
		}

		const userForPush = await User.findById(userId).select("pushSubscription");
		const hasPushSubscription = !!userForPush?.pushSubscription;

		sendSuccess(
			res,
			{
				id: transaction._id,
				userId: transaction.userId,
				type: transaction.type,
				amount: transaction.amount,
				category: transaction.category,
				description: transaction.description,
				transactionDate: transaction.transactionDate,
				paymentMethod: transaction.paymentMethod,
				accountId: transaction.accountId,
				createdAt: transaction.createdAt,
				alertsTriggered,
				pushSent,
				hasPushSubscription,
			},
			"Transaction created successfully",
			201,
		);
	} catch (error) {
		next(error);
	}
};

// Get All Transactions (with filtering and pagination)
const getAllTransactions = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const {
			category,
			type,
			startDate,
			endDate,
			page = 1,
			limit = 10,
		} = req.query;

		// Build filter object
		const filter = { userId };

		if (category) {
			filter.category = category;
		}

		if (type) {
			if (!["income", "expense"].includes(type)) {
				return sendError(
					res,
					'Invalid type. Must be "income" or "expense"',
					"INVALID_TYPE",
					400,
				);
			}
			filter.type = type;
		}

		if (startDate || endDate) {
			filter.transactionDate = {};
			if (startDate) {
				const start = new Date(startDate);
				if (isNaN(start.getTime())) {
					return sendError(
						res,
						"Invalid startDate format",
						"INVALID_DATE",
						400,
					);
				}
				filter.transactionDate.$gte = start;
			}
			if (endDate) {
				const end = new Date(endDate);
				if (isNaN(end.getTime())) {
					return sendError(
						res,
						"Invalid endDate format",
						"INVALID_DATE",
						400,
					);
				}
				// Set end date to end of day
				end.setHours(23, 59, 59, 999);
				filter.transactionDate.$lte = end;
			}
		}

		// Pagination
		const pageNum = parseInt(page, 10);
		const limitNum = parseInt(limit, 10);

		if (pageNum < 1 || limitNum < 1) {
			return sendError(
				res,
				"Page and limit must be greater than 0",
				"INVALID_PAGINATION",
				400,
			);
		}

		const skip = (pageNum - 1) * limitNum;

		// Get total count for pagination
		const total = await Transaction.countDocuments(filter);
		const totalPages = Math.ceil(total / limitNum);

		// Fetch transactions
		const transactions = await Transaction.find(filter)
			.sort({ transactionDate: -1 })
			.skip(skip)
			.limit(limitNum);

		sendSuccess(
			res,
			{
				transactions,
				pagination: {
					page: pageNum,
					limit: limitNum,
					total,
					totalPages,
				},
			},
			"Transactions retrieved successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

// Get Single Transaction
const getTransaction = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;

		const transaction = await Transaction.findOne({
			_id: id,
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

		sendSuccess(
			res,
			transaction,
			"Transaction retrieved successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

// Update Transaction
const updateTransaction = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;
		const {
			type,
			amount,
			category,
			description,
			transactionDate,
			paymentMethod,
			accountId,
		} = req.body;

		// Validate input
		const { error } = validateUpdateTransaction({
			type,
			amount,
			category,
			description,
			transactionDate,
			paymentMethod,
			accountId,
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

		// Find transaction
		const transaction = await Transaction.findOne({
			_id: id,
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

		const oldMonth = getMonthKey(transaction.transactionDate);

		// Update fields
		if (type !== undefined) transaction.type = type;
		if (amount !== undefined) transaction.amount = amount;
		if (category !== undefined) transaction.category = category;
		if (description !== undefined) transaction.description = description;
		if (transactionDate !== undefined)
			transaction.transactionDate = transactionDate;
		if (paymentMethod !== undefined)
			transaction.paymentMethod = paymentMethod;
		if (accountId !== undefined)
			transaction.accountId = accountId;

		transaction.updatedAt = Date.now();
		await transaction.save();

		// Sync budgets and trigger alerts
		try {
			const months = new Set([
				oldMonth,
				getMonthKey(transaction.transactionDate),
			]);
			const updatedBudgets = await syncBudgets(userId, Array.from(months));
			await checkAndNotify(userId, updatedBudgets);
		} catch (budgetErr) {
			console.error("Budget sync error:", budgetErr);
		}

		sendSuccess(res, transaction, "Transaction updated successfully", 200);
	} catch (error) {
		next(error);
	}
};

// Delete Transaction
const deleteTransaction = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;

		const transaction = await Transaction.findOneAndDelete({
			_id: id,
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

		try {
			const month = getMonthKey(transaction.transactionDate);
			await syncBudgets(userId, [month]);
		} catch (budgetErr) {
			console.error("Budget sync on delete error:", budgetErr);
		}

		sendSuccess(res, null, "Transaction deleted successfully", 200);
	} catch (error) {
		next(error);
	}
};

module.exports = {
	createTransaction,
	getAllTransactions,
	getTransaction,
	updateTransaction,
	deleteTransaction,
};
