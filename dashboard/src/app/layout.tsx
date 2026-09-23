import './globals.css';

export const metadata = {
  title: 'TraceLens — Distributed Tracing for AI Agents',
  description: 'Trace, profile, and replay autonomous AI agent workflows with microsecond precision',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg text-accent font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
