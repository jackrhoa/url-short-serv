import { describe, it, expect, beforeAll } from "vitest";
import { generateKeyPairSync, createHash, verify, type KeyObject } from "node:crypto";
import { buildSignedRequest } from "../request.ts";

let privateKey: KeyObject;
let publicKey: KeyObject;

beforeAll(() => {
	const pair = generateKeyPairSync("ed25519");
	privateKey = pair.privateKey;
	publicKey = pair.publicKey;
});

const TIMESTAMP = "1755230400";
const URL = "https://example.com/some/page";
const SLUG = "abc";
const TOKEN = "secret-token";

function build(overrides: Partial<{ url: string; slug: string; timestamp: string; token: string }> = {}) {
	return buildSignedRequest(
		overrides.url ?? URL,
		overrides.slug ?? SLUG,
		overrides.timestamp ?? TIMESTAMP,
		privateKey,
		overrides.token ?? TOKEN,
	);
}

describe("buildSignedRequest", () => {
	it("serializes the body as JSON with url and slug", async () => {
		const { bodyText } = await build();
		expect(JSON.parse(bodyText)).toEqual({ url: URL, slug: SLUG });
	});

	it("sets the auth, content type and timestamp headers", async () => {
		const { headers } = await build();
		expect(headers["Authorization"]).toBe(TOKEN);
		expect(headers["Content-Type"]).toBe("application/json");
		expect(headers["X-Timestamp"]).toBe(TIMESTAMP);
	});

	it("produces a signature the public key verifies", async () => {
		const { bodyText, headers } = await build();
		const bodyHash = createHash("sha256").update(bodyText).digest("hex");
		const canonical = [TIMESTAMP, "POST", "/", bodyHash].join("\n");

		const ok = verify(
			null,
			Buffer.from(canonical),
			publicKey,
			Buffer.from(headers["X-Signature"], "base64url"),
		);
		expect(ok).toBe(true);
	});

	it("rejects a signature checked against the wrong body", async () => {
		const { headers } = await build();
		const tamperedHash = createHash("sha256")
			.update(JSON.stringify({ url: URL, slug: "different" }))
			.digest("hex");
		const canonical = [TIMESTAMP, "POST", "/", tamperedHash].join("\n");

		const ok = verify(
			null,
			Buffer.from(canonical),
			publicKey,
			Buffer.from(headers["X-Signature"], "base64url"),
		);
		expect(ok).toBe(false);
	});

	it("is deterministic for identical inputs", async () => {
		expect(await build()).toEqual(await build());
	});

	it("changes the signature when the slug changes", async () => {
		expect((await build({ slug: "one" })).headers["X-Signature"]).not.toBe(
			(await build({ slug: "two" })).headers["X-Signature"],
		);
	});

	it("changes the signature when the timestamp changes", async () => {
		expect((await build({ timestamp: "1755230400" })).headers["X-Signature"]).not.toBe(
			(await build({ timestamp: "1755230401" })).headers["X-Signature"],
		);
	});

	it("does not sign the token", async () => {
		expect((await build({ token: "one" })).headers["X-Signature"]).toBe(
			(await build({ token: "two" })).headers["X-Signature"],
		);
	});

	it("emits a base64url signature with no padding", async () => {
		expect((await build()).headers["X-Signature"]).toMatch(/^[A-Za-z0-9_-]+$/);
	});

	it("propagates the canonical guard when a field contains a newline", async () => {
		await expect(build({ timestamp: "1755230400\nPOST" })).rejects.toThrow(/newline/i);
	});
})
