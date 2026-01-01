// backend.cjs
// CRYPTOCARDS backend + static frontend server (CommonJS)

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');

// --- Env + config ---

const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://cryptocards.fun';

// Optional: public burn wallet for dashboard
const BURN_WALLET =
  process.env.BURN_WALLET ||
  'A3mpAVduHM9QyRgH1NSZp5ANnbPr2Z5vkXtc8EgDaZBF';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Solana connection (for real deposit addresses / balances)
const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL || web3.clusterApiUrl('mainnet-beta');
const solanaConnection = new web3.Connection(SOLANA_RPC_URL, 'confirmed');

// Mint + program IDs
const SOL_MINT_ADDRESS = 'So11111111111111111111111111111111111111112';

const TOKEN_PROGRAM_ID = new web3.PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
);

const TOKEN_2022_PROGRAM_ID = new web3.PublicKey(
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
);

// --- SOL price helpers (multi-provider + cache) ---

const FALLBACK_SOL_PRICE_USD = 130;
// cache TTL: 2 minutes
const SOL_PRICE_TTL_MS = 120_000;

let lastSolPriceUsd = null;
let lastSolPriceFetchedAt = 0;

/**
 * Get SOL price in USD with multiple providers + 2 min in-memory cache.
 * Providers:
 * - Binance
 * - CryptoCompare
 * - CoinPaprika
 * - Coingecko
 */
async function getSolPriceUsd() {
  const now = Date.now();
  if (lastSolPriceUsd && now - lastSolPriceFetchedAt < SOL_PRICE_TTL_MS) {
    console.log('getSolPriceUsd: using cached value =', lastSolPriceUsd);
    return lastSolPriceUsd;
  }

  const fetch = (await import('node-fetch')).default;
  let lastError = null;

  // Binance
  async function fromBinance() {
    const url =
      'https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT';
    const res = await fetch(url);
    if (!res.ok) {
      console.error(
        'getSolPriceUsd error: binance status',
        res.status
      );
      throw new Error(`binance status ${res.status}`);
    }
    const body = await res.json();
    const price = parseFloat(body?.price);
    if (!price || !Number.isFinite(price)) {
      throw new Error('binance missing or invalid price');
    }
    return price;
  }

  // CryptoCompare
  async function fromCryptoCompare() {
    const url =
      'https://min-api.cryptocompare.com/data/price?fsym=SOL&tsyms=USD';
    const res = await fetch(url);
    if (!res.ok) {
      console.error(
        'getSolPriceUsd error: cryptocompare status',
        res.status
      );
      throw new Error(`cryptocompare status ${res.status}`);
    }
    const body = await res.json();
    const price = body?.USD;
    if (typeof price !== 'number' || !Number.isFinite(price)) {
      throw new Error('cryptocompare missing or invalid price');
    }
    return price;
  }

  // CoinPaprika
  async function fromCoinPaprika() {
    const url =
      'https://api.coinpaprika.com/v1/tickers/sol-solana';
    const res = await fetch(url);
    if (!res.ok) {
      console.error(
        'getSolPriceUsd error: coinpaprika status',
        res.status
      );
      throw new Error(`coinpaprika status ${res.status}`);
    }
    const body = await res.json();
    const price = body?.quotes?.USD?.price;
    if (typeof price !== 'number' || !Number.isFinite(price)) {
      throw new Error('coinpaprika missing or invalid price');
    }
    return price;
  }

  // Coingecko (last resort)
  async function fromCoingecko() {
    const url =
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';
    const res = await fetch(url);
    if (!res.ok) {
      console.error(
        'getSolPriceUsd error: coingecko status',
        res.status
      );
      throw new Error(`coingecko status ${res.status}`);
    }
    const body = await res.json();
    const price = body?.solana?.usd;
    if (typeof price !== 'number' || !Number.isFinite(price)) {
      throw new Error('coingecko missing or invalid price');
    }
    return price;
  }

  const providers = [
    fromBinance,
    fromCryptoCompare,
    fromCoinPaprika,
    fromCoingecko,
  ];

  for (const provider of providers) {
    try {
      const price = await provider();
      if (price && price > 0 && Number.isFinite(price)) {
        lastSolPriceUsd = price;
        lastSolPriceFetchedAt = now;
        console.log('getSolPriceUsd: fresh price =', price);
        return price;
      }
    } catch (err) {
      lastError = err;
      console.error(
        'getSolPriceUsd provider failed:',
        err.message || err
      );
    }
  }

  if (lastSolPriceUsd) {
    console.warn(
      'getSolPriceUsd: providers failed, using cached value =',
      lastSolPriceUsd,
      'Last error:',
      lastError && (lastError.message || lastError)
    );
    return lastSolPriceUsd;
  }

  console.warn(
    'getSolPriceUsd: providers failed, using fallback =',
    FALLBACK_SOL_PRICE_USD,
    'Last error:',
    lastError && (lastError.message || lastError)
  );
  lastSolPriceUsd = FALLBACK_SOL_PRICE_USD;
  lastSolPriceFetchedAt = now;
  return lastSolPriceUsd;
}

/**
 * Get token price in **USD** using Jupiter Price API v3 (lite-api).
 * Returns null if price can't be determined.
 */
async function getTokenPriceUsd(mintAddress) {
  try {
    const fetch = (await import('node-fetch')).default;
    const url = `https://lite-api.jup.ag/price/v3?ids=${encodeURIComponent(
      mintAddress
    )}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error('getTokenPriceUsd error: status', res.status);
      return null;
    }
    const body = await res.json();
    const entry = body?.[mintAddress];
    const price = entry?.usdPrice;
    if (
      typeof price === 'number' &&
      Number.isFinite(price) &&
      price > 0
    ) {
      return price;
    }
    return null;
  } catch (err) {
    console.error(
      'getTokenPriceUsd exception:',
      err.message || err
    );
    return null;
  }
}

/**
 * Enumerate SPL token accounts (classic + Token-2022) for an owner
 * and estimate their value in SOL **and** USD via Jupiter Price v3.
 */
async function getTokenAccountsWithSolValue(ownerPubkey) {
  try {
    const parsedClassic =
      await solanaConnection.getParsedTokenAccountsByOwner(
        ownerPubkey,
        {
          programId: TOKEN_PROGRAM_ID,
        }
      );

    let parsed2022 = { value: [] };
    try {
      parsed2022 =
        await solanaConnection.getParsedTokenAccountsByOwner(
          ownerPubkey,
          {
            programId: TOKEN_2022_PROGRAM_ID,
          }
        );
    } catch (err) {
      console.error(
        'getTokenAccountsWithSolValue Token-2022 lookup failed:',
        err.message || err
      );
    }

    const combined = [
      ...(parsedClassic?.value || []),
      ...(parsed2022?.value || []),
    ];

    const tokens = [];
    const priceCache = {};
    let totalValueUsd = 0;

    // Reference SOL/USD price for converting token USD -> SOL
    const solPriceUsdRaw = await getSolPriceUsd();
    const solPriceUsd =
      typeof solPriceUsdRaw === 'number' && solPriceUsdRaw > 0
        ? solPriceUsdRaw
        : FALLBACK_SOL_PRICE_USD;

    for (const entry of combined) {
      const acc = entry?.account;
      const parsedData = acc?.data?.parsed;
      const info = parsedData?.info;
      const mint = info?.mint;
      const tokenAmount = info?.tokenAmount;

      if (!mint || !tokenAmount) continue;

      const amountRawStr = tokenAmount.amount;
      const decimals = Number(tokenAmount.decimals || 0);
      const uiAmount = Number(tokenAmount.uiAmount || 0);

      if (!amountRawStr || uiAmount <= 0) continue;

      let priceUsd = priceCache[mint];
      if (priceUsd === undefined) {
        priceUsd = await getTokenPriceUsd(mint);
        priceCache[mint] = priceUsd;
      }

      let valueUsd = null;
      if (priceUsd && priceUsd > 0) {
        valueUsd = uiAmount * priceUsd;
        totalValueUsd += valueUsd;
      }

      tokens.push({
        mint,
        amount_raw: amountRawStr,
        amount_ui: uiAmount,
        decimals,
        price_usd_per_token: priceUsd,
        total_value_usd: valueUsd,
      });
    }

    const totalValueSol =
      solPriceUsd > 0 ? totalValueUsd / solPriceUsd : 0;

    return {
      owner: ownerPubkey.toBase58(),
      tokens,
      total_value_sol: totalValueSol,
      total_value_usd: totalValueUsd,
      sol_price_usd: solPriceUsd,
    };
  } catch (err) {
    console.error(
      'getTokenAccountsWithSolValue exception:',
      err.message || err
    );
    return {
      owner: ownerPubkey.toBase58(),
      tokens: [],
      total_value_sol: 0,
      total_value_usd: 0,
      sol_price_usd: FALLBACK_SOL_PRICE_USD,
    };
  }
}

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

// Solana-style deposit address derived from secret
function generateDepositAddress(secret) {
  const seed = crypto
    .createHash('sha256')
    .update(String(secret))
    .digest()
    .subarray(0, 32);
  const keypair = web3.Keypair.fromSeed(seed);
  return keypair.publicKey.toBase58();
}

// Re-create full keypair for a deposit address (for CLAIM / LOCK)
function getDepositKeypairFromSecret(secret) {
  const seed = crypto
    .createHash('sha256')
    .update(String(secret))
    .digest()
    .subarray(0, 32);
  return web3.Keypair.fromSeed(seed);
}

function generateCVV() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

function maskIdentifier(value) {
  if (!value || typeof value !== 'string') return null;
  if (value.length <= 2) return value[0] + '*';
  return (
    value.slice(0, 2) +
    '*'.repeat(Math.max(1, value.length - 4)) +
    value.slice(-2)
  );
}

async function notifyTelegram(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return;
  }

  try {
    const fetch = (await import('node-fetch')).default;
    await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      }
    );
  } catch (err) {
    console.error('Failed to send Telegram notification:', err);
  }
}

async function getUserFromRequest(req) {
  const authHeader = req.headers['authorization'] || '';
  const parts = authHeader.split(' ');
  if (
    parts.length !== 2 ||
    parts[0].toLowerCase() !== 'bearer'
  )
    return null;
  const token = parts[1];
  if (!token) return null;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      // Avoid spamming logs on expired JWTs; just return null
      if (
        !error.message
          ?.toLowerCase?.()
          .includes('token is expired')
      ) {
        console.error('getUserFromRequest error:', error);
      }
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
    if (
      !/^[a-zA-Z0-9_\-]{3,20}$/.test(trimmedUsername)
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Username must be 3-20 characters and contain only letters, numbers, underscores, or dashes.',
      });
    }

    const {
      data: existingUsers,
      error: existingError,
    } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (existingError) {
      console.error(
        'Error in /auth/register listUsers:',
        existingError
      );
      return res.status(500).json({
        success: false,
        error: 'Failed to check existing users',
      });
    }

    const usernameTaken =
      existingUsers?.users?.some((u) => {
        const metaUsername =
          u.user_metadata?.username ||
          (u.email && u.email.split('@')[0]);
        return (
          metaUsername &&
          metaUsername.toLowerCase() ===
            trimmedUsername.toLowerCase()
        );
      }) || false;

    if (usernameTaken) {
      return res.status(400).json({
        success: false,
        error:
          'Username is already taken. Please choose a different one.',
      });
    }

    const redirectTo = FRONTEND_URL
      ? `${FRONTEND_URL.replace(
          /\/+$/,
          ''
        )}/`
      : undefined;

    let user = null;
    let error = null;

    if (
      email &&
      typeof email === 'string' &&
      email.includes('@')
    ) {
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

      const { data, error: createError } =
        await supabase.auth.admin.createUser({
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
    res
      .status(500)
      .json({ success: false, error: 'Internal server error' });
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

    const {
      data: usersPage,
      error: listError,
    } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      console.error(
        'Error in /auth/login listUsers:',
        listError
      );
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
          uname.toLowerCase() ===
            identifier.toLowerCase()
        );
      }) || null;

    if (!matchedUser || !matchedUser.email) {
      return res
        .status(401)
        .json({ success: false, error: 'Invalid credentials' });
    }

    const signIn =
      await supabase.auth.signInWithPassword({
        email: matchedUser.email,
        password,
      });

    if (
      signIn.error ||
      !signIn.data?.user ||
      !signIn.data?.session
    ) {
      const msg = signIn.error?.message || '';
      if (
        msg
          .toLowerCase()
          .includes('confirm') &&
        msg.toLowerCase().includes('email')
      ) {
        return res.status(403).json({
          success: false,
          error:
            'Please confirm your email before logging in.',
        });
      }

      return res.status(401).json({
        success: false,
        error:
          signIn.error?.message || 'Invalid credentials',
      });
    }

    const { user, session } = signIn.data;
    const token = session.access_token;
    const refreshToken = session.refresh_token;

    const responseUser = {
      id: user.id,
      username:
        user.user_metadata?.username ||
        matchedUser.email.split('@')[0],
      email:
        user.user_metadata?.notification_email ||
        matchedUser.email,
    };

    res.json({
      success: true,
      token,
      refreshToken,
      user: responseUser,
    });
  } catch (err) {
    console.error('Exception in /auth/login:', err);
    res
      .status(500)
      .json({ success: false, error: 'Internal server error' });
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
    res
      .status(500)
      .json({ success: false, error: 'Internal server error' });
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

    const { data, error } =
      await supabase.auth.admin.updateUserById(
        user.id,
        {
          user_metadata: {
            ...(user.user_metadata || {}),
            notification_email: newEmail,
          },
        }
      );

    if (error) {
      console.error('Error in /auth/update-email:', error);
      return res.status(400).json({
        success: false,
        error:
          error.message || 'Failed to update email',
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
    console.error(
      'Exception in /auth/update-email:',
      err
    );
    res
      .status(500)
      .json({ success: false, error: 'Internal server error' });
  }
});

// EMAIL CHANGE COMPLETE WEBHOOK (secure change)
app.post('/auth/email-change-complete', async (req, res) => {
  try {
    const { user_id, new_email } = req.body || {};
    if (!user_id || !new_email) {
      return res.status(400).json({
        success: false,
        error:
          'user_id and new_email are required',
      });
    }

    const { data, error } =
      await supabase.auth.admin.getUserById(user_id);

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

    const {
      data: updateData,
      error: updateError,
    } = await supabase.auth.admin.updateUserById(
      user_id,
      {
        user_metadata: newMeta,
      }
    );

    if (updateError) {
      console.error(
        'Error in /auth/email-change-complete update:',
        updateError
      );
      return res.status(400).json({
        success: false,
        error:
          updateError.message ||
          'Failed to finalize email change',
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
    console.error(
      'Exception in /auth/email-change-complete:',
      err
    );
    res
      .status(500)
      .json({ success: false, error: 'Internal server error' });
  }
});

// FORGOT PASSWORD -> Supabase reset email
app.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (
      !email ||
      typeof email !== 'string' ||
      !email.includes('@')
    ) {
      return res.status(400).json({
        success: false,
        error: 'Valid email is required',
      });
    }

    const redirectTo = FRONTEND_URL
      ? `${FRONTEND_URL.replace(
          /\/+$/,
          ''
        )}/reset-password`
      : undefined;

    const { error } =
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

    if (error) {
      console.error(
        'Error in /auth/forgot-password:',
        error
      );
      return res.status(400).json({
        success: false,
        error:
          error.message ||
          'Failed to send reset email',
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(
      'Exception in /auth/forgot-password:',
      err
    );
    res
      .status(500)
      .json({ success: false, error: 'Internal server error' });
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
        error:
          'message, currency, and template_url are required',
      });
    }

    const public_id = generatePublicId();
    const cvv = generateCVV();
    const deposit_secret = generateDepositSecret();
    const deposit_address =
      generateDepositAddress(deposit_secret);
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
      console.error(
        'Supabase insert error /create-card:',
        insertError
      );
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
      amount_fiat != null
        ? `*Fiat Amount:* ${amount_fiat}`
        : null,
    ].filter(Boolean);

    await notifyTelegram(tgLines.join('\n'));

    res.json({
      public_id,
      cvv,
      deposit_address,
    });
  } catch (err) {
    console.error('Error in /create-card:', err);
    res
      .status(500)
      .json({ error: err.message });
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
      console.error(
        'Supabase /card-status error:',
        error
      );
      throw error;
    }

    if (!data) {
      return res
        .status(404)
        .json({ error: 'Card not found' });
    }

    res.json(data);
  } catch (err) {
    console.error('Error in /card-status:', err);
    res
      .status(500)
      .json({ error: err.message });
  }
});

// LOCK CARD (logical lock + protocol SOL tax on lock + burn tracking, always attempt)
app.post('/lock-card', async (req, res) => {
  try {
    const { public_id } = req.body || {};
    if (!public_id) {
      return res
        .status(400)
        .json({ error: 'public_id is required' });
    }

    const { data: card, error: fetchError } =
      await supabase
        .from('cards')
        .select('*')
        .eq('public_id', public_id)
        .maybeSingle();

    if (fetchError) {
      console.error(
        'Supabase /lock-card fetch error:',
        fetchError
      );
      throw fetchError;
    }

    if (!card) {
      return res
        .status(404)
        .json({ error: 'Card not found' });
    }

    if (card.locked) {
      return res
        .status(400)
        .json({ error: 'Card is already locked' });
    }

    // Attempt protocol tax on lock (1.5% of current SOL balance, always attempt if > 0)
    try {
      if (card.deposit_secret && card.deposit_address) {
        const depositKeypair =
          getDepositKeypairFromSecret(
            card.deposit_secret
          );
        const depositPubkey =
          depositKeypair.publicKey;

        if (
          depositPubkey.toBase58() ===
          card.deposit_address
        ) {
          const lamports =
            await solanaConnection.getBalance(
              depositPubkey
            );

          if (lamports > 0) {
            let burnLamports = Math.floor(
              lamports * 0.015
            );
            if (burnLamports <= 0) {
              burnLamports = 1; // force at least 1 lamport attempt for tiny balances
            }

            const {
              blockhash,
              lastValidBlockHeight,
            } =
              await solanaConnection.getLatestBlockhash(
                'finalized'
              );

            const burnTx = new web3.Transaction({
              feePayer: depositPubkey,
              recentBlockhash: blockhash,
            }).add(
              web3.SystemProgram.transfer({
                fromPubkey: depositPubkey,
                toPubkey: new web3.PublicKey(
                  BURN_WALLET
                ),
                lamports: burnLamports,
              })
            );

            burnTx.sign(depositKeypair);

            const raw = burnTx.serialize();
            const signature =
              await solanaConnection.sendRawTransaction(
                raw,
                {
                  skipPreflight: false,
                }
              );

            await solanaConnection.confirmTransaction(
              {
                signature,
                blockhash,
                lastValidBlockHeight,
              },
              'confirmed'
            );

            const burnSol =
              burnLamports / web3.LAMPORTS_PER_SOL;

            console.log(
              `Protocol tax on lock applied for card ${public_id}:`,
              burnSol,
              'SOL'
            );

            // Record burn event in card_burns (if table exists)
            try {
              const { error: burnInsertError } =
                await supabase
                  .from('card_burns')
                  .insert({
                    card_public_id: public_id,
                    burn_lamports: burnLamports,
                    burn_sol: burnSol,
                    tx_signature: signature,
                    burn_wallet: BURN_WALLET,
                    created_at:
                      new Date().toISOString(),
                  });

              if (burnInsertError) {
                console.error(
                  'Supabase card_burns insert error in /lock-card:',
                  burnInsertError
                );
              }
            } catch (insertErr) {
              console.error(
                'Exception inserting into card_burns in /lock-card:',
                insertErr
              );
            }
          }
        } else {
          console.error(
            'Deposit address mismatch in /lock-card protocol tax for card',
            public_id
          );
        }
      }
    } catch (taxErr) {
      console.error(
        'Error applying protocol tax in /lock-card:',
        taxErr
      );
    }

    const { error: updateError } = await supabase
      .from('cards')
      .update({
        locked: true,
        updated_at: new Date().toISOString(),
      })
      .eq('public_id', public_id);

    if (updateError) {
      console.error(
        'Supabase /lock-card update error:',
        updateError
      );
      throw updateError;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error in /lock-card:', err);
    res
      .status(500)
      .json({ error: err.message });
  }
});

// SIMPLE STATS (legacy)
app.get('/stats', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('cards')
      .select('amount_fiat, refunded');

    if (error) {
      console.error(
        'Supabase /stats error:',
        error
      );
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
    res
      .status(500)
      .json({ error: err.message });
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
      console.error(
        'Supabase /my-cards error:',
        error
      );
      throw error;
    }

    res.json(data || []);
  } catch (err) {
    console.error('Error in /my-cards:', err);
    res
      .status(500)
      .json({ error: err.message });
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
      console.error(
        'Supabase /card-balance error:',
        error
      );
      throw error;
    }

    if (!card) {
      return res
        .status(404)
        .json({ error: 'Card not found' });
    }

    if (!card.deposit_address) {
      return res
        .status(400)
        .json({ error: 'Card has no deposit address' });
    }

    const pubkey = new web3.PublicKey(
      card.deposit_address
    );
    const lamports = await solanaConnection.getBalance(
      pubkey
    );
    const sol = lamports / web3.LAMPORTS_PER_SOL;

    res.json({
      deposit_address: card.deposit_address,
      lamports,
      sol,
      rpc: SOLANA_RPC_URL,
    });
  } catch (err) {
    console.error('Error in /card-balance:', err);
    res
      .status(500)
      .json({ error: err.message });
  }
});

// CARD TOKEN VALUE (SPL tokens + estimated SOL value)
app.get('/card-token-value/:publicId', async (req, res) => {
  try {
    const publicId = req.params.publicId;

    const { data: card, error } = await supabase
      .from('cards')
      .select('deposit_address')
      .eq('public_id', publicId)
      .maybeSingle();

    if (error) {
      console.error(
        'Supabase /card-token-value select error:',
        error
      );
      throw error;
    }

    if (!card) {
      return res
        .status(404)
        .json({ error: 'Card not found' });
    }

    if (!card.deposit_address) {
      return res
        .status(400)
        .json({ error: 'Card has no deposit address' });
    }

    const ownerPubkey = new web3.PublicKey(
      card.deposit_address
    );
    const result =
      await getTokenAccountsWithSolValue(ownerPubkey);

    res.json({
      public_id: publicId,
      deposit_address: card.deposit_address,
      ...result,
    });
  } catch (err) {
    console.error(
      'Error in /card-token-value:',
      err
    );
    res
      .status(500)
      .json({ error: err.message });
  }
});

// SYNC CARD FUNDING: SOL + SPL tokens -> total value in SOL
app.post('/sync-card-funding/:publicId', async (req, res) => {
  try {
    const publicId = req.params.publicId;

    const { data: card, error } = await supabase
      .from('cards')
      .select(
        'deposit_address, funded, locked, token_amount, currency, amount_fiat'
      )
      .eq('public_id', publicId)
      .maybeSingle();

    if (error) {
      console.error(
        'Supabase /sync-card-funding select error:',
        error
      );
      throw error;
    }

    if (!card) {
      return res
        .status(404)
        .json({ error: 'Card not found' });
    }

    if (!card.deposit_address) {
      return res
        .status(400)
        .json({ error: 'Card has no deposit address' });
    }

    const pubkey = new web3.PublicKey(
      card.deposit_address
    );

    // Native SOL balance
    const lamports = await solanaConnection.getBalance(
      pubkey
    );
    const solNative = lamports / web3.LAMPORTS_PER_SOL;

    // SPL token balances + value in SOL
    const tokenValueResult =
      await getTokenAccountsWithSolValue(pubkey);
    const tokensValueSol =
      tokenValueResult.total_value_sol || 0;

    // Total value in SOL (native + priced SPL tokens)
    const totalSolValue = solNative + tokensValueSol;

    // Consider card funded if:
    // - has any native SOL, OR
    // - has any SPL token accounts at all (even if we can't price them yet)
    const hasAnyTokens =
      Array.isArray(tokenValueResult.tokens) &&
      tokenValueResult.tokens.length > 0;
    const isFunded = lamports > 0 || hasAnyTokens;

    const { error: updateError } = await supabase
      .from('cards')
      .update({
        funded: isFunded,
        token_amount: totalSolValue,
        updated_at: new Date().toISOString(),
      })
      .eq('public_id', publicId);

    if (updateError) {
      console.error(
        'Supabase /sync-card-funding update error:',
        updateError
      );
      throw updateError;
    }

    // IMPORTANT: return "sol" for existing frontend logic, plus richer fields
    res.json({
      public_id: publicId,
      deposit_address: card.deposit_address,
      lamports,
      sol: totalSolValue, // total value in SOL (SOL + priced SPL)
      sol_native: solNative,
      tokens_total_value_sol: tokensValueSol,
      total_value_sol: totalSolValue,
      funded: isFunded,
      locked: !!card.locked,
      hasDeposit: !!card.deposit_address,
      token_portfolio: tokenValueResult, // debug + UI info
    });
  } catch (err) {
    console.error(
      'Error in /sync-card-funding:',
      err
    );
    res
      .status(500)
      .json({ error: err.message });
  }
});

// CLAIM CARD: verify CVV + move SOL + SPL tokens from deposit address to destination wallet
// - Supports SOL-only cards
// - Supports SPL token cards (CRYPTOCARDS / WhiteWhale / any mint)
// - Uses protocol fee wallet (FEE_WALLET_SECRET) as fee payer when available
app.post('/claim-card', async (req, res) => {
  try {
    const { public_id, cvv, destination_wallet } = req.body || {};

    if (!public_id || !cvv || !destination_wallet) {
      return res.status(400).json({
        success: false,
        error: 'public_id, cvv, and destination_wallet are required',
      });
    }

    // 1) Load card
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('*')
      .eq('public_id', public_id)
      .maybeSingle();

    if (cardError || !card) {
      console.error('Claim /card not found', cardError);
      return res.status(404).json({
        success: false,
        error: 'CRYPTOCARD not found',
      });
    }

    if (card.claimed) {
      return res.status(400).json({
        success: false,
        error: 'This CRYPTOCARD has already been claimed',
      });
    }

    if (!card.locked) {
      return res.status(400).json({
        success: false,
        error: 'This CRYPTOCARD must be locked before claiming',
      });
    }

    if (!card.deposit_secret) {
      return res.status(500).json({
        success: false,
        error: 'Card is missing deposit_secret (cannot derive deposit wallet)',
      });
    }

    // 2) CVV check
    const expectedHash = card.cvv_hash;
    const providedHash = sha256(cvv.trim());
    if (!expectedHash || providedHash !== expectedHash) {
      return res.status(401).json({
        success: false,
        error: 'Invalid CVV for this CRYPTOCARD',
      });
    }

    // 3) Destination wallet
    let destPubkey;
    try {
      destPubkey = new web3.PublicKey(destination_wallet.trim());
    } catch {
      return res.status(400).json({
        success: false,
        error: 'destination_wallet is not a valid Solana address',
      });
    }

    // 4) Derive the deposit keypair from deposit_secret
    const depositKeypair = getDepositKeypairFromSecret(card.deposit_secret);
    const depositPubkey = depositKeypair.publicKey;

    // 5) Try to build a fee-payer wallet from FEE_WALLET_SECRET
    //    - Must be a JSON array of 64 bytes (Solana secret key)
    let feePayerKeypair = null;
    const FEE_SECRET = process.env.FEE_WALLET_SECRET || '';

    if (FEE_SECRET) {
      try {
        const raw = JSON.parse(FEE_SECRET);
        if (Array.isArray(raw)) {
          const secretKey = Uint8Array.from(raw);
          feePayerKeypair = web3.Keypair.fromSecretKey(secretKey);
          console.log(
            '[CRYPTOCARDS] Fee wallet for claims:',
            feePayerKeypair.publicKey.toBase58()
          );
        } else {
          console.error(
            '[CRYPTOCARDS] FEE_WALLET_SECRET must be a JSON array of numbers'
          );
        }
      } catch (err) {
        console.error(
          '[CRYPTOCARDS] Failed to parse FEE_WALLET_SECRET JSON:',
          err
        );
      }
    } else {
      console.warn(
        '[CRYPTOCARDS] No FEE_WALLET_SECRET set; claim tx fees will be paid by the card deposit address'
      );
    }

    // 6) Read on-chain balances at deposit address

    // SOL balance
    const lamports = await solanaConnection.getBalance(depositPubkey, 'confirmed');
    const solBalance = lamports / web3.LAMPORTS_PER_SOL;

    // SPL token balances for this card's mint (if any)
    const tokenMintStr = card.token_mint || null;
    let totalTokenRaw = 0n;
    let totalTokenUi = 0;
    const tokenAccounts = [];

    if (tokenMintStr) {
      const mintKey = new web3.PublicKey(tokenMintStr);

      // Query both classic Token program and Token-2022
      const [classic, v2022] = await Promise.all([
        solanaConnection.getParsedTokenAccountsByOwner(depositPubkey, {
          programId: splToken.TOKEN_PROGRAM_ID,
        }),
        solanaConnection
          .getParsedTokenAccountsByOwner(depositPubkey, {
            programId: splToken.TOKEN_2022_PROGRAM_ID,
          })
          .catch((err) => {
            console.warn(
              '[CRYPTOCARDS] Token-2022 accounts lookup failed (safe to ignore if mint is classic):',
              err
            );
            return { value: [] };
          }),
      ]);

      const allParsed = [...(classic.value || []), ...(v2022.value || [])];

      for (const entry of allParsed) {
        const ownerProgram = entry.account.owner;
        const parsed = entry.account.data?.parsed;
        const info = parsed?.info;
        if (!info) continue;
        if (info.mint !== tokenMintStr) continue;

        const tokenAmount = info.tokenAmount;
        if (!tokenAmount) continue;

        const uiAmount = Number(tokenAmount.uiAmount || 0);
        const amountRawStr = String(tokenAmount.amount || '0');
        const decimals = Number(tokenAmount.decimals || 0);

        if (!uiAmount || uiAmount <= 0) continue;

        const amountRaw = BigInt(amountRawStr);
        totalTokenRaw += amountRaw;
        totalTokenUi += uiAmount;

        tokenAccounts.push({
          pubkey: entry.pubkey,
          amountRaw,
          uiAmount,
          decimals,
          tokenProgramId: ownerProgram,
        });
      }
    }

    const hasSol = lamports > 0;
    const hasTokens = totalTokenRaw > 0n;

    if (!hasSol && !hasTokens) {
      return res.status(400).json({
        success: false,
        error: 'Card has no balance to claim',
      });
    }

    // 7) Sweep SPL tokens first (if any)
    let signatureSpl = null;
    if (hasTokens) {
      if (!feePayerKeypair) {
        console.warn(
          '[CRYPTOCARDS] Card holds SPL tokens but no fee wallet is configured; token claim will use deposit wallet as fee payer'
        );
      }

      const feePayer = feePayerKeypair || depositKeypair;

      const tx = new web3.Transaction();
      tx.feePayer = feePayer.publicKey;

      const mintKey = new web3.PublicKey(tokenMintStr);

      for (const acct of tokenAccounts) {
        // Destination ATA for this mint / token program
        const destAta = splToken.getAssociatedTokenAddressSync(
          mintKey,
          destPubkey,
          false,
          acct.tokenProgramId,
          splToken.ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const ataInfo = await solanaConnection.getAccountInfo(destAta, 'confirmed');
        if (!ataInfo) {
          tx.add(
            splToken.createAssociatedTokenAccountInstruction(
              feePayer.publicKey,       // payer (rent + fee)
              destAta,
              destPubkey,
              mintKey,
              acct.tokenProgramId,
              splToken.ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        }

        tx.add(
          splToken.createTransferInstruction(
            acct.pubkey,
            destAta,
            depositPubkey,
            acct.amountRaw,
            [],
            acct.tokenProgramId
          )
        );
      }

      if (tx.instructions.length > 0) {
        const { blockhash, lastValidBlockHeight } =
          await solanaConnection.getLatestBlockhash('finalized');
        tx.recentBlockhash = blockhash;

        // Need both deposit signer (owns token accounts) and fee payer signer (if different)
        if (feePayerKeypair) {
          tx.sign(depositKeypair, feePayerKeypair);
        } else {
          tx.sign(depositKeypair);
        }

        const rawTx = tx.serialize();
        const sig = await solanaConnection.sendRawTransaction(rawTx, {
          skipPreflight: false,
        });

        await solanaConnection.confirmTransaction(
          { signature: sig, blockhash, lastValidBlockHeight },
          'confirmed'
        );

        signatureSpl = sig;
        console.log(
          '[CRYPTOCARDS] SPL token claim tx:',
          sig,
          'totalTokenUi=',
          totalTokenUi
        );
      }
    }

    // 8) Sweep SOL (if any) — fee wallet pays fee if available
    let signatureSol = null;
    let solSent = 0;

    if (hasSol) {
      const useFeeWallet = !!feePayerKeypair;
      const feePayer = feePayerKeypair || depositKeypair;
      const feePayerPubkey = feePayer.publicKey;

      // If we have a fee wallet, we can send *all* lamports from deposit.
      // If not, leave a tiny buffer for tx fee.
      let lamportsToSend = lamports;
      if (!useFeeWallet) {
        const buffer = 5000; // ~0.000005 SOL
        lamportsToSend = lamports > buffer ? lamports - buffer : 0;
      }

      if (lamportsToSend > 0) {
        const { blockhash, lastValidBlockHeight } =
          await solanaConnection.getLatestBlockhash('finalized');

        const txSol = new web3.Transaction({
          feePayer: feePayerPubkey,
          recentBlockhash: blockhash,
        }).add(
          web3.SystemProgram.transfer({
            fromPubkey: depositPubkey,
            toPubkey: destPubkey,
            lamports: lamportsToSend,
          })
        );

        if (feePayerKeypair) {
          txSol.sign(depositKeypair, feePayerKeypair);
        } else {
          txSol.sign(depositKeypair);
        }

        const rawSol = txSol.serialize();
        const sigSol = await solanaConnection.sendRawTransaction(rawSol, {
          skipPreflight: false,
        });

        await solanaConnection.confirmTransaction(
          { signature: sigSol, blockhash, lastValidBlockHeight },
          'confirmed'
        );

        signatureSol = sigSol;
        solSent = lamportsToSend / web3.LAMPORTS_PER_SOL;

        console.log(
          '[CRYPTOCARDS] SOL claim tx:',
          sigSol,
          'solSent=',
          solSent
        );
      }
    }

    // 9) Update card in DB: mark claimed, clear funded
    const nowIso = new Date().toISOString();
    const newTokenAmount =
      totalTokenUi > 0 ? totalTokenUi : solSent || card.token_amount || 0;

    const { error: updateError } = await supabase
      .from('cards')
      .update({
        claimed: true,
        funded: false,
        token_amount: newTokenAmount,
        updated_at: nowIso,
      })
      .eq('public_id', public_id);

    if (updateError) {
      console.error('Supabase /claim-card update error:', updateError);
    }

    // Optional: Telegram notification (you can re-add your previous one here if desired)

    return res.json({
      success: true,
      destination_wallet: destPubkey.toBase58(),
      amount_sol: solSent,
      total_tokens_claimed: totalTokenUi,
      token_mint: tokenMintStr,
      signature_sol: signatureSol,
      signature_spl: signatureSpl,
    });
  } catch (err) {
    console.error('Error in /claim-card:', err);
    return res.status(500).json({
      success: false,
      error:
        err?.message ||
        'Unexpected error while claiming this CRYPTOCARD',
    });
  }
});

// ----- PUBLIC SOL PRICE + METRICS + ACTIVITY FOR DASHBOARD -----

// SOL price endpoint used by PublicDashboard
app.get('/sol-price', async (_req, res) => {
  try {
    const price = await getSolPriceUsd();
    res.json({ price_usd: price });
  } catch (err) {
    console.error('Error in /sol-price:', err);
    res
      .status(500)
      .json({ error: 'Failed to fetch SOL price' });
  }
});

// Aggregated public metrics for NETWORK ACTIVITY & BURNS
app.get('/public-metrics', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('cards')
      .select(
        'funded, locked, claimed, refunded, token_amount, amount_fiat, currency'
      );

    if (error) {
      console.error(
        'Supabase /public-metrics error:',
        error
      );
      throw error;
    }

    let totalCardsFunded = 0;
    let totalVolumeFundedSol = 0;
    let totalVolumeClaimedSol = 0;

    for (const row of data || []) {
      const sol = Number(row.token_amount || 0);

      // Count any card that has ever held value as "funded"
      if (row.funded || row.locked || row.claimed) {
        totalCardsFunded += 1;
        totalVolumeFundedSol += sol;
      }

      if (row.claimed) {
        totalVolumeClaimedSol += sol;
      }
    }

    const solPrice = await getSolPriceUsd();
    const price = solPrice || FALLBACK_SOL_PRICE_USD;

    const totalVolumeFundedFiat =
      totalVolumeFundedSol * price;
    const totalVolumeClaimedFiat =
      totalVolumeClaimedSol * price;

    // Default: 0, will fall back to 1.5% math if card_burns table isn't available
    let protocolBurnsSol = 0;

    try {
      const {
        data: burnData,
        error: burnError,
      } = await supabase
        .from('card_burns')
        .select('burn_sol');

      if (burnError) {
        console.error(
          'Supabase /public-metrics card_burns error:',
          burnError
        );
        protocolBurnsSol =
          totalVolumeFundedSol * 0.015;
      } else if (burnData && burnData.length > 0) {
        protocolBurnsSol = burnData.reduce(
          (sum, row) =>
            sum + Number(row.burn_sol || 0),
          0
        );
      } else {
        // No burn rows yet, fall back to math
        protocolBurnsSol =
          totalVolumeFundedSol * 0.015;
      }
    } catch (burnCatchErr) {
      console.error(
        'Exception reading card_burns in /public-metrics:',
        burnCatchErr
      );
      protocolBurnsSol =
        totalVolumeFundedSol * 0.015;
    }

    const protocolBurnsFiat =
      protocolBurnsSol * price;

    res.json({
      total_cards_funded: totalCardsFunded,
      total_volume_funded_sol: totalVolumeFundedSol,
      total_volume_funded_fiat:
        totalVolumeFundedFiat,
      total_volume_claimed_sol: totalVolumeClaimedSol,
      total_volume_claimed_fiat:
        totalVolumeClaimedFiat,
      protocol_burns_sol: protocolBurnsSol,
      protocol_burns_fiat: protocolBurnsFiat,
      burn_wallet: BURN_WALLET,
      last_updated: new Date().toISOString(),
    });
  } catch (err) {
    console.error(
      'Error in /public-metrics:',
      err
    );
    res.status(500).json({
      error: 'Failed to load public metrics',
    });
  }
});

/**
 * Public activity feed built directly from the cards table.
 * No extra tables needed. We derive CREATED / FUNDED / LOCKED / CLAIMED
 * events from the card flags + timestamps.
 */
app.get('/public-activity', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('cards')
      .select(
        'public_id, token_amount, amount_fiat, currency, funded, locked, claimed, created_at, updated_at'
      )
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error(
        'Supabase /public-activity error:',
        error
      );
      throw error;
    }

    const events = [];

    const nowIso = new Date().toISOString();

    for (const card of data || []) {
      const sol = Number(card.token_amount || 0);
      const fiat =
        typeof card.amount_fiat === 'number'
          ? card.amount_fiat
          : null;
      const currency = card.currency || 'USD';
      const createdAt =
        card.created_at ||
        card.updated_at ||
        nowIso;
      const updatedAt = card.updated_at || createdAt;

      // CREATED
      events.push({
        card_id: card.public_id,
        type: 'CREATED',
        token_amount: sol,
        sol_amount: sol,
        fiat_value: fiat,
        currency,
        timestamp: createdAt,
        tx_signature: null,
      });

      // FUNDED
      if (card.funded) {
        events.push({
          card_id: card.public_id,
          type: 'FUNDED',
          token_amount: sol,
          sol_amount: sol,
          fiat_value: fiat,
          currency,
          timestamp: updatedAt,
          tx_signature: null,
        });
      }

      // LOCKED
      if (card.locked) {
        events.push({
          card_id: card.public_id,
          type: 'LOCKED',
          token_amount: sol,
          sol_amount: sol,
          fiat_value: fiat,
          currency,
          timestamp: updatedAt,
          tx_signature: null,
        });
      }

      // CLAIMED
      if (card.claimed) {
        events.push({
          card_id: card.public_id,
          type: 'CLAIMED',
          token_amount: sol,
          sol_amount: sol,
          fiat_value: fiat,
          currency,
          timestamp: updatedAt,
          tx_signature: null,
        });
      }
    }

    // Sort newest first and trim to 50
    events.sort((a, b) => {
      const ta = new Date(a.timestamp).getTime();
      const tb = new Date(b.timestamp).getTime();
      return tb - ta;
    });

    res.json({ events: events.slice(0, 50) });
  } catch (err) {
    console.error(
      'Error in /public-activity:',
      err
    );
    res.status(500).json({
      error: 'Failed to load public activity',
    });
  }
});

// Fallback: serve SPA index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(
    `CRYPTOCARDS backend listening on port ${PORT}`
  );
});
