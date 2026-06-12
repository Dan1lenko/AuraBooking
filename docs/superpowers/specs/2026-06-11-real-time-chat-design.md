# Real-time Chat (Backend) Design Spec

This specification defines the database tables, NestJS ChatModule structure, Socket.io WebSocket Gateway, events, Redis online status tracking, and booking automation required for the backend of the Real-time Chat feature.

---

## 1. Database Model (Prisma)

We will introduce `Chat` and `Message` models. A Chat will represent a continuous connection between a `Client` (User) and a `Specialist` (SpecialistProfile).

### Schema Changes:
```prisma
model User {
  id                Int                @id @default(autoincrement())
  email             String             @unique
  name              String?
  password          String
  role              Role               @default(CLIENT)
  resetToken        String?
  resetTokenExpires DateTime?
  refreshTokens     RefreshToken[]
  specialistProfile SpecialistProfile?
  clientBookings    Booking[]          @relation("ClientBookings")
  payments          Payment[]
  chats             Chat[]             @relation("ClientChats")
  messages          Message[]
}

model SpecialistProfile {
  id           Int            @id @default(autoincrement())
  bio          String         @db.Text
  category     String
  price        Float
  experience   Int
  avatarUrl    String?
  rating       Float          @default(0.0)
  reviewsCount Int            @default(0)
  userId       Int            @unique
  user         User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  workingHours WorkingHours[]
  bookings     Booking[]
  chats        Chat[]
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
}

model Chat {
  id                  Int               @id @default(autoincrement())
  clientId            Int
  client              User              @relation("ClientChats", fields: [clientId], references: [id], onDelete: Cascade)
  specialistProfileId Int
  specialistProfile   SpecialistProfile @relation(fields: [specialistProfileId], references: [id], onDelete: Cascade)
  messages            Message[]
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  @@unique([clientId, specialistProfileId])
}

model Message {
  id        Int      @id @default(autoincrement())
  chatId    Int
  chat      Chat     @relation(fields: [chatId], references: [id], onDelete: Cascade)
  senderId  Int
  sender    User     @relation(fields: [senderId], references: [id], onDelete: Cascade)
  text      String   @db.Text
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

---

## 2. NestJS Module Structure

We will create a `ChatModule` under `backend/src/chat/`.

- **ChatModule**: Regroups and registers `ChatGateway`, `ChatService`, and `PrismaService`, and imports `AuthModule` (to access JWT parsing).
- **ChatService**: Handles business logic: creating chats, fetching chat lists, querying message history.
- **ChatGateway**: Socket.io gateway handling connections, event listeners, and emitting events.

---

## 3. WebSocket Gateway & Socket.io Events

We will build the Socket.io WebSocket Gateway in `ChatGateway`.

### Authentication
On connection, we will intercept the handshake to extract the client's JWT token (either from query parameters `token` or authorization headers) and verify it using the `JwtService`. If invalid or missing, we reject the connection.

### Core Events
- **`connection`**:
  - Decode token, extract `userId`.
  - Save `userId` -> `socket.id` mapping in Redis.
  - Query all chats involving the user, and notify participants that the user is online.
  - Join the socket to an individual user room `user_${userId}` to support direct messaging.
- **`disconnect`**:
  - Remove `userId` -> `socket.id` mapping from Redis.
  - Query all chats involving the user, and notify participants that the user is offline.
- **`join_chat`** (Payload: `{ chatId: number }`):
  - Verify that the authenticated user is a participant of the chat.
  - Call `socket.join("chat_" + chatId)` so they receive real-time messages in this room.
- **`leave_chat`** (Payload: `{ chatId: number }`):
  - Call `socket.leave("chat_" + chatId)`.
- **`send_message`** (Payload: `{ chatId: number, text: string }`):
  - Verify participant access.
  - Create the message in the database via `ChatService`.
  - Emit `new_message` (containing the complete `Message` object with sender details) to the Socket.io room `"chat_" + chatId`.
  - Mark messages as read if the recipient is currently in the socket room.

---

## 4. Redis Online Status Tracking

We will use a Redis client instance (`ioredis` or custom client) to store online status mappings.

### Structure:
- Storing active socket ID mapping: `user:socket:${userId}` as a string or a set (to support multiple tabs).
- On connect: Add the socket ID to `user:sockets:${userId}`. If this is the user's first connection (length was 0), emit `user_online` event `{ userId }` to other participants of active chats.
- On disconnect: Remove the socket ID from `user:sockets:${userId}`. If no socket IDs remain (length is 0), delete the key and emit `user_offline` event `{ userId }`.

---

## 5. Automation & API Routes

### Chat Creation Auto-Trigger
- Integrate with `BookingsService.create()`: When a booking is created successfully, we trigger `ChatService.findOrCreateChat(clientId, specialistProfileId)` to ensure a chat is ready.

### HTTP REST Endpoints
1. **`GET /chats`**:
   - Access: Authenticated (Client or Specialist)
   - Response: List of chats for current user. Each chat includes participant information, the latest message, and unread message count.
2. **`GET /chats/:chatId/messages`**:
   - Access: Authenticated (Chat Participant)
   - Response: Message history for that chat, ordered by `createdAt` ascending.
