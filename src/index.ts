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

type AddLinkBody = {
	url: string;
	slug?: string;
}

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
				let body: AddLinkBody;
				try {
					body = await request.json<AddLinkBody>();
				} catch {
					return new Response("Invalid request");
				}
				if (body.slug) {
					await env.LINKS.put(body.slug, body.url);
					return new Response("Successfully added url!");
				}
			}
		}
	}
} satisfies ExportedHandler<Env>;
