import { useEffect, useState } from 'react';
import api from '../services/api';

export default function GiftCardsPage() {
  const [giftCards, setGiftCards] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({ code: '', initialBalance: 50, purchaserName: '', recipientName: '', recipientEmail: '', notes: '' });

  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [cardHistory, setCardHistory] = useState<any[]>([]);

  const fetchGiftCards = async () => {
    try {
      const res = await api.get('/gift-cards', { params: { status: statusFilter || undefined, search: search || undefined } });
      setGiftCards(res.data.giftCards || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchGiftCards();
  }, [statusFilter, search]);

  const handleIssueGiftCard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/gift-cards/issue', {
        code: issueForm.code || undefined,
        initialBalance: Number(issueForm.initialBalance),
        purchaserName: issueForm.purchaserName || undefined,
        recipientName: issueForm.recipientName || undefined,
        recipientEmail: issueForm.recipientEmail || undefined,
        notes: issueForm.notes || undefined,
      });
      setShowIssueModal(false);
      setIssueForm({ code: '', initialBalance: 50, purchaserName: '', recipientName: '', recipientEmail: '', notes: '' });
      fetchGiftCards();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const inspectCard = async (card: any) => {
    setSelectedCard(card);
    try {
      const res = await api.get(`/gift-cards/${card._id}/history`);
      setCardHistory(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gift Cards Management</h2>
          <p className="text-sm text-slate-500">Issue, track balances, check expiry, and view full redemption history</p>
        </div>
        <button onClick={() => setShowIssueModal(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm text-sm">
          + Issue New Gift Card
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by code, purchaser or recipient..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg w-full max-w-md text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="fully_redeemed">Fully Redeemed</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                <th className="p-4">Card Code</th>
                <th className="p-4">Recipient</th>
                <th className="p-4">Current Balance</th>
                <th className="p-4">Initial Value</th>
                <th className="p-4">Status</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {giftCards.map((gc) => (
                <tr key={gc._id} className="hover:bg-slate-50 transition">
                  <td className="p-4">
                    <span className="font-mono font-bold text-indigo-700 text-sm bg-indigo-50 px-2 py-1 rounded border border-indigo-100">{gc.code}</span>
                  </td>
                  <td className="p-4 text-slate-800 font-medium">{gc.recipientName || 'Unassigned'}</td>
                  <td className="p-4 font-bold text-emerald-600">${gc.currentBalance.toFixed(2)}</td>
                  <td className="p-4 text-slate-500">${gc.initialBalance.toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${
                      gc.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      gc.status === 'fully_redeemed' ? 'bg-slate-100 text-slate-600' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {gc.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    <button onClick={() => inspectCard(gc)} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded">
                      History
                    </button>
                  </td>
                </tr>
              ))}
              {giftCards.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">No gift cards found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Card Details & Audit View */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {selectedCard ? (
            <div className="space-y-6">
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">Selected Gift Card</span>
                <h3 className="text-2xl font-mono font-bold text-indigo-600">{selectedCard.code}</h3>
                <p className="text-sm text-slate-500">Purchaser: {selectedCard.purchaserName || 'N/A'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Remaining Balance</span>
                  <div className="text-lg font-bold text-emerald-600">${selectedCard.currentBalance.toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Status</span>
                  <div className="text-sm font-bold capitalize text-slate-800">{selectedCard.status.replace('_', ' ')}</div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-2">Redemption History</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {cardHistory.map((tx) => (
                    <div key={tx._id} className="text-xs p-2.5 bg-slate-50 rounded border border-slate-100 flex justify-between items-center">
                      <div>
                        <div className="font-semibold capitalize text-slate-800">{tx.type}</div>
                        <div className="text-slate-400">{new Date(tx.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="font-bold text-slate-900">
                        {tx.type === 'redemption' ? `-$${tx.amount.toFixed(2)}` : `+$${tx.amount.toFixed(2)}`}
                      </div>
                    </div>
                  ))}
                  {cardHistory.length === 0 && <div className="text-xs text-slate-400">No transactions recorded.</div>}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-sm">Select a gift card to inspect balance and redemption history.</div>
          )}
        </div>
      </div>

      {/* ISSUE GIFT CARD MODAL */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleIssueGiftCard} className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Issue Gift Card</h3>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Custom Code (Leave blank for auto-generation)</label>
              <input type="text" placeholder="e.g. GC-GIFT-2026" value={issueForm.code} onChange={(e) => setIssueForm({ ...issueForm, code: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1 font-mono uppercase" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Initial Balance ($)</label>
              <input type="number" min="1" required value={issueForm.initialBalance} onChange={(e) => setIssueForm({ ...issueForm, initialBalance: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Purchaser Name</label>
                <input type="text" value={issueForm.purchaserName} onChange={(e) => setIssueForm({ ...issueForm, purchaserName: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Recipient Name</label>
                <input type="text" value={issueForm.recipientName} onChange={(e) => setIssueForm({ ...issueForm, recipientName: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button type="button" onClick={() => setShowIssueModal(false)} className="px-4 py-2 border text-slate-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Issue Card</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
