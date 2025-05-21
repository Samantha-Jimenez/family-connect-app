'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const navigation = [
  { name: 'Dashboard', href: '/', current: true },
  { name: 'Photos', href: '/photos', current: false },
  { name: 'Upload', href: '/upload', current: false },
  { name: 'Family Tree', href: '/familytree', current: false },
  { name: 'Calendar', href: '/calendar', current: false },
];

export default function Navbar({ signOut, username, userFirstName, userLastName, userId }: { signOut: () => void, username: string, userFirstName: string, userLastName: string, userId: string }) {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const updatedNavigation = navigation.map(item => ({
    ...item,
    current: pathname === item.href
  }));

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleSignOut = () => {
    signOut();
    router.push('/');
  };

  useEffect(() => {
    console.log(isMobileMenuOpen, 'isMobileMenuOpen');
  }, [isMobileMenuOpen]);
  
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
            {/* Mobile menu button */}
            <button className="btn btn-square bg-transparent border-0 text-gray-700 hover:text-black" onClick={toggleMobileMenu}>
              Menu
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
            <div className="flex shrink-0 items-center">
              {/* <Image
                alt="Your Company"
                src="https://tailwindui.com/plus/img/logos/mark.svg?color=indigo&shade=500"
                width={32}
                height={32}
                className="h-8 w-auto"
              /> */}
            </div>
            <div className="hidden sm:ml-6 sm:block">
              <div className="flex space-x-4">
                {updatedNavigation.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    aria-current={item.current ? 'page' : undefined}
                    className={`${item.current ? 'text-yellow-800/80' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-800'} btn rounded-md px-3 py-2 text-sm font-medium bg-transparent border-0 hover:bg-transparent poppins-semibold shadow-none`}
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
            <label htmlFor="my-drawer-4" className="btn bg-transparent text-gray-400 hover:text-black hover:bg-transparent border-0 shadow-none p-0">
              <span className="icon-[mdi--bell] w-6 h-6"></span>
            </label>

            {/* Profile dropdown */}
            <div className="relative ml-3">
              <div className="dropdown dropdown-end">
                <label 
                  tabIndex={0} 
                  className="btn btn-ghost rounded-btn hover:bg-transparent hover:border-0 hover:shadow-none border-0 shadow-none bg-transparent"
                >
                  <span className={`h-8 w-8 rounded-full flex items-center justify-center text-white hover:bg-black ${isMobileMenuOpen ? 'bg-gray-200' : 'bg-gray-400'}`}>
                    {username.charAt(0).toUpperCase()}
                  </span>
                </label>
                <ul 
                  tabIndex={0} 
                  className="menu dropdown-content z-[1] p-2 shadow bg-gray-300 rounded-box w-52"
                >
                  <li>
                    <button 
                      onClick={() => router.push(`/profile/${userId}`)}
                      className="w-full text-left rounded px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Your Profile
                    </button>
                    <button 
                      onClick={() => router.push('/settings')}
                      className="w-full text-left rounded px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Settings
                    </button>
                  </li>
                  {userId === "f16b1510-0001-705f-8680-28689883e706" && (
                    <li>
                      <button 
                        onClick={() => router.push('/admin')}
                        className="w-full text-left rounded px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Admin
                      </button>
                    </li>
                  )}
                  <li>
                    <button 
                      onClick={handleSignOut}
                      className="w-full text-left rounded px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`sm:hidden ${isMobileMenuOpen ? 'block' : 'hidden'} absolute w-full bg-white z-[1] rounded-b-lg border border-gray-200 shadow-lg`}>
        <div className="space-y-1 px-2 pt-2 pb-3">
          {updatedNavigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              aria-current={item.current ? 'page' : undefined}
              className={`${item.current ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-700 hover:text-white'} block rounded-md px-3 py-2 text-base font-medium`}
            >
              {item.name}
            </a>
          ))}
        </div>
      </div>

      {/* Notification Drawer */}
      <div className="drawer drawer-end">
        <input id="my-drawer-4" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content">
          {/* Page content here */}
          {/* The drawer button is now the notification bell */}
        </div>
        <div className="drawer-side z-[31]">
          <label htmlFor="my-drawer-4" aria-label="close sidebar" className="drawer-overlay"></label>
          <div className="bg-base-200 text-base-content min-h-full w-80">
            <button 
              onClick={() => document.getElementById('my-drawer-4')?.click()} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="Close notifications drawer"
            >
              &times; {/* This represents the "X" */}
            </button>
            <h1 className="text-2xl font-bold px-8 pt-6 text-gray-300">Notifications</h1>
            <ul className="menu p-4">
              <li>
                <a className="block px-4 py-2 text-sm text-gray-400">
                  Notification 1
                </a>
              </li>
              <li>
                <a className="block px-4 py-2 text-sm text-gray-400">
                  Notification 2
                </a>
              </li>
              <li>
                <a className="block px-4 py-2 text-sm text-gray-400">
                  Notification 3
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
}
