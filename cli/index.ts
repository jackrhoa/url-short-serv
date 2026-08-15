#!/usr/bin/env node
import { parseArgs } from "node:util";
import { createPrivateKey, createHash, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { buildCanonical } from "../shared/canonical.ts";

const privateKey = createPrivateKey(
	readFileSync(join(homedir(), ".config/jackr/ed25519.pem"), "utf8")
);

const { positionals } = parseArgs({
	allowPositionals: true,
});

const baseUrl = process.env.SHORTENER_URL ?? "https://thejac.kr";

const token = process.env.TOKEN ?? "";

const command = positionals[0];

switch (command) {
	case "add": {
		if (positionals.length >= 3) {
			const url = positionals[1];
			const slug = positionals[2];

			const bodyText = JSON.stringify({url, slug });
			const bodyHash = createHash("sha256").update(bodyText).digest("hex");
			const timestamp = Math.floor(Date.now() / 1000).toString();
			const canonical = buildCanonical(timestamp, "POST", "/", bodyHash);
			// signing using Ed25519
			const signature = sign(null, Buffer.from(canonical), privateKey).toString("base64url");

			const res = await fetch(`${baseUrl}/`, {
				method: "POST",
				headers: {
					"Authorization": `${token}`,
					"Content-Type": "application/json",
					"X-Timestamp": timestamp,
					"X-Signature": signature
				},
				body: bodyText
			});


			if (!res.ok) {
				console.error(`${res.status}: ${await res.text()}`);
				process.exit(1);
			}
			console.log("Successfully added url");
		}
		break;
	}
	default: {
		console.error(`Unknown command: ${command}`);
		process.exit(1);
	}
}
