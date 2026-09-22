# Real-Time Architecture

## 1. Real-time communication goal

The system requires real-time synchronization across kitchen, POS, waiter, table, inventory, and dashboard data. Socket.IO is the chosen real-time communication layer.

## 2. Core events

### Order events
- order:created
- order:updated
- order:cancelled
- order:paid
- order:ready
- order:served

### Kitchen events
- kitchen:new-order
- kitchen:status-updated

### Table events
- table:updated

### Reservation events
- reservation:created
- reservation:updated

### Inventory events
- inventory:low-stock
- inventory:updated

### Notification events
- notification:new

### Dashboard events
- dashboard:sales-updated

### Shift events
- shift:started
- shift:closed

## 3. Rooms and broadcast strategy

Use Socket.IO rooms to limit event fan-out:
- branch:{branchId}
- kitchen:{branchId}
- waiter:{waiterId}
- pos:{branchId}
- management:{branchId}

## 4. Synchronization patterns

- POS to KDS: automatic order push when an order is placed or modified
- KDS to POS: status updates to refresh the order timeline
- Waiter to POS: live table and order updates
- Reservation updates to floor management and waitlist workflows
- Inventory changes to dashboards and low-stock alerts
- Shift events to cash reconciliation and dashboard reporting

## 5. Real-time business requirements

- New orders should appear on KDS immediately
- Kitchen status transitions must sync with POS and waiters
- Table changes must update floor management interfaces
- QR orders must be visible to POS and KDS
- Low stock alerts must notify relevant users immediately
- Dashboard metrics should refresh after sales or payment updates

## 6. Backend architecture

The Socket.IO server should be initialized alongside the REST API and should expose event handlers by domain, e.g.:
- orderSocket
- kitchenSocket
- tableSocket
- reservationSocket
- inventorySocket
- notificationSocket
- dashboardSocket

## 7. Frontend architecture

Frontend clients should connect to the same Socket.IO instance and subscribe to branch-specific room events. Event handlers should update local store or query caches without requiring a full page reload.

## 8. Resilience requirements

- Reconnect logic for dropped connections
- Graceful handling of stale order states
- Event deduplication on repeated status updates
- Consistent payload structure for all real-time events

## 9. Security and auditing

- Real-time events should not expose sensitive information beyond role-appropriate data
- Important order, payment, and inventory updates should also be logged in audit trails
