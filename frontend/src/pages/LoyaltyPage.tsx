import { useEffect, useState } from 'react';
import api from '../services/api';

export default function LoyaltyPage() {
  const [activeTab, setActiveTab] = useState<'levels' | 'rewards' | 'transactions'>('levels');

  const [levels, setLevels] = useState<any[]>([]);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [levelForm, setLevelForm] = useState({ name: '', minSpend: 0, minPoints: 0, pointsMultiplier: 1.0, color: '#10B981' });

  const [rewards, setRewards] = useState<any[]>([]);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardForm, setRewardForm] = useState({ title: '', pointsRequired: 50, rewardType: 'discount_fixed', rewardValue: 5 });

  const [transactions, setTransactions] = useState<any[]>([]);

  const fetchLevels = async () => {
    try {
      const res = await api.get('/loyalty/levels');
      setLevels(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRewards = async () => {
    try {
      const res = await api.get('/loyalty/rewards');
      setRewards(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/loyalty/transactions');
      setTransactions(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLevels();
    fetchRewards();
    fetchTransactions();
  }, []);

  const handleSaveLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/loyalty/levels', levelForm);
      setShowLevelModal(false);
      setLevelForm({ name: '', minSpend: 0, minPoints: 0, pointsMultiplier: 1.0, color: '#10B981' });
      fetchLevels();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/loyalty/rewards', rewardForm);
      setShowRewardModal(false);
      setRewardForm({ title: '', pointsRequired: 50, rewardType: 'discount_fixed', rewardValue: 5 });
      fetchRewards();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Loyalty Program</h2>
          <p className="text-sm text-slate-500">Manage member levels, point multipliers, rewards catalog, and points audit log</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'levels' && (
            <button onClick={() => setShowLevelModal(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm text-sm">
              + New Member Level
            </button>
          )}
          {activeTab === 'rewards' && (
            <button onClick={() => setShowRewardModal(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm text-sm">
              + Create Reward
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button onClick={() => setActiveTab('levels')} className={`pb-3 text-sm font-medium border-b-2 ${activeTab === 'levels' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          Member Tiers & Multipliers
        </button>
        <button onClick={() => setActiveTab('rewards')} className={`pb-3 text-sm font-medium border-b-2 ${activeTab === 'rewards' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          Rewards Catalog
        </button>
        <button onClick={() => setActiveTab('transactions')} className={`pb-3 text-sm font-medium border-b-2 ${activeTab === 'transactions' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          Points Audit Log
        </button>
      </div>

      {/* TIERS TAB */}
      {activeTab === 'levels' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {levels.map((lvl) => (
            <div key={lvl._id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-slate-900" style={{ color: lvl.color }}>{lvl.name} Tier</span>
                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-bold text-xs rounded-full border border-amber-200">
                  {lvl.pointsMultiplier}x Points Multiplier
                </span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Min Spending Requirement:</span>
                  <span className="font-semibold text-slate-900">${lvl.minSpend}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Min Points Threshold:</span>
                  <span className="font-semibold text-slate-900">{lvl.minPoints} pts</span>
                </div>
              </div>
            </div>
          ))}
          {levels.length === 0 && (
            <div className="col-span-3 text-center py-12 text-slate-400 bg-white rounded-xl border">No loyalty tiers configured yet.</div>
          )}
        </div>
      )}

      {/* REWARDS CATALOG TAB */}
      {activeTab === 'rewards' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {rewards.map((r) => (
            <div key={r._id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900">{r.title}</h3>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-lg border border-indigo-200">
                  {r.pointsRequired} pts
                </span>
              </div>
              <div className="text-sm text-slate-600">
                Reward Value: <span className="font-bold text-slate-900">{r.rewardType === 'discount_fixed' ? `$${r.rewardValue.toFixed(2)} Off` : `${r.rewardValue}% Off`}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* POINTS TRANSACTIONS TAB */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                <th className="p-4">Customer</th>
                <th className="p-4">Type</th>
                <th className="p-4">Points Delta</th>
                <th className="p-4">Balance After</th>
                <th className="p-4">Description</th>
                <th className="p-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {transactions.map((tx) => (
                <tr key={tx._id}>
                  <td className="p-4 font-semibold text-slate-900">{tx.customer?.name || 'Guest'}</td>
                  <td className="p-4 capitalize"><span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-700">{tx.type}</span></td>
                  <td className={`p-4 font-bold ${tx.points > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.points > 0 ? `+${tx.points}` : tx.points} pts
                  </td>
                  <td className="p-4 text-slate-700 font-medium">{tx.balanceAfter} pts</td>
                  <td className="p-4 text-slate-600">{tx.description}</td>
                  <td className="p-4 text-xs text-slate-400">{new Date(tx.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">No loyalty transactions recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE LEVEL MODAL */}
      {showLevelModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveLevel} className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">New Loyalty Level / Tier</h3>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Tier Name (e.g. Gold)</label>
              <input type="text" required value={levelForm.name} onChange={(e) => setLevelForm({ ...levelForm, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Min Spend ($)</label>
                <input type="number" min="0" value={levelForm.minSpend} onChange={(e) => setLevelForm({ ...levelForm, minSpend: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Points Multiplier</label>
                <input type="number" step="0.1" min="0.1" value={levelForm.pointsMultiplier} onChange={(e) => setLevelForm({ ...levelForm, pointsMultiplier: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button type="button" onClick={() => setShowLevelModal(false)} className="px-4 py-2 border text-slate-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Create Tier</button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE REWARD MODAL */}
      {showRewardModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveReward} className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">New Reward Catalog Item</h3>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Reward Title</label>
              <input type="text" required value={rewardForm.title} onChange={(e) => setRewardForm({ ...rewardForm, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Points Required</label>
                <input type="number" min="1" required value={rewardForm.pointsRequired} onChange={(e) => setRewardForm({ ...rewardForm, pointsRequired: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Discount ($ Off)</label>
                <input type="number" min="1" required value={rewardForm.rewardValue} onChange={(e) => setRewardForm({ ...rewardForm, rewardValue: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button type="button" onClick={() => setShowRewardModal(false)} className="px-4 py-2 border text-slate-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Create Reward</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
