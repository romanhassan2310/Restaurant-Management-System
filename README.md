# Restaurant Management System (POS & ERP)

This repository is planned as a production-oriented Restaurant Management System built for multi-role restaurant operations, with a full POS stack, ERP modules, inventory control, payroll, CRM, real-time kitchen updates, and optional multi-branch support.

## Source of truth

This project must follow the specification provided in the project brief. No requirement is waived, simplified, or replaced without explicit approval.

## Project status

Current stage: architecture and implementation planning only.

The project is intentionally not being built in a single step. The required sequence is:

1. Architecture and dependency design
2. Database architecture
3. Frontend architecture
4. Backend architecture
5. API architecture
6. Socket.IO architecture
7. RBAC/permission architecture
8. Folder structure
9. Module dependency map
10. Development plan
11. Stop for approval
12. Begin Phase 1 only after approval

## Core stack

Frontend
- React.js
- Vite
- TypeScript
- React Router
- Tailwind CSS
- Axios
- Reusable components
- Responsive design

Backend
- Node.js
- Express.js
- TypeScript
- REST API
- Socket.IO

Database
- MongoDB
- Mongoose

Authentication and security
- JWT
- Refresh token rotation
- bcrypt
- RBAC
- Permission checks
- Zod/Joi validation
- Helmet
- CORS
- Rate limiting
- Audit logging
- Secret management via .env

## Access channels

- Admin dashboard
- POS terminal
- Waiter mobile/tablet
- Kitchen display system
- QR self-ordering
- Delivery/mobile POS
- Management portal
- Mobile/van sales
- Optional multi-branch

## Implementation philosophy

- Build in phases with verified completion gates
- Each phase must include testing, bug fixing, validation, and documentation updates
- Critical financial and inventory operations must use MongoDB transactions
- Every protected action must have backend authorization and audit logging
- Real-time events must synchronize order, table, kitchen, and inventory status

## Planned folder structure

```text
restaurant-management-system/
├─ README.md
├─ docs/
│  ├─ architecture.md
│  ├─ database.md
│  ├─ api.md
│  ├─ authentication.md
│  ├─ permissions.md
│  ├─ realtime.md
│  ├─ deployment.md
│  ├─ testing.md
│  ├─ business-rules.md
│  ├─ assumptions.md
├─ backend/
│  ├─ src/
│  │  ├─ config/
│  │  ├─ controllers/
│  │  ├─ middleware/
│  │  ├─ models/
│  │  ├─ routes/
│  │  ├─ services/
│  │  ├─ utils/
│  │  ├─ validators/
│  │  ├─ sockets/
│  │  ├─ app.ts
│  │  └─ server.ts
│  ├─ tests/
│  └─ .env.example
├─ frontend/
│  ├─ src/
│  │  ├─ components/
│  │  ├─ pages/
│  │  ├─ services/
│  │  ├─ hooks/
│  │  ├─ routes/
│  │  ├─ store/
│  │  ├─ types/
│  │  └─ App.tsx
│  └─ public/
└─ docker-compose.yml
```

## Phase roadmap

1. Project foundation
2. Authentication + RBAC
3. Products + categories + inventory + recipes
4. POS + orders
5. Payments + receipts + shift
6. KDS + Socket.IO
7. Tables + waiter + reservations
8. QR self-ordering
9. Purchase + suppliers
10. CRM + loyalty + gift cards
11. HR + attendance + payroll
12. Expenses + catering + quotations
13. Mobile/van sales
14. Reports + dashboard
15. Notifications + audit logs
16. Multi-branch
17. Security + testing
18. Full integration testing
19. Final production audit
20. Deployment

## Approval gate

This repository is currently at the architecture and planning stage. No production implementation should begin until the architecture plan is reviewed and approved.
