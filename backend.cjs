// backend.cjs
// CRYPTOCARDS backend + static frontend server (CommonJS)

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const web3 = require('@solana/web3.js');

// --- Env + config ---

const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
const BURN_WALLET =
  process.env.BURN_WALLET ||
  'A3mpAVduHM9QyRgH1NSZp5ANnbPr2Z5vkXtc8EgDaZBF';

const FALLBACK_SOL_PRICE_USD = 150;

// Debug flags
const DEBUG_API = process.env.DEBUG_API === 'true';
const DEBUG_AUTH = process.env.DEBUG_AUTH === 'true';

// --- Basic validation ---

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables. Please set:');
  console.error('SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY');
  process.exit(1);
}

// --- Core clients ---

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const solanaConnection = new web3.Connection(SOLANA_RPC, 'confirmed');

// Dist path for frontend
const distPath = path.join(__dirname, 'dist');

// --- Helper: robust SOL price fetcher (multiple sources) ---

async function getSolPriceUsd() {
  // Try a few public endpoints in order, fail-soft with fallback
  const fetch = (await import('node-fetch')).default;

  async function fromBinance() {
    const url = 'https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT';
    const res = await fetch(url);
    if (!res.ok) {
      console.error('getSolPriceUsd error: binance status', res.status);
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
    const apiKey = process.env.CRYPTOCOMPARE_API_KEY;
    const url = `https://min-api.cryptocompare.com/data/price?fsym=SOL&tsyms=USD${
      apiKey ? `&api_key=${apiKey}` : ''
    }`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error('getSolPriceUsd error: cryptocompare status', res.status);
      throw new Error(`cryptocompare status ${res.status}`);
    }
    const body = await res.json();
    const price = body?.USD;
    if (!price || !Number.isFinite(price)) {
      throw new Error('cryptocompare missing or invalid price');
    }
    return price;
  }

  // Coinbase
  async function fromCoinbase() {
    const url = 'https://api.coinbase.com/v2/prices/SOL-USD/spot';
    const res = await fetch(url);
    if (!res.ok) {
      console.error('getSolPriceUsd error: coinbase status', res.status);
      throw new Error(`coinbase status ${res.status}`);
    }
    const body = await res.json();
    const price = parseFloat(body?.data?.amount);
    if (!price || !Number.isFinite(price)) {
      throw new Error('coinbase missing or invalid price');
    }
    return price;
  }

  // Coingecko (last resort)
  async function fromCoingecko() {
    const url =
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';
    const res = await fetch(url);
    if (!res.ok) {
      console.error('getSolPriceUsd error: coingecko status', res.status);
      throw new Error(`coingecko status ${res.status}`);
    }
    const body = await res.json();
    const price = body?.solana?.usd;
    if (typeof price !== 'number' || !Number.isFinite(price)) {
      throw new Error('coingecko missing or invalid price');
    }
    return price;
  }

  const strategies = [fromBinance, fromCryptoCompare, fromCoinbase, fromCoingecko];

  for (const strat of strategies) {
    try {
      const price = await strat();
      if (DEBUG_API) {
        console.log('getSolPriceUsd success from strategy:', strat.name, price);
      }
      return price;
    } catch (err) {
      console.error('getSolPriceUsd strategy failed:', strat.name, err?.message);
    }
  }

  console.warn(
    `getSolPriceUsd: all strategies failed. Falling back to static price ${FALLBACK_SOL_PRICE_USD}`
  );
  return FALLBACK_SOL_PRICE_USD;
}

// --- Express app setup ---

const app = express();

app.use(
  cors({
    origin: '*',
  })
);

app.use(express.json());
app.use(express.static(distPath));

// --- Utility helpers ---

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function generatePublicId() {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}

function generateDepositSecret() {
  return crypto.randomBytes(32).toString('hex');
}

function generateDepositAddress(secret) {
  const seed = Buffer.from(secret, 'hex');
  const keypair = web3.Keypair.fromSeed(seed);
  return keypair.publicKey.toBase58();
}

function generateDepositKeypairFromSecret(secret) {
  const seed = Buffer.from(secret, 'hex');
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

async function getUserFromRequest(req) {
  const authHeader = req.headers['authorization'] || '';
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;
  const token = parts[1];
  if (!token) return null;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      if (DEBUG_AUTH) {
        console.warn('getUserFromRequest: invalid or expired token', error);
      }
      return null;
    }
    return data.user;
  } catch (err) {
    console.error('getUserFromRequest error:', err);
    return null;
  }
}

// --- Health check ---

app.get('/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// --- SOL price endpoint ---

app.get('/sol-price', async (_req, res) => {
  try {
    const price = await getSolPriceUsd();
    res.json({ price_usd: price });
  } catch (err) {
    console.error('/sol-price error:', err);
    res.status(500).json({ error: 'Failed to fetch SOL price' });
  }
});

// --- Auth + user profile endpoints ---

app.post('/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const { data, error } = await supabase.auth.signUp({
      email: email || undefined,
      password,
    });

    if (error) {
      console.error('Supabase signUp error:', error);
      return res.status(400).json({ error: error.message || 'Signup failed' });
    }

    const user = data.user;
    if (!user) {
      return res.status(500).json({ error: 'User not returned from Supabase' });
    }

    const { error: profileError } = await supabase.from('user_profiles').insert({
      id: user.id,
      email: user.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      display_name: null,
      bio: null,
      telegram_handle: null,
      twitter_handle: null,
      discord_handle: null,
    });

    if (profileError) {
      console.error('Supabase user profile insert error:', profileError);
    }

    res.json({
      user,
      session: data.session,
      message: 'Account created. Please check your email for verification.',
    });
  } catch (err) {
    console.error('/auth/signup error:', err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Supabase signInWithPassword error:', error);
      return res.status(400).json({ error: error.message || 'Login failed' });
    }

    res.json({
      user: data.user,
      session: data.session,
    });
  } catch (err) {
    console.error('/auth/login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/auth/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'] || '';
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return res.json({ success: true });
    }

    const token = parts[1];
    if (!token) {
      return res.json({ success: true });
    }

    const { error } = await supabase.auth.admin.signOut(token);
    if (error) {
      console.error('/auth/logout signOut error:', error);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('/auth/logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Authenticated user info
app.get('/auth/me', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    res.json({
      user,
      profile,
    });
  } catch (err) {
    console.error('/auth/me error:', err);
    res.status(500).json({ error: 'Failed to load user info' });
  }
});

// Update profile
app.post('/auth/profile', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { display_name, bio, telegram_handle, twitter_handle, discord_handle } =
      req.body || {};

    const { error } = await supabase
      .from('user_profiles')
      .update({
        display_name: display_name ?? null,
        bio: bio ?? null,
        telegram_handle: telegram_handle ?? null,
        twitter_handle: twitter_handle ?? null,
        discord_handle: discord_handle ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error('/auth/profile update error:', error);
      return res.status(400).json({ error: 'Failed to update profile' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('/auth/profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Request password reset
app.post('/auth/reset-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const redirectTo = process.env.PASSWORD_RESET_REDIRECT_URL;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      console.error('/auth/reset-password error:', error);
      return res.status(400).json({ error: error.message || 'Reset failed' });
    }

    res.json({
      success: true,
      data,
      message: 'Password reset email sent.',
    });
  } catch (err) {
    console.error('/auth/reset-password error:', err);
    res.status(500).json({ error: 'Reset failed' });
  }
});

// Complete password update once user is redirected back with access token
app.post('/auth/update-password', async (req, res) => {
  try {
    const { access_token, new_password } = req.body || {};
    if (!access_token || !new_password) {
      return res.status(400).json({
        error: 'access_token and new_password are required',
      });
    }

    const supabaseForUpdate = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    await supabaseForUpdate.auth.setSession({
      access_token,
      refresh_token: '',
    });

    const { data, error } = await supabaseForUpdate.auth.updateUser({
      password: new_password,
    });

    if (error) {
      console.error('/auth/update-password error:', error);
      return res.status(400).json({ error: error.message || 'Update failed' });
    }

    res.json({
      success: true,
      user: data.user,
    });
  } catch (err) {
    console.error('/auth/update-password error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// Request email change
app.post('/auth/email-change-request', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { new_email } = req.body || {};
    if (!new_email) {
      return res.status(400).json({ error: 'new_email is required' });
    }

    const existing = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', new_email)
      .maybeSingle();

    if (existing.data) {
      return res.status(400).json({
        error: 'That email is already in use on another account.',
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date().toISOString();

    const { error: upsertError } = await supabase.from('email_change_tokens').upsert(
      {
        user_id: user.id,
        new_email,
        token,
        created_at: now,
        used: false,
      },
      {
        onConflict: 'user_id',
      }
    );

    if (upsertError) {
      console.error('Error in /auth/email-change-request upsert:', upsertError);
      return res.status(500).json({ error: 'Failed to create email change token' });
    }

    const frontendBase = process.env.FRONTEND_BASE_URL || '';
    const confirmUrl = `${frontendBase}/email-change-confirm?token=${token}&uid=${user.id}`;

    await notifyTelegram(
      [
        '*✉️ Email Change Requested*',
        '',
        `User: ${maskIdentifier(user.email || user.id)}`,
        `New Email: ${maskIdentifier(new_email)}`,
      ].join('\n')
    );

    res.json({
      success: true,
      message: 'Email change requested. Please confirm via the link we sent.',
      confirm_url: confirmUrl,
    });
  } catch (err) {
    console.error('/auth/email-change-request error:', err);
    res.status(500).json({ error: 'Failed to request email change' });
  }
});

// Confirm email change (user clicked the link)
app.post('/auth/email-change-confirm', async (req, res) => {
  try {
    const { token, user_id } = req.body || {};

    if (!token || !user_id) {
      return res.status(400).json({
        success: false,
        error: 'token and user_id are required',
      });
    }

    const { data: tokenRow, error: tokenError } = await supabase
      .from('email_change_tokens')
      .select('*')
      .eq('user_id', user_id)
      .eq('token', token)
      .eq('used', false)
      .maybeSingle();

    if (tokenError) {
      console.error('Error in /auth/email-change-confirm fetch token:', tokenError);
      return res.status(500).json({
        success: false,
        error: 'Failed to validate token',
      });
    }

    if (!tokenRow) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    const createdAt = new Date(tokenRow.created_at).getTime();
    const now = Date.now();
    const diffHours = (now - createdAt) / (1000 * 60 * 60);
    if (diffHours > 24) {
      return res.status(400).json({
        success: false,
        error: 'Token has expired',
      });
    }

    const new_email = tokenRow.new_email;

    const { error: existingError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', new_email)
      .limit(1);

    if (existingError) {
      console.error(
        'Error in /auth/email-change-confirm checking existing email:',
        existingError
      );
    }

    const { data, error } = await supabase.auth.admin.updateUserById(user_id, {
      email: new_email,
    });

    if (error) {
      console.error('Error in /auth/email-change-confirm updateUserById:', error);
      return res.status(400).json({
        success: false,
        error: 'Failed to update user email in auth',
      });
    }

    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        email: new_email,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id);

    if (profileError) {
      console.error('Error in /auth/email-change-confirm update profile:', profileError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update profile email',
      });
    }

    const { error: tokenUpdateError } = await supabase
      .from('email_change_tokens')
      .update({ used: true })
      .eq('user_id', user_id)
      .eq('token', token);

    if (tokenUpdateError) {
      console.error(
        'Error in /auth/email-change-confirm marking token used:',
        tokenUpdateError
      );
    }

    res.json({
      success: true,
      message: 'Email address updated successfully.',
    });
  } catch (err) {
    console.error('/auth/email-change-confirm error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm email change',
    });
  }
});

// Complete the email change on the frontend callback
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

    const user = data.user;

    if (user.email !== new_email) {
      return res.status(400).json({
        success: false,
        error: 'Email mismatch. Please confirm via the correct link.',
      });
    }

    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        email: new_email,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id);

    if (profileError) {
      console.error(
        'Error in /auth/email-change-complete updating profile:',
        profileError
      );
      return res.status(500).json({
        success: false,
        error: 'Failed to update profile email',
      });
    }

    res.json({
      success: true,
      message: 'Email change completed successfully.',
    });
  } catch (err) {
    console.error('/auth/email-change-complete error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to complete email change',
    });
  }
});

// --- Card creation / funding / claiming ---

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
      creator_user_id: user?.id || null,
      creator_email: user?.email || null,
    };

    const { error: insertError } = await supabase
      .from('cards')
      .insert(insertPayload);

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

// LOCK CARD (logical lock, now with protocol tax on SOL balance)
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

    if (card.claimed) {
      return res.status(400).json({ error: 'Card is already claimed' });
    }

    if (card.refunded) {
      return res.status(400).json({ error: 'Card is already refunded' });
    }

    if (card.locked) {
      return res.status(400).json({ error: 'Card is already locked' });
    }

    // Attempt protocol tax on lock (1.5% of current SOL balance)
    try {
      if (card.deposit_secret && card.deposit_address) {
        const depositKeypair = generateDepositKeypairFromSecret(card.deposit_secret);
        const depositPubkey = depositKeypair.publicKey;

        if (depositPubkey.toBase58() === card.deposit_address) {
          const lamports = await solanaConnection.getBalance(depositPubkey);

          if (lamports > 0) {
            const rawBurnLamports = Math.floor(lamports * 0.015);
            const minBurnLamports = 5000;

            if (rawBurnLamports >= minBurnLamports) {
              const burnLamports = rawBurnLamports;

              const { blockhash, lastValidBlockHeight } =
                await solanaConnection.getLatestBlockhash('finalized');

              const burnTx = new web3.Transaction({
                feePayer: depositPubkey,
                recentBlockhash: blockhash,
              }).add(
                web3.SystemProgram.transfer({
                  fromPubkey: depositPubkey,
                  toPubkey: new web3.PublicKey(BURN_WALLET),
                  lamports: burnLamports,
                })
              );

              burnTx.sign(depositKeypair);

              const raw = burnTx.serialize();
              const signature = await solanaConnection.sendRawTransaction(raw, {
                skipPreflight: false,
              });

              await solanaConnection.confirmTransaction(
                { signature, blockhash, lastValidBlockHeight },
                'confirmed'
              );

              console.log(
                `Protocol tax on lock applied for card ${public_id}:`,
                burnLamports / web3.LAMPORTS_PER_SOL,
                'SOL'
              );
            } else {
              console.log(
                `Skipping protocol tax on lock for card ${public_id}: burn amount too low`
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
      console.error('Error applying protocol tax in /lock-card:', taxErr);
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

// SIMPLE STATS (legacy)
app.get('/stats', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('cards')
      .select('funded, locked, claimed, refunded, token_amount, amount_fiat, currency');

    if (error) {
      console.error('Supabase /stats error:', error);
      throw error;
    }

    let totalCardsFunded = 0;
    let totalVolumeFundedSol = 0;
    let totalVolumeClaimedSol = 0;

    for (const row of data || []) {
      const sol = Number(row.token_amount || 0);

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

    const totalVolumeFundedFiat = totalVolumeFundedSol * price;
    const totalVolumeClaimedFiat = totalVolumeClaimedSol * price;
    const protocolBurnsSol = totalVolumeFundedSol * 0.015;
    const protocolBurnsFiat = protocolBurnsSol * price;

    res.json({
      total_cards_funded: totalCardsFunded,
      total_volume_funded_sol: totalVolumeFundedSol,
      total_volume_funded_fiat: totalVolumeFundedFiat,
      total_volume_claimed_sol: totalVolumeClaimedSol,
      total_volume_claimed_fiat: totalVolumeClaimedFiat,
      protocol_burns_sol: protocolBurnsSol,
      protocol_burns_fiat: protocolBurnsFiat,
      burn_wallet: BURN_WALLET,
    });
  } catch (err) {
    console.error('Error in /stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Public metrics (dashboard)
app.get('/public-metrics', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('cards')
      .select('funded, locked, claimed, refunded, token_amount, amount_fiat, currency');

    if (error) {
      console.error('Supabase /public-metrics error:', error);
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

    const totalVolumeFundedFiat = totalVolumeFundedSol * price;
    const totalVolumeClaimedFiat = totalVolumeClaimedSol * price;
    const protocolBurnsSol = totalVolumeFundedSol * 0.015;
    const protocolBurnsFiat = protocolBurnsSol * price;

    res.json({
      total_cards_funded: totalCardsFunded,
      total_volume_funded_sol: totalVolumeFundedSol,
      total_volume_funded_fiat: totalVolumeFundedFiat,
      total_volume_claimed_sol: totalVolumeClaimedSol,
      total_volume_claimed_fiat: totalVolumeClaimedFiat,
      protocol_burns_sol: protocolBurnsSol,
      protocol_burns_fiat: protocolBurnsFiat,
      burn_wallet: BURN_WALLET,
      last_updated: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error in /public-metrics:', err);
    res.status(500).json({ error: 'Failed to load public metrics' });
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
      console.error('Supabase /public-activity error:', error);
      throw error;
    }

    const events = [];

    const nowIso = new Date().toISOString();

    for (const row of data || []) {
      events.push({
        type: 'created',
        label: 'Card created',
        public_id: row.public_id,
        sol_amount: Number(row.token_amount || 0),
        fiat_amount: row.amount_fiat,
        currency: row.currency || 'USD',
        at: row.created_at || nowIso,
      });

      if (row.funded) {
        events.push({
          type: 'funded',
          label: 'Card funded',
          public_id: row.public_id,
          sol_amount: Number(row.token_amount || 0),
          fiat_amount: row.amount_fiat,
          currency: row.currency || 'USD',
          at: row.updated_at || nowIso,
        });
      }

      if (row.locked) {
        events.push({
          type: 'locked',
          label: 'Card locked',
          public_id: row.public_id,
          sol_amount: Number(row.token_amount || 0),
          fiat_amount: row.amount_fiat,
          currency: row.currency || 'USD',
          at: row.updated_at || nowIso,
        });
      }

      if (row.claimed) {
        events.push({
          type: 'claimed',
          label: 'Card claimed',
          public_id: row.public_id,
          sol_amount: Number(row.token_amount || 0),
          fiat_amount: row.amount_fiat,
          currency: row.currency || 'USD',
          at: row.updated_at || nowIso,
        });
      }
    }

    res.json({ events: events.slice(0, 50) });
  } catch (err) {
    console.error('Error in /public-activity:', err);
    res.status(500).json({ error: 'Failed to load public activity' });
  }
});

// Fallback: serve SPA index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`CRYPTOCARDS backend listening on port ${PORT}`);
});
