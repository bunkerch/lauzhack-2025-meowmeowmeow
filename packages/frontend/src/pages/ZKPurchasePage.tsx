/**
 * ZK Purchase Page
 * 
 * Implements the full zero-knowledge payment flow:
 * 1. Get journey quote from Ticket Backend
 * 2. Pay via Payment Service (get secret + Merkle proof)
 * 3. Generate ZK proof
 * 4. Submit proof to Ticket Backend
 * 5. Receive and display JWT ticket
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Shield, CreditCard, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { generatePaymentProof } from '../utils/zkProofGenerator';

interface Quote {
    quoteId: string;
    origin: string;
    destination: string;
    priceCents: number;
    dv: string;
    validFrom: number;
    validUntil: number;
    tripIds: string[];
    productClass: string;
}

interface PaymentResponse {
    success: boolean;
    secret?: string;
    quoteId?: string;
    priceCents?: number;
    root?: string;
    merklePath?: {
        pathElements: string[];
        pathIndices: number[];
    };
    error?: string;
}

function ZKPurchasePage() {
    const navigate = useNavigate();
    const [step, setStep] = useState<'quote' | 'payment' | 'proof' | 'ticket'>('quote');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form data
    const [origin, setOrigin] = useState('Zürich HB');
    const [destination, setDestination] = useState('Geneva');
    const [travelDate, setTravelDate] = useState(new Date().toISOString().split('T')[0]);

    // Flow data
    const [quote, setQuote] = useState<Quote | null>(null);
    const [paymentData, setPaymentData] = useState<PaymentResponse | null>(null);
    const [ticket, setTicket] = useState<any>(null);

    /**
     * Step 1: Get a journey quote from the Ticket Backend
     */
    const handleGetQuote = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            console.log('📋 Requesting journey quote...');
            const response = await fetch('http://localhost:3000/api/tickets/quote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ origin, destination, travelDate })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get quote');
            }

            const quoteData = await response.json();
            console.log('✅ Quote received:', quoteData);
            setQuote(quoteData);
            setStep('payment');

        } catch (err) {
            setError((err as Error).message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Step 2: Process payment via Payment Service
     */
    const handlePayment = async () => {
        if (!quote) return;

        setLoading(true);
        setError(null);

        try {
            console.log('💳 Processing payment...');
            const response = await fetch('http://localhost:3000/api/payment/pay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quoteId: quote.quoteId,
                    priceCents: quote.priceCents,
                    paymentMethod: 'mock'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Payment failed');
            }

            const payment: PaymentResponse = await response.json();
            console.log('✅ Payment successful, secret received');
            setPaymentData(payment);
            setStep('proof');

            // Automatically generate proof
            await handleGenerateProof(payment);

        } catch (err) {
            setError((err as Error).message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Step 3: Generate ZK proof
     */
    const handleGenerateProof = async (payment?: PaymentResponse) => {
        const data = payment || paymentData;
        if (!data || !quote) return;

        setLoading(true);
        setError(null);

        try {
            console.log('🔐 Generating zero-knowledge proof...');

            const { proof, publicSignals } = await generatePaymentProof({
                secret: data.secret!,
                quoteId: data.quoteId!,
                priceCents: data.priceCents!,
                root: data.root!,
                merklePath: data.merklePath!
            });

            console.log('✅ ZK proof generated');

            // Step 4: Submit proof to Ticket Backend
            await handleIssueTicket(proof, publicSignals, data);

        } catch (err) {
            setError('Failed to generate ZK proof: ' + (err as Error).message);
            console.error(err);
            setLoading(false);
        }
    };

    /**
     * Step 4: Submit ZK proof and receive JWT ticket
     */
    const handleIssueTicket = async (proof: any, publicSignals: string[], payment?: PaymentResponse) => {
        const data = payment || paymentData;
        if (!quote || !data) {
            console.error('❌ Missing quote or payment data', { quote, data });
            return;
        }

        try {
            console.log('🎫 Requesting ticket issuance...');
            const response = await fetch('http://localhost:3000/api/tickets/issue-with-zk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quoteId: quote.quoteId,
                    priceCents: quote.priceCents,
                    root: data.root,
                    proof,
                    publicSignals
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ticket issuance failed');
            }

            const ticketData = await response.json();
            console.log('✅ Ticket issued successfully!');
            setTicket(ticketData);
            setStep('ticket');

            // Store ticket in localStorage
            localStorage.setItem('zkTicket', JSON.stringify(ticketData));

        } catch (err) {
            setError('Failed to issue ticket: ' + (err as Error).message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-4xl font-bold text-foreground mb-8 flex items-center gap-3">
                    <Shield className="text-primary" />
                    ZK Train Ticket Purchase
                </h1>

                {/* Progress indicators */}
                <div className="flex items-center justify-between mb-8">
                    {[
                        { key: 'quote', label: 'Quote', icon: '📋' },
                        { key: 'payment', label: 'Payment', icon: '💳' },
                        { key: 'proof', label: 'ZK Proof', icon: '🔐' },
                        { key: 'ticket', label: 'Ticket', icon: '🎫' }
                    ].map((item, index) => (
                        <div key={item.key} className="flex flex-col items-center flex-1">
                            <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl
                                    ${['quote', 'payment', 'proof', 'ticket'].indexOf(step) >= index
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground'
                                    }`}
                            >
                                {item.icon}
                            </div>
                            <div className="text-xs mt-2 font-medium text-muted-foreground">{item.label}</div>
                        </div>
                    ))}
                </div>

                {error && (
                    <Card className="mb-6 border-destructive/50 bg-destructive/10">
                        <CardContent className="pt-6">
                            <p className="text-destructive-foreground text-sm">{error}</p>
                        </CardContent>
                    </Card>
                )}

                {/* Step 1: Journey Quote */}
                {step === 'quote' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Journey Details</CardTitle>
                            <CardDescription>
                                Enter your journey details to get a quote
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleGetQuote} className="space-y-4">
                                <div>
                                    <Label htmlFor="origin">Origin</Label>
                                    <Input
                                        id="origin"
                                        value={origin}
                                        onChange={(e) => setOrigin(e.target.value)}
                                        placeholder="e.g., Zurich"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="destination">Destination</Label>
                                    <Input
                                        id="destination"
                                        value={destination}
                                        onChange={(e) => setDestination(e.target.value)}
                                        placeholder="e.g., Geneva"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="date">Travel Date</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={travelDate}
                                        onChange={(e) => setTravelDate(e.target.value)}
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Get Quote
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: Payment */}
                {step === 'payment' && quote && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Payment</CardTitle>
                            <CardDescription>
                                Review and pay for your journey
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted p-4 rounded-lg space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Route:</span>
                                    <span className="font-medium text-foreground">{quote.origin} → {quote.destination}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Price:</span>
                                    <span className="font-medium text-foreground">CHF {(quote.priceCents / 100).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Quote ID:</span>
                                    <span className="font-mono text-xs text-muted-foreground">{quote.quoteId}</span>
                                </div>
                            </div>
                            <Button onClick={handlePayment} className="w-full" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <CreditCard className="mr-2 h-4 w-4" />
                                Pay CHF {(quote.priceCents / 100).toFixed(2)}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Step 3: ZK Proof Generation */}
                {step === 'proof' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Generating Zero-Knowledge Proof</CardTitle>
                            <CardDescription>
                                Creating an anonymous payment proof...
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-center py-8">
                            <Loader2 className="h-16 w-16 animate-spin mx-auto text-primary mb-4" />
                            <p className="text-sm text-muted-foreground">
                                This proves you paid without revealing your identity or transaction details
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Step 4: Ticket Issued */}
                {step === 'ticket' && ticket && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle2 className="text-green-600" />
                                Ticket Issued Successfully!
                            </CardTitle>
                            <CardDescription>
                                Your anonymous ticket is ready
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-green-900/30 border border-green-800/50 p-4 rounded-lg space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Ticket ID:</span>
                                    <Badge variant="secondary">{ticket.ticketId?.slice(0, 16)}...</Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Route:</span>
                                    <span className="font-medium text-foreground">
                                        {ticket.claims?.origin} → {ticket.claims?.dest}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Valid Until:</span>
                                    <span className="font-medium text-foreground">
                                        {new Date(ticket.claims?.exp * 1000).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex justify-center p-6 bg-background rounded-lg border border-border">
                                <QRCodeSVG 
                                    value={ticket.token} 
                                    size={256}
                                    level="M"
                                    includeMargin={true}
                                />
                            </div>

                            <div className="bg-muted p-4 rounded-lg">
                                <p className="text-xs text-muted-foreground mb-2">JWT Token:</p>
                                <p className="font-mono text-xs break-all bg-background p-2 rounded border border-border">
                                    {ticket.token}
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <Button onClick={() => navigate('/')} variant="outline" className="flex-1">
                                    Back to Home
                                </Button>
                                <Button 
                                    onClick={() => navigate('/ticket')} 
                                    className="flex-1"
                                >
                                    View My Ticket
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

export default ZKPurchasePage;

