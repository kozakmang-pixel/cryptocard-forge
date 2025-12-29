// rescue-deposit.cjs
const crypto = require("crypto");
const web3 = require("@solana/web3.js");

// -------------------------------------------
// REQUIRED — YOU MUST FILL THESE TWO VALUES:
// -------------------------------------------
const DEPOSIT_SECRET = ""; // 🔥 paste deposit_secret (UUID-like hashed value from DB)
const DESTINATION_WALLET = ""; // 🔥 paste YOUR wallet (Phantom) you want funds to go to
// -------------------------------------------

// DEFAULT RPC — public mainnet
const RPC = "https://api.mainnet-beta.solana.com";

async function main() {
  if (!DEPOSIT_SECRET || !DESTINATION_WALLET) {
    console.error("\n❌ ERROR — Missing DEPOSIT_SECRET or DESTINATION_WALLET\n");
    console.error("Open rescue-deposit.cjs and paste values at top!\n");
    return;
  }

  const connection = new web3.Connection(RPC, "confirmed");

  // Generate keypair from deterministic seed
  const seed = crypto
    .createHash("sha256")
    .update(String(DEPOSIT_SECRET))
    .digest()
    .subarray(0, 32);

  const kp = web3.Keypair.fromSeed(seed);

  console.log("🎯 Deposit Address (pubkey):", kp.publicKey.toBase58());

  const balance = await connection.getBalance(kp.publicKey);
  console.log("💰 Balance lamports:", balance);
  console.log("💰 In SOL:", balance / web3.LAMPORTS_PER_SOL);

  if (balance <= 5000) {
    console.log("\n⚠️ Balance too low to sweep (needs > 5000 lamports ~0.000005 SOL)\n");
    return;
  }

  const fee = 5000;
  const amount = balance - fee;

  console.log(`\n🚚 Sweeping ${amount / web3.LAMPORTS_PER_SOL} SOL → ${DESTINATION_WALLET} ...`);

  const tx = new web3.Transaction().add(
    web3.SystemProgram.transfer({
      fromPubkey: kp.publicKey,
      toPubkey: new web3.PublicKey(DESTINATION_WALLET),
      lamports: amount,
    })
  );

  const sig = await web3.sendAndConfirmTransaction(connection, tx, [kp]);

  console.log("\n🎉 SUCCESS — FUNDS MOVED");
  console.log("🔗 Solscan:", `https://solscan.io/tx/${sig}\n`);
}

main().catch((err) => console.error(err));
