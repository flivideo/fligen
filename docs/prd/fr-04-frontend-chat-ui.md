# FR-4: Frontend Chat UI

**Status:** Complete
**Added:** 2025-12-26

---

## User Story

As a developer using FliGen, I want a chat interface in the browser to interact with the Claude agent backend so that I can send messages and see streaming responses, tool executions, and completion status in real-time.

## Problem

FR-3 implemented the Claude Agent SDK on the server with Socket.io events for streaming responses. However, there is currently no frontend UI to interact with this backend. Users cannot:

- Send messages to the agent
- See streaming text responses
- Observe when tools are being executed
- View completion status, usage, and cost

A reusable chat component is needed that will serve as the foundation for Days 4-12 tools.

## Solution

Create a React chat component that:
- Connects to the existing Socket.io events (`agent:query`, `agent:text`, `agent:tool`, `agent:complete`, `agent:error`)
- Displays messages in a scrollable container
- Shows tool execution notifications inline
- Provides input field with send functionality
- Matches the existing FliGen design system (dark theme, slate colors)

---

## UI Concept Options

### Option A: Minimal (Recommended for Day 2-3)

Simple, functional chat with tool notifications inline.

```
+-----------------------------------------------------+
|  FliGen Chat                                        |
+-----------------------------------------------------+
|                                                     |
|  Claude: Hello! How can I help you today?           |
|                                                     |
|  You: Generate a product catalog                    |
|                                                     |
|  Claude: I'll create that for you...                |
|  [Tool: write_json - products.json]                 |
|  Done! Created 3 products.                          |
|                                                     |
+-----------------------------------------------------+
|  [Type a message...                    ] [Send]     |
+-----------------------------------------------------+
```

**Pros:**
- Fast to implement (~2 hours)
- Minimal complexity
- Easy to debug
- Tool visibility built-in
- Matches existing TailwindCSS v4 patterns

**Cons:**
- No typing indicators
- Basic message styling
- Manual streaming accumulation

**Best for:** Days 2-3, rapid prototyping

---

### Option B: Panel-based with Activity Sidebar

Chat with a side panel showing tool activity and cost tracking.

```
+-------------------------------------+---------------+
|  FliGen Chat                        |  Activity     |
+-------------------------------------+---------------+
|                                     | [check] read_json   |
|  Messages here...                   | [gear] write_file  |
|                                     |               |
|                                     | Cost: $0.02   |
+-------------------------------------+---------------+
|  [Type a message...                    ] [Send]     |
+-----------------------------------------------------+
```

**Pros:**
- Clear separation of chat and activity
- Real-time cost visibility
- Tool history at a glance
- Better for complex multi-tool workflows

**Cons:**
- More screen real estate required
- Additional component complexity
- May not work well on narrow layouts

**Best for:** Days 8+, when orchestrating multiple tools

---

### Option C: Full Chat with Bubbles

Polished chat experience with message bubbles and progress indicators.

```
+-----------------------------------------------------+
|  FliGen Chat                              [gear] [moon]  |
+-----------------------------------------------------+
|        +----------------------------------+         |
|        | Hello! How can I help?       bot |         |
|        +----------------------------------+         |
|  +----------------------------------+               |
|  | user Generate a product catalog    |               |
|  +----------------------------------+               |
|        +----------------------------------+         |
|        | Creating products... ===--  bot |         |
|        +----------------------------------+         |
+-----------------------------------------------------+
|  [Type a message...                    ] [Send]     |
+-----------------------------------------------------+
```

**Pros:**
- Production-quality UX
- Clear visual distinction user/assistant
- Progress indicators for streaming
- Settings/theme toggle accessibility

**Cons:**
- Most complex to implement
- Bubble styling with TailwindCSS v4 requires care
- May need additional state management

**Best for:** Final polish, demo/production

---

## Recommendation

**Start with Option A**, then enhance for later days.

| Day | UI Version | Focus |
|-----|------------|-------|
| 2-3 | Option A | Prove SDK works, basic chat |
| 4-7 | Option A + tool panel | Add tool-specific displays |
| 8+ | Option B or C | Polish for demos |

The backend event loop is approximately 150 lines. The frontend should match this simplicity initially.

---

## Acceptance Criteria (Option A)

### Chat Component

- [ ] `ChatPanel` component in `client/src/components/tools/`
- [ ] Scrollable message container with auto-scroll on new messages
- [ ] Input field with Enter-to-send and Send button
- [ ] Disable input while agent is processing
- [ ] Clear visual for user vs assistant messages

### Message Display

- [ ] User messages right-aligned or prefixed with "You:"
- [ ] Assistant messages left-aligned or prefixed with "Claude:"
- [ ] Support for streaming text (accumulate chunks into single message)
- [ ] Tool execution shown inline: `[Tool: {name}]` or similar
- [ ] Tool result shown: `[Tool complete: {name}]` with success/error indicator

### Socket.io Integration

- [ ] Listen for `agent:text` - append/update current assistant message
- [ ] Listen for `agent:tool` - show tool execution notification
- [ ] Listen for `agent:tool_result` - show tool completion
- [ ] Listen for `agent:complete` - mark message complete, re-enable input
- [ ] Listen for `agent:error` - display error message with styling
- [ ] Emit `agent:query` on send with message content

### State Management

- [ ] Messages array with role, content, and optional tool info
- [ ] Current streaming message state (accumulating text)
- [ ] Loading/processing state to disable input
- [ ] Error state for display

### Styling (TailwindCSS v4)

- [ ] Dark theme matching existing FliGen palette
- [ ] `bg-slate-800` for message container
- [ ] `bg-slate-700` for user messages
- [ ] `bg-slate-900` for assistant messages
- [ ] `text-amber-400` for tool notifications
- [ ] `text-red-400` for errors
- [ ] Scrollbar styling consistent with sidebar

---

## Technical Notes

### Socket Events Reference

From `shared/src/index.ts`:

```typescript
// Server -> Client
'agent:text': (data: { text: string }) => void;
'agent:tool': (data: { name: string; input: unknown }) => void;
'agent:tool_result': (data: { name: string; success: boolean }) => void;
'agent:complete': (data: {
  sessionId: string;
  usage: { input: number; output: number };
  cost: number;
  duration: number;
}) => void;
'agent:error': (data: { message: string; code?: string }) => void;

// Client -> Server
'agent:query': (data: { message: string }) => void;
'agent:cancel': () => void;
```

### Message Type Structure

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  tool?: {
    name: string;
    status: 'executing' | 'complete' | 'error';
  };
}
```

### Component Integration

The chat component is used in Day 2 (Primary Brain / Agent SDK) tool panel:

```tsx
// client/src/components/tools/Day2AgentSDK.tsx
import { ChatPanel } from './ChatPanel';

export function Day2AgentSDK() {
  return (
    <div className="h-full">
      <ChatPanel />
    </div>
  );
}
```

### Streaming Text Accumulation

```tsx
const [currentMessage, setCurrentMessage] = useState<string>('');
const [messages, setMessages] = useState<ChatMessage[]>([]);

socket.on('agent:text', ({ text }) => {
  setCurrentMessage(prev => prev + text);
});

socket.on('agent:complete', (data) => {
  // Finalize current message
  setMessages(prev => [...prev, {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: currentMessage,
    timestamp: new Date(),
  }]);
  setCurrentMessage('');
  setIsProcessing(false);
});
```

### Tool Visibility

Tool visibility is important for transparency. Users should see:
1. When Claude decides to use a tool
2. Which tool is being executed
3. Whether the tool succeeded or failed

This helps users understand what the agent is doing and builds trust.

---

## File Structure

```
client/src/components/
├── tools/
│   ├── ChatPanel.tsx         # Main chat component (new)
│   ├── Day2Kybernesis.tsx    # Uses ChatPanel (new or update)
│   └── ...
└── ui/
    └── MessageBubble.tsx     # Optional: for Option C later
```

---

## Dependencies

- FR-3: Claude Agent SDK Integration (Complete) - provides backend events
- Existing Socket.io connection from FR-1

---

## Out of Scope (Future)

- Message persistence across page reloads
- Multiple conversation threads
- File attachment support
- Code syntax highlighting in messages
- Message editing/deletion
- Typing indicators
- Read receipts

---

## Related Documents

- [FR-3: Claude Agent SDK Integration](fr-03-claude-agent-sdk-integration.md)
- [Planning: Claude Agent SDK Integration](../planning/claude-agent-sdk-integration.md)
- [Backlog](../backlog.md)

---

## Completion Notes

**What was done:**
- Created `useSocket` hook for singleton socket connection management
- Created `ChatPanel` component implementing Option A (Minimal) design
- Handles streaming text via `agent:text` events with real-time accumulation
- Displays tool execution with `[⚙] Executing:` and `[✓] Completed:` indicators
- Shows completion stats (tokens, cost, time) after each response
- Error handling with styled error display
- Created `Day2AgentSDK` component wrapping ChatPanel
- Updated App.tsx to render chat UI on Day 2, starts on Day 2 by default

**Files changed:**
- `client/src/hooks/useSocket.ts` (new) - singleton socket hook
- `client/src/components/tools/ChatPanel.tsx` (new) - main chat component
- `client/src/components/tools/Day2AgentSDK.tsx` (new) - Day 2 wrapper
- `client/src/App.tsx` (modified) - uses useSocket, renders Day2 component

**Testing notes:**
- Run `npm run dev` to start both server and client
- Ensure `claude login` has been run for authentication
- Navigate to Day 2 in sidebar
- Type a message and press Enter or click Send
- Observe streaming response and tool notifications

**Status:** Complete

---

**Last updated:** 2025-12-26
