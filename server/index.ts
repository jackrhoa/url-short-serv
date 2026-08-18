/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { buildCanonical } from "../shared/canonical";
import { base64urlToBytes } from "../shared/base64url";
import { sha256Hex } from "../shared/hash";

type AddLinkBody = {
	url: string;
	slug?: string;
}

function unauthorized(): Response {
	return new Response("Unauthorized", {
		status: 401,
		headers: { "WWW-Authenticate": "Signature" },
	});
}

export { base64urlToBytes };


export default {
	async fetch(request, env, ctx): Promise<Response> {
		switch (request.method) {
			case "GET": {
				const url = new URL(request.url);
				const slug = url.pathname.slice(1);
				console.log("Slug " + slug);
				if (slug.trim().length === 0)
					return new Response("Slug missing");
				const kvalue = await env.LINKS.get(slug);
				if (kvalue === null) {
					return new Response("Invalid slug: '" + slug + "'", { status: 404 });
				}
					return new Response(null, { status: 302, headers: { Location: kvalue } });
			}
			case "POST": {
				const timestampHeader = request.headers.get("x-timestamp");
				const sigHeader = request.headers.get("x-signature");
				if (!timestampHeader || !sigHeader) return unauthorized();

				const now = Math.floor(Date.now() / 1000);
				const timestamp = Number(timestampHeader);
				if (!Number.isFinite(timestamp) || Math.abs(now - timestamp) > 5) return unauthorized();

				const bodyText = await request.text();

				const bodyHash = await sha256Hex(bodyText);
				const canonical = buildCanonical(timestampHeader, request.method, new URL(request.url).pathname, bodyHash);

				const sigBytes = base64urlToBytes(sigHeader);
				const keyBytes = base64urlToBytes(env.PUBLIC_KEY);

				const key = await crypto.subtle.importKey("raw", keyBytes, { name: "Ed25519" }, false, ["verify"]);
				const ok = await crypto.subtle.verify("Ed25519", key, sigBytes, new TextEncoder().encode(canonical));
				if (!ok) return unauthorized();

				let body: AddLinkBody;
				try {
					body = JSON.parse(bodyText) as AddLinkBody;
				} catch {
					return new Response("Invalid request");
				}
				if (body.slug) {
					await env.LINKS.put(body.slug, body.url);
					return new Response("Successfully added url!");
				}
			}
			default: {
				return new Response("Invalid request method");
			}
		}
	}
} satisfies ExportedHandler<Env>;
