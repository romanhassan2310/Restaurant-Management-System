# Architecture Overview

## 1. System summary

The restaurant management platform is structured around a layered service architecture:

Client channels -> API gateway/auth layer -> business services -> data access -> MongoDB and external providers

This architecture separates responsibilities, supports multi-role access, and enables real-time synchronization across POS, KDS, waiters, and management dashboards.

## 2. Architectural layers

### Presentation layer
- React + Vite + TypeScript frontend
- Responsive desktop POS layout
- Tablet/mobile waiter UI
- KDS and dashboard views
- QR-ordering flow
- Role-aware navigation and route guards

### API layer
- Express.js backend with TypeScript
- REST routes grouped by business domain
- Validation middleware using Zod or Joi
- Authentication middleware
- Authorization middleware
- Error middleware and structured responses
- Pagination, filtering, sorting, and search support

### Service layer
- Domain services for orders, payments, inventory, purchases, payroll, reports, etc.
- Business rules enforced in service methods
- Transaction orchestration for critical operations
- Audit and notification hooks

### Data layer
- MongoDB with Mongoose models
- Branch-aware data isolation
- Schema-level validation and index design
- Transactions for financial and inventory operations

### Real-time layer
- Socket.IO server for order, table, KDS, inventory, dashboard, and notification events
- Branch, kitchen, waiter, POS, and management rooms

### External service layer
- PaymentProvider
- EmailProvider
- SmsProvider
- StorageProvider
- PrinterProvider

## 3. Access channels and responsibilities

### Admin dashboard
- Aggregate analytics
- System oversight
- Branch and user management
- Reports and alerts

### POS terminal
- Order creation and payment
- Discounts, tax, service charge, split payments
- Shift start/end and cash reconciliation

### Waiter mobile/tablet
- Assigned tables
- Create and modify orders
- See kitchen status
- Send order updates

### Kitchen display system
- Live order queue display
- Status transitions
- Priority and timing info

### QR self-ordering
- Table-tagged ordering flow
- Validates active table / branch
- Sends orders to POS and KDS

### Delivery / mobile POS / van sales
- Field order processing
- Mobile inventory and receipt generation
- Field closing and cash handling

### Management portal
- Branch performance, human resources, expenses, and reporting

## 4. Dependency map

```text
Frontend
  ├─ Auth pages / route guards
  ├─ POS UI / Orders / Kitchen / Tables / Reservations
  ├─ Inventory / Purchase / Reports / CRM
  └─ API clients + Socket.IO client
       ↓
Backend API
  ├─ Auth service
  ├─ User / Role / Permission service
  ├─ Catalog / Product / Inventory service
  ├─ Order / Payment / KDS service
  ├─ Table / Reservation / Waiter service
  ├─ Purchase / Supplier / Inventory movement service
  ├─ CRM / Loyalty / Gift card service
  ├─ HR / Payroll / Expense / Catering / Quotation service
  ├─ Reporting / Notification / Audit service
  └─ Multi-branch and permission enforcement
       ↓
Database / external adapters
  ├─ MongoDB
  ├─ Payment provider
  ├─ Email provider
  ├─ SMS provider
  ├─ File storage provider
  └─ Printer provider
```

## 5. Folder structure

```text
backend/
  src/
    config/
    controllers/
    middleware/
    models/
    routes/
    services/
    utils/
    validators/
    sockets/
    app.ts
    server.ts
  tests/

frontend/
  src/
    components/
    pages/
    services/
    hooks/
    routes/
    store/
    types/
    App.tsx
```

## 6. Security architecture

- JWT access tokens and refresh tokens
- bcrypt password hashing
- permission-based route guards
- branch-based authorization
- audit logging on sensitive operations
- server-side validation on every request
- sanitization and rate limiting
- secure headers via Helmet and CORS policy
- environment variables only; no secrets in source control

## 7. Non-functional requirements

- Multi-role concurrency support
- High availability design for POS and KDS workloads
- Fast lookup on product, table, and order endpoints
- Real-time synchronization for restaurant floor operations
- Role-based route access and branch segregation
- Transaction safety for financial and inventory actions

## 8. Master specification coverage review

The architecture covers the full master specification by domain. The following are the critical requirement clusters and how they are addressed in the design.

### POS, payments, and shift operations
- POS terminal architecture includes product search, category filtering, cart, table selection, waiter selection, discounts, tax, service charge, hold/resume, order editing, receipt history, and split payment flows.
- Payment architecture includes cash, card, QR, mobile payment, mixed payment, split payment, refund, and payment state tracking.
- Shift architecture includes shift start, opening cash, transaction logs, expected cash, actual cash, variance, reconciliation, and closing reports.
- All financial updates are modeled to be transactional and auditable.

### Kitchen and real-time operations
- KDS is treated as a first-class workflow with explicit status lifecycle: New, Pending, Preparing, Ready, Served, Completed, Cancelled.
- Order creation and status transitions are synchronized across POS, waiter, table management, and management events using Socket.IO rooms.
- Kitchen timers, priorities, notes, and item-level status tracking are included in the architecture.

### Tables, waiter mobility, and reservations
- Table management includes floor, section, capacity, occupancy, assignment, guest count, walk-in, waitlist, transfer, and merge logic.
- Waiter mobile/tablet flow is modeled as a dedicated channel with assigned tables, order creation, modification, and status awareness.
- Reservation architecture supports customer details, date/time, table assignment, notes, status transitions, and waitlist handling.

### QR ordering and self-service flow
- QR ordering is designed as a table-scoped flow: table identification → menu → categories → product → modifier → cart → customer information → order → optional payment → tracking.
- Order creation from QR is configured to validate active tables, branch access, and order status tracking.
- QR orders are explicitly routed to POS, KDS, order management, and CRM.

### Inventory, recipes, procurement, and pricing
- Product data model includes price, cost, SKU, barcode, variants, units, categories, and stock thresholds.
- Inventory architecture includes stock adjustment, transfer, movement history, stock audit, wastage, damage, returns, low stock alerts, valuation, and reorder logic.
- Recipe system includes recipe items and ingredient quantity per unit, with recipe-based deduction on sales.
- Procurement architecture covers purchase requests, purchase orders, goods receipt, supplier invoices, returns, supplier payment, and inventory reconciliation.

### CRM, loyalty, gift cards, HR, payroll, and expenses
- CRM captures lead and customer history, segmentation, group assignment, spending, credit balance, and promotions.
- Loyalty architecture supports account, points accrual and redemption, transaction history, member level, rewards, and traceability.
- Gift card architecture supports issue, balance, expiry, redemption, partial/full redemption, and payment integration.
- HR architecture covers employee profiles, attendance, shift scheduling, and employment data.
- Payroll architecture covers base salary, allowances, bonuses, deductions, overtime, payroll periods, payslips, and configurable calculations.
- Expense management includes categories, date, amount, vendor, payment method, approval, receipt attachments, and reporting.

### Catering, quotations, mobile sales, and reporting
- Catering and bulk sales include customer, event, guest count, menu, billing, invoice, payment, and order status tracking.
- Quotation workflow includes draft, sent, accepted, rejected, expired, and converted states, with accepted quotations convertible to orders.
- Mobile/van sales architecture includes mobile POS, vehicle assignment, mobile inventory synchronization, multiple payment methods, professional invoice generation, and daily sales close.
- Reporting supports sales, product, inventory, purchasing, staff, financial, customer, and operational analytics, with date/branch/user/category/payment filters and PDF/CSV/Excel export.

### Notifications, audit logs, and security
- Notification architecture covers in-app, email, and SMS channels for new orders, status updates, low stock, payment, shift close, purchase, reservation, staff, and general alerts.
- Audit logs record user, action, module, entity, entity ID, timestamp, IP, before and after values.
- Security architecture explicitly includes JWT, refresh tokens, bcrypt, RBAC, permission validation, branch authorization, rate limiting, Helmet, CORS, sanitization, and environment secrets handling.

### Multi-branch and external integration
- Multi-branch architecture is designed as first-class with organization, branch, store, and terminal separation and user branch authorization.
- External providers are abstracted behind PaymentProvider, EmailProvider, SmsProvider, StorageProvider, and PrinterProvider interfaces for replaceability.

## 9. Functional requirement gap analysis

The architecture is intentionally designed to close the gaps identified in the master specification. The critical areas that required explicit treatment were:

- POS and split payment validation
- Hold/resume workflows
- Shift start/end and cash reconciliation
- KDS timer and state synchronization
- Waiter mobile/tablet flows and status sync
- Reservation lifecycle and table assignment
- QR ordering validation and table linkage
- Inventory pricing, barcode, SKU, and stock movement rules
- Recipe deduction and procurement stock updates
- CRM, loyalty, and gift card traceability
- Payroll and expense traceability
- Reporting profit and margin calculations
- Notification and audit log architecture
- Multi-branch scoping and data isolation

## 10. Requirement matrix summary

| Requirement area | Status |
| --- | --- |
| POS | IMPLEMENTED (architecture) |
| Split payment | IMPLEMENTED (architecture) |
| Hold / Resume | IMPLEMENTED (architecture) |
| Shift Start / End | IMPLEMENTED (architecture) |
| Cash Reconciliation | IMPLEMENTED (architecture) |
| KDS | IMPLEMENTED (architecture) |
| Tables | IMPLEMENTED (architecture) |
| Waiter Mobile / Tablet | IMPLEMENTED (architecture) |
| Reservations | IMPLEMENTED (architecture) |
| QR ordering | IMPLEMENTED (architecture) |
| Inventory pricing / SKU / barcode | IMPLEMENTED (architecture) |
| Stock transfer / stock audit / recipes | IMPLEMENTED (architecture) |
| Purchase invoice / procurement | IMPLEMENTED (architecture) |
| CRM | IMPLEMENTED (architecture) |
| Loyalty | IMPLEMENTED (architecture) |
| Gift cards | IMPLEMENTED (architecture) |
| HR | IMPLEMENTED (architecture) |
| Payroll | IMPLEMENTED (architecture) |
| Expenses | IMPLEMENTED (architecture) |
| Catering | IMPLEMENTED (architecture) |
| Quotations | IMPLEMENTED (architecture) |
| Mobile / van sales | IMPLEMENTED (architecture) |
| Reports / profit / margin | IMPLEMENTED (architecture) |
| Receipt history | IMPLEMENTED (architecture) |
| Audit logs | IMPLEMENTED (architecture) |
| Notifications | IMPLEMENTED (architecture) |
| RBAC | IMPLEMENTED (architecture) |
| Socket.IO | IMPLEMENTED (architecture) |
| Multi-branch | IMPLEMENTED (architecture) |
| Full implementation | PENDING PHASE-BY-PHASE BUILD |

## 11. Approval gate

The architecture is now aligned with the full master specification and explicitly covers the operational and transactional requirements that were previously under-specified in the initial draft. No major requirement gaps remain at the architecture level.

The next step is to proceed with Phase 1: project foundation, with the architecture as the source of truth.
