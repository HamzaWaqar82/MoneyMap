const { parseCSV, detectBank, getSupportedBanks } = require("../../services/csvParser.service");

/**
 * Unit Tests — CSV Parser Service (Factory/Router)
 *
 * Tests bank auto-detection, parser routing, and error handling.
 */
describe("csvParser.service", () => {
	describe("getSupportedBanks", () => {
		test("returns list of supported banks", () => {
			const banks = getSupportedBanks();
			expect(banks).toContain("HBL");
			expect(banks).toContain("JazzCash");
			expect(Array.isArray(banks)).toBe(true);
		});
	});

	describe("detectBank", () => {
		test("detects HBL from CSV headers", () => {
			const csv = "Value Date,Transaction Date,Description,Withdrawals,Deposits,Balance\n20/05/2026,20/05/2026,Test,500,,45000";
			const result = detectBank(csv);
			expect(result).not.toBeNull();
			expect(result.bank).toBe("HBL");
		});

		test("detects JazzCash from CSV headers", () => {
			const csv = 'Date,Description,Type,Debit,Credit,Fee,Balance,Transaction ID\n"2026-05-22","Test","Type","500","0","0","1000","123"';
			const result = detectBank(csv);
			expect(result).not.toBeNull();
			expect(result.bank).toBe("JazzCash");
		});

		test("returns null for unknown bank format", () => {
			const csv = "Column1,Column2,Column3\na,b,c";
			const result = detectBank(csv);
			expect(result).toBeNull();
		});
	});

	describe("parseCSV", () => {
		test("parses HBL CSV with auto-detection", async () => {
			const csv = `Value Date,Transaction Date,Description,Withdrawals,Deposits,Balance
20/05/2026,20/05/2026,POS PURCHASE - KARACHI,500.00,,45000.00
22/05/2026,22/05/2026,SALARY CREDIT,,50000.00,94000.00`;

			const result = await parseCSV(csv);

			expect(result.bank).toBe("HBL");
			expect(result.transactions).toHaveLength(2);
			expect(result.errors).toHaveLength(0);
			expect(result.stats.totalRows).toBe(2);
			expect(result.stats.validRows).toBe(2);
		});

		test("parses JazzCash CSV with explicit bank hint", async () => {
			const csv = `Date,Description,Type,Debit,Credit,Fee,Balance,Transaction ID
"2026-05-22","Money Transfer","Transfer","500.00","0.00","0.00","1425.50","073230904128"`;

			const result = await parseCSV(csv, "JazzCash");

			expect(result.bank).toBe("JazzCash");
			expect(result.transactions).toHaveLength(1);
		});

		test("throws error for unsupported bank hint", async () => {
			const csv = "Date,Description\n2026-05-22,Test";
			await expect(parseCSV(csv, "UnknownBank")).rejects.toThrow("Unsupported bank");
		});

		test("throws error for undetectable CSV format", async () => {
			const csv = "Column1,Column2,Column3\na,b,c";
			await expect(parseCSV(csv)).rejects.toThrow("Could not auto-detect");
		});

		test("calculates stats correctly", async () => {
			const csv = `Value Date,Transaction Date,Description,Withdrawals,Deposits,Balance
20/05/2026,20/05/2026,POS PURCHASE,500.00,,45000.00
21/05/2026,21/05/2026,ATM,1000.00,,44000.00
22/05/2026,22/05/2026,SALARY,,50000.00,94000.00`;

			const result = await parseCSV(csv);

			expect(result.stats.totalDebitPaisas).toBe(150000); // 500 + 1000 in paisas
			expect(result.stats.totalCreditPaisas).toBe(5000000); // 50000 in paisas
		});
	});
});
