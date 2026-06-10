'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, logoutUser, refreshCurrentUser } from '@/lib/auth';
import { ChatUser, User } from '@/lib/types';
import { ApiClient } from '@/lib/api-client';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Stethoscope,
  HelpCircle,
  UserPlus,
  MessageCircle,
  ClipboardCheck,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BrandMark } from '@/components/brand-mark';
import { usePathname } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';

interface SidebarLink {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
  superadminOnly?: boolean;
}

const IDLE_TIMEOUT_MS = 4 * 60 * 60 * 1000;
const LAST_ACTIVITY_KEY = 'clinic_last_activity_at';
const CHAT_UNREAD_POLL_MS = 30 * 1000;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef(false);
  const hasSeenUnreadSnapshotRef = useRef(false);
  const previousUnreadCountRef = useRef(0);

  const playChatNotificationSound = useCallback(() => {
    if (!audioUnlockedRef.current) return;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioContext = audioContextRef.current || new AudioContextClass();
      audioContextRef.current = audioContext;

      if (audioContext.state === 'suspended') {
        void audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const now = audioContext.currentTime;

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, now);
      oscillator.frequency.setValueAtTime(1175, now + 0.08);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.24);
    } catch (error) {
      console.warn('Chat notification sound could not play:', error);
    }
  }, []);

  useEffect(() => {
    const bootstrapUser = async () => {
      const currentUser = getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setIsAuthLoading(false);
        return;
      }

      const refreshedUser = await refreshCurrentUser();
      if (refreshedUser) {
        setUser(refreshedUser);
      } else {
        router.push('/login');
      }
      setIsAuthLoading(false);
    };

    bootstrapUser();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    let timeoutId: number | undefined;

    const signOutForIdle = () => {
      logoutUser();
      window.localStorage.removeItem(LAST_ACTIVITY_KEY);
      router.push('/login?reason=idle');
    };

    const getLastActivity = () => {
      const stored = window.localStorage.getItem(LAST_ACTIVITY_KEY);
      const parsed = stored ? Number(stored) : Date.now();
      return Number.isFinite(parsed) ? parsed : Date.now();
    };

    const scheduleLogout = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      const elapsed = Date.now() - getLastActivity();
      const remaining = IDLE_TIMEOUT_MS - elapsed;

      if (remaining <= 0) {
        signOutForIdle();
        return;
      }

      timeoutId = window.setTimeout(signOutForIdle, remaining);
    };

    const recordActivity = () => {
      window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      scheduleLogout();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === LAST_ACTIVITY_KEY) {
        scheduleLogout();
      }
    };

    if (!window.localStorage.getItem(LAST_ACTIVITY_KEY)) {
      window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    }

    scheduleLogout();

    const activityEvents: Array<keyof WindowEventMap> = [
      'click',
      'keydown',
      'mousemove',
      'scroll',
      'touchstart',
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, { passive: true });
    });
    window.addEventListener('storage', handleStorage);

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity);
      });
      window.removeEventListener('storage', handleStorage);
    };
  }, [router, user]);

  useEffect(() => {
    const unlockAudio = () => {
      audioUnlockedRef.current = true;

      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass || audioContextRef.current) return;

        audioContextRef.current = new AudioContextClass();
        if (audioContextRef.current.state === 'suspended') {
          void audioContextRef.current.resume();
        }
      } catch (error) {
        console.warn('Chat notification audio could not be prepared:', error);
      }
    };

    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadUnreadMessages = async () => {
      try {
        const response = await ApiClient.getChatUsers();
        const users: ChatUser[] = response?.data || response?.users || [];
        const unreadTotal = users.reduce((sum, chatUser) => sum + (chatUser.unreadCount || 0), 0);
        if (
          hasSeenUnreadSnapshotRef.current &&
          unreadTotal > previousUnreadCountRef.current
        ) {
          playChatNotificationSound();
        }
        previousUnreadCountRef.current = unreadTotal;
        hasSeenUnreadSnapshotRef.current = true;
        setUnreadChatCount(unreadTotal);
      } catch {
        setUnreadChatCount(0);
      }
    };

    const initialLoad = window.setTimeout(() => {
      void loadUnreadMessages();
    }, 0);
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      void loadUnreadMessages();
    }, CHAT_UNREAD_POLL_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadUnreadMessages();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [playChatNotificationSound, user]);

  const handleLogout = () => {
    logoutUser();
    router.push('/login');
  };

  const sidebarLinks: SidebarLink[] = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      href: '/dashboard/patients',
      label: 'Patients',
      icon: <Users className="w-5 h-5" />,
    },
    {
      href: '/dashboard/check-ins',
      label: 'Check-ins',
      icon: <ClipboardCheck className="w-5 h-5" />,
    },
    {
      href: '/dashboard/doctors',
      label: 'Doctors',
      icon: <Stethoscope className="w-5 h-5" />,
      roles: ['admin'],
    },
    {
      href: '/dashboard/users',
      label: 'Users',
      icon: <UserPlus className="w-5 h-5" />,
      roles: ['admin'],
      superadminOnly: true,
    },
    {
      href: '/dashboard/appointments',
      label: 'Appointments',
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      href: '/dashboard/consultations',
      label: 'Consultations',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      href: '/dashboard/chat',
      label: 'Chat',
      icon: <MessageCircle className="w-5 h-5" />,
    },
    {
      href: '/dashboard/settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
      roles: ['admin'],
    },
    {
      href: '/dashboard/help',
      label: 'Help & Guide',
      icon: <HelpCircle className="w-5 h-5" />,
    },
  ];

  // Filter links based on user role
  const visibleLinks = sidebarLinks.filter(
    (link) =>
      (!link.roles || (user && link.roles.includes(user.role))) &&
      (!link.superadminOnly || Boolean(user?.isSuperAdmin))
  );

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const sidebarExpanded = !isMobile || sidebarOpen;
  const sidebarWidthClass = sidebarExpanded ? 'md:pl-72' : 'md:pl-24';

  if (isAuthLoading) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(124,199,184,0.12),transparent_25%),linear-gradient(180deg,rgba(248,252,251,1),rgba(240,247,246,1))]">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarExpanded ? 'w-72' : 'w-24'
        } text-white transition-all duration-300 flex flex-col shadow-[0_24px_80px_-28px_rgba(8,47,73,0.8)] ${
          isMobile && !sidebarOpen ? 'hidden' : ''
        } fixed left-0 top-0 z-50 h-screen bg-[#275cc2]`}
      >
        {/* Logo */}
        <div className="border-b border-white/10 p-6">
          <div className={`flex items-center gap-3 ${!sidebarExpanded ? 'justify-center' : ''}`}>
            <BrandMark className="h-12 w-12 bg-white shadow-black/10" priority />
            {sidebarExpanded && (
              <div>
                <h1 className="text-lg font-semibold leading-none text-white">Health One</h1>
                <p className="mt-1 text-xs text-cyan-50/80">Health Management System</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-2 p-4">
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                isActive(link.href)
                ? 'bg-white/20 text-white shadow-lg shadow-black/10 ring-1 ring-white/20'
                : 'text-cyan-50/80 hover:bg-white/10 hover:text-white'
              } ${!sidebarExpanded ? 'justify-center px-3' : ''}`}
            >
              <span className="relative">
                {link.icon}
                {link.label === 'Chat' && unreadChatCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                    {unreadChatCount > 9 ? '9+' : unreadChatCount}
                  </span>
                )}
              </span>
              {sidebarExpanded && (
                <span className="flex flex-1 items-center justify-between gap-2">
                  {link.label}
                  {link.label === 'Chat' && unreadChatCount > 0 && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                      {unreadChatCount}
                    </span>
                  )}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* User Info and Logout */}
        <div className="space-y-3 border-t border-white/10 p-4">
          <div className={`${!sidebarExpanded ? 'hidden' : ''}`}>
            <p className="text-xs text-cyan-50/75">Logged in as</p>
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="text-xs capitalize text-cyan-50/75">{user.role}</p>
          </div>
          <Button
            onClick={handleLogout}
            size="sm"
            variant="outline"
            className={`w-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white ${
              !sidebarExpanded ? 'justify-center px-0' : ''
            }`}
          >
            <LogOut className="w-4 h-4" />
            {sidebarExpanded && 'Logout'}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex min-h-screen flex-col ${sidebarWidthClass}`}>
        {/* Top Header */}
        <header className={`fixed left-0 right-0 top-0 z-40 flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 py-4 backdrop-blur-xl md:justify-end md:px-6 ${sidebarWidthClass}`}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 md:hidden"
          >
            {sidebarOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/chat"
              className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 md:hidden"
            >
              <MessageCircle className="h-5 w-5" />
              {unreadChatCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white">
                  {unreadChatCount > 9 ? '9+' : unreadChatCount}
                </span>
              )}
              <span className="sr-only">Open chat</span>
            </Link>
            <div className="hidden items-center gap-3 rounded-full border border-teal-100 bg-teal-50/70 px-4 py-2 text-sm text-teal-950 md:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full clinic-gradient text-white">
                <Users className="h-4 w-4" />
              </div>
              Welcome, {user.name}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 pt-24 md:p-6 md:pt-24">
          {isMobile && sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
