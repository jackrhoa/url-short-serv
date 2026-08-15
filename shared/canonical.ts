export function buildCanonical(timestamp: string, method: string, path: string, bodyHash: string): string {
				return [timestamp, method, path, bodyHash].join("\n");
			}
