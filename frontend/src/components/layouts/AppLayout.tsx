import { Link } from 'react-router-dom';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3">
        <Link
          to="/"
          className="text-lg font-semibold text-gray-900 hover:text-violet-core transition-colors"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          MCQ Portal
        </Link>
      </header>
      {children}
    </div>
  );
}
