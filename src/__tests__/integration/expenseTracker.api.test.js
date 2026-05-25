const mongoose = require("mongoose");
const request = require("supertest");

/**
 * Integration Tests — Account & Category APIs + CSV Import
 *
 * These tests verify the full API contract against a real MongoDB instance.
 * They require the MONGODB_URI environment variable to be set.
 *
 * Skip these tests if no DB is available (CI without MongoDB).
 */

// Skip integration tests if no MongoDB is available
const MONGODB_URI = process.env.MONGODB_URI;
const describeOrSkip = MONGODB_URI ? describe : describe.skip;

let app;
let authToken;
let testUserId;

describeOrSkip("Integration Tests — Expense Tracker APIs", () => {
	beforeAll(async () => {
		// Connect to test DB
		if (mongoose.connection.readyState === 0) {
			await mongoose.connect(MONGODB_URI);
		}

		// Import app after DB connection
		app = require("../../app");

		// Create a test user and get auth token
		const User = require("../../models/User");

		// Clean up any existing test user
		await User.deleteMany({ email: "integration-test@moneymap.test" });

		const signupRes = await request(app)
			.post("/api/auth/signup")
			.send({
				fullName: "Integration Test User",
				email: "integration-test@moneymap.test",
				password: "Test@123456",
			});

		if (signupRes.status === 201) {
			authToken = signupRes.body.data.token;
			testUserId = signupRes.body.data.user.id || signupRes.body.data.user._id;
		} else {
			// User may already exist, try login
			const loginRes = await request(app)
				.post("/api/auth/login")
				.send({
					email: "integration-test@moneymap.test",
					password: "Test@123456",
				});
			authToken = loginRes.body.data.token;
			testUserId = loginRes.body.data.user.id || loginRes.body.data.user._id;
		}
	}, 15000);

	afterAll(async () => {
		// Cleanup
		const User = require("../../models/User");
		const Account = require("../../models/Account");
		const Category = require("../../models/Category");

		await Account.deleteMany({ userId: testUserId });
		await Category.deleteMany({ userId: testUserId, isSystem: false });
		await User.deleteMany({ email: "integration-test@moneymap.test" });
		await mongoose.connection.close();
	}, 10000);

	// ── Account API ──
	describe("Account CRUD — /api/accounts", () => {
		let accountId;

		test("POST /api/accounts — creates an account", async () => {
			const res = await request(app)
				.post("/api/accounts")
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					name: "Test HBL Account",
					type: "bank",
					provider: "HBL",
					currency: "PKR",
				});

			expect(res.status).toBe(201);
			expect(res.body.success).toBe(true);
			expect(res.body.data.name).toBe("Test HBL Account");
			expect(res.body.data.provider).toBe("HBL");
			accountId = res.body.data.id || res.body.data._id;
		});

		test("GET /api/accounts — lists user accounts", async () => {
			const res = await request(app)
				.get("/api/accounts")
				.set("Authorization", `Bearer ${authToken}`);

			expect(res.status).toBe(200);
			expect(res.body.data.accounts.length).toBeGreaterThanOrEqual(1);
		});

		test("GET /api/accounts/:id — gets single account", async () => {
			const res = await request(app)
				.get(`/api/accounts/${accountId}`)
				.set("Authorization", `Bearer ${authToken}`);

			expect(res.status).toBe(200);
			expect(res.body.data.name).toBe("Test HBL Account");
		});

		test("PUT /api/accounts/:id — updates account", async () => {
			const res = await request(app)
				.put(`/api/accounts/${accountId}`)
				.set("Authorization", `Bearer ${authToken}`)
				.send({ name: "Updated HBL Account" });

			expect(res.status).toBe(200);
			expect(res.body.data.name).toBe("Updated HBL Account");
		});

		test("POST /api/accounts — rejects duplicate", async () => {
			const res = await request(app)
				.post("/api/accounts")
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					name: "Updated HBL Account",
					type: "bank",
					provider: "HBL",
				});

			expect(res.status).toBe(409);
			expect(res.body.errorCode).toBe("DUPLICATE_ACCOUNT");
		});

		test("DELETE /api/accounts/:id — soft deletes account", async () => {
			const res = await request(app)
				.delete(`/api/accounts/${accountId}`)
				.set("Authorization", `Bearer ${authToken}`);

			expect(res.status).toBe(200);
		});

		test("POST /api/accounts — validation error on missing fields", async () => {
			const res = await request(app)
				.post("/api/accounts")
				.set("Authorization", `Bearer ${authToken}`)
				.send({ name: "Missing type" });

			expect(res.status).toBe(422);
			expect(res.body.errorCode).toBe("VALIDATION_ERROR");
		});

		test("GET /api/accounts — requires auth", async () => {
			const res = await request(app).get("/api/accounts");
			expect(res.status).toBe(401);
		});
	});

	// ── Category API ──
	describe("Category CRUD — /api/categories", () => {
		let customCategoryId;

		test("GET /api/categories — lists system + custom categories", async () => {
			const res = await request(app)
				.get("/api/categories")
				.set("Authorization", `Bearer ${authToken}`);

			expect(res.status).toBe(200);
			expect(res.body.data.categories.length).toBeGreaterThanOrEqual(15);
			expect(res.body.data.systemCount).toBeGreaterThanOrEqual(15);
		});

		test("POST /api/categories — creates custom category", async () => {
			const res = await request(app)
				.post("/api/categories")
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					name: "Test Custom Category",
					icon: "🧪",
					color: "#FF5733",
					type: "expense",
					keywords: ["test", "custom"],
				});

			expect(res.status).toBe(201);
			expect(res.body.data.isSystem).toBe(false);
			customCategoryId = res.body.data._id;
		});

		test("PUT /api/categories/:id — updates custom category", async () => {
			const res = await request(app)
				.put(`/api/categories/${customCategoryId}`)
				.set("Authorization", `Bearer ${authToken}`)
				.send({ name: "Updated Custom Category" });

			expect(res.status).toBe(200);
		});

		test("DELETE /api/categories/:id — deletes custom category", async () => {
			const res = await request(app)
				.delete(`/api/categories/${customCategoryId}`)
				.set("Authorization", `Bearer ${authToken}`);

			expect(res.status).toBe(200);
		});

		test("GET /api/categories?type=expense — filters by type", async () => {
			const res = await request(app)
				.get("/api/categories?type=expense")
				.set("Authorization", `Bearer ${authToken}`);

			expect(res.status).toBe(200);
			res.body.data.categories.forEach((cat) => {
				expect(["expense", "both"]).toContain(cat.type);
			});
		});
	});

	// ── Expense Tracker API ──
	describe("Expense Tracker — /api/expense-tracker", () => {
		test("GET /api/expense-tracker/supported-banks — returns bank list", async () => {
			const res = await request(app)
				.get("/api/expense-tracker/supported-banks")
				.set("Authorization", `Bearer ${authToken}`);

			expect(res.status).toBe(200);
			expect(res.body.data.banks).toContain("HBL");
			expect(res.body.data.banks).toContain("JazzCash");
		});

		test("GET /api/expense-tracker/review-queue — returns empty queue", async () => {
			const res = await request(app)
				.get("/api/expense-tracker/review-queue")
				.set("Authorization", `Bearer ${authToken}`);

			expect(res.status).toBe(200);
			expect(res.body.data.pagination).toBeDefined();
		});
	});
});
