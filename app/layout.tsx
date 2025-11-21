import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Průvodce žižkovskými hospodami',
  description: 'Srovnávač hospod na Žižkově podle ceny a výběru piv.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="cs">
      <body className="app-body" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
