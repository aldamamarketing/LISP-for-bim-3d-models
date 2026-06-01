/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "tertiary-container": "#9a9898",
                "surface": "#121414",
                "primary": "#ffb693",
                "surface-container-high": "#292a2a",
                "on-secondary-container": "#bab8b7",
                "background": "#121414",
                "primary-fixed": "#ffdbcc",
                "tertiary-fixed": "#e5e2e1",
                "on-primary": "#561f00",
                "error": "#ffb4ab",
                "secondary-fixed-dim": "#c9c6c5",
                "surface-container-lowest": "#0d0e0f",
                "on-primary-fixed": "#351000",
                "outline-variant": "#5a4136",
                "tertiary-fixed-dim": "#c8c6c5",
                "error-container": "#93000a",
                "surface-tint": "#ffb693",
                "on-primary-container": "#572000",
                "inverse-primary": "#a04100",
                "surface-variant": "#343535",
                "on-tertiary-fixed": "#1c1b1b",
                "on-tertiary-fixed-variant": "#474746",
                "primary-fixed-dim": "#ffb693",
                "inverse-surface": "#e3e2e2",
                "secondary": "#c9c6c5",
                "on-secondary": "#313030",
                "inverse-on-surface": "#2f3131",
                "on-primary-fixed-variant": "#7a3000",
                "secondary-fixed": "#e5e2e1",
                "on-surface": "#e3e2e2",
                "on-background": "#e3e2e2",
                "surface-container": "#1e2020",
                "primary-container": "#ff6b00",
                "on-secondary-fixed-variant": "#474646",
                "surface-container-low": "#1a1c1c",
                "on-secondary-fixed": "#1c1b1b",
                "on-error": "#690005",
                "on-tertiary-container": "#313131",
                "on-surface-variant": "#e2bfb0",
                "surface-container-highest": "#343535",
                "tertiary": "#c8c6c5",
                "on-error-container": "#ffdad6",
                "on-tertiary": "#313030",
                "surface-bright": "#38393a",
                "outline": "#a98a7d",
                "surface-dim": "#121414",
                "secondary-container": "#4a4949"
            },
            borderRadius: {
                "DEFAULT": "0.125rem",
                "lg": "0.25rem",
                "xl": "0.5rem",
                "full": "0.75rem"
            },
            spacing: {
                "section-padding": "80px",
                "container-max-width": "1200px",
                "unit": "8px",
                "gutter": "24px",
                "margin-mobile": "16px"
            },
            fontFamily: {
                "code-sm": ["JetBrains Mono", "monospace"],
                "headline-lg": ["Inter", "sans-serif"],
                "body-md": ["Inter", "sans-serif"],
                "headline-md": ["Inter", "sans-serif"],
                "label-md": ["Inter", "sans-serif"],
                "headline-lg-mobile": ["Inter", "sans-serif"],
                "headline-xl": ["Inter", "sans-serif"],
                "body-lg": ["Inter", "sans-serif"]
            },
            fontSize: {
                "code-sm": ["13px", { "lineHeight": "1.5", "fontWeight": "400" }],
                "headline-lg": ["32px", { "lineHeight": "1.2", "letterSpacing": "-0.01em", "fontWeight": "700" }],
                "body-md": ["16px", { "lineHeight": "1.6", "fontWeight": "400" }],
                "headline-md": ["24px", { "lineHeight": "1.3", "fontWeight": "600" }],
                "label-md": ["14px", { "lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500" }],
                "headline-lg-mobile": ["28px", { "lineHeight": "1.2", "fontWeight": "700" }],
                "headline-xl": ["48px", { "lineHeight": "1.1", "letterSpacing": "-0.02em", "fontWeight": "700" }],
                "body-lg": ["18px", { "lineHeight": "1.6", "fontWeight": "400" }]
            }
        }
    },
    plugins: []
};
