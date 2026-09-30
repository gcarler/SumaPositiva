import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "./globals.css";
import { PanelHost } from "@/components/panels/panel-host";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "POLIS — Participación Ciudadana en Políticas Públicas",
  description:
    "Explora las políticas públicas en curso, entra fase por fase y línea estratégica por línea estratégica, y deja tus propuestas, anotaciones y preguntas donde se toman las decisiones.",
  keywords: [
    "participación ciudadana",
    "políticas públicas",
    "presupuesto participativo",
    "consulta pública",
    "deliberación",
  ],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d10" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}

          {/* Zero-Modals: host global de paneles apilados */}
          <PanelHost />

          {/* Notificaciones */}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "var(--surface-1)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
