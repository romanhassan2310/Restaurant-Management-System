import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Calendar,
  Plus,
  Play,
  CheckCircle,
  FileText,
  TrendingUp,
  Building,
  User,
  Clock,
  Printer,
  Download,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';

interface PayrollPeriod {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'processing' | 'approved' | 'paid';
  totalBasicSalary: number;
  totalOvertimePay: number;
  totalAllowances: number;
  totalBonuses: number;
  totalDeductions: number;
  totalNetSalary: number;
  employeeCount: number;
  createdAt: string;
}

interface Payslip {
  _id: string;
  payrollPeriod: string;
  employee: {
    _id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    position: string;
    department: string;
    payType: 'monthly' | 'hourly';
    bankDetails?: {
      bankName: string;
      accountNumber: string;
      accountHolderName: string;
    };
  };
  payPeriodStart: string;
  payPeriodEnd: string;
  basicSalary: number;
  hourlyRate?: number;
  regularHoursWorked: number;
  overtimeHoursWorked: number;
  overtimePay: number;
  allowances: Array<{ title: string; amount: number }>;
  bonuses: Array<{ title: string; amount: number }>;
  deductions: Array<{ title: string; amount: number }>;
  taxDeduction: number;
  netSalary: number;
  status: 'draft' | 'approved' | 'paid';
  paymentDate?: string;
  paymentMethod?: string;
}

interface DepartmentReport {
  department: string;
  employeeCount: number;
  totalBasic: number;
  totalOvertime: number;
  totalAllowances: number;
  totalBonuses: number;
  totalDeductions: number;
  totalNet: number;
}

const PayrollPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'periods' | 'reports'>('periods');
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [departmentReports, setDepartmentReports] = useState<DepartmentReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Drawer state
  const [showNewPeriodModal, setShowNewPeriodModal] = useState<boolean>(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [showPayslipModal, setShowPayslipModal] = useState<boolean>(false);

  // New period form
  const [newPeriod, setNewPeriod] = useState({
    name: '',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchPayrollPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      fetchPayslips(selectedPeriod._id);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    if (activeTab === 'reports' && selectedPeriod) {
      fetchDepartmentReport(selectedPeriod._id);
    }
  }, [activeTab, selectedPeriod]);

  const fetchPayrollPeriods = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/hr/payroll/periods');
      if (res.data.success) {
        setPeriods(res.data.data);
        if (res.data.data.length > 0 && !selectedPeriod) {
          setSelectedPeriod(res.data.data[0]);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load payroll periods');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayslips = async (periodId: string) => {
    try {
      const res = await api.get(`/hr/payroll/periods/${periodId}/payslips`);
      if (res.data.success) {
        setPayslips(res.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching payslips:', err);
    }
  };

  const fetchDepartmentReport = async (periodId: string) => {
    try {
      const res = await api.get(`/hr/payroll/periods/${periodId}/report`);
      if (res.data.success) {
        setDepartmentReports(res.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching department report:', err);
    }
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/hr/payroll/periods', newPeriod);
      if (res.data.success) {
        setShowNewPeriodModal(false);
        setNewPeriod({
          name: '',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        });
        fetchPayrollPeriods();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create payroll period');
    }
  };

  const handleCalculatePayroll = async (periodId: string) => {
    if (!window.confirm('Calculate and generate payslips for this payroll period?')) return;
    try {
      const res = await api.post(`/hr/payroll/periods/${periodId}/calculate`);
      if (res.data.success) {
        fetchPayrollPeriods();
        if (selectedPeriod?._id === periodId) {
          fetchPayslips(periodId);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to calculate payroll');
    }
  };

  const handleApprovePayroll = async (periodId: string) => {
    if (!window.confirm('Approve all payslips in this payroll period?')) return;
    try {
      const res = await api.post(`/hr/payroll/periods/${periodId}/approve`);
      if (res.data.success) {
        fetchPayrollPeriods();
        if (selectedPeriod?._id === periodId) {
          fetchPayslips(periodId);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve payroll');
    }
  };

  const handleProcessPayout = async (periodId: string) => {
    const paymentMethod = window.prompt('Enter Payment Method (e.g. Bank Transfer, Cash, Check):', 'Bank Transfer');
    if (!paymentMethod) return;

    try {
      const res = await api.post(`/hr/payroll/periods/${periodId}/payout`, { paymentMethod });
      if (res.data.success) {
        fetchPayrollPeriods();
        if (selectedPeriod?._id === periodId) {
          fetchPayslips(periodId);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to process payout');
    }
  };

  const calculateTotalAllowances = (items: Array<{ title: string; amount: number }>) =>
    items?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

  const calculateTotalBonuses = (items: Array<{ title: string; amount: number }>) =>
    items?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

  const calculateTotalDeductions = (items: Array<{ title: string; amount: number }>) =>
    items?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

  return (
    <div className="p-6 bg-slate-900 text-white min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-emerald-400" />
            Payroll & Compensation
          </h1>
          <p className="text-slate-400 mt-1">Manage payroll runs, employee payslips, allowances & salary reports</p>
        </div>

        <button
          onClick={() => setShowNewPeriodModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-lg shadow-emerald-900/20"
        >
          <Plus className="w-5 h-5" />
          New Payroll Period
        </button>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-4 border-b border-slate-800 mb-6">
        <button
          onClick={() => setActiveTab('periods')}
          className={`pb-3 px-2 font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'periods'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-5 h-5" />
          Payroll Periods & Payslips
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 px-2 font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'reports'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          Department Cost Reports
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'periods' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Payroll Periods Sidebar */}
          <div className="lg:col-span-1 bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" />
              Payroll History
            </h2>

            {loading ? (
              <div className="text-center py-8 text-slate-400">Loading payroll periods...</div>
            ) : periods.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No payroll periods found. Create one to get started.</div>
            ) : (
              periods.map((p) => (
                <div
                  key={p._id}
                  onClick={() => setSelectedPeriod(p)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedPeriod?._id === p._id
                      ? 'bg-slate-700/90 border-emerald-500 shadow-md'
                      : 'bg-slate-900/50 border-slate-700/50 hover:bg-slate-700/40'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-slate-100">{p.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                        p.status === 'paid'
                          ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                          : p.status === 'approved'
                          ? 'bg-blue-900/60 text-blue-300 border border-blue-700/50'
                          : p.status === 'processing'
                          ? 'bg-amber-900/60 text-amber-300 border border-amber-700/50'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-3">
                    {new Date(p.startDate).toLocaleDateString()} - {new Date(p.endDate).toLocaleDateString()}
                  </p>

                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Total Net:</span>
                    <span className="font-semibold text-emerald-400">${p.totalNetSalary.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Employees:</span>
                    <span>{p.employeeCount}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Period Details & Payslips View */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            {selectedPeriod ? (
              <>
                {/* Selected Period Summary Card */}
                <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-white">{selectedPeriod.name}</h2>
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-semibold capitalize ${
                            selectedPeriod.status === 'paid'
                              ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-600'
                              : selectedPeriod.status === 'approved'
                              ? 'bg-blue-900/80 text-blue-300 border border-blue-600'
                              : selectedPeriod.status === 'processing'
                              ? 'bg-amber-900/80 text-amber-300 border border-amber-600'
                              : 'bg-slate-700 text-slate-300 border border-slate-600'
                          }`}
                        >
                          {selectedPeriod.status}
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm mt-1">
                        Period Range: {new Date(selectedPeriod.startDate).toLocaleDateString()} to{' '}
                        {new Date(selectedPeriod.endDate).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3">
                      {selectedPeriod.status === 'draft' && (
                        <button
                          onClick={() => handleCalculatePayroll(selectedPeriod._id)}
                          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-medium px-4 py-2 rounded-lg transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          Calculate Payroll
                        </button>
                      )}

                      {selectedPeriod.status === 'processing' && (
                        <button
                          onClick={() => handleApprovePayroll(selectedPeriod._id)}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve Payslips
                        </button>
                      )}

                      {selectedPeriod.status === 'approved' && (
                        <button
                          onClick={() => handleProcessPayout(selectedPeriod._id)}
                          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg transition-colors"
                        >
                          <DollarSign className="w-4 h-4" />
                          Execute Disbursal
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-700/40">
                      <div className="text-xs text-slate-400">Basic Salary</div>
                      <div className="text-xl font-bold text-slate-100 mt-1">
                        ${selectedPeriod.totalBasicSalary.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-700/40">
                      <div className="text-xs text-slate-400">Overtime Pay</div>
                      <div className="text-xl font-bold text-amber-400 mt-1">
                        +${selectedPeriod.totalOvertimePay.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-700/40">
                      <div className="text-xs text-slate-400">Allowances & Bonuses</div>
                      <div className="text-xl font-bold text-blue-400 mt-1">
                        +${(selectedPeriod.totalAllowances + selectedPeriod.totalBonuses).toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-700/40">
                      <div className="text-xs text-slate-400">Total Net Disbursal</div>
                      <div className="text-xl font-bold text-emerald-400 mt-1">
                        ${selectedPeriod.totalNetSalary.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payslips List Table */}
                <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-slate-700/60 flex justify-between items-center">
                    <h3 className="font-bold text-slate-100 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-emerald-400" />
                      Employee Payslips ({payslips.length})
                    </h3>
                  </div>

                  {payslips.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      No payslips generated yet. Click "Calculate Payroll" to generate payslips for all active employees.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-900/70 border-b border-slate-700 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            <th className="p-4">Employee</th>
                            <th className="p-4">Pay Type</th>
                            <th className="p-4">Basic Pay</th>
                            <th className="p-4">Overtime Pay</th>
                            <th className="p-4">Allowances/Bonus</th>
                            <th className="p-4">Deductions/Tax</th>
                            <th className="p-4">Net Salary</th>
                            <th className="p-4 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50 text-sm">
                          {payslips.map((ps) => (
                            <tr key={ps._id} className="hover:bg-slate-700/30 transition-colors">
                              <td className="p-4 font-medium text-slate-200">
                                <div>
                                  {ps.employee.firstName} {ps.employee.lastName}
                                </div>
                                <div className="text-xs text-slate-400">{ps.employee.position} ({ps.employee.department})</div>
                              </td>
                              <td className="p-4 text-slate-300 capitalize">{ps.employee.payType}</td>
                              <td className="p-4 text-slate-200">${ps.basicSalary.toFixed(2)}</td>
                              <td className="p-4 text-amber-400">
                                +${ps.overtimePay.toFixed(2)}
                                <div className="text-xs text-slate-400">{ps.overtimeHoursWorked} hrs</div>
                              </td>
                              <td className="p-4 text-blue-400">
                                +$
                                {(
                                  calculateTotalAllowances(ps.allowances) + calculateTotalBonuses(ps.bonuses)
                                ).toFixed(2)}
                              </td>
                              <td className="p-4 text-rose-400">
                                -$
                                {(
                                  calculateTotalDeductions(ps.deductions) + ps.taxDeduction
                                ).toFixed(2)}
                              </td>
                              <td className="p-4 font-bold text-emerald-400">${ps.netSalary.toFixed(2)}</td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => {
                                    setSelectedPayslip(ps);
                                    setShowPayslipModal(true);
                                  }}
                                  className="text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded text-xs transition-colors"
                                >
                                  View Payslip
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-12 text-center text-slate-400">
                Select a payroll period from the left menu or create a new one.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-6">
          <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
            <Building className="w-6 h-6 text-emerald-400" />
            Department Salary Expense Breakdown
          </h2>

          {!selectedPeriod ? (
            <div className="text-slate-400 py-8 text-center">Select a payroll period to view department analytics.</div>
          ) : (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/70 border-b border-slate-700 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="p-4">Department</th>
                    <th className="p-4">Employees</th>
                    <th className="p-4">Base Cost</th>
                    <th className="p-4">Overtime Cost</th>
                    <th className="p-4">Allowances & Bonuses</th>
                    <th className="p-4">Deductions</th>
                    <th className="p-4">Total Net Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-sm">
                  {departmentReports.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-700/30">
                      <td className="p-4 font-bold text-slate-200">{r.department}</td>
                      <td className="p-4 text-slate-300">{r.employeeCount}</td>
                      <td className="p-4 text-slate-300">${r.totalBasic.toFixed(2)}</td>
                      <td className="p-4 text-amber-400">${r.totalOvertime.toFixed(2)}</td>
                      <td className="p-4 text-blue-400">${(r.totalAllowances + r.totalBonuses).toFixed(2)}</td>
                      <td className="p-4 text-rose-400">${r.totalDeductions.toFixed(2)}</td>
                      <td className="p-4 font-bold text-emerald-400">${r.totalNet.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* New Period Modal */}
      {showNewPeriodModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Create Payroll Period</h2>
            <form onSubmit={handleCreatePeriod} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Period Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. October 2026 Payroll"
                  value={newPeriod.name}
                  onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={newPeriod.startDate}
                  onChange={(e) => setNewPeriod({ ...newPeriod, startDate: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">End Date</label>
                <input
                  type="date"
                  required
                  value={newPeriod.endDate}
                  onChange={(e) => setNewPeriod({ ...newPeriod, endDate: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowNewPeriodModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-medium"
                >
                  Create Period
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payslip Detail Modal / Drawer */}
      {showPayslipModal && selectedPayslip && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-700 pb-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Employee Payslip Statement</h2>
                <p className="text-xs text-slate-400">
                  {new Date(selectedPayslip.payPeriodStart).toLocaleDateString()} -{' '}
                  {new Date(selectedPayslip.payPeriodEnd).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded text-xs text-slate-200"
              >
                <Printer className="w-4 h-4" />
                Print Statement
              </button>
            </div>

            {/* Employee Details */}
            <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-700/50 mb-6 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-400">Employee</div>
                <div className="font-semibold text-slate-200">
                  {selectedPayslip.employee.firstName} {selectedPayslip.employee.lastName}
                </div>
                <div className="text-xs text-slate-400">ID: {selectedPayslip.employee.employeeId}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Position / Dept</div>
                <div className="font-semibold text-slate-200">
                  {selectedPayslip.employee.position} ({selectedPayslip.employee.department})
                </div>
                <div className="text-xs text-slate-400 capitalize">Pay Type: {selectedPayslip.employee.payType}</div>
              </div>
            </div>

            {/* Earnings & Deductions Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Earnings */}
              <div className="bg-slate-900/50 border border-slate-700/50 p-4 rounded-lg">
                <h4 className="font-bold text-emerald-400 text-sm mb-3 border-b border-slate-700 pb-2">
                  Earnings
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Basic Salary</span>
                    <span className="text-slate-200 font-medium">${selectedPayslip.basicSalary.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Overtime ({selectedPayslip.overtimeHoursWorked} hrs)</span>
                    <span className="text-amber-400 font-medium">+${selectedPayslip.overtimePay.toFixed(2)}</span>
                  </div>
                  {selectedPayslip.allowances.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-slate-400">Allowance: {item.title}</span>
                      <span className="text-blue-400">+${item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  {selectedPayslip.bonuses.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-slate-400">Bonus: {item.title}</span>
                      <span className="text-blue-400">+${item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deductions */}
              <div className="bg-slate-900/50 border border-slate-700/50 p-4 rounded-lg">
                <h4 className="font-bold text-rose-400 text-sm mb-3 border-b border-slate-700 pb-2">
                  Deductions & Tax
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tax Withholding</span>
                    <span className="text-rose-400 font-medium">-${selectedPayslip.taxDeduction.toFixed(2)}</span>
                  </div>
                  {selectedPayslip.deductions.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-slate-400">{item.title}</span>
                      <span className="text-rose-400">-${item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Net Salary Total */}
            <div className="bg-emerald-950/40 border border-emerald-800/60 p-4 rounded-lg flex justify-between items-center mb-6">
              <span className="font-bold text-slate-200">Net Pay Disbursal</span>
              <span className="text-2xl font-black text-emerald-400">${selectedPayslip.netSalary.toFixed(2)}</span>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowPayslipModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollPage;
