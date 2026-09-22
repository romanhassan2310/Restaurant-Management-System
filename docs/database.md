# Database Architecture

## 1. Database choice

MongoDB with Mongoose is the chosen database because the system requires flexible order data, nested line items, dynamic modifiers, branch scope, and extensive reporting queries.

## 2. Core design principles

- Data is isolated by organization and branch where applicable
- Financial and inventory operations use MongoDB transactions
- Indexes are added for high-frequency lookups: orders, products, tables, reservations, customers, users
- Audit logs are append-only and immutable in practical business terms
- All inventory and order entities retain traceability through movement history and references

## 3. Core entities

### Users and access control
- User
- Role
- Permission

### Organization and branch
- Organization
- Branch
- Store
- Terminal

### Employee and HR
- Employee
- Attendance
- Shift
- Payroll

### Catalog and products
- Product
- Category
- Modifier
- Recipe
- RecipeItem

### Inventory
- Inventory
- InventoryItem
- StockMovement
- StockAdjustment
- StockTransfer

### Orders and payments
- Order
- OrderItem
- Payment
- Refund
- Discount
- POSSession
- CashReconciliation
- KitchenOrder
- KitchenOrderItem

### Customers and loyalty
- Customer
- CustomerGroup
- LoyaltyAccount
- LoyaltyTransaction
- GiftCard

### Suppliers and purchases
- Supplier
- PurchaseOrder
- PurchaseInvoice
- PurchaseItem
- PurchaseReturn

### Reservations, tables, and floor
- Table
- Floor
- Reservation

### Finance and operations
- Expense
- ExpenseCategory
- Quotation
- CateringOrder
- Notification
- AuditLog
- Report
- Setting

## 4. Important schema relationships

### Branch-aware tenancy
- All transactional data references a branchId and organizationId whenever applicable
- Users and employees are scoped to one or more authorized branches
- Inventory, orders, purchases, and reports are branch-specific

### Order relationship model
- Order belongs to branch, customer, table, waiter, cashier, and optional reservation
- Order has many OrderItem records
- Order has many Payment records
- Order may have many Refund records
- Order is linked to KitchenOrder and receipt history

### Inventory movement model
- InventoryItem tracks current quantity and reorder metadata
- StockMovement records each movement type and source/destination reference
- StockTransfer references source and destination inventory entries
- Recipe-based sales create a movement pattern via deduction from ingredient stock

### Payment model
- Payment references order and payment method
- Payment status can be Pending, Partial, Paid, Failed, Refunded, Partially Refunded
- Split payment is represented as multiple payment entries under one order

### Audit model
- AuditLog records user, action, module, entity, entityId, timestamp, IP, before value, after value
- Financial and security operations require mandatory audit records

## 5. Transaction-critical operations

These must use MongoDB transactions:
- Order + payment creation
- Receipt creation and payment application
- Sale + inventory deduction
- Purchase + inventory increase
- Stock transfer
- Refund + inventory adjustment
- Shift closing
- Payroll processing

## 6. Indexing strategy

Recommended indexes:
- users: email, branchIds, roleIds
- products: branchId, categoryId, sku, barcode, isActive
- orders: branchId, status, orderType, createdAt, tableId, customerId
- tables: branchId, status, floorId, section
- reservations: branchId, date, status, tableId
- inventory items: branchId, productId, lowStock
- payments: orderId, status, method
- notifications: userId, branchId, readAt
- audit logs: entity, entityId, createdAt, userId

## 7. Data consistency rules

- Negative stock must be configurable per branch or organization
- Inventory changes must always produce stock movement records
- Refunds and cancellations must reconcile inventory and financial state
- Shift start/end must be unique per branch and terminal per day
- Payment balance cannot exceed order payable amount
- Gift card balance cannot go below zero
- Loyalty transactions must remain traceable

## 8. Data lifecycle and retention

- Active operational data remains in primary collections
- Archived reports and historical records may be exported or moved to summary tables
- Audit logs and financial history must be retained for compliance and operations review

## 9. Validation requirements

Mongoose schema validation must be combined with server-side Zod/Joi validation for API calls. The database must not be the only validation layer.

## 10. Assumptions and open design choices

- Multi-branch support is optional but must be architected as a first-class capability
- Some operational functions may require weekly or monthly summaries, generated from raw transactions
- Payment and inventory integrations are designed using provider interfaces for easy replacement
