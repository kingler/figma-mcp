import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Reasoning Platform',
  description: 'Advanced reasoning capabilities powered by AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen flex flex-col">
          <header className="bg-purple-700 text-white p-4">
            <h1 className="text-2xl font-bold">AI Reasoning Platform</h1>
          </header>
          <div className="flex-grow p-6">
            {children}
          </div>
          <footer className="bg-gray-100 p-4 text-center text-gray-600">
            <p>© MCP Platform</p>
          </footer>
        </main>
      </body>
    </html>
  );
} 