import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        deep: "#06070A",
        "blue-black": "#080B12",
        graphite: "#101318",
        panel: "#151922",
        frost: "#F5FAFF",
        soft: "#DDD8CD",
        subtle: "#808080",
        muted: "#7C7A72",
        mineral: "#98A08F",
        stone: "#A5A298",
        moss: "#4F574E",
        brass: "#A68A63",
        bronze: "#7B6447",
        error: "#D06F6F",
        success: "#8FBF9F",
        cyan: "#37E6F2",
        violet: "#C64CFF",
        magenta: "#F03DCE",
        amber: "#EAA21A",
        green: "#34D67B",
        red: "#F2554D",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ['"IBM Plex Mono"', '"SF Mono"', '"Roboto Mono"', "monospace"],
      },
      borderRadius: {
        capsule: "999px",
      },
    },
  },
  plugins: [],
};

export default config;
