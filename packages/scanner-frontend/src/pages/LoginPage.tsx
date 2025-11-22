import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Lock, AlertCircle, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, login } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/scanner" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    const success = login(password);
    
    if (!success) {
      setError('Invalid password. Please contact your administrator.');
      setPassword('');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-md glass-strong border-primary/20 shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 border-2 border-primary/20">
            <Shield size={40} className="text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold mb-2">CFF Staff Scanner</CardTitle>
          <CardDescription className="text-base">
            Internal use only - Authentication required
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                <Lock size={16} className="text-primary" />
                Staff Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter staff password"
                disabled={isLoading}
                autoFocus
                className="h-12"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex items-start gap-3 animate-[shake_0.3s_ease-in-out]">
                <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button 
              type="submit" 
              size="lg"
              className="w-full h-12 text-base font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40"
              disabled={isLoading || !password.trim()}
            >
              {isLoading ? 'Authenticating...' : 'Access Scanner'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border">
            <div className="bg-muted/30 border border-border p-4 rounded-lg">
              <p className="text-xs text-muted-foreground text-center">
                <Lock size={12} className="inline mr-1" />
                This application is for authorized CFF staff only. All access is logged and monitored.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;

