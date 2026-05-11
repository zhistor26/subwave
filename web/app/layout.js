import './globals.css';

export const metadata = {
  title: 'SUB/WAVE',
  description: 'Personal radio frequency from the homelab',
};

export const viewport = {
  themeColor: '#f3efe6',
  colorScheme: 'light',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
