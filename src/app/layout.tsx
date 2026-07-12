// src/app/layout.tsx
import type { Metadata } from 'next';
import '@/globals.css'; 
export const metadata: Metadata = {
  title: 'Soro-CRM',
  description: 'Soro\'s custom built CRM Platform ', // Optional, good for SEO
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <div >
          {children}
        </div>
      </body>
    </html>
  );
}