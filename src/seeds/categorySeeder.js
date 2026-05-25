const mongoose = require("mongoose");
const Category = require("../models/Category");

/**
 * Pakistan-adapted default categories.
 *
 * These are seeded once on first run. Each category includes keywords
 * used by the auto-categorization engine to match raw bank transaction
 * descriptions to categories.
 */
const SYSTEM_CATEGORIES = [
	// ── Expense Categories ──
	{
		name: "Food & Dining",
		icon: "🍔",
		color: "#E85D3A",
		type: "expense",
		keywords: [
			"restaurant", "food", "eat", "dine", "dining", "mcdonald",
			"kfc", "pizza", "burger", "biryani", "nihari", "subway",
			"dominos", "optp", "howdy", "foodpanda", "delivery",
		],
	},
	{
		name: "Kiryana Store",
		icon: "🏪",
		color: "#7B6F4E",
		type: "expense",
		keywords: [
			"kiryana", "general store", "grocery", "karyana",
			"provision", "mart", "store",
		],
	},
	{
		name: "Chai & Nashta",
		icon: "☕",
		color: "#C4943B",
		type: "expense",
		keywords: [
			"chai", "dhaba", "nashta", "tea", "cafe", "coffee",
			"bakery", "naan", "paratha", "halwa puri",
		],
	},
	{
		name: "Transport",
		icon: "🚗",
		color: "#3B8BD4",
		type: "expense",
		keywords: [
			"careem", "uber", "indrive", "fuel", "petrol", "diesel",
			"shell", "pso", "total", "attock", "cng", "toll",
			"parking", "metro", "bus", "rickshaw",
		],
	},
	{
		name: "Mobile Topup",
		icon: "📱",
		color: "#1D9E75",
		type: "expense",
		keywords: [
			"topup", "top-up", "recharge", "mobilink", "jazz", "zong",
			"telenor", "ufone", "scom", "bundle", "load", "jazz load",
			"zong load",
		],
	},
	{
		name: "Bills & Utilities",
		icon: "💡",
		color: "#EF9F27",
		type: "expense",
		keywords: [
			"k-electric", "kelectric", "ke bill", "sngpl", "sui gas",
			"sui northern", "ptcl", "internet", "wapda", "lesco",
			"fesco", "mepco", "hesco", "gepco", "iesco", "pesco",
			"electricity", "gas bill", "water bill", "nayatel",
			"stormfiber", "transworld",
		],
	},
	{
		name: "Groceries",
		icon: "🛒",
		color: "#639922",
		type: "expense",
		keywords: [
			"carrefour", "metro", "imtiaz", "alfatah", "al-fatah",
			"chase", "hyperstar", "grocery", "supermarket",
			"superstore", "green valley",
		],
	},
	{
		name: "Healthcare",
		icon: "🏥",
		color: "#E24B4A",
		type: "expense",
		keywords: [
			"hospital", "pharmacy", "doctor", "lab", "clinic",
			"medical", "shifa", "agha khan", "aku", "chughtai",
			"indus", "medicine", "health",
		],
	},
	{
		name: "Education",
		icon: "📚",
		color: "#7F77DD",
		type: "expense",
		keywords: [
			"school", "university", "tuition", "fee", "college",
			"academy", "coursera", "udemy", "course", "nust", "lums",
			"itu", "comsats", "fast", "uet",
		],
	},
	{
		name: "Rent",
		icon: "🏠",
		color: "#D85A30",
		type: "expense",
		keywords: ["rent", "lease", "landlord", "kiraya"],
	},
	{
		name: "Shopping",
		icon: "🛍️",
		color: "#C44096",
		type: "expense",
		keywords: [
			"mall", "online", "daraz", "shopping", "amazon",
			"aliexpress", "pos purchase", "pos/", "ecommerce",
		],
	},
	{
		name: "Entertainment",
		icon: "🎬",
		color: "#9B59B6",
		type: "expense",
		keywords: [
			"cinema", "netflix", "youtube", "spotify", "movie",
			"gaming", "playstation", "steam", "nueplex", "cinepax",
		],
	},
	{
		name: "Insurance",
		icon: "🛡️",
		color: "#2C3E50",
		type: "expense",
		keywords: ["insurance", "jubilee", "state life", "efu", "adamjee", "premium"],
	},
	{
		name: "Cash Withdrawal",
		icon: "💵",
		color: "#95A5A6",
		type: "expense",
		keywords: ["atm", "withdrawal", "cash withdrawal", "atm/"],
	},
	// ── Income Categories ──
	{
		name: "Salary",
		icon: "💰",
		color: "#27AE60",
		type: "income",
		keywords: ["salary", "payroll", "wages", "salary credit"],
	},
	{
		name: "Freelance",
		icon: "💻",
		color: "#3498DB",
		type: "income",
		keywords: ["freelance", "upwork", "fiverr", "toptal", "client payment"],
	},
	{
		name: "Investment",
		icon: "📈",
		color: "#F39C12",
		type: "income",
		keywords: ["profit", "dividend", "return", "investment", "markup", "interest"],
	},
	// ── Both (Income & Expense) ──
	{
		name: "Transfer",
		icon: "💸",
		color: "#34495E",
		type: "both",
		keywords: [
			"ibft", "transfer", "sent", "received", "money transfer",
			"ft/", "raast", "incoming ibft", "outgoing",
		],
	},
	{
		name: "Other",
		icon: "⚡",
		color: "#7F8C8D",
		type: "both",
		keywords: [],
	},
];

/**
 * Seed system categories into the database.
 * Idempotent — only inserts categories that don't already exist.
 *
 * @returns {Object} { inserted: number, existing: number, total: number }
 */
const seedCategories = async () => {
	let inserted = 0;
	let existing = 0;

	for (const catData of SYSTEM_CATEGORIES) {
		try {
			const exists = await Category.findOne({
				name: catData.name,
				isSystem: true,
			});

			if (!exists) {
				await Category.create({
					...catData,
					isSystem: true,
					userId: null,
				});
				inserted++;
			} else {
				existing++;
			}
		} catch (error) {
			// Duplicate key errors are fine — means it already exists
			if (error.code === 11000) {
				existing++;
			} else {
				console.error(`[SEEDER] Failed to seed category "${catData.name}":`, error.message);
				throw error;
			}
		}
	}

	console.log(
		`[SEEDER] Categories: ${inserted} inserted, ${existing} already existed, ${SYSTEM_CATEGORIES.length} total system categories`,
	);

	return { inserted, existing, total: SYSTEM_CATEGORIES.length };
};

/**
 * Get all system category IDs mapped by name for fast lookups.
 * Used by the categorization engine.
 *
 * @returns {Map<string, ObjectId>} Map of category name → _id
 */
const getCategoryMap = async () => {
	const categories = await Category.find({ isSystem: true }).lean();
	const map = new Map();
	categories.forEach((cat) => {
		map.set(cat.name, cat._id);
	});
	return map;
};

module.exports = {
	seedCategories,
	getCategoryMap,
	SYSTEM_CATEGORIES,
};
