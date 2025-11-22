import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Train, ShieldCheck } from 'lucide-react';
import HomePage from './pages/HomePage';
import PurchasePage from './pages/PurchasePage';
import TicketPage from './pages/TicketPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <nav className="glass-strong sticky top-0 z-50 border-b">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3 text-foreground text-xl font-semibold hover:text-primary transition-colors no-underline group">
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Train size={24} className="text-primary" />
              </div>
              <span>CFF Tickets ZK</span>
            </Link>
            <div className="flex gap-1">
              <Link to="/" className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all no-underline">
                Home
              </Link>
              <Link to="/purchase" className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all no-underline">
                Buy Tickets
              </Link>
            </div>
          </div>
        </nav>

        <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/purchase" element={<PurchasePage />} />
            <Route path="/ticket/:ticketId" element={<TicketPage />} />
          </Routes>
        </main>

        <footer className="glass border-t mt-auto">
          <div className="max-w-7xl mx-auto px-6 py-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ShieldCheck size={20} className="text-primary" />
              <p className="text-sm font-semibold">Powered by Zero-Knowledge Proofs</p>
            </div>
            <p className="text-xs text-muted-foreground">
              No personal data stored • Privacy-first • SBB CFF FFS POC
            </p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;

