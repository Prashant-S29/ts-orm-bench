'use client';

import { useMount } from '@/hooks/use-mount';
import { ThemeProvider } from 'next-themes';

interface ProviderProps {
  children: React.ReactNode;
}

export const Provider: React.FC<ProviderProps> = ({ children }) => {
  const mounted = useMount();

  if (!mounted) {
    return null;
  }

  return (
    <ThemeProvider attribute='class' forcedTheme='dark'>
      {children}
    </ThemeProvider>
  );
};
