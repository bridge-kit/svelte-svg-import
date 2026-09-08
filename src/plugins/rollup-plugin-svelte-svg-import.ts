import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { compile } from 'svelte/compiler';
import { optimize, type Config as SvgoConfig } from 'svgo';
import type { Plugin } from 'rollup';

import { generateSvgSvelteComponent } from '../utils/generateSvgSvelteComponent.js';

export interface SvelteSvgImportRollupOptions {
	svgo?: SvgoConfig;
}

export const svelteSvgImportRollup = (
	options: SvelteSvgImportRollupOptions = {},
): Plugin => {
	const cache = new Map<string, string>();

	const { svgo: config = {} } = options;

	return {
		name: 'rollup-plugin-svelte-svg-import',

		async transform(_code, id) {
			if (!id.endsWith('.svg?svelte')) return null;

			const cleanedId = id.replace('?svelte', '');

			const svg = await fs.readFile(cleanedId, 'utf8');

			const hashedContent = crypto
				.createHash('sha256')
				.update(svg)
				.digest('hex');

			const key = `${hashedContent}`;

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