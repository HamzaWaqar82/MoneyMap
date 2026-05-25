const Notification = require("../models/Notification");

/**
 * Notification Trigger Service
 *
 * Fires budget alerts when spending thresholds are crossed.
 * Integrates with the existing Notification model and controller.
 *
 * Threshold rules:
 *   ≥80% → budget_alert (warning)
 *   ≥100% → budget_alert (exceeded)
 *
 * Dedup: Won't fire the same alert twice in the same month for the same budget.
 */

/**
 * Check updated budgets and fire notifications for threshold crossings.
 *
 * @param {string} userId
 * @param {Object[]} updatedBudgets - From budgetSync.syncBudgets()
 * @returns {Object[]} Array of notifications created
 */
const checkAndNotify = async (userId, updatedBudgets) => {
	if (!userId || !updatedBudgets || updatedBudgets.length === 0) return [];

	const created = [];

	for (const budget of updatedBudgets) {
		const { category, month, monthlyLimit, oldSpent, newSpent, percentUsed } = budget;

		// Calculate old percentage
		const oldPercent = monthlyLimit > 0 ? Math.round((oldSpent / monthlyLimit) * 100) : 0;

		// ── Exceeded threshold (≥100%) ──
		if (percentUsed >= 100 && oldPercent < 100) {
			const overspent = (newSpent - monthlyLimit).toFixed(2);
			const message = `🚨 Budget exceeded! You've spent Rs. ${newSpent.toFixed(2)} on ${category} this month — Rs. ${overspent} over your Rs. ${monthlyLimit.toFixed(2)} limit.`;

			// Dedup: check if we already sent this exact alert this month
			const existing = await Notification.findOne({
				userId,
				type: "budget_alert",
				message: { $regex: `exceeded.*${category}.*${month.replace("-", ".*")}` },
				createdAt: { $gte: getMonthStart(month) },
			});

			if (!existing) {
				const notif = await Notification.create({
					userId,
					type: "budget_alert",
					message,
				});
				created.push(notif);
			}
		}

		// ── Warning threshold (≥80%, <100%) ──
		else if (percentUsed >= 80 && oldPercent < 80) {
			const remaining = (monthlyLimit - newSpent).toFixed(2);
			const message = `⚠️ Budget warning: You've used ${percentUsed}% of your ${category} budget. Rs. ${remaining} remaining out of Rs. ${monthlyLimit.toFixed(2)}.`;

			const existing = await Notification.findOne({
				userId,
				type: "budget_alert",
				message: { $regex: `warning.*${category}` },
				createdAt: { $gte: getMonthStart(month) },
			});

			if (!existing) {
				const notif = await Notification.create({
					userId,
					type: "budget_alert",
					message,
				});
				created.push(notif);
			}
		}
	}

	return created;
};

/**
 * Get the start date of a month for dedup queries.
 * @param {string} month - "YYYY-MM"
 * @returns {Date}
 */
const getMonthStart = (month) => {
	const [year, mon] = month.split("-").map(Number);
	return new Date(year, mon - 1, 1);
};

module.exports = { checkAndNotify };
