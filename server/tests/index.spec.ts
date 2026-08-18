import { describe, it, expect } from "vitest";
import { env, SELF } from "cloudflare:test";

describe("GET /:slug", () => {
	it("302s to the stored url", async () => {
		await env.LINKS.put("abc", "https://jackrhoa.com");

		const res = await SELF.fetch("http://localhost/abc", { redirect: "manual" });

		expect(res.status).toBe(302);
		expect(res.headers.get("Location")).toBe("https://jackrhoa.com");
	});


})

