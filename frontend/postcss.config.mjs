/**
 * PostCSS configuration.
 * Processes Tailwind CSS directives and adds vendor prefixes via autoprefixer.
 */
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
