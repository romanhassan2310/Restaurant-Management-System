import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { mobileSyncService, type OfflineOrder } from '../services/mobileSyncService';

interface Van {
  _id: string;
  vanNumber: string;
  plateNumber: string;
  modelName?: string;
  driver?: { _id: string; firstName: string; lastName: string };
  assignedSalesperson?: { _id: string; firstName: string; lastName: string };
  status: 'active' | 'maintenance' | 'inactive';
  capacity?: number;
  notes?: string;
}

interface VanSession {
  _id: string;
  van: Van | string;
  assignedTo: { _id: string; firstName: string; lastName: string } | string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'closed';
  startOdometer?: number;
  endOdometer?: number;
  startingCash: number;
  endingCashCollected?: number;
  expectedCash?: number;
  cashVariance?: number;
  totalSales: number;
  totalOrdersCount: number;
  notes?: string;
}

interface VanInventoryItem {
  _id: string;
  van: string;
  product: {
    _id: string;
    name: string;
    sku: string;
    sellingPrice: number;
    stockQuantity: number;
    unit?: { name: string };
  };
  quantity: number;
  minStock?: number;
}

interface Customer {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
}

interface CartItem {
  product: string;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  notes?: string;
  availableVanStock: number;
}

interface MobileOrder {
  _id: string;
  orderNumber: string;
  type: string;
  status: string;
  paymentStatus: string;
  items: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number }>;
  customer?: { name: string; phone?: string };
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  notes?: string;
  createdAt: string;
}

export default function MobileVanPage() {
  const { token, user } = useAuth();

  const [activeTab, setActiveTab] = useState<'pos' | 'fleet' | 'inventory' | 'history' | 'closing'>('pos');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Core Data
  const [vans, setVans] = useState<Van[]>([]);
  const [selectedVan, setSelectedVan] = useState<Van | null>(null);
  const [activeSession, setActiveSession] = useState<VanSession | null>(null);
  const [vanInventory, setVanInventory] = useState<VanInventoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [salesHistory, setSalesHistory] = useState<MobileOrder[]>([]);

  // POS State
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'digital_wallet' | 'customer_account'>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<MobileOrder | null>(null);

  // Fleet & Session State
  const [vanFormOpen, setVanFormOpen] = useState(false);
  const [vanForm, setVanForm] = useState({ vanNumber: '', plateNumber: '', modelName: '', capacity: 0, notes: '' });
  const [sessionStartOpen, setSessionStartOpen] = useState(false);
  const [sessionStartForm, setSessionStartForm] = useState({ startOdometer: 0, startingCash: 0, notes: '' });

  // Inventory Transfer State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [warehouseProducts, setWarehouseProducts] = useState<Array<{ _id: string; name: string; sku: string; stockQuantity: number }>>([]);
  const [transferForm, setTransferForm] = useState({ productId: '', quantity: 1, notes: '' });

  // Closing Shift State
  const [closingForm, setClosingForm] = useState({ endOdometer: 0, endingCashCollected: 0, notes: '' });
  const [closingSummary, setClosingSummary] = useState<unknown | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    setPendingSyncCount(mobileSyncService.getPendingOfflineOrders().length);
    fetchVans();
    fetchActiveSession();
    fetchCustomers();
  }, [token]);

  useEffect(() => {
    if (selectedVan) {
      fetchVanInventory(selectedVan._id);
      fetchSalesHistory(selectedVan._id);
    }
  }, [selectedVan]);

  // Fetching Data
  const fetchVans = async () => {
    try {
      const res = await fetch('/api/mobile-van/vans', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) {
        setVans(json.data);
        if (json.data.length > 0 && !selectedVan) {
          setSelectedVan(json.data[0]);
        }
      }
    } catch {
      // offline fallback
    }
  };

  const fetchActiveSession = async () => {
    try {
      const res = await fetch('/api/mobile-van/sessions/active', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success && json.data) {
        setActiveSession(json.data);
        if (json.data.van && typeof json.data.van === 'object') {
          setSelectedVan(json.data.van as Van);
        }
      }
    } catch {
      // ignore
    }
  };

  const fetchVanInventory = async (vanId: string) => {
    if (isOnline) {
      try {
        const res = await fetch(`/api/mobile-van/inventory/${vanId}`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (json.success) {
          setVanInventory(json.data);
          mobileSyncService.cacheInventory(vanId, json.data);
        }
      } catch {
        const cached = mobileSyncService.getCachedInventory(vanId);
        if (cached) setVanInventory(cached as VanInventoryItem[]);
      }
    } else {
      const cached = mobileSyncService.getCachedInventory(vanId);
      if (cached) setVanInventory(cached as VanInventoryItem[]);
    }
  };

  const fetchCustomers = async () => {
    if (isOnline) {
      try {
        const res = await fetch('/api/pos/customers', { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (json.success) {
          setCustomers(json.data);
          mobileSyncService.cacheCustomers(json.data);
        }
      } catch {
        setCustomers(mobileSyncService.getCachedCustomers() as Customer[]);
      }
    } else {
      setCustomers(mobileSyncService.getCachedCustomers() as Customer[]);
    }
  };

  const fetchSalesHistory = async (vanId: string) => {
    try {
      const res = await fetch(`/api/mobile-van/orders?vanId=${vanId}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) {
        setSalesHistory(json.data);
      }
    } catch {
      // offline
    }
  };

  const fetchWarehouseProducts = async () => {
    try {
      const res = await fetch('/api/pos/products', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) {
        setWarehouseProducts(json.data);
      }
    } catch {
      // ignore
    }
  };

  // Sync Handling
  const handleTriggerSync = async () => {
    if (!token) return;
    setSyncing(true);
    setErrorMsg(null);
    try {
      const res = await mobileSyncService.syncPendingOrders(token);
      setPendingSyncCount(mobileSyncService.getPendingOfflineOrders().length);
      setSuccessMsg(`Successfully synced ${res.syncedCount} orders.`);
      if (selectedVan) {
        fetchVanInventory(selectedVan._id);
        fetchSalesHistory(selectedVan._id);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // POS Cart functions
  const addToCart = (item: VanInventoryItem) => {
    if (item.quantity <= 0) {
      setErrorMsg(`No stock available on van for ${item.product.name}`);
      return;
    }
    const existingIndex = cart.findIndex((c) => c.product === item.product._id);
    if (existingIndex > -1) {
      const current = cart[existingIndex];
      if (current.quantity + 1 > item.quantity) {
        setErrorMsg(`Cannot add more. Van stock limit reached (${item.quantity})`);
        return;
      }
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          product: item.product._id,
          name: item.product.name,
          sku: item.product.sku,
          unitPrice: item.product.sellingPrice,
          quantity: 1,
          availableVanStock: item.quantity,
        },
      ]);
    }
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.availableVanStock) {
              setErrorMsg(`Van stock limit reached (${item.availableVanStock})`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[],
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discountAmount = discountType === 'fixed' ? Math.min(subtotal, discountValue) : (subtotal * discountValue) / 100;
  const taxable = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxable * taxRate) / 100;
  const grandTotal = Number((taxable + taxAmount).toFixed(2));

  // Order Submission (Online / Offline)
  const handleProcessOrder = async () => {
    if (cart.length === 0) return;
    if (!selectedVan) {
      setErrorMsg('Please select a van for sales');
      return;
    }

    const orderPayload = {
      vanId: selectedVan._id,
      sessionId: activeSession?._id,
      customer: selectedCustomer?._id,
      items: cart.map((c) => ({
        product: c.product,
        name: c.name,
        sku: c.sku,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
      })),
      discountType,
      discountValue,
      taxRate,
      payments: [{ method: paymentMethod, amount: grandTotal, reference: paymentReference }],
      notes: `Mobile sale via ${selectedVan.vanNumber}`,
    };

    if (!isOnline) {
      // Offline mode
      const offlineOrder: OfflineOrder = {
        offlineId: `OFF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        customerName: selectedCustomer?.name,
        createdAt: new Date().toISOString(),
        ...orderPayload,
      };

      mobileSyncService.savePendingOfflineOrder(offlineOrder);
      setPendingSyncCount(mobileSyncService.getPendingOfflineOrders().length);

      // Locally update van inventory display
      setVanInventory((prev) =>
        prev.map((inv) => {
          const cartItem = cart.find((c) => c.product === inv.product._id);
          if (cartItem) {
            return { ...inv, quantity: Math.max(0, inv.quantity - cartItem.quantity) };
          }
          return inv;
        }),
      );

      setSuccessMsg('Offline Order Queued! Will sync automatically when connection restores.');
      setCart([]);
      setPaymentModalOpen(false);
      return;
    }

    // Online submission
    try {
      const res = await fetch('/api/mobile-van/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderPayload),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(`Order ${json.data.order.orderNumber} created successfully!`);
        setInvoiceModalOrder(json.data.order);
        setCart([]);
        setPaymentModalOpen(false);
        fetchVanInventory(selectedVan._id);
        fetchSalesHistory(selectedVan._id);
      } else {
        setErrorMsg(json.error?.message || 'Failed to process order');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Order submission error');
    }
  };

  // Fleet & Session Handlers
  const handleCreateVan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/mobile-van/vans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(vanForm),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg('Van added successfully');
        setVanFormOpen(false);
        setVanForm({ vanNumber: '', plateNumber: '', modelName: '', capacity: 0, notes: '' });
        fetchVans();
      } else {
        setErrorMsg(json.error?.message || 'Failed to create van');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Van creation error');
    }
  };

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVan) return;
    try {
      const res = await fetch('/api/mobile-van/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ van: selectedVan._id, ...sessionStartForm }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg('Mobile Van sales session started!');
        setActiveSession(json.data);
        setSessionStartOpen(false);
      } else {
        setErrorMsg(json.error?.message || 'Failed to start session');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Session start error');
    }
  };

  const handleTransferStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVan) return;
    try {
      const res = await fetch('/api/mobile-van/inventory/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ van: selectedVan._id, product: transferForm.productId, quantity: transferForm.quantity, notes: transferForm.notes }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg('Stock transferred to van successfully!');
        setTransferModalOpen(false);
        setTransferForm({ productId: '', quantity: 1, notes: '' });
        fetchVanInventory(selectedVan._id);
      } else {
        setErrorMsg(json.error?.message || 'Stock transfer failed');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Stock transfer error');
    }
  };

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    try {
      const res = await fetch(`/api/mobile-van/sessions/${activeSession._id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(closingForm),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg('Mobile Van Sales Session Closed and Reconciled!');
        setActiveSession(json.data);
        // Load summary
        const sumRes = await fetch(`/api/mobile-van/summary/${activeSession._id}`, { headers: { Authorization: `Bearer ${token}` } });
        const sumJson = await sumRes.json();
        if (sumJson.success) {
          setClosingSummary(sumJson.data);
        }
      } else {
        setErrorMsg(json.error?.message || 'Closing shift failed');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Closing shift error');
    }
  };

  const filteredInventory = vanInventory.filter((inv) =>
    inv.product.name.toLowerCase().includes(searchQuery.toLowerCase()) || inv.product.sku.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Network / Sync Notification Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-slate-900 px-6 py-4 text-white shadow">
        <div className="flex items-center gap-3">
          <span className={`inline-block h-3.5 w-3.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
          <div>
            <h2 className="text-lg font-bold">Mobile & Van Sales POS</h2>
            <p className="text-xs text-slate-300">
              Status: <span className="font-semibold">{isOnline ? 'Online Ready' : 'Offline Mode (Local Storage Enabled)'}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {pendingSyncCount > 0 && (
            <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-slate-950">
              {pendingSyncCount} Offline Order{pendingSyncCount > 1 ? 's' : ''} Pending
            </span>
          )}
          <button
            onClick={handleTriggerSync}
            disabled={!isOnline || syncing || pendingSyncCount === 0}
            className="rounded bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync Offline Orders Now'}
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="flex items-center justify-between rounded bg-red-100 p-4 text-sm text-red-700">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="font-bold">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center justify-between rounded bg-emerald-100 p-4 text-sm text-emerald-700">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Van & Active Session Context Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <label className="text-sm font-semibold text-slate-700">Active Van:</label>
          <select
            value={selectedVan?._id || ''}
            onChange={(e) => {
              const v = vans.find((item) => item._id === e.target.value);
              if (v) setSelectedVan(v);
            }}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium"
          >
            {vans.map((v) => (
              <option key={v._id} value={v._id}>
                {v.vanNumber} ({v.plateNumber})
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-4">
          {activeSession ? (
            <div className="text-sm">
              <span className="rounded bg-emerald-100 px-2 py-1 font-bold text-emerald-800">Session Active</span>
              <span className="ml-2 text-slate-600">Sales: ৳{activeSession.totalSales.toFixed(2)} ({activeSession.totalOrdersCount} orders)</span>
            </div>
          ) : (
            <button
              onClick={() => setSessionStartOpen(true)}
              className="rounded bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
            >
              + Start Day Sales Session
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4">
        {[
          { key: 'pos', label: 'Mobile POS' },
          { key: 'fleet', label: 'Van & Fleet' },
          { key: 'inventory', label: 'Van Inventory' },
          { key: 'history', label: 'Sales History' },
          { key: 'closing', label: 'Daily Sales Closing' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.key ? 'border-slate-900 text-slate-900 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* --- TAB 1: MOBILE POS --- */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column: Mobile Product Grid */}
          <div className="space-y-4 lg:col-span-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search products on van stock..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 rounded border border-slate-300 p-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {filteredInventory.map((item) => (
                <div
                  key={item._id}
                  onClick={() => addToCart(item)}
                  className={`cursor-pointer rounded-lg border bg-white p-4 shadow-sm transition hover:shadow-md ${
                    item.quantity <= 0 ? 'opacity-50 bg-slate-50' : 'hover:border-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>{item.product.sku}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${item.quantity > 5 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      Stock: {item.quantity}
                    </span>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-slate-800 line-clamp-1">{item.product.name}</h3>
                  <p className="mt-1 text-base font-extrabold text-slate-900">৳{item.product.sellingPrice}</p>
                </div>
              ))}
              {filteredInventory.length === 0 && (
                <div className="col-span-full py-12 text-center text-sm text-slate-500">
                  No products loaded in this van inventory matching search.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Cart & Checkout */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-base font-bold text-slate-800">Current Order Cart</h3>
                <span className="text-xs font-medium text-slate-500">{cart.length} item(s)</span>
              </div>

              {/* Customer Selector */}
              <div className="mt-3">
                <label className="text-xs font-bold text-slate-600">Select Customer:</label>
                <select
                  value={selectedCustomer?._id || ''}
                  onChange={(e) => {
                    const c = customers.find((item) => item._id === e.target.value);
                    setSelectedCustomer(c || null);
                  }}
                  className="mt-1 w-full rounded border border-slate-300 p-2 text-xs font-medium"
                >
                  <option value="">Walk-in Customer</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.phone || 'No phone'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Items List */}
              <div className="mt-4 max-h-60 overflow-y-auto space-y-2 border-b pb-4">
                {cart.map((item) => (
                  <div key={item.product} className="flex items-center justify-between rounded bg-slate-50 p-2 text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{item.name}</p>
                      <p className="text-slate-500">৳{item.unitPrice} x {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateCartQty(item.product, -1)} className="rounded bg-slate-200 px-2 py-1 font-bold">-</button>
                      <span className="font-bold">{item.quantity}</span>
                      <button onClick={() => updateCartQty(item.product, 1)} className="rounded bg-slate-200 px-2 py-1 font-bold">+</button>
                      <span className="w-12 text-right font-extrabold text-slate-900">৳{(item.unitPrice * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                {cart.length === 0 && <p className="py-8 text-center text-xs text-slate-400">Cart is empty</p>}
              </div>

              {/* Financial Calculations */}
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between font-semibold">
                  <span>Subtotal:</span>
                  <span>৳{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Discount:</span>
                  <div className="flex items-center gap-1">
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as 'fixed' | 'percentage')}
                      className="rounded border p-1 text-[11px]"
                    >
                      <option value="fixed">৳ Fixed</option>
                      <option value="percentage">% Percent</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      className="w-16 rounded border p-1 text-right text-[11px]"
                    />
                  </div>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax Rate (%):</span>
                  <input
                    type="number"
                    min="0"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-16 rounded border p-1 text-right text-[11px]"
                  />
                </div>
                <div className="flex justify-between border-t pt-2 text-sm font-extrabold text-slate-900">
                  <span>Grand Total:</span>
                  <span>৳{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setPaymentModalOpen(true)}
              disabled={cart.length === 0}
              className="w-full rounded bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Proceed to Payment (৳{grandTotal.toFixed(2)})
            </button>
          </div>
        </div>
      )}

      {/* --- TAB 2: VAN & FLEET ASSIGNMENT --- */}
      {activeTab === 'fleet' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <h3 className="text-base font-bold">Vehicle & Van Fleet Registry</h3>
            <button
              onClick={() => setVanFormOpen(true)}
              className="rounded bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
            >
              + Add New Van
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="p-3">Van Number</th>
                  <th className="p-3">Plate Number</th>
                  <th className="p-3">Model</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Driver / Salesperson</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-700">
                {vans.map((v) => (
                  <tr key={v._id}>
                    <td className="p-3 font-bold">{v.vanNumber}</td>
                    <td className="p-3 font-mono">{v.plateNumber}</td>
                    <td className="p-3">{v.modelName || 'N/A'}</td>
                    <td className="p-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-bold ${v.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {v.assignedSalesperson ? `${v.assignedSalesperson.firstName} ${v.assignedSalesperson.lastName}` : 'Unassigned'}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedVan(v);
                          setSessionStartOpen(true);
                        }}
                        className="rounded bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-100"
                      >
                        Start Session
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 3: VAN INVENTORY & TRANSFERS --- */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold">Loaded Mobile Stock for {selectedVan?.vanNumber || 'Selected Van'}</h3>
            <button
              onClick={() => {
                fetchWarehouseProducts();
                setTransferModalOpen(true);
              }}
              className="rounded bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-600"
            >
              + Load Stock from Warehouse
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Selling Price</th>
                  <th className="p-3 text-center">Van Stock Qty</th>
                  <th className="p-3">Last Stocked</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-700">
                {vanInventory.map((item) => (
                  <tr key={item._id}>
                    <td className="p-3 font-bold">{item.product.name}</td>
                    <td className="p-3 font-mono">{item.product.sku}</td>
                    <td className="p-3">৳{item.product.sellingPrice}</td>
                    <td className="p-3 text-center font-extrabold text-slate-900">{item.quantity}</td>
                    <td className="p-3 text-xs text-slate-500">Updated recently</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 4: SALES HISTORY & INVOICES --- */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold">Mobile Sales History & Invoices</h3>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="p-3">Order #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-700">
                {salesHistory.map((order) => (
                  <tr key={order._id}>
                    <td className="p-3 font-bold font-mono">{order.orderNumber}</td>
                    <td className="p-3 text-xs">{new Date(order.createdAt).toLocaleString()}</td>
                    <td className="p-3">{order.customer?.name || 'Walk-in'}</td>
                    <td className="p-3 font-bold">৳{order.total.toFixed(2)}</td>
                    <td className="p-3">
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">{order.status}</span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setInvoiceModalOrder(order)}
                        className="rounded border border-slate-300 px-3 py-1 text-xs font-medium hover:bg-slate-100"
                      >
                        View Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 5: DAILY SALES CLOSING RECONCILIATION --- */}
      {activeTab === 'closing' && (
        <div className="space-y-6 max-w-2xl mx-auto rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 border-b pb-3">Daily Mobile Sales Shift Closing & Reconciliation</h3>
          {activeSession ? (
            <form onSubmit={handleCloseSession} className="space-y-4">
              <div className="rounded bg-slate-50 p-4 text-xs space-y-1">
                <p><strong>Van:</strong> {typeof activeSession.van === 'object' ? activeSession.van.vanNumber : activeSession.van}</p>
                <p><strong>Session Started:</strong> {new Date(activeSession.startTime).toLocaleString()}</p>
                <p><strong>Starting Cash Float:</strong> ৳{activeSession.startingCash.toFixed(2)}</p>
                <p><strong>Total Mobile Sales Recorded:</strong> ৳{activeSession.totalSales.toFixed(2)}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Ending Odometer Reading (km):</label>
                <input
                  type="number"
                  min="0"
                  value={closingForm.endOdometer}
                  onChange={(e) => setClosingForm({ ...closingForm, endOdometer: Number(e.target.value) })}
                  className="mt-1 w-full rounded border p-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Actual Cash Collected in Till (৳):</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={closingForm.endingCashCollected}
                  onChange={(e) => setClosingForm({ ...closingForm, endingCashCollected: Number(e.target.value) })}
                  className="mt-1 w-full rounded border p-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Closing Notes & Variance Explanations:</label>
                <textarea
                  value={closingForm.notes}
                  onChange={(e) => setClosingForm({ ...closingForm, notes: e.target.value })}
                  className="mt-1 w-full rounded border p-2 text-sm"
                  rows={2}
                ></textarea>
              </div>

              <button type="submit" className="w-full rounded bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-500">
                Finalize Shift & Reconcile Mobile Sales
              </button>
            </form>
          ) : (
            <p className="text-center text-sm text-slate-500">No active session to close. Start a shift in Fleet tab first.</p>
          )}
        </div>
      )}

      {/* --- PAYMENT MODAL --- */}
      {paymentModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold">Select Payment Method</h3>
            <div className="space-y-2">
              {[
                { key: 'cash', label: 'Cash' },
                { key: 'card', label: 'Credit / Debit Card' },
                { key: 'digital_wallet', label: 'Mobile Wallet (Bkash / Nagad)' },
                { key: 'customer_account', label: 'Customer Account Credit' },
              ].map((pm) => (
                <button
                  key={pm.key}
                  type="button"
                  onClick={() => setPaymentMethod(pm.key as typeof paymentMethod)}
                  className={`w-full text-left p-3 rounded border font-medium text-xs ${
                    paymentMethod === pm.key ? 'border-slate-900 bg-slate-900 text-white font-bold' : 'border-slate-200'
                  }`}
                >
                  {pm.label}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Transaction Reference / Note (Optional):</label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="mt-1 w-full rounded border p-2 text-xs"
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setPaymentModalOpen(false)} className="w-1/2 rounded border py-2 text-xs font-bold">
                Cancel
              </button>
              <button onClick={handleProcessOrder} className="w-1/2 rounded bg-emerald-600 py-2 text-xs font-bold text-white">
                Complete Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PROFESSIONAL INVOICE MODAL --- */}
      {invoiceModalOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full space-y-4 shadow-xl">
            <div className="border-b pb-3 text-center">
              <h2 className="text-xl font-black tracking-wide uppercase">RESTAURANT MOBILE SALES</h2>
              <p className="text-xs text-slate-500">Vehicle Delivery & POS Invoice</p>
            </div>
            <div className="text-xs flex justify-between">
              <div>
                <p><strong>Order #:</strong> {invoiceModalOrder.orderNumber}</p>
                <p><strong>Date:</strong> {new Date(invoiceModalOrder.createdAt).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p><strong>Customer:</strong> {invoiceModalOrder.customer?.name || 'Walk-in'}</p>
                <p><strong>Notes:</strong> {invoiceModalOrder.notes}</p>
              </div>
            </div>

            <table className="w-full text-left text-xs border-y py-2">
              <thead>
                <tr className="border-b font-bold">
                  <th className="py-1">Item</th>
                  <th className="py-1 text-center">Qty</th>
                  <th className="py-1 text-right">Price</th>
                  <th className="py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoiceModalOrder.items.map((it, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-1 font-medium">{it.name}</td>
                    <td className="py-1 text-center">{it.quantity}</td>
                    <td className="py-1 text-right">৳{it.unitPrice}</td>
                    <td className="py-1 text-right font-bold">৳{it.lineTotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-xs space-y-1 text-right font-semibold">
              <p>Subtotal: ৳{invoiceModalOrder.subtotal.toFixed(2)}</p>
              <p>Discount: -৳{invoiceModalOrder.discountTotal.toFixed(2)}</p>
              <p>Tax: ৳{invoiceModalOrder.taxTotal.toFixed(2)}</p>
              <p className="text-base font-black text-slate-900 border-t pt-1">Total Paid: ৳{invoiceModalOrder.total.toFixed(2)}</p>
            </div>

            <div className="flex gap-2 border-t pt-3">
              <button onClick={() => setInvoiceModalOrder(null)} className="w-1/2 rounded border py-2 text-xs font-bold">
                Close
              </button>
              <button onClick={() => window.print()} className="w-1/2 rounded bg-slate-900 py-2 text-xs font-bold text-white">
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD VAN MODAL --- */}
      {vanFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateVan} className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold">Register New Van / Vehicle</h3>
            <div>
              <label className="text-xs font-bold">Van Identifier (e.g. VAN-01):</label>
              <input
                type="text"
                required
                value={vanForm.vanNumber}
                onChange={(e) => setVanForm({ ...vanForm, vanNumber: e.target.value })}
                className="w-full border rounded p-2 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold">License Plate Number:</label>
              <input
                type="text"
                required
                value={vanForm.plateNumber}
                onChange={(e) => setVanForm({ ...vanForm, plateNumber: e.target.value })}
                className="w-full border rounded p-2 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold">Vehicle Model:</label>
              <input
                type="text"
                value={vanForm.modelName}
                onChange={(e) => setVanForm({ ...vanForm, modelName: e.target.value })}
                className="w-full border rounded p-2 text-xs"
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setVanFormOpen(false)} className="w-1/2 rounded border py-2 text-xs font-bold">
                Cancel
              </button>
              <button type="submit" className="w-1/2 rounded bg-slate-900 py-2 text-xs font-bold text-white">
                Save Vehicle
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- START SESSION MODAL --- */}
      {sessionStartOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleStartSession} className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold">Start Mobile Sales Shift Session</h3>
            <div>
              <label className="text-xs font-bold">Initial Odometer Reading (km):</label>
              <input
                type="number"
                value={sessionStartForm.startOdometer}
                onChange={(e) => setSessionStartForm({ ...sessionStartForm, startOdometer: Number(e.target.value) })}
                className="w-full border rounded p-2 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold">Starting Cash Float (৳):</label>
              <input
                type="number"
                value={sessionStartForm.startingCash}
                onChange={(e) => setSessionStartForm({ ...sessionStartForm, startingCash: Number(e.target.value) })}
                className="w-full border rounded p-2 text-xs"
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSessionStartOpen(false)} className="w-1/2 rounded border py-2 text-xs font-bold">
                Cancel
              </button>
              <button type="submit" className="w-1/2 rounded bg-indigo-600 py-2 text-xs font-bold text-white">
                Start Shift Session
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- STOCK TRANSFER MODAL --- */}
      {transferModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleTransferStock} className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold">Load Stock from Main Warehouse to Van</h3>
            <div>
              <label className="text-xs font-bold">Select Product:</label>
              <select
                required
                value={transferForm.productId}
                onChange={(e) => setTransferForm({ ...transferForm, productId: e.target.value })}
                className="w-full border rounded p-2 text-xs"
              >
                <option value="">Select product...</option>
                {warehouseProducts.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.sku}) - Warehouse Stock: {p.stockQuantity}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold">Quantity to Transfer:</label>
              <input
                type="number"
                min="1"
                required
                value={transferForm.quantity}
                onChange={(e) => setTransferForm({ ...transferForm, quantity: Number(e.target.value) })}
                className="w-full border rounded p-2 text-xs"
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setTransferModalOpen(false)} className="w-1/2 rounded border py-2 text-xs font-bold">
                Cancel
              </button>
              <button type="submit" className="w-1/2 rounded bg-emerald-700 py-2 text-xs font-bold text-white">
                Transfer Stock
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
