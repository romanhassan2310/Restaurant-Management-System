# RBAC and Permission Architecture

## 1. Model design

The system uses a role-based access control model with granular permissions and branch-level enforcement.

### Permission model
Permissions are represented as discrete capabilities such as:
- users.view
- users.create
- users.update
- users.delete
- products.view
- products.create
- products.update
- products.delete
- inventory.view
- inventory.adjust
- inventory.transfer
- orders.view
- orders.create
- orders.update
- orders.cancel
- orders.refund
- payments.create
- payments.refund
- discounts.apply
- reports.view
- payroll.view
- payroll.manage
- settings.manage

### Role model
Roles aggregate permissions and can be assigned to users. A user may have multiple roles, and those roles can be scoped to a branch.

## 2. Enforcement model

Every protected endpoint should check:
- user is authenticated
- user has the required permission or role
- branch is authorized for the operation
- resource ownership, where applicable, matches request context

## 3. Example role mapping

### Super Admin
- Full system access
- Branch override if required

### Admin
- Business operations across assigned branches
- User and settings management

### Manager
- Operational oversight
- Orders, inventory, staff summary, reporting

### Cashier
- POS, payment processing, order closure, reconciliation

### Waiter
- Table orders, waiter assignments, kitchen communication

### Chef/Kitchen
- Order status updates, preparation updates, KDS access

### Inventory Manager
- Inventory adjustment, stock transfer, stock movement review

### Purchase Manager
- Supplier, purchase orders, receiving, supplier payments

### HR Manager
- Employee, attendance, payroll metadata management

### Accountant
- Payroll review, financial reporting, expense controls

### Delivery Driver
- Delivery order flow and completion status

### Customer
- Account management, loyalty, QR ordering, order tracking

## 4. Permission checks

Permission checks should be centralized in middleware and service-level guard helpers, for example:
- requireAuth
- requirePermission('orders.create')
- requireAnyPermission([...])
- requireBranchAccess(branchId)
- requireActiveShift()

## 5. Branch-scoped access

Users must only access authorized branches. Branch restrictions are enforced both at the API layer and in service operations so the frontend cannot bypass them.

## 6. Security rules

- No client-side authorization is considered authoritative
- All grants are verified server-side
- Protected operations must log audit entries
- Permission changes must be tracked with before/after values

## 7. Permission lifecycle

- roles created/updated/deleted
- permissions assigned to roles
- users assigned roles
- branch access granted or revoked
- permission changes audited

## 8. Testing requirements

Permission testing must cover:
- allowed operation by valid role
- denied operation by missing permission
- denied branch access
- denied operation when user is inactive
- audit logging on permission changes
