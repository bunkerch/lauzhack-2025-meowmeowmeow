import { useState } from 'react';
import { Scan, CheckCircle, XCircle, Loader2, WifiOff, Wifi, Zap } from 'lucide-react';
import { verifyTicketOffline } from '../utils/zkVerifier';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface ScanResult {
  valid: boolean;
  message: string;
  verificationMethod?: 'offline-browser' | 'offline' | 'online' | 'offline-fallback';
  warning?: string;
  ticket?: {
    route: string;
    type?: string;
    validUntil: string;
  };
}

type VerificationMode = 'offline-browser' | 'online';

function ScannerPage() {
  const [qrData, setQrData] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [verificationMode, setVerificationMode] = useState<VerificationMode>('offline-browser');

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!qrData.trim()) {
      return;
    }

    setScanning(true);
    setResult(null);

    try {
      // Parse QR code data
      let ticketData;
      try {
        ticketData = JSON.parse(qrData.trim());
      } catch (parseError) {
        setResult({
          valid: false,
          message: 'Invalid QR code format. Please scan a valid ticket QR code.',
        });
        setScanning(false);
        return;
      }

      // Validate QR code structure
      if (!ticketData.ticketId || !ticketData.proof || !ticketData.publicSignals) {
        setResult({
          valid: false,
          message: 'QR code missing required data (ticketId, proof, or publicSignals)',
        });
        setScanning(false);
        return;
      }

      // OFFLINE-BROWSER MODE: Verify entirely in the browser
      if (verificationMode === 'offline-browser') {
        console.log('🔒 OFFLINE-BROWSER MODE: Verifying in browser, NO backend communication');
        
        const offlineResult = await verifyTicketOffline(ticketData);
        
        setResult({
          valid: offlineResult.valid,
          message: offlineResult.message,
          verificationMethod: 'offline-browser',
          warning: offlineResult.valid 
            ? 'Verified entirely in browser. Cannot check if ticket was already used.'
            : undefined,
          ticket: offlineResult.valid ? {
            route: `Route ${ticketData.routeId || 'Unknown'}`,
            validUntil: ticketData.validUntil,
          } : undefined,
        });
        
        setScanning(false);
        return;
      }

      // ONLINE MODE: Send to backend for full verification
      console.log('🌐 ONLINE MODE: Verifying with backend');
      
      const response = await fetch('/api/verify/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: ticketData.ticketId,
          proof: ticketData.proof,
          publicSignals: ticketData.publicSignals,
          validFrom: ticketData.validFrom,
          validUntil: ticketData.validUntil,
          routeId: ticketData.routeId,
          offline: false,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (err) {
      // Network error - automatically use offline verification
      console.log('❌ Network error - falling back to offline-browser verification');
      
      try {
        const ticketData = JSON.parse(qrData.trim());
        const offlineResult = await verifyTicketOffline(ticketData);
        
        setResult({
          valid: offlineResult.valid,
          message: offlineResult.message + ' (Network unavailable, verified in browser)',
          verificationMethod: 'offline-browser',
          warning: offlineResult.valid 
            ? 'Network unavailable. Verified in browser. Cannot check if ticket was already used.'
            : undefined,
          ticket: offlineResult.valid ? {
            route: `Route ${ticketData.routeId || 'Unknown'}`,
            validUntil: ticketData.validUntil,
          } : undefined,
        });
      } catch (offlineErr) {
        setResult({
          valid: false,
          message: 'Network error and offline verification failed',
        });
      }
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  const handleReset = () => {
    setQrData('');
    setResult(null);
  };

  const toggleMode = () => {
    setVerificationMode(prev => 
      prev === 'offline-browser' ? 'online' : 'offline-browser'
    );
  };

  return (
    <div className="max-w-4xl mx-auto animate-[fadeIn_0.5s_ease-in]">
      <Card className="bg-white/95 rounded-3xl shadow-xl p-12 mb-8">
        <CardHeader className="text-center text-[#667eea] pb-8">
          <Scan size={48} className="mx-auto mb-4" />
          <CardTitle className="text-3xl text-gray-800 mb-2">Ticket Scanner</CardTitle>
          <CardDescription className="text-base">
            Verify tickets using zero-knowledge proof verification
          </CardDescription>
          
          <div className="mt-4 flex justify-center">
            <Button
              onClick={toggleMode}
              variant="outline"
              className={`rounded-full ${
                verificationMode === 'offline-browser' 
                  ? 'border-purple-500 text-purple-600 hover:bg-purple-500 hover:text-white' 
                  : 'border-[#667eea] text-[#667eea] hover:bg-[#667eea] hover:text-white'
              }`}
            >
              {verificationMode === 'offline-browser' ? (
                <>
                  <Zap size={16} />
                  Offline (Browser)
                </>
              ) : (
                <>
                  <Wifi size={16} />
                  Online
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {!result ? (
          <CardContent>
            <form onSubmit={handleScan} className="space-y-6 max-w-2xl mx-auto">
              <div className="space-y-2">
                <Label htmlFor="qrData">Paste QR Code Content</Label>
                <Textarea
                  id="qrData"
                  value={qrData}
                  onChange={(e) => setQrData(e.target.value)}
                  placeholder='Paste full QR code JSON data here (e.g., {"ticketId":"...","proof":{...},"publicSignals":[...],...})'
                  disabled={scanning}
                  autoFocus
                  rows={6}
                  className="font-mono"
                />
              </div>

              <Button 
                type="submit" 
                size="lg"
                className="w-full rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-lg mb-8"
                disabled={scanning || !qrData.trim()}
              >
                {scanning ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Verifying Proof...
                  </>
                ) : (
                  <>
                    <Scan size={20} />
                    Verify Ticket
                  </>
                )}
              </Button>

              <div className="bg-[#667eea]/5 p-6 rounded-xl border-l-4 border-[#667eea]">
                <p className="font-semibold text-gray-800 mb-2">ℹ️ How to use:</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>Scan the QR code from the passenger's ticket</li>
                  <li>The QR code contains: ticket ID, ZK proof, and validity data</li>
                  <li>Choose your verification mode below</li>
                </ol>
                <div className="mt-4">
                  {verificationMode === 'offline-browser' ? (
                    <div className="bg-purple-50 border-l-4 border-purple-500 text-purple-900 p-4 rounded">
                      <p className="font-semibold mb-2">⚡ Offline (Browser) Mode - FULLY OFFLINE</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>✅ Verifies ZK proof entirely in your browser</li>
                        <li>✅ NO backend communication whatsoever</li>
                        <li>✅ Works completely offline</li>
                        <li>✅ Instant verification</li>
                        <li>⚠️ Cannot check if ticket was already used</li>
                      </ul>
                    </div>
                  ) : (
                    <div className="bg-green-50 border-l-4 border-green-500 text-green-900 p-4 rounded">
                      <p className="font-semibold mb-2">🌐 Online Mode - Full Verification</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>✅ Verifies ZK proof on server</li>
                        <li>✅ Checks if ticket was already used</li>
                        <li>✅ Gets full route information</li>
                        <li>✅ Most secure option</li>
                        <li>⚠️ Requires network connection</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        ) : (
          <CardContent>
            <div className={`text-center p-8 rounded-2xl animate-[scaleIn_0.3s_ease-out] ${
              result.valid ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className={`mb-4 ${result.valid ? 'text-green-500' : 'text-red-500'}`}>
                {result.valid ? (
                  <CheckCircle size={64} className="mx-auto" />
                ) : (
                  <XCircle size={64} className="mx-auto" />
                )}
              </div>

              <h2 className={`text-3xl font-bold mb-4 ${
                result.valid ? 'text-green-600' : 'text-red-600'
              }`}>
                {result.valid ? 'Valid Ticket ✓' : 'Invalid Ticket ✗'}
              </h2>

              <p className="text-xl text-gray-600 mb-4">{result.message}</p>

              {result.verificationMethod && (
                <Badge
                  variant={result.verificationMethod === 'offline-browser' ? 'secondary' : 'default'}
                  className={`mb-4 ${
                    result.verificationMethod === 'offline-browser'
                      ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      : ''
                  }`}
                >
                  {result.verificationMethod === 'offline-browser' && (
                    <>
                      <Zap size={16} className="mr-2" />
                      <span>OFFLINE (BROWSER)</span>
                    </>
                  )}
                  {result.verificationMethod === 'online' && (
                    <>
                      <Wifi size={16} className="mr-2" />
                      <span>ONLINE</span>
                    </>
                  )}
                  {(result.verificationMethod === 'offline' || result.verificationMethod === 'offline-fallback') && (
                    <>
                      <WifiOff size={16} className="mr-2" />
                      <span>{result.verificationMethod.toUpperCase()}</span>
                    </>
                  )}
                </Badge>
              )}

              {result.warning && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded text-yellow-900 text-left mb-6">
                  ⚠️ {result.warning}
                </div>
              )}

              {result.valid && result.ticket && (
                <div className="bg-white p-6 rounded-xl mb-8 text-left">
                  <div className="flex justify-between py-3 border-b border-gray-200">
                    <span className="font-semibold text-gray-600">Route:</span>
                    <span className="text-gray-800">{result.ticket.route}</span>
                  </div>
                  {result.ticket.type && (
                    <div className="flex justify-between py-3 border-b border-gray-200">
                      <span className="font-semibold text-gray-600">Type:</span>
                      <span className="text-gray-800">{result.ticket.type}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-3">
                    <span className="font-semibold text-gray-600">Valid Until:</span>
                    <span className="text-gray-800">
                      {new Date(result.ticket.validUntil).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <Button onClick={handleReset} size="lg" className="rounded-full hover:shadow-lg hover:-translate-y-0.5 transition-all">
                Scan Another Ticket
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white/95 p-6 rounded-2xl text-center shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">⚡ Browser Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm">Verify proofs entirely in browser - zero backend calls</p>
          </CardContent>
        </Card>
        <Card className="bg-white/95 p-6 rounded-2xl text-center shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">🔒 Cryptographically Secure</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm">Tamper-proof ZK proofs verified locally</p>
          </CardContent>
        </Card>
        <Card className="bg-white/95 p-6 rounded-2xl text-center shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">📡 Works Offline</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm">No network required for verification</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ScannerPage;
