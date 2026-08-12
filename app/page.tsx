'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user.role === 'manager' || user.role === 'admin') {
          router.replace('/dashboard/manager');
        } else {
          router.replace('/dashboard/employee');
        }
      } catch (err) {
        console.error('Error parsing user:', err);
        localStorage.removeItem('user');
        router.replace('/login');
      }
    } else {
      router.replace('/login');
    }
  }, [router]);

  return null;
}