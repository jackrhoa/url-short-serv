#!/usr/bin/env node
import { parseArgs } from "node:util";
import { createPrivateKey } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { buildSignedRequest } from "./request.ts";

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

			const timestamp = Math.floor(Date.now() / 1000).toString();
			// signing using Ed25519
			const { bodyText, headers } = await buildSignedRequest(url, slug, timestamp, privateKey, token);

			const res = await fetch(`${baseUrl}/`, {
				method: "POST",
				headers,
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
