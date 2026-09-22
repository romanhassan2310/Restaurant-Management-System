export interface OfflineOrderItem {
  product: string;
  variant?: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  modifiers?: { modifier: string; name: string; price: number }[];
  notes?: string;
}

export interface OfflinePaymentItem {
  method: 'cash' | 'card' | 'digital_wallet' | 'customer_account';
  amount: number;
  reference?: string;
}

export interface OfflineOrder {
  offlineId: string;
  vanId: string;
  sessionId?: string;
  customer?: string;
  customerName?: string;
  items: OfflineOrderItem[];
  discountType?: 'fixed' | 'percentage';
  discountValue?: number;
  taxRate?: number;
  payments: OfflinePaymentItem[];
  notes?: string;
  createdAt: string;
}

const OFFLINE_ORDERS_KEY = 'rms_van_offline_orders';
const CACHED_INVENTORY_KEY = 'rms_van_cached_inventory';
const CACHED_CUSTOMERS_KEY = 'rms_van_cached_customers';

export const mobileSyncService = {
  getPendingOfflineOrders(): OfflineOrder[] {
    try {
      const data = localStorage.getItem(OFFLINE_ORDERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  savePendingOfflineOrder(order: OfflineOrder): void {
    const orders = this.getPendingOfflineOrders();
    orders.push(order);
    localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(orders));
  },

  removePendingOfflineOrder(offlineId: string): void {
    const orders = this.getPendingOfflineOrders().filter((o) => o.offlineId !== offlineId);
    localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(orders));
  },

  clearPendingOfflineOrders(): void {
    localStorage.removeItem(OFFLINE_ORDERS_KEY);
  },

  cacheInventory(vanId: string, items: unknown[]): void {
    try {
      const data = { vanId, timestamp: new Date().toISOString(), items };
      localStorage.setItem(`${CACHED_INVENTORY_KEY}_${vanId}`, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to cache inventory locally', e);
    }
  },

  getCachedInventory(vanId: string): unknown[] | null {
    try {
      const raw = localStorage.getItem(`${CACHED_INVENTORY_KEY}_${vanId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.items || null;
    } catch {
      return null;
    }
  },

  cacheCustomers(customers: unknown[]): void {
    try {
      localStorage.setItem(CACHED_CUSTOMERS_KEY, JSON.stringify(customers));
    } catch (e) {
      console.error('Failed to cache customers locally', e);
    }
  },

  getCachedCustomers(): unknown[] {
    try {
      const raw = localStorage.getItem(CACHED_CUSTOMERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async syncPendingOrders(token: string): Promise<{ syncedCount: number; errorCount: number; errors: unknown[] }> {
    const pending = this.getPendingOfflineOrders();
    if (pending.length === 0) {
      return { syncedCount: 0, errorCount: 0, errors: [] };
    }

    try {
      const response = await fetch('/api/mobile-van/sync-offline-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orders: pending }),
      });

      const json = await response.json();
      if (json.success && json.data) {
        const { syncedCount, errorCount, results, errors } = json.data;
        if (results && Array.isArray(results)) {
          for (const res of results) {
            if (res.success) {
              this.removePendingOfflineOrder(res.offlineId);
            }
          }
        }
        return { syncedCount, errorCount, errors };
      }
      throw new Error(json.error?.message || 'Sync failed');
    } catch (error) {
      console.error('Offline batch sync error:', error);
      throw error;
    }
  },
};
