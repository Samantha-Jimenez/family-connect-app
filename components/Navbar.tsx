'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const navigation = [
  { name: 'Dashboard', href: '/', current: true },
  { name: 'Photos', href: '/photos', current: false },
  { name: 'Upload', href: '/upload', current: false },
  { name: 'Family Tree', href: '/familytree', current: false },
  { name: 'Calendar', href: '/calendar', current: false },
];

export default function Navbar({
  signOut,
  username,
  userFirstName,
  userLastName,
  userId,
}: {
  signOut: () => void;
  username: string;
  userFirstName: string;
  userLastName: string;
  userId: string;
}) {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProfileOpen, setProfileOpen] = useState(false); // headless control
  const profileRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuButtonRef = useRef<HTMLDivElement | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  const updatedNavigation = navigation.map((item) => ({
    ...item,
    current: pathname === item.href,
  }));

  const toggleMobileMenu = () => setMobileMenuOpen((v) => !v);

  const handleSignOut = () => {
    signOut();
    router.push('/');
  };

  // Close profile menu and mobile menu on route change
  useEffect(() => {
    setProfileOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  // Close on click outside & on Esc
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      // Close profile menu if clicking outside
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      // Close mobile menu if clicking outside both the button and menu
      const clickedButton = mobileMenuButtonRef.current?.contains(e.target as Node);
      const clickedMenu = mobileMenuRef.current?.contains(e.target as Node);
      if (!clickedButton && !clickedMenu) {
        setMobileMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProfileOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          <div className="absolute inset-y-0 left-0 flex items-center sm:hidden pl-4" ref={mobileMenuButtonRef}>
            {/* Mobile menu button */}
            <button
              className="btn btn-square bg-transparent border-0 text-gray-700 hover:text-black shadow-none hover:bg-transparent"
              onClick={toggleMobileMenu}
            >
              Menu
            </button>
          </div>

          <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
            <div className="flex shrink-0 items-center">{/* logo */}</div>

            <div className="hidden sm:ml-6 sm:block">
              <div className="flex space-x-4">
                {updatedNavigation.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    aria-current={item.current ? 'page' : undefined}
                    className={`${
                      item.current
                        ? 'text-plantain-green'
                        : 'text-gray-400 hover:bg-gray-700 hover:text-gray-800'
                    } btn rounded-md px-3 py-2 text-sm font-medium bg-transparent border-0 hover:bg-transparent poppins-semibold shadow-none`}
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
            {/* Profile dropdown (headless) */}
            <div className="relative ml-3" ref={profileRef}>
              {/* Trigger toggles open/close */}
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={isProfileOpen}
                onClick={() => setProfileOpen((v) => !v)}
                className="btn btn-ghost rounded-btn hover:bg-transparent hover:border-0 hover:shadow-none border-0 shadow-none bg-transparent"
              >
                <span className="h-8 w-8 rounded-full flex items-center justify-center text-white hover:bg-black bg-gray-400">
                  {username?.charAt(0)?.toUpperCase()}
                </span>
              </button>

              {/* Menu rendered only when open */}
              {isProfileOpen && (
                <ul
                  role="menu"
                  className="absolute right-0 mr-3 w-52 z-[30] p-2 shadow bg-gray-300 rounded-box"
                >
                  <li>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setProfileOpen(false);
                        router.push(`/profile/${userId}`);
                      }}
                      className="w-full text-left rounded px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Your Profile
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setProfileOpen(false);
                        router.push('/settings');
                      }}
                      className="w-full text-left rounded px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Settings
                    </button>
                  </li>

                  {userId === 'f16b1510-0001-705f-8680-28689883e706' && (
                    <li>
                      <button
                        role="menuitem"
                        onClick={() => {
                          setProfileOpen(false);
                          router.push('/admin');
                        }}
                        className="w-full text-left rounded px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Admin
                      </button>
                    </li>
                  )}

                  <li>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setProfileOpen(false);
                        handleSignOut();
                      }}
                      className="w-full text-left rounded px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <div
        ref={mobileMenuRef}
        className={`sm:hidden ${isMobileMenuOpen ? 'block' : 'hidden'} absolute w-full bg-white z-[20] rounded-b-lg border border-gray-200 shadow-lg`}
      >
        <div className="space-y-1 px-2 pt-2 pb-3">
          {updatedNavigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              aria-current={item.current ? 'page' : undefined}
              className={`${
                item.current
                  ? 'bg-golden-sand text-white'
                  : 'text-gray-500 hover:bg-golden-sand/80 hover:text-white'
              } block rounded-md px-3 py-2 text-base font-medium`}
            >
              {item.name}
            </a>
          ))}
        </div>
      </div>

      {/* Notification Drawer (unchanged) */}
      <div className="drawer drawer-end">
        <input id="my-drawer-4" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content" />
        <div className="drawer-side z-[31]">
          <label htmlFor="my-drawer-4" aria-label="close sidebar" className="drawer-overlay"></label>
          <div className="bg-base-200 text-base-content min-h-full w-80">
            <button
              onClick={() => document.getElementById('my-drawer-4')?.click()}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="Close notifications drawer"
            >
              &times;
            </button>
            <h1 className="text-2xl font-bold px-8 pt-6 text-gray-300">Notifications</h1>
            <ul className="menu p-4">
              <li><a className="block px-4 py-2 text-sm text-gray-400">Notification 1</a></li>
              <li><a className="block px-4 py-2 text-sm text-gray-400">Notification 2</a></li>
              <li><a className="block px-4 py-2 text-sm text-gray-400">Notification 3</a></li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
}
