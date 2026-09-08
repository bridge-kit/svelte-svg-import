import crypto from 'node:crypto';

export const generateSvgSvelteComponent = async (svgString: string) => {
	let isMultiColorIcon = false;

	let svelteSvgString = svgString
		.replace('<svg ', '<svg class={props.class} ')
		.replace(/<svg ([^>]*)>/, '<svg $1 {...props}>')
		.replace(/stroke-width="([\d.]+)([a-z%]*)"/g, (_match, width, unit) => {
			return `stroke-width="{${width} * strokeWidthScale}${unit}"`;
		})
		.replace(/url\(#.*?\)/g, `url(#{id})`)
		.replace(/id="[^"]+"/g, `id={id}`);

	const allColorResults = svgString.matchAll(
		/"#[0-9a-fA-F]{6}"|"#[0-9a-fA-F]{3}"|black|white/g,
	);

	isMultiColorIcon = new Set(allColorResults.map(([color]) => color)).size > 1;

	if (!isMultiColorIcon) {
		svelteSvgString = svelteSvgString.replace(
			/"#[0-9a-fA-F]{6}"|"#[0-9a-fA-F]{3}"|black|white/g,
			'currentColor',
		);
	}

	let svelteComponentTemplate = `<script lang="ts">
  import type { SvelteHTMLElements } from 'svelte/elements';
  interface SvgIconProps {
    strokeWidthScale?: number;
  }
  type SvgIconCombined = SvelteHTMLElements['svg'] & SvgIconProps;
  const props: SvgIconCombined = $props();
  const strokeWidthScale = props.strokeWidthScale || 1;
  const id = "${crypto.randomUUID()}"; 
</script>\n`;

	return (svelteComponentTemplate += svelteSvgString);
};
