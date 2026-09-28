/**
 * Categorical data-viz palette for the dashboards. The hex values live as CSS
 * custom properties (--cat-1..6 in globals.css) so they flip with the theme;
 * this module maps friendly names to those vars and gives the CVD-safe fixed
 * order. Assign hues in this order and never cycle a 7th — see the dataviz
 * method. Text always uses ink tokens; these colors only ever carry identity
 * (an icon chip, a dot, a bar), never label text.
 */
export type DashColor = "green" | "blue" | "amber" | "violet" | "pink" | "cyan";

/** friendly name → the themed CSS variable reference. */
export const dashVar: Record<DashColor, string> = {
  green: "var(--cat-1)",
  blue: "var(--cat-2)",
  amber: "var(--cat-3)",
  violet: "var(--cat-4)",
  pink: "var(--cat-5)",
  cyan: "var(--cat-6)",
};

/** The fixed categorical order (validated). Index a series list into this. */
export const DASH_ORDER: DashColor[] = ["green", "blue", "amber", "violet", "pink", "cyan"];

/** The Nth categorical color, wrapping is intentionally avoided — see method. */
export function dashColorAt(i: number): DashColor {
  return DASH_ORDER[i % DASH_ORDER.length];
}

/** A translucent tint of a category color for chip/bar fills (color-mix). */
export function dashTint(c: DashColor, pct = 14): string {
  return `color-mix(in srgb, ${dashVar[c]} ${pct}%, transparent)`;
}
