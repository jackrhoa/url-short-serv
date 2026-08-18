export function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
	const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
	let hex = "";
	for (const byte of view) {
		hex += byte.toString(16).padStart(2, "0");
	}
	return hex;
}

export async function sha256Hex(text: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
	return bytesToHex(digest);
}
