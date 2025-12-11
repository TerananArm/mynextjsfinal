// app/components/Header.js
'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, LogOut, User, Sun, Moon, Camera, Calendar, Clock, Volume2, VolumeX, Menu } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useSound } from '../context/SoundContext';
import { useSession, signOut } from 'next-auth/react'; // Added signOut

export default function Header() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userData, setUserData] = useState({ name: 'Admin', image: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const fileInputRef = useRef(null);
  const router = useRouter();
  const { isDarkMode, toggleTheme, toggleSidebar } = useTheme();
  const { language, t } = useLanguage();
  const { soundEnabled, toggleSound, play } = useSound();

  const { data: session } = useSession(); // Access session data

  const handleLogout = async () => {
    play('logout');
    // Use signOut to properly clear session and redirect to login
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  useEffect(() => {
    const fetchUser = async () => {
      // Prioritize Session Data
      if (session?.user?.name) {
        setUserData({
          name: session.user.name,
          image: session.user.image || ''
        });
      }

      // Still fetch from API to get the latest image if changed
      try {
        const res = await fetch('/api/user', { cache: 'no-store' });
        if (res.ok) {
          const user = await res.json();
          setUserData(prev => ({
            name: user.name || session?.user?.name || 'Admin',
            image: user.image || prev.image || ''
          }));
        }
      } catch (error) { console.error(error); }
    };
    fetchUser();
  }, [session]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-GB', { day: '2-digit', month: 'long' });
      const timeStr = now.toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
      setCurrentTime(`${dateStr} | ${timeStr} ${language === 'th' ? 'น.' : ''}`);
    };
    updateTime();
    const intervalId = setInterval(updateTime, 1000);
    return () => clearInterval(intervalId);
  }, [language]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || 'Upload failed');
      }
      const { url } = await uploadRes.json();

      const updateRes = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Ensure cookies are sent
        body: JSON.stringify({ ...userData, image: url }),
      });

      if (!updateRes.ok) {
        const err = await updateRes.json();
        throw new Error(err.debug || err.message || err.error || 'Update failed');
      }
      setUserData(prev => ({ ...prev, image: url }));

    } catch (error) {
      console.error('Error changing profile picture:', error);
      alert(`Failed to update profile picture: ${error.message} `);
    } finally {
      setIsUploading(false);
    }
  };

  const ProfileAvatar = ({ imageUrl, userName, size = "md", className = "" }) => {
    const sizeClasses = {
      sm: "h-8 w-8 text-sm",
      md: "h-10 w-10 text-lg",
      lg: "h-24 w-24 text-4xl",
    };

    const [imgError, setImgError] = useState(false);

    return (
      <div className={`relative rounded-full overflow-hidden bg-gradient-to-tr from-red-500 to-orange-500 border-2 border-white/20 flex items-center justify-center shadow-md ${sizeClasses[size]} ${className}`}>
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt="Profile"
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-white font-bold leading-none">{userName?.[0] || 'A'}</span>
        )}
      </div>
    );
  };

  // Dropdown Background Style (Matching TableModal)
  const dropdownBg = isDarkMode
    ? 'bg-[#151925]/90 border border-white/10 shadow-[0_0_60px_-15px_rgba(0,0,0,0.6)] backdrop-blur-[50px] backdrop-saturate-150'
    : 'bg-white/90 border border-white/40 shadow-[0_30px_80px_-15px_rgba(0,0,0,0.2)] backdrop-blur-[50px] backdrop-saturate-150';

  // Portal implementation to break out of Header's stacking context
  const DropdownPortal = ({ children }) => {
    if (typeof window === 'undefined') return null;
    return createPortal(children, document.body);
  };

  return (
    <header
      className={`sticky top-0 z-40 flex h-20 items-center justify-between px-8 shadow-sm transition-all duration-500 backdrop-blur-[50px] backdrop-saturate-150 border-b
        ${isDarkMode
          ? 'bg-slate-800/40 border-white/10 text-white'
          : 'bg-slate-200/50 border-white/40 text-slate-800'
        }`}
    >
      {/* Left Section: Mobile Menu & Title */}
      <div className="flex items-center gap-4">
        {/* Mobile Sidebar Toggle */}
        <button
          onClick={toggleSidebar}
          className={`md:hidden p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
        >
          <Menu size={24} />
        </button>

        <h2 className="text-xl font-bold tracking-wide flex items-center gap-2 drop-shadow-sm">
          <span className={`w-1.5 h-6 rounded-full inline-block ${isDarkMode ? 'bg-white/40' : 'bg-red-500'}`}></span>
          {t('dashboard')}
        </h2>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">

        {/* Sound Toggle */}
        <button
          onClick={() => { toggleSound(); play('toggle'); }}
          className={`p-2 rounded-lg transition-all border backdrop-blur-md shadow-sm
              ${isDarkMode
              ? 'bg-white/5 hover:bg-white/10 border-white/10'
              : 'bg-white hover:bg-slate-50 border-slate-200'
            } ${soundEnabled ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600') : (isDarkMode ? 'text-slate-500' : 'text-slate-400')}`}
          title={soundEnabled ? 'ปิดเสียง' : 'เปิดเสียง'}
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => { toggleTheme(); play('toggle'); }}
          className={`p-2 rounded-lg transition-all border backdrop-blur-md shadow-sm
              ${isDarkMode
              ? 'bg-white/5 text-yellow-400 hover:bg-white/10 border-white/10'
              : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
            }`}
        >
          {isDarkMode ? <Sun size={20} className="drop-shadow-[0_0_8px_rgba(253,224,71,0.5)]" /> : <Moon size={20} />}
        </button>

        <div className={`h-8 w-[1px] ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`}></div>

        {/* Profile Section */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full transition-all border
                ${isDarkMode ? 'hover:bg-white/5 border-transparent hover:border-white/10' : 'hover:bg-white/20 border-transparent hover:border-white/40'}
`}
          >
            <ProfileAvatar imageUrl={userData.image} userName={userData.name} />
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold leading-none">{userData.name}</p>
              <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('adminRole')}</p>
            </div>
            <ChevronDown size={16} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu with Portal */}
          {isDropdownOpen && (
            <DropdownPortal>
              <div className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-[2px] transition-all duration-300 animate-fade-in" onClick={() => setIsDropdownOpen(false)}></div>

              <div className={`fixed top-24 right-8 w-80 rounded-[2.5rem] animate-fade-in z-[1000] overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] border ${dropdownBg}`}>

                {/* Header Background with Date */}
                <div className={`relative h-32 flex items-center justify-center overflow-hidden backdrop-blur-md
                    ${isDarkMode ? 'bg-gradient-to-r from-red-900/40 to-pink-900/40' : 'bg-gradient-to-r from-red-100/60 to-pink-100/60'}
`}>
                  <div className="absolute inset-0 opacity-30 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
                  <div className={`text-lg font-bold flex items-center gap-2 opacity-80 ${isDarkMode ? 'text-white' : 'text-red-800'}`}>
                    <Calendar size={18} /> {currentTime}
                  </div>
                </div>

                {/* Profile Content */}
                <div className="relative px-6 pb-6 -mt-12 flex flex-col items-center">

                  {/* Avatar */}
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className={`p-1.5 rounded-full ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white'}`}>
                      <ProfileAvatar imageUrl={userData.image} userName={userData.name} size="lg" className="transition-transform group-hover:scale-105" />
                    </div>
                    {/* Camera Overlay - pointer-events-none allows clicks to pass through */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 rounded-full transition-all m-1.5 backdrop-blur-[2px] pointer-events-none">
                      <Camera className="text-white opacity-70 group-hover:opacity-100 transition-opacity drop-shadow-md" size={24} />
                    </div>
                    {isUploading && <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full m-1.5"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />

                  {/* Menu Items - Increased spacing */}
                  <div className="w-full space-y-4 mt-6">
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setIsDropdownOpen(false)}
                      className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group
                        ${isDarkMode
                          ? 'bg-white/5 hover:bg-white/10 text-slate-100'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                        }`}
                    >
                      <div className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'bg-white/5 group-hover:bg-white/10' : 'bg-white group-hover:bg-white shadow-sm'}`}>
                        <User size={20} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                      </div>
                      <span className="font-bold">{t('profile')}</span>
                    </Link>

                    <button
                      onClick={handleLogout}
                      className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group text-left
                        ${isDarkMode
                          ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                          : 'bg-red-50 hover:bg-red-100 text-red-600'
                        }`}
                    >
                      <div className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'bg-red-500/10 group-hover:bg-red-500/20' : 'bg-white group-hover:bg-white shadow-sm'}`}>
                        <LogOut size={20} />
                      </div>
                      <span className="font-bold">{t('logout')}</span>
                    </button>
                  </div>

                </div>
              </div>
            </DropdownPortal>
          )}
        </div>
      </div>
    </header>
  );
}