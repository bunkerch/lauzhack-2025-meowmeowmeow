/**
 * Test Poseidon Compatibility
 * 
 * Verifies that frontend (poseidon-lite) and backend (circomlibjs)
 * produce the same hash outputs.
 */

// Backend simulation
import { buildPoseidon } from 'circomlibjs';
// Frontend simulation
import { poseidon1 } from 'poseidon-lite';

async function testPoseidonCompatibility() {
    console.log('🧪 Testing Poseidon Compatibility\n');

    // Initialize backend Poseidon
    const backendPoseidon = await buildPoseidon();

    // Test values
    const testValue = 12345n;
    const testString = "Q1234567890_abcdef12";

    console.log('Test 1: Simple hash of a number');
    console.log(`  Input: ${testValue}\n`);

    // Backend hash
    const backendHash = backendPoseidon([testValue]);
    const backendResult = backendPoseidon.F.toString(backendHash);
    console.log(`  Backend (circomlibjs):  ${backendResult}`);

    // Frontend hash
    const frontendResult = poseidon1([testValue]).toString();
    console.log(`  Frontend (poseidon-lite): ${frontendResult}`);

    const match1 = backendResult === frontendResult;
    console.log(`  Match: ${match1 ? '✅' : '❌'}\n`);

    // Test 2: String to field conversion (like quoteId)
    console.log('Test 2: String to field conversion (quoteId)');
    console.log(`  Input: "${testString}"\n`);

    // Convert string to BigInt
    const bytes = new TextEncoder().encode(testString);
    let acc = 0n;
    for (const byte of bytes) {
        acc = acc * 256n + BigInt(byte);
    }
    console.log(`  Converted to BigInt: ${acc.toString().slice(0, 30)}...\n`);

    // Backend hash
    const backendStringHash = backendPoseidon([acc]);
    const backendStringResult = backendPoseidon.F.toString(backendStringHash);
    console.log(`  Backend (circomlibjs):  ${backendStringResult}`);

    // Frontend hash
    const frontendStringResult = poseidon1([acc]).toString();
    console.log(`  Frontend (poseidon-lite): ${frontendStringResult}`);

    const match2 = backendStringResult === frontendStringResult;
    console.log(`  Match: ${match2 ? '✅' : '❌'}\n`);

    if (match1 && match2) {
        console.log('✅ All tests passed! Frontend and backend are compatible!');
        process.exit(0);
    } else {
        console.log('❌ Tests failed! Hash outputs do not match!');
        process.exit(1);
    }
}

testPoseidonCompatibility().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});

