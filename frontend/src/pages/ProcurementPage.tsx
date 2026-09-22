import { FormEvent, useEffect, useState } from 'react';
import api from '../services/api';

interface Supplier { _id: string; name: string; code: string; balance: number; paymentTermsDays: number; }
interface Product { _id: string; name: string; sku: string; }
interface PurchaseOrder { _id: string; orderNumber: string; status: string; total: number; supplier: { name: string }; items: Array<{ product: string; quantity: number; receivedQuantity: number; unitCost: number }>; }

export default function ProcurementPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [supplier, setSupplier] = useState('');
  const [product, setProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    const [supplierResponse, productResponse, orderResponse] = await Promise.all([api.get('/purchases/suppliers'), api.get('/inventory/products'), api.get('/purchases/orders')]);
    setSuppliers(supplierResponse.data.data); setProducts(productResponse.data.data); setOrders(orderResponse.data.data);
    if (!supplier && supplierResponse.data.data[0]) setSupplier(supplierResponse.data.data[0]._id);
    if (!product && productResponse.data.data[0]) setProduct(productResponse.data.data[0]._id);
  };
  useEffect(() => { load().catch(() => setMessage('Unable to load purchasing data.')); }, []);

  const createOrder = async (event: FormEvent) => {
    event.preventDefault();
    try { await api.post('/purchases/orders', { supplier, items: [{ product, quantity: Number(quantity), unitCost: Number(unitCost) }] }); setMessage('Purchase order created. Stock changes only after receiving.'); setQuantity(''); setUnitCost(''); await load(); } catch { setMessage('Purchase order could not be created.'); }
  };

  const receive = async (order: PurchaseOrder) => {
    const item = order.items.find((candidate) => candidate.quantity > candidate.receivedQuantity);
    if (!item) return;
    try { await api.post('/purchases/receipts', { purchaseOrder: order._id, items: [{ product: item.product, quantity: item.quantity - item.receivedQuantity }] }); setMessage(`Goods received for ${order.orderNumber}.`); await load(); } catch { setMessage('Goods receipt failed.'); }
  };

  return <div className="space-y-6"><div><p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Procurement</p><h2 className="mt-1 text-3xl font-bold">Suppliers & purchases</h2></div>{message && <p className="rounded bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}<div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]"><form onSubmit={createOrder} className="rounded-xl bg-slate-950 p-5 text-white"><h3 className="font-semibold">Create purchase order</h3><div className="mt-4 space-y-3"><select value={supplier} onChange={(event) => setSupplier(event.target.value)} className="w-full rounded bg-white/10 px-3 py-2" required><option value="" className="text-slate-950">Supplier</option>{suppliers.map((item) => <option key={item._id} value={item._id} className="text-slate-950">{item.name} · balance ${item.balance.toFixed(2)}</option>)}</select><select value={product} onChange={(event) => setProduct(event.target.value)} className="w-full rounded bg-white/10 px-3 py-2" required>{products.map((item) => <option key={item._id} value={item._id} className="text-slate-950">{item.name} · {item.sku}</option>)}</select><input type="number" min="0.001" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Quantity" className="w-full rounded bg-white/10 px-3 py-2" required /><input type="number" min="0" step="0.01" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} placeholder="Unit cost" className="w-full rounded bg-white/10 px-3 py-2" required /><button className="w-full rounded bg-emerald-400 px-4 py-2 font-semibold text-emerald-950">Create order</button></div></form><section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><h3 className="font-semibold">Purchase orders</h3><div className="mt-3 divide-y divide-slate-100">{orders.map((order) => <div key={order._id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-medium">{order.orderNumber} · {order.supplier.name}</p><p className="text-sm capitalize text-slate-500">{order.status} · ${order.total.toFixed(2)}</p></div>{order.status !== 'received' && order.status !== 'cancelled' && <button onClick={() => receive(order)} className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Receive goods</button>}</div>)}</div></section></div><section className="rounded-xl bg-amber-50 p-5 ring-1 ring-amber-100"><h3 className="font-semibold text-amber-950">Supplier balances</h3><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{suppliers.map((item) => <div key={item._id} className="rounded bg-white p-3"><p className="font-medium">{item.name}</p><p className="mt-1 text-lg font-bold text-amber-900">${item.balance.toFixed(2)}</p><p className="text-xs text-slate-500">Terms: {item.paymentTermsDays} days</p></div>)}</div></section></div>;
}
