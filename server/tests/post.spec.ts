import { describe, it, expect, beforeAll } from "vitest";
import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import worker from "../index";
import { buildCanonical } from "../../shared/canonical";
import { bytesToBase64url } from "../../shared/base64url";
import { sha256Hex } from "../../shared/hash";

let privateKey: CryptoKey;

beforeAll(async () => {
	const pair = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
		"sign",
		"verify",
	])) as CryptoKeyPair;
	privateKey = pair.privateKey;
	env.PUBLIC_KEY = bytesToBase64url(await crypto.subtle.exportKey("raw", pair.publicKey));
});

async function signedPost(
	body: unknown,
	overrides: { timestamp?: string; signature?: string } = {},
) {
	const bodyText = JSON.stringify(body);
	const timestamp = overrides.timestamp ?? Math.floor(Date.now() / 1000).toString();

	const bodyHash = await sha256Hex(bodyText);
	const canonical = buildCanonical(timestamp, "POST", "/", bodyHash);
	const signature =
		overrides.signature ??
		bytesToBase64url(
			await crypto.subtle.sign("Ed25519", privateKey, new TextEncoder().encode(canonical)),
		);

	return dispatch("http://localhost/", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Timestamp": timestamp,
			"X-Signature": signature,
		},
		body: bodyText,
	});
}

async function dispatch(url: string, init?: RequestInit): Promise<Response> {
	const ctx = createExecutionContext();
	const res = await worker.fetch(new Request(url, init), env, ctx);
	await waitOnExecutionContext(ctx);
	return res;
}

describe("POST /", () => {
	it("stores the link and makes it redirect", async () => {
		const res = await signedPost({ url: "https://jackrhoa.com/blog", slug: "blog" });

		expect(res.status).toBe(200);
		expect(await res.text()).toBe("Successfully added url!");
		expect(await env.LINKS.get("blog")).toBe("https://jackrhoa.com/blog");

		const redirect = await dispatch("http://localhost/blog", { redirect: "manual" });
		expect(redirect.status).toBe(302);
		expect(redirect.headers.get("Location")).toBe("https://jackrhoa.com/blog");
	});

	it("rejects a request with no signature headers", async () => {
		const res = await dispatch("http://localhost/", {
			method: "POST",
			body: JSON.stringify({ url: "https://example.com", slug: "nope" }),
		});

		expect(res.status).toBe(401);
		expect(await env.LINKS.get("nope")).toBeNull();
	});

	it("rejects a tampered body", async () => {
		const bodyText = JSON.stringify({ url: "https://evil.example", slug: "tampered" });
		const timestamp = Math.floor(Date.now() / 1000).toString();
		const canonical = buildCanonical(timestamp, "POST", "/", "0".repeat(64));
		const signature = bytesToBase64url(
			await crypto.subtle.sign("Ed25519", privateKey, new TextEncoder().encode(canonical)),
		);

		const res = await dispatch("http://localhost/", {
			method: "POST",
			headers: { "X-Timestamp": timestamp, "X-Signature": signature },
			body: bodyText,
		});

		expect(res.status).toBe(401);
		expect(await env.LINKS.get("tampered")).toBeNull();
	});

	it("rejects a signature made by a different key", async () => {
		const other = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
			"sign",
			"verify",
		])) as CryptoKeyPair;
		const bodyText = JSON.stringify({ url: "https://example.com", slug: "wrongkey" });
		const timestamp = Math.floor(Date.now() / 1000).toString();
		const bodyHash = await sha256Hex(bodyText);
		const canonical = buildCanonical(timestamp, "POST", "/", bodyHash);
		const signature = bytesToBase64url(
			await crypto.subtle.sign("Ed25519", other.privateKey, new TextEncoder().encode(canonical)),
		);

		const res = await dispatch("http://localhost/", {
			method: "POST",
			headers: { "X-Timestamp": timestamp, "X-Signature": signature },
			body: bodyText,
		});

		expect(res.status).toBe(401);
		expect(await env.LINKS.get("wrongkey")).toBeNull();
	});

	it("rejects a stale timestamp", async () => {
		const stale = (Math.floor(Date.now() / 1000) - 60).toString();
		const res = await signedPost(
			{ url: "https://example.com", slug: "stale" },
			{ timestamp: stale },
		);

		expect(res.status).toBe(401);
		expect(await env.LINKS.get("stale")).toBeNull();
	});
})
