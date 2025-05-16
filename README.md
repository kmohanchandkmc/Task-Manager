#  Task Manager Application

## Overview

The **Task Manager App** is a full-stack web application designed to help users manage their tasks efficiently. Built using the MERN (MongoDB, Express.js, React.js, Node.js) stack, it offers a seamless experience for task creation, tracking, and management.

## Features

1. **Task Assignment and Prioritization**  
   Assign tasks to team members with clear deadlines and priority levels.

2. **Deadline Tracking and Notifications**  
   Set task deadlines and receive automated reminders to stay on schedule.

3. **Progress Reporting**  
   Generate reports on task completion and team performance with analytics for better decision-making.

4. **Role-Based Permissions**  
   Control access levels by assigning roles like Admin, Editor, or Viewer to team members.

5. **Real-Time Collaboration**  
   Add comments, share files, and discuss tasks within the platform for seamless teamwork.

6. **Secure Authentication and Authorization**  
   Ensure only verified users can access the platform using secure login (authentication).

---

## 🛠️ Tech Stack & Versions

- **Backend**: Node.js, Express.js  
- **Frontend**: React.js  
- **Database**: MongoDB Atlas  
- **Node Version**: `v23.10.0`  
- **NPM Version**: `v11.2.0`

---

## 📥  Installation & Setup

### 🔧 Backend Setup (Express.js)

1. Navigate to the `backend` directory:

    ```bash
    cd backend
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. First, create the environment variables file `.env` in the server folder. The `.env` file contains the following environment variables:

   - MONGODB_URI = `Replace `<password>` with your actual database user password`
        ```
        Update `.env` file: MONGO_URL=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority
        ```
   - JWT_SECRET = `any secret key - must be secured`
   - ADMIN_INVITE_TOKEN= `any secret number`
   - PORT = `8000`

4. Generate JWT Secret:

    ```bash
    node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
    ```

5. Add the generated secret to `.env`:

    ```
    JWT_SECRET=your_generated_jwt_secret
    ```

6. Start backend server:

    ```bash
    npm run dev
    ```

---

### 💻 Frontend Setup (React.js)

1. Navigate to the frontend directory:

    ```bash
    cd frontend/Task-Manager
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Start React development server:

    ```bash
    npm run dev
    ```

ctrl+(mouseclick).
it will take you to web browser
---

## 🎉 Please use our service!

through login you will get to use of yours assined task to or
if you assined create your own team and assined task to them then

---
###Admin Portal
Use the following credentials to log in as an Admin:

- **Username**: mohanchand@zidio
- **Password**: Admin@123
  ---
  ### If you need to contract me kmohanchandkmc988@gmail.com
