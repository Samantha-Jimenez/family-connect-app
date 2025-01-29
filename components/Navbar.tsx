// import Image from 'next/image';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/', current: true },
  { name: 'Photos', href: '/photos', current: false },
  { name: 'Family Tree', href: '/familytree', current: false },
  { name: 'Calendar', href: '/calendar', current: false },
]

export default function Navbar({ signOut }: { signOut: () => void }) {
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setDropdownOpen(!isDropdownOpen);
  };

  return (
    <nav className="bg-gray-800">
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
            {/* Mobile menu button */}
            <button className="btn btn-square">
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
                {navigation.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    aria-current={item.current ? 'page' : undefined}
                    className={`${item.current ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} btn rounded-md px-3 py-2 text-sm font-medium`}
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
            <a
              href="/notifications"
              className="btn btn-circle bg-gray-800 text-gray-400 hover:text-white"
            >
              Notifications
            </a>

            {/* Profile dropdown */}
            <div className="relative ml-3">
              <div className="dropdown dropdown-end">
                <div tabIndex={0} role="button" className="btn btn-ghost rounded-btn" onClick={toggleDropdown}>
                  <span className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center text-white">
                    P
                  </span>
                </div>
              </div>
              <ul tabIndex={0} className={`absolute right-0 z-10 mt-2 w-48 bg-white rounded-md shadow-lg menu dropdown-content rounded-box w-52 p-2 ${isDropdownOpen ? '' : 'hidden'}`}>
                <li>
                  <a href="/profile" className="rounded block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Your Profile
                  </a>
                </li>
                <li>
                  <a href="/settings" className="rounded block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Settings
                  </a>
                </li>
                <li>
                  <a className="rounded block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={signOut}>
                    Sign out
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="sm:hidden">
        <div className="space-y-1 px-2 pt-2 pb-3">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              aria-current={item.current ? 'page' : undefined}
              className={`${item.current ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} block rounded-md px-3 py-2 text-base font-medium`}
            >
              {item.name}
            </a>
          ))}
        </div>
      </div>
    </nav>
  )
}
