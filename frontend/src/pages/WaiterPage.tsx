import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../services/api';

interface Table { _id: string; name: string; status: string; guestCount: number; section?: string; currentOrder?: { _id: string; orderNumber: string; status: string }; }
interface Product { _id: string; name: string; sellingPrice: number; }

export default function WaiterPage() {
  const navigate = useNavigate();
  const [tables, setTables] = useState<Table[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState('');
  const load = async () => { const [tableResponse, productResponse] = await Promise.all([api.get('/tables'), api.get('/pos/products')]); setTables(tableResponse.data.data); setProducts(productResponse.data.data); };
  useEffect(() => { load().catch(() => setMessage('Unable to load waiter workspace.')); const url = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, ''); const socket = io(url, { auth: { token: localStorage.getItem('accessToken') } }); socket.on('table:updated', () => load().catch(() => setMessage('Refresh failed.'))); socket.on('kitchen:status-changed', () => load().catch(() => setMessage('Order status refresh failed.'))); return () => { socket.disconnect(); }; }, []);
  return <div className="space-y-6"><div><p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Waiter tablet</p><h2 className="mt-1 text-3xl font-bold">My floor</h2></div>{message && <p className="text-sm text-rose-700">{message}</p>}<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{tables.map((table) => <article key={table._id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="flex justify-between"><h3 className="text-xl font-bold">{table.name}</h3><span className="capitalize text-sm text-slate-500">{table.status}</span></div><p className="mt-2 text-sm text-slate-500">{table.guestCount} guests · {table.section ?? 'Main section'}</p>{table.currentOrder ? <div className="mt-4 rounded bg-emerald-50 p-3 text-sm text-emerald-900">{table.currentOrder.orderNumber} · {table.currentOrder.status}</div> : <div className="mt-4 rounded bg-slate-50 p-3 text-sm text-slate-500">Ready for a new table-side order</div>}<button onClick={() => navigate('/pos', { state: { tableId: table._id } })} className="mt-4 w-full rounded bg-slate-950 px-3 py-2 text-sm font-semibold text-white">Open table order</button><div className="mt-2 grid grid-cols-2 gap-2">{products.slice(0, 2).map((product) => <button key={product._id} onClick={() => setMessage(`Select ${product.name} in the POS composer for ${table.name}.`)} className="rounded border border-slate-200 px-2 py-2 text-xs text-slate-700">{product.name}</button>)}</div></article>)}</section></div>;
}
