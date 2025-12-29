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

// Helius used for SOL price
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '';

// SOL RPC (can be Helius mainnet URL or default cluster API)
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || web3.clusterApiUrl('mainnet-beta');

// Fallback SOL price + simple 1-minute cache
const FALLBACK_SOL_PRICE_USD = 130;
const SOL_PRICE_TTL_MS = 60_000; // 1 minute
let cachedSolPriceUsd = null;
let cachedSolPriceUpdatedAt = 0;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const solanaConnection = new web3.Connection(SOLANA_RPC_URL, 'confirmed');

// --- Express setup ---

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend from dist
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// ----------------------
// Utility helpers
// ----------------------

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

/**
 * Fetch current SOL→USD price using Helius `getAssetBatch` on WSOL mint.
 * - Caches results for 60 seconds
 * - Falls back to last good value, then to FALLBACK_SOL_PRICE_USD
 */
async function getSolPriceUsd() {
  const now = Date.now();

  // Use fresh cache if available
  if (
    cachedSolPriceUsd !== null &&
    now - cachedSolPriceUpdatedAt < SOL_PRICE_TTL_MS
  ) {
    return cachedSolPriceUsd;
  }

  let lastError = null;

  // 1) Try Helius if configured
  if (HELIUS_API_KEY) {
    try {
      const fetch = (await import('node-fetch')).default;

      const resp = await fetch(
        `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'sol-price',
            method: 'getAssetBatch',
            params: {
              // Wrapped SOL mint
              ids: ['So11111111111111111111111111111111111111112'],
            },
          }),
        }
      );

      if (!resp.ok) {
        throw new Error(`Helius HTTP ${resp.status}`);
      }

      const json = await resp.json();
      const asset = json?.result?.[0];
      const priceInfo = asset?.token_info?.price_info;
      const price = priceInfo?.price_per_token;

      if (typeof price === 'number' && price > 0) {
        cachedSolPriceUsd = price;
        cachedSolPriceUpdatedAt = now;
        return price;
      } else {
        lastError = new Error('Helius missing price_per_token');
        console.warn(
          'getSolPriceUsd: Helius response missing valid price_per_token',
          JSON.stringify(json)
        );
      }
    } catch (err) {
      lastError = err;
      console.warn('getSolPriceUsd: Helius error', err);
    }
  }

  // 2) Fallback: use cached value or constant
  const fallback =
    cachedSolPriceUsd !== null ? cachedSolPriceUsd : FALLBACK_SOL_PRICE_USD;

  console.warn(
    'getSolPriceUsd: providers failed, using cached value',
    fallback,
    'Last error:',
    lastError ? lastError.message || String(lastError) : 'none'
  );

  cachedSolPriceUsd = fallback;
  cachedSolPriceUpdatedAt = now;
  return fallback;
}

/**
 * Helper: get authenticated Supabase user from Authorization header.
 * - Silences noisy "bad_jwt / token expired" logs
 */
async function getUserFromRequest(req) {
  const authHeader = req.headers['authorization'] || '';
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;
  const token = parts[1];
  if (!token) return null;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      // Supabase uses 403 / "bad_jwt" for expired / invalid tokens.
      // We don't want to spam logs for that case.
      if (error.code === 'bad_jwt' || error.status === 403) {
        return null;
      }

      console.error('getUserFromRequest error:', error);
      return null;
    }
    return data.user || null;
  } catch (err) {
    console.error('getUserFromRequest exception:', err);
    return null;
  }
}

// ----------------------
// AUTH ROUTES
// ----------------------

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

    const { data: existingUsers, error: existingError } =
      await supabase.auth.admin.listUsers({
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
        const metaUsername =
          u.user_metadata?.username || u.email?.split('@')[0];
        return (
          metaUsername &&
          metaUsername.toLowerCase() === trimmedUsername.toLowerCase()
        );
      }) || false;

    if (usernameTaken) {
      return res.status(400).json({
        success: false,
        error: 'Username is already taken. Please choose a different one.',
      });
    }

    const redirectTo = FRONTEND_URL
      ? `${FRONTEND_URL.replace(/\/+$/, '')}/`
      : undefined;

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

      const { data, error: createError } = await supabase.auth.admin.createUser(
        {
          email: syntheticEmail,
          password,
          email_confirm: true,
          user_metadata: {
            username: trimmedUsername,
            notification_email: null,
          },
        }
      );

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
      `🆕 New user registered\n\nUsername: \`${trimmedUsername}\`\nEmail: \`${
        email || 'N/A'
      }\``
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

    const { data: usersPage, error: listError } =
      await supabase.auth.admin.listUsers({
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
        return (
          typeof uname === 'string' &&
          uname.toLowerCase() === identifier.toLowerCase()
        );
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
      if (
        msg.toLowerCase().includes('confirm') &&
        msg.toLowerCase().includes('email')
      ) {
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
      console.error(
        'Error in /auth/email-change-complete getUserById:',
        error
      );
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

    const { data: updateData, error: updateError } =
      await supabase.auth.admin.updateUserById(user_id, {
        user_metadata: newMeta,
      });

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

// ----------------------
// CARD + STATS ROUTES
// ----------------------

// SIMPLE SOL PRICE ENDPOINT for frontend
app.get('/sol-price', async (_req, res) => {
  try {
    const priceUsd = await getSolPriceUsd();
    res.json({ price_usd: priceUsd });
  } catch (err) {
    console.error('Error in /sol-price:', err);
    res.status(500).json({ error: 'Failed to fetch SOL price' });
  }
});

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

    const { error: insertError } = await supabase
      .from('cards')
      .insert(insertPayload);

    if (insertError) {
      console.error('Supabase insert error /create-card:', insertError);
      throw insertError;
    }

    const creatorLabel = user
      ? maskIdentifier(user.email || user.id)
      : 'anonymous';

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
    res.status(500).json({ error: err.message || 'Internal server error' });
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
    res.status(500).json({ error: err.message || 'Internal server error' });
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
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// SIMPLE STATS (used by some dashboards)
app.get('/stats', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('cards')
      .select('amount_fiat, refunded');

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
    res.status(500).json({ error: err.message || 'Internal server error' });
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
    res.status(500).json({ error: err.message || 'Internal server error' });
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

    res.json({
      deposit_address: card.deposit_address,
      lamports,
      sol,
      rpc: SOLANA_RPC_URL,
    });
  } catch (err) {
    console.error('Error in /card-balance:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// SYNC CARD FUNDING: read on-chain balance and mark funded/token_amount in DB
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

    const isFunded = lamports > 0;

    const { error: updateError } = await supabase
      .from('cards')
      .update({
        funded: isFunded,
        token_amount: sol,
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
    });
  } catch (err) {
    console.error('Error in /sync-card-funding:', err);
    res
      .status(500)
      .json({ error: err.message || 'Internal server error' });
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
    const lamportsToSend =
      lamports > feeBufferLamports ? lamports - feeBufferLamports : 0;

    if (lamportsToSend <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Balance is too low to claim after fees',
      });
    }

    const { blockhash, lastValidBlockHeight } =
      await solanaConnection.getLatestBlockhash('finalized');

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

    const { error: updateError } = await supabase
      .from('cards')
      .update({
        claimed: true,
        funded: false,
        token_amount: solSent,
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
        `*To:* \`${maskedDest}\``,
        '',
        `[Solscan](https://solscan.io/tx/${signature})`,
      ].join('\n')
    );

    return res.json({
      success: true,
      signature,
      amount_sol: solSent,
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

// ----------------------
// SPA fallback
// ----------------------

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`CRYPTOCARDS backend listening on port ${PORT}`);
});
