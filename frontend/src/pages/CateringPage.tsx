import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  MapPin,
  Plus,
  DollarSign,
  Truck,
  CheckCircle,
  Clock,
  Phone,
  Package
} from 'lucide-react';
import api from '../services/api';

interface CateringOrder {
  _id: string;
  cateringNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  eventName: string;
  eventDate: string;
  guestCount: number;
  venueAddress: string;
  menuItems: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  totalAmount: number;
  depositPaid: number;
  balanceDue: number;
  status:
    | 'inquiry'
    | 'quoted'
    | 'confirmed'
    | 'in_preparation'
    | 'delivered'
    | 'completed'
    | 'cancelled';
  notes?: string;
}

const CateringPage: React.FC = () => {
  const [orders, setOrders] = useState<CateringOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<CateringOrder | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');

  const [newOrder, setNewOrder] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    eventName: '',
    eventDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
    guestCount: 50,
    venueAddress: '',
    menuItemName: 'Full Banquet Buffet',
    quantity: 50,
    unitPrice: 35.0,
    deliveryFee: 100.0,
    depositPaid: 500.0,
    notes: '',
  });

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/catering', {
        params: { status: statusFilter || undefined },
      });
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching catering orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        customerName: newOrder.customerName,
        customerPhone: newOrder.customerPhone,
        customerEmail: newOrder.customerEmail || undefined,
        eventName: newOrder.eventName,
        eventDate: newOrder.eventDate,
        guestCount: Number(newOrder.guestCount),
        venueAddress: newOrder.venueAddress,
        menuItems: [
          {
            name: newOrder.menuItemName,
            quantity: Number(newOrder.quantity),
            unitPrice: Number(newOrder.unitPrice),
          },
        ],
        deliveryFee: Number(newOrder.deliveryFee),
        depositPaid: Number(newOrder.depositPaid),
        notes: newOrder.notes,
      };

      const res = await api.post('/catering', payload);
      if (res.data.success) {
        setShowNewModal(false);
        fetchOrders();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create catering order');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await api.patch(`/catering/${id}/status`, { status: newStatus });
      if (res.data.success) {
        fetchOrders();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      const res = await api.post(`/catering/${selectedOrder._id}/payments`, {
        amount: parseFloat(paymentAmount),
      });
      if (res.data.success) {
        setShowPaymentModal(false);
        setSelectedOrder(null);
        setPaymentAmount('');
        fetchOrders();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record payment');
    }
  };

  return (
    <div className="p-6 bg-slate-900 text-white min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Package className="w-8 h-8 text-amber-400" />
            Catering & Bulk Sales
          </h1>
          <p className="text-slate-400 mt-1">Manage bulk event bookings, guest count packages, deposits & delivery setup</p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-lg shadow-amber-900/20"
        >
          <Plus className="w-5 h-5" />
          Book Catering Event
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-800 mb-6 overflow-x-auto pb-2">
        {['', 'inquiry', 'confirmed', 'in_preparation', 'delivered', 'completed'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors whitespace-nowrap ${
              statusFilter === st
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {st === '' ? 'All Events' : st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading catering bookings...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No catering events found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((o) => (
            <div
              key={o._id}
              className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 flex flex-col justify-between hover:border-amber-500/50 transition-all shadow-lg"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                      {o.cateringNumber}
                    </span>
                    <h3 className="text-xl font-bold text-slate-100">{o.eventName}</h3>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
                      o.status === 'completed'
                        ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                        : o.status === 'delivered'
                        ? 'bg-blue-900/60 text-blue-300 border border-blue-700/50'
                        : o.status === 'confirmed'
                        ? 'bg-amber-900/60 text-amber-300 border border-amber-700/50'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {o.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-slate-300 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>{new Date(o.eventDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>{o.guestCount} Guests</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{o.venueAddress}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>
                      {o.customerName} ({o.customerPhone})
                    </span>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/40 text-xs space-y-1 mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Price:</span>
                    <span className="font-bold text-slate-100">${o.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Deposit Paid:</span>
                    <span className="font-medium text-emerald-400">${o.depositPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-700/50 pt-1">
                    <span className="text-slate-400">Balance Due:</span>
                    <span className="font-bold text-rose-400">${o.balanceDue.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Status Actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700/50">
                {o.balanceDue > 0 && (
                  <button
                    onClick={() => {
                      setSelectedOrder(o);
                      setPaymentAmount(o.balanceDue.toString());
                      setShowPaymentModal(true);
                    }}
                    className="flex-1 bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-medium py-2 rounded transition-colors text-center"
                  >
                    Receive Payment
                  </button>
                )}

                <select
                  value={o.status}
                  onChange={(e) => handleStatusChange(o._id, e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-xs rounded px-2 py-1 text-slate-200 focus:outline-none"
                >
                  <option value="inquiry">Inquiry</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in_preparation">In Prep</option>
                  <option value="delivered">Delivered</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Event Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">Book Catering Event</h2>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={newOrder.customerName}
                    onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={newOrder.customerPhone}
                    onChange={(e) => setNewOrder({ ...newOrder, customerPhone: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Event Name / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wedding Reception Gala"
                  value={newOrder.eventName}
                  onChange={(e) => setNewOrder({ ...newOrder, eventName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Event Date</label>
                  <input
                    type="date"
                    required
                    value={newOrder.eventDate}
                    onChange={(e) => setNewOrder({ ...newOrder, eventDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Guest Count</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newOrder.guestCount}
                    onChange={(e) => setNewOrder({ ...newOrder, guestCount: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Venue Address</label>
                <input
                  type="text"
                  required
                  value={newOrder.venueAddress}
                  onChange={(e) => setNewOrder({ ...newOrder, venueAddress: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Package Name</label>
                  <input
                    type="text"
                    required
                    value={newOrder.menuItemName}
                    onChange={(e) => setNewOrder({ ...newOrder, menuItemName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Qty</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newOrder.quantity}
                    onChange={(e) => setNewOrder({ ...newOrder, quantity: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Price / Person</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={newOrder.unitPrice}
                    onChange={(e) => setNewOrder({ ...newOrder, unitPrice: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Delivery & Setup Fee ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newOrder.deliveryFee}
                    onChange={(e) => setNewOrder({ ...newOrder, deliveryFee: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Initial Deposit ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newOrder.depositPaid}
                    onChange={(e) => setNewOrder({ ...newOrder, depositPaid: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
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
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-white font-medium"
                >
                  Confirm Catering Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">Record Catering Payment</h2>
            <p className="text-xs text-slate-400 mb-4">
              Event: {selectedOrder.eventName} (#{selectedOrder.cateringNumber})
            </p>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Payment Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-medium"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CateringPage;
