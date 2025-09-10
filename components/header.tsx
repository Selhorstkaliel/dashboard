'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { 
  BarChart3, 
  PlusCircle, 
  HeadphonesIcon, 
  Settings, 
  LogOut, 
  Activity 
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Cadastro', href: '/cadastro', icon: PlusCircle },
  { name: 'Suporte', href: '/support', icon: HeadphonesIcon },
  { name: 'Configuração', href: '/config', icon: Settings },
];

export function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-700/50 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center neon-glow">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              LIMITCLEAN
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    className={cn(
                      'flex items-center space-x-2 transition-all duration-200',
                      isActive && 'neon-glow'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{item.name}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* User info and logout */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-medium text-slate-200">
                {user?.name}
              </div>
              <div className="text-xs text-slate-400 capitalize">
                {user?.role}
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout()}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden lg:inline ml-2">Sair</span>
            </Button>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="md:hidden border-t border-slate-700/50 py-2">
          <nav className="flex justify-around">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    className={cn(
                      'flex flex-col items-center space-y-1 h-auto py-2 px-3',
                      isActive && 'neon-glow'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs">{item.name}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}