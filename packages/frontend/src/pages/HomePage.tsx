import { Link } from 'react-router-dom';
import { ShoppingCart, Shield, QrCode, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function HomePage() {
  return (
    <div className="animate-[fadeIn_0.5s_ease-in]">
      <section className="text-center p-16 bg-white/95 rounded-3xl shadow-xl mb-12">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
          Welcome to CFF Tickets ZK
        </h1>
        <p className="text-2xl text-gray-600 mb-4">
          Buy train tickets with zero-knowledge proof technology
        </p>
        <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
          Your privacy is our priority. Purchase tickets without storing any personal data.
        </p>
        <Button asChild size="lg" className="rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-lg px-8 py-6">
          <Link to="/purchase" className="flex items-center gap-2">
            <ShoppingCart size={20} />
            Buy Tickets Now
          </Link>
        </Button>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <Card className="bg-white/95 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
          <CardHeader className="text-center">
            <div className="flex justify-center text-[#667eea] mb-4">
              <Shield size={48} />
            </div>
            <CardTitle>Zero-Knowledge Proofs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 leading-relaxed">
              Your tickets are protected using advanced cryptographic proofs that verify
              validity without revealing personal information.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/95 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
          <CardHeader className="text-center">
            <div className="flex justify-center text-[#667eea] mb-4">
              <Lock size={48} />
            </div>
            <CardTitle>Privacy First</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 leading-relaxed">
              No personal data is stored in our system. Only cryptographic proofs that
              guarantee your ticket's authenticity.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/95 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
          <CardHeader className="text-center">
            <div className="flex justify-center text-[#667eea] mb-4">
              <QrCode size={48} />
            </div>
            <CardTitle>Easy Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 leading-relaxed">
              Scanners can instantly verify your ticket using QR codes while keeping
              your personal information private.
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="bg-white/95 shadow-xl p-12">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl mb-12">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4 shadow-lg">
                1
              </div>
              <h4 className="text-gray-800 mb-2 text-xl font-semibold">Select Your Route</h4>
              <p className="text-gray-600 leading-relaxed">Choose your origin and destination from available routes</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4 shadow-lg">
                2
              </div>
              <h4 className="text-gray-800 mb-2 text-xl font-semibold">Purchase Ticket</h4>
              <p className="text-gray-600 leading-relaxed">Complete a simple payment confirmation (POC)</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4 shadow-lg">
                3
              </div>
              <h4 className="text-gray-800 mb-2 text-xl font-semibold">Receive ZK Proof</h4>
              <p className="text-gray-600 leading-relaxed">Get your ticket with embedded zero-knowledge proof</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4 shadow-lg">
                4
              </div>
              <h4 className="text-gray-800 mb-2 text-xl font-semibold">Travel Securely</h4>
              <p className="text-gray-600 leading-relaxed">Present your QR code for verification during travel</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default HomePage;

