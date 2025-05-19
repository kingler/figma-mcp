import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MCP Server Manager',
  description: 'Control panel for managing MCP servers',
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
          <header className="bg-indigo-600 text-white p-4">
            <h1 className="text-2xl font-bold">MCP Server Manager</h1>
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