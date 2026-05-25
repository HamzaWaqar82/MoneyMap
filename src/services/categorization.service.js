const Category = require("../models/Category");

/**
 * Auto-Categorization Engine — Rule-Based with Confidence Scoring
 *
 * Categorizes raw Pakistani bank transaction descriptions into spending categories.
 * Uses a multi-tier matching strategy:
 *
 *   1. Exact keyword match against category keywords (high confidence)
 *   2. Pattern-based rules for common Pakistani bank formats (medium confidence)
 *   3. Fuzzy partial match (low confidence)
 *   4. Fallback to "Other" (zero confidence, needs review)
 *
 * Returns: { categoryId, categoryName, confidence: 0-1, needsReview: boolean }
 *
 * User corrections feed back into the system by adding new keywords
 * to categories, improving accuracy over time.
 */

// ── Pattern-based rules for Pakistani bank transaction formats ──
// These fire BEFORE keyword matching and override when they match.
const PATTERN_RULES = [
	// ATM withdrawals — always Cash Withdrawal
	{
		pattern: /^ATM[\/\s]/i,
		category: "Cash Withdrawal",
		confidence: 0.95,
	},
	{
		pattern: /ATM WITHDRAWAL/i,
		category: "Cash Withdrawal",
		confidence: 0.95,
	},

	// POS purchases — Shopping (unless overridden by merchant keyword)
	{
		pattern: /^POS[\/\s]|POS PURCHASE/i,
		category: "Shopping",
		confidence: 0.7,
	},

	// Salary credits
	{
		pattern: /SALARY\s+CREDIT|PAYROLL|SAL\s+CR/i,
		category: "Salary",
		confidence: 0.95,
	},

	// IBFT / Fund transfers
	{
		pattern: /^IBFT[\/\s]|^FT[\/\s]|INTER\s*BANK|FUND\s*TRANSFER/i,
		category: "Transfer",
		confidence: 0.8,
	},

	// Raast transfers
	{
		pattern: /RAAST/i,
		category: "Transfer",
		confidence: 0.85,
	},

	// JazzCash/Easypaisa mobile topup
	{
		pattern: /TOPUP|TOP-UP|TOP UP|JAZZ\s*LOAD|ZONG\s*LOAD|RECHARGE/i,
		category: "Mobile Topup",
		confidence: 0.9,
	},

	// JazzCash money transfer
	{
		pattern: /MONEY\s*TRANSFER\s*(TO|FROM|VIA)/i,
		category: "Transfer",
		confidence: 0.8,
	},

	// Incoming IBFT
	{
		pattern: /INCOMING\s*IBFT|IBFT\s*CREDIT|CR\s*IBFT/i,
		category: "Transfer",
		confidence: 0.85,
	},

	// Utility bill payments
	{
		pattern: /K-?ELECTRIC|KELECTRIC|LESCO|FESCO|MEPCO|HESCO|GEPCO|IESCO|PESCO|WAPDA/i,
		category: "Bills & Utilities",
		confidence: 0.95,
	},
	{
		pattern: /SNGPL|SUI\s*(NORTHERN|SOUTHERN|GAS)|GAS\s*BILL/i,
		category: "Bills & Utilities",
		confidence: 0.95,
	},
	{
		pattern: /PTCL|NAYATEL|STORMFIBER|TRANSWORLD|INTERNET/i,
		category: "Bills & Utilities",
		confidence: 0.9,
	},

	// Known supermarkets → Groceries
	{
		pattern: /CARREFOUR|METRO\s*CASH|IMTIAZ|AL\s*FATAH|ALFATAH|HYPERSTAR|CHASE.*UP/i,
		category: "Groceries",
		confidence: 0.9,
	},

	// Known fuel stations → Transport
	{
		pattern: /SHELL|PSO|TOTAL\s*PARCO|ATTOCK\s*PETROLEUM|CNG|PETROL/i,
		category: "Transport",
		confidence: 0.85,
	},

	// Ride-hailing → Transport
	{
		pattern: /CAREEM|UBER|INDRIVE|BYKEA/i,
		category: "Transport",
		confidence: 0.9,
	},

	// Subscriptions → Entertainment
	{
		pattern: /NETFLIX|SPOTIFY|YOUTUBE|PRIME\s*VIDEO/i,
		category: "Entertainment",
		confidence: 0.95,
	},
];

// Cache for category data (refreshed periodically)
let categoryCache = null;
let categoryCacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Load and cache category data from DB.
 * @returns {Promise<Object[]>}
 */
const loadCategories = async () => {
	const now = Date.now();
	if (categoryCache && now - categoryCacheTimestamp < CACHE_TTL_MS) {
		return categoryCache;
	}

	categoryCache = await Category.find({}).lean();
	categoryCacheTimestamp = now;
	return categoryCache;
};

/**
 * Invalidate the category cache (call after category CRUD operations).
 */
const invalidateCategoryCache = () => {
	categoryCache = null;
	categoryCacheTimestamp = 0;
};

/**
 * Categorize a single transaction description.
 *
 * @param {string} description - Raw transaction description from bank
 * @param {string} txnType - "debit" or "credit"
 * @returns {Promise<{ categoryId: string, categoryName: string, confidence: number, needsReview: boolean }>}
 */
const categorize = async (description, txnType = "debit") => {
	const categories = await loadCategories();
	const descLower = (description || "").toLowerCase().trim();

	if (!descLower) {
		return getFallbackResult(categories);
	}

	// ── Tier 1: Pattern-based rules (highest priority) ──
	for (const rule of PATTERN_RULES) {
		if (rule.pattern.test(description)) {
			const cat = categories.find(
				(c) => c.name === rule.category && c.isSystem,
			);
			if (cat) {
				// For POS purchases, try to get a more specific category from merchant keywords
				if (rule.category === "Shopping" && rule.confidence < 0.8) {
					const merchantResult = matchByKeywords(descLower, categories, txnType);
					if (merchantResult && merchantResult.confidence > rule.confidence) {
						return merchantResult;
					}
				}

				return {
					categoryId: cat._id.toString(),
					categoryName: cat.name,
					confidence: rule.confidence,
					needsReview: rule.confidence < 0.7,
				};
			}
		}
	}

	// ── Tier 2: Keyword matching against category keywords ──
	const keywordResult = matchByKeywords(descLower, categories, txnType);
	if (keywordResult) {
		return keywordResult;
	}

	// ── Tier 3: Fallback to "Other" ──
	return getFallbackResult(categories);
};

/**
 * Match description against category keywords.
 *
 * @param {string} descLower - Lowercase description
 * @param {Object[]} categories - All categories
 * @param {string} txnType - "debit" or "credit"
 * @returns {Object|null}
 */
const matchByKeywords = (descLower, categories, txnType) => {
	let bestMatch = null;
	let bestScore = 0;

	for (const cat of categories) {
		// Filter by type compatibility
		if (cat.type !== "both") {
			const catType = cat.type === "income" ? "credit" : "debit";
			if (catType !== txnType) continue;
		}

		if (!cat.keywords || cat.keywords.length === 0) continue;

		for (const keyword of cat.keywords) {
			const kwLower = keyword.toLowerCase();

			if (descLower.includes(kwLower)) {
				// Score based on keyword length relative to description
				// Longer keyword matches = higher confidence
				const score = kwLower.length / descLower.length;
				const confidence = Math.min(0.5 + score, 0.85);

				if (confidence > bestScore) {
					bestScore = confidence;
					bestMatch = {
						categoryId: cat._id.toString(),
						categoryName: cat.name,
						confidence: parseFloat(confidence.toFixed(2)),
						needsReview: confidence < 0.7,
					};
				}
			}
		}
	}

	return bestMatch;
};

/**
 * Get fallback "Other" category result.
 *
 * @param {Object[]} categories - All categories
 * @returns {Object}
 */
const getFallbackResult = (categories) => {
	const other = categories.find(
		(c) => c.name === "Other" && c.isSystem,
	);

	return {
		categoryId: other ? other._id.toString() : null,
		categoryName: "Other",
		confidence: 0,
		needsReview: true,
	};
};

/**
 * Batch-categorize an array of parsed transactions.
 *
 * @param {import('./parsers/BaseParser').ParsedTransaction[]} transactions
 * @returns {Promise<Object[]>} Transactions with category info attached
 */
const categorizeAll = async (transactions) => {
	const results = [];

	for (const txn of transactions) {
		const catResult = await categorize(txn.description, txn.type);

		results.push({
			...txn,
			categoryId: catResult.categoryId,
			categoryName: catResult.categoryName,
			confidence: catResult.confidence,
			needsReview: catResult.needsReview,
		});
	}

	return results;
};

module.exports = {
	categorize,
	categorizeAll,
	invalidateCategoryCache,
	PATTERN_RULES,
};
