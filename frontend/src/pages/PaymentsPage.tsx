import { useEffect, useState } from 'react';
import api from '../services/api';

interface Payment { _id: string; method: string; groupType: string; amount: number; status: string; order?: { orderNumber: string }; createdAt: string; }
interface Invoice { _id: string; invoiceNumber: string; customerName?: string; total: number; paymentTotal: number; issuedAt: string; }

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([api.get('/payments'), api.get('/payments/invoices')]).then(([paymentResponse, invoiceResponse]) => {
      setPayments(paymentResponse.data.data);
      setInvoices(invoiceResponse.data.data);
    }).catch(() => setMessage('Unable to load financial history.'));
  }, []);

  return <div className="space-y-6"><div><p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Finance</p><h2 className="mt-1 text-3xl font-bold">Payments & invoices</h2></div>{message && <p className="text-sm text-rose-700">{message}</p>}<section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><h3 className="font-semibold">Payment history</h3><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-2">Order</th><th className="py-2">Method</th><th className="py-2">Type</th><th className="py-2">Amount</th><th className="py-2">Status</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment._id} className="border-t border-slate-100"><td className="py-3">{payment.order?.orderNumber ?? '-'}</td><td className="py-3 capitalize">{payment.method.replace('_', ' ')}</td><td className="py-3 capitalize">{payment.groupType}</td><td className="py-3 font-semibold">${payment.amount.toFixed(2)}</td><td className="py-3 capitalize">{payment.status.replace('_', ' ')}</td></tr>)}</tbody></table></div></section><section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><h3 className="font-semibold">Invoice history</h3><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{invoices.map((invoice) => <div key={invoice._id} className="rounded-lg border border-slate-200 p-4"><p className="font-semibold">{invoice.invoiceNumber}</p><p className="mt-1 text-sm text-slate-500">{invoice.customerName ?? 'Walk-in customer'}</p><p className="mt-3 text-lg font-bold">${invoice.total.toFixed(2)}</p><p className="text-xs text-slate-500">Paid ${invoice.paymentTotal.toFixed(2)}</p><a href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/payments/invoices/${invoice._id}/pdf`} className="mt-3 inline-block text-sm font-semibold text-emerald-700">Open PDF</a></div>)}</div></section></div>;
}
