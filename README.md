ChatFlow — Real-Time Chat Application ChatFlow is a full-stack messaging application built with React on the frontend and Node.js, Express, PostgreSQL, and Socket.IO on the backend. It combines REST APIs for persistent operations with WebSocket events for live chat and presence updates. Features

User authentication — register, log in, log out, and refresh access tokens using JWT.
Private conversations — create and access one-to-one chats.
Group conversations — create groups, add or remove members, and leave groups.
Real-time messaging — exchange messages through Socket.IO.
Message management — retrieve paginated messages, edit or delete messages, and mark messages or conversations as read.
Read status and reactions — track message reads and add or remove emoji reactions.
Typing indicators and presence — Socket.IO handlers support typing activity and online/presence updates.
Notifications — retrieve notifications, check unread counts, mark notifications as read, and delete them.
File uploads — upload one or multiple files, retrieve file information, and delete uploaded files.
Profile and settings screens — frontend pages for profile and account settings.
Security and validation — password hashing, JWT authentication, request validation, Helmet security headers, CORS configuration, and API rate limiting.
Redis integration — Redis utilities for caching/pub-sub and a Socket.IO Redis adapter for deployments that need cross-instance event delivery.
API documentation support — Swagger/OpenAPI configuration is included in the backend.
Responsive React UI — React Router, reusable components, context providers, and toast notifications. Technology Stack Area Technologies Frontend React 18, Vite, React Router Styling CSS, Tailwind CSS API communication Axios, REST Real-time communication Socket.IO and socket.io-client Backend Node.js, Express Database PostgreSQL (pg) Caching / scaling Redis, Socket.IO Redis adapter Authentication JSON Web Tokens (JWT), bcrypt/bcryptjs Uploads Multer Security Helmet, CORS, express-rate-limit, express-validator API docs Swagger UI / OpenAPI via swagger-jsdoc Utilities date-fns, emoji-picker-react, react-dropzone, react-hot-toast
Project Structure chatflow/ ├── backend/ │ ├── config/ # PostgreSQL, Redis, and environment configuration │ ├── controllers/ # Request controllers │ ├── docs/ # Swagger/OpenAPI setup │ ├── events/ # Application event helpers │ ├── middleware/ # Authentication, validation, uploads, and errors │ ├── migrations/ # SQL schema migrations │ ├── routes/ # REST API route definitions │ ├── services/ # Authentication, chat, messages, users, notifications │ ├── sockets/ # Socket.IO authentication and real-time event handlers │ ├── uploads/ # Uploaded files (runtime data) │ ├── utils/ # JWT, password, logging, and response helpers │ ├── validators/ # Request validation rules │ ├── .env.example # Backend environment template │ ├── app.js # Express application and API routes │ ├── server.js # HTTP and Socket.IO server startup │ └── package.json ├── frontend/ │ ├── public/ │ ├── src/ │ │ ├── components/ # Chat, conversation, notification, and common UI │ │ ├── context/ # Authentication and chat state │ │ ├── hooks/ # Reusable auth, socket, message, and presence hooks │ │ ├── layouts/ # Authentication and chat layouts │ │ ├── pages/ # Login, registration, chat, profile, settings │ │ ├── services/ # API service modules │ │ └── socket/ # Socket.IO client manager │ ├── .env.example # Frontend environment template │ └── package.json └── README.md Prerequisites Install the following before running the project:

Node.js (use a current LTS release)
npm (included with Node.js)
PostgreSQL
Redis (recommended for the configured caching and Socket.IO adapter features) Getting Started
Clone the repository git clone <YOUR_GITHUB_REPOSITORY_URL> cd chatflow Replace <YOUR_GITHUB_REPOSITORY_URL> with the URL of your GitHub repository. Run the commands below from the directory that contains the backend and frontend folders.
Create the PostgreSQL database Open PostgreSQL using pgAdmin or psql and create a database: CREATE DATABASE chatflow; The backend uses PostgreSQL. Make sure the database user you configure has permission to connect to chatflow and create the tables.
Configure the backend Move into the backend folder: cd backend Create your local environment file by copying the example.
Windows Command Prompt: copy .env.example .env PowerShell / macOS / Linux: cp .env.example .env Edit backend/.env and set values appropriate for your own machine. The database configuration used by the application is PostgreSQL, so use port 5432 and a PostgreSQL username (commonly postgres), not MySQL settings.

Example configuration: PORT=5000 NODE_ENV=development FRONTEND_URL=http://localhost:5173

DB_HOST=localhost DB_PORT=5432 DB_USER=postgres DB_PASSWORD=your_postgresql_password DB_NAME=chatflow

REDIS_HOST=localhost REDIS_PORT=6379 REDIS_PASSWORD=

JWT_SECRET=replace_with_a_long_random_secret JWT_REFRESH_SECRET=replace_with_another_long_random_secret JWT_EXPIRES_IN=7d JWT_REFRESH_EXPIRES_IN=30d

UPLOAD_DIR=uploads MAX_FILE_SIZE=52428800 Use strong, unique JWT secrets and your own database password. Do not commit .env or real credentials to GitHub. 4. Install backend dependencies and create tables From the backend directory: npm install npm run migrate The migration script runs the SQL migration files in backend/migrations/. If migration execution fails, check the database connection settings and ensure PostgreSQL is running. 5. Start Redis If Redis is installed locally, start the Redis service using the method for your operating system. The default connection is localhost:6379.

Redis support is configured for caching/pub-sub and the Socket.IO adapter. The backend contains fallback handling for Redis initialization and adapter errors, but Redis-dependent functionality may be unavailable when Redis is not running. 6. Start the backend From backend: npm run dev The API server is configured to use port 5000 by default.

Useful local URLs:

Health check: http://localhost:5000/health
REST API base: http://localhost:5000/api
Uploaded files: http://localhost:5000/uploads/ Keep this terminal running.
Configure and start the frontend Open a second terminal in the project root, then: cd frontend Create the frontend environment file:
Windows Command Prompt: copy .env.example .env PowerShell / macOS / Linux: cp .env.example .env The example values are: VITE_API_URL=http://localhost:5000/api VITE_SOCKET_URL=http://localhost:5000 VITE_UPLOAD_URL=http://localhost:5000/uploads Install dependencies and start Vite: npm install npm run dev Open the local URL printed by Vite (normally http://localhost:5173). API Overview All REST endpoints use the /api prefix. Most user, conversation, message, notification, and upload endpoints require a valid access token: Authorization: Bearer <access_token> Authentication — /api/auth Method Endpoint Purpose POST /register Register an account POST /login Log in POST /refresh Refresh tokens POST /logout Log out GET /me Get the authenticated user POST /internal-users Create an internal user (authenticated)

Users — /api/users The user routes provide user-related operations. Refer to backend/routes/user.routes.js for the current endpoint definitions. Conversations — /api/conversations Method Endpoint Purpose GET / List the user's conversations (supports pagination) POST /private Create a private conversation POST /group Create a group conversation GET /:id Get a conversation POST /:id/members Add group members DELETE /:id/members/:memberId Remove a group member POST /:id/leave Leave a group

Messages — /api/messages Method Endpoint Purpose GET /:conversationId Get conversation messages (supports pagination) PUT /:messageId/read Mark a message as read PUT /conversation/:conversationId/read Mark a conversation as read PUT /:messageId Edit a message DELETE /:messageId Delete a message POST /:messageId/reactions Add an emoji reaction DELETE /:messageId/reactions Remove a reaction GET /:messageId/reactions Get message reactions

Notifications — /api/notifications Method Endpoint Purpose GET / Get notifications (supports pagination) GET /unread/count Get unread notification count PUT /:id/read Mark a notification as read PUT /read/all Mark all notifications as read DELETE /:id Delete a notification

Uploads — /api/upload Method Endpoint Purpose POST /single Upload one file POST /multiple Upload multiple files DELETE /:filename Delete an uploaded file GET /:filename/info Get file information

For request body requirements, response formats, validation rules, and the complete list of user endpoints, check the route, validator, controller, and service files in backend/. Real-Time Communication The backend uses Socket.IO and the frontend connects to the same server. The client authenticates its socket connection with the access token, then sends an authentication event before processing queued events. The server contains dedicated handlers for chat, messages, notifications, typing indicators, and presence.

For local development, the frontend and backend URLs should point to the same host and port values shown in the environment examples. The Redis adapter can be used to share Socket.IO events between backend instances when Redis is configured. Database The SQL migrations define tables for:

Users
Conversations
Conversation members
Messages
Message attachments
Message reads
Message reactions
Notifications
Refresh tokens
Sessions Migration files are stored in backend/migrations/ and are numbered to indicate their intended order. Available Scripts Backend (backend/) Command Description npm install Install backend dependencies npm run dev Start backend with nodemon npm start Start backend with Node.js npm run migrate Run database migrations npm test Run the configured Jest test command
Frontend (frontend/) Command Description npm install Install frontend dependencies npm run dev Start the Vite development server npm run build Build the production frontend npm run preview Preview the production build locally npm run lint Run ESLint

Troubleshooting

Database connection error: confirm PostgreSQL is running and DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME match your local setup.
Tables do not exist: run npm run migrate from the backend directory and review any migration errors.
Port 5000 is already in use: stop the process using that port or set a different PORT in backend/.env. Update the frontend API and Socket.IO URLs if you change it.
Frontend cannot reach the API: confirm the backend is running, VITE_API_URL is correct, and FRONTEND_URL in the backend matches the frontend origin.
Real-time features do not connect: check VITE_SOCKET_URL, the backend server, browser console, and socket authentication logs.
Redis errors: confirm Redis is running at the configured host and port. The backend attempts to continue if Redis initialization or adapter setup fails, but Redis-related features may not work.
Uploads fail: check the upload size limit, permissions on backend/uploads/, and the authenticated request.
Login or token-refresh problems: clear stale local application tokens and sign in again; verify the JWT secrets and token configuration. Security Notes
Never upload .env files, passwords, database credentials, JWT secrets, tokens, or private uploaded files to a public repository.
Use .env.example only for placeholder values. Review it before publishing.
Use HTTPS and secure environment secrets when deploying.
Configure CORS for the actual frontend domain in production.
Review upload access, file validation, rate limits, and logging before production deployment.
Do not use development credentials or fallback secrets in production. Contributing
Fork the repository.
Create a feature branch.
Make and test your changes.
Open a pull request with a clear description.
