import { NavLink } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/chat', label: 'Chat', end: false },
  { to: '/admin', label: 'Admin', end: false },
]

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <NavLink to="/" className="flex items-center gap-2 font-bold text-lg">
          <BookOpen className="h-5 w-5 text-primary" />
          <span>SPO Docs</span>
        </NavLink>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                  isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
