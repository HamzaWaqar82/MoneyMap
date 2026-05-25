const { checkAndNotify } = require("../../services/notificationTrigger.service");

jest.mock("../../models/Notification", () => ({
	findOne: jest.fn().mockResolvedValue(null),
}));

jest.mock("../../models/User", () => ({
	findById: jest.fn().mockResolvedValue({ _id: "user1", email: "test@test.com", fullName: "Test" }),
}));

jest.mock("../../services/pushNotification.service", () => ({
	dispatchNotification: jest.fn().mockImplementation(async (user, type, message) => ({
		notif: { _id: "notif1", userId: user._id, type, message, isRead: false },
		pushSent: false,
	})),
}));

describe("notificationTrigger.checkAndNotify", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test("fires exceeded alert when crossing 100%", async () => {
		const { dispatchNotification } = require("../../services/pushNotification.service");
		const updatedBudgets = [{
			category: "Food",
			month: "2026-05",
			monthlyLimit: 1000,
			oldSpent: 400,
			newSpent: 1100,
			percentUsed: 110,
		}];

		const created = await checkAndNotify("user1", updatedBudgets);
		expect(created).toHaveLength(1);
		expect(dispatchNotification).toHaveBeenCalledWith(
			expect.any(Object),
			"budget_alert",
			expect.stringContaining("exceeded"),
			"high",
		);
	});

	test("fires warning alert when crossing 80%", async () => {
		const { dispatchNotification } = require("../../services/pushNotification.service");
		const updatedBudgets = [{
			category: "Transport",
			month: "2026-05",
			monthlyLimit: 1000,
			oldSpent: 500,
			newSpent: 850,
			percentUsed: 85,
		}];

		const created = await checkAndNotify("user1", updatedBudgets);
		expect(created).toHaveLength(1);
		expect(dispatchNotification).toHaveBeenCalledWith(
			expect.any(Object),
			"budget_alert",
			expect.stringContaining("warning"),
			"warning",
		);
	});

	test("does not fire when already above threshold", async () => {
		const { dispatchNotification } = require("../../services/pushNotification.service");
		const updatedBudgets = [{
			category: "Food",
			month: "2026-05",
			monthlyLimit: 1000,
			oldSpent: 1100,
			newSpent: 1200,
			percentUsed: 120,
		}];

		const created = await checkAndNotify("user1", updatedBudgets);
		expect(created).toHaveLength(0);
		expect(dispatchNotification).not.toHaveBeenCalled();
	});

	test("returns empty for no budgets", async () => {
		const created = await checkAndNotify("user1", []);
		expect(created).toHaveLength(0);
	});
});
