const mongoose = require("mongoose");
const request = require("supertest");

/**
 * Integration Tests — Account, Category & Expense Tracker APIs
 *
 * These tests use the app's own DB connection via .env file.
 * They require the server's MONGODB_URI to be valid.
 */

jest.setTimeout(60000);

let app;
let authToken;
let testUserId;

// Helper: wait for mongoose connection
const waitForDB = async (timeoutMs = 15000) => {
	const start = Date.now();
	while (mongoose.connection.readyState !== 1) {
		if (Date.now() - start > timeoutMs) throw new Error("DB connection timeout");
		await new Promise((r) => setTimeout(r, 500));
	}
};

describe("Integration Tests — Expense Tracker APIs", () => {
	beforeAll(async () => {
		// Load app (which connects to DB internally via .env)
		app = require("../../app");

		// Wait for the app's own DB connection to be ready
		await waitForDB();

		// Wait for category seeding
		await new Promise((r) => setTimeout(r, 3000));

		const User = require("../../models/User");
		await User.deleteMany({ email: "integration-test@moneymaptest.com" });

		const signupRes = await request(app)
			.post("/api/auth/register")
			.send({
				fullName: "Integration Test User",
				email: "integration-test@moneymaptest.com",
				password: "Test@123456",
				confirmPassword: "Test@123456",
			});

		if (signupRes.status === 201) {
			authToken = signupRes.body.data.token;
			testUserId = signupRes.body.data.user.id;
		} else {
			const loginRes = await request(app)
				.post("/api/auth/login")
				.send({ email: "integration-test@moneymaptest.com", password: "Test@123456" });
			if (loginRes.body?.data?.token) {
				authToken = loginRes.body.data.token;
				testUserId = loginRes.body.data.user.id;
			} else {
				throw new Error(`Auth setup failed: signup=${signupRes.status}, login=${JSON.stringify(loginRes.body)}`);
			}
		}
	});

	afterAll(async () => {
		try {
			const User = require("../../models/User");
			const Account = require("../../models/Account");
			const Category = require("../../models/Category");
			await Account.deleteMany({ userId: testUserId });
			await Category.deleteMany({ userId: testUserId, isSystem: false });
			await User.deleteMany({ email: "integration-test@moneymaptest.com" });
		} catch (e) { /* best-effort cleanup */ }
		// Don't close connection — let Jest --forceExit handle it
	});

	// ── Account API ──
	describe("Account CRUD — /api/accounts", () => {
		let accountId;

		test("POST /api/accounts — creates account", async () => {
			const res = await request(app)
				.post("/api/accounts")
				.set("Authorization", `Bearer ${authToken}`)
				.send({ name: "Test HBL Account", type: "bank", provider: "HBL", currency: "PKR" });
			expect(res.status).toBe(201);
			expect(res.body.success).toBe(true);
			expect(res.body.data.provider).toBe("HBL");
			accountId = res.body.data.id || res.body.data._id;
		});

		test("GET /api/accounts — lists accounts", async () => {
			const res = await request(app).get("/api/accounts").set("Authorization", `Bearer ${authToken}`);
			expect(res.status).toBe(200);
			expect(res.body.data.accounts.length).toBeGreaterThanOrEqual(1);
		});

		test("GET /api/accounts/:id — gets account", async () => {
			const res = await request(app).get(`/api/accounts/${accountId}`).set("Authorization", `Bearer ${authToken}`);
			expect(res.status).toBe(200);
		});

		test("PUT /api/accounts/:id — updates account", async () => {
			const res = await request(app)
				.put(`/api/accounts/${accountId}`)
				.set("Authorization", `Bearer ${authToken}`)
				.send({ name: "Updated HBL" });
			expect(res.status).toBe(200);
			expect(res.body.data.name).toBe("Updated HBL");
		});

		test("POST /api/accounts — rejects duplicate", async () => {
			const res = await request(app)
				.post("/api/accounts")
				.set("Authorization", `Bearer ${authToken}`)
				.send({ name: "Updated HBL", type: "bank", provider: "HBL" });
			expect(res.status).toBe(409);
		});

		test("DELETE /api/accounts/:id — soft deletes", async () => {
			const res = await request(app).delete(`/api/accounts/${accountId}`).set("Authorization", `Bearer ${authToken}`);
			expect(res.status).toBe(200);
		});

		test("POST /api/accounts — validation error", async () => {
			const res = await request(app)
				.post("/api/accounts")
				.set("Authorization", `Bearer ${authToken}`)
				.send({ name: "Missing type" });
			expect(res.status).toBe(422);
		});

		test("GET /api/accounts — requires auth", async () => {
			const res = await request(app).get("/api/accounts");
			expect(res.status).toBe(401);
		});
	});

	// ── Category API ──
	describe("Category CRUD — /api/categories", () => {
		let customCategoryId;

		test("GET /api/categories — lists system + custom", async () => {
			const res = await request(app).get("/api/categories").set("Authorization", `Bearer ${authToken}`);
			expect(res.status).toBe(200);
			expect(res.body.data.categories.length).toBeGreaterThanOrEqual(15);
		});

		test("POST /api/categories — creates custom", async () => {
			const res = await request(app)
				.post("/api/categories")
				.set("Authorization", `Bearer ${authToken}`)
				.send({ name: "Test Custom Cat", icon: "🧪", color: "#FF5733", type: "expense", keywords: ["testcustom"] });
			expect(res.status).toBe(201);
			expect(res.body.data.isSystem).toBe(false);
			customCategoryId = res.body.data._id;
		});

		test("PUT /api/categories/:id — updates custom", async () => {
			const res = await request(app)
				.put(`/api/categories/${customCategoryId}`)
				.set("Authorization", `Bearer ${authToken}`)
				.send({ name: "Updated Custom Cat" });
			expect(res.status).toBe(200);
		});

		test("DELETE /api/categories/:id — deletes custom", async () => {
			const res = await request(app)
				.delete(`/api/categories/${customCategoryId}`)
				.set("Authorization", `Bearer ${authToken}`);
			expect(res.status).toBe(200);
		});

		test("GET /api/categories?type=expense — filters", async () => {
			const res = await request(app).get("/api/categories?type=expense").set("Authorization", `Bearer ${authToken}`);
			expect(res.status).toBe(200);
			res.body.data.categories.forEach((c) => expect(["expense", "both"]).toContain(c.type));
		});
	});

	// ── Expense Tracker API ──
	describe("Expense Tracker — /api/expense-tracker", () => {
		test("GET supported-banks — returns bank list", async () => {
			const res = await request(app).get("/api/expense-tracker/supported-banks").set("Authorization", `Bearer ${authToken}`);
			expect(res.status).toBe(200);
			expect(res.body.data.banks).toContain("HBL");
			expect(res.body.data.banks).toContain("JazzCash");
		});

		test("GET review-queue — returns queue", async () => {
			const res = await request(app).get("/api/expense-tracker/review-queue").set("Authorization", `Bearer ${authToken}`);
			expect(res.status).toBe(200);
			expect(res.body.data.pagination).toBeDefined();
		});
	});
});
