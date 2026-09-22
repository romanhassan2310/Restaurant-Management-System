import { FormEvent, useEffect, useState } from 'react';
import api from '../services/api';

interface Shift { _id: string; status: string; openingCash: number; expectedCash: number; actualCash?: number; cashDifference?: number; openedAt: string; }
interface Summary { shift: Shift; transactions: Array<{ type: string; amount: number; method?: string; notes?: string }>; totals: { paymentTotal: number; refundTotal: number; cashIn: number; cashOut: number; cashPayments: number; cashRefunds: number; expectedCash: number }; }

export default function ShiftPage() {
  const [shift, setShift] = useState<Shift | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [openingCash, setOpeningCash] = useState('');
  const [actualCash, setActualCash] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [cashType, setCashType] = useState<'cash_in' | 'cash_out'>('cash_in');
  const [message, setMessage] = useState('');

  const load = async () => {
    const current = await api.get('/shifts/current');
    setShift(current.data.data);
    if (current.data.data) {
      const detail = await api.get(`/shifts/${current.data.data._id}/summary`);
      setSummary(detail.data.data);
    } else setSummary(null);
  };

  useEffect(() => { load().catch(() => setMessage('Unable to load shift data.')); }, []);

  const start = async (event: FormEvent) => {
    event.preventDefault();
    try { await api.post('/shifts/start', { openingCash: Number(openingCash) }); setOpeningCash(''); setMessage('Shift started.'); await load(); } catch { setMessage('Unable to start shift.'); }
  };

  const cashTransaction = async (event: FormEvent) => {
    event.preventDefault();
    if (!shift) return;
    try { await api.post(`/shifts/${shift._id}/cash`, { type: cashType, amount: Number(cashAmount) }); setCashAmount(''); setMessage('Cash transaction recorded.'); await load(); } catch { setMessage('Unable to record cash transaction.'); }
  };

  const close = async (event: FormEvent) => {
    event.preventDefault();
    if (!shift) return;
    try { await api.post(`/shifts/${shift._id}/close`, { actualCash: Number(actualCash), notes: 'Closed from shift workspace' }); setMessage('Shift closed and reconciled.'); await load(); } catch { setMessage('Unable to close shift.'); }
  };

  if (!shift) return <div className="mx-auto max-w-xl rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200"><p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Cash control</p><h2 className="mt-1 text-3xl font-bold">Start POS shift</h2><form onSubmit={start} className="mt-6 flex gap-3"><input type="number" min="0" step="0.01" value={openingCash} onChange={(event) => setOpeningCash(event.target.value)} placeholder="Opening cash" className="flex-1 rounded border border-slate-300 px-3 py-2" required /><button className="rounded bg-slate-950 px-4 py-2 font-semibold text-white">Start shift</button></form>{message && <p className="mt-3 text-sm text-rose-700">{message}</p>}</div>;

  return <div className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Cash control</p><h2 className="mt-1 text-3xl font-bold">Shift management</h2></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">Open</span></div><div className="grid gap-4 sm:grid-cols-3"><div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><p className="text-sm text-slate-500">Opening cash</p><p className="mt-1 text-2xl font-bold">${shift.openingCash.toFixed(2)}</p></div><div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><p className="text-sm text-slate-500">Expected cash</p><p className="mt-1 text-2xl font-bold">${(summary?.totals.expectedCash ?? shift.expectedCash).toFixed(2)}</p></div><div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><p className="text-sm text-slate-500">Cash payments</p><p className="mt-1 text-2xl font-bold">${(summary?.totals.cashPayments ?? 0).toFixed(2)}</p></div></div><div className="grid gap-6 lg:grid-cols-2"><form onSubmit={cashTransaction} className="rounded-xl bg-slate-950 p-5 text-white"><h3 className="font-semibold">Cash movement</h3><div className="mt-4 grid gap-3"><select value={cashType} onChange={(event) => setCashType(event.target.value as 'cash_in' | 'cash_out')} className="rounded bg-white/10 px-3 py-2"><option value="cash_in" className="text-slate-950">Cash in</option><option value="cash_out" className="text-slate-950">Cash out</option></select><input type="number" min="0.01" step="0.01" value={cashAmount} onChange={(event) => setCashAmount(event.target.value)} placeholder="Amount" className="rounded bg-white/10 px-3 py-2" required /><button className="rounded bg-emerald-400 px-4 py-2 font-semibold text-emerald-950">Record movement</button></div></form><form onSubmit={close} className="rounded-xl bg-amber-50 p-5 ring-1 ring-amber-100"><h3 className="font-semibold text-amber-950">Close and reconcile</h3><p className="mt-2 text-sm text-amber-800">Expected cash: ${(summary?.totals.expectedCash ?? 0).toFixed(2)}</p><div className="mt-4 flex gap-3"><input type="number" min="0" step="0.01" value={actualCash} onChange={(event) => setActualCash(event.target.value)} placeholder="Actual cash" className="flex-1 rounded border border-amber-200 px-3 py-2" required /><button className="rounded bg-amber-700 px-4 py-2 font-semibold text-white">Close shift</button></div></form></div><section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><h3 className="font-semibold">Shift transactions</h3><div className="mt-3 divide-y divide-slate-100">{summary?.transactions.map((transaction, index) => <div key={index} className="flex justify-between py-3 text-sm"><span className="capitalize">{transaction.type.replace('_', ' ')} {transaction.method ? `· ${transaction.method}` : ''}</span><span className="font-semibold">${transaction.amount.toFixed(2)}</span></div>)}</div></section>{message && <p className="text-sm text-emerald-700">{message}</p>}</div>;
}
