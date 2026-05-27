const mongoose = require("mongoose");
const request = require("supertest");

jest.setTimeout(60000);

let app;
let authToken;
let testUserId;
let testTransactionId;

const waitForDB = async (timeoutMs = 15000) => {
	const start = Date.now();
	while (mongoose.connection.readyState !== 1) {
		if (Date.now() - start > timeoutMs) throw new Error("DB connection timeout");
		await new Promise((r) => setTimeout(r, 500));
	}
};

describe("Regression Tests — Existing APIs Must Not Break", () => {
	beforeAll(async () => {
		app = require("../../app");
		await waitForDB();
		await new Promise((r) => setTimeout(r, 3000));

		const User = require("../../models/User");
		await User.deleteMany({ email: "regression-test@moneymaptest.com" });

		const signupRes = await request(app)
			.post("/api/auth/register")
			.send({ fullName: "Regression Test", email: "regression-test@moneymaptest.com", password: "Test@123456", confirmPassword: "Test@123456" });

		if (signupRes.status === 201) {
			authToken = signupRes.body.data.token;
			testUserId = signupRes.body.data.user.id;
		} else {
			const loginRes = await request(app)
				.post("/api/auth/login")
				.send({ email: "regression-test@moneymaptest.com", password: "Test@123456" });
			authToken = loginRes.body?.data?.token;
			testUserId = loginRes.body?.data?.user?.id;
			if (!authToken) throw new Error(`Auth failed: ${JSON.stringify(loginRes.body)}`);
		}
	});

	afterAll(async () => {
		try {
			const User = require("../../models/User");
			const Transaction = require("../../models/Transaction");
			await Transaction.deleteMany({ userId: testUserId });
			await User.deleteMany({ email: "regression-test@moneymaptest.com" });
		} catch (e) { /* best-effort */ }
	});

	describe("Health & Info", () => {
		test("GET /health", async () => {
			const res = await request(app).get("/health");
			expect(res.status).toBe(200);
			expect(res.body.status).toBe("OK");
		});
		test("GET /api/info", async () => {
			const res = await request(app).get("/api/info");
			expect(res.status).toBe(200);
			expect(res.body.name).toBeDefined();
		});
	});

	describe("Transaction CRUD — MUST still work", () => {
		test("POST — creates with OLD format", async () => {
			const res = await request(app)
				.post("/api/transactions")
				.set("Authorization", `Bearer ${authToken}`)
				.send({ type: "expense", amount: 850.5, category: "Food", description: "Dinner", transactionDate: "2026-05-20", paymentMethod: "cash" });
			expect(res.status).toBe(201);
			expect(res.body.data.amount).toBe(850.5);
			expect(res.body.data.category).toBe("Food");
			testTransactionId = res.body.data.id || res.body.data._id;
		});
		test("GET — lists", async () => {
			const res = await request(app).get("/api/transactions").set("Authorization", `Bearer ${authToken}`);
			expect(res.status).toBe(200);
			expect(Array.isArray(res.body.data.transactions)).toBe(true);
		});
		test("PUT — updates", async () => {
			const res = await request(app).put(`/api/transactions/${testTransactionId}`).set("Authorization", `Bearer ${authToken}`)
				.send({ amount: 1000 });
			expect(res.status).toBe(200);
		});
		test("DELETE — deletes", async () => {
			const res = await request(app).delete(`/api/transactions/${testTransactionId}`).set("Authorization", `Bearer ${authToken}`);
			expect(res.status).toBe(200);
		});
	});

	describe("Reports — MUST still work", () => {
		test("monthly-summary", async () => {
			const res = await request(app).get("/api/reports/monthly-summary?month=2026-05").set("Authorization", `Bearer ${authToken}`);
			expect(res.status).toBe(200);
			expect(res.body.data.totalIncome).toBeDefined();
		});
		test("category-breakdown", async () => {
			const res = await request(app).get("/api/reports/category-breakdown?month=2026-05").set("Authorization", `Bearer ${authToken}`);
			expect(res.status).toBe(200);
		});
		test("income-expense-trend", async () => {
			const res = await request(app).get("/api/reports/income-expense-trend?months=3").set("Authorization", `Bearer ${authToken}`);
			expect(res.status).toBe(200);
			expect(Array.isArray(res.body.data.trend)).toBe(true);
		});
	});

	describe("Auth — MUST still work", () => {
		test("login works", async () => {
			const res = await request(app).post("/api/auth/login").send({ email: "regression-test@moneymaptest.com", password: "Test@123456" });
			expect(res.status).toBe(200);
			expect(res.body.data.token).toBeDefined();
		});
		test("rejects without token", async () => {
			const res = await request(app).get("/api/transactions");
			expect(res.status).toBe(401);
		});
	});

	describe("404 Handler", () => {
		test("returns 404", async () => {
			const res = await request(app).get("/api/nonexistent");
			expect(res.status).toBe(404);
		});
	});
});
