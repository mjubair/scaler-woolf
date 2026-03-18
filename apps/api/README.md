# API Backend

Express.js API backend for Woolf monorepo.

## Development

```bash
pnpm dev
```

Server will start on http://localhost:3001

## Build

```bash
pnpm build
```

## Production

```bash
pnpm start
```

## Available Endpoints

- `GET /` - API information
- `GET /health` - Health check endpoint
- `GET /api/hello` - Sample API endpoint

## Environment Variables

- `PORT` - Server port (default: 3001)
