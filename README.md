# Woolf Monorepo

A Turborepo monorepo with Node.js API backend and Next.js frontend.

## What's inside?

This monorepo includes the following:

### Apps

- `api`: Express.js API backend
- `web`: Next.js frontend application

### Packages

- `@repo/typescript-config`: Shared TypeScript configuration

### Tools

- [Turborepo](https://turborepo.dev): Build orchestration and caching
- [Biome](https://biomejs.dev): Fast linter and formatter
- [TypeScript](https://www.typescriptlang.org): Type safety
- [pnpm](https://pnpm.io): Fast, disk space efficient package manager

## Getting Started

### Prerequisites

- Node.js 20+ and pnpm

### Installation

```bash
pnpm install
```

### Development

Run all apps in development mode:

```bash
pnpm dev
```

### Build

Build all apps:

```bash
pnpm build
```

### Lint

Lint and format all packages:

```bash
pnpm lint
pnpm check
```

## Useful Commands

- `pnpm dev` - Start all apps in development mode
- `pnpm build` - Build all apps
- `pnpm start` - Start all apps in production mode
- `pnpm lint` - Lint all packages
- `pnpm type-check` - Type check all packages
- `pnpm format` - Format all files with Biome
- `pnpm check` - Check and fix with Biome
- `pnpm clean` - Clean all build artifacts

### Turborepo Filtering

Run commands for specific packages:

```bash
pnpm dev --filter=web       # Run only web app
pnpm build --filter=api     # Build only api app
pnpm lint --filter=...web   # Lint web and its dependencies
```

## Learn More

- [Turborepo Documentation](https://turborepo.dev/docs)
- [Biome Documentation](https://biomejs.dev)
