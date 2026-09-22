import { FormEvent, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';

interface Floor { _id: string; name: string; }
interface Table { _id: string; name: string; capacity: number; status: string; section?: string; guestCount: number; assignedWaiter?: { firstName: string; lastName: string }; floor: { name: string }; }
interface Customer { _id: string; name: string; }
interface Reservation { _id: string; date: string; time: string; guestCount: number; status: string; customer: { name: string }; table?: { name: string }; }
interface Waitlist { _id: string; guestCount: number; status: string; customer: { name: string }; }

export default function TablesPage() {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [waitlist, setWaitlist] = useState<Waitlist[]>([]);
  const [message, setMessage] = useState('');
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [reservation, setReservation] = useState({ customer: '', date: new Date().toISOString().slice(0, 10), time: '19:00', guestCount: '2' });

  const load = async () => {
    const [floorResponse, tableResponse, customerResponse, reservationResponse, waitlistResponse] = await Promise.all([
      api.get('/tables/floors'), api.get('/tables'), api.get('/pos/customers'), api.get('/tables/reservations'), api.get('/tables/waitlist'),
    ]);
    setFloors(floorResponse.data.data); setTables(tableResponse.data.data); setCustomers(customerResponse.data.data); setReservations(reservationResponse.data.data); setWaitlist(waitlistResponse.data.data);
  };

  useEffect(() => {
    load().catch(() => setMessage('Unable to load table data.'));
    const url = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
    const socket = io(url, { auth: { token: localStorage.getItem('accessToken') } });
    socket.on('table:updated', () => load().catch(() => setMessage('Table refresh failed.')));
    return () => { socket.disconnect(); };
  }, []);

  const changeStatus = async (table: Table, status: string) => {
    try { await api.patch(`/tables/${table._id}/status`, { status }); } catch { setMessage('Table status update failed.'); }
  };

  const generateQr = async (table: Table) => {
    try { const response = await api.post(`/tables/${table._id}/qr`); setQrImages((current) => ({ ...current, [table._id]: response.data.data.qrDataUrl })); } catch { setMessage('QR generation failed.'); }
  };

  const createReservation = async (event: FormEvent) => {
    event.preventDefault();
    try { await api.post('/tables/reservations', { ...reservation, guestCount: Number(reservation.guestCount), date: new Date(`${reservation.date}T00:00:00.000Z`).toISOString() }); setMessage('Reservation created.'); await load(); } catch { setMessage('Reservation could not be created.'); }
  };

   return <div className="space-y-6"><div><p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Front of house</p><h2 className="mt-1 text-3xl font-bold">Tables & reservations</h2></div>{message && <p className="text-sm text-rose-700">{message}</p>}<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{tables.map((table) => <article key={table._id} className={`rounded-xl bg-white p-4 shadow-sm ring-2 ${table.status === 'available' ? 'ring-emerald-200' : table.status === 'occupied' ? 'ring-rose-200' : table.status === 'reserved' ? 'ring-amber-200' : 'ring-slate-200'}`}><div className="flex items-start justify-between"><div><h3 className="text-xl font-bold">{table.name}</h3><p className="text-sm text-slate-500">{table.floor?.name} · {table.section ?? 'Main'} · {table.capacity} seats</p></div><span className="text-xs font-semibold capitalize">{table.status}</span></div><p className="mt-4 text-sm">Guests: <strong>{table.guestCount}</strong>{table.assignedWaiter && ` · ${table.assignedWaiter.firstName} ${table.assignedWaiter.lastName}`}</p><select value={table.status} onChange={(event) => changeStatus(table, event.target.value)} className="mt-4 w-full rounded border border-slate-200 px-2 py-2 text-sm"><option value="available">Available</option><option value="reserved">Reserved</option><option value="occupied">Occupied</option><option value="cleaning">Cleaning</option></select><button onClick={() => generateQr(table)} className="mt-2 w-full rounded bg-slate-950 px-3 py-2 text-sm font-semibold text-white">Generate table QR</button>{qrImages[table._id] && <img src={qrImages[table._id]} alt={`QR code for ${table.name}`} className="mx-auto mt-3 h-32 w-32" />}</article>)}</section><div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]"><form onSubmit={createReservation} className="rounded-xl bg-slate-950 p-5 text-white"><h3 className="font-semibold">New reservation</h3><div className="mt-4 space-y-3"><select value={reservation.customer} onChange={(event) => setReservation({ ...reservation, customer: event.target.value })} className="w-full rounded bg-white/10 px-3 py-2" required><option value="" className="text-slate-950">Customer</option>{customers.map((customer) => <option key={customer._id} value={customer._id} className="text-slate-950">{customer.name}</option>)}</select><div className="grid grid-cols-2 gap-2"><input type="date" value={reservation.date} onChange={(event) => setReservation({ ...reservation, date: event.target.value })} className="rounded bg-white/10 px-3 py-2" required /><input type="time" value={reservation.time} onChange={(event) => setReservation({ ...reservation, time: event.target.value })} className="rounded bg-white/10 px-3 py-2" required /></div><input type="number" min="1" value={reservation.guestCount} onChange={(event) => setReservation({ ...reservation, guestCount: event.target.value })} className="w-full rounded bg-white/10 px-3 py-2" required /><button className="w-full rounded bg-emerald-400 px-4 py-2 font-semibold text-emerald-950">Create reservation</button></div></form><section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><h3 className="font-semibold">Reservation history</h3><div className="mt-3 divide-y divide-slate-100">{reservations.map((item) => <div key={item._id} className="flex justify-between py-3 text-sm"><span>{item.customer.name} · {item.date.slice(0, 10)} {item.time} · {item.guestCount} guests</span><span className="capitalize text-slate-500">{item.status}</span></div>)}</div></section></div><section className="rounded-xl bg-amber-50 p-5 ring-1 ring-amber-100"><h3 className="font-semibold text-amber-950">Waitlist</h3><div className="mt-3 flex flex-wrap gap-3">{waitlist.map((item) => <span key={item._id} className="rounded-full bg-white px-3 py-2 text-sm text-amber-900">{item.customer.name} · {item.guestCount} guests</span>)}{!waitlist.length && <p className="text-sm text-amber-800">No guests waiting.</p>}</div></section></div>;
}
