const Account = require("../models/Account");
const Transaction = require("../models/Transaction");
const {
	validateCreateAccount,
	validateUpdateAccount,
} = require("../validators/accountValidator");
const { sendSuccess, sendError } = require("../utils/responseFormatter");

/**
 * Create a new account (bank/wallet/card/cash)
 * POST /api/accounts
 */
const createAccount = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { name, type, provider, currency, maskedAccountNumber } = req.body;

		const { error, value } = validateCreateAccount({
			name, type, provider, currency, maskedAccountNumber,
		});

		if (error) {
			const details = {};
			error.details.forEach((detail) => {
				details[detail.context.key] = detail.message;
			});
			return sendError(res, "Validation failed", "VALIDATION_ERROR", 422, details);
		}

		// Check for duplicate account
		const existing = await Account.findOne({
			userId,
			provider: value.provider,
			name: value.name,
		});

		if (existing) {
			return sendError(
				res,
				`You already have an account named "${value.name}" with ${value.provider}`,
				"DUPLICATE_ACCOUNT",
				409,
			);
		}

		const account = new Account({
			userId,
			name: value.name,
			type: value.type,
			provider: value.provider,
			currency: value.currency,
			maskedAccountNumber: value.maskedAccountNumber || null,
		});

		await account.save();

		sendSuccess(
			res,
			{
				id: account._id,
				name: account.name,
				type: account.type,
				provider: account.provider,
				currency: account.currency,
				maskedAccountNumber: account.maskedAccountNumber,
				isActive: account.isActive,
				createdAt: account.createdAt,
			},
			"Account created successfully",
			201,
		);
	} catch (error) {
		next(error);
	}
};

/**
 * Get all accounts for the authenticated user
 * GET /api/accounts
 * Query: ?active=true (filter by active status)
 */
const getAllAccounts = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { active } = req.query;

		const filter = { userId };
		if (active !== undefined) {
			filter.isActive = active === "true";
		}

		const accounts = await Account.find(filter).sort({ createdAt: -1 });

		// Get transaction counts per account for enrichment
		const accountIds = accounts.map((a) => a._id);
		const txnCounts = await Transaction.aggregate([
			{
				$match: {
					userId: accounts.length > 0 ? accounts[0].userId : null,
					accountId: { $in: accountIds },
				},
			},
			{
				$group: {
					_id: "$accountId",
					count: { $sum: 1 },
				},
			},
		]);

		const countMap = {};
		txnCounts.forEach((item) => {
			countMap[item._id.toString()] = item.count;
		});

		const enrichedAccounts = accounts.map((account) => ({
			...account.toObject(),
			transactionCount: countMap[account._id.toString()] || 0,
		}));

		sendSuccess(
			res,
			{ accounts: enrichedAccounts, total: enrichedAccounts.length },
			"Accounts retrieved successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

/**
 * Get a single account by ID
 * GET /api/accounts/:id
 */
const getAccount = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;

		const account = await Account.findOne({ _id: id, userId });

		if (!account) {
			return sendError(res, "Account not found", "ACCOUNT_NOT_FOUND", 404);
		}

		sendSuccess(res, account, "Account retrieved successfully", 200);
	} catch (error) {
		next(error);
	}
};

/**
 * Update an account
 * PUT /api/accounts/:id
 */
const updateAccount = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;

		const { error, value } = validateUpdateAccount(req.body);

		if (error) {
			const details = {};
			error.details.forEach((detail) => {
				details[detail.context.key] = detail.message;
			});
			return sendError(res, "Validation failed", "VALIDATION_ERROR", 422, details);
		}

		const account = await Account.findOne({ _id: id, userId });

		if (!account) {
			return sendError(res, "Account not found", "ACCOUNT_NOT_FOUND", 404);
		}

		// Update fields
		Object.keys(value).forEach((key) => {
			if (value[key] !== undefined) {
				account[key] = value[key];
			}
		});

		await account.save();

		sendSuccess(res, account, "Account updated successfully", 200);
	} catch (error) {
		next(error);
	}
};

/**
 * Delete (soft-delete) an account
 * DELETE /api/accounts/:id
 *
 * Soft-deletes the account to preserve transaction history.
 * Transactions linked to this account are NOT deleted.
 */
const deleteAccount = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;

		const account = await Account.findOne({ _id: id, userId });

		if (!account) {
			return sendError(res, "Account not found", "ACCOUNT_NOT_FOUND", 404);
		}

		if (!account.isActive) {
			return sendError(
				res,
				"Account is already deactivated",
				"ACCOUNT_ALREADY_INACTIVE",
				409,
			);
		}

		await account.softDelete();

		sendSuccess(res, null, "Account deactivated successfully", 200);
	} catch (error) {
		next(error);
	}
};

module.exports = {
	createAccount,
	getAllAccounts,
	getAccount,
	updateAccount,
	deleteAccount,
};
