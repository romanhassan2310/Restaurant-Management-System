import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import api from '../services/api';

interface KitchenOrder { _id: string; order: string | { _id: string }; orderNumber: string; orderType: string; status: string; priority: number; receivedAt: string; startedAt?: string; preparationSeconds?: number; table?: { name: string }; items: Array<{ name: string; quantity: number; modifiers: string[]; notes?: string }>; }
const statuses = ['new', 'pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'];
const nextStatus: Record<string, string | undefined> = { new: 'pending', pending: 'preparing', preparing: 'ready', ready: 'served', served: 'completed' };

function elapsed(order: KitchenOrder): string {
  const start = order.startedAt ? new Date(order.startedAt).getTime() : new Date(order.receivedAt).getTime();
  const seconds = Math.max(0, Math.floor((Date.now() - start) / 1000));
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [clock, setClock] = useState(Date.now());
  const [message, setMessage] = useState('');

  const load = async () => {
    const response = await api.get('/kitchen/orders');
    setOrders(response.data.data);
  };

  useEffect(() => {
    load().catch(() => setMessage('Unable to load kitchen orders.'));
    const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
    const socket: Socket = io(socketUrl, { auth: { token: localStorage.getItem('accessToken') } });
    socket.on('connect', () => socket.emit('join:kitchen'));
    socket.on('kitchen:order-created', (order: KitchenOrder) => setOrders((current) => current.some((item) => item._id === order._id) ? current : [order, ...current]));
    socket.on('kitchen:status-changed', (event: KitchenOrder & { orderId: string }) => setOrders((current) => current.map((item) => item._id === event._id ? { ...item, status: event.status, priority: event.priority, preparationSeconds: event.preparationSeconds, startedAt: event.startedAt } : item)));
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => { window.clearInterval(timer); socket.disconnect(); };
  }, []);

  const changeStatus = async (order: KitchenOrder, status: string) => {
    try { await api.patch(`/kitchen/orders/${order._id}/status`, { status }); } catch { setMessage('Status update failed.'); }
  };

  const changePriority = async (order: KitchenOrder, priority: number) => {
    try { await api.patch(`/kitchen/orders/${order._id}/priority`, { priority }); } catch { setMessage('Priority update failed.'); }
  };

  return <div className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Kitchen display</p><h2 className="mt-1 text-3xl font-bold">Production queue</h2></div><button onClick={() => load().catch(() => setMessage('Refresh failed.'))} className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Refresh</button></div>{message && <p className="text-sm text-rose-700">{message}</p>}<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{orders.filter((order) => !['completed', 'cancelled'].includes(order.status)).map((order) => <article key={order._id} className={`rounded-xl bg-white p-5 shadow-sm ring-1 ${order.priority >= 80 ? 'ring-rose-300' : 'ring-slate-200'}`}><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{order.orderNumber}</h3><p className="text-xs uppercase tracking-wide text-slate-500">{order.orderType.replace('_', ' ')} {order.table?.name ? `· ${order.table.name}` : ''}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold capitalize">{order.status}</span></div><div className="mt-4 space-y-3">{order.items.map((item, index) => <div key={index} className="border-t border-slate-100 pt-3"><div className="flex justify-between font-medium"><span>{item.quantity} × {item.name}</span></div>{item.modifiers.length > 0 && <p className="text-xs text-slate-500">{item.modifiers.join(', ')}</p>}{item.notes && <p className="text-xs font-medium text-amber-700">Note: {item.notes}</p>}</div>)}</div><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3"><span className={`font-mono text-lg ${clock ? 'text-slate-900' : ''}`}>{elapsed(order)}</span><select value={order.priority} onChange={(event) => changePriority(order, Number(event.target.value))} className="rounded border border-slate-200 px-2 py-1 text-xs"><option value="20">Low</option><option value="50">Normal</option><option value="80">High</option><option value="100">Urgent</option></select></div>{nextStatus[order.status] && <button onClick={() => changeStatus(order, nextStatus[order.status]!)} className="mt-4 w-full rounded bg-slate-950 px-4 py-2 font-semibold capitalize text-white">Mark {nextStatus[order.status]}</button>}{!['completed', 'cancelled'].includes(order.status) && <button onClick={() => changeStatus(order, 'cancelled')} className="mt-2 w-full rounded border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700">Cancel ticket</button>}</article>)}{!orders.filter((order) => !['completed', 'cancelled'].includes(order.status)).length && <p className="col-span-full rounded-xl bg-white p-10 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">Kitchen queue is clear.</p>}</div></div>;
}
