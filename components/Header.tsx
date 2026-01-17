'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

export default function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <header className="header">
      <div className="header-left">
        <span className="logo">Ads Dashboard</span>
      </div>
      <nav className="nav">
        <Link href="/ads" className={`nav-link ${pathname === '/ads' ? 'active' : ''}`}>
          Google Ads
        </Link>
        <Link href="/developers" className={`nav-link ${pathname === '/developers' ? 'active' : ''}`}>
          Застройщики
        </Link>
      </nav>
      <div className="header-right">
        <span className="user-name">{session.user?.name}</span>
        <button onClick={() => signOut()} className="logout-link">
          Выйти
        </button>
      </div>
    </header>
  );
}
