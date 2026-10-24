import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'Chivo · Panel de trading',
  description:
    'Panel de trading autogestionado. M1: autenticación de administrador, mercado Binance USD-M en tiempo real y seguridad 2FA. Solo PAPER.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
