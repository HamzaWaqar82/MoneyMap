const JazzCashParser = require("../../../services/parsers/JazzCashParser");

/**
 * Unit Tests — JazzCash CSV Parser
 *
 * Tests parsing of JazzCash e-statement format:
 *   Date,Description,Type,Debit,Credit,Fee,Balance,Transaction ID
 */
describe("JazzCashParser", () => {
	let parser;

	beforeEach(() => {
		parser = new JazzCashParser();
	});

	describe("metadata", () => {
		test("returns correct bank name", () => {
			expect(parser.getBankName()).toBe("JazzCash");
		});

		test("canParse returns true for JazzCash headers", () => {
			const headers = ["Date", "Description", "Type", "Debit", "Credit", "Fee", "Balance", "Transaction ID"];
			expect(parser.canParse(headers)).toBe(true);
		});

		test("canParse returns false for HBL headers", () => {
			const headers = ["Value Date", "Transaction Date", "Description", "Withdrawals", "Deposits", "Balance"];
			expect(parser.canParse(headers)).toBe(false);
		});
	});

	describe("parse", () => {
		test("parses valid JazzCash CSV with debits and credits", async () => {
			const csv = `Date,Description,Type,Debit,Credit,Fee,Balance,Transaction ID
"2026-05-22","Money Transfer to 03001234567","Money Transfer","500.00","0.00","0.00","1425.50","073230904128"
"2026-05-23","Incoming IBFT Credit","IBFT Credit","0.00","2500.00","0.00","3925.50","073264193070"
"2026-05-24","Customer buys Zong bundle","Jazz Load","150.00","0.00","0.00","3775.50","073293126563"`;

			const result = await parser.parse(csv);

			expect(result).toHaveLength(3);

			// Money Transfer — debit
			expect(result[0].description).toContain("Money Transfer to 03001234567");
			expect(result[0].amountPaisas).toBe(50000);
			expect(result[0].type).toBe("debit");
			expect(result[0].rawRef).toBe("073230904128");

			// IBFT Credit — credit
			expect(result[1].description).toContain("Incoming IBFT Credit");
			expect(result[1].amountPaisas).toBe(250000);
			expect(result[1].type).toBe("credit");
			expect(result[1].rawRef).toBe("073264193070");

			// Jazz Load — debit
			expect(result[2].description).toContain("Customer buys Zong bundle");
			expect(result[2].amountPaisas).toBe(15000);
			expect(result[2].type).toBe("debit");
		});

		test("includes fees in debit amount", async () => {
			const csv = `Date,Description,Type,Debit,Credit,Fee,Balance,Transaction ID
"2026-05-22","Money Transfer","Transfer","500.00","0.00","15.00","1425.50","073230904128"`;

			const result = await parser.parse(csv);
			expect(result).toHaveLength(1);
			// 500 * 100 + 15 * 100 = 50000 + 1500 = 51500 paisas
			expect(result[0].amountPaisas).toBe(51500);
		});

		test("enhances description with transaction type", async () => {
			const csv = `Date,Description,Type,Debit,Credit,Fee,Balance,Transaction ID
"2026-05-22","Mobile Recharge","Jazz Load","150.00","0.00","0.00","1425.50","073230904128"`;

			const result = await parser.parse(csv);
			expect(result[0].description).toContain("[Jazz Load]");
		});

		test("does NOT duplicate type in description if already present", async () => {
			const csv = `Date,Description,Type,Debit,Credit,Fee,Balance,Transaction ID
"2026-05-22","Money Transfer via IBFT","Money Transfer","500.00","0.00","0.00","1425.50","073230904128"`;

			const result = await parser.parse(csv);
			// Should not append [Money Transfer] since "Money Transfer" already in description
			expect(result[0].description).toBe("Money Transfer via IBFT");
		});

		test("parses YYYY-MM-DD dates correctly", async () => {
			const csv = `Date,Description,Type,Debit,Credit,Fee,Balance,Transaction ID
"2026-05-22","Test","Type","500.00","0.00","0.00","1000.00","123"`;

			const result = await parser.parse(csv);
			expect(result[0].date.getFullYear()).toBe(2026);
			expect(result[0].date.getMonth()).toBe(4);
			expect(result[0].date.getDate()).toBe(22);
		});

		test("preserves transaction ID as rawRef", async () => {
			const csv = `Date,Description,Type,Debit,Credit,Fee,Balance,Transaction ID
"2026-05-22","Test","Type","500.00","0.00","0.00","1000.00","073230904128"`;

			const result = await parser.parse(csv);
			expect(result[0].rawRef).toBe("073230904128");
		});

		test("all transactions have source=csv and bank=JazzCash", async () => {
			const csv = `Date,Description,Type,Debit,Credit,Fee,Balance,Transaction ID
"2026-05-22","Test","Type","500.00","0.00","0.00","1000.00","123"`;

			const result = await parser.parse(csv);
			expect(result[0].source).toBe("csv");
			expect(result[0].bank).toBe("JazzCash");
		});
	});
});
