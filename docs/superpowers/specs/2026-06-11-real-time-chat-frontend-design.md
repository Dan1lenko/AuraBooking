# Real-time Chat (Frontend) Design Spec

This specification defines the layouts, components, WebSocket integration, and visual aesthetics (Soft UI styling) for the frontend Real-time Chat feature in Next.js 14.

---

## 1. UX & Visual Architecture

Following our Soft UI design tokens, the chat interface will utilize a clean, slate-based palette with subtle accents, shadows, and transitions.

### Color Tokens:
- **Sidebar & Layout Background**: `bg-slate-50`
- **Card/Window Background**: `bg-white`
- **Active Chat Selection**: `bg-blue-50/40 border-l-4 border-l-blue-600`
- **Sender Bubbles**: `bg-blue-600 text-white`
- **Recipient Bubbles**: `bg-slate-100 text-slate-800`
- **Indicators**:
  - `Online`: Emerald green dot (`bg-emerald-500`)
  - `Offline`: Muted gray dot (`bg-slate-300`)
  - `Unread Count`: `bg-blue-600 text-white font-bold`

---

## 2. Page & Layout Structure (App Router)

We will implement a responsive, split-screen master-detail layout under `/dashboard/chat`:

```
/dashboard/chat/
├── layout.tsx         # Shared layout housing the Chat List sidebar (visible on desktop)
├── page.tsx           # Desktop placeholder ("Select a conversation to start chatting")
└── [id]/
    └── page.tsx       # Interactive chat window (scrollbar-none, auto-scroll)
```

### Layout Behavior:
- **Desktop (>= 1024px)**: Sidebar (left) and Chat Window (right) are displayed side-by-side in a single viewport.
- **Mobile (< 1024px)**:
  - Navigating to `/dashboard/chat` shows only the sidebar chat list.
  - Navigating to `/dashboard/chat/[id]` shows only the chat window (full screen) with a top navigation bar containing a back-arrow button to return to the list.

---

## 3. UI Components

### A. Chat List Sidebar (`/dashboard/chat/layout.tsx`)
- **Search Header**: A refined search input to filter conversations by participant name.
- **Conversation List**:
  - Renders a scrollable list of chat items.
  - Each item displays:
    - User avatar (or fallback initials).
    - Participant Name (Client name or Specialist name).
    - Category label (if participant is a Specialist).
    - Muted, truncated preview of the latest message.
    - Timestamp of the latest message (formatted: e.g., `12:45 PM` if today, `Yesterday`, or `Oct 12` if older).
    - Unread count badge (if unread count > 0).
    - Online/Offline status dot directly overlaying the avatar corner.

### B. Chat Window (`/dashboard/chat/[id]/page.tsx`)
- **Header**:
  - Participant name and avatar.
  - Subtext showing online status ("Active now" / "Offline").
  - Back button (mobile only) to return to `/dashboard/chat`.
- **Message Area**:
  - Scrollable container with an auto-scroll anchor at the bottom.
  - Automatically scrolls down when a new message is received or sent.
  - Displays loading skeletons (flickering gray blocks) while message history is fetched.
  - **Message Bubbles**:
    - Aligned to the right for user messages, left for participant messages.
    - Includes double checkmark icons `✓✓` for user's sent messages:
      - **Blue checkmarks**: `isRead === true`.
      - **Muted gray checkmarks**: `isRead === false`.
- **Input Area**:
  - A clean input text field styled with rounded corners and soft border shadows.
  - Supports sending messages on `Enter` keypress (preventing new lines unless `Shift+Enter` is pressed).
  - Send button with a clean navigation arrow icon.

---

## 4. Socket.io Client & State Integration

### Connection Flow:
1. Fetch the raw JWT authorization token from the `/api/auth/token` proxy route.
2. Initialize Socket.io-client connection (connecting to NestJS root server):
   ```typescript
   const socket = io('http://localhost:3000', {
     query: { token },
     transports: ['websocket'],
   });
   ```
3. Join the specific chat room by emitting `join_chat` with `{ chatId }`.
4. Listen for incoming WebSocket events:
   - `new_message`: Appends the new message to history. If the chat window is active, it marks it as read.
   - `user_online`: Updates the participant's status to "Active now".
   - `user_offline`: Updates the participant's status to "Offline".
5. On component unmount, emit `leave_chat` and close/disconnect the socket.
