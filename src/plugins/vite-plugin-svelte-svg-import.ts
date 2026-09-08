import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { compile } from 'svelte/compiler';
import { optimize, type Config as SvgoConfig } from 'svgo';
import type { Plugin } from 'vite';

import { generateSvgSvelteComponent } from '../utils/generateSvgSvelteComponent.js';

export interface SvelteSvgImportViteOptions {
	svgo?: SvgoConfig;
}

export const svelteSvgImportVite = (
	options: SvelteSvgImportViteOptions = {},
): Plugin => {
	const cache = new Map<string, string>();

	const { svgo: config = {} } = options;

	return {
		name: 'vite-plugin-svelte-svg-import',
		enforce: 'pre',

		async transform(_code, id, transformOptions) {
			if (!id.endsWith('.svg?svelte')) return null;

			const cleanedId = id.replace('?svelte', '');

			const svg = await fs.readFile(cleanedId, 'utf8');

			const hashedContent = crypto
				.createHash('sha256')
				.update(svg)
				.digest('hex');

			const ssr = transformOptions?.ssr === true;

			const key = `${hashedContent}:${ssr ? 'ssr' : 'client'}`;

			const cachedContent = cache.get(key);

			if (cachedContent) {
				return {
					code: cachedContent,
					map: null,
				};
			}

			const { data } = optimize(svg, {
				...config,
				path: cleanedId,
				plugins: [
					...(config.plugins ?? []),
					{
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

			const content = await generateSvgSvelteComponent(data);

			const { js } = compile(content, {
				css: 'injected',
				filename: cleanedId,
				namespace: 'svg',
				generate: 'server'
			});

			cache.set(key, js.code);

			return {
				code: js.code,
				map: null,
			};
		},
	};
};