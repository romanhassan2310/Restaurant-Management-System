import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/pos', label: 'POS' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/shifts', label: 'Shifts' },
  { to: '/payments', label: 'Payments' },
  { to: '/kitchen', label: 'Kitchen' },
  { to: '/tables', label: 'Tables' },
  { to: '/waiter', label: 'Waiter' },
  { to: '/procurement', label: 'Procurement' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold">Restaurant Management System</h1>
          </div>
          <nav className="flex gap-4">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
