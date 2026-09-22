import { useEffect, useState } from 'react';
import api from '../services/api';

export default function HrPage() {
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'shifts'>('employees');

  // Employees State
  const [employees, setEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [empForm, setEmpForm] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    department: 'Kitchen',
    salaryType: 'monthly',
    baseSalary: 3000,
    hourlyRate: 15,
    overtimeMultiplier: 1.5,
  });

  // Attendance State
  const [attendance, setAttendance] = useState<any[]>([]);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [selectedEmpForAtt, setSelectedEmpForAtt] = useState('');
  const [attNotes, setAttNotes] = useState('');

  // Shift State
  const [shifts, setShifts] = useState<any[]>([]);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    employee: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '16:00',
    shiftType: 'morning',
    notes: '',
  });

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/hr/employees', {
        params: { search: search || undefined, department: departmentFilter || undefined },
      });
      setEmployees(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await api.get('/hr/attendance');
      setAttendance(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchShifts = async () => {
    try {
      const res = await api.get('/hr/shifts');
      setShifts(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchAttendance();
    fetchShifts();
  }, [search, departmentFilter]);

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/hr/employees', empForm);
      setShowEmpModal(false);
      setEmpForm({
        employeeId: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        position: '',
        department: 'Kitchen',
        salaryType: 'monthly',
        baseSalary: 3000,
        hourlyRate: 15,
        overtimeMultiplier: 1.5,
      });
      fetchEmployees();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/hr/attendance/check-in', {
        employeeId: selectedEmpForAtt,
        notes: attNotes,
      });
      setShowCheckInModal(false);
      setSelectedEmpForAtt('');
      setAttNotes('');
      fetchAttendance();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/hr/attendance/check-out', {
        employeeId: selectedEmpForAtt,
        notes: attNotes,
      });
      setShowCheckOutModal(false);
      setSelectedEmpForAtt('');
      setAttNotes('');
      fetchAttendance();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/hr/shifts', shiftForm);
      setShowShiftModal(false);
      fetchShifts();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">HR & Employee Management</h2>
          <p className="text-sm text-slate-500">Employee directory, attendance check-in/out, and shift rosters</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'employees' && (
            <button onClick={() => setShowEmpModal(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm text-sm">
              + New Employee
            </button>
          )}
          {activeTab === 'attendance' && (
            <div className="flex gap-2">
              <button onClick={() => setShowCheckInModal(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm text-sm">
                Check In
              </button>
              <button onClick={() => setShowCheckOutModal(true)} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg shadow-sm text-sm">
                Check Out
              </button>
            </div>
          )}
          {activeTab === 'shifts' && (
            <button onClick={() => setShowShiftModal(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm text-sm">
              + Assign Shift
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button onClick={() => setActiveTab('employees')} className={`pb-3 text-sm font-medium border-b-2 ${activeTab === 'employees' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          Employee Directory
        </button>
        <button onClick={() => setActiveTab('attendance')} className={`pb-3 text-sm font-medium border-b-2 ${activeTab === 'attendance' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          Attendance Log
        </button>
        <button onClick={() => setActiveTab('shifts')} className={`pb-3 text-sm font-medium border-b-2 ${activeTab === 'shifts' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          Shift Roster
        </button>
      </div>

      {/* EMPLOYEES TAB */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search employee by name, ID, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg w-full max-w-md text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              <option value="">All Departments</option>
              <option value="Kitchen">Kitchen</option>
              <option value="Front of House">Front of House</option>
              <option value="Management">Management</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                  <th className="p-4">Emp ID</th>
                  <th className="p-4">Name & Contact</th>
                  <th className="p-4">Department & Position</th>
                  <th className="p-4">Salary Model</th>
                  <th className="p-4">Compensation</th>
                  <th className="p-4">Overtime Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-mono font-bold text-indigo-700">{emp.employeeId}</td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-900">{emp.firstName} {emp.lastName}</div>
                      <div className="text-xs text-slate-400">{emp.email} {emp.phone ? `· ${emp.phone}` : ''}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800">{emp.position}</div>
                      <div className="text-xs text-slate-500">{emp.department}</div>
                    </td>
                    <td className="p-4 capitalize">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${emp.salaryType === 'monthly' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                        {emp.salaryType}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-emerald-600">
                      {emp.salaryType === 'monthly' ? `$${emp.baseSalary?.toFixed(2)}/mo` : `$${emp.hourlyRate?.toFixed(2)}/hr`}
                    </td>
                    <td className="p-4 text-slate-600">{emp.overtimeMultiplier}x</td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-slate-400">No employees found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                <th className="p-4">Date</th>
                <th className="p-4">Employee</th>
                <th className="p-4">Check In</th>
                <th className="p-4">Check Out</th>
                <th className="p-4">Status</th>
                <th className="p-4">Work Hours</th>
                <th className="p-4">Overtime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {attendance.map((att) => (
                <tr key={att._id}>
                  <td className="p-4 font-mono font-medium">{att.date}</td>
                  <td className="p-4 font-semibold text-slate-900">
                    {att.employee?.firstName} {att.employee?.lastName} ({att.employee?.employeeId})
                  </td>
                  <td className="p-4 text-xs text-slate-600">{att.checkIn ? new Date(att.checkIn).toLocaleTimeString() : '-'}</td>
                  <td className="p-4 text-xs text-slate-600">{att.checkOut ? new Date(att.checkOut).toLocaleTimeString() : '-'}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${
                      att.status === 'present' ? 'bg-emerald-50 text-emerald-700' :
                      att.status === 'late' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      att.status === 'early_leave' ? 'bg-orange-50 text-orange-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {att.status.replace('_', ' ')} {att.lateMinutes > 0 ? `(+${att.lateMinutes}m)` : ''}
                    </span>
                  </td>
                  <td className="p-4 font-medium">{att.workHours || 0} hrs</td>
                  <td className="p-4 font-medium text-purple-600">{att.overtimeHours || 0} hrs</td>
                </tr>
              ))}
              {attendance.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-slate-400">No attendance logs recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SHIFT ROSTER TAB */}
      {activeTab === 'shifts' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                <th className="p-4">Date</th>
                <th className="p-4">Employee</th>
                <th className="p-4">Shift Type</th>
                <th className="p-4">Hours</th>
                <th className="p-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {shifts.map((s) => (
                <tr key={s._id}>
                  <td className="p-4 font-mono font-medium">{s.date}</td>
                  <td className="p-4 font-semibold text-slate-900">
                    {s.employee?.firstName} {s.employee?.lastName} ({s.employee?.position})
                  </td>
                  <td className="p-4 capitalize">
                    <span className="px-2.5 py-1 bg-slate-100 font-medium text-xs rounded text-slate-700">{s.shiftType}</span>
                  </td>
                  <td className="p-4 font-medium text-indigo-600">{s.startTime} - {s.endTime}</td>
                  <td className="p-4 text-xs text-slate-400">{s.notes || '-'}</td>
                </tr>
              ))}
              {shifts.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-slate-400">No shift rosters scheduled.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE EMPLOYEE MODAL */}
      {showEmpModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveEmployee} className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add New Employee Profile</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">First Name</label>
                <input type="text" required value={empForm.firstName} onChange={(e) => setEmpForm({ ...empForm, firstName: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Last Name</label>
                <input type="text" required value={empForm.lastName} onChange={(e) => setEmpForm({ ...empForm, lastName: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Email</label>
              <input type="email" required value={empForm.email} onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Position</label>
                <input type="text" required placeholder="e.g. Line Cook" value={empForm.position} onChange={(e) => setEmpForm({ ...empForm, position: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Department</label>
                <select value={empForm.department} onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                  <option value="Kitchen">Kitchen</option>
                  <option value="Front of House">Front of House</option>
                  <option value="Management">Management</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t pt-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Salary Type</label>
                <select value={empForm.salaryType} onChange={(e) => setEmpForm({ ...empForm, salaryType: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                  <option value="monthly">Monthly Fixed</option>
                  <option value="hourly">Hourly Rate</option>
                </select>
              </div>
              {empForm.salaryType === 'monthly' ? (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Monthly Base ($)</label>
                  <input type="number" min="0" value={empForm.baseSalary} onChange={(e) => setEmpForm({ ...empForm, baseSalary: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Hourly Rate ($)</label>
                  <input type="number" min="0" value={empForm.hourlyRate} onChange={(e) => setEmpForm({ ...empForm, hourlyRate: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button type="button" onClick={() => setShowEmpModal(false)} className="px-4 py-2 border text-slate-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Save Employee</button>
            </div>
          </form>
        </div>
      )}

      {/* CHECK IN MODAL */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCheckIn} className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Record Employee Check-In</h3>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Select Employee</label>
              <select required value={selectedEmpForAtt} onChange={(e) => setSelectedEmpForAtt(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                <option value="">Select Employee...</option>
                {employees.map((emp) => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Notes / Remarks</label>
              <input type="text" placeholder="e.g. On-time check-in" value={attNotes} onChange={(e) => setAttNotes(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button type="button" onClick={() => setShowCheckInModal(false)} className="px-4 py-2 border text-slate-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium">Check In</button>
            </div>
          </form>
        </div>
      )}

      {/* CHECK OUT MODAL */}
      {showCheckOutModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCheckOut} className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Record Employee Check-Out</h3>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Select Employee</label>
              <select required value={selectedEmpForAtt} onChange={(e) => setSelectedEmpForAtt(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                <option value="">Select Employee...</option>
                {employees.map((emp) => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Notes / Remarks</label>
              <input type="text" placeholder="e.g. Shift completed" value={attNotes} onChange={(e) => setAttNotes(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button type="button" onClick={() => setShowCheckOutModal(false)} className="px-4 py-2 border text-slate-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium">Check Out</button>
            </div>
          </form>
        </div>
      )}

      {/* ASSIGN SHIFT MODAL */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveShift} className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Assign Shift Schedule</h3>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Employee</label>
              <select required value={shiftForm.employee} onChange={(e) => setShiftForm({ ...shiftForm, employee: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                <option value="">Select Employee...</option>
                {employees.map((emp) => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.position})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Date</label>
              <input type="date" required value={shiftForm.date} onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Start Time</label>
                <input type="time" required value={shiftForm.startTime} onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">End Time</label>
                <input type="time" required value={shiftForm.endTime} onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button type="button" onClick={() => setShowShiftModal(false)} className="px-4 py-2 border text-slate-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Assign Shift</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
