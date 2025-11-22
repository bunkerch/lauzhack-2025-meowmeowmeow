import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Shield, LogOut, Scan } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ScannerPage from './pages/ScannerPage';
import { Button } from '@/components/ui/button';

function Navigation() {
  const { isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="glass-strong sticky top-0 z-50 border-b">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/scanner" className="flex items-center gap-3 text-foreground text-xl font-semibold hover:text-primary transition-colors no-underline group">
          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Scan size={24} className="text-primary" />
          </div>
          <span>CFF Staff Scanner</span>
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Shield size={16} className="text-primary" />
            <span className="text-xs font-medium text-primary">Staff Mode</span>
          </div>
          <Button
            onClick={logout}
            variant="outline"
            size="sm"
            className="rounded-lg hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
          >
            <LogOut size={16} />
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route 
            path="/scanner" 
            element={
              <ProtectedRoute>
                <ScannerPage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </main>

      <footer className="glass border-t mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield size={20} className="text-primary" />
            <p className="text-sm font-semibold">CFF Internal Staff Scanner</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Powered by Zero-Knowledge Proofs • For authorized personnel only
          </p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

