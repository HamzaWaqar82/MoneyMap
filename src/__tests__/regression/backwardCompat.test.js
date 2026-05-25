const mongoose = require("mongoose");
const request = require("supertest");

/**
 * Regression Tests — Existing Endpoint Backward Compatibility
 *
 * CRITICAL: These tests verify that the expense tracker module changes
 * have NOT broken any existing API endpoints.
 *
 * If any of these tests fail, it means the new module has introduced
 * a backward-incompatible change that must be fixed before merge.
 */

const MONGODB_URI = process.env.MONGODB_URI;
const describeOrSkip = MONGODB_URI ? describe : describe.skip;

let app;
let authToken;
let testUserId;
let testTransactionId;

describeOrSkip("Regression Tests — Existing APIs Must Not Break", () => {
	beforeAll(async () => {
		if (mongoose.connection.readyState === 0) {
			await mongoose.connect(MONGODB_URI);
		}

		app = require("../../app");
		const User = require("../../models/User");

		await User.deleteMany({ email: "regression-test@moneymap.test" });

		const signupRes = await request(app)
			.post("/api/auth/signup")
			.send({
				fullName: "Regression Test User",
				email: "regression-test@moneymap.test",
				password: "Test@123456",
			});

		if (signupRes.status === 201) {
			authToken = signupRes.body.data.token;
			testUserId = signupRes.body.data.user.id || signupRes.body.data.user._id;
		} else {
			const loginRes = await request(app)
				.post("/api/auth/login")
				.send({
					email: "regression-test@moneymap.test",
					password: "Test@123456",
				});
			authToken = loginRes.body.data.token;
			testUserId = loginRes.body.data.user.id || loginRes.body.data.user._id;
		}
	}, 15000);

	afterAll(async () => {
		const User = require("../../models/User");
		const Transaction = require("../../models/Transaction");

		await Transaction.deleteMany({ userId: testUserId });
		await User.deleteMany({ email: "regression-test@moneymap.test" });
		await mongoose.connection.close();
	}, 10000);

	// ── Health & Info Endpoints ──
	describe("Health & Info", () => {
		test("GET /health — still returns OK", async () => {
			const res = await request(app).get("/health");
			expect(res.status).toBe(200);
			expect(res.body.status).toBe("OK");
		});

		test("GET /api/info — still returns API info", async () => {
			const res = await request(app).get("/api/info");
			expect(res.status).toBe(200);
			expect(res.body.name).toBeDefined();
			expect(res.body.version).toBeDefined();
		});
	});

	// ── Existing Transaction CRUD ──
	describe("Transaction CRUD — /api/transactions (MUST still work)", () => {
		test("POST /api/transactions — creates transaction with OLD format", async () => {
			const res = await request(app)
				.post("/api/transactions")
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					type: "expense",
					amount: 850.5,
					category: "Food",
					description: "Dinner at restaurant",
					transactionDate: "2026-05-20",
					paymentMethod: "cash",
				});

			expect(res.status).toBe(201);
			expect(res.body.success).toBe(true);
			expect(res.body.data.amount).toBe(850.5);
			expect(res.body.data.category).toBe("Food");
			// New fields should default safely
			expect(res.body.data.source).toBe("manual");
			expect(res.body.data.needsReview).toBe(false);
			testTransactionId = res.body.data._id;
		});

		test("GET /api/transactions — lists transactions", async () => {
			const res = await request(app)
				.get("/api/transactions")
				.set("Authorization", `Bearer ${authToken}`);

			expect(res.status).toBe(200);
			expect(res.body.data.transactions).toBeDefined();
			expect(Array.isArray(res.body.data.transactions)).toBe(true);
		});

		test("GET /api/transactions/:id — gets single transaction", async () => {
			const res = await request(app)
				.get(`/api/transactions/${testTransactionId}`)
				.set("Authorization", `Bearer ${authToken}`);

			expect(res.status).toBe(200);
			expect(res.body.data._id).toBe(testTransactionId);
		});

		test("PUT /api/transactions/:id — updates transaction with OLD format", async () => {
			const res = await request(app)
				.put(`/api/transactions/${testTransactionId}`)
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					amount: 1000,
					description: "Updated dinner",
				});

			expect(res.status).toBe(200);
			expect(res.body.data.amount).toBe(1000);
		});

		test("DELETE /api/transactions/:id — deletes transaction", async () => {
			const res = await request(app)
				.delete(`/api/transactions/${testTransactionId}`)
				.set("Authorization", `Bearer ${authToken}`);

			expect(res.status).toBe(200);
		});
	});

	// ── Existing Reports ──
	describe("Reports — /api/reports (MUST still work)", () => {
		test("GET /api/reports/monthly-summary — returns correct shape", async () => {
			const res = await request(app)
				.get("/api/reports/monthly-summary?month=2026-05")
				.set("Authorization", `Bearer ${authToken}`);

			expect(res.status).toBe(200);
			expect(res.body.data).toBeDefined();
			expect(res.body.data.totalIncome).toBeDefined();
			expect(res.body.data.totalExpenses).toBeDefined();
			expect(res.body.data.netSavings).toBeDefined();
			expect(res.body.data.savingsRate).toBeDefined();
		});

		test("GET /api/reports/category-breakdown — returns correct shape", async () => {
			const res = await request(app)
				.get("/api/reports/category-breakdown?month=2026-05")
				.set("Authorization", `Bearer ${authToken}`);

			expect(res.status).toBe(200);
			expect(res.body.data.month).toBe("2026-05");
		});

		test("GET /api/reports/income-expense-trend — returns correct shape", async () => {
			const res = await request(app)
				.get("/api/reports/income-expense-trend?months=3")
				.set("Authorization", `Bearer ${authToken}`);

			expect(res.status).toBe(200);
			expect(res.body.data.trend).toBeDefined();
			expect(Array.isArray(res.body.data.trend)).toBe(true);
		});
	});

	// ── 404 Handler ──
	describe("404 Handler (MUST still work)", () => {
		test("returns 404 for unknown routes", async () => {
			const res = await request(app).get("/api/nonexistent");
			expect(res.status).toBe(404);
			expect(res.body.errorCode).toBe("NOT_FOUND");
		});
	});

	// ── Auth ──
	describe("Auth — /api/auth (MUST still work)", () => {
		test("POST /api/auth/login — still works", async () => {
			const res = await request(app)
				.post("/api/auth/login")
				.send({
					email: "regression-test@moneymap.test",
					password: "Test@123456",
				});

			expect(res.status).toBe(200);
			expect(res.body.data.token).toBeDefined();
		});

		test("Protected routes still reject without token", async () => {
			const res = await request(app).get("/api/transactions");
			expect(res.status).toBe(401);
		});
	});
});
