# FR-1: Initial FliGen Harness Setup

**Status:** Complete
**Added:** 2025-12-25

---

## User Story

As a developer building the 12 Days of Claudemas tools, I want a foundational harness so that I can add new capabilities each day with a consistent tech stack and development environment.

## Problem

Starting the "12 Days of Claudemas" series requires a solid foundation. Without a proper harness:
- Each day would require setup overhead
- Tech stack inconsistencies would emerge
- Learnings from sibling projects (FliDeck, FliHub) wouldn't transfer
- Development velocity would be slower

We need a Day 1 scaffolding project that provides the infrastructure for rapid daily iterations.

## Solution

Create FliGen - a foundational harness with:
- Modern React 19 + Vite 6 frontend
- Express 5 + Socket.io backend for real-time capabilities
- Shared TypeScript types via npm workspaces
- TailwindCSS v4 for styling
- Single command development workflow

This harness will serve as the base for all 12 daily tool builds, ensuring consistency and speed.

## Acceptance Criteria

### Project Structure
- [ ] npm workspaces configured with `client/`, `server/`, and `shared/` packages
- [ ] Root `package.json` with workspace definitions
- [ ] Individual `package.json` files for each workspace
- [ ] `.gitignore` configured for node_modules, build artifacts, and env files

### Client Package (React + Vite)
- [ ] React 19.x installed and configured
- [ ] Vite 6.0 as build tool
- [ ] TailwindCSS v4 configured with correct syntax (`@import "tailwindcss";`)
- [ ] TypeScript 5.6+ with strict mode
- [ ] Basic "FliGen - Day 1" landing page displaying
- [ ] Vite config with proper port and proxy settings
- [ ] Environment variable support (.env.local)

### Server Package (Express + Socket.io)
- [ ] Express 5.x configured
- [ ] Socket.io installed and basic connection working
- [ ] TypeScript configuration
- [ ] Health check endpoint (`GET /health`)
- [ ] CORS configured for local development
- [ ] Environment variable support (.env)

### Shared Package
- [ ] TypeScript types exported from shared package
- [ ] At least one example shared type (e.g., HealthResponse)
- [ ] Both client and server import from shared package successfully

### Development Experience
- [ ] `npm install` from root installs all workspace dependencies
- [ ] `npm run dev` from root starts both client and server concurrently
- [ ] Client accessible in browser (port TBD, document in README)
- [ ] Server responding to health check
- [ ] Hot reload working for both client and server
- [ ] Clear console output showing which services are running on which ports

### Documentation
- [ ] Root `README.md` with setup instructions
- [ ] Port numbers clearly documented
- [ ] Known issues section (Tailwind v4 syntax, etc.)
- [ ] Development commands listed

## Technical Notes

### Reference Projects
- **FliDeck** and **FliHub** - sibling projects with proven patterns
- Use similar workspace structure and configuration

### Critical: Tailwind v4 Syntax Change
The new TailwindCSS v4 uses a different import syntax. In your CSS file:

**CORRECT:**
```css
@import "tailwindcss";

@source "../index.html";
@source "./**/*.{js,ts,jsx,tsx}";
```

**INCORRECT (old v3 syntax):**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Important:** The `@source` directives are required in v4 to tell Tailwind where to scan for utility classes. Without these, the utilities layer is empty and no styles render. This replaces the `content` array from v3's `tailwind.config.js`.

This issue was discovered in the 007-bmad-claude-sdk project and must be avoided.

### Port Allocation
FliGen uses the 54xx range:
- Client: 5400
- Server: 5401

Related projects: FliDeck (5200/5201), FliHub (5101).

### Radix UI Note (for future)
If using Radix UI components later, remember: style prop order matters for z-index:
```tsx
style={{ ...props.style, zIndex: 99999 }}
```

### Dependencies to Consider
- **Client**: react, react-dom, tailwindcss, vite, typescript
- **Server**: express, socket.io, cors, dotenv, typescript, tsx (for dev)
- **Shared**: typescript
- **Dev Tools**: concurrently (for running both services), nodemon (optional)

### File Structure Example
```
fligen/
├── package.json (workspace root)
├── client/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       └── index.css
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts
├── shared/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── types.ts
└── docs/
    └── [documentation files]
```

## Success Metrics

- Developer can run `npm install && npm run dev` and see working app
- Landing page displays "FliGen - Day 1" message
- Health endpoint returns 200 OK
- No console errors in browser or terminal
- Ready to add Day 2 features

---

## Completion Notes

**What was done:**
- Created npm workspaces monorepo structure (client/, server/, shared/)
- Set up React 19 + Vite 6 + TailwindCSS v4 client on port 5400
- Set up Express 5 + Socket.io server on port 5401
- Created shared TypeScript types package with HealthResponse and Socket.io event types
- Configured concurrent dev script to start both services
- Landing page displays "FliGen - Day 1" with health status and socket connection
- Health endpoint returns JSON with status, timestamp, and uptime

### Tech Stack Versions

| Package      | Version | Notes                                |
|--------------|---------|--------------------------------------|
| React        | 19.0.0  | Latest with new features             |
| Vite         | 6.x     | Fast dev server, HMR                 |
| TailwindCSS  | 4.1.18  | New v4 architecture                  |
| Express      | 5.0.1   | Latest with async support            |
| Socket.io    | 4.8.1   | Real-time communication              |
| TypeScript   | 5.7.2   | Strict mode enabled                  |
| tsx          | 4.19.2  | Server dev runner (replaces ts-node) |
| concurrently | 9.1.0   | Run client+server together           |

### Files Created

- `package.json` - Root workspace config
- `.gitignore` - Standard Node.js ignores
- `README.md` - Setup instructions
- `CLAUDE.md` - Claude Code guidance
- `shared/` - TypeScript types package
- `server/` - Express + Socket.io server
- `client/` - React + Vite + Tailwind frontend

### API Architecture

**Endpoints:**
| Method | Path    | Description                 |
|--------|---------|-----------------------------|
| GET    | /health | Health check returning JSON |

**Vite Proxy Configuration:**
```ts
proxy: {
  '/api': {
    target: 'http://localhost:5401',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
  '/socket.io': {
    target: 'http://localhost:5401',
    ws: true,
  },
}
```

### Key Gotchas & Lessons Learned

1. **Tailwind v4 @source directive** - Without explicit @source paths in CSS, no utility classes are generated. The CSS compiles but utilities layer is empty:
   ```css
   @import 'tailwindcss';
   @source "../index.html";
   @source "./**/*.{js,ts,jsx,tsx}";
   ```

2. **Proxy rewrite for API** - If server doesn't use /api prefix, need rewrite function in Vite proxy config.

3. **Build order matters** - Shared package must build first since server and client import from it.

4. **Socket.io direct connection** - Client connects directly to server URL (not through proxy) for WebSocket connection.

5. **tsx vs ts-node** - Using tsx for server dev mode as it's faster and handles ESM better.

### Testing Notes

- Run `npm install && npm run dev`
- Open http://localhost:5400 to see landing page
- Verify "Server Health: ok" and "Socket.io: Connected" display
- Check http://localhost:5401/health returns JSON

### Ready for Day 2

The harness provides:
- Hot reload on both client and server
- Type-safe shared types
- Real-time Socket.io connection
- Health monitoring
- Clean component structure to extend

**Suggested next capabilities:**
- Add actual functionality (the "tool" part)
- Expand API endpoints
- Add more Socket.io events for real-time updates
- Introduce React Router if multiple pages needed
- Add TanStack Query for API state management (pattern from FliDeck/FliHub)

**Status:** Complete

---

**Related Documents:**
- [Backlog](../backlog.md)
- [Brainstorming Notes](../brainstorming-notes.md)
