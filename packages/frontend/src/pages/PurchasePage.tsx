import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Route {
  id: number;
  origin: string;
  destination: string;
  price: string;
  duration_minutes: number;
}

function PurchasePage() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [ticketType, setTicketType] = useState<'single' | 'day' | 'return'>('single');
  const [travelDate, setTravelDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      const response = await fetch('/api/routes');
      if (!response.ok) throw new Error('Failed to fetch routes');
      const data = await response.json();
      setRoutes(data);
    } catch (err) {
      setError('Failed to load routes. Please try again.');
      console.error(err);
    } finally {
      setLoadingRoutes(false);
    }
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRoute) {
      setError('Please select a route');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tickets/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          routeId: selectedRoute,
          ticketType,
          travelDate,
        }),
      });

      if (!response.ok) throw new Error('Failed to purchase ticket');

      const data = await response.json();
      
      // Simulate payment confirmation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      navigate(`/ticket/${data.ticket.id}`);
    } catch (err) {
      setError('Failed to purchase ticket. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getTicketPrice = () => {
    if (!selectedRoute) return '0.00';
    const route = routes.find(r => r.id === selectedRoute);
    if (!route) return '0.00';
    
    const basePrice = parseFloat(route.price);
    let multiplier = 1;
    
    if (ticketType === 'day') multiplier = 1.5;
    if (ticketType === 'return') multiplier = 1.8;
    
    return (basePrice * multiplier).toFixed(2);
  };

  if (loadingRoutes) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-white">
        <Loader2 className="animate-spin" size={48} />
        <p className="mt-4 text-xl">Loading routes...</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)] animate-[fadeIn_0.5s_ease-in]">
      <Card className="bg-white/95 p-12 rounded-3xl shadow-xl max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-3xl">Purchase Train Ticket</CardTitle>
          <CardDescription className="text-base">
            🔒 Your privacy is protected with zero-knowledge proofs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePurchase} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="route">Select Route</Label>
              <Select
                value={selectedRoute?.toString() || ''}
                onValueChange={(value) => setSelectedRoute(Number(value))}
              >
                <SelectTrigger id="route">
                  <SelectValue placeholder="Choose a route..." />
                </SelectTrigger>
                <SelectContent>
                  {routes.map((route) => (
                    <SelectItem key={route.id} value={route.id.toString()}>
                      {route.origin} → {route.destination} (CHF {route.price}, {route.duration_minutes} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticketType">Ticket Type</Label>
              <Select
                value={ticketType}
                onValueChange={(value) => setTicketType(value as any)}
              >
                <SelectTrigger id="ticketType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Journey (24h validity)</SelectItem>
                  <SelectItem value="day">Day Pass (1 day validity)</SelectItem>
                  <SelectItem value="return">Return Ticket (30 days validity)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="travelDate">Travel Date</Label>
              <Input
                type="date"
                id="travelDate"
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="flex justify-between items-center p-6 bg-gradient-to-r from-[#667eea]/10 to-[#764ba2]/10 rounded-xl text-lg font-semibold">
              <span>Total Price:</span>
              <span className="text-[#667eea] text-2xl">CHF {getTicketPrice()}</span>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-800">
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-lg"
              disabled={loading || !selectedRoute}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Processing...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Confirm Purchase (POC)
                </>
              )}
            </Button>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded text-sm">
              <p className="font-semibold text-gray-800 mb-1">ℹ️ POC Payment System</p>
              <p className="text-gray-600">
                This is a proof-of-concept. No real payment is processed. 
                Click "Confirm Purchase" to simulate the payment.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default PurchasePage;

