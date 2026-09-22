# Testing Strategy

## 1. Testing goals

The system must be validated under production-like conditions for every major domain and workflow. The implementation must not proceed to the next phase until the current phase is verified.

## 2. Test layers

### Unit tests
- pure validation schema tests
- service-level business rule tests
- permission checks
- utility functions

### Integration tests
- API request/response validation
- database transaction tests
- branch access checks
- inventory movement consistency
- payment and order flows

### End-to-end tests
- POS checkout
- KDS update flow
- waiter order sync
- QR ordering flow
- shift closure and cash reconciliation

## 3. Core test focus areas

- Authentication
- Authorization and permissions
- Product CRUD
- Inventory and stock movement
- Recipes
- POS and orders
- Payments and split payments
- Refunds
- Shift operations
- KDS and Socket.IO
- Tables and reservations
- QR ordering
- Purchase and supplier workflows
- CRM, loyalty, and gift cards
- HR, attendance, and payroll
- Expenses, catering, and quotations
- Mobile/van sales
- Reports
- Notifications
- Audit logs
- Multi-branch rules

## 4. Verification checklist for each phase

After each phase:
- run relevant tests
- fix all issues
- verify database state
- verify API behavior
- verify frontend behavior
- verify permissions
- verify validation
- verify business logic
- verify real-time behavior where applicable
- verify audit logging
- update documentation

## 5. Test environment

- separate development and test MongoDB instances
- set environment variables explicitly
- run isolated test scripts for transactional workflows
- test with realistic values, not fabricated business data

## 6. Acceptance bar

No feature is presumed complete until it passes focused validation in the relevant domain and is confirmed against the specification.
