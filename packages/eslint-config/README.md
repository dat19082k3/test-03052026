# @repo/eslint-config

Standardized ESLint configurations used throughout the monorepo to ensure code consistency and prevent common errors.

## 📦 Available Configurations

This package provides several reusable ESLint configurations tailored for different parts of the stack:

| Configuration | Usage | Includes |
| :--- | :--- | :--- |
| `base` | General Node.js / TypeScript logic | `turbo`, `prettier`, standard TS rules |
| `next` | Next.js applications | `next/core-web-vitals`, `base` rules |
| `react-internal` | Internal React packages/components | `react`, `react-hooks`, `base` rules |

## 🚀 How to use

To use these configurations in a new application or package within the monorepo:

1.  **Add to `package.json`**:
    Ensure the package is listed in your `devDependencies`:
    ```json
    {
      "devDependencies": {
        "@repo/eslint-config": "*"
      }
    }
    ```

2.  **Create `.eslintrc.js`**:
    Extend the appropriate configuration in your project root:

    **For a Next.js app:**
    ```javascript
    module.exports = {
      extends: ["@repo/eslint-config/next"],
    };
    ```

    **For a shared TypeScript package:**
    ```javascript
    module.exports = {
      extends: ["@repo/eslint-config/base"],
    };
    ```

## 🛠 Features
- **Turbo Integration**: Optimized for use with Turborepo's caching.
- **Strict Typing**: Enforces best practices for TypeScript.
- **Prettier Integration**: Automatically handles formatting conflicts.
- **Import Sorting**: Optional but recommended rules for clean imports.
