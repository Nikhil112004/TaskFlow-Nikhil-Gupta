import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useAppSelector } from '../../store';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/index';
import { Sun, Moon, LogOut, Layers, Wifi, WifiOff, Loader, Menu, X, FolderOpen } from 'lucide-react';
import { cn } from '../../lib/utils';

function WsIndicator() {
  const status = useAppSelector((s) => s.ui.wsStatus);
  const map = {
    connected:    { icon: Wifi,    color: 'text-emerald-500', label: 'Live'       },
    connecting:   { icon: Loader,  color: 'text-amber-500',   label: 'Connecting' },
    disconnected: { icon: WifiOff, color: 'text-muted-foreground', label: 'Offline' },
    error:        { icon: WifiOff, color: 'text-destructive',  label: 'Error'      },
  } as const;
  const { icon: Icon, color, label } = map[status];
  return (
    <span
      className={cn('hidden sm:inline-flex items-center gap-1 text-xs', color)}
      title={`WebSocket: ${label}`}
      aria-label={`Connection status: ${label}`}
    >
      <Icon className={cn('w-3.5 h-3.5', status === 'connecting' && 'animate-spin')} />
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [{ href: '/projects', label: 'Projects', icon: FolderOpen }];
  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/');

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-card/72 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link
            to="/projects"
            className="flex items-center gap-2 font-semibold text-foreground hover:opacity-80 transition-opacity shrink-0"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary shadow-[0_8px_20px_-12px_hsl(var(--primary))]">
              <Layers className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm sm:text-base tracking-tight">TaskFlow</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1.5 flex-1 px-5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-sm transition-colors',
                  isActive(link.href)
                    ? 'bg-accent text-accent-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <WsIndicator />

            <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
              {theme === 'light'
                ? <Moon className="w-4 h-4 text-muted-foreground" />
                : <Sun className="w-4 h-4 text-muted-foreground" />
              }
            </Button>

            {user && (
              <>
                {/* Desktop user pill */}
                <div className="hidden sm:flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-border/70 bg-background/80">
                  <Avatar name={user.name} size="sm" />
                  <span className="text-xs font-medium text-foreground max-w-[120px] truncate">{user.name}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={logout} title="Sign out" aria-label="Sign out" className="hidden sm:flex">
                  <LogOut className="w-4 h-4 text-muted-foreground" />
                </Button>

                {/* Mobile hamburger */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="sm:hidden"
                  onClick={() => setMobileOpen((v) => !v)}
                  aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={mobileOpen}
                >
                  {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && user && (
          <div className="sm:hidden border-t border-border/70 bg-card animate-fade-in">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                    isActive(link.href)
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))}
            </div>
            {/* Mobile user + actions */}
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar name={user.name} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setMobileOpen(false); logout(); }}
                className="text-muted-foreground"
              >
                <LogOut className="w-4 h-4 mr-1.5" /> Sign out
              </Button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
