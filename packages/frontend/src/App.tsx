import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Train } from 'lucide-react';
import HomePage from './pages/HomePage';
import PurchasePage from './pages/PurchasePage';
import TicketPage from './pages/TicketPage';
import ScannerPage from './pages/ScannerPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <nav className="bg-white/95 backdrop-blur-md shadow-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3 text-[#667eea] text-2xl font-bold hover:scale-105 transition-transform no-underline">
              <Train size={32} />
              <span>CFF Tickets ZK</span>
            </Link>
            <div className="flex gap-8">
              <Link to="/" className="text-gray-800 font-medium hover:text-[#667eea] transition-colors no-underline">
                Home
              </Link>
              <Link to="/purchase" className="text-gray-800 font-medium hover:text-[#667eea] transition-colors no-underline">
                Buy Tickets
              </Link>
              <Link to="/scanner" className="text-gray-800 font-medium hover:text-[#667eea] transition-colors no-underline">
                Scanner
              </Link>
            </div>
          </div>
        </nav>

        <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/purchase" element={<PurchasePage />} />
            <Route path="/ticket/:ticketId" element={<TicketPage />} />
            <Route path="/scanner" element={<ScannerPage />} />
          </Routes>
        </main>

        <footer className="bg-black/20 text-white text-center py-8 mt-auto">
          <p className="my-1 font-semibold text-lg">🔒 Powered by Zero-Knowledge Proofs</p>
          <p className="my-1">No personal data stored • Privacy-first • SBB CFF FFS POC</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;

