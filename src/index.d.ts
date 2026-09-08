import type { Component } from 'svelte';
import type { SvelteHTMLElements } from 'svelte/elements';
import type { SvgIconProps } from './types/index.js';
export * from './types/index.ts'

declare module '*.svg?svelte' {
	const component: Component<
		SvelteHTMLElements['svg'] & SvgIconProps
	>;

	export default component;
}