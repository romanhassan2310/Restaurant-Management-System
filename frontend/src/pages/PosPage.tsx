import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

interface Product { _id: string; name: string; sku: string; sellingPrice: number; category?: { _id: string; name: string }; }
interface Variant { _id: string; product: string; name: string; sellingPrice: number; sku: string; }
interface Modifier { _id: string; name: string; price: number; product?: string; }
interface Customer { _id: string; name: string; }
interface Table { _id: string; name: string; status: string; }
interface User { _id: string; firstName: string; lastName: string; }
interface CartItem { product: Product; variant?: Variant; quantity: number; modifiers: Modifier[]; notes: string; }
interface Order { _id: string; orderNumber: string; type: string; status: string; total: number; items?: Array<{ product: string; variant?: string; quantity: number; notes?: string; modifiers: Array<{ modifier: string }> }>; discountType?: 'fixed' | 'percentage'; discountValue: number; taxRate: number; serviceChargeRate: number; customer?: { _id: string }; table?: { _id: string }; waiter?: { _id: string }; }
interface Receipt { _id: string; receiptNumber: string; total: number; order: { orderNumber: string }; }

const orderTypeLabels = { dine_in: 'Dine-In', take_away: 'Take Away', delivery: 'Delivery', mobile_van: 'Mobile / Van' };

export default function PosPage() {
  const location = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [waiters, setWaiters] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [orderType, setOrderType] = useState<keyof typeof orderTypeLabels>('take_away');
  const [customer, setCustomer] = useState('');
  const [table, setTable] = useState('');
  const [waiter, setWaiter] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState('0');
  const [taxRate, setTaxRate] = useState('0');
  const [serviceChargeRate, setServiceChargeRate] = useState('0');
  const [message, setMessage] = useState('');
  const [editingOrderId, setEditingOrderId] = useState('');

  const loadPosData = async () => {
    const [productResponse, variantResponse, modifierResponse, customerResponse, tableResponse, waiterResponse, orderResponse, receiptResponse] = await Promise.all([
      api.get('/pos/products'), api.get('/pos/variants'), api.get('/pos/modifiers'), api.get('/pos/customers'), api.get('/pos/tables'), api.get('/pos/waiters'), api.get('/pos/orders'), api.get('/pos/receipts'),
    ]);
    setProducts(productResponse.data.data);
    setVariants(variantResponse.data.data);
    setModifiers(modifierResponse.data.data);
    setCustomers(customerResponse.data.data);
    setTables(tableResponse.data.data);
    setWaiters(waiterResponse.data.data);
    setOrders(orderResponse.data.data);
    setReceipts(receiptResponse.data.data);
  };

  useEffect(() => { loadPosData().catch(() => setMessage('Unable to load POS data.')); }, []);
  useEffect(() => {
    const tableId = (location.state as { tableId?: string } | null)?.tableId;
    if (tableId) setTable(tableId);
  }, [location.state]);

  const categories = useMemo(() => products.map((product) => product.category).filter((value, index, list) => value && list.findIndex((item) => item?._id === value._id) === index) as { _id: string; name: string }[], [products]);
  const visibleProducts = products.filter((product) => {
    const matchesSearch = `${product.name} ${product.sku}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (category === 'all' || product.category?._id === category);
  });
  const subtotal = cart.reduce((total, item) => total + item.quantity * ((item.variant?.sellingPrice ?? item.product.sellingPrice) + item.modifiers.reduce((sum, modifier) => sum + modifier.price, 0)), 0);
  const discount = discountType === 'percentage' ? subtotal * Number(discountValue || 0) / 100 : Number(discountValue || 0);
  const taxable = Math.max(0, subtotal - discount);
  const tax = taxable * Number(taxRate || 0) / 100;
  const serviceCharge = taxable * Number(serviceChargeRate || 0) / 100;
  const total = taxable + tax + serviceCharge;

  const addProduct = (product: Product, variant?: Variant) => {
    setCart((current) => {
      const existing = current.find((item) => item.product._id === product._id && item.variant?._id === variant?._id);
      if (existing) return current.map((item) => item === existing ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, { product, variant, quantity: 1, modifiers: [], notes: '' }];
    });
  };

  const submitOrder = async (hold: boolean) => {
    if (!cart.length) { setMessage('Add at least one product.'); return; }
    try {
      const payload = {
        type: orderType, customer: customer || undefined, table: table || undefined, waiter: waiter || undefined,
        items: cart.map((item) => ({ product: item.product._id, variant: item.variant?._id, quantity: item.quantity, modifiers: item.modifiers.map((modifier) => modifier._id), notes: item.notes || undefined })),
        discountType, discountValue: Number(discountValue || 0), taxRate: Number(taxRate || 0), serviceChargeRate: Number(serviceChargeRate || 0), hold,
      };
      const response = editingOrderId ? await api.patch(`/pos/orders/${editingOrderId}`, payload) : await api.post('/pos/orders', payload);
      setMessage(`${hold ? 'Order held' : 'Order created'}: ${response.data.data.orderNumber}`);
      setCart([]);
      setEditingOrderId('');
      await loadPosData();
    } catch { setMessage('The backend rejected this order. Check stock, table, and financial values.'); }
  };

  const editOrder = async (orderId: string) => {
    try {
      const response = await api.get(`/pos/orders/${orderId}`);
      const order = response.data.data as Order;
      setOrderType(order.type as keyof typeof orderTypeLabels);
      setCustomer(order.customer?._id ?? '');
      setTable(order.table?._id ?? '');
      setWaiter(order.waiter?._id ?? '');
      setDiscountType(order.discountType ?? 'fixed');
      setDiscountValue(String(order.discountValue ?? 0));
      setTaxRate(String(order.taxRate ?? 0));
      setServiceChargeRate(String(order.serviceChargeRate ?? 0));
      setCart((order.items ?? []).map((item) => {
        const product = products.find((candidate) => candidate._id === item.product);
        const variant = variants.find((candidate) => candidate._id === item.variant);
        return { product: product!, variant, quantity: item.quantity, notes: item.notes ?? '', modifiers: modifiers.filter((modifier) => item.modifiers.some((selected) => selected.modifier === modifier._id)) };
      }).filter((item) => item.product));
      setEditingOrderId(orderId);
      setMessage(`Editing ${order.orderNumber}`);
    } catch { setMessage('Unable to load order for editing.'); }
  };

  const updateOrder = async (path: string, body?: object) => {
    try { await api.post(path, body); setMessage('Order updated.'); await loadPosData(); } catch { setMessage('Order action failed.'); }
  };
  const payOrder = async (order: Order) => {
    try {
      await api.post(`/payments/orders/${order._id}/payments`, { payments: [{ method: 'cash', amount: order.total }] });
      setMessage('Cash payment recorded.');
      await loadPosData();
    } catch { setMessage('Payment failed. Start a POS shift and check the remaining balance.'); }
  };

  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<any | null>(null);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payTargetOrder, setPayTargetOrder] = useState<Order | null>(null);
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'store_credit' | 'gift_card'>('cash');
  const [giftCardCodeInput, setGiftCardCodeInput] = useState('');
  const [giftCardBalanceInfo, setGiftCardBalanceInfo] = useState<string>('');

  useEffect(() => {
    if (customer) {
      api.get(`/crm/customers/${customer}`).then((res) => {
        setSelectedCustomerDetail(res.data);
      }).catch(() => setSelectedCustomerDetail(null));
    } else {
      setSelectedCustomerDetail(null);
    }
  }, [customer]);

  const applyPromoCode = async () => {
    if (!promoCodeInput) return;
    try {
      const res = await api.post('/crm/promotions/validate', {
        code: promoCodeInput,
        orderAmount: subtotal,
        customerGroupId: selectedCustomerDetail?.customerGroup?._id || selectedCustomerDetail?.customerGroup,
      });
      if (res.data.valid && res.data.promotion) {
        setDiscountType(res.data.promotion.discountType);
        setDiscountValue(String(res.data.promotion.discountValue));
        setMessage(`Promo code "${res.data.promotion.code}" applied!`);
      } else {
        setMessage(res.data.message || 'Invalid promotion code.');
      }
    } catch {
      setMessage('Failed to validate promo code.');
    }
  };

  const lookupGiftCardCode = async () => {
    if (!giftCardCodeInput) return;
    try {
      const res = await api.get(`/gift-cards/lookup/${giftCardCodeInput}`);
      setGiftCardBalanceInfo(`Card Balance: $${res.data.currentBalance.toFixed(2)} (${res.data.status})`);
    } catch (err: any) {
      setGiftCardBalanceInfo(err.response?.data?.error || 'Gift card not found');
    }
  };

  const processOrderPayment = async () => {
    if (!payTargetOrder) return;
    try {
      const payload: any = {
        payments: [
          {
            method: payMethod,
            amount: payTargetOrder.total,
            reference: payMethod === 'gift_card' ? giftCardCodeInput : undefined,
          },
        ],
      };
      await api.post(`/payments/orders/${payTargetOrder._id}/payments`, payload);
      setMessage(`Payment of $${payTargetOrder.total.toFixed(2)} (${payMethod.replace('_', ' ')}) recorded successfully.`);
      setShowPaymentModal(false);
      setPayTargetOrder(null);
      setGiftCardCodeInput('');
      setGiftCardBalanceInfo('');
      await loadPosData();
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Payment failed.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Front of house</p><h2 className="mt-1 text-3xl font-bold text-slate-950">Point of Sale</h2></div>{message && <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}</div>
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap gap-3"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products or SKU" className="min-w-56 flex-1 rounded border border-slate-300 px-3 py-2" /><select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded border border-slate-300 px-3 py-2"><option value="all">All categories</option>{categories.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visibleProducts.map((product) => { const productVariants = variants.filter((variant) => variant.product === product._id); return <div key={product._id} className="rounded-lg border border-slate-200 p-3"><button onClick={() => addProduct(product)} className="w-full text-left"><p className="font-semibold">{product.name}</p><p className="text-xs text-slate-500">{product.sku}</p><p className="mt-2 font-bold text-emerald-700">${product.sellingPrice.toFixed(2)}</p></button>{productVariants.length > 0 && <select onChange={(event) => { const variant = productVariants.find((item) => item._id === event.target.value); if (variant) addProduct(product, variant); event.currentTarget.value = ''; }} className="mt-3 w-full rounded border border-slate-200 px-2 py-1 text-xs"><option value="">Add variant...</option>{productVariants.map((variant) => <option key={variant._id} value={variant._id}>{variant.name} - ${variant.sellingPrice.toFixed(2)}</option>)}</select>}</div>; })}{!visibleProducts.length && <p className="col-span-full py-10 text-center text-slate-500">No matching products.</p>}</div>
        </section>
        <aside className="rounded-xl bg-slate-950 p-5 text-white shadow-sm">
          <div className="flex items-center justify-between"><h3 className="text-xl font-semibold">Current order</h3><span className="text-xs uppercase tracking-wider text-emerald-300">{orderTypeLabels[orderType]}</span></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2"><select value={orderType} onChange={(event) => setOrderType(event.target.value as keyof typeof orderTypeLabels)} className="rounded bg-white/10 px-2 py-2 text-sm"><option value="dine_in" className="text-slate-950">Dine-In</option><option value="take_away" className="text-slate-950">Take Away</option><option value="delivery" className="text-slate-950">Delivery</option><option value="mobile_van" className="text-slate-950">Mobile / Van</option></select><select value={customer} onChange={(event) => setCustomer(event.target.value)} className="rounded bg-white/10 px-2 py-2 text-sm"><option value="" className="text-slate-950">Customer</option>{customers.map((item) => <option key={item._id} value={item._id} className="text-slate-950">{item.name}</option>)}</select><select value={table} onChange={(event) => setTable(event.target.value)} className="rounded bg-white/10 px-2 py-2 text-sm"><option value="" className="text-slate-950">Table</option>{tables.filter((item) => item.status !== 'inactive').map((item) => <option key={item._id} value={item._id} className="text-slate-950">{item.name} ({item.status})</option>)}</select><select value={waiter} onChange={(event) => setWaiter(event.target.value)} className="rounded bg-white/10 px-2 py-2 text-sm"><option value="" className="text-slate-950">Waiter</option>{waiters.map((item) => <option key={item._id} value={item._id} className="text-slate-950">{item.firstName} {item.lastName}</option>)}</select></div>

          {/* Customer CRM Badge */}
          {selectedCustomerDetail && (
            <div className="mt-3 p-3 bg-white/10 rounded-lg border border-white/10 text-xs space-y-1">
              <div className="flex justify-between font-semibold">
                <span className="text-indigo-300">{selectedCustomerDetail.name}</span>
                <span className="text-emerald-400">Credit: ${selectedCustomerDetail.creditBalance?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Loyalty: {selectedCustomerDetail.loyaltyPoints || 0} pts</span>
                {selectedCustomerDetail.customerGroup && (
                  <span className="text-amber-300">Group: {selectedCustomerDetail.customerGroup.name} ({selectedCustomerDetail.customerGroup.discountPercentage}%)</span>
                )}
              </div>
            </div>
          )}

          <div className="mt-5 space-y-3">{cart.map((item, index) => <div key={`${item.product._id}-${item.variant?._id ?? 'base'}`} className="border-b border-white/10 pb-3"><div className="flex items-start justify-between gap-2"><div><p className="font-medium">{item.variant ? `${item.product.name} / ${item.variant.name}` : item.product.name}</p><p className="text-xs text-slate-400">${(item.variant?.sellingPrice ?? item.product.sellingPrice).toFixed(2)}</p></div><button onClick={() => setCart((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-xs text-rose-300">Remove</button></div><div className="mt-2 flex gap-2"><input type="number" min="1" value={item.quantity} onChange={(event) => setCart((current) => current.map((currentItem, itemIndex) => itemIndex === index ? { ...currentItem, quantity: Number(event.target.value) } : currentItem))} className="w-16 rounded bg-white/10 px-2 py-1" /><input value={item.notes} onChange={(event) => setCart((current) => current.map((currentItem, itemIndex) => itemIndex === index ? { ...currentItem, notes: event.target.value } : currentItem))} placeholder="Item note" className="min-w-0 flex-1 rounded bg-white/10 px-2 py-1 text-sm" /></div><div className="mt-2 flex flex-wrap gap-1">{modifiers.filter((modifier) => !modifier.product || modifier.product === item.product._id).map((modifier) => <button key={modifier._id} onClick={() => setCart((current) => current.map((currentItem, itemIndex) => itemIndex === index ? { ...currentItem, modifiers: currentItem.modifiers.some((selected) => selected._id === modifier._id) ? currentItem.modifiers.filter((selected) => selected._id !== modifier._id) : [...currentItem.modifiers, modifier] } : currentItem))} className={`rounded px-2 py-1 text-xs ${item.modifiers.some((selected) => selected._id === modifier._id) ? 'bg-emerald-400 text-emerald-950' : 'bg-white/10 text-slate-300'}`}>{modifier.name} +${modifier.price.toFixed(2)}</button>)}</div></div>)}</div>

          {/* Promo Code Input */}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="Promo Code"
              value={promoCodeInput}
              onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
              className="flex-1 rounded bg-white/10 px-2 py-1 text-xs font-mono uppercase"
            />
            <button onClick={applyPromoCode} className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-xs font-semibold rounded">
              Apply
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2"><select value={discountType} onChange={(event) => setDiscountType(event.target.value as 'fixed' | 'percentage')} className="rounded bg-white/10 px-2 py-2 text-xs"><option value="fixed" className="text-slate-950">Discount $</option><option value="percentage" className="text-slate-950">Discount %</option></select><input value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} type="number" min="0" className="rounded bg-white/10 px-2 py-2 text-xs" placeholder="Value" /><input value={taxRate} onChange={(event) => setTaxRate(event.target.value)} type="number" min="0" max="100" className="rounded bg-white/10 px-2 py-2 text-xs" placeholder="Tax %" /><input value={serviceChargeRate} onChange={(event) => setServiceChargeRate(event.target.value)} type="number" min="0" max="100" className="col-span-3 rounded bg-white/10 px-2 py-2 text-xs" placeholder="Service charge %" /></div>
          <div className="mt-5 space-y-1 border-t border-white/10 pt-4 text-sm"><div className="flex justify-between text-slate-300"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div><div className="flex justify-between text-slate-300"><span>Tax / service</span><span>${(tax + serviceCharge).toFixed(2)}</span></div><div className="flex justify-between text-lg font-bold"><span>Total</span><span>${total.toFixed(2)}</span></div></div>
          <div className="mt-5 grid grid-cols-2 gap-2"><button onClick={() => submitOrder(true)} className="rounded border border-white/20 px-3 py-2 text-sm">Hold order</button><button onClick={() => submitOrder(false)} className="rounded bg-emerald-400 px-3 py-2 font-semibold text-emerald-950">Create order</button></div>
        </aside>
      </div>

      {/* POS Order & Receipt History Table */}
      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h3 className="font-semibold">Order history</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2">Order</th>
                <th className="py-2">Type</th>
                <th className="py-2">Status</th>
                <th className="py-2">Total</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id} className="border-t border-slate-100">
                  <td className="py-3 font-medium">{order.orderNumber}</td>
                  <td className="py-3">{orderTypeLabels[order.type as keyof typeof orderTypeLabels] ?? order.type}</td>
                  <td className="py-3 capitalize">{order.status}</td>
                  <td className="py-3">${order.total.toFixed(2)}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      {(order.status === 'held' || order.status === 'open') && <button onClick={() => editOrder(order._id)} className="text-slate-700">Edit</button>}
                      {order.status === 'held' && <button onClick={() => updateOrder(`/pos/orders/${order._id}/resume`)} className="text-emerald-700">Resume</button>}
                      {order.status === 'open' && (
                        <>
                          <button onClick={() => { setPayTargetOrder(order); setShowPaymentModal(true); }} className="text-emerald-700 font-semibold">Pay</button>
                          <button onClick={() => updateOrder(`/pos/orders/${order._id}/void`, { reason: 'Voided from POS' })} className="text-rose-700">Void</button>
                        </>
                      )}
                      {order.status === 'completed' && <button onClick={() => updateOrder(`/pos/orders/${order._id}/refund`, { reason: 'Refunded from POS' })} className="text-rose-700">Refund</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* POS MULTI-METHOD PAYMENT MODAL */}
      {showPaymentModal && payTargetOrder && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 text-slate-900">
            <h3 className="text-lg font-bold text-slate-900">Pay Order: {payTargetOrder.orderNumber}</h3>
            <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center">
              <span className="text-sm text-slate-500">Order Total Amount</span>
              <span className="text-xl font-bold text-emerald-600">${payTargetOrder.total.toFixed(2)}</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Select Payment Method</label>
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as any)} className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="store_credit">Customer Store Credit</option>
                <option value="gift_card">Gift Card</option>
              </select>
            </div>

            {payMethod === 'gift_card' && (
              <div className="space-y-2 border p-3 rounded-lg bg-indigo-50/50 border-indigo-100">
                <label className="text-xs font-semibold text-slate-500 uppercase">Gift Card Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="GC-XXXX-XXXX"
                    value={giftCardCodeInput}
                    onChange={(e) => setGiftCardCodeInput(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-1.5 border rounded-lg text-sm font-mono uppercase"
                  />
                  <button type="button" onClick={lookupGiftCardCode} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg">Check</button>
                </div>
                {giftCardBalanceInfo && <p className="text-xs font-semibold text-indigo-700">{giftCardBalanceInfo}</p>}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 border text-slate-600 rounded-lg text-sm">Cancel</button>
              <button type="button" onClick={processOrderPayment} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold">Confirm Payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

