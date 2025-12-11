// app/components/Sidebar.js
'use client';
import {
  LayoutDashboard, Calendar, DoorOpen, Users,
  UserSquare2, BookOpen, Building2, ListChecks, UserCog,
  Menu, LogOut, GraduationCap, Globe
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useSound } from '../context/SoundContext';
import { useSession, signOut } from 'next-auth/react';
import LanguageSelector from './LanguageSelector';

export default function Sidebar() {
  const pathname = usePathname();
  const { isSidebarCollapsed, toggleSidebar, isDarkMode } = useTheme();
  const { language, t } = useLanguage();
  const { play } = useSound();
  const { data: session } = useSession();
  const role = session?.user?.role || 'student'; // Safety default

  const allMenuItems = [
    { name: t('dashboard'), icon: LayoutDashboard, path: '/dashboard', roles: ['admin', 'teacher', 'student'] },
    { name: t('schedule'), icon: Calendar, path: '/dashboard/schedule', roles: ['admin', 'teacher', 'student'] },
    { name: t('rooms'), icon: DoorOpen, path: '/dashboard/rooms', roles: ['admin'] },
    { name: t('students'), icon: Users, path: '/dashboard/students', roles: ['admin'] },
    { name: t('teachers'), icon: UserSquare2, path: '/dashboard/teachers', roles: ['admin'] },
    { name: t('subjects'), icon: BookOpen, path: '/dashboard/subjects', roles: ['admin'] },
    { name: t('departments'), icon: Building2, path: '/dashboard/departments', roles: ['admin'] },
    { name: t('levels'), icon: GraduationCap, path: '/dashboard/levels', roles: ['admin'] },
    { name: t('curriculum'), icon: ListChecks, path: '/dashboard/curriculum', roles: ['admin'] },
    { name: t('users'), icon: UserCog, path: '/dashboard/users', roles: ['admin'] },
  ];

  const menuItems = allMenuItems.filter(item => item.roles.includes(role));

  return (
    // ✅ Apple Launchpad Style: เบลอหนัก (blur-[50px]) + สีเทาด้าน (bg-gray-500/30)
    <>
      {/* Mobile Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden ${isSidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
        onClick={() => toggleSidebar()}
      />

      <aside
        className={`fixed top-0 left-0 z-50 h-screen transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-2xl border-r transform-gpu backdrop-blur-[50px] backdrop-saturate-150
          md:translate-x-0
          ${isSidebarCollapsed ? '-translate-x-full md:w-20' : 'translate-x-0 w-[280px]'}
          ${isDarkMode
            ? 'bg-slate-800/40 border-white/10 text-gray-200'
            : 'bg-slate-200/50 border-white/40 text-slate-800'
          }
        `}
      >
        {/* Header Logo */}
        <div className={`flex h-20 items-center justify-between px-4 transition-colors duration-500
         ${isDarkMode ? 'border-b border-white/5' : 'border-b border-white/20'}
      `}>
          <div className={`flex items-center gap-3 overflow-hidden whitespace-nowrap transition-all duration-500 ${isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            <div className="p-2 bg-red-600 rounded-lg shadow-lg shadow-red-500/30 shrink-0">
              <GraduationCap size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none tracking-wide drop-shadow-sm">EduSched AI</h1>
            </div>
          </div>

          <button
            onClick={() => { play('click'); toggleSidebar(); }}
            className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${isSidebarCollapsed ? 'mx-auto' : ''}`}
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Menu List */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar h-[calc(100vh-160px)]">
          {menuItems.map((item) => {
            const isActive = item.path === '/dashboard'
              ? pathname === item.path
              : pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => play('navigate')}
                className={`group flex items-center transition-all duration-300 relative overflow-hidden rounded-xl mb-1
                ${isSidebarCollapsed ? 'justify-center py-4' : 'px-4 py-3'}
                ${isActive
                    ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/30'
                    : 'hover:bg-white/20 hover:text-red-600'
                  }
              `}
              >
                <item.icon size={20} className={`shrink-0 transition-colors duration-300 ${isActive ? 'text-white' : ''}`} />

                <span className={`ml-4 text-sm font-medium whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'w-0 opacity-0 hidden translate-x-[-10px]' : 'w-auto opacity-100 translate-x-0'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Profile & Language Toggle */}
        <div className={`absolute bottom-0 w-full p-4 border-t backdrop-blur-md transition-colors duration-500 ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-white/10 border-white/20'}`}>
          <div className={`flex flex-col gap-3`}>
            {/* Language Selector */}
            <LanguageSelector isSidebarCollapsed={isSidebarCollapsed} />

            <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-red-500 to-orange-500 flex items-center justify-center text-xs font-bold text-white shadow-md shrink-0">
                A
              </div>
              <div className={`overflow-hidden whitespace-nowrap transition-all duration-500 ${isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                <p className="text-sm font-bold truncate">Admin User</p>
                <button
                  onClick={() => signOut({ redirect: true, callbackUrl: '/login' })}
                  className="text-[10px] opacity-70 hover:text-red-500 flex items-center gap-1 mt-0.5 cursor-pointer transition-colors"
                >
                  <LogOut size={10} /> {t('logout')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}