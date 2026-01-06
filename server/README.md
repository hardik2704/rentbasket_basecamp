# RentBasket PM Tool - Backend API

Express.js + MongoDB backend for the RentBasket internal project management tool.

## 📁 Directory Structure

```
server/
├── config/
│   └── db.js              # MongoDB connection
├── middleware/
│   ├── auth.js            # JWT authentication
│   └── index.js           # Exports
├── models/
│   ├── User.js            # User schema (roles, login streak)
│   ├── Project.js         # Project schema (members, category)
│   ├── Task.js            # Task schema (status, assignment)
│   ├── Message.js         # Chat message schema (mentions)
│   ├── File.js            # File upload schema
│   ├── Notification.js    # Notification schema
│   └── index.js           # Exports
├── routes/
│   ├── auth.js            # Login, register, profile
│   ├── users.js           # User management (admin)
│   ├── projects.js        # Project CRUD + members
│   ├── tasks.js           # Task CRUD + assignment
│   ├── messages.js        # Chat messages
│   ├── files.js           # File upload/download
│   └── notifications.js   # Notification management
├── scripts/
│   └── seed.js            # Demo data seeder
├── socket/
│   └── index.js           # Socket.io handlers
├── uploads/               # File uploads directory
├── .env                   # Environment variables
├── .env.example           # Environment template
├── index.js               # Main server entry
└── package.json
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Start MongoDB
```bash
# Using Homebrew (macOS)
brew services start mongodb-community

# Or run directly
mongod --dbpath /path/to/data
```

### 3. Seed Demo Data
```bash
npm run seed
```

### 4. Start Development Server
```bash
npm run dev
# Server runs on http://localhost:5000
```

## 🔑 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/update-profile` | Update profile |
| PUT | `/api/auth/change-password` | Change password |

### Users (Admin Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| GET | `/api/users/:id` | Get user |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Deactivate user |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List projects |
| GET | `/api/projects/:id` | Get project |
| POST | `/api/projects` | Create project (Admin) |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project (Admin) |
| POST | `/api/projects/:id/members` | Add member |
| DELETE | `/api/projects/:id/members/:userId` | Remove member |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks (with filters) |
| GET | `/api/tasks/my-tasks` | Get assigned tasks |
| GET | `/api/tasks/project/:projectId` | Tasks by project |
| GET | `/api/tasks/:id` | Get task |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages/project/:projectId` | Get messages |
| POST | `/api/messages` | Send message |
| PUT | `/api/messages/:id` | Edit message |
| DELETE | `/api/messages/:id` | Delete message |

### Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/files/project/:projectId` | List files |
| GET | `/api/files/:id` | Get file info |
| POST | `/api/files/upload` | Upload file |
| PUT | `/api/files/:id` | Update file info |
| DELETE | `/api/files/:id` | Delete file |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get notifications |
| GET | `/api/notifications/unread-count` | Get unread count |
| PUT | `/api/notifications/:id/read` | Mark as read |
| PUT | `/api/notifications/mark-all-read` | Mark all read |
| DELETE | `/api/notifications/:id` | Delete notification |
| DELETE | `/api/notifications` | Clear all |

## 🔌 Socket.io Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `join_project` | `projectId` | Join project room |
| `leave_project` | `projectId` | Leave project room |
| `typing_start` | `projectId` | Start typing indicator |
| `typing_stop` | `projectId` | Stop typing indicator |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `new_message` | `message` | New chat message |
| `message_updated` | `message` | Message edited |
| `message_deleted` | `{ id }` | Message deleted |
| `user_typing` | `{ userId, name, projectId }` | User is typing |
| `user_stopped_typing` | `{ userId, projectId }` | User stopped |
| `user_online` | `{ userId, name }` | User came online |
| `user_offline` | `{ userId, name }` | User went offline |
| `notification` | `notification` | New notification |
| `task_completed` | `{ task, completedBy }` | Task completed |

## 🔐 Authentication

All protected routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## 📝 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rentbasket.com | admin123 |
| Editor | editor@rentbasket.com | editor123 |

## 🛠 Environment Variables

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/rentbasket
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```
