import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="py-10" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
        <div className="text-center md:text-left">
          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: '#f0eeff' }}>MCQ Portal</span>
          <p className="text-sm mt-1" style={{ color: '#5c5878' }}>Focused exam practice.</p>
        </div>

        <div className="flex gap-6">
          <Link to="/" className="text-sm transition-colors hover:!text-[#f0eeff]" style={{ color: '#9490b0' }}>
            Home
          </Link>
          <Link to="/test" className="text-sm transition-colors hover:!text-[#f0eeff]" style={{ color: '#9490b0' }}>
            Test
          </Link>
        </div>

        <p className="text-xs" style={{ color: '#5c5878' }}>&copy; 2025 MCQ Portal</p>
      </div>
    </footer>
  );
}
