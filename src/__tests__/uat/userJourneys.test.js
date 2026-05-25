const mongoose = require("mongoose");
const request = require("supertest");

jest.setTimeout(60000);

let app;
let authToken;
let testUserId;

const waitForDB = async (timeoutMs = 15000) => {
	const start = Date.now();
	while (mongoose.connection.readyState !== 1) {
		if (Date.now() - start > timeoutMs) throw new Error("DB connection timeout");
		await new Promise((r) => setTimeout(r, 500));
	}
};

describe("UAT — Complete User Journeys", () => {
	beforeAll(async () => {
		app = require("../../app");
		await waitForDB();
		await new Promise((r) => setTimeout(r, 3000));

		const User = require("../../models/User");
		await User.deleteMany({ email: "uat-test@moneymaptest.com" });

		const signupRes = await request(app)
			.post("/api/auth/register")
			.send({ fullName: "UAT Test User", email: "uat-test@moneymaptest.com", password: "Test@123456", confirmPassword: "Test@123456" });

		if (signupRes.status === 201) {
			authToken = signupRes.body.data.token;
			testUserId = signupRes.body.data.user.id;
		} else {
			const loginRes = await request(app).post("/api/auth/login").send({ email: "uat-test@moneymaptest.com", password: "Test@123456" });
			authToken = loginRes.body?.data?.token;
			testUserId = loginRes.body?.data?.user?.id;
			if (!authToken) throw new Error(`Auth failed`);
		}
	});

	afterAll(async () => {
		try {
			const User = require("../../models/User");
			const Account = require("../../models/Account");
			const Transaction = require("../../models/Transaction");
			const MonthlySummary = require("../../models/MonthlySummary");
			await MonthlySummary.deleteMany({ userId: testUserId });
			await Transaction.deleteMany({ userId: testUserId });
			await Account.deleteMany({ userId: testUserId });
			await User.deleteMany({ email: "uat-test@moneymaptest.com" });
		} catch (e) { /* best-effort */ }
	});

	describe("Journey 1: Manual Entry", () => {
		test("Step 1: Create HBL account", async () => {
			const res = await request(app).post("/api/accounts").set("Authorization", `Bearer ${authToken}`)
				.send({ name: "My HBL Salary", type: "bank", provider: "HBL" });
			expect(res.status).toBe(201);
		});

		test("Step 2: Add manual transaction", async () => {
			const res = await request(app).post("/api/transactions").set("Authorization", `Bearer ${authToken}`)
				.send({ type: "expense", amount: 1500, category: "Food", description: "Kiryana", transactionDate: "2026-05-20", paymentMethod: "cash" });
			expect(res.status).toBe(201);
		});

		test("Step 3: Pakistan categories exist", async () => {
			const res = await request(app).get("/api/categories").set("Authorization", `Bearer ${authToken}`);
			expect(res.status).toBe(200);
			const names = res.body.data.categories.map((c) => c.name);
			expect(names).toContain("Kiryana Store");
			expect(names).toContain("Mobile Topup");
		});

		test("Step 4: Monthly report works", async () => {
			const res = await request(app).get("/api/reports/monthly-summary?month=2026-05").set("Authorization", `Bearer ${authToken}`);
			expect(res.status).toBe(200);
		});
	});

	describe("Journey 2: CSV Import", () => {
		let importAccountId;

		test("Step 1: Create JazzCash wallet", async () => {
			const res = await request(app).post("/api/accounts").set("Authorization", `Bearer ${authToken}`)
				.send({ name: "My JazzCash", type: "wallet", provider: "JazzCash" });
			expect(res.status).toBe(201);
			importAccountId = res.body.data.id || res.body.data._id;
		});

		test("Step 2: Upload JazzCash CSV", async () => {
			const csv = `Date,Description,Type,Debit,Credit,Fee,Balance,Transaction ID
"2026-05-22","Money Transfer to 0300","Money Transfer","500.00","0.00","0.00","1425.50","073230904128"
"2026-05-23","Incoming IBFT Credit","IBFT Credit","0.00","2500.00","0.00","3925.50","073264193070"
"2026-05-24","Zong bundle","Jazz Load","150.00","0.00","0.00","3775.50","073293126563"`;

			const res = await request(app)
				.post("/api/expense-tracker/import")
				.set("Authorization", `Bearer ${authToken}`)
				.field("accountId", importAccountId)
				.attach("csvFile", Buffer.from(csv), "statement.csv");

			expect(res.status).toBe(200);
			expect(res.body.data.bank).toBe("JazzCash");
			expect(res.body.data.transactions).toHaveLength(3);
		});

		test("Step 3: Confirm import", async () => {
			const res = await request(app)
				.post("/api/expense-tracker/import/confirm")
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					accountId: importAccountId,
					transactions: [
						{ date: "2026-05-22", description: "Money Transfer", amountPaisas: 50000, type: "debit", categoryName: "Transfer", confidence: 0.8 },
						{ date: "2026-05-23", description: "IBFT Credit", amountPaisas: 250000, type: "credit", categoryName: "Transfer", confidence: 0.85 },
						{ date: "2026-05-24", description: "Zong bundle", amountPaisas: 15000, type: "debit", categoryName: "Mobile Topup", confidence: 0.9 },
					],
				});
			expect(res.status).toBe(201);
			expect(res.body.data.saved).toBe(3);
			expect(res.body.data.failed).toBe(0);
		});

		test("Step 4: Transactions in list", async () => {
			const res = await request(app).get("/api/transactions").set("Authorization", `Bearer ${authToken}`);
			expect(res.status).toBe(200);
			expect(res.body.data.transactions.length).toBeGreaterThanOrEqual(4);
		});

		test("Step 5: Import history", async () => {
			const res = await request(app).get("/api/expense-tracker/import/history").set("Authorization", `Bearer ${authToken}`);
			expect(res.status).toBe(200);
			expect(res.body.data.imports.length).toBeGreaterThanOrEqual(1);
		});
	});
});
