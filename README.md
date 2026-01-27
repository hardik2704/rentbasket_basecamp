# RentBasket Internal Tool

Welcome to the RentBasket Internal Project Management Tool! This guide helps you run the application locally with persistent data.

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **MongoDB** (Must be installed and running locally)

## 🛠️ Installation

First, install dependencies for both the Client and Server.

### 1. Server Setup
```bash
cd server
npm install
```

### 2. Client Setup
```bash
cd ..
cd client
npm install
```

## 🚀 Running the App

To use the product locally, you need to run three components: the Database, the Backend Server, and the Frontend Client.

### Step 1: Start Database
Ensure your local MongoDB instance is running.
```bash
# MacOS with Homebrew
brew services start mongodb-community

# OR manual start
mongod --dbpath /opt/homebrew/var/log/mongodb/mongo.log
```

### Step 2: Start Backend Server
Open a terminal window:
```bash
cd server
npm run dev
```
*Server runs on: `http://localhost:5001`*

### Step 3: Start Frontend Client
Open a **new** terminal window:
```bash
cd client
npm run dev
```
*Client runs on: `http://localhost:5173`*

Access the app at **[http://localhost:5173](http://localhost:5173)**.

## 💾 Data Persistence & Seeding

Your data (Projects, Tasks, Messages) is stored in your local MongoDB database. 

- **Persistence**: Restarting the server or client **does NOT** delete your data. It persists indefinitely until you manually delete the database.
- **Seeding (Optional)**: If you are setting up for the first time or need to restore default users, you can run the seed script.
  ```bash
  cd server
  npm run seed
  ```
  > **Note**: This script is **SAFE** to run. It checks if the default Admin and Editor users exist and creates them only if they are missing. It **WILL NOT** delete your existing projects or tasks.

## 👤 Default Accounts

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@rentbasket.com` | `admin123` |
| **Editor** | `editor@rentbasket.com` | `editor123` |

## ❓ Troubleshooting

- **Port in use**: Ensure ports `5001` (Server) and `5173` (Client) are free.
- **Connection Error**: Check if MongoDB is running (`brew services list`).

## 🚢 Production Mode (Optional)

If you want to run the app like a real production environment (Client served by Backend):

1. **Build the Client**:
   ```bash
   cd client
   npm run build
   ```
2. **Start Server in Production Mode**:
   ```bash
   cd ../server
   export NODE_ENV=production
   npm start
   ```
   *The app will be available at `http://localhost:5001`*
