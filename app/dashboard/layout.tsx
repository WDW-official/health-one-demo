'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import {
  adoptCurrentAuthSession,
  AUTH_SESSION_KEY,
  clearCurrentTabAuthSession,
  getAuthSessionId,
  getCurrentUser,
  getTabAuthSessionId,
  isCurrentTabAuthSessionActive,
  logoutUser,
  refreshCurrentUser,
  startAuthSession,
} from '@/lib/auth';
import { ChatUser, Hospital, User } from '@/lib/types';
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
  BarChart3,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BrandMark } from '@/components/brand-mark';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePathname } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { getActiveClinicProfile, setActiveClinicProfile } from '@/lib/active-clinic-profile';
import { CLINIC_TYPE_OPTIONS, getClinicTypeLabel, getClinicTypeLabels, normalizeClinicTypes } from '@/lib/clinic-config';
import { withHospitalDashboardPath } from '@/lib/tenant-routing';
import type { ClinicType } from '@/lib/types';

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
const SUBSCRIPTION_WARNING_DAYS = 7;
const DISMISSED_SUBSCRIPTION_NOTICE_KEY = 'healthone_dismissed_subscription_notice';

function getHospitalExpiry(hospital: Hospital | null) {
  if (!hospital) return null;
  if (hospital.subscriptionStatus === 'trial') return hospital.trialEndsAt;
  if (hospital.subscriptionStatus === 'active') return hospital.currentPeriodEndsAt;
  return hospital.currentPeriodEndsAt || hospital.trialEndsAt;
}

function getDaysUntil(date?: Date | string | null) {
  if (!date) return null;
  const timestamp = new Date(date).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.ceil((timestamp - Date.now()) / (1000 * 60 * 60 * 24));
}

function getSubscriptionNotice(hospital: Hospital | null) {
  const days = getDaysUntil(getHospitalExpiry(hospital));
  if (!hospital || days === null) return null;

  const label = hospital.subscriptionStatus === 'trial' ? 'trial' : 'subscription';

  if (days < 0) {
    return {
      tone: 'danger',
      message: `Your ${label} expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago. Please contact Health One to renew access.`,
    };
  }

  if (days <= SUBSCRIPTION_WARNING_DAYS) {
    return {
      tone: days <= 2 ? 'danger' : 'warning',
      message:
        days === 0
          ? `Your ${label} expires today. Please contact Health One to renew access.`
          : `Your ${label} expires in ${days} day${days === 1 ? '' : 's'}. Please contact Health One to renew before it expires.`,
    };
  }

  return null;
}

function getSubscriptionNoticeKey(hospital: Hospital | null) {
  if (!hospital) return '';
  const expiry = getHospitalExpiry(hospital);
  const expiryValue = expiry ? new Date(expiry).toISOString().slice(0, 10) : 'none';
  return `${hospital.id || hospital.slug || 'demo'}:${hospital.subscriptionStatus}:${expiryValue}`;
}

function isSubscriptionNoticeDismissed(noticeKey: string) {
  if (!noticeKey || typeof window === 'undefined') return false;
  return window.localStorage.getItem(DISMISSED_SUBSCRIPTION_NOTICE_KEY) === noticeKey;
}

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [activeClinicType, setActiveClinicType] = useState<ClinicType>('dental');
  const [dismissedSubscriptionNoticeKey, setDismissedSubscriptionNoticeKey] = useState('');
  const [isSubscriptionNoticeModalOpen, setIsSubscriptionNoticeModalOpen] = useState(false);
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
        const refreshedUser = await refreshCurrentUser();
        if (!refreshedUser) {
          router.push('/login?reason=account-suspended');
          setIsAuthLoading(false);
          return;
        }

        if (!getAuthSessionId()) {
          startAuthSession(refreshedUser);
        } else if (!getTabAuthSessionId()) {
          adoptCurrentAuthSession();
        } else if (!isCurrentTabAuthSessionActive()) {
          clearCurrentTabAuthSession();
          router.push('/login?reason=account-changed');
          setIsAuthLoading(false);
          return;
        }

        setUser(refreshedUser);
        setIsAuthLoading(false);
        return;
      }

      const refreshedUser = await refreshCurrentUser();
      if (refreshedUser) {
        if (!getAuthSessionId()) {
          startAuthSession(refreshedUser);
        } else if (!getTabAuthSessionId()) {
          adoptCurrentAuthSession();
        }
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

    const sendTabToLogin = () => {
      clearCurrentTabAuthSession();
      setUser(null);
      ApiClient.setActiveHospital(null);
      router.push('/login?reason=account-changed');
    };

    const verifyTabSession = () => {
      if (!getCurrentUser() || !getAuthSessionId()) {
        clearCurrentTabAuthSession();
        setUser(null);
        ApiClient.setActiveHospital(null);
        router.push('/login');
        return;
      }

      if (!isCurrentTabAuthSessionActive()) {
        sendTabToLogin();
      }
    };

    const handleAuthStorage = (event: StorageEvent) => {
      if (event.key === AUTH_SESSION_KEY && event.newValue !== getTabAuthSessionId()) {
        sendTabToLogin();
      }

      if ((event.key === 'clinic_auth_user' || event.key === 'auth_token') && !event.newValue) {
        clearCurrentTabAuthSession();
        setUser(null);
        ApiClient.setActiveHospital(null);
        router.push('/login');
      }
    };

    window.addEventListener('storage', handleAuthStorage);
    window.addEventListener('focus', verifyTabSession);
    document.addEventListener('visibilitychange', verifyTabSession);

    return () => {
      window.removeEventListener('storage', handleAuthStorage);
      window.removeEventListener('focus', verifyTabSession);
      document.removeEventListener('visibilitychange', verifyTabSession);
    };
  }, [router, user]);

  useEffect(() => {
    if (!user) return;

    const loadHospitalBranding = async () => {
      const activeHospital = ApiClient.getActiveHospital();
      if (user.isSuperAdmin && !user.hospitalId && !activeHospital) {
        const demoHospital = ApiClient.getDemoHospitalSettings() as Hospital;
        const noticeKey = getSubscriptionNoticeKey(demoHospital);
        setHospital(demoHospital);
        setActiveClinicType(getActiveClinicProfile(demoHospital.clinicTypes, demoHospital.id || demoHospital.slug));
        setDismissedSubscriptionNoticeKey(
          isSubscriptionNoticeDismissed(noticeKey) ? noticeKey : ''
        );
        setIsSubscriptionNoticeModalOpen(
          Boolean(getSubscriptionNotice(demoHospital)) && !isSubscriptionNoticeDismissed(noticeKey)
        );
        return;
      }

      try {
        const response = await ApiClient.getHospitalSettings();
        const nextHospital = response?.hospital || response?.data || null;
        const noticeKey = getSubscriptionNoticeKey(nextHospital);
        setHospital(nextHospital);
        setActiveClinicType(
          getActiveClinicProfile(nextHospital?.clinicTypes, nextHospital?.id || nextHospital?.slug || 'demo')
        );
        setDismissedSubscriptionNoticeKey(
          isSubscriptionNoticeDismissed(noticeKey) ? noticeKey : ''
        );
        setIsSubscriptionNoticeModalOpen(
          Boolean(getSubscriptionNotice(nextHospital)) && !isSubscriptionNoticeDismissed(noticeKey)
        );
      } catch (loadError: any) {
        if (String(loadError?.message || '').toLowerCase().includes('suspended')) {
          logoutUser();
          ApiClient.setActiveHospital(null);
          router.push('/login?reason=account-suspended');
          return;
        }

        setHospital(null);
        setActiveClinicType('dental');
        setDismissedSubscriptionNoticeKey('');
        setIsSubscriptionNoticeModalOpen(false);
      }
    };

    void loadHospitalBranding();
  }, [router, user]);

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
    ApiClient.setActiveHospital(null);
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
      href: '/dashboard/billing',
      label: 'Billing',
      icon: <CreditCard className="w-5 h-5" />,
      roles: ['admin'],
    },
    {
      href: '/dashboard/reports',
      label: 'Reports',
      icon: <BarChart3 className="w-5 h-5" />,
      roles: ['admin'],
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
  const activeHospital = ApiClient.getActiveHospital();
  const routeUser = user
    ? {
        ...user,
        hospitalSlug: hospital?.slug || activeHospital?.slug || user.hospitalSlug || null,
      }
    : user;

  const isActive = (href: string) => {
    const tenantHref = withHospitalDashboardPath(href, routeUser);
    if (href === '/dashboard') return pathname === href || pathname === tenantHref;
    return pathname.startsWith(href) || pathname.startsWith(tenantHref);
  };

  const sidebarExpanded = !isMobile || sidebarOpen;
  const sidebarWidthClass = sidebarExpanded ? 'md:pl-72' : 'md:pl-24';
  const brandColor = hospital?.brandColor || '#275cc2';
  const logoSize = Math.min(
    Math.max(Number(hospital?.settings?.branding?.logoSize) || 48, 32),
    96
  );
  const clinicTypes = normalizeClinicTypes(hospital?.clinicTypes);
  const hasMultipleClinicProfiles = clinicTypes.length > 1;
  const clinicProfileLabel = hasMultipleClinicProfiles
    ? `${getClinicTypeLabel(activeClinicType)} active`
    : getClinicTypeLabels(clinicTypes).join(' + ');
  const subscriptionNotice = getSubscriptionNotice(hospital);
  const subscriptionNoticeKey = getSubscriptionNoticeKey(hospital);
  const shouldShowSubscriptionNotice =
    Boolean(subscriptionNotice) && dismissedSubscriptionNoticeKey !== subscriptionNoticeKey;
  const tenantThemeStyle = {
    '--primary': brandColor,
    '--ring': brandColor,
    '--chart-1': brandColor,
  } as CSSProperties;

  const handleActiveClinicTypeChange = (clinicType: ClinicType) => {
    const hospitalKey = hospital?.id || hospital?.slug || 'demo';
    setActiveClinicType(setActiveClinicProfile(clinicType, clinicTypes, hospitalKey));
  };

  const dismissSubscriptionNotice = () => {
    if (subscriptionNoticeKey && typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISSED_SUBSCRIPTION_NOTICE_KEY, subscriptionNoticeKey);
    }
    setDismissedSubscriptionNoticeKey(subscriptionNoticeKey);
    setIsSubscriptionNoticeModalOpen(false);
  };

  const activeClinicSelector = hasMultipleClinicProfiles ? (
    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
      <span className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 sm:inline">
        Profile
      </span>
      <Select
        value={activeClinicType}
        onValueChange={(value) => handleActiveClinicTypeChange(value as ClinicType)}
      >
        <SelectTrigger className="h-7 min-w-0 border-0 bg-transparent p-0 text-sm font-semibold text-slate-900 shadow-none focus-visible:ring-0">
          <SelectValue placeholder="Profile" />
        </SelectTrigger>
        <SelectContent>
        {CLINIC_TYPE_OPTIONS.filter((option) => clinicTypes.includes(option.id)).map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.label}
          </SelectItem>
        ))}
        </SelectContent>
      </Select>
    </div>
  ) : null;

  if (isAuthLoading) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(124,199,184,0.12),transparent_25%),linear-gradient(180deg,rgba(248,252,251,1),rgba(240,247,246,1))] print:bg-white"
      style={tenantThemeStyle}
    >
      {/* Sidebar */}
      <aside
        className={`${
          sidebarExpanded ? 'w-72' : 'w-24'
        } text-white transition-all duration-300 flex flex-col shadow-[0_24px_80px_-28px_rgba(8,47,73,0.8)] ${
          isMobile && !sidebarOpen ? 'hidden' : ''
        } fixed left-0 top-0 z-50 h-screen print:hidden`}
        style={{ backgroundColor: brandColor }}
      >
        {/* Logo */}
        <div className="border-b border-white/10 p-6">
          <div className={`flex items-center gap-3 ${!sidebarExpanded ? 'justify-center' : ''}`}>
            <BrandMark
              src={hospital?.logoUrl || '/icon.png'}
              alt={hospital?.name || 'Health One'}
              className="bg-white shadow-black/10"
              priority
              style={{ width: sidebarExpanded ? logoSize : 48, height: sidebarExpanded ? logoSize : 48 }}
            />
            {sidebarExpanded && (
              <div>
                <h1 className="text-lg font-semibold leading-none text-white">
                  {hospital?.name || 'Health One'}
                </h1>
                <p className="mt-1 text-xs text-cyan-50/80">{clinicProfileLabel}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-2 p-4">
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              href={withHospitalDashboardPath(link.href, routeUser)}
              onClick={() => {
                if (isMobile) {
                  setSidebarOpen(false);
                }
              }}
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

      {isMobile && sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-[45] bg-black/50 print:hidden md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className={`flex min-h-screen min-w-0 flex-col print:block print:min-h-0 print:pl-0 ${sidebarWidthClass}`}>
        {/* Top Header */}
        <header className={`fixed left-0 right-0 top-0 z-40 flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 py-4 backdrop-blur-xl md:justify-end md:px-6 print:hidden ${sidebarWidthClass}`}>
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
            <div className="hidden md:block">{activeClinicSelector}</div>
            <Link
              href={withHospitalDashboardPath('/dashboard/chat', routeUser)}
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
        <main className="min-w-0 flex-1 overflow-auto p-4 pt-24 print:block print:overflow-visible print:p-0 md:p-6 md:pt-24">
          {activeClinicSelector && <div className="mb-4 md:hidden">{activeClinicSelector}</div>}
          {subscriptionNotice && shouldShowSubscriptionNotice && (
            <div
              className={`mb-4 flex items-start gap-3 rounded-2xl border p-4 pr-3 text-sm print:hidden ${
                subscriptionNotice.tone === 'danger'
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Subscription notice</p>
                <p className="mt-1">{subscriptionNotice.message}</p>
              </div>
              <button
                type="button"
                aria-label="Dismiss subscription notice"
                onClick={dismissSubscriptionNotice}
                className="rounded-full p-1 text-current opacity-70 transition hover:bg-white/60 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {children}
        </main>
      </div>

      {subscriptionNotice && (
        <Dialog open={isSubscriptionNoticeModalOpen} onOpenChange={setIsSubscriptionNoticeModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <div
                className={`mb-2 flex h-12 w-12 items-center justify-center rounded-2xl ${
                  subscriptionNotice.tone === 'danger'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                <AlertTriangle className="h-6 w-6" />
              </div>
              <DialogTitle>Subscription notice</DialogTitle>
              <DialogDescription className="text-base leading-6">
                {subscriptionNotice.message}
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Please contact Health One to renew or update the hospital subscription before access is affected.
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSubscriptionNoticeModalOpen(false)}
              >
                Close
              </Button>
              <Button type="button" onClick={dismissSubscriptionNotice}>
                Don&apos;t show again
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
