const cron = require("node-cron");
const { processExpiredScheduledDeletions } = require("./accountDeletion.service");

const startAccountDeletionCron = () => {
	// Run daily at 2:00 AM — purge accounts past 30-day grace period
	cron.schedule("0 2 * * *", async () => {
		console.log("[CRON] Running scheduled account deletion purge...");
		try {
			const count = await processExpiredScheduledDeletions();
			console.log(`[CRON] Account deletion purge completed. Purged ${count} user(s).`);
		} catch (error) {
			console.error("[CRON] Error purging scheduled account deletions:", error);
		}
	});
};

module.exports = { startAccountDeletionCron };
