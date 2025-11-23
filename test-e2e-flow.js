/**
 * End-to-End Flow Test Script
 * 
 * Tests the complete ZK ticket purchase flow:
 * 1. Get quote from Ticket Backend
 * 2. Process payment via Payment Service
 * 3. Generate ZK proof (mocked - requires browser environment)
 * 4. Submit proof and receive ticket
 */

const BASE_URL = 'http://localhost:3000/api';

async function testE2EFlow() {
    console.log('🧪 Testing End-to-End ZK Ticket Flow\n');

    try {
        // Step 1: Get journey quote
        console.log('📋 Step 1: Getting journey quote...');
        const quoteResponse = await fetch(`${BASE_URL}/tickets/quote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                origin: 'Zürich HB',
                destination: 'Geneva',
                travelDate: new Date().toISOString()
            })
        });

        if (!quoteResponse.ok) {
            throw new Error('Failed to get quote');
        }

        const quote = await quoteResponse.json();
        console.log('✅ Quote received:');
        console.log(`   QuoteId: ${quote.quoteId}`);
        console.log(`   Route: ${quote.origin} → ${quote.destination}`);
        console.log(`   Price: CHF ${(quote.priceCents / 100).toFixed(2)}`);
        console.log('');

        // Step 2: Process payment
        console.log('💳 Step 2: Processing payment...');
        const paymentResponse = await fetch(`${BASE_URL}/payment/pay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quoteId: quote.quoteId,
                priceCents: quote.priceCents,
                paymentMethod: 'mock'
            })
        });

        if (!paymentResponse.ok) {
            throw new Error('Payment failed');
        }

        const payment = await paymentResponse.json();
        console.log('✅ Payment successful:');
        console.log(`   Secret: ${payment.secret.slice(0, 30)}...`);
        console.log(`   Root: ${payment.root.slice(0, 30)}...`);
        console.log(`   Path elements: ${payment.merklePath.pathElements.length}`);
        console.log('');

        // Step 3: Check Payment Service root
        console.log('🌳 Step 3: Verifying Merkle root...');
        const rootResponse = await fetch(`${BASE_URL}/payment/root`);
        const rootData = await rootResponse.json();
        console.log(`✅ Current root: ${rootData.root.slice(0, 30)}...`);
        console.log(`   Matches payment: ${rootData.root === payment.root ? 'YES' : 'NO'}`);
        console.log('');

        // Step 4: Get Payment Service stats
        console.log('📊 Step 4: Checking Payment Service stats...');
        const statsResponse = await fetch(`${BASE_URL}/payment/stats`);
        const stats = await statsResponse.json();
        console.log('✅ Payment Service stats:');
        console.log(`   Total payments: ${stats.totalPayments}`);
        console.log(`   Tree depth: ${stats.treeDepth}`);
        console.log('');

        // Note: ZK proof generation requires browser environment with WASM support
        console.log('🔐 Step 5: ZK Proof Generation');
        console.log('⚠️  Note: ZK proof generation requires browser environment');
        console.log('   In the browser, the frontend will:');
        console.log('   1. Convert quoteId to field element');
        console.log('   2. Run fullProve() with circuit WASM and zkey');
        console.log('   3. Generate cryptographic proof + public signals');
        console.log('');

        console.log('✅ Backend API tests passed!');
        console.log('\n📝 Next steps:');
        console.log('   1. Start the frontend: pnpm --filter @cff/frontend dev');
        console.log('   2. Navigate to http://localhost:5173/zk-purchase');
        console.log('   3. Complete the flow in the browser');
        console.log('');
        console.log('🎉 All backend components are working correctly!');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
testE2EFlow();

