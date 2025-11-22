import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface Ticket {
  id: string;
  route: {
    origin: string;
    destination: string;
  };
  routeId?: number;
  ticketType: string;
  validFrom: string;
  validUntil: string;
  price: string;
  isUsed: boolean;
  proof: any;
  publicSignals: any[];
}

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
      const data = await response.json();
      setTicket(data);
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
      <div className="flex flex-col items-center justify-center min-h-[400px] text-white">
        <Loader2 className="animate-spin" size={48} />
        <p className="mt-4 text-xl">Loading ticket...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="text-center p-16 text-white">
        <p className="text-2xl mb-8">{error || 'Ticket not found'}</p>
        <Button asChild variant="secondary" size="lg" className="rounded-full">
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
      <Button asChild variant="ghost" className="text-white hover:text-white/90 mb-8 hover:-translate-x-1 transition-transform">
        <Link to="/purchase" className="flex items-center gap-2">
          <ArrowLeft size={20} />
          Back to Purchase
        </Link>
      </Button>

      <Card className="bg-white/95 rounded-3xl shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white p-12 text-center">
          <CheckCircle className="mx-auto mb-4" size={48} />
          <h1 className="text-3xl font-bold mb-2">Ticket Confirmed!</h1>
          <p className="text-lg opacity-90">
            Your ticket has been successfully generated with zero-knowledge proof
          </p>
        </CardHeader>

        <CardContent className="p-8">
          <div className="flex items-center justify-center gap-8 p-8 bg-gradient-to-r from-[#667eea]/10 to-[#764ba2]/10 rounded-2xl mb-8">
            <div className="text-center">
              <span className="text-sm text-gray-600 block mb-2">From</span>
              <span className="text-2xl font-bold text-gray-800">{ticket.route.origin}</span>
            </div>
            <div className="text-3xl text-[#667eea] font-bold">→</div>
            <div className="text-center">
              <span className="text-sm text-gray-600 block mb-2">To</span>
              <span className="text-2xl font-bold text-gray-800">{ticket.route.destination}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex flex-col">
              <span className="text-sm text-gray-600 mb-1">Ticket Type</span>
              <span className="text-lg font-semibold text-gray-800">{formatTicketType(ticket.ticketType)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-600 mb-1">Price</span>
              <span className="text-lg font-semibold text-gray-800">CHF {ticket.price}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-600 mb-1">Valid From</span>
              <span className="text-lg font-semibold text-gray-800">{formatDate(ticket.validFrom)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-600 mb-1">Valid Until</span>
              <span className="text-lg font-semibold text-gray-800">{formatDate(ticket.validUntil)}</span>
            </div>
          </div>

          <div className="text-center p-8 bg-gray-50 rounded-2xl mb-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Your Ticket QR Code</h3>
            <p className="text-gray-600 mb-6">
              Present this QR code for verification. It contains your zero-knowledge proof.
            </p>
            <div className="inline-block p-4 bg-white rounded-xl shadow-lg">
              <QRCodeSVG
                value={qrData}
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="mt-4 font-mono text-sm text-gray-600">Ticket ID: {ticket.id}</p>
          </div>

          <div className="bg-[#667eea]/5 p-8 rounded-2xl border-l-4 border-[#667eea]">
            <h3 className="text-xl font-bold text-gray-800 mb-4">🔒 Zero-Knowledge Proof Details</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Your ticket is protected using cryptographic proofs. The system verifies
              your ticket's validity without accessing or storing any personal information.
            </p>
            <details className="mt-4">
              <summary className="cursor-pointer text-[#667eea] font-semibold p-2 hover:underline select-none">
                View Proof Data (Technical)
              </summary>
              <pre className="mt-4 bg-gray-900 text-gray-200 p-4 rounded-lg overflow-x-auto text-sm">
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

