const HBLParser = require("../../../services/parsers/HBLParser");

/**
 * Unit Tests — HBL CSV Parser
 *
 * Tests parsing of actual HBL bank statement CSV format:
 *   Value Date,Transaction Date,Description,Withdrawals,Deposits,Balance
 */
describe("HBLParser", () => {
	let parser;

	beforeEach(() => {
		parser = new HBLParser();
	});

	describe("metadata", () => {
		test("returns correct bank name", () => {
			expect(parser.getBankName()).toBe("HBL");
		});

		test("returns expected headers", () => {
			const headers = parser.getExpectedHeaders();
			expect(headers).toContain("value date");
			expect(headers).toContain("description");
			expect(headers).toContain("withdrawals");
			expect(headers).toContain("deposits");
		});

		test("canParse returns true for HBL headers", () => {
			const headers = ["Value Date", "Transaction Date", "Description", "Withdrawals", "Deposits", "Balance"];
			expect(parser.canParse(headers)).toBe(true);
		});

		test("canParse returns false for non-HBL headers", () => {
			const headers = ["Date", "Description", "Debit", "Credit", "Fee", "Balance", "Transaction ID"];
			expect(parser.canParse(headers)).toBe(false);
		});
	});

	describe("parse", () => {
		test("parses valid HBL CSV with withdrawals and deposits", async () => {
			const csv = `Value Date,Transaction Date,Description,Withdrawals,Deposits,Balance
20/05/2026,20/05/2026,POS PURCHASE - KARACHI,500.00,,45000.00
21/05/2026,21/05/2026,ATM WITHDRAWAL - ISLAMABAD,1000.00,,44000.00
22/05/2026,22/05/2026,SALARY CREDIT,,50000.00,94000.00`;

			const result = await parser.parse(csv);

			expect(result).toHaveLength(3);

			// POS Purchase — debit
			expect(result[0].description).toBe("POS PURCHASE - KARACHI");
			expect(result[0].amountPaisas).toBe(50000);
			expect(result[0].type).toBe("debit");
			expect(result[0].date.getDate()).toBe(20);

			// ATM — debit
			expect(result[1].description).toBe("ATM WITHDRAWAL - ISLAMABAD");
			expect(result[1].amountPaisas).toBe(100000);
			expect(result[1].type).toBe("debit");

			// Salary — credit
			expect(result[2].description).toBe("SALARY CREDIT");
			expect(result[2].amountPaisas).toBe(5000000);
			expect(result[2].type).toBe("credit");
		});

		test("handles BOM in CSV content", async () => {
			const csv = "\uFEFFValue Date,Transaction Date,Description,Withdrawals,Deposits,Balance\n20/05/2026,20/05/2026,Test,500.00,,45000.00";

			const result = await parser.parse(csv);
			expect(result).toHaveLength(1);
		});

		test("skips rows with empty descriptions", async () => {
			const csv = `Value Date,Transaction Date,Description,Withdrawals,Deposits,Balance
20/05/2026,20/05/2026,,500.00,,45000.00
21/05/2026,21/05/2026,Valid Transaction,1000.00,,44000.00`;

			const result = await parser.parse(csv);
			expect(result).toHaveLength(1);
			expect(result[0].description).toBe("Valid Transaction");
		});

		test("skips zero-amount rows", async () => {
			const csv = `Value Date,Transaction Date,Description,Withdrawals,Deposits,Balance
20/05/2026,20/05/2026,Balance Entry,,,45000.00
21/05/2026,21/05/2026,Real Transaction,1000.00,,44000.00`;

			const result = await parser.parse(csv);
			expect(result).toHaveLength(1);
		});

		test("handles commas in amounts", async () => {
			const csv = `Value Date,Transaction Date,Description,Withdrawals,Deposits,Balance
20/05/2026,20/05/2026,Large Purchase,"1,250.75",,45000.00`;

			const result = await parser.parse(csv);
			expect(result).toHaveLength(1);
			expect(result[0].amountPaisas).toBe(125075);
		});

		test("all transactions have source=csv and bank=HBL", async () => {
			const csv = `Value Date,Transaction Date,Description,Withdrawals,Deposits,Balance
20/05/2026,20/05/2026,Test,500.00,,45000.00`;

			const result = await parser.parse(csv);
			expect(result[0].source).toBe("csv");
			expect(result[0].bank).toBe("HBL");
		});

		test("returns empty array for empty CSV", async () => {
			const csv = "Value Date,Transaction Date,Description,Withdrawals,Deposits,Balance\n";
			const result = await parser.parse(csv);
			expect(result).toHaveLength(0);
		});
	});
});
