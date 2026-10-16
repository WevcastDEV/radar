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
                  var b = localStorage.getItem('radar_branding_settings');
                  var pal = 'orange';
                  if (b) {
                    try {
                      var bp = JSON.parse(b);
                      if (bp.colorPalette) pal = bp.colorPalette;
                      if (bp.platformTitle) document.title = bp.platformTitle;
                    } catch(e) {}
                  }
                  document.documentElement.setAttribute('data-color-palette', pal);
                } catch (e) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-color-palette', 'orange');
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
