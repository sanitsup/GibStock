import { Outlet, NavLink } from 'react-router-dom'
import { ShoppingCart, Package, BarChart2, Wallet, TrendingUp } from 'lucide-react'

const navItems = [
  { to: '/pos',        icon: ShoppingCart, label: 'ขายสินค้า' },
  { to: '/stock',      icon: Package,      label: 'สต็อก'     },
  { to: '/report',     icon: BarChart2,    label: 'รายงาน'    },
  { to: '/analytics',  icon: TrendingUp,   label: 'Analytics' },
  { to: '/expenses',   icon: Wallet,       label: 'ค่าใช้จ่าย' },
]

export default function Layout() {
  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-20 bg-sky-100 flex flex-col items-center py-6 gap-6 shadow-xl">
        <img src="/gibstock_logo.png" alt="GibStock" className="w-12 h-12 rounded-full object-cover" />
        <nav className="flex flex-col gap-2 w-full px-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-medium transition-all
                ${isActive
                  ? 'bg-white text-sky-800'
                  : 'text-sky-800 hover:bg-sky-200 hover:text-sky-900'
                }`
              }
            >
              <Icon size={22} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
