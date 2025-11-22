import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TicketSchema, type Ticket } from '../schemas/validation';

function TicketPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ticketId) {
      fetchTicket(ticketId);
    }
  }, [ticketId]);

  const fetchTicket = async (id: string) => {
    try {
      const response = await fetch(`/api/tickets/${id}`);
      if (!response.ok) throw new Error('Failed to fetch ticket');
      const responseData = await response.json();
      
      // Validate ticket data with Zod
      const validationResult = TicketSchema.safeParse(responseData);
      if (!validationResult.success) {
        console.error('Ticket validation failed:', validationResult.error);
        throw new Error('Invalid ticket data received from server');
      }
      
      setTicket(validationResult.data);
    } catch (err) {
      setError('Failed to load ticket. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTicketType = (type: string) => {
    const types: Record<string, string> = {
      single: 'Single Journey',
      day: 'Day Pass',
      return: 'Return Ticket',
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="mt-4 text-lg text-muted-foreground">Loading ticket...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="text-center p-16">
        <p className="text-2xl mb-8">{error || 'Ticket not found'}</p>
        <Button asChild variant="secondary" size="lg" className="rounded-xl">
          <Link to="/purchase" className="flex items-center gap-2">
            <ArrowLeft size={20} />
            Buy Another Ticket
          </Link>
        </Button>
      </div>
    );
  }

  // Include ALL data needed for offline verification in QR code
  const qrData = JSON.stringify({
    ticketId: ticket.id,
    proof: ticket.proof,
    publicSignals: ticket.publicSignals,
    validFrom: ticket.validFrom,
    validUntil: ticket.validUntil,
    routeId: ticket.routeId || 0, // Include route ID for offline verification
  });

  return (
    <div className="max-w-4xl mx-auto animate-[fadeIn_0.5s_ease-in]">
      <Button asChild variant="ghost" className="mb-6 hover:-translate-x-1 transition-transform">
        <Link to="/purchase" className="flex items-center gap-2">
          <ArrowLeft size={18} />
          Back to Purchase
        </Link>
      </Button>

      <Card className="glass-strong border-primary/10 overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-b border-primary/10 p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-primary" size={32} />
          </div>
          <h1 className="text-3xl font-bold mb-2">Ticket Confirmed!</h1>
          <p className="text-muted-foreground">
            Your ticket has been successfully generated with zero-knowledge proof
          </p>
        </CardHeader>

        <CardContent className="p-8 space-y-8">
          {/* Route Display */}
          <div className="flex items-center justify-center gap-8 p-6 bg-primary/5 border border-primary/10 rounded-xl">
            <div className="text-center">
              <span className="text-xs text-muted-foreground block mb-1">From</span>
              <span className="text-2xl font-bold">{ticket.route.origin}</span>
            </div>
            <div className="text-3xl text-primary font-bold">→</div>
            <div className="text-center">
              <span className="text-xs text-muted-foreground block mb-1">To</span>
              <span className="text-2xl font-bold">{ticket.route.destination}</span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Ticket Type', value: formatTicketType(ticket.ticketType) },
              { label: 'Price', value: `CHF ${ticket.price}` },
              { label: 'Valid From', value: formatDate(ticket.validFrom) },
              { label: 'Valid Until', value: formatDate(ticket.validUntil) },
            ].map((item, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-muted/30 border border-border">
                <span className="text-xs text-muted-foreground block mb-1">{item.label}</span>
                <span className="text-sm font-semibold">{item.value}</span>
              </div>
            ))}
          </div>

          {/* QR Code Section */}
          <div className="text-center p-8 bg-card/50 border border-border rounded-xl">
            <h3 className="text-xl font-bold mb-2">Your Ticket QR Code</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Present this QR code for verification. It contains your zero-knowledge proof.
            </p>
            <div className="inline-block p-4 bg-white rounded-xl border-2 border-primary/20">
              <QRCodeSVG
                value={qrData}
                size={240}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="mt-4 font-mono text-xs text-muted-foreground">Ticket ID: {ticket.id}</p>
          </div>

          {/* ZK Proof Info */}
          <div className="bg-primary/5 border border-primary/10 p-6 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold">🔒</span>
              </div>
              <h3 className="text-lg font-bold">Zero-Knowledge Proof Details</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Your ticket is protected using cryptographic proofs. The system verifies
              your ticket's validity without accessing or storing any personal information.
            </p>
            <details className="group">
              <summary className="cursor-pointer text-sm text-primary font-medium hover:text-primary/80 transition-colors select-none flex items-center gap-2">
                <span>View Proof Data (Technical)</span>
                <span className="text-xs opacity-60 group-open:rotate-90 transition-transform">▶</span>
              </summary>
              <pre className="mt-4 bg-black/90 text-green-400 p-4 rounded-lg overflow-x-auto text-xs font-mono border border-primary/20">
                {JSON.stringify(ticket.proof, null, 2)}
              </pre>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default TicketPage;

