const cron = require("node-cron");
const SavingsGoal = require("../models/SavingsGoal");
const User = require("../models/User");
const { dispatchNotification } = require("./pushNotification.service");

const startNotificationCron = () => {
	// Run every day at 10:00 AM server time
	cron.schedule("0 10 * * *", async () => {
		console.log("[CRON] Running daily goal reminder check...");
		try {
			const goals = await SavingsGoal.find({ status: "active" });
			const now = new Date();

			for (const goal of goals) {
				if (!goal.reminderFrequency || goal.reminderFrequency === "none") continue;

				const lastReminded = goal.lastRemindedAt ? new Date(goal.lastRemindedAt) : new Date(0);
				const daysSinceReminded = (now - lastReminded) / (1000 * 60 * 60 * 24);

				let shouldRemind = false;
				
				if (goal.reminderFrequency === "daily" && daysSinceReminded >= 1) {
					shouldRemind = true;
				} else if (goal.reminderFrequency === "weekly" && daysSinceReminded >= 7) {
					shouldRemind = true;
				} else if (goal.reminderFrequency === "monthly" && daysSinceReminded >= 30) {
					shouldRemind = true;
				}

				if (shouldRemind) {
					const user = await User.findById(goal.userId);
					if (user) {
						const remaining = goal.targetAmount - goal.currentAmount;
						const message = `Reminder: You have ${remaining.toFixed(2)} remaining to reach your goal "${goal.title}". Keep saving!`;
						
						// Reminders are 'info' severity (In-App only)
						await dispatchNotification(user, "goal_reminder", message, "info");
						
						goal.lastRemindedAt = now;
						await goal.save();
					}
				}
			}
			console.log("[CRON] Goal reminder check completed.");
		} catch (error) {
			console.error("[CRON] Error checking goal reminders:", error);
		}
	});
};

module.exports = {
	startNotificationCron
};
