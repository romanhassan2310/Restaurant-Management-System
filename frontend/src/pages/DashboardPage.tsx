export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Total Sales</p>
          <h2 className="mt-2 text-3xl font-bold">$0.00</h2>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Orders</p>
          <h2 className="mt-2 text-3xl font-bold">0</h2>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Low Stock</p>
          <h2 className="mt-2 text-3xl font-bold">0</h2>
        </div>
      </div>
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h3 className="text-lg font-semibold">Executive Summary</h3>
        <p className="mt-2 text-slate-600">
          Dashboard data will connect to real business metrics once the reporting and analytics modules are implemented.
        </p>
      </div>
    </div>
  );
}
