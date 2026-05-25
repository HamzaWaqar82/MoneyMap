const nodemailer = require("nodemailer");
const webpush = require("web-push");
const Notification = require("../models/Notification");

// Initialize web-push
// In a real production scenario, these VAPID keys should be generated once 
// and stored in .env (webpush.generateVAPIDKeys())
const vapidKeys = {
	publicKey: process.env.VAPID_PUBLIC_KEY || "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U",
	privateKey: process.env.VAPID_PRIVATE_KEY || "8Pz2v2qBv8Q4Z4tZpX9J0bY3Q-m7bK7fJ9m_FvGvC8A"
};

webpush.setVapidDetails(
	"mailto:admin@moneymap.local",
	vapidKeys.publicKey,
	vapidKeys.privateKey
);

// Initialize nodemailer transporter
// Defaults to Ethereal Mail (for testing) if env vars are missing
const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST || 'smtp.ethereal.email',
	port: process.env.SMTP_PORT || 587,
	auth: {
		user: process.env.SMTP_USER || 'leola.weber95@ethereal.email',
		pass: process.env.SMTP_PASS || '8jN3P7x3R5pZz3Y4Jz'
	}
});

/**
 * Dispatch an intelligent notification
 * @param {Object} user - User document
 * @param {String} type - Notification type (e.g., 'budget_alert', 'goal_reminder')
 * @param {String} message - The notification body
 * @param {String} severity - 'info', 'warning', 'high'
 */
const dispatchNotification = async (user, type, message, severity = 'info') => {
	let pushSent = false;
	try {
		// 1. Always create an In-App Notification
		const notif = new Notification({
			userId: user._id,
			type,
			message
		});
		await notif.save();

		// 2. Send Browser Push for Medium/High
		if ((severity === 'warning' || severity === 'high') && user.pushSubscription) {
			try {
				const payload = JSON.stringify({ title: "MoneyMap Alert", body: message, type });
				await webpush.sendNotification(user.pushSubscription, payload);
				pushSent = true;
			} catch (pushErr) {
				console.error("Web Push failed:", pushErr.message);
				if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
					user.pushSubscription = null;
					await user.save();
				}
			}
		}

		// 3. Send Email for High Severity
		if (severity === 'high' && user.email) {
			try {
				const mailOptions = {
					from: '"MoneyMap Alerts" <alerts@moneymap.local>',
					to: user.email,
					subject: `MoneyMap Alert: ${type.replace('_', ' ').toUpperCase()}`,
					text: `Hello ${user.fullName},\n\n${message}\n\nThank you,\nMoneyMap Team`,
					html: `<p>Hello ${user.fullName},</p><p><strong>${message}</strong></p><br><p>Thank you,<br>MoneyMap Team</p>`
				};
				await transporter.sendMail(mailOptions);
			} catch (emailErr) {
				console.error("Email failed:", emailErr.message);
			}
		}

		return { notif, pushSent };
	} catch (error) {
		console.error("Notification Dispatch Error:", error);
		throw error;
	}
};

module.exports = {
	dispatchNotification,
	vapidPublicKey: vapidKeys.publicKey
};
