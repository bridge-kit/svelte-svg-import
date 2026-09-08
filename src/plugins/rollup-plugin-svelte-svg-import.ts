import { compile } from 'svelte/compiler';
import { readFile } from 'fs/promises';
import { createHash } from 'node:crypto';
import type { Plugin } from 'rollup';
import { generateSvgSvelteComponent } from '../utils/generateSvgSvelteComponent.js';
import { optimize, type Config as SvgoConfig } from 'svgo';

const QUERY = '?svelte';

type Config = ({ ssr?: boolean | undefined } & SvgoConfig) | undefined;

export const svelteSvgImport = (options: Config): Plugin => {
	const cache = new Map<string, string>();

	return {
		name: 'svelte-svg-import',
		async resolveId(source, importer) {
			if (!source.endsWith(`.svg${QUERY}`)) return null;

			const file = source.slice(0, -QUERY.length);
			const resolved = await this.resolve(file, importer, { skipSelf: true });
			if (!resolved) return null;

			return `${resolved.id}${QUERY}`;
		},
		async load(id) {
			if (!id.endsWith(`.svg${QUERY}`)) return null;

			return readFile(id.slice(0, -QUERY.length), 'utf8');
		},
		async transform(code, id) {
			if (!id.endsWith(`.svg${QUERY}`)) return null;
			const cleanedId = id.replace('?svelte', '');
			const key = createHash('sha256').update(code).digest('hex');
			const cached = cache.get(key);
			if (cached) return { code: cached, map: null };

			const { data } = optimize(code, {
				...(options??{}),
				path: cleanedId,
				plugins: [
					{
						...options?.plugins,
						name: 'preset-default',
						params: {
							overrides: {
								cleanupIds: false,
								removeUnknownsAndDefaults: false,
							},
						},
					},
				],
			});
			const svelteCode = await generateSvgSvelteComponent(data);

			const { js } = compile(svelteCode, {
				filename: id,
				namespace: 'svg',
				generate: options?.ssr ? 'server' : 'client',
				dev: false,
			});

			cache.set(key, js.code);
			return { code: js.code, map: null };
		},
	};
};
