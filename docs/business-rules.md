# Business Rules and Operational Logic

## 1. Financial integrity

- Payment balance must never be incorrect
- Split payment totals must match order payable amount
- Paid orders must not be edited without appropriate permission
- Discounts must respect configured limits
- Financial operations must be auditable
- Shift closing must reconcile expected and actual cash

## 2. Inventory and stock logic

- Purchase increases stock
- Sale decreases stock
- Recipe-based sales deduct ingredient stock
- Adjustment changes stock quantity with movement traceability
- Transfer requires both source and destination stock references
- Wastage reduces stock and creates audit trail
- Return operations apply appropriate stock movement
- Negative stock is configurable

## 3. Order and payment rules

- Cancellation and refund must respect inventory and accounting rules
- Payment status transitions must be valid and auditable
- Gift cards cannot be redeemed below zero balance
- Active shift may be required for POS sales
- Split payment must ensure total matched to order payable amount

## 4. Reservation and table rules

- QR orders must reference valid, active tables
- Table assignment and waiter assignment must be synchronized with real-time floor state
- Reservation statuses must follow the defined workflow

## 5. Audit and permission rules

- Critical business transactions require audit logging
- Refund and discount actions require proper permission
- Sensitive configuration changes require elevated permission
- Branch restrictions are mandatory for all operations

## 6. Reporting rules

- Reports must be calculated from real transactional data only
- Dashboard KPIs must reflect actual database records
- No fake business statistics are acceptable

## 7. Operational rules

- KDS updates must sync to POS and waiter interfaces in real time
- Inventory changes must trigger stock movement history records
- Payroll calculations must be traceable and configurable
- Loyalty points must remain linked to transaction history
