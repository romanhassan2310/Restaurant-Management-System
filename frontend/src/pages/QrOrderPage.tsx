import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../services/api';

interface Category { _id: string; name: string; }
interface Product { _id: string; name: string; sellingPrice: number; category: string | { _id: string }; }
interface Variant { _id: string; product: string; name: string; sellingPrice: number; }
interface Modifier { _id: string; product?: string; name: string; price: number; }
interface CartItem { product: Product; variant?: Variant; modifiers: Modifier[]; quantity: number; }
interface Menu { table: { id: string; name: string; status: string }; categories: Category[]; products: Product[]; variants: Variant[]; modifiers: Modifier[]; }

export default function QrOrderPage() {
  const { token = '' } = useParams();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [category, setCategory] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [status, setStatus] = useState('');
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => { api.get(`/qr/${token}/menu`).then((response) => setMenu(response.data.data)).catch(() => setMessage('This table QR code is invalid or inactive.')); }, [token]);
  useEffect(() => {
    if (!orderId) return undefined;
    const url = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
    const socket = io(url, { auth: { qrToken: token } });
    socket.on('connect', () => socket.emit('join:qr-order', orderId, token));
    socket.on('kitchen:status-changed', (event: { orderId: string; status: string }) => { if (event.orderId === orderId) setStatus(event.status); });
    const poll = window.setInterval(() => api.get(`/qr/${token}/orders/${orderId}`).then((response) => setStatus(response.data.data.order.status)).catch(() => undefined), 10000);
    return () => { window.clearInterval(poll); socket.disconnect(); };
  }, [orderId, token]);

  const products = useMemo(() => menu?.products.filter((product) => category === 'all' || (typeof product.category === 'string' ? product.category : product.category._id) === category) ?? [], [menu, category]);
  const total = cart.reduce((sum, item) => sum + item.quantity * ((item.variant?.sellingPrice ?? item.product.sellingPrice) + item.modifiers.reduce((modifierSum, modifier) => modifierSum + modifier.price, 0)), 0);
  const add = (product: Product, variant?: Variant) => setCart((current) => [...current, { product, variant, modifiers: [], quantity: 1 }]);
  const [customerEmail, setCustomerEmail] = useState('');
  const [promoCode, setPromoCode] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const response = await api.post(`/qr/${token}/orders`, {
        customerName,
        customerPhone,
        customerEmail: customerEmail || undefined,
        promoCode: promoCode || undefined,
        items: cart.map((item) => ({ product: item.product._id, variant: item.variant?._id, quantity: item.quantity, modifiers: item.modifiers.map((modifier) => modifier._id) })),
      });
      setOrderId(response.data.data.order._id);
      setStatus(response.data.data.order.status);
      setCart([]);
      setMessage('Order sent to the kitchen! You have been enrolled in our Loyalty & Lead Perks.');
    } catch { setMessage('Order could not be submitted. Please check your details and try again.'); }
  };

  if (!menu) return <main className="min-h-screen bg-slate-100 p-6"><div className="mx-auto max-w-xl rounded-xl bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-bold">Restaurant ordering</h1><p className="mt-3 text-slate-500">{message || 'Loading menu...'}</p></div></main>;
  return <main className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-8"><div className="mx-auto max-w-6xl"><header className="rounded-xl bg-slate-950 p-6 text-white"><p className="text-sm uppercase tracking-wider text-emerald-300">Table ordering</p><h1 className="mt-1 text-3xl font-bold">{menu.table.name}</h1><p className="mt-2 text-slate-300">Browse the menu and send your order to the kitchen.</p></header>{message && <p className="mt-4 rounded bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}{orderId && <div className="mt-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><p className="text-sm text-slate-500">Order tracking</p><p className="mt-1 text-xl font-bold capitalize">{status.replace('_', ' ')}</p></div>}<div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]"><section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="flex flex-wrap gap-2">{[...menu.categories].map((item) => <button key={item._id} onClick={() => setCategory(item._id)} className={`rounded-full px-3 py-2 text-sm ${category === item._id ? 'bg-slate-950 text-white' : 'bg-slate-100'}`}>{item.name}</button>)}<button onClick={() => setCategory('all')} className={`rounded-full px-3 py-2 text-sm ${category === 'all' ? 'bg-slate-950 text-white' : 'bg-slate-100'}`}>All</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{products.map((product) => { const variants = menu.variants.filter((variant) => variant.product === product._id); const modifiers = menu.modifiers.filter((modifier) => !modifier.product || modifier.product === product._id); return <article key={product._id} className="rounded-lg border border-slate-200 p-4"><button onClick={() => add(product)} className="text-left"><h2 className="font-semibold">{product.name}</h2><p className="mt-2 font-bold text-emerald-700">${product.sellingPrice.toFixed(2)}</p></button>{variants.length > 0 && <select onChange={(event) => { const variant = variants.find((item) => item._id === event.target.value); if (variant) add(product, variant); event.currentTarget.value = ''; }} className="mt-3 w-full rounded border border-slate-200 px-2 py-2 text-sm"><option value="">Choose variant</option>{variants.map((variant) => <option key={variant._id} value={variant._id}>{variant.name} · ${variant.sellingPrice.toFixed(2)}</option>)}</select>}{modifiers.length > 0 && <p className="mt-2 text-xs text-slate-500">Modifiers available after adding</p>}</article>; })}</div></section><aside className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><h2 className="text-xl font-bold">Your order</h2><div className="mt-4 space-y-3">{cart.map((item, index) => <div key={index} className="flex justify-between border-b border-slate-100 pb-3 text-sm"><span>{item.quantity} × {item.variant ? `${item.product.name} / ${item.variant.name}` : item.product.name}</span><button onClick={() => setCart((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-rose-700">Remove</button></div>)}</div><p className="mt-5 flex justify-between text-lg font-bold"><span>Total</span><span>${total.toFixed(2)}</span></p><form onSubmit={submit} className="mt-5 space-y-3">
  <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Your name" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" required />
  <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Phone number" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" required />
  <input value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="Email (optional for rewards)" type="email" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
  <input value={promoCode} onChange={(event) => setPromoCode(event.target.value.toUpperCase())} placeholder="Promo Code (optional)" className="w-full rounded border border-slate-300 px-3 py-2 text-sm font-mono uppercase" />
  <button disabled={!cart.length || !!orderId} className="w-full rounded bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-50 text-sm">Send order</button>
</form></aside></div></div></main>;
}
