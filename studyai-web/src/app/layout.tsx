import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = localFont({
  src: [
    { path: "../assets/fonts/Poppins-Medium.ttf", weight: "500", style: "normal" },
    { path: "../assets/fonts/Poppins-SemiBold.ttf", weight: "600", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "StudyAI | Aprende con inteligencia artificial",
    template: "%s | StudyAI",
  },
  description:
    "Transforma tus documentos en herramientas de estudio con inteligencia artificial. Genera cuestionarios, evalúa tu conocimiento y sigue tu progreso.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
        {children}
        <Script src="/theme-restore.js" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
