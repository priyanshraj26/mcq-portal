import Navbar from '../marketing/Navbar';
import Footer from '../marketing/Footer';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0a0a0f' }}>
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
