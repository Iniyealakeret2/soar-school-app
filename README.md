# Soar School Management System API

**The README: Documenting setup, assumptions, and API flow.**

A robust RESTful API for managing schools, classrooms, and students, built with Node.js, Express, and MongoDB.

## 🚀 Features

- **Role-Based Access Control (RBAC)**: Superadmin, School Admin, and Teacher roles.
- **Entity Management**: CRUD operations for Schools, Classrooms, Students, and Personnel.
- **Attendance & Scheduling**: Advanced features for tracking student attendance and managing class timetables with overlap detection.
- **Security**: JWT-based authentication, password hashing, and rate limiting (global & focused security throttling).
- **Validation**: Strict input validation using a modular schema system.
- **API Documentation**: Interactive Swagger/OpenAPI documentation.

## 🛠 Project Structure

The project follows a modular "Manager-Loader" pattern for high scalability and clean separation of concerns:

- `managers/`: Contains core business logic.
  - `entities/`: Domain-specific logic (School, Classroom, Student, Attendance, Schedule, Personnel).
  - `api/`: Central API handler for dispatching requests.
  - `http/`: Express server setup.
- `mws/`: Reusable middleware (Authentication, Authorization, Rate Limiting, Security Throttling).
- `models/`: Mongoose schemas.
- `loaders/`: Service initialization logic.
- `docs/`: Swagger YAML specifications.
- `tests/`: Comprehensive unit and integration tests.

## 📦 Setup & Installation

### Prerequisites

- **Node.js**: (v16+)
- **MongoDB**: (Local or Atlas)
- **Redis**: Required for the **Cortex** (messaging), **Oyster** (state management), and **Cache** layers.

### Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Iniyealakeret2/soar-school-app.git
   cd soar-school-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   USER_PORT=5111
   MONGO_URI=mongodb://127.0.0.1:27017/soar_db
   CACHE_REDIS=redis://127.0.0.1:6379
   CORTEX_REDIS=redis://127.0.0.1:6379
   OYSTER_REDIS=redis://127.0.0.1:6379
   SERVICE_NAME=Axion
   ENV=development
   ADMIN_SIGNUP_KEY=soar_secure_key
   LONG_TOKEN_SECRET=your_long_token_secret
   SHORT_TOKEN_SECRET=your_short_token_secret
   NACL_SECRET=your_nacl_secret
   ```

> **Note**: `ADMIN_SIGNUP_KEY` is the secret key (e.g., `soar_secure_key`) required in the request body as `adminKey` when signing up for `superadmin` or `school_admin` roles.

### 🐳 Docker Compose Setup

If you prefer to run the infrastructure (MongoDB and Redis) using Docker, a `docker-compose.yml` file is provided:

1. **Start infrastructure**:
   ```bash
   docker-compose up -d
   ```
   This will start:
   - **MongoDB** on port `27017`
   - **Redis** on port `6379`

2. **Verify services**:
   ```bash
   docker ps
   ```

4. **Run the application**:
   ```bash
   npm run dev
   ```

5. **Access Documentation**:
   Visit `http://localhost:5111/api-docs` for the interactive Swagger UI.

## 🔄 API Flow

The application follows a hierarchical data flow:

1. **School Creation**: A **Superadmin** creates a School.
2. **Personnel Setup**: A **School Admin** is signed up (associated with a `schoolId`). They can then create **Personnel** (Teachers or Staff).
3. **Classroom Management**: The **School Admin** creates Classrooms within their school.
4. **Student Enrollment**: Students are created and assigned to Classrooms.
5. **Operational Flow**:
   - **Scheduling**: The School Admin assigns Teachers to Classrooms for specific subjects/times.
   - **Attendance**: Teachers mark daily attendance for students in their assigned classrooms.
   - **Reporting**: Admins and Teachers can fetch attendance reports with date-range filters and pagination.

## 🔑 Authentication & Authorization

- **Signup/Login**: Standard JWT flow. Signup for administrative roles requires an `adminKey`.
- **Token Security**: Tokens include `schoolId` and `role` to enforce data isolation.
- **Middleware Integration**: Methods in managers use a prefix system (e.g., `__token`, `__isTeacher`) to trigger automated middleware validation.
- **Authentication Header**: The API expects the JWT in the `token` header (e.g., `token: <your_jwt>`).

## 📝 Assumptions & Decisions

- **Data Isolation**: All CRUD operations are automatically scoped by the `schoolId` extracted from the authenticated user's token to prevent cross-tenant access.
- **Capacity Validation**: Classroom `capacity` must be a **Number**. API clients must send numeric values, not strings.
- **Identity Uniqueness**:
  - **Email addresses** are globally unique across all schools.
  - **Employee IDs** are unique within a single school.
- **Personnel & Users**: Creating a `teacher` or `staff` member automatically creates a linked `User` record to enable login.
- **Reporting Defaults**: Attendance reports and historical queries default to the **last 30 days** if no date range is specified.
- **Attendance Normalization**: 
  - Dates are normalized to **midnight (00:00:00:00)** for consistency.
  - Marking attendance for the same day multiple times performs an **Upsert** (updates the existing record).
- **Schedule Overlap**: The system returns a 409 Conflict if a new schedule overlaps with another in the same classroom at the same time.
- **Personnel Roles**: Strictly limited to `teacher` and `staff` in the Personnel module. Administrative roles are managed as Users.
- **Attendance Permissions**: 
  - To ensure data integrity, **only users with the 'teacher' role** can mark attendance.
  - A teacher can only mark attendance for classrooms they are explicitly assigned to via the **Schedule**. 
  - School Admins and Superadmins are restricted from marking attendance to maintain clear accountability.

## 🧪 Testing

The codebase includes a comprehensive integration test suite.

**Run all tests**:
```bash
npm run test
```

**Run specific module tests**:
```bash
npx jest tests/integration/entities/attendance.test.js
npx jest tests/integration/entities/personnel.test.js
```

**Test Environment**: Uses `mongodb-memory-server` for isolated, fast database testing.
