# Soar School Management System API

A robust RESTful API for managing schools, classrooms, and students, built with Node.js, Express, and MongoDB.

## 🚀 Features

- **Role-Based Access Control (RBAC)**: Superadmin, School Admin, and Teacher roles.
- **Entity Management**: CRUD operations for Schools, Classrooms, and Students.
- **Attendance & Scheduling**: Advanced features for tracking student attendance and managing class timetables.
- **Security**: JWT-based authentication, password hashing, and rate limiting (global & focused).
- **Validation**: Strict input validation using Zod and a custom modular validation system.
- **API Documentation**: Interactive Swagger/OpenAPI documentation.

## 🛠 Project Structure

The project follows a modular "Manager-Loader" pattern for high scalability and clean separation of concerns:

- `managers/`: Contains core business logic.
  - `entities/`: Domain-specific logic (School, Classroom, Student, Attendance, Schedule).
  - `api/`: Central API handler for dispatching requests.
  - `http/`: Express server setup.
- `mws/`: Reusable middleware (Authentication, Authorization, Rate Limiting).
- `models/`: Mongoose schemas.
- `loaders/`: Service initialization logic.
- `docs/`: Swagger YAML specifications.

## 📦 Setup & Installation

### Prerequisites

- Node.js (v16+)
- MongoDB (Local or Atlas)
- Redis (Required for internal messaging and caching)

### Steps

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd soar-school-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Variables**:
   Create a `.env` file in the root directory and configure the following:
   ```env
   USER_PORT=5111
   MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/soar_db
   CACHE_REDIS=redis://127.0.0.1:6379
   CORTEX_REDIS=redis://127.0.0.1:6379
   OYSTER_REDIS=redis://127.0.0.1:6379
   SERVICE_NAME=Axion
   ```

4. **Run the application**:
   ```bash
   npm run dev
   ```

5. **Access Documentation**:
   Visit `http://localhost:5111/api-docs` to see the interactive Swagger UI.

## 🔑 Authentication Flow

1. **Signup**: Create a Superadmin or School Admin using `/api/user/signup` (requires a secret `adminKey`).
2. **Login**: Authenticate at `/api/user/login` to receive a JWT.
3. **Usage**: Include the JWT in the `Authorization: Bearer <token>` header for protected routes.

## 🛡 Security Implementation

- **General Rate Limit**: 100 requests per 15 minutes per IP.
- **Security Throttling**: 10 attempts per hour for Login/Signup endpoints to prevent brute-force attacks.
- **Data Isolation**: School Admins and Teachers are strictly restricted to data belonging to their own school.

## 📝 Assumptions & Decisions

- **Attendance Normalization**: Attendance records are stored with midnight-normalized dates to simplify daily reporting.
- **Overlap Logic**: The scheduling system checks for classroom availability before allowing new schedule entries.
- **Modular Middleware**: Middleware is injected dynamically into manager methods for a declarative security approach.

## 📊 Database Schema Diagram

*(See the attached diagram or use the Swagger documentation for entity relationships)*

## 🧪 Testing

Run automated tests (once configured):
```bash
npm test
```
