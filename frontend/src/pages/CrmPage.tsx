import { useEffect, useState } from 'react';
import api from '../services/api';

export default function CrmPage() {
  const [activeTab, setActiveTab] = useState<'customers' | 'groups' | 'promotions' | 'leads'>('customers');
  
  // State for Customers
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerHistory, setCustomerHistory] = useState<any | null>(null);
  const [showCustModal, setShowCustModal] = useState(false);
  const [custForm, setCustForm] = useState({ name: '', phone: '', email: '', street: '', city: '', state: '', zip: '', customerGroup: '', notes: '' });

  // Credit Modal State
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditForm, setCreditForm] = useState({ amount: '', type: 'deposit', notes: '' });

  // State for Groups
  const [groups, setGroups] = useState<any[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', description: '', discountPercentage: 0, color: '#3B82F6' });

  // State for Promotions
  const [promotions, setPromotions] = useState<any[]>([]);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoForm, setPromoForm] = useState({ title: '', code: '', discountType: 'percentage', discountValue: 10, minOrderAmount: 0, maxDiscountAmount: 0 });

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/crm/customers', { params: { search } });
      setCustomers(res.data.customers || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await api.get('/crm/groups');
      setGroups(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPromotions = async () => {
    try {
      const res = await api.get('/crm/promotions');
      setPromotions(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchGroups();
    fetchPromotions();
  }, [search]);

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/crm/customers', {
        name: custForm.name,
        phone: custForm.phone,
        email: custForm.email,
        address: { street: custForm.street, city: custForm.city, state: custForm.state, zip: custForm.zip },
        customerGroup: custForm.customerGroup || undefined,
        notes: custForm.notes,
      });
      setShowCustModal(false);
      setCustForm({ name: '', phone: '', email: '', street: '', city: '', state: '', zip: '', customerGroup: '', notes: '' });
      fetchCustomers();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleAdjustCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    try {
      await api.post(`/crm/customers/${selectedCustomer._id}/credit`, {
        amount: Number(creditForm.amount),
        type: creditForm.type,
        notes: creditForm.notes,
      });
      setShowCreditModal(false);
      setCreditForm({ amount: '', type: 'deposit', notes: '' });
      inspectCustomer(selectedCustomer._id);
      fetchCustomers();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const inspectCustomer = async (id: string) => {
    try {
      const [custRes, histRes] = await Promise.all([
        api.get(`/crm/customers/${id}`),
        api.get(`/crm/customers/${id}/history`),
      ]);
      setSelectedCustomer(custRes.data);
      setCustomerHistory(histRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/crm/groups', groupForm);
      setShowGroupModal(false);
      setGroupForm({ name: '', description: '', discountPercentage: 0, color: '#3B82F6' });
      fetchGroups();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/crm/promotions', promoForm);
      setShowPromoModal(false);
      setPromoForm({ title: '', code: '', discountType: 'percentage', discountValue: 10, minOrderAmount: 0, maxDiscountAmount: 0 });
      fetchPromotions();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Customer CRM</h2>
          <p className="text-sm text-slate-500">Manage customers, groups, credit balances, and promotions</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'customers' && (
            <button onClick={() => setShowCustModal(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm text-sm">
              + New Customer
            </button>
          )}
          {activeTab === 'groups' && (
            <button onClick={() => setShowGroupModal(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm text-sm">
              + New Customer Group
            </button>
          )}
          {activeTab === 'promotions' && (
            <button onClick={() => setShowPromoModal(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm text-sm">
              + Create Promotion
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button onClick={() => setActiveTab('customers')} className={`pb-3 text-sm font-medium border-b-2 ${activeTab === 'customers' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          Customers Directory
        </button>
        <button onClick={() => setActiveTab('groups')} className={`pb-3 text-sm font-medium border-b-2 ${activeTab === 'groups' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          Customer Groups
        </button>
        <button onClick={() => setActiveTab('promotions')} className={`pb-3 text-sm font-medium border-b-2 ${activeTab === 'promotions' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          Promotions & Codes
        </button>
        <button onClick={() => setActiveTab('leads')} className={`pb-3 text-sm font-medium border-b-2 ${activeTab === 'leads' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          QR Self-Order Leads
        </button>
      </div>

      {/* CUSTOMERS TAB */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg w-full max-w-md text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                    <th className="p-4">Customer</th>
                    <th className="p-4">Group</th>
                    <th className="p-4">Total Spent</th>
                    <th className="p-4">Credit Balance</th>
                    <th className="p-4">Points</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {customers.map((c) => (
                    <tr key={c._id} className="hover:bg-slate-50 transition">
                      <td className="p-4">
                        <div className="font-semibold text-slate-900">{c.name}</div>
                        <div className="text-xs text-slate-400">{c.phone || c.email || 'No contact'}</div>
                      </td>
                      <td className="p-4">
                        {c.customerGroup ? (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            {c.customerGroup.name} ({c.customerGroup.discountPercentage}%)
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Standard</span>
                        )}
                      </td>
                      <td className="p-4 font-medium">${c.totalSpending?.toFixed(2) || '0.00'}</td>
                      <td className="p-4">
                        <span className={`font-semibold ${c.creditBalance > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                          ${c.creditBalance?.toFixed(2) || '0.00'}
                        </span>
                      </td>
                      <td className="p-4 text-indigo-600 font-medium">{c.loyaltyPoints || 0} pts</td>
                      <td className="p-4">
                        <button onClick={() => inspectCustomer(c._id)} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded">
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">No customers found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Customer Details Inspector */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              {selectedCustomer ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{selectedCustomer.name}</h3>
                    <p className="text-sm text-slate-500">{selectedCustomer.email || selectedCustomer.phone}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedCustomer.segmentationTags?.map((tag: string) => (
                        <span key={tag} className="px-2 py-0.5 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
                    <div>
                      <span className="text-xs text-slate-400 uppercase font-semibold">Credit Balance</span>
                      <div className="text-lg font-bold text-emerald-600">${selectedCustomer.creditBalance?.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 uppercase font-semibold">Loyalty Points</span>
                      <div className="text-lg font-bold text-indigo-600">{selectedCustomer.loyaltyPoints} pts</div>
                    </div>
                  </div>

                  <button onClick={() => setShowCreditModal(true)} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow-sm">
                    Adjust Store Credit
                  </button>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Recent Credit History</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {customerHistory?.creditTransactions?.map((ct: any) => (
                        <div key={ct._id} className="text-xs p-2 bg-slate-50 rounded border border-slate-100 flex justify-between">
                          <div>
                            <div className="font-semibold capitalize text-slate-800">{ct.type.replace('_', ' ')}</div>
                            <div className="text-slate-400">{ct.notes || 'N/A'}</div>
                          </div>
                          <div className={`font-bold ${ct.type === 'deposit' || ct.type === 'order_refund' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {ct.type === 'deposit' || ct.type === 'order_refund' ? '+' : '-'}${ct.amount.toFixed(2)}
                          </div>
                        </div>
                      ))}
                      {(!customerHistory?.creditTransactions || customerHistory.creditTransactions.length === 0) && (
                        <div className="text-xs text-slate-400">No credit history recorded.</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 text-sm">Select a customer from the table to view complete CRM profile & history.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GROUPS TAB */}
      {activeTab === 'groups' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {groups.map((g) => (
            <div key={g._id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color || '#3B82F6' }}></span>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">{g.discountPercentage}% Discount</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{g.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{g.description || 'No description provided'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PROMOTIONS TAB */}
      {activeTab === 'promotions' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                <th className="p-4">Promo Title</th>
                <th className="p-4">Code</th>
                <th className="p-4">Discount</th>
                <th className="p-4">Min Order</th>
                <th className="p-4">Usage Count</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {promotions.map((p) => (
                <tr key={p._id}>
                  <td className="p-4 font-semibold text-slate-900">{p.title}</td>
                  <td className="p-4"><span className="px-2 py-1 bg-slate-100 font-mono font-bold text-xs rounded text-indigo-700">{p.code}</span></td>
                  <td className="p-4 font-medium">{p.discountType === 'percentage' ? `${p.discountValue}%` : `$${p.discountValue.toFixed(2)}`}</td>
                  <td className="p-4 text-slate-500">${p.minOrderAmount?.toFixed(2) || '0.00'}</td>
                  <td className="p-4 text-slate-600">{p.usageCount} times</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* QR LEADS TAB */}
      {activeTab === 'leads' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h3 className="text-lg font-bold text-slate-900">QR Self-Order Captured Leads</h3>
          <p className="text-sm text-slate-500">Guests who ordered via QR self-service and were converted into CRM contacts.</p>
          <div className="divide-y divide-slate-100">
            {customers.filter((c) => c.leadSource === 'qr_order' || c.segmentationTags?.includes('QR Lead')).map((lead) => (
              <div key={lead._id} className="py-3 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-slate-900">{lead.name}</div>
                  <div className="text-xs text-slate-400">{lead.phone || lead.email}</div>
                </div>
                <span className="px-2.5 py-1 text-xs bg-purple-50 text-purple-700 font-medium rounded-full">QR Lead</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE CUSTOMER MODAL */}
      {showCustModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveCustomer} className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add New Customer</h3>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Full Name</label>
              <input type="text" required value={custForm.name} onChange={(e) => setCustForm({ ...custForm, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Phone</label>
                <input type="text" value={custForm.phone} onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Email</label>
                <input type="email" value={custForm.email} onChange={(e) => setCustForm({ ...custForm, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Customer Group</label>
              <select value={custForm.customerGroup} onChange={(e) => setCustForm({ ...custForm, customerGroup: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                <option value="">Standard (No Group)</option>
                {groups.map((g) => <option key={g._id} value={g._id}>{g.name} ({g.discountPercentage}%)</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button type="button" onClick={() => setShowCustModal(false)} className="px-4 py-2 border text-slate-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Save Customer</button>
            </div>
          </form>
        </div>
      )}

      {/* ADJUST CREDIT MODAL */}
      {showCreditModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAdjustCredit} className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Adjust Store Credit</h3>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Action Type</label>
              <select value={creditForm.type} onChange={(e) => setCreditForm({ ...creditForm, type: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                <option value="deposit">Deposit / Add Credit (+)</option>
                <option value="deduction">Deduct Credit (-)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Amount ($)</label>
              <input type="number" step="0.01" min="0.01" required value={creditForm.amount} onChange={(e) => setCreditForm({ ...creditForm, amount: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Notes / Reason</label>
              <input type="text" placeholder="e.g. Gift deposit" value={creditForm.notes} onChange={(e) => setCreditForm({ ...creditForm, notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button type="button" onClick={() => setShowCreditModal(false)} className="px-4 py-2 border text-slate-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium">Submit Adjustment</button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveGroup} className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">New Customer Group</h3>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Group Name</label>
              <input type="text" required value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Discount Percentage (%)</label>
              <input type="number" min="0" max="100" value={groupForm.discountPercentage} onChange={(e) => setGroupForm({ ...groupForm, discountPercentage: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button type="button" onClick={() => setShowGroupModal(false)} className="px-4 py-2 border text-slate-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Create Group</button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE PROMO MODAL */}
      {showPromoModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSavePromo} className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Create Promotion Code</h3>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Title</label>
              <input type="text" required value={promoForm.title} onChange={(e) => setPromoForm({ ...promoForm, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Promo Code (Uppercase)</label>
              <input type="text" required value={promoForm.code} onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1 font-mono uppercase" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Discount Type</label>
                <select value={promoForm.discountType} onChange={(e) => setPromoForm({ ...promoForm, discountType: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Discount Value</label>
                <input type="number" required value={promoForm.discountValue} onChange={(e) => setPromoForm({ ...promoForm, discountValue: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button type="button" onClick={() => setShowPromoModal(false)} className="px-4 py-2 border text-slate-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Save Promotion</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
