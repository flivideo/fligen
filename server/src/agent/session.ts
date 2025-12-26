// Session management for agent queries
// Stores session IDs per socket for multi-turn conversations

const sessions = new Map<string, string>();
const abortControllers = new Map<string, AbortController>();

export function getSession(socketId: string): string | undefined {
  return sessions.get(socketId);
}

export function setSession(socketId: string, sessionId: string): void {
  sessions.set(socketId, sessionId);
}

export function clearSession(socketId: string): void {
  sessions.delete(socketId);
  cancelQuery(socketId);
}

export function getAbortController(socketId: string): AbortController {
  // Cancel any existing query
  cancelQuery(socketId);

  // Create new abort controller for this query
  const controller = new AbortController();
  abortControllers.set(socketId, controller);
  return controller;
}

export function cancelQuery(socketId: string): void {
  const controller = abortControllers.get(socketId);
  if (controller) {
    controller.abort();
    abortControllers.delete(socketId);
  }
}
