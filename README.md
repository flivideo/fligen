# FliGen

Foundational harness for the **12 Days of Claudemas** tool building series.

## Quick Start

```bash
npm install
npm run dev
```

- Client: http://localhost:5400
- Server: http://localhost:5401
- Health: http://localhost:5401/health

## Tech Stack

- **Client:** React 19, Vite 6, TailwindCSS v4
- **Server:** Express 5, Socket.io
- **Shared:** TypeScript types
- **Build:** npm workspaces

## Project Structure

```
fligen/
├── client/          # React frontend (port 5400)
├── server/          # Express backend (port 5401)
├── shared/          # Shared TypeScript types
└── docs/            # Documentation
```

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install all dependencies |
| `npm run dev` | Start client + server |
| `npm run build` | Build all packages |

## Documentation

See `docs/` for requirements, backlog, and planning documents.

---

Part of the [FliVideo](https://github.com/appydave/flivideo) family.
