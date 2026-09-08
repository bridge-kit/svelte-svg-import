import fs from 'fs/promises';
import { compile } from 'svelte/compiler';
import { optimize, type Config as SvgoConfig } from 'svgo';
import { generateSvgSvelteComponent } from '../utils/generateSvgSvelteComponent.js';
import crypto from 'crypto';
import { Component } from 'svelte';
import { SvelteHTMLElements } from 'svelte/elements';
import { SvgIconProps } from '../types/index.js';

export interface Config {
	root: string;
}
export type IconComponent = Component<SvelteHTMLElements['svg'] & SvgIconProps>;

type ViteTransformOptions = { ssr?: boolean | undefined } | undefined;

export const svelteSvgImportVite = (config: SvgoConfig = {}) => {
	const cache = new Map();

	return {
		name: 'vite-plugin-svelte-svg-import',
		enforce: 'pre' as const,
		async transform(_src: string, id: string, options: ViteTransformOptions) {
			if (!id.endsWith('.svg?svelte')) return;

			const cleanedId = id.replace('?svelte', '');
			const svg = await fs.readFile(cleanedId, { encoding: 'utf8' });
			const hashedContent = crypto
				.createHash('sha256')
				.update(svg)
				.digest('hex');
			const key = hashedContent + (options?.ssr ? ':ssr' : ':client');

			const cachedContent = cache.get(key);
			if (cachedContent) return { code: cachedContent };

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
				generate: options?.ssr ? 'server' : 'client',
			});
			cache.set(key, js.code);
			return { code: js.code };
		},
	};
};
