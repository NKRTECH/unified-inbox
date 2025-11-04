'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  InboxIcon, 
  UserGroupIcon, 
  ChartBarIcon, 
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon,
  PuzzlePieceIcon,
  PhoneIcon,
  CalendarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Inbox', href: '/inbox', icon: InboxIcon },
  { name: 'Contacts', href: '/contacts', icon: UserGroupIcon },
  { name: 'Scheduled', href: '/scheduled', icon: CalendarIcon },
  { name: 'Templates', href: '/templates', icon: DocumentTextIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Integrations', href: '/settings/integrations', icon: PuzzlePieceIcon },
  { name: 'Test Composer', href: '/test-composer', icon: ChatBubbleLeftRightIcon },
  { name: 'VoIP Test', href: '/voip-test', icon: PhoneIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200 shadow-sm">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
        <ChatBubbleLeftRightIcon className="h-8 w-8 text-white" />
        <span className="ml-2 text-xl font-semibold text-white">
          Unified Inbox
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200
                ${isActive
                  ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-200'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
                }
              `}
            >
              <item.icon
                className={`
                  mr-3 h-5 w-5 flex-shrink-0 transition-colors
                  ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}
                `}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center">
          <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
            <span className="text-sm font-semibold text-white">U</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-semibold text-gray-900">Demo User</p>
            <p className="text-xs text-gray-500">demo@unifiedinbox.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}