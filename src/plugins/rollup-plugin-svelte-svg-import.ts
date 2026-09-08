import fs from 'fs/promises';
import crypto from 'crypto';
import { compile } from 'svelte/compiler';
import { optimize, type Config as SvgoConfig } from 'svgo';
import { generateSvgSvelteComponent } from '../utils/generateSvgSvelteComponent.js';
import type { Component } from 'svelte';
import type { SvelteHTMLElements } from 'svelte/elements';
import type { SvgIconProps } from '../types/index.js';

export interface Config {
	root: string;
}

export type IconComponent = Component<
	SvelteHTMLElements['svg'] & SvgIconProps
>;

export interface RollupSvelteSvgImportOptions extends SvgoConfig {
	ssr?: boolean;
}

export const svelteSvgImportRollup = (
	config: RollupSvelteSvgImportOptions = {},
) => {
	const cache = new Map<string, string>();

	return {
		name: 'rollup-plugin-svelte-svg-import',

		enforce: 'pre' as const,

		async transform(_src: string, id: string) {
			if (!id.endsWith('.svg?svelte')) return;

			const cleanedId = id.replace('?svelte', '');

			const svg = await fs.readFile(cleanedId, {
				encoding: 'utf8',
			});

			const hashedContent = crypto
				.createHash('sha256')
				.update(svg)
				.digest('hex');

			const key =
				hashedContent + (config.ssr ? ':ssr' : ':client');

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
					{
						...config.plugins,
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
				css: undefined,
				filename: id,
				namespace: 'svg',
				generate: config.ssr ? 'server' : 'client',
			});

			cache.set(key, js.code);

			return {
				code: js.code,
				map: null,
			};
		},
	};
};