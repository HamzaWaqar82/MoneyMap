const mongoose = require("mongoose");
const request = require("supertest");

jest.setTimeout(60000);

let app;
let authToken;
let testUserId;
const testEmail = "notifications-test@moneymaptest.com";

const waitForDB = async (timeoutMs = 15000) => {
	const start = Date.now();
	while (mongoose.connection.readyState !== 1) {
		if (Date.now() - start > timeoutMs) throw new Error("DB connection timeout");
		await new Promise((r) => setTimeout(r, 500));
	}
};

const currentMonth = () => {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

describe("Notifications API Integration", () => {
	beforeAll(async () => {
		process.env.NODE_ENV = "test";
		app = require("../../app");
		await waitForDB();
		await new Promise((r) => setTimeout(r, 2000));

		const User = require("../../models/User");
		const Budget = require("../../models/Budget");
		const Transaction = require("../../models/Transaction");
		const Notification = require("../../models/Notification");

		await User.deleteMany({ email: testEmail });

		const signupRes = await request(app)
			.post("/api/auth/register")
			.send({
				fullName: "Notif Test User",
				email: testEmail,
				password: "Test@123456",
				confirmPassword: "Test@123456",
			});

		authToken = signupRes.body.data.token;
		testUserId = signupRes.body.data.user.id;

		await Budget.deleteMany({ userId: testUserId });
		await Transaction.deleteMany({ userId: testUserId });
		await Notification.deleteMany({ userId: testUserId });
	});

	afterAll(async () => {
		try {
			const User = require("../../models/User");
			const Budget = require("../../models/Budget");
			const Transaction = require("../../models/Transaction");
			const Notification = require("../../models/Notification");
			await Notification.deleteMany({ userId: testUserId });
			await Transaction.deleteMany({ userId: testUserId });
			await Budget.deleteMany({ userId: testUserId });
			await User.deleteMany({ email: testEmail });
		} catch (e) { /* best-effort */ }
	});

	test("GET /api/notifications/push/vapid-key returns public key", async () => {
		const res = await request(app)
			.get("/api/notifications/push/vapid-key")
			.set("Authorization", `Bearer ${authToken}`);
		expect(res.status).toBe(200);
		expect(res.body.data.publicKey).toBeDefined();
		expect(typeof res.body.data.publicKey).toBe("string");
	});

	test("PUT /api/notifications/push/subscribe saves subscription", async () => {
		const mockSub = {
			endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint",
			expirationTime: null,
			keys: { p256dh: "test", auth: "test" },
		};
		const res = await request(app)
			.put("/api/notifications/push/subscribe")
			.set("Authorization", `Bearer ${authToken}`)
			.send({ subscription: mockSub });
		expect(res.status).toBe(200);
		expect(res.body.data.subscribed).toBe(true);

		const User = require("../../models/User");
		const user = await User.findById(testUserId);
		expect(user.pushSubscription.endpoint).toBe(mockSub.endpoint);
	});

	test("budget exceeded creates in-app notification on transaction", async () => {
		const month = currentMonth();
		const today = new Date();
		const dateStr = today.toISOString().split("T")[0];

		const budgetRes = await request(app)
			.post("/api/budgets")
			.set("Authorization", `Bearer ${authToken}`)
			.send({ category: "Food", monthlyLimit: 1000, month });

		expect(budgetRes.status).toBe(201);

		await request(app)
			.post("/api/transactions")
			.set("Authorization", `Bearer ${authToken}`)
			.send({
				type: "expense",
				amount: 400,
				category: "Food",
				description: "First spend",
				transactionDate: dateStr,
				paymentMethod: "cash",
			});

		await request(app)
			.post("/api/transactions")
			.set("Authorization", `Bearer ${authToken}`)
			.send({
				type: "expense",
				amount: 700,
				category: "Food",
				description: "Over budget",
				transactionDate: dateStr,
				paymentMethod: "cash",
			});

		const notifRes = await request(app)
			.get("/api/notifications?type=budget_alert")
			.set("Authorization", `Bearer ${authToken}`);

		expect(notifRes.status).toBe(200);
		const alerts = notifRes.body.data.notifications || [];
		const exceeded = alerts.find((n) => n.message.includes("exceeded"));
		expect(exceeded).toBeDefined();
		expect(exceeded.type).toBe("budget_alert");
	});

	test("GET /api/notifications/unread returns count", async () => {
		const res = await request(app)
			.get("/api/notifications/unread")
			.set("Authorization", `Bearer ${authToken}`);
		expect(res.status).toBe(200);
		expect(res.body.data.unreadCount).toBeGreaterThanOrEqual(1);
	});

	test("PUT /api/notifications/read-all marks all read", async () => {
		const res = await request(app)
			.put("/api/notifications/read-all")
			.set("Authorization", `Bearer ${authToken}`);
		expect(res.status).toBe(200);

		const unread = await request(app)
			.get("/api/notifications/unread")
			.set("Authorization", `Bearer ${authToken}`);
		expect(unread.body.data.unreadCount).toBe(0);
	});
});
