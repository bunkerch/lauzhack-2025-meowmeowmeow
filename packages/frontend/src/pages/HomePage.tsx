import { Link } from 'react-router-dom';
import { ShoppingCart, Shield, QrCode, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function HomePage() {
  return (
    <div className="animate-[fadeIn_0.5s_ease-in] space-y-16">
      {/* Hero Section */}
      <section className="text-center py-20 px-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 text-sm font-medium">
          <Sparkles size={16} className="text-primary" />
          <span>Privacy-First Ticketing Platform</span>
        </div>
        
        <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent leading-tight">
          CFF Tickets ZK
        </h1>
        
        <p className="text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
          Buy train tickets with zero-knowledge proof technology
        </p>
        
        <p className="text-base text-muted-foreground/80 mb-10 max-w-xl mx-auto">
          Your privacy is our priority. Purchase tickets without storing any personal data.
        </p>
        
        <Button asChild size="lg" className="rounded-full h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all group">
          <Link to="/purchase" className="flex items-center gap-2">
            <ShoppingCart size={20} />
            Buy Tickets Now
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </section>

      {/* Features Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-strong border-primary/10 hover:border-primary/30 transition-all group">
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Shield size={24} className="text-primary" />
            </div>
            <CardTitle className="text-xl">Zero-Knowledge Proofs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Your tickets are protected using advanced cryptographic proofs that verify
              validity without revealing personal information.
            </p>
          </CardContent>
        </Card>

        <Card className="glass-strong border-primary/10 hover:border-primary/30 transition-all group">
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Lock size={24} className="text-primary" />
            </div>
            <CardTitle className="text-xl">Privacy First</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed text-sm">
              No personal data is stored in our system. Only cryptographic proofs that
              guarantee your ticket's authenticity.
            </p>
          </CardContent>
        </Card>

        <Card className="glass-strong border-primary/10 hover:border-primary/30 transition-all group">
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <QrCode size={24} className="text-primary" />
            </div>
            <CardTitle className="text-xl">Easy Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Scanners can instantly verify your ticket using QR codes while keeping
              your personal information private.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* How It Works */}
      <Card className="glass-strong border-primary/10">
        <CardHeader className="text-center pb-12">
          <CardTitle className="text-3xl font-bold">How It Works</CardTitle>
          <p className="text-muted-foreground mt-2">Four simple steps to secure your journey</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6">
            {[
              { num: 1, title: 'Select Your Route', desc: 'Choose your origin and destination from available routes' },
              { num: 2, title: 'Purchase Ticket', desc: 'Complete a simple payment confirmation (POC)' },
              { num: 3, title: 'Receive ZK Proof', desc: 'Get your ticket with embedded zero-knowledge proof' },
              { num: 4, title: 'Travel Securely', desc: 'Present your QR code for verification during travel' },
            ].map((step) => (
              <div key={step.num} className="text-center group">
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary text-2xl font-bold flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    {step.num}
                  </div>
                </div>
                <h4 className="font-semibold mb-2">{step.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default HomePage;

