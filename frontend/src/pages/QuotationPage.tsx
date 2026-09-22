import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  ArrowRight,
  Check,
  X,
  Send,
  Clock,
  Building,
  DollarSign,
  Tag,
  ShoppingBag
} from 'lucide-react';
import api from '../services/api';

interface QuotationItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  subtotal: number;
}

interface Quotation {
  _id: string;
  quotationNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items: QuotationItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  validUntil: string;
  notes?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
  createdAt: string;
}

const QuotationPage: React.FC = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [showConvertModal, setShowConvertModal] = useState<boolean>(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

  const [conversionType, setConversionType] = useState<'pos_order' | 'catering_order'>('catering_order');
  const [cateringParams, setCateringParams] = useState({
    eventName: '',
    guestCount: 50,
    venueAddress: '',
  });

  const [newQuotation, setNewQuotation] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    description: 'Corporate Catering Buffet',
    quantity: 50,
    unitPrice: 40.0,
    discount: 100.0,
    taxRate: 5.0,
    validUntil: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
    notes: 'Includes complete setup and service team',
  });

  useEffect(() => {
    fetchQuotations();
  }, [statusFilter]);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/quotations', {
        params: { status: statusFilter || undefined },
      });
      if (res.data.success) {
        setQuotations(res.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching quotations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        customerName: newQuotation.customerName,
        customerPhone: newQuotation.customerPhone,
        customerEmail: newQuotation.customerEmail || undefined,
        items: [
          {
            description: newQuotation.description,
            quantity: Number(newQuotation.quantity),
            unitPrice: Number(newQuotation.unitPrice),
            discount: Number(newQuotation.discount),
            taxRate: Number(newQuotation.taxRate),
          },
        ],
        validUntil: newQuotation.validUntil,
        notes: newQuotation.notes,
      };

      const res = await api.post('/quotations', payload);
      if (res.data.success) {
        setShowNewModal(false);
        fetchQuotations();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create quotation');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await api.patch(`/quotations/${id}/status`, { status: newStatus });
      if (res.data.success) {
        fetchQuotations();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update quotation status');
    }
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuotation) return;

    try {
      const payload = {
        conversionType,
        eventName: cateringParams.eventName || `Catering - ${selectedQuotation.customerName}`,
        guestCount: Number(cateringParams.guestCount),
        venueAddress: cateringParams.venueAddress || 'Customer Address',
      };

      const res = await api.post(`/quotations/${selectedQuotation._id}/convert`, payload);
      if (res.data.success) {
        setShowConvertModal(false);
        setSelectedQuotation(null);
        fetchQuotations();
        alert('Quotation successfully converted!');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to convert quotation');
    }
  };

  return (
    <div className="p-6 bg-slate-900 text-white min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-400" />
            Price Quotations
          </h1>
          <p className="text-slate-400 mt-1">Create customer estimates, track quotes & 1-click convert into live orders</p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-lg shadow-blue-900/20"
        >
          <Plus className="w-5 h-5" />
          New Price Quote
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-800 mb-6 overflow-x-auto pb-2">
        {['', 'draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors whitespace-nowrap ${
              statusFilter === st
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {st === '' ? 'All Quotes' : st}
          </button>
        ))}
      </div>

      {/* Quotations Table */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading price quotations...</div>
        ) : quotations.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No price quotations match current filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/70 border-b border-slate-700 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Quote #</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Valid Until</th>
                  <th className="p-4">Subtotal</th>
                  <th className="p-4">Discount</th>
                  <th className="p-4">Tax</th>
                  <th className="p-4">Grand Total</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-sm">
                {quotations.map((q) => (
                  <tr key={q._id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-4 font-bold text-blue-400 whitespace-nowrap">{q.quotationNumber}</td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-200">{q.customerName}</div>
                      <div className="text-xs text-slate-400">{q.customerPhone}</div>
                    </td>
                    <td className="p-4 text-slate-300 whitespace-nowrap">
                      {new Date(q.validUntil).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-slate-300">${q.subtotal.toFixed(2)}</td>
                    <td className="p-4 text-amber-400">-${q.discountTotal.toFixed(2)}</td>
                    <td className="p-4 text-slate-400">+${q.taxTotal.toFixed(2)}</td>
                    <td className="p-4 font-bold text-emerald-400 whitespace-nowrap">
                      ${q.grandTotal.toFixed(2)}
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
                          q.status === 'converted'
                            ? 'bg-purple-900/60 text-purple-300 border border-purple-700/50'
                            : q.status === 'accepted'
                            ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                            : q.status === 'sent'
                            ? 'bg-blue-900/60 text-blue-300 border border-blue-700/50'
                            : q.status === 'rejected'
                            ? 'bg-rose-900/60 text-rose-300 border border-rose-700/50'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      <div className="flex justify-center gap-2">
                        {q.status !== 'converted' && (
                          <button
                            onClick={() => {
                              setSelectedQuotation(q);
                              setCateringParams({
                                eventName: `Catering - ${q.customerName}`,
                                guestCount: 50,
                                venueAddress: '',
                              });
                              setShowConvertModal(true);
                            }}
                            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-2.5 py-1.5 rounded transition-colors"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" /> Convert
                          </button>
                        )}

                        {q.status === 'draft' && (
                          <button
                            onClick={() => handleStatusChange(q._id, 'sent')}
                            className="bg-blue-600/80 hover:bg-blue-500 text-white text-xs px-2.5 py-1.5 rounded"
                          >
                            Send
                          </button>
                        )}

                        {q.status === 'sent' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(q._id, 'accepted')}
                              className="bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs px-2 py-1 rounded"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleStatusChange(q._id, 'rejected')}
                              className="bg-rose-600/80 hover:bg-rose-500 text-white text-xs px-2 py-1 rounded"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Quotation Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">Create Price Quotation</h2>
            <form onSubmit={handleCreateQuotation} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={newQuotation.customerName}
                    onChange={(e) => setNewQuotation({ ...newQuotation, customerName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={newQuotation.customerPhone}
                    onChange={(e) => setNewQuotation({ ...newQuotation, customerPhone: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Item Description</label>
                <input
                  type="text"
                  required
                  value={newQuotation.description}
                  onChange={(e) => setNewQuotation({ ...newQuotation, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Qty</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newQuotation.quantity}
                    onChange={(e) => setNewQuotation({ ...newQuotation, quantity: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Unit Price ($)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={newQuotation.unitPrice}
                    onChange={(e) => setNewQuotation({ ...newQuotation, unitPrice: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Discount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newQuotation.discount}
                    onChange={(e) => setNewQuotation({ ...newQuotation, discount: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Tax (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newQuotation.taxRate}
                    onChange={(e) => setNewQuotation({ ...newQuotation, taxRate: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Valid Until Date</label>
                <input
                  type="date"
                  required
                  value={newQuotation.validUntil}
                  onChange={(e) => setNewQuotation({ ...newQuotation, validUntil: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Notes / Terms</label>
                <textarea
                  rows={2}
                  value={newQuotation.notes}
                  onChange={(e) => setNewQuotation({ ...newQuotation, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium"
                >
                  Create Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert Quotation Modal */}
      {showConvertModal && selectedQuotation && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">Convert Quotation to Order</h2>
            <p className="text-xs text-slate-400 mb-4">
              Quote #{selectedQuotation.quotationNumber} ({selectedQuotation.customerName}) - Total ${selectedQuotation.grandTotal.toFixed(2)}
            </p>

            <form onSubmit={handleConvert} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Target Order Type</label>
                <select
                  value={conversionType}
                  onChange={(e) => setConversionType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm"
                >
                  <option value="catering_order">Catering & Bulk Sales Order</option>
                  <option value="pos_order">Standard POS Order</option>
                </select>
              </div>

              {conversionType === 'catering_order' && (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Event Name</label>
                    <input
                      type="text"
                      required
                      value={cateringParams.eventName}
                      onChange={(e) => setCateringParams({ ...cateringParams, eventName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Guest Count</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={cateringParams.guestCount}
                      onChange={(e) => setCateringParams({ ...cateringParams, guestCount: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Venue Address</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 100 Main St Hall"
                      value={cateringParams.venueAddress}
                      onChange={(e) => setCateringParams({ ...cateringParams, venueAddress: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-medium"
                >
                  Execute 1-Click Conversion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationPage;
