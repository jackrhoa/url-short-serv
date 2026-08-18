import { sign, type KeyObject } from "node:crypto";
import { buildCanonical } from "../shared/canonical.ts";
import { sha256Hex } from "../shared/hash.ts";

export interface SignedRequest {
	bodyText: string;
	headers: Record<string, string>;
}

export async function buildSignedRequest(
	url: string,
	slug: string,
	timestamp: string,
	privateKey: KeyObject,
	token: string,
): Promise<SignedRequest> {
	const bodyText = JSON.stringify({ url, slug });
	const bodyHash = await sha256Hex(bodyText);
	const canonical = buildCanonical(timestamp, "POST", "/", bodyHash);
	const signature = sign(null, Buffer.from(canonical), privateKey).toString("base64url");

	return {
		bodyText,
		headers: {
			"Authorization": `${token}`,
			"Content-Type": "application/json",
			"X-Timestamp": timestamp,
			"X-Signature": signature,
		},
	};
}
