const FORBIDDEN = /[\n\r]/;

export function buildCanonical(timestamp: string, method: string, path: string, bodyHash: string): string {
	const fields = { timestamp, method, path, bodyHash };
	for (const [name, value] of Object.entries(fields)) {
		if (FORBIDDEN.test(value)) {
			throw new Error(`canonical field ${name} contains a newline`);
		}
	}
	return Object.values(fields).join("\n");
}
