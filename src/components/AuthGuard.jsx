import React from 'react';

// HACKATHON BYPASS: Automatically approves any user and renders the dashboard!
export default function AuthGuard({ children }) {
  return <>{children}</>;
}