import { describe, it, expect } from "vitest";
import { buildCanonical } from "../shared/canonical.ts";

describe("buildCanonical", () => {
	it("joins fields with newlines", () => {
		expect(buildCanonical("1755230400", "POST", "/", "abc123")).toBe(
			"1755230400\nPOST\n/\nabc123",
		);
	});
})
