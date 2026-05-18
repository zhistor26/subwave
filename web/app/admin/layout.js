import AdminShell from '../../components/admin/AdminShell';

export const metadata = {
  title: 'Admin',
  // The auth gate is client-side, so the shell HTML is served regardless —
  // keep the console out of search indexes entirely.
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
