const mongoose = require("mongoose");
const request = require("supertest");

/**
 * UAT Tests — End-to-End User Journeys
 *
 * These tests simulate complete user workflows:
 *   1. Manual Entry Journey: Register → Add Account → Add Transaction → View Summary
 *   2. CSV Import Journey: Register → Add Account → Upload CSV → Review → Confirm
 *
 * These are the final-gate tests that must pass before UAT sign-off.
 */

const MONGODB_URI = process.env.MONGODB_URI;
const describeOrSkip = MONGODB_URI ? describe : describe.skip;

let app;
let authToken;
let testUserId;

describeOrSkip("UAT — Complete User Journeys", () => {
	beforeAll(async () => {
		if (mongoose.connection.readyState === 0) {
			await mongoose.connect(MONGODB_URI);
		}
		app = require("../../app");
		const User = require("../../models/User");
		await User.deleteMany({ email: "uat-test@moneymap.test" });

		const signupRes = await request(app)
			.post("/api/auth/signup")
			.send({
				fullName: "UAT Test User",
				email: "uat-test@moneymap.test",
				password: "Test@123456",
			});

		if (signupRes.status === 201) {
			authToken = signupRes.body.data.token;
			testUserId = signupRes.body.data.user.id || signupRes.body.data.user._id;
		} else {
			const loginRes = await request(app)
				.post("/api/auth/login")
				.send({ email: "uat-test@moneymap.test", password: "Test@123456" });
			authToken = loginRes.body.data.token;
			testUserId = loginRes.body.data.user.id || loginRes.body.data.user._id;
		}
	}, 15000);

	afterAll(async () => {
		const User = require("../../models/User");
		const Account = require("../../models/Account");
		const Transaction = require("../../models/Transaction");
		const Category = require("../../models/Category");
		const MonthlySummary = require("../../models/MonthlySummary");

		await MonthlySummary.deleteMany({ userId: testUserId });
		await Transaction.deleteMany({ userId: testUserId });
		await Account.deleteMany({ userId: testUserId });
		await Category.deleteMany({ userId: testUserId, isSystem: false });
		await User.deleteMany({ email: "uat-test@moneymap.test" });
		await mongoose.connection.close();
	}, 10000);

	// ── Journey 1: Manual Entry Flow ──
	describe("Journey 1: Manual Entry — Account → Transaction → Summary", () => {
		let accountId;
		let transactionId;

		test("Step 1: Create an HBL bank account", async () => {
			const res = await request(app)
				.post("/api/accounts")
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					name: "My HBL Salary Account",
					type: "bank",
					provider: "HBL",
					currency: "PKR",
				});

			expect(res.status).toBe(201);
			accountId = res.body.data.id || res.body.data._id;
			expect(accountId).toBeDefined();
		});

		test("Step 2: Add a manual transaction", async () => {
			const res = await request(app)
				.post("/api/transactions")
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					type: "expense",
					amount: 1500,
					category: "Food",
					description: "Monthly kiryana store",
					transactionDate: "2026-05-20",
					paymentMethod: "cash",
				});

			expect(res.status).toBe(201);
			transactionId = res.body.data._id;
		});

		test("Step 3: View categories (should include Pakistan-specific ones)", async () => {
			const res = await request(app)
				.get("/api/categories")
				.set("Authorization", `Bearer ${authToken}`);

			expect(res.status).toBe(200);
			const names = res.body.data.categories.map((c) => c.name);
			expect(names).toContain("Kiryana Store");
			expect(names).toContain("Chai & Nashta");
			expect(names).toContain("Mobile Topup");
		});

		test("Step 4: View monthly report (existing endpoint still works)", async () => {
			const res = await request(app)
				.get("/api/reports/monthly-summary?month=2026-05")
				.set("Authorization", `Bearer ${authToken}`);

			expect(res.status).toBe(200);
			expect(res.body.data.totalExpenses).toBeGreaterThanOrEqual(1500);
		});

		test("Step 5: List accounts (shows transaction count)", async () => {
			const res = await request(app)
				.get("/api/accounts")
				.set("Authorization", `Bearer ${authToken}`);

			expect(res.status).toBe(200);
			expect(res.body.data.accounts.length).toBeGreaterThanOrEqual(1);
		});
	});

	// ── Journey 2: CSV Import Flow ──
	describe("Journey 2: CSV Import — Upload → Parse → Confirm", () => {
		let importAccountId;

		test("Step 1: Create JazzCash wallet account", async () => {
			const res = await request(app)
				.post("/api/accounts")
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					name: "My JazzCash",
					type: "wallet",
					provider: "JazzCash",
				});

			expect(res.status).toBe(201);
			importAccountId = res.body.data.id || res.body.data._id;
		});

		test("Step 2: Check supported banks", async () => {
			const res = await request(app)
				.get("/api/expense-tracker/supported-banks")
				.set("Authorization", `Bearer ${authToken}`);

			expect(res.status).toBe(200);
			expect(res.body.data.banks).toContain("JazzCash");
		});

		test("Step 3: Upload JazzCash CSV for parsing", async () => {
			const csvContent = `Date,Description,Type,Debit,Credit,Fee,Balance,Transaction ID
"2026-05-22","Money Transfer to 03001234567","Money Transfer","500.00","0.00","0.00","1425.50","073230904128"
"2026-05-23","Incoming IBFT Credit","IBFT Credit","0.00","2500.00","0.00","3925.50","073264193070"
"2026-05-24","Customer buys Zong bundle","Jazz Load","150.00","0.00","0.00","3775.50","073293126563"`;

			const res = await request(app)
				.post("/api/expense-tracker/import")
				.set("Authorization", `Bearer ${authToken}`)
				.field("accountId", importAccountId)
				.attach("csvFile", Buffer.from(csvContent), "jazzcash_statement.csv");

			expect(res.status).toBe(200);
			expect(res.body.data.bank).toBe("JazzCash");
			expect(res.body.data.transactions).toHaveLength(3);
			expect(res.body.data.stats.uniqueTransactions).toBe(3);

			// Verify auto-categorization happened
			const txns = res.body.data.transactions;
			txns.forEach((txn) => {
				expect(txn.categoryName).toBeDefined();
				expect(typeof txn.confidence).toBe("number");
			});
		});

		test("Step 4: Confirm the import", async () => {
			const res = await request(app)
				.post("/api/expense-tracker/import/confirm")
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					accountId: importAccountId,
					transactions: [
						{
							date: "2026-05-22T00:00:00.000Z",
							description: "Money Transfer to 03001234567 [Money Transfer]",
							amountPaisas: 50000,
							type: "debit",
							categoryName: "Transfer",
							rawRef: "073230904128",
							confidence: 0.8,
						},
						{
							date: "2026-05-23T00:00:00.000Z",
							description: "Incoming IBFT Credit [IBFT Credit]",
							amountPaisas: 250000,
							type: "credit",
							categoryName: "Transfer",
							rawRef: "073264193070",
							confidence: 0.85,
						},
						{
							date: "2026-05-24T00:00:00.000Z",
							description: "Customer buys Zong bundle [Jazz Load]",
							amountPaisas: 15000,
							type: "debit",
							categoryName: "Mobile Topup",
							rawRef: "073293126563",
							confidence: 0.9,
						},
					],
				});

			expect(res.status).toBe(201);
			expect(res.body.data.saved).toBe(3);
			expect(res.body.data.failed).toBe(0);
		});

		test("Step 5: Verify transactions appear in list", async () => {
			const res = await request(app)
				.get("/api/transactions")
				.set("Authorization", `Bearer ${authToken}`);

			expect(res.status).toBe(200);
			// Should have at least the 3 we just imported + 1 manual from Journey 1
			expect(res.body.data.transactions.length).toBeGreaterThanOrEqual(4);
		});

		test("Step 6: Import history shows the import", async () => {
			const res = await request(app)
				.get("/api/expense-tracker/import/history")
				.set("Authorization", `Bearer ${authToken}`);

			expect(res.status).toBe(200);
			expect(res.body.data.imports.length).toBeGreaterThanOrEqual(1);
		});
	});
});
