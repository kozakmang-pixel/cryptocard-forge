// backend.cjs
// CRYPTOCARDS backend + static frontend server (CommonJS)

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const nacl = require('tweetnacl');
const bs58 = require('bs58');
const { createClient } = require('@supabase/supabase-js');
const web3 = require('@solana/web3.js');

// --- Env + config ---

const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://cryptocards.fun';

// SOL price config
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || null;
// Fallback manual price so we NEVER show $0.00 everywhere
const FALLBACK_SOL_PRICE_USD = parseFloat(
  process.env.FALLBACK_SOL_PRICE_USD || '150'
);

// Cache SOL price for 60 seconds
let cachedSolPriceUsd = null;
let cachedSolPriceTs = 0;
const SOL_PRICE_TTL_MS = 60_000;

// SOL mint (canonical)
const SOL_MINT = 'So11111111111111111111111111111111111111112';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Solana connection (for real deposit addresses / balances)
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || web3.clusterApiUrl('mainnet-beta');
const solanaConnection = new web3.Connection(SOLANA_RPC_URL, 'confirmed');

// --- Express setup ---

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend from dist
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Utility hash helper
function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// Deterministic public card ID: 8 numeric digits in XXXX-XXXX format
function generatePublicId() {
  let digits = '';
  while (digits.length < 8) {
    const byte = crypto.randomBytes(1)[0];
    if (byte >= 250) continue;
    digits += String(byte % 10);
  }
  return digits.slice(0, 4) + '-' + digits.slice(4);
}

function generateDepositSecret() {
  return crypto.randomBytes(32).toString('hex');
}

// Solana-style deposit address derived from secret using @solana/web3.js
function generateDepositAddress(secret) {
  const seed = crypto.createHash('sha256').update(String(secret)).digest().subarray(0, 32);
  const keypair = web3.Keypair.fromSeed(seed);
  return keypair.publicKey.toBase58();
}

// Re-create full keypair for a deposit address (for CLAIM)
function getDepositKeypairFromSecret(secret) {
  const seed = crypto.createHash('sha256').update(String(secret)).digest().subarray(0, 32);
  return web3.Keypair.fromSeed(seed);
}

function generateCVV() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

function maskIdentifier(value) {
  if (!value || typeof value !== 'string') return null;
  if (value.length <= 2) return value[0] + '*';
  return value.slice(0, 2) + '*'.repeat(Math.max(1, value.length - 4)) + value.slice(-2);
}

async function notifyTelegram(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return;
  }

  try {
    const fetch = (await import('node-fetch')).default;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
  } catch (err) {
    console.error('Failed to send Telegram notification:', err);
  }
}

// --- SOL PRICE HELPERS ---

async function fetchSolPriceFromHelius() {
  if (!HELIUS_API_KEY) {
    throw new Error('No HELIUS_API_KEY configured');
  }

  const fetch = (await import('node-fetch')).default;

  const body = {
    jsonrpc: '2.0',
    id: 'sol-price',
    method: 'getAsset',
    params: {
      id: SOL_MINT,
      displayOptions: { showFungible: true, showPrice: true },
    },
  };

  const resp = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Helius HTTP ${resp.status}: ${text}`);
  }

  const json = await resp.json();
  const price =
    json &&
    json.result &&
    json.result.token_info &&
    json.result.token_info.price_info &&
    json.result.token_info.price_info.price_per_token;

  if (!price || typeof price !== 'number') {
    console.error('getSolPriceUsd: Helius response missing valid price_info.price_per_token', JSON.stringify(json));
    throw new Error('Helius missing price_per_token');
  }

  return price;
}

/**
 * Cached SOL price in USD with 60s TTL and safe fallback.
 */
async function getSolPriceUsd() {
  const now = Date.now();

  if (cachedSolPriceUsd !== null && now - cachedSolPriceTs < SOL_PRICE_TTL_MS) {
    return cachedSolPriceUsd;
  }

  let lastError = null;
  let price = null;

  // Provider 1: Helius DAS (if configured)
  if (HELIUS_API_KEY) {
    try {
      price = await fetchSolPriceFromHelius();
      console.log('getSolPriceUsd: using Helius price', price);
    } catch (err) {
      lastError = err;
      console.error('getSolPriceUsd provider failed (Helius):', err.message || err);
    }
  }

  // You could add more providers here if you want in the future.
  // For now we keep it simple and lean on fallback to avoid more rate limits.

  if (price == null) {
    if (cachedSolPriceUsd !== null) {
      console.warn(
        'getSolPriceUsd: all providers failed, reusing last cached price',
        cachedSolPriceUsd
      );
      cachedSolPriceTs = now;
      return cachedSolPriceUsd;
    }

    console.warn(
      'getSolPriceUsd: all providers failed and no cache, using FALLBACK_SOL_PRICE_USD =',
      FALLBACK_SOL_PRICE_USD,
      'Last error:',
      lastError && (lastError.message || lastError)
    );

    price = FALLBACK_SOL_PRICE_USD;
  }

  cachedSolPriceUsd = price;
  cachedSolPriceTs = now;
  return price;
}

// --- AUTH HELPERS ---

async function getUserFromRequest(req) {
  const authHeader = req.headers['authorization'] || '';
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;
  const token = parts[1];
  if (!token) return null;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      // This will happen for expired tokens – not fatal, just means "not logged in"
      console.warn('getUserFromRequest error:', error);
      return null;
    }
    return data.user || null;
  } catch (err) {
    console.error('getUserFromRequest exception:', err);
    return null;
  }
}

// ----- AUTH ROUTES -----

// REGISTER: username + password required, email OPTIONAL
app.post('/auth/register', async (req, res) => {
  try {
    const { username, password, email } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'username and password are required',
      });
    }

    const trimmedUsername = String(username).trim();
    if (!/^[a-zA-Z0-9_\-]{3,20}$/.test(trimmedUsername)) {
      return res.status(400).json({
        success: false,
        error:
          'Username must be 3-20 characters and contain only letters, numbers, underscores, or dashes.',
      });
    }

    const { data: existingUsers, error: existingError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (existingError) {
      console.error('Error in /auth/register listUsers:', existingError);
      return res.status(500).json({
        success: false,
        error: 'Failed to check existing users',
      });
    }

    const usernameTaken =
      existingUsers?.users?.some((u) => {
        const metaUsername = u.user_metadata?.username || u.email?.split('@')[0];
        return metaUsername && metaUsername.toLowerCase() === trimmedUsername.toLowerCase();
      }) || false;

    if (usernameTaken) {
      return res.status(400).json({
        success: false,
        error: 'Username is already taken. Please choose a different one.',
      });
    }

    const redirectTo = FRONTEND_URL ? `${FRONTEND_URL.replace(/\/+$/, '')}/` : undefined;

    let user = null;
    let error = null;

    if (email && typeof email === 'string' && email.includes('@')) {
      const signUp = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: trimmedUsername,
            notification_email: email,
          },
          emailRedirectTo: redirectTo,
        },
      });

      error = signUp.error;
      user = signUp.data?.user ?? null;
    } else {
      const syntheticEmail = `${trimmedUsername}+noemail@cryptocards.local`;

      const { data, error: createError } = await supabase.auth.admin.createUser({
        email: syntheticEmail,
        password,
        email_confirm: true,
        user_metadata: {
          username: trimmedUsername,
          notification_email: null,
        },
      });

      error = createError;
      user = data?.user ?? null;
    }

    if (error) {
      console.error('Error in /auth/register:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Registration failed',
      });
    }

    await notifyTelegram(
      `🆕 New user registered\n\nUsername: \`${trimmedUsername}\`\nEmail: \`${email || 'N/A'}\``
    );

    return res.json({
      success: true,
      user: user
        ? {
            id: user.id,
            username: trimmedUsername,
            email: email || null,
          }
        : null,
    });
  } catch (err) {
    console.error('Exception in /auth/register:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// LOGIN: USERNAME + PASSWORD
app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'username and password are required',
      });
    }

    const identifier = String(username).trim();

    const { data: usersPage, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      console.error('Error in /auth/login listUsers:', listError);
      return res.status(500).json({
        success: false,
        error: 'Failed to look up user',
      });
    }

    const matchedUser =
      usersPage?.users?.find((u) => {
        const uname = u.user_metadata?.username;
        return typeof uname === 'string' && uname.toLowerCase() === identifier.toLowerCase();
      }) || null;

    if (!matchedUser || !matchedUser.email) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const signIn = await supabase.auth.signInWithPassword({
      email: matchedUser.email,
      password,
    });

    if (signIn.error || !signIn.data?.user || !signIn.data?.session) {
      const msg = signIn.error?.message || '';
      if (msg.toLowerCase().includes('confirm') && msg.toLowerCase().includes('email')) {
        return res.status(403).json({
          success: false,
          error: 'Please confirm your email before logging in.',
        });
      }

      return res.status(401).json({
        success: false,
        error: signIn.error?.message || 'Invalid credentials',
      });
    }

    const { user, session } = signIn.data;
    const token = session.access_token;
    const refreshToken = session.refresh_token;

    const responseUser = {
      id: user.id,
      username: user.user_metadata?.username || matchedUser.email.split('@')[0],
      email: user.user_metadata?.notification_email || matchedUser.email,
    };

    res.json({
      success: true,
      token,
      refreshToken,
      user: responseUser,
    });
  } catch (err) {
    console.error('Exception in /auth/login:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// CURRENT USER
app.get('/auth/me', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    const meta = user.user_metadata || {};
    const responseUser = {
      id: user.id,
      username: meta.username || user.email,
      email: meta.notification_email || user.email,
    };

    res.json({ success: true, user: responseUser });
  } catch (err) {
    console.error('Exception in /auth/me:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// UPDATE EMAIL METADATA (notification email)
app.post('/auth/update-email', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    const { newEmail } = req.body || {};
    if (!newEmail || typeof newEmail !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'newEmail is required',
      });
    }

    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...(user.user_metadata || {}),
        notification_email: newEmail,
      },
    });

    if (error) {
      console.error('Error in /auth/update-email:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to update email',
      });
    }

    const updated = data.user;
    const meta = updated.user_metadata || {};
    const responseUser = {
      id: updated.id,
      username: meta.username || updated.email,
      email: meta.notification_email || updated.email,
    };

    res.json({ success: true, user: responseUser });
  } catch (err) {
    console.error('Exception in /auth/update-email:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// EMAIL CHANGE COMPLETE WEBHOOK (secure change)
app.post('/auth/email-change-complete', async (req, res) => {
  try {
    const { user_id, new_email } = req.body || {};
    if (!user_id || !new_email) {
      return res.status(400).json({
        success: false,
        error: 'user_id and new_email are required',
      });
    }

    const { data, error } = await supabase.auth.admin.getUserById(user_id);

    if (error || !data.user) {
      console.error('Error in /auth/email-change-complete getUserById:', error);
      return res.status(400).json({
        success: false,
        error: 'User not found',
      });
    }

    const updatedUser = data.user;
    const meta = updatedUser.user_metadata || {};

    const newMeta = {
      ...meta,
      notification_email: new_email,
    };

    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      user_id,
      {
        user_metadata: newMeta,
      }
    );

    if (updateError) {
      console.error('Error in /auth/email-change-complete update:', updateError);
      return res.status(400).json({
        success: false,
        error: updateError.message || 'Failed to finalize email change',
      });
    }

    const updated = updateData.user;
    const responseUser = {
      id: updated.id,
      username: meta.username || updated.email,
      email: new_email,
    };

    res.json({ success: true, user: responseUser });
  } catch (err) {
    console.error('Exception in /auth/email-change-complete:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// FORGOT PASSWORD -> Supabase reset email
app.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Valid email is required',
      });
    }

    const redirectTo = FRONTEND_URL
      ? `${FRONTEND_URL.replace(/\/+$/, '')}/reset-password`
      : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      console.error('Error in /auth/forgot-password:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to send reset email',
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Exception in /auth/forgot-password:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ----- CARD + STATS ROUTES -----

// CREATE CARD
app.post('/create-card', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    const {
      message,
      currency,
      amount_fiat,
      expires_at,
      template_url,
      token_mint,
      token_amount,
    } = req.body || {};

    if (!message || !template_url || !currency) {
      return res.status(400).json({
        error: 'message, currency, and template_url are required',
      });
    }

    const public_id = generatePublicId();
    const cvv = generateCVV();
    const deposit_secret = generateDepositSecret();
    const deposit_address = generateDepositAddress(deposit_secret);
    const now = new Date().toISOString();

    const insertPayload = {
      public_id,
      cvv_hash: sha256(cvv),
      message,
      currency,
      amount_fiat: amount_fiat ?? null,
      expires_at: expires_at || null,
      template_url,
      token_mint: token_mint || null,
      token_amount: token_amount ?? null,
      deposit_address,
      deposit_secret,
      funded: false,
      claimed: false,
      locked: false,
      refunded: false,
      created_at: now,
      updated_at: now,
      creator_user_id: user ? user.id : null,
      creator_email: user ? user.email : null,
    };

    const { error: insertError } = await supabase.from('cards').insert(insertPayload);

    if (insertError) {
      console.error('Supabase insert error /create-card:', insertError);
      throw insertError;
    }

    const creatorLabel = user ? maskIdentifier(user.email || user.id) : 'anonymous';

    const tgLines = [
      '*🆕 New CRYPTOCARD Created*',
      '',
      `*Card ID:* \`${public_id}\``,
      `*Creator:* ${creatorLabel}`,
      '',
      `*Currency:* ${currency}`,
      amount_fiat != null ? `*Fiat Amount:* ${amount_fiat}` : null,
    ].filter(Boolean);

    await notifyTelegram(tgLines.join('\n'));

    res.json({
      public_id,
      cvv,
      deposit_address,
    });
  } catch (err) {
    console.error('Error in /create-card:', err);
    res.status(500).json({ error: err.message });
  }
});

// CARD STATUS (for audit + claim)
app.get('/card-status/:publicId', async (req, res) => {
  try {
    const publicId = req.params.publicId;

    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('public_id', publicId)
      .maybeSingle();

    if (error) {
      console.error('Supabase /card-status error:', error);
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json(data);
  } catch (err) {
    console.error('Error in /card-status:', err);
    res.status(500).json({ error: err.message });
  }
});

// LOCK CARD (logical lock, no on-chain tx yet)
app.post('/lock-card', async (req, res) => {
  try {
    const { public_id } = req.body || {};
    if (!public_id) {
      return res.status(400).json({ error: 'public_id is required' });
    }

    const { data: card, error: fetchError } = await supabase
      .from('cards')
      .select('*')
      .eq('public_id', public_id)
      .maybeSingle();

    if (fetchError) {
      console.error('Supabase /lock-card fetch error:', fetchError);
      throw fetchError;
    }

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    if (card.locked) {
      return res.status(400).json({ error: 'Card is already locked' });
    }

    const { error: updateError } = await supabase
      .from('cards')
      .update({
        locked: true,
        updated_at: new Date().toISOString(),
      })
      .eq('public_id', public_id);

    if (updateError) {
      console.error('Supabase /lock-card update error:', updateError);
      throw updateError;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error in /lock-card:', err);
    res.status(500).json({ error: err.message });
  }
});

// SIMPLE STATS (kept for compatibility; public dashboard uses /public-metrics below)
app.get('/stats', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('cards').select('amount_fiat, refunded');

    if (error) {
      console.error('Supabase /stats error:', error);
      throw error;
    }

    let totalFunded = 0;
    let totalBurned = 0;

    for (const row of data || []) {
      const amt = row.amount_fiat || 0;
      totalFunded += amt;
      if (row.refunded) {
        totalBurned += amt;
      }
    }

    res.json({
      total_funded: totalFunded,
      total_burned: totalBurned,
    });
  } catch (err) {
    console.error('Error in /stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// MY CARDS (for UserDashboard)
app.get('/my-cards', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
    }

    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('creator_user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase /my-cards error:', error);
      throw error;
    }

    res.json(data || []);
  } catch (err) {
    console.error('Error in /my-cards:', err);
    res.status(500).json({ error: err.message });
  }
});

// CARD BALANCE (live Solana balance for deposit address)
app.get('/card-balance/:publicId', async (req, res) => {
  try {
    const publicId = req.params.publicId;

    const { data: card, error } = await supabase
      .from('cards')
      .select('deposit_address')
      .eq('public_id', publicId)
      .maybeSingle();

    if (error) {
      console.error('Supabase /card-balance error:', error);
      throw error;
    }

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    if (!card.deposit_address) {
      return res.status(400).json({ error: 'Card has no deposit address' });
    }

    const pubkey = new web3.PublicKey(card.deposit_address);
    const lamports = await solanaConnection.getBalance(pubkey);
    const sol = lamports / web3.LAMPORTS_PER_SOL;

    const solPriceUsd = await getSolPriceUsd();
    const amountUsd = solPriceUsd ? sol * solPriceUsd : null;

    res.json({
      deposit_address: card.deposit_address,
      lamports,
      sol,
      amount_usd: amountUsd,
      sol_price_usd: solPriceUsd,
      rpc: SOLANA_RPC_URL,
    });
  } catch (err) {
    console.error('Error in /card-balance:', err);
    res.status(500).json({ error: err.message });
  }
});

// SYNC CARD FUNDING: read on-chain balance and mark funded/token_amount/amount_fiat in DB
app.post('/sync-card-funding/:publicId', async (req, res) => {
  try {
    const publicId = req.params.publicId;

    const { data: card, error } = await supabase
      .from('cards')
      .select('deposit_address, funded, token_amount, currency, amount_fiat')
      .eq('public_id', publicId)
      .maybeSingle();

    if (error) {
      console.error('Supabase /sync-card-funding select error:', error);
      throw error;
    }

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    if (!card.deposit_address) {
      return res.status(400).json({ error: 'Card has no deposit address' });
    }

    const pubkey = new web3.PublicKey(card.deposit_address);
    const lamports = await solanaConnection.getBalance(pubkey);
    const sol = lamports / web3.LAMPORTS_PER_SOL;
    const solPriceUsd = await getSolPriceUsd();
    const amountUsd = solPriceUsd ? sol * solPriceUsd : null;

    const isFunded = lamports > 0;

    const { error: updateError } = await supabase
      .from('cards')
      .update({
        funded: isFunded,
        token_amount: sol,
        amount_fiat: amountUsd,
        updated_at: new Date().toISOString(),
      })
      .eq('public_id', publicId);

    if (updateError) {
      console.error('Supabase /sync-card-funding update error:', updateError);
      throw updateError;
    }

    res.json({
      public_id: publicId,
      deposit_address: card.deposit_address,
      lamports,
      sol,
      funded: isFunded,
      amount_usd: amountUsd,
      sol_price_usd: solPriceUsd,
    });
  } catch (err) {
    console.error('Error in /sync-card-funding:', err);
    res.status(500).json({ error: err.message });
  }
});

// CLAIM CARD: verify CVV + move SOL from deposit address to destination wallet
app.post('/claim-card', async (req, res) => {
  try {
    const { public_id, cvv, destination_wallet } = req.body || {};

    if (!public_id || !cvv || !destination_wallet) {
      return res.status(400).json({
        success: false,
        error: 'public_id, cvv, and destination_wallet are required',
      });
    }

    let destPubkey;
    try {
      destPubkey = new web3.PublicKey(destination_wallet);
    } catch (_e) {
      return res.status(400).json({
        success: false,
        error: 'Invalid destination wallet address',
      });
    }

    const { data: card, error } = await supabase
      .from('cards')
      .select('*')
      .eq('public_id', public_id)
      .maybeSingle();

    if (error) {
      console.error('Supabase /claim-card select error:', error);
      throw error;
    }

    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'Card not found',
      });
    }

    if (card.claimed) {
      return res.status(400).json({
        success: false,
        error: 'Card has already been claimed',
      });
    }

    if (card.refunded) {
      return res.status(400).json({
        success: false,
        error: 'Card has already been refunded',
      });
    }

    if (!card.locked) {
      return res.status(400).json({
        success: false,
        error: 'Card must be locked before claiming',
      });
    }

    if (!card.deposit_secret || !card.deposit_address) {
      return res.status(400).json({
        success: false,
        error: 'Card has no deposit wallet configured',
      });
    }

    // CVV check
    const providedHash = sha256(cvv);
    if (providedHash !== card.cvv_hash) {
      return res.status(400).json({
        success: false,
        error: 'Invalid CVV for this card',
      });
    }

    const depositKeypair = getDepositKeypairFromSecret(card.deposit_secret);
    const depositPubkey = depositKeypair.publicKey;

    if (depositPubkey.toBase58() !== card.deposit_address) {
      console.error('Deposit address mismatch for card', public_id);
      return res.status(400).json({
        success: false,
        error: 'Card deposit address mismatch',
      });
    }

    const lamports = await solanaConnection.getBalance(depositPubkey);
    if (lamports <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Card has no balance to claim',
      });
    }

    // Leave a small buffer for fees
    const feeBufferLamports = 5000;
    const lamportsToSend = lamports > feeBufferLamports ? lamports - feeBufferLamports : 0;

    if (lamportsToSend <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Balance is too low to claim after fees',
      });
    }

    const { blockhash, lastValidBlockHeight } = await solanaConnection.getLatestBlockhash(
      'finalized'
    );

    const tx = new web3.Transaction({
      feePayer: depositPubkey,
      recentBlockhash: blockhash,
    }).add(
      web3.SystemProgram.transfer({
        fromPubkey: depositPubkey,
        toPubkey: destPubkey,
        lamports: lamportsToSend,
      })
    );

    tx.sign(depositKeypair);

    const raw = tx.serialize();
    const signature = await solanaConnection.sendRawTransaction(raw, {
      skipPreflight: false,
    });

    await solanaConnection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed'
    );

    const solSent = lamportsToSend / web3.LAMPORTS_PER_SOL;
    const solPriceUsd = await getSolPriceUsd();
    const amountUsd = solPriceUsd ? solSent * solPriceUsd : null;

    const { error: updateError } = await supabase
      .from('cards')
      .update({
        claimed: true,
        funded: false,
        token_amount: solSent,
        amount_fiat: amountUsd,
        claimed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('public_id', public_id);

    if (updateError) {
      console.error('Supabase /claim-card update error:', updateError);
      throw updateError;
    }

    const maskedDest = maskIdentifier(destPubkey.toBase58());

    await notifyTelegram(
      [
        '*🎁 CRYPTOCARD Claimed*',
        '',
        `*Card ID:* \`${public_id}\``,
        `*Amount:* ${solSent.toFixed(6)} SOL`,
        `*USD:* ${amountUsd != null ? amountUsd.toFixed(2) : 'N/A'} USD`,
        `*To:* \`${maskedDest}\``,
        '',
        `[Solscan](https://solscan.io/tx/${signature})`,
      ].join('\n')
    );

    return res.json({
      success: true,
      signature,
      amount_sol: solSent,
      amount_usd: amountUsd,
      sol_price_usd: solPriceUsd,
      destination_wallet: destPubkey.toBase58(),
    });
  } catch (err) {
    console.error('Error in /claim-card:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
    });
  }
});

// PUBLIC METRICS FOR DASHBOARD
app.get('/public-metrics', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cards')
      .select('funded, claimed, token_amount, amount_fiat');

    if (error) {
      console.error('Supabase /public-metrics error:', error);
      throw error;
    }

    let totalCardsFunded = 0;
    let totalVolumeFundedSol = 0;
    let totalVolumeFundedUsd = 0;
    let totalVolumeClaimedSol = 0;
    let totalVolumeClaimedUsd = 0;

    for (const row of data || []) {
      const amountSol = row.token_amount || 0;
      const amountUsd = row.amount_fiat || 0;

      if (amountSol > 0 || amountUsd > 0 || row.funded || row.claimed) {
        totalCardsFunded += 1;
      }

      // treat token_amount as "funded/claimed amount" in SOL
      totalVolumeFundedSol += amountSol;
      totalVolumeFundedUsd += amountUsd;

      if (row.claimed) {
        totalVolumeClaimedSol += amountSol;
        totalVolumeClaimedUsd += amountUsd;
      }
    }

    const solPriceUsd = await getSolPriceUsd();

    // simple estimated protocol burn: 1.5% of total funded volume
    const estimatedProtocolTaxSol = totalVolumeFundedSol * 0.015;
    const estimatedProtocolTaxUsd =
      solPriceUsd && estimatedProtocolTaxSol ? estimatedProtocolTaxSol * solPriceUsd : 0;

    res.json({
      total_cards_funded: totalCardsFunded,
      total_volume_funded_sol: totalVolumeFundedSol,
      total_volume_funded_usd: totalVolumeFundedUsd,
      total_volume_claimed_sol: totalVolumeClaimedSol,
      total_volume_claimed_usd: totalVolumeClaimedUsd,
      estimated_protocol_tax_sol: estimatedProtocolTaxSol,
      estimated_protocol_tax_usd: estimatedProtocolTaxUsd,
      sol_price_usd: solPriceUsd,
      last_updated: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error in /public-metrics:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUBLIC ACTIVITY FEED
app.get('/public-activity', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10) || 50, 200);

    const { data, error } = await supabase
      .from('cards')
      .select(
        'public_id, created_at, updated_at, funded, locked, claimed, token_amount, amount_fiat, currency'
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase /public-activity error:', error);
      throw error;
    }

    res.json({
      items: data || [],
      count: (data || []).length,
    });
  } catch (err) {
    console.error('Error in /public-activity:', err);
    res.status(500).json({ error: err.message });
  }
});

// Fallback: serve SPA index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`CRYPTOCARDS backend listening on port ${PORT}`);
});
