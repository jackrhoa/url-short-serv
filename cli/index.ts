#!/usr/bin/env node
import { parseArgs } from "node:util";

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

			const res = await fetch(`${baseUrl}/`, {
				method: "POST",
				headers: {
					"Authorization": `${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ url, slug }),
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
console.log({ positionals });
