import { useState } from 'react';
import { Scan, CheckCircle, XCircle, Loader2, WifiOff, Wifi, Zap, History, Clock } from 'lucide-react';
import { verifyTicketOffline } from '../utils/zkVerifier';
import { getAuthHeaders } from '../config/auth';
import { logTicketScan, getAuditLogs, LAUSANNE_ZURICH_STOPS, type LausanneZurichStop, type AuditLogEntry } from '../utils/auditLogger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QRCodeDataSchema, ScanResultSchema, type ScanResult } from '../schemas/validation';

type VerificationMode = 'offline-browser' | 'online';

function ScannerPage() {
  const [qrData, setQrData] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [verificationMode, setVerificationMode] = useState<VerificationMode>('offline-browser');
  const [currentStop, setCurrentStop] = useState<LausanneZurichStop | undefined>(undefined);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!qrData.trim()) {
      return;
    }

    setScanning(true);
    setResult(null);

    try {
      // Parse QR code data
      let parsedData;
      try {
        parsedData = JSON.parse(qrData.trim());
      } catch (parseError) {
        setResult({
          valid: false,
          message: 'Invalid QR code format. Please scan a valid ticket QR code.',
        });
        setScanning(false);
        return;
      }

      // Validate QR code structure with Zod
      const validationResult = QRCodeDataSchema.safeParse(parsedData);
      if (!validationResult.success) {
        console.error('QR code validation failed:', validationResult.error);
        setResult({
          valid: false,
          message: 'Invalid QR code structure. Missing or invalid required fields.',
        });
        setScanning(false);
        return;
      }

      const ticketData = validationResult.data;

      // Log the scan to audit log (non-blocking)
      logTicketScan(ticketData.ticketId, currentStop).catch(() => {
        // Silently handle errors - audit logging should not block the scan
      });

      // Fetch audit logs for this ticket (non-blocking)
      const fetchAuditLogs = async () => {
        setLoadingAuditLogs(true);
        try {
          const auditData = await getAuditLogs(ticketData.ticketId);
          if (auditData) {
            setAuditLogs(auditData.logs);
          }
        } catch (error) {
          console.error('Failed to fetch audit logs:', error);
        } finally {
          setLoadingAuditLogs(false);
        }
      };

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
        
        // Fetch audit logs after verification
        await fetchAuditLogs();
        
        setScanning(false);
        return;
      }

      // ONLINE MODE: Send to backend for full verification
      console.log('🌐 ONLINE MODE: Verifying with backend');
      
      const response = await fetch('/api/verify/scan', {
        method: 'POST',
        headers: getAuthHeaders(),
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

      const responseData = await response.json();
      
      // Validate response data with Zod
      const resultValidation = ScanResultSchema.safeParse(responseData);
      if (!resultValidation.success) {
        console.error('Response validation failed:', resultValidation.error);
        setResult({
          valid: false,
          message: 'Invalid response from server',
        });
      } else {
        setResult(resultValidation.data);
      }

      // Fetch audit logs after verification
      const auditData = await getAuditLogs(ticketData.ticketId);
      if (auditData) {
        setAuditLogs(auditData.logs);
      }
    } catch (err) {
      // Network error - automatically use offline verification
      console.log('❌ Network error - falling back to offline-browser verification');
      
      try {
        const parsedData = JSON.parse(qrData.trim());
        const validationResult = QRCodeDataSchema.safeParse(parsedData);
        
        if (!validationResult.success) {
          setResult({
            valid: false,
            message: 'Invalid QR code data',
          });
          setScanning(false);
          return;
        }

        const ticketData = validationResult.data;
        
        // Log the scan to audit log (non-blocking)
        logTicketScan(ticketData.ticketId, currentStop).catch(() => {
          // Silently handle errors - audit logging should not block the scan
        });
        
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

        // Try to fetch audit logs (may fail if network is down)
        try {
          const auditData = await getAuditLogs(ticketData.ticketId);
          if (auditData) {
            setAuditLogs(auditData.logs);
          }
        } catch (error) {
          // Silently fail if network is unavailable
          console.log('Could not fetch audit logs (network unavailable)');
        }
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
    setAuditLogs([]);
    // Keep currentStop selected for convenience
  };

  const toggleMode = () => {
    setVerificationMode(prev => 
      prev === 'offline-browser' ? 'online' : 'offline-browser'
    );
  };

  return (
    <div className="max-w-4xl mx-auto animate-[fadeIn_0.5s_ease-in] space-y-8">
      <Card className="glass-strong border-primary/10">
        <CardHeader className="text-center pb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Scan size={28} className="text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold mb-2">Ticket Scanner</CardTitle>
          <CardDescription className="text-base">
            Verify tickets using zero-knowledge proof verification
          </CardDescription>
          
          <div className="mt-6 flex justify-center">
            <Button
              onClick={toggleMode}
              variant="outline"
              size="sm"
              className={`rounded-full transition-all ${
                verificationMode === 'offline-browser' 
                  ? 'border-purple-500/50 text-purple-400 hover:bg-purple-500/20' 
                  : 'border-primary/50 text-primary hover:bg-primary/20'
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
            <form onSubmit={handleScan} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="qrData" className="text-sm font-medium">Paste QR Code Content</Label>
                <Textarea
                  id="qrData"
                  value={qrData}
                  onChange={(e) => setQrData(e.target.value)}
                  placeholder='Paste full QR code JSON data here (e.g., {"ticketId":"...","proof":{...},"publicSignals":[...],...})'
                  disabled={scanning}
                  autoFocus
                  rows={6}
                  className="font-mono text-xs resize-none"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="currentStop" className="text-sm font-medium">Current Stop (Lausanne → Zurich)</Label>
                <Select
                  value={currentStop}
                  onValueChange={(value) => setCurrentStop(value as LausanneZurichStop)}
                  disabled={scanning}
                >
                  <SelectTrigger id="currentStop" className="w-full">
                    <SelectValue placeholder="Select current stop" />
                  </SelectTrigger>
                  <SelectContent>
                    {LAUSANNE_ZURICH_STOPS.map((stop) => (
                      <SelectItem key={stop} value={stop}>
                        {stop}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                size="lg"
                className="w-full rounded-xl h-12 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40"
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

              <div className="bg-primary/5 border border-primary/10 p-5 rounded-xl space-y-3">
                <p className="font-semibold text-sm flex items-center gap-2">
                  <span className="text-primary">ℹ️</span>
                  How to use:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-2">
                  <li>Scan the QR code from the passenger's ticket</li>
                  <li>The QR code contains: ticket ID, ZK proof, and validity data</li>
                  <li>Choose your verification mode above</li>
                </ol>
                <div className="mt-4 pt-4 border-t border-border">
                  {verificationMode === 'offline-browser' ? (
                    <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-lg space-y-2">
                      <p className="font-semibold text-sm text-purple-400">⚡ Offline (Browser) Mode - FULLY OFFLINE</p>
                      <ul className="space-y-1 text-xs text-muted-foreground ml-4">
                        <li>✅ Verifies ZK proof entirely in your browser</li>
                        <li>✅ NO backend communication whatsoever</li>
                        <li>✅ Works completely offline</li>
                        <li>✅ Instant verification</li>
                        <li>⚠️ Cannot check if ticket was already used</li>
                      </ul>
                    </div>
                  ) : (
                    <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg space-y-2">
                      <p className="font-semibold text-sm text-green-400">🌐 Online Mode - Full Verification</p>
                      <ul className="space-y-1 text-xs text-muted-foreground ml-4">
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
            <div className={`text-center p-8 rounded-xl animate-[scaleIn_0.3s_ease-out] ${
              result.valid ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
            }`}>
              <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                result.valid ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                {result.valid ? (
                  <CheckCircle size={32} className="text-green-400" />
                ) : (
                  <XCircle size={32} className="text-red-400" />
                )}
              </div>

              <h2 className={`text-2xl font-bold mb-3 ${
                result.valid ? 'text-green-400' : 'text-red-400'
              }`}>
                {result.valid ? 'Valid Ticket ✓' : 'Invalid Ticket ✗'}
              </h2>

              <p className="text-base text-muted-foreground mb-4">{result.message}</p>

              {result.verificationMethod && (
                <Badge
                  variant="outline"
                  className={`mb-4 ${
                    result.verificationMethod === 'offline-browser'
                      ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                      : 'bg-primary/10 border-primary/30 text-primary'
                  }`}
                >
                  {result.verificationMethod === 'offline-browser' && (
                    <>
                      <Zap size={14} className="mr-2" />
                      <span className="text-xs font-semibold">OFFLINE (BROWSER)</span>
                    </>
                  )}
                  {result.verificationMethod === 'online' && (
                    <>
                      <Wifi size={14} className="mr-2" />
                      <span className="text-xs font-semibold">ONLINE</span>
                    </>
                  )}
                  {(result.verificationMethod === 'offline' || result.verificationMethod === 'offline-fallback') && (
                    <>
                      <WifiOff size={14} className="mr-2" />
                      <span className="text-xs font-semibold">{result.verificationMethod.toUpperCase()}</span>
                    </>
                  )}
                </Badge>
              )}

              {result.warning && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg text-sm text-left mb-6">
                  <p className="text-yellow-400 font-medium">⚠️ {result.warning}</p>
                </div>
              )}

              {result.valid && result.ticket && (
                <div className="bg-muted/30 border border-border p-5 rounded-lg mb-6 text-left space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Route:</span>
                    <span className="font-medium">{result.ticket.route}</span>
                  </div>
                  {result.ticket.type && (
                    <div className="flex justify-between text-sm border-t border-border pt-3">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium">{result.ticket.type}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm border-t border-border pt-3">
                    <span className="text-muted-foreground">Valid Until:</span>
                    <span className="font-medium">
                      {new Date(result.ticket.validUntil).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Audit Log Section */}
              <div className="bg-muted/20 border border-border p-5 rounded-lg mb-6 text-left">
                <div className="flex items-center gap-2 mb-4">
                  <History size={18} className="text-primary" />
                  <h3 className="font-semibold text-sm">Scan History</h3>
                  {loadingAuditLogs && (
                    <Loader2 className="animate-spin ml-2" size={14} />
                  )}
                </div>
                
                {auditLogs.length === 0 && !loadingAuditLogs ? (
                  <p className="text-sm text-muted-foreground">No previous scans found for this ticket.</p>
                ) : (
                  <div className="space-y-3">
                    {auditLogs.map((log, index) => (
                      <div
                        key={log.id}
                        className={`p-3 rounded-lg border ${
                          index === 0
                            ? 'bg-primary/10 border-primary/30'
                            : 'bg-muted/30 border-border'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Clock size={14} className="text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.scannedAt).toLocaleString()}
                              </span>
                              {index === 0 && (
                                <Badge variant="outline" className="text-xs px-2 py-0">
                                  Latest
                                </Badge>
                              )}
                            </div>
                            {log.currentStop && (
                              <div className="text-sm font-medium text-foreground mt-1">
                                Stop: {log.currentStop}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button onClick={handleReset} size="lg" className="rounded-xl shadow-lg shadow-primary/25">
                Scan Another Ticket
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: '⚡', title: 'Browser Verification', desc: 'Verify proofs entirely in browser - zero backend calls' },
          { icon: '🔒', title: 'Cryptographically Secure', desc: 'Tamper-proof ZK proofs verified locally' },
          { icon: '📡', title: 'Works Offline', desc: 'No network required for verification' },
        ].map((feature, idx) => (
          <Card key={idx} className="glass border-primary/5 hover:border-primary/20 transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-lg">{feature.icon}</span>
                {feature.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default ScannerPage;
