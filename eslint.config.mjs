import { FlatCompat } from "@eslint/eslintrc"
import path from "node:path"
import { fileURLToPath } from "node:url"

const compat = new FlatCompat({
  baseDirectory: path.dirname(fileURLToPath(import.meta.url)),
})
export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      ".uploads/**",
      "artifacts/**",
      ".tmp-*/**",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
  { rules: { "react/no-unescaped-entities": "warn" } },
]
