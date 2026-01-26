# ArchiEase Project Tracker

## Backend Implementation with Docker

The backend is a Spring Boot application containerized using Docker. It connects to a MySQL database also running in a Docker container.

### Prerequisites
- Docker and Docker Compose installed on your machine.

### How to Run (Local Development)

1.  **Build and Start the Application:**
    ```bash
    docker-compose up --build
    ```
    This will:
    - Start a MySQL 8.0 container.
    - Build the Spring Boot backend application.
    - Start the backend on port 8080.

2.  **Access the Application:**
    - API Health Check: [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health)
    - API Endpoints: `http://localhost:8080/api/...`

3.  **Stop the Application:**
    ```bash
    docker-compose down
    ```
    To remove volumes (and database data):
    ```bash
    docker-compose down -v
    ```

### How to Run (Production Simulation)

To run with production settings (using `env.local` for environment variables):

```bash
docker-compose -f docker-compose.prod.yml --env-file env.local up --build
```

### Project Structure for Docker

- **Dockerfile**: Multi-stage build file for the Spring Boot application.
- **docker-compose.yml**: Docker Compose configuration for local development.
- **docker-compose.prod.yml**: Docker Compose configuration for production.
- **.dockerignore**: Excludes unnecessary files from the Docker build context.
- **mysql/init/**: Directory for SQL scripts to initialize the database (executed on first startup).

### Configuration

- **Local:** configured in `docker-compose.yml` and `src/main/resources/application.properties`.
- **Production:** configured in `docker-compose.prod.yml` (using environment variables) and `src/main/resources/application-prod.properties`.



# 🚀 VimaDimension - Quick Start Guide

## ✅ **Current Status: YOUR APP IS RUNNING!**

### **Services Running:**
- ✅ **MySQL Database** - Port 3306
- ✅ **Backend (Spring Boot)** - Port 8080  
- ✅ **Frontend (React)** - Port 3000

---

## 🌐 **Access Your Application**

Open your browser and go to:
```
http://localhost:3000
```

---

## 🔑 **Login Credentials**

You have 2 admin accounts ready to use:

### **Account 1:**
- **Username:** `admin`
- **Email:** `admin@vimadimension.com`
- **Password:** `admin`

### **Account 2:**
- **Username:** `kejriwal9576`
- **Email:** `kejriwal9576@vimadimension.com`
- **Password:** `admin`

> **Note:** You can also register a new account if you prefer!

---

## 📊 **How It All Works - The Basic Flow**

### **Architecture Overview:**

```
┌─────────────────┐
│  YOUR BROWSER   │
│  (localhost:3000)│
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│   REACT FRONTEND    │
│  - UI Components    │
│  - User Interactions│
│  - State Management │
└────────┬────────────┘
         │ HTTP Requests (API calls)
         │ via proxy
         ▼
┌─────────────────────┐
│  SPRING BOOT API    │
│  (localhost:8080)   │
│  - REST Controllers │
│  - Business Logic   │
│  - Security/Auth    │
│  - Validation       │
└────────┬────────────┘
         │ SQL Queries
         │ via JPA/Hibernate
         ▼
┌─────────────────────┐
│   MySQL DATABASE    │
│  (localhost:3306)   │
│  - Users            │
│  - Projects         │
│  - Tasks            │
│  - Time Entries     │
│  - etc...           │
└─────────────────────┘
```

---

## 🔄 **Complete User Flow Example**

### **Scenario: User Logs In**

1. **Frontend (React):**
   - User enters username/password
   - React component calls: `api.post('/api/auth/login', {username, password})`
   
2. **Network:**
   - Request goes from `localhost:3000` → proxied to → `localhost:8080/api/auth/login`
   
3. **Backend (Spring Boot):**
   - `ApiAuthController.login()` receives request
   - Spring Security validates credentials
   - Checks database: "Does this user exist? Is password correct?"
   
4. **Database (MySQL):**
   - Query: `SELECT * FROM users WHERE username = ?`
   - Returns user data if found
   
5. **Backend Response:**
   - Creates JWT token
   - Returns: `{token: "xyz...", user: {...}}`
   
6. **Frontend Receives:**
   - Stores token in localStorage
   - Redirects to dashboard
   - Shows user's projects, tasks, etc.

### **Scenario: User Creates a Project**

1. **Frontend:** User fills project form → clicks "Create"
2. **API Call:** `POST /api/projects` with project data
3. **Backend:** 
   - `ProjectController.createProject()` receives data
   - Validates user has permission
   - Saves to database via `ProjectRepository`
4. **Database:** `INSERT INTO projects (name, description, ...) VALUES (...)`
5. **Backend Response:** Returns created project with ID
6. **Frontend:** Updates UI, shows success message, redirects to project list

---

## 📁 **Key Database Tables**

Your database has these main tables:

- **users** - User accounts and authentication
- **organizations** - Company/organization data
- **roles** - User roles (ADMIN, MANAGER, EMPLOYEE, etc.)
- **permissions** - What each role can do
- **projects** - Project information
- **tasks** - Tasks within projects
- **time_entries** - Time tracking for tasks
- **invoices** - Invoice generation
- **payslips** - Employee payroll
- **clients** - Client management

---

## 🛠️ **Tech Stack Explained**

### **Frontend (React):**
- **Location:** `/frontend/src/`
- **Main File:** `App.js` - Routes and main app structure
- **Components:** `/components/` - Reusable UI pieces
- **API Calls:** `/utils/api.js` - All backend communication
- **Port:** 3000
- **Proxy:** Automatically forwards `/api/*` requests to port 8080

### **Backend (Spring Boot):**
- **Location:** `/src/main/java/org/example/`
- **Controllers:** Handle HTTP requests (like `ApiAuthController.java`)
- **Services:** Business logic (like `UserService.java`)
- **Repository:** Database queries (like `UserRepository.java`)
- **Models:** Database entities (like `User.java`)
- **Port:** 8080

### **Database (MySQL):**
- **Name:** `project_tracker_db`
- **User:** `tracker_app_user`
- **Port:** 3306
- **Schema:** Auto-created by Hibernate (JPA)

---

## 🔍 **How to Verify Everything is Working**

### **1. Check Backend:**
```bash
curl http://localhost:8080/actuator/health
```
Expected: `{"status":"UP"}` or `{"status":"DOWN"}` (DOWN is OK if email not configured)

### **2. Check Frontend:**
Open browser: `http://localhost:3000`
You should see the login page.

### **3. Check Database:**
```bash
mysql -u tracker_app_user -pyour_strong_password project_tracker_db -e "SHOW TABLES;"
```
You should see 27 tables.

---

## 🔨 **Build, Run & Stop Commands**

### **Quick Reference Table**

| Action | Frontend (React) | Backend (Spring Boot) |
|--------|------------------|----------------------|
| **Directory** | `frontend/` | Project root |
| **Install** | `npm install` | *(Gradle handles it)* |
| **Build** | `npm run build` | `./gradlew build` |
| **Run (Dev)** | `npm start` | `./gradlew bootRun` |
| **Stop** | `Ctrl+C` | `Ctrl+C` |
| **Port** | 3000 | 8080 |

---

### **Build Commands**

#### **Frontend (React) - Production Build**
```bash
cd /Users/dmeghwal/Documents/myDocs/repo/vimadimension/frontend
npm install          # Install dependencies (first time or after package.json changes)
npm run build        # Create production build (outputs to frontend/build/)
npm start            # Starts development server on http://localhost:3000
```

#### **Backend (Spring Boot) - Production Build**
```bash
cd /Users/dmeghwal/Documents/myDocs/repo/vimadimension
./gradlew build      # Compile and build JAR file (outputs to build/libs/)
./gradlew bootRun    # Starts server on http://localhost:8080
```

### **Stop Commands**

#### **Option 1: Stop from Terminal (Recommended)**
Go to the terminal where the service is running and press:
```
Ctrl + C
```

#### **Option 2: Kill by Port (if terminal is closed or unresponsive)**
```bash
# Stop Frontend (port 3000)
lsof -ti:3000 | xargs kill -9

# Stop Backend (port 8080)
lsof -ti:8080 | xargs kill -9

# Stop both at once
lsof -ti:3000,8080 | xargs kill -9
```

#### **Stop MySQL Database (optional)**
```bash
brew services stop mysql
```

---

### **Full Development Workflow**

#### **Starting Everything (in order)**
```bash
# Terminal 1: Ensure MySQL is running
brew services start mysql

# Terminal 2: Start Backend
cd /Users/dmeghwal/Documents/myDocs/repo/vimadimension
./gradlew bootRun

# Terminal 3: Start Frontend
cd /Users/dmeghwal/Documents/myDocs/repo/vimadimension/frontend
npm start
```

#### **Stopping Everything (in order)**
```bash
# 1. Stop Frontend: Go to Terminal 3, press Ctrl+C
# 2. Stop Backend: Go to Terminal 2, press Ctrl+C
# 3. Stop MySQL (optional):
brew services stop mysql
```

---

## 📝 **Common Development Tasks**

### **View Backend Logs:**
Check the terminal where you ran `./gradlew bootRun`
Or: `tail -f /Users/dmeghwal/.cursor/projects/Users-dmeghwal-Documents-myDocs-repo-vimadimension/terminals/3.txt`

### **View Frontend Logs:**
Check the terminal where you ran `npm start`
Or check browser console (F12 → Console tab)

### **Query Database:**
```bash
mysql -u tracker_app_user -pyour_strong_password project_tracker_db
```

Then run SQL:
```sql
-- See all users
SELECT id, username, email FROM users;

-- See all projects
SELECT id, name, status FROM projects;

-- See user roles
SELECT u.username, r.name as role 
FROM users u 
JOIN user_roles ur ON u.id = ur.user_id 
JOIN roles r ON ur.role_id = r.id;
```

---

## 🛑 **How to Stop Everything**

### **Stop Frontend:**
Go to terminal running `npm start` and press: `Ctrl + C`

### **Stop Backend:**
Go to terminal running `./gradlew bootRun` and press: `Ctrl + C`

### **Stop MySQL (optional):**
```bash
brew services stop mysql
```

---

## 🔄 **How to Restart**

### **1. Start MySQL (if stopped):**
```bash
brew services start mysql
```

### **2. Start Backend:**
```bash
cd /Users/dmeghwal/Documents/myDocs/repo/vimadimension
./gradlew bootRun
```

### **3. Start Frontend (in new terminal):**
```bash
cd /Users/dmeghwal/Documents/myDocs/repo/vimadimension/frontend
npm start
```

---

## 🐛 **Troubleshooting**

### **Problem: Port already in use**

**Solution:**
```bash
# Kill process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9

# Kill process on port 8080 (backend)
lsof -ti:8080 | xargs kill -9
```

### **Problem: Can't log in**

**Solutions:**
1. Register a new account
2. Reset password using "Forgot Password" (requires email setup)
3. Check database for user:
```bash
mysql -u tracker_app_user -pyour_strong_password project_tracker_db -e "SELECT username, email FROM users;"
```

### **Problem: Database connection error**

**Check if MySQL is running:**
```bash
brew services list | grep mysql
```

**Restart MySQL:**
```bash
brew services restart mysql
```

### **Problem: Backend shows "DOWN" status**

This is usually due to email configuration. The app will still work for most features. To fix:
1. Get a Gmail App Password
2. Set environment variables:
```bash
export GMAIL_USER=your-email@gmail.com
export GMAIL_PASS=your-app-password
```

---

## 📚 **Next Steps**

Now that you understand the basics:

1. **Explore the UI** - Click around, see what features exist
2. **Check the Code**:
   - Frontend: `/frontend/src/components/`
   - Backend: `/src/main/java/org/example/controller/`
3. **Read API Documentation**: `API_DOCUMENTATION.md`
4. **Try Making Changes**:
   - Modify a UI component
   - Add a new API endpoint
   - Create a database query

---

## 💡 **Key Concepts**

### **Authentication Flow:**
- User logs in → Backend creates JWT token → Frontend stores token
- Every API request includes this token in headers
- Backend validates token before processing requests

### **Role-Based Access Control (RBAC):**
- Users have roles: ADMIN, MANAGER, EMPLOYEE, HR, GUEST
- Each role has specific permissions
- Backend checks permissions before allowing actions

### **Proxy Configuration:**
- Frontend (`package.json`): `"proxy": "http://localhost:8080"`
- This means: `/api/login` → automatically goes to → `http://localhost:8080/api/login`
- No CORS issues during development!

---

## 📖 **Swagger API Documentation**

Access the interactive API documentation at:
```
http://localhost:8080/swagger-ui.html
```

### **Testing APIs with Swagger**

1. Open Swagger UI in your browser
2. **Login first** - Expand `POST /api/auth/login` and click "Try it out"
3. Enter credentials:
```json
{
  "username": "admin",
  "password": "admin"
}
```
4. Click **Execute** - This establishes your session
5. Now you can test any other API endpoint

> **Note:** APIs require authentication. Always login first before testing other endpoints.

---

## 🎯 **Quick Reference**

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| Frontend | 3000 | http://localhost:3000 | User Interface |
| Backend | 8080 | http://localhost:8080/api | REST API |
| Swagger | 8080 | http://localhost:8080/swagger-ui.html | API Testing |
| Database | 3306 | localhost:3306 | Data Storage |

| Environment | Config File |
|-------------|-------------|
| Development | `application.properties` |
| Production | `application-prod.properties` |

---

## ✅ **You're All Set!**

Your application is running and ready to use. Open your browser and visit:

🌐 **http://localhost:3000**

Happy coding! 🚀

