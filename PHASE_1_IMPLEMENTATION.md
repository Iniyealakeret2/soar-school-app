# Technical Interview Implementation Guide: Phase 1
## Project: School Management System API

This document summarizes the technical decisions, architecture, and implementations made during **Phase 1: User Authentication & Role Management**.

---

### 1. Infrastructure & Environment
*   **Infrastructure as Code**: Implemented a `docker-compose.yml` file to provide a standardized local development environment with **Redis** and **MongoDB**. This ensures any evaluator can run the project with a single command without worrying about local installations.
*   **Safe Development**: Removed deprecated MongoDB connection options (`useNewUrlParser`, `useUnifiedTopology`) to ensure compatibility with modern Node/MongoDB drivers.

### 2. The "Axion" Security Architecture
I strictly adhered to the boilerplate's design patterns to demonstrate framework mastery:
*   **Identity vs. Session (Token Strategy)**:
    *   **LongToken**: Acts as the Master Identity key. Issued upon successful login.
    *   **ShortToken**: Acts as a device-specific session key. It is exchanged for a LongToken via the `v1_createShortToken` endpoint.
    *   **Middleware Integration**: Integrated the `__device` and `__token` system to fingerprint sessions, ensuring tokens are tied to specific callers.
*   **Centralized Security**: Consolidated all security logic (Bcrypt password hashing, OTP generation, and JWT verification) into the native `TokenManager`. This avoids "logic leakage" into external helper files and keeps the architecture clean.

### 3. User Modeling & Validation
*   **Conditional Requirements**: The `User` model uses a dynamic validation function for `schoolId`. It is strictly required for `school_admin` but optional for `superadmin`.
*   **Role-Based Constraints (RBAC)**: Implemented an `adminKey` check in the `signup` method. This prevents unauthorized users from assigning themselves high-privileged roles by requiring a secret key defined in the `.env` file.
*   **Graceful Validation**: Leveraged the local `user.schema.js` and the `Pine` validation engine to ensure data integrity (email regex, password length) before hitting the database.

### 4. OTP Verification System (Production Simulation)
*   **Out-of-Band Delivery**: To follow security best practices, the OTP is **not** returned in the API response. 
*   **Mock Mailer**: Implemented a `libs/mailer.js` service that simulates email delivery by logging a formatted box to the server console. This demonstrates an understanding of asynchronous, decoupled service architectures.

### 5. API Documentation & Polish
*   **Swagger Integration**: Integrated `swagger-jsdoc` and `swagger-ui-express`.
*   **Clean Documentation Strategy**: Instead of cluttering business logic with large comment blocks, I moved API definitions to centralized YAML files in `docs/swagger/`. This keeps the `User.manager.js` logic readable and makes the documentation language-agnostic.
*   **Developer Experience (DX)**: Updated the server startup logs to display the documentation URL directly, making it easy for interviewers to start testing immediately.

### 6. Key Refactorings & Fixes
*   **Loader Optimization**: Fixed a bug where the `UserManager` wasn't being correctly registered in the `ManagersLoader`.
*   **Schema Consolidation**: Cleaned up the `schema.models.js` to remove duplicate definitions and ensure consistent data types across the app.
*   **Redundant Code Cleanup**: Removed duplicate `Token.manager.js` files and unused `encryption.js` to ensure the codebase follows the "Single Source of Truth" principle.

---

### Potential Interview Questions & Answers:
**Q: Why separate Long and Short tokens?**
*A: Long tokens represent a persistent identity, while short tokens represent a temporary device session. This allows us to invalidate sessions without forcing the user to re-authenticate their master identity, and it prevents session hijacking across different devices.*

**Q: Why didn't you return the OTP in the signup response?**
*A: Returning an OTP in the response is a security vulnerability. It would allow any attacker to verify an account they don't own. In production, this would be sent via a secure channel (Email/SMS). I implemented a Mock Mailer to demonstrate this flow.*

**Q: How did you handle role security?**
*A: I used an `adminKey` validation during signup. Only users with the server-side secret can register as a Superadmin or School Admin.*
