# API Architecture

## 1. API structure

The backend will expose REST APIs grouped by business domain under the following routes:

- /api/auth
- /api/users
- /api/roles
- /api/permissions
- /api/products
- /api/categories
- /api/inventory
- /api/stock
- /api/suppliers
- /api/purchases
- /api/customers
- /api/loyalty
- /api/gift-cards
- /api/tables
- /api/reservations
- /api/orders
- /api/payments
- /api/kitchen
- /api/waiters
- /api/employees
- /api/attendance
- /api/shifts
- /api/payroll
- /api/expenses
- /api/catering
- /api/quotations
- /api/reports
- /api/notifications
- /api/audit-logs
- /api/settings
- /api/branches

## 2. API conventions

Each route module should include:
- controller functions
- validation middleware
- authorization checks
- service layer interaction
- error handling
- pagination inputs
- filtering, sorting, and search support

## 3. Request/response conventions

### Success response
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully"
}
```

### Error response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": []
  }
}
```

## 4. Middleware stack

Each protected route should use:
1. authentication middleware
2. authorization middleware
3. validation middleware
4. controller
5. centralized error handler

## 5. Common query parameters

Most list endpoints should support:
- page
- limit
- sortBy
- sortOrder
- search
- status
- dateFrom
- dateTo
- branchId
- userId
- categoryId
- productId
- paymentMethod
- orderType

## 6. Core route patterns

### Auth
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/refresh-token
- POST /api/auth/forgot-password
- POST /api/auth/reset-password

### Users and roles
- GET /api/users
- POST /api/users
- GET /api/users/:id
- PATCH /api/users/:id
- DELETE /api/users/:id

### Products
- GET /api/products
- POST /api/products
- GET /api/products/:id
- PATCH /api/products/:id
- DELETE /api/products/:id

### Orders
- GET /api/orders
- POST /api/orders
- GET /api/orders/:id
- PATCH /api/orders/:id
- DELETE /api/orders/:id
- POST /api/orders/:id/refund
- POST /api/orders/:id/void

### Inventory
- GET /api/inventory
- POST /api/inventory/adjust
- POST /api/inventory/transfer
- GET /api/stock/movements
- GET /api/stock/low-stock

### Payments
- POST /api/payments
- GET /api/payments/:id
- POST /api/payments/refund
- POST /api/payments/split

### Kitchen
- GET /api/kitchen/orders
- PATCH /api/kitchen/orders/:id/status
- GET /api/kitchen/summary

### Reservations
- POST /api/reservations
- GET /api/reservations
- PATCH /api/reservations/:id
- POST /api/reservations/:id/seat

## 7. Error handling requirements

- Validation errors must be descriptive and consistent
- Authentication failures must clearly indicate token/session issues
- Authorization failures must identify missing permission
- Business-rule violations must use domain-specific error codes
- Database errors must not leak internals

## 8. API testing strategy

Each route module should include:
- CRUD success tests
- validation failure tests
- permission failure tests
- branch scope tests
- integration tests for transactional workflows

## 9. API documentation

The backend should expose documentation for all endpoints, with examples for request body, response, and permission requirements. This can be delivered via Swagger/OpenAPI or a maintained docs set if the project chooses not to include Swagger in the initial build.
