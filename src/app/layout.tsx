

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { AppProvider } from '../context/AppContext';
import LayoutComponent from '../components/Layout';
import ErrorBoundary from '../components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'PropertyLink — Thailand Real Estate Marketplace',
  description: 'Browse properties in Thailand, save favorites, and connect with sellers.',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <AppProvider>
            <LayoutComponent>{children}</LayoutComponent>
          </AppProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
