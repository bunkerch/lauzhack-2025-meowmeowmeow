import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Check, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RouteSchema, PurchaseResponseSchema, type Route } from '../schemas/validation';
import { z } from 'zod';

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
      
      // Validate routes data with Zod
      const validationResult = z.array(RouteSchema).safeParse(data);
      if (!validationResult.success) {
        console.error('Routes validation failed:', validationResult.error);
        throw new Error('Invalid routes data received from server');
      }
      
      setRoutes(validationResult.data);
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

      const responseData = await response.json();
      
      // Validate purchase response with Zod
      const validationResult = PurchaseResponseSchema.safeParse(responseData);
      if (!validationResult.success) {
        console.error('Purchase response validation failed:', validationResult.error);
        throw new Error('Invalid response from server');
      }
      
      const data = validationResult.data;
      
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
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="mt-4 text-lg text-muted-foreground">Loading routes...</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center animate-[fadeIn_0.5s_ease-in]">
      <Card className="glass-strong border-primary/10 max-w-2xl w-full">
        <CardHeader className="space-y-2 pb-6">
          <CardTitle className="text-3xl font-bold">Purchase Train Ticket</CardTitle>
          <CardDescription className="text-base flex items-center gap-2">
            <Lock size={16} className="text-primary" />
            Your privacy is protected with zero-knowledge proofs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePurchase} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="route" className="text-sm font-medium">Select Route</Label>
              <Select
                value={selectedRoute?.toString() || ''}
                onValueChange={(value) => setSelectedRoute(Number(value))}
              >
                <SelectTrigger id="route" className="h-11">
                  <SelectValue placeholder="Choose a route..." />
                </SelectTrigger>
                <SelectContent>
                  {routes.map((route) => (
                    <SelectItem key={route.id} value={route.id.toString()}>
                      {route.origin} → {route.destination} (CHF {route.price}, {route.durationMinutes} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="ticketType" className="text-sm font-medium">Ticket Type</Label>
              <Select
                value={ticketType}
                onValueChange={(value) => setTicketType(value as any)}
              >
                <SelectTrigger id="ticketType" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Journey (24h validity)</SelectItem>
                  <SelectItem value="day">Day Pass (1 day validity)</SelectItem>
                  <SelectItem value="return">Return Ticket (30 days validity)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="travelDate" className="text-sm font-medium">Travel Date</Label>
              <Input
                type="date"
                id="travelDate"
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
                className="h-11"
              />
            </div>

            <div className="flex justify-between items-center p-5 bg-primary/5 border border-primary/10 rounded-xl">
              <span className="text-sm font-medium text-muted-foreground">Total Price</span>
              <span className="text-3xl font-bold text-primary">CHF {getTicketPrice()}</span>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg text-sm">
                <p className="text-destructive font-medium">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full rounded-xl h-12 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40"
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

            <div className="bg-muted/30 border border-border p-4 rounded-lg text-sm space-y-1">
              <p className="font-semibold flex items-center gap-2">
                <span className="text-primary">ℹ️</span>
                POC Payment System
              </p>
              <p className="text-muted-foreground text-xs leading-relaxed">
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

