'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Privy-dependent components to avoid SSR
const PrivyApp = dynamic(() => import('./PrivyApp'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen archive-paper flex items-center justify-center">
      <div className="archive-ink-lighter">Loading...</div>
    </div>
  )
});

export default function Home() {
  return <PrivyApp />;
}