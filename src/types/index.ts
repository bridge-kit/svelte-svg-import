import { Component } from "svelte";
import { SvelteHTMLElements } from "svelte/elements";

export interface SvgIconProps {
	strokeWidthScale?: number;
	color?: string;
	id?: string;
}
export interface Config {
	root: string;
}
export type IconComponent = Component<SvelteHTMLElements['svg'] & SvgIconProps>;
