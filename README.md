# College Service ERP — Microservices & Centralized React Architecture

A full-stack, multi-tenant-ready **College Service ERP** built with Node.js/Express microservices and a centralized React (Vite + Tailwind CSS) frontend designed with an institutional Sunset palette.

---

## 1. Architecture Overview

### Centralized Frontend (`Application/`)
- **Container / Host**: `Application/shell` (Vite, React Router DOM, Tailwind CSS, Lucide React, Axios)
- **Institutional Modules**:
  - `Application/dashboard`: Institutional overview landing dashboard.
  - `Application/master`: Institutional reference data management (Academic Years, Faculty & Staff Directory, Department Master).
  - `Application/department`: Departmental operational workflows (7.1 Student Subject Lookup & 7.2 HOD Staff & Teaching Assignment Overview).
  - `Application/student`: Student directory, scoped subject lookup, and student enrollment.
- **Centralized Shared Components**: `Application/shell/src/components/` (`common/`, `layout/`, `tables/`, `forms/`, `filters/`, `feedback/`).

### Backend Microservices (`Node-services/`)
- **API Gateway** (`Port 5000`): Single unified entry point routing requests to microservices.
- **Auth & Tenant Service** (`Port 5001`): JWT authentication, tenant resolution, role-based authorization.
- **Master Configuration Service** (`Port 5002`): Reference data, Academic Years, Subject catalog, Staff directory, Department configurations.
- **Student Service** (`Port 5003`): Student lookup, strictly scoped subject curriculum resolution, and student enrollment.
- **Department Service** (`Port 5004`): Workflow 7.1 (Student Subject Lookup) & Workflow 7.2 (HOD Staff Overview with department-level role access).
- **Shared Middleware & Utilities** (`Node-services/shared/`): `tenantContext.js`, `authMiddleware.js`, `responseHelper.js`.
- **Database Layer** (`Node-services/database/`): PostgreSQL ORM with Sequelize models, migrations, and seed data.

---

## 2. Multi-Tenancy Architecture

- **Initial Scope**: Configured for exactly **ONE** college tenant: **"ABC College of Engineering"** (`code: 'ABC_ENG'`).
- **Future-Ready Design**:
  - Every tenant-owned record contains a `tenant_id` foreign key.
  - No college dropdown on login screen; backend automatically resolves institutional context from credentials and attaches `tenant_id` to authenticated JWT payload.
  - Backend enforces strict tenant isolation on every database query.

---

## 3. Institutional Tenant Login

The application operates in **Single Tenant Mode**. Rather than maintaining fragmented logins for students, HODs, or staff, you authenticate directly through the institution tenant (**ABC College of Engineering**):

| Institutional Login | Identifier | Password | Access Granted |
|---|---|---|---|
| **ABC Tenant Login** | `ABC` *(or `admin@abccollege.edu`)* | `Admin@123` | Complete institutional access across all departments (CSE, ECE, MECH, CIVIL), faculty rosters, student cohorts & curriculum |

Once logged in, you can manage all Master configurations, look up any student's scoped curriculum, and inspect any department's HOD and faculty assignments.

---

## 4. Institutional Sunset Palette

Tailwind CSS color definitions:
- **Warm Cream**: `#FFF8F1` (Page backgrounds)
- **Soft Peach**: `#FCE6D8` (Surfaces, active pills, cards)
- **Blush**: `#F5D2C2` (Accents, highlights)
- **Muted Terracotta**: `#C66B45` (Primary CTA buttons, brand badges)
- **Burnt Orange**: `#AD5938` (Hover states)
- **Warm Brown**: `#553729` (Headings, body typography)
- **Muted Olive**: `#929071` (Subtitles, metadata, icons)
- **Soft Border**: `#EBD9CB` (Structural borders and dividers)

---

## 5. Quick Start & Execution

### Prerequisites
- Node.js (v18+)
- PostgreSQL running on `localhost:5432` with database `college_erp_db` (or as configured in `.env`).

### Setup Database & Seed Initial Tenant
```bash
# In project root:
pnpm run db:migrate
pnpm run db:seed
```

### Start Backend Microservices
```bash
# Starts API Gateway (5000), Auth (5001), Master (5002), Student (5003), Department (5004) concurrently
pnpm run start:backend
```

### Start Frontend Application
```bash
pnpm run start:frontend
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Run Verification Test Suite
```bash
node scripts/verify-all.js
```
Runs a 7-step automated test suite validating the API Gateway, authentication, tenant isolation, Year Master eye-icon subjects, Staff directory, Department student counts, Student scoped subjects, and Workflows 7.1 & 7.2.
