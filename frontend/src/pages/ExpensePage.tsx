import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Tag,
  CreditCard,
  Building,
  TrendingDown
} from 'lucide-react';
import api from '../services/api';

interface Expense {
  _id: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  paymentMethod: string;
  vendor?: string;
  receiptAttachment?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  approvedBy?: { name: string; email: string };
  createdAt: string;
}

interface ExpenseSummary {
  byCategory: Array<{ _id: string; totalAmount: number; count: number }>;
  totalApproved: number;
  totalPending: number;
}

const ExpensePage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [newExpense, setNewExpense] = useState({
    category: 'Utilities',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: 'cash',
    vendor: '',
    receiptAttachment: '',
  });

  const categories = [
    'Utilities',
    'Rent & Lease',
    'Kitchen Supplies',
    'Maintenance & Repair',
    'Marketing & Ads',
    'Staff Welfare',
    'Software & Subscriptions',
    'Miscellaneous',
  ];

  useEffect(() => {
    fetchExpenses();
    fetchSummary();
  }, [filterCategory, filterStatus]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterCategory) params.category = filterCategory;
      if (filterStatus) params.approvalStatus = filterStatus;

      const res = await api.get('/expenses', { params });
      if (res.data.success) {
        setExpenses(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await api.get('/expenses/summary');
      if (res.data.success) {
        setSummary(res.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching summary:', err);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/expenses', {
        ...newExpense,
        amount: parseFloat(newExpense.amount),
      });

      if (res.data.success) {
        setShowNewModal(false);
        setNewExpense({
          category: 'Utilities',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          description: '',
          paymentMethod: 'cash',
          vendor: '',
          receiptAttachment: '',
        });
        fetchExpenses();
        fetchSummary();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record expense');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await api.post(`/expenses/${id}/approve`);
      if (res.data.success) {
        fetchExpenses();
        fetchSummary();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve expense');
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      const res = await api.post(`/expenses/${id}/reject`, { reason });
      if (res.data.success) {
        fetchExpenses();
        fetchSummary();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject expense');
    }
  };

  return (
    <div className="p-6 bg-slate-900 text-white min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <TrendingDown className="w-8 h-8 text-rose-400" />
            Expense Management
          </h1>
          <p className="text-slate-400 mt-1">Record store operating expenses, attach receipts & manage approvals</p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-lg shadow-rose-900/20"
        >
          <Plus className="w-5 h-5" />
          Record New Expense
        </button>
      </div>

      {/* Metric Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800/80 border border-slate-700/60 p-6 rounded-xl">
            <div className="text-sm text-slate-400 font-medium">Total Approved Expenses</div>
            <div className="text-3xl font-bold text-rose-400 mt-2">${summary.totalApproved.toFixed(2)}</div>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/60 p-6 rounded-xl">
            <div className="text-sm text-slate-400 font-medium">Pending Approvals</div>
            <div className="text-3xl font-bold text-amber-400 mt-2">${summary.totalPending.toFixed(2)}</div>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/60 p-6 rounded-xl">
            <div className="text-sm text-slate-400 font-medium">Top Category</div>
            <div className="text-2xl font-bold text-slate-100 mt-2">
              {summary.byCategory[0]?._id || 'N/A'}{' '}
              <span className="text-sm font-normal text-slate-400">
                (${summary.byCategory[0]?.totalAmount.toFixed(2) || 0})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl mb-6 flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Category</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg text-sm px-3 py-1.5 text-slate-200"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg text-sm px-3 py-1.5 text-slate-200"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading expense logs...</div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No expense logs match current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/70 border-b border-slate-700 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Date</th>
                  <th className="p-4">Category / Vendor</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Method</th>
                  <th className="p-4">Receipt</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-sm">
                {expenses.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-4 text-slate-300 whitespace-nowrap">
                      {new Date(item.date).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-rose-400" />
                        {item.category}
                      </div>
                      {item.vendor && (
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3" />
                          {item.vendor}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-slate-300 max-w-xs truncate">{item.description}</td>
                    <td className="p-4 font-bold text-rose-400 whitespace-nowrap">${item.amount.toFixed(2)}</td>
                    <td className="p-4 text-slate-300 capitalize">{item.paymentMethod.replace('_', ' ')}</td>
                    <td className="p-4">
                      {item.receiptAttachment ? (
                        <a
                          href={item.receiptAttachment}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> View
                        </a>
                      ) : (
                        <span className="text-xs text-slate-500">None</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
                          item.approvalStatus === 'approved'
                            ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                            : item.approvalStatus === 'rejected'
                            ? 'bg-rose-900/60 text-rose-300 border border-rose-700/50'
                            : 'bg-amber-900/60 text-amber-300 border border-amber-700/50'
                        }`}
                      >
                        {item.approvalStatus}
                      </span>
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      {item.approvalStatus === 'pending' ? (
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleApprove(item._id)}
                            className="p-1.5 bg-emerald-600/80 hover:bg-emerald-500 rounded text-white"
                            title="Approve Expense"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(item._id)}
                            className="p-1.5 bg-rose-600/80 hover:bg-rose-500 rounded text-white"
                            title="Reject Expense"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Expense Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Record Operating Expense</h2>
            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Category</label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-rose-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Payment Method</label>
                  <select
                    value={newExpense.paymentMethod}
                    onChange={(e) => setNewExpense({ ...newExpense, paymentMethod: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="check">Check</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Vendor / Payee</label>
                <input
                  type="text"
                  placeholder="e.g. City Water Utility"
                  value={newExpense.vendor}
                  onChange={(e) => setNewExpense({ ...newExpense, vendor: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Description</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Details of expense item..."
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Receipt Attachment URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newExpense.receiptAttachment}
                  onChange={(e) => setNewExpense({ ...newExpense, receiptAttachment: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded-lg text-white font-medium"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensePage;
