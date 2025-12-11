// app/dashboard/layout.js
'use client';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header'; // ✅ แก้ไขจาก './components/Navbar' เป็น '../components/Header'
import { useTheme } from '../context/ThemeContext';

function DashboardContent({ children }) {
   const { isSidebarCollapsed, isDarkMode } = useTheme();
   const { data: session, status } = useSession();
   const router = useRouter();

   // Client-side auth protection (fallback for middleware)
   useEffect(() => {
      if (status === 'unauthenticated') {
         router.replace('/login');
      }
   }, [status, router]);

   // Show loading while checking session
   if (status === 'loading') {
      return (
         <div className={`flex h-screen w-full items-center justify-center ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f0f4f8]'}`}>
            <div className="flex flex-col items-center gap-4">
               <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
               <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>กำลังตรวจสอบการเข้าสู่ระบบ...</p>
            </div>
         </div>
      );
   }

   // Don't render content if not authenticated
   if (status === 'unauthenticated') {
      return null;
   }

   return (
      <div className={`flex h-screen w-full overflow-hidden transition-colors duration-700 ease-in-out ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f0f4f8]'}`}>

         {/* ================= BACKGROUND (Premium but Subtle) ================= */}
         <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {/* พื้นหลังไล่เฉดสีนุ่มๆ */}
            <div className={`absolute inset-0 transition-colors duration-1000 ease-linear
                ${isDarkMode
                  ? 'bg-[#0D1117]'
                  : 'bg-[#F5F5F7]'
               }`}>
            </div>

            {/* Subtle Grid Pattern */}
            <div className={`absolute inset-0 opacity-[0.03]
                ${isDarkMode ? 'bg-grid-dark' : 'bg-grid-light'}`}
               style={{
                  backgroundImage: isDarkMode
                     ? 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)'
                     : 'radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)',
                  backgroundSize: '24px 24px'
               }}
            />

            {/* Blob 1: Reduced opacity for subtlety */}
            <div className={`absolute -top-[10%] -right-[10%] w-[70vw] h-[70vw] rounded-full blur-[120px] opacity-20 pointer-events-none mix-blend-multiply transition-all duration-[3000ms] transform-gpu animate-drift
                ${isDarkMode ? 'bg-indigo-900/50' : 'bg-red-100'}`}>
            </div>

            {/* Blob 2: Softer with slow animation */}
            <div className={`absolute top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full blur-[100px] opacity-15 pointer-events-none mix-blend-multiply transition-all duration-[3500ms] transform-gpu animate-drift-slow
                ${isDarkMode ? 'bg-blue-900/40' : 'bg-blue-100'}`}>
            </div>

            {/* Blob 3: Bottom accent, very subtle */}
            <div className={`absolute bottom-[-10%] right-[20%] w-[60vw] h-[60vw] rounded-full blur-[130px] opacity-10 pointer-events-none mix-blend-multiply transition-all duration-[4000ms] transform-gpu animate-drift-reverse
                ${isDarkMode ? 'bg-purple-900/30' : 'bg-orange-50'}`}>
            </div>

            {/* Subtle shimmer overlay - very light */}
            <div className={`absolute inset-0 opacity-[0.02] pointer-events-none
                ${isDarkMode ? 'bg-gradient-shimmer-dark' : 'bg-gradient-shimmer-light'}`}
               style={{
                  backgroundImage: isDarkMode
                     ? 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.03) 50%, transparent 60%)'
                     : 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%)',
                  backgroundSize: '200% 200%',
                  animation: 'shimmer 8s ease-in-out infinite'
               }}
            />

            {/* ✅ Global Blur Overlay - reduced for crispness */}
            <div className="absolute inset-0 backdrop-blur-2xl"></div>
         </div>

         {/* Sidebar */}
         <div className="relative z-50">
            <Sidebar />
         </div>

         {/* Main Content Area */}
         <div
            className={`flex flex-1 flex-col h-full overflow-hidden transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) relative z-10 ml-0 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-[280px]'}`}
         >
            <Header />
            <main className="flex-1 overflow-y-auto p-2 md:px-6 md:py-4 scroll-smooth custom-scrollbar relative z-10">
               {children}
            </main>
         </div>
      </div>
   );
}

export default function DashboardLayout({ children }) {
   return (
      <DashboardContent>{children}</DashboardContent>
   );
}