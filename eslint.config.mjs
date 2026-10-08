// Lints .ts and .astro files for unused imports; `eslint --fix` (and the
// ESLint VS Code extension on save) removes them automatically.
import astro from "eslint-plugin-astro";
import unusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

export default [
	{ ignores: ["dist/", ".astro/", "node_modules/", "scripts/"] },
	// Parsers only: astro-eslint-parser for .astro files, typescript-eslint for .ts.
	...astro.configs["flat/base"],
	{
		files: ["**/*.ts"],
		languageOptions: { parser: tseslint.parser },
	},
	{
		files: ["**/*.{ts,astro}"],
		plugins: { "unused-imports": unusedImports },
		rules: {
			"unused-imports/no-unused-imports": "warn",
			"unused-imports/no-unused-vars": [
				"warn",
				{
					vars: "all",
					varsIgnorePattern: "^_",
					args: "after-used",
					argsIgnorePattern: "^_",
					caughtErrors: "none",
					ignoreRestSiblings: true,
				},
			],
		},
	},
];
