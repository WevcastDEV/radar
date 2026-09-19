import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Radar de Oportunidades',
  description: 'Plataforma de prospecção para segurança eletrônica',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="darkreader-lock" content="darkreader-lock" />
        <meta name="color-scheme" content="dark light" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('radar_theme');
                  if (!t) t = 'dark';
                  var resolved = t;
                  if (t === 'system') {
                    resolved = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
                  }
                  document.documentElement.classList.remove('dark', 'light');
                  document.documentElement.classList.add(resolved);
                  document.documentElement.setAttribute('data-theme', resolved);
                  document.documentElement.style.colorScheme = resolved;
                } catch (e) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
