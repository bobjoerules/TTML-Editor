/**
 * Utility to generate Radix UI-compatible 12-shade color scales from a single hex color.
 */

interface HSL {
	h: number;
	s: number;
	l: number;
}

function hexToHsl(hex: string): HSL {
	let r = 0,
		g = 0,
		b = 0;
	if (hex.length === 4) {
		r = Number.parseInt(hex[1] + hex[1], 16);
		g = Number.parseInt(hex[2] + hex[2], 16);
		b = Number.parseInt(hex[3] + hex[3], 16);
	} else {
		r = Number.parseInt(hex.slice(1, 3), 16);
		g = Number.parseInt(hex.slice(3, 5), 16);
		b = Number.parseInt(hex.slice(5, 7), 16);
	}
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b),
		min = Math.min(r, g, b);
	let h = 0,
		s = 0,
		l = (max + min) / 2;

	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}
		h /= 6;
	}
	return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToCss(h: number, s: number, l: number, a = 1): string {
	return `hsla(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%, ${a})`;
}

function getContrastColor(l: number): string {
	return l > 65 ? "black" : "white";
}

export function generateRadixScale(baseHex: string, isDark?: boolean) {
	const { h, s, l: baseL } = hexToHsl(baseHex);
	const effectiveIsDark = isDark ?? baseL < 50;

	// Lightness presets for Radix-like 1-12 scale
	const lightnesses = effectiveIsDark
		? [
				2, // 1: App bg
				4, // 2: Subtle bg
				8, // 3: Item bg
				12, // 4: Item hover
				16, // 5: Item active
				24, // 6: Subtle border
				32, // 7: Border
				40, // 8: High contrast border
				Math.max(45, Math.min(85, baseL)), // 9: Solid (clamped base)
				Math.max(40, Math.min(80, baseL - 5)), // 10: Solid hover
				Math.max(65, Math.min(85, baseL + 15)), // 11: Low contrast text (Vivid)
				93, // 12: High contrast text (Slightly tinted near-white)
			]
		: [
				99, // 1: App bg
				97, // 2: Subtle bg
				93, // 3: Item bg
				89, // 4: Item hover
				84, // 5: Item active
				78, // 6: Subtle border
				71, // 7: Border
				70, // 8: High contrast border
				Math.max(25, Math.min(75, baseL)), // 9: Solid (clamped base)
				Math.max(20, Math.min(70, baseL - 5)), // 10: Solid hover
				Math.max(25, Math.min(45, baseL - 20)), // 11: Low contrast text (Vivid)
				8, // 12: High contrast text (Near-black)
			];

	// Custom alpha opacities to match Radix-like behavior
	const alphaOpacities = [
		0.05, // 1
		0.1, // 2
		0.15, // 3: Soft background
		0.2, // 4: Soft hover
		0.3, // 5: Soft active
		0.45, // 6: Border
		0.6, // 7: Higher contrast border
		0.8, // 8: Solid border
		1.0, // 9: Solid
		1.0, // 10: Solid hover
		1.0, // 11: Low contrast text
		1.0, // 12: High contrast text
	];

	const variables: Record<string, string> = {
		"--accent-contrast": getContrastColor(lightnesses[8]),
		"--accent-9-contrast": getContrastColor(lightnesses[8]),
		"--accent-surface": hslToCss(h, s, baseL > 50 ? 98 : 15),
		"--accent-indicator": hslToCss(h, s, lightnesses[8]),
		"--selection-color": hslToCss(h, s, lightnesses[4], alphaOpacities[4]),
		"--active-line-bg": hslToCss(h, s, lightnesses[2], alphaOpacities[2]),
		"--line-hover-bg": hslToCss(h, s, lightnesses[1], alphaOpacities[1]),
		"--adv-waveform-progress": hslToCss(h, s, lightnesses[8]),
	};

	// Generate Accent Scale
	for (let i = 0; i < 12; i++) {
		const step = i + 1;
		const l = lightnesses[i];
		variables[`--accent-${step}`] = hslToCss(h, s, l);
		variables[`--accent-a${step}`] = hslToCss(h, s, l, alphaOpacities[i]);
	}

	return variables;
}

/**
 * Generates a dual-tone linear gradient from a single hex color or a multi-stop gradient from multiple colors.
 */
export function generateGradient(
	baseHex: string | string[],
	type: "linear" | "radial" | "conic" = "linear",
	center: [number, number] = [50, 50],
	angle: number = 45,
	size: number = 1,
): string {
	const buildGradientString = (colorsStr: string) => {
		switch (type) {
			case "radial":
				return `radial-gradient(circle at ${center[0]}% ${center[1]}%, ${colorsStr})`;
			case "conic":
				return `conic-gradient(from ${angle}deg at ${center[0]}% ${center[1]}%, ${colorsStr})`;
			default:
				return `linear-gradient(${angle}deg, ${colorsStr})`;
		}
	};

	const getGradientString = (colorsArray: string[]) => {
		const numColors = Math.max(colorsArray.length - 1, 1);
		if (type === "conic") {
			const gap = (360 / numColors) * size;
			const stops = colorsArray.map((c, i) => `${c} ${i * gap}deg`).join(", ");
			return buildGradientString(stops);
		} else {
			const gap = (100 / numColors) * size;
			const stops = colorsArray.map((c, i) => `${c} ${i * gap}%`).join(", ");
			return buildGradientString(stops);
		}
	};

	if (Array.isArray(baseHex)) {
		if (baseHex.length === 0) return "";
		if (baseHex.length === 1) {
			const { h, s, l } = hexToHsl(baseHex[0]);
			const start = hslToCss(h, s, l);
			const end = hslToCss(h, s, Math.max(0, l - 30));
			return getGradientString([start, end]);
		}
		if (type === "conic" && baseHex.length > 2) {
			return getGradientString(baseHex);
		}
		return getGradientString(baseHex);
	}
	const { h, s, l } = hexToHsl(baseHex);
	const start = hslToCss(h, s, l);
	const end = hslToCss(h, s, Math.max(0, l - 30)); // 30% darker
	return getGradientString([start, end]);
}

export const RADIX_ACCENT_HEX: Record<string, string> = {
	gray: "#8d8d8d",
	gold: "#978365",
	bronze: "#a18072",
	brown: "#ad7f58",
	yellow: "#ffe629",
	amber: "#ffc53d",
	orange: "#f76b15",
	tomato: "#e54d2e",
	red: "#e5484d",
	ruby: "#e54666",
	crimson: "#e93d82",
	pink: "#d6409f",
	plum: "#ab4aba",
	purple: "#8e4ec6",
	violet: "#6e56cf",
	iris: "#5b5bd6",
	indigo: "#3e63dd",
	blue: "#0090ff",
	cyan: "#00a2c7",
	teal: "#12a594",
	jade: "#29a383",
	green: "#30a46c",
	grass: "#46a758",
	lime: "#bdee63",
	mint: "#86ead4",
	sky: "#7ce2fe",
};

export function parseColorToHsl(color: string): HSL | null {
	if (!color) return null;
	const trimmed = color.trim().toLowerCase();
	if (trimmed.startsWith("#")) {
		return hexToHsl(trimmed);
	}
	const match = trimmed.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
	if (match) {
		const r = Number.parseInt(match[1], 10) / 255;
		const g = Number.parseInt(match[2], 10) / 255;
		const b = Number.parseInt(match[3], 10) / 255;
		const max = Math.max(r, g, b),
			min = Math.min(r, g, b);
		let h = 0,
			s = 0,
			l = (max + min) / 2;
		if (max !== min) {
			const d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			switch (max) {
				case r:
					h = (g - b) / d + (g < b ? 6 : 0);
					break;
				case g:
					h = (b - r) / d + 2;
					break;
				case b:
					h = (r - g) / d + 4;
					break;
			}
			h /= 6;
		}
		return { h: h * 360, s: s * 100, l: l * 100 };
	}
	return null;
}

export function hslToHex(h: number, s: number, l: number): string {
	const normH = ((h % 360) + 360) % 360;
	const normS = Math.max(0, Math.min(100, s)) / 100;
	const normL = Math.max(0, Math.min(100, l)) / 100;

	const c = (1 - Math.abs(2 * normL - 1)) * normS;
	const x = c * (1 - Math.abs(((normH / 60) % 2) - 1));
	const m = normL - c / 2;
	let r = 0,
		g = 0,
		b = 0;

	if (normH < 60) {
		r = c;
		g = x;
		b = 0;
	} else if (normH < 120) {
		r = x;
		g = c;
		b = 0;
	} else if (normH < 180) {
		r = 0;
		g = c;
		b = x;
	} else if (normH < 240) {
		r = 0;
		g = x;
		b = c;
	} else if (normH < 300) {
		r = x;
		g = 0;
		b = c;
	} else {
		r = c;
		g = 0;
		b = x;
	}

	const toHex = (n: number) => {
		const val = Math.round((n + m) * 255);
		return Math.max(0, Math.min(255, val)).toString(16).padStart(2, "0");
	};

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getThemeTintedBackgrounds({
	accentColor,
	customAccentColor,
	useCustomAccent,
	vTitlebarBg,
	isDark,
}: {
	accentColor?: string;
	customAccentColor?: string;
	useCustomAccent?: boolean;
	vTitlebarBg?: string;
	isDark: boolean;
}): { rootBg: string; editorBg: string; dialogBg: string } {
	let baseHsl: HSL | null = null;
	if (vTitlebarBg && vTitlebarBg !== "transparent" && vTitlebarBg !== "#1f1f1f") {
		baseHsl = parseColorToHsl(vTitlebarBg);
		if (baseHsl && baseHsl.s < 2) {
			return isDark
				? { rootBg: vTitlebarBg, editorBg: vTitlebarBg, dialogBg: vTitlebarBg }
				: { rootBg: vTitlebarBg, editorBg: vTitlebarBg, dialogBg: "#ffffff" };
		}
	}

	if (!baseHsl) {
		if (useCustomAccent && customAccentColor) {
			baseHsl = parseColorToHsl(customAccentColor);
		} else if (accentColor && RADIX_ACCENT_HEX[accentColor]) {
			baseHsl = parseColorToHsl(RADIX_ACCENT_HEX[accentColor]);
		}
	}

	const isGrayAccent =
		!useCustomAccent &&
		accentColor === "gray" &&
		(!vTitlebarBg || vTitlebarBg === "transparent" || vTitlebarBg === "#1f1f1f");

	if (!baseHsl || isGrayAccent || baseHsl.s < 2) {
		return isDark
			? { rootBg: "#111113", editorBg: "#111113", dialogBg: "#18181b" }
			: { rootBg: "#fafafa", editorBg: "#fafafa", dialogBg: "#ffffff" };
	}

	const { h, s } = baseHsl;

	if (isDark) {
		const effS = Math.min(Math.max(s * 0.65, 18), 45);
		const rootBg = hslToHex(h, effS, 8.5);
		const dialogBg = hslToHex(h, effS * 0.85, 11.5);
		return { rootBg, editorBg: rootBg, dialogBg };
	} else {
		const effS = Math.min(Math.max(s * 0.45, 15), 45);
		const rootBg = hslToHex(h, effS, 97.5);
		const dialogBg = "#ffffff";
		return { rootBg, editorBg: rootBg, dialogBg };
	}
}

