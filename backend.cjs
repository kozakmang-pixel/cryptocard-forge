// backend.cjs
// CRYPTOCARDS backend + static frontend server (Render-compatible)

require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
// NOTE: we now rely on Node 22's built-in global fetch instead of node-fetch

// --- Env + config ---

const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const COINGECKO_API_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase env vars. Check SUPABASE_URL / SUPABASE_SERVICE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- Express app setup ---

const app = express();
app.use(cors());
app.use(express.json());

// Static frontend (Vite build) is in "dist"
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// --- Helpers ---

async function sendTelegramMessage(message) {
  try {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.log(
        '[Telegram] Missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID. Skipping notification.'
      );
      return;
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const body = {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown',
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[Telegram] Failed to send message:', res.status, text);
    } else {
      console.log('[Telegram] Notification sent');
    }
  } catch (err) {
    console.error('[Telegram] Error sending message:', err);
  }
}

async function fetchSolPriceUSD() {
  try {
    const res = await fetch(COINGECKO_API_URL);
    if (!res.ok) {
      console.error('Failed to fetch SOL price from Coingecko:', res.status);
      return null;
    }
    const data = await res.json();
    const price = data?.solana?.usd;
    if (typeof price !== 'number') {
      console.error('Invalid SOL price payload from Coingecko');
      return null;
    }
    return price;
  } catch (err) {
    console.error('Error fetching SOL price:', err);
    return null;
  }
}

// --- Auth + user helpers ---

async function getUserFromToken(authHeader) {
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      console.error('Error in getUserFromToken:', error);
      return null;
    }
    return data.user;
  } catch (err) {
    console.error('Unexpected error in getUserFromToken:', err);
    return null;
  }
}

// --- Routes ---

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get public SOL price (for frontend banner, etc.)
app.get('/sol-price', async (_req, res) => {
  try {
    const price = await fetchSolPriceUSD();
    if (price === null) {
      return res.status(500).json({ error: 'Failed to fetch SOL price' });
    }
    res.json({ sol_usd: price });
  } catch (err) {
    console.error('Error in /sol-price:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create card
app.post('/cards', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || null;
    const user = await getUserFromToken(authHeader);

    const {
      message = 'Gift',
      currency = 'USD',
      amount_fiat = 0,
      token_mint = null,
      expires_at = null,
      template_url = null,
    } = req.body || {};

    if (!currency) {
      return res.status(400).json({ error: 'currency is required' });
    }

    // Simple public_id + CVV generator
    const randomId = () =>
      Math.random().toString(36).slice(2, 10).toUpperCase();
    const randomCvv = () =>
      Math.floor(100000 + Math.random() * 900000).toString();

    const public_id = randomId();
    const cvv = randomCvv();
    const deposit_address = null; // Initially null, can be updated later by on-chain system

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('cards')
      .insert([
        {
          public_id,
          cvv,
          deposit_address,
          message,
          currency,
          amount_fiat,
          token_mint,
          expires_at,
          template_url,
          user_id: user ? user.id : null,
          funded: false,
          locked: false,
          claimed: false,
          refunded: false,
          created_at: now,
          updated_at: now,
        },
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Error inserting card:', error);
      return res.status(500).json({ error: 'Failed to create card' });
    }

    // Telegram notification
    try {
      const fiatDisplay =
        typeof amount_fiat === 'number' && amount_fiat > 0
          ? `${amount_fiat.toFixed(2)} ${currency}`
          : '0.00 USD';

      const userLine = user
        ? `User: ${user.email || user.id}`
        : 'User: Guest';

      const msg = [
        '*New CRYPTOCARDS gift card created* 🎁',
        `ID: \`${public_id}\``,
        `Fiat Amount: *${fiatDisplay}*`,
        `Token Mint: \`${token_mint || 'N/A'}\``,
        userLine,
      ].join('\n');

      sendTelegramMessage(msg);
    } catch (notifyErr) {
      console.error('Error sending Telegram notification (create card):', notifyErr);
    }

    res.json({
      public_id: data.public_id,
      cvv: data.cvv,
      deposit_address: data.deposit_address,
    });
  } catch (err) {
    console.error('Error in POST /cards:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get card by public_id (for claim page)
app.get('/cards/:public_id', async (req, res) => {
  try {
    const { public_id } = req.params;

    const { data, error } = await supabase
      .from('cards')
      .select(
        'public_id, cvv, deposit_address, message, currency, amount_fiat, token_mint, expires_at, template_url, funded, locked, claimed, refunded, created_at, updated_at'
      )
      .eq('public_id', public_id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching card:', error);
      return res.status(500).json({ error: 'Failed to fetch card' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json(data);
  } catch (err) {
    console.error('Error in GET /cards/:public_id:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Lock a card (after funding)
app.post('/cards/:public_id/lock', async (req, res) => {
  try {
    const { public_id } = req.params;
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('cards')
      .update({
        locked: true,
        updated_at: now,
      })
      .eq('public_id', public_id)
      .select('*')
      .single();

    if (error) {
      console.error('Error locking card:', error);
      return res.status(500).json({ error: 'Failed to lock card' });
    }

    // Telegram notification
    try {
      const fiatDisplay =
        typeof data.amount_fiat === 'number' && data.amount_fiat > 0
          ? `${data.amount_fiat.toFixed(2)} ${data.currency || 'USD'}`
          : '0.00 USD';

      const msg = [
        '*Gift card locked & ready to share* 🔒',
        `ID: \`${data.public_id}\``,
        `Fiat Amount: *${fiatDisplay}*`,
        `Token Mint: \`${data.token_mint || 'N/A'}\``,
      ].join('\n');

      sendTelegramMessage(msg);
    } catch (notifyErr) {
      console.error('Error sending Telegram notification (lock card):', notifyErr);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error in POST /cards/:public_id/lock:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Simple card status endpoint (used by Audit + public dashboards)
app.get('/card-status/:public_id', async (req, res) => {
  try {
    const { public_id } = req.params;

    const { data, error } = await supabase
      .from('cards')
      .select(
        `
        public_id,
        message,
        currency,
        amount_fiat,
        token_mint,
        deposit_address,
        funded,
        locked,
        claimed,
        refunded,
        created_at,
        updated_at,
        token_amount,
        sol_amount
      `
      )
      .eq('public_id', public_id)
      .maybeSingle();

    if (error) {
      console.error('Error in /card-status Supabase query:', error);
      return res.status(500).json({ error: 'Failed to fetch card status' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json(data);
  } catch (err) {
    console.error('Error in /card-status route:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Card balance (on-chain + DB snapshot)
app.get('/card-balance/:public_id', async (req, res) => {
  try {
    const { public_id } = req.params;

    const { data, error } = await supabase
      .from('card_balances')
      .select('public_id, sol, token_amount, last_checked_at, deposit_address')
      .eq('public_id', public_id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching card balance:', error);
      return res.status(500).json({ error: 'Failed to fetch card balance' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Card balance not found' });
    }

    res.json(data);
  } catch (err) {
    console.error('Error in /card-balance route:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User dashboard: list cards for authenticated user
app.get('/user/cards', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || null;
    const user = await getUserFromToken(authHeader);

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { data, error } = await supabase
      .from('cards')
      .select(
        `
        public_id,
        message,
        currency,
        amount_fiat,
        token_mint,
        deposit_address,
        funded,
        locked,
        claimed,
        refunded,
        created_at,
        updated_at,
        token_amount,
        sol_amount
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Error in /user/cards Supabase query:', error);
      return res.status(500).json({ error: 'Failed to load user cards' });
    }

    res.json({ cards: data || [] });
  } catch (err) {
    console.error('Error in /user/cards route:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Public dashboard metrics
app.get('/public-metrics', async (_req, res) => {
  const fallback = {
    total_cards_funded: 0,
    total_volume_funded_sol: 0,
    total_volume_funded_fiat: 0,
    total_volume_claimed_sol: 0,
    total_volume_claimed_fiat: 0,
    protocol_burns_sol: 0,
    protocol_burns_fiat: 0,
    burn_wallet: null,
    last_updated: null,
  };

  try {
    const { data, error } = await supabase.rpc('get_public_metrics');

    if (error) {
      console.error('Error calling get_public_metrics RPC:', error);
      // If the RPC doesn't exist or fails, just return safe zeros so the UI still works
      return res.json(fallback);
    }

    // If RPC returns null/empty, also fall back
    res.json(data || fallback);
  } catch (err) {
    console.error('Error in /public-metrics route:', err);
    res.json(fallback);
  }
});

// Public activity feed (for "Global Activity" style dashboard)
app.get('/public-activity', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('cards')
      .select(
        'public_id, token_amount, amount_fiat, currency, token_mint, funded, locked, claimed, created_at, updated_at'
      )
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Supabase /public-activity error:', error);
      throw error;
    }

    const events = [];

    const nowIso = new Date().toISOString();

    for (const card of data || []) {
      const sol = Number(card.token_amount || 0);
      const fiat = typeof card.amount_fiat === 'number' ? card.amount_fiat : null;
      const currency = card.currency || 'USD';
      const createdAt = card.created_at || card.updated_at || nowIso;
      const updatedAt = card.updated_at || createdAt;

      // CREATED
      events.push({
        card_id: card.public_id,
        type: 'CREATED',
        token_amount: sol,
        sol_amount: sol,
        fiat_value: fiat,
        currency,
        token_mint: card.token_mint || null,
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
          token_mint: card.token_mint || null,
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
          token_mint: card.token_mint || null,
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
          token_mint: card.token_mint || null,
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
    console.error('Error in /public-activity:', err);
    res.status(500).json({ error: 'Failed to load public activity' });
  }
});

// Auth: basic username/email update helpers for dashboard

app.post('/auth/update-email', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || null;
    const user = await getUserFromToken(authHeader);

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { new_email } = req.body || {};
    if (!new_email || typeof new_email !== 'string') {
      return res.status(400).json({ error: 'Invalid email' });
    }

    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      email: new_email,
    });

    if (error) {
      console.error('Error in /auth/update-email:', error);
      return res.status(500).json({ error: 'Failed to update email' });
    }

    res.json({ success: true, user: data.user });
  } catch (err) {
    console.error('Error in /auth/update-email route:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/auth/update-username', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || null;
    const user = await getUserFromToken(authHeader);

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { new_username } = req.body || {};
    if (!new_username || typeof new_username !== 'string') {
      return res.status(400).json({ error: 'Invalid username' });
    }

    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...(user.user_metadata || {}),
        username: new_username,
      },
    });

    if (error) {
      console.error('Error in /auth/update-username:', error);
      return res.status(500).json({ error: 'Failed to update username' });
    }

    res.json({ success: true, user: data.user });
  } catch (err) {
    console.error('Error in /auth/update-username route:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auth: email change flow for notification email (dashboard)
app.post('/auth/email-change-request', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || null;
    const user = await getUserFromToken(authHeader);

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { new_email } = req.body || {};
    if (!new_email || typeof new_email !== 'string') {
      return res.status(400).json({ error: 'Invalid email' });
    }

    // In a real app, you'd send a verification email with a token here.
    // We'll just log and pretend we did.
    console.log(
      `Email change requested for user ${user.id} from ${
        user.email
      } to ${new_email} at ${new Date().toISOString()}`
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Error in /auth/email-change-request route:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/auth/email-change-complete', async (req, res) => {
  try {
    const { user_id, new_email } = req.body || {};

    if (!user_id || !new_email) {
      return res.status(400).json({ error: 'Missing user_id or new_email' });
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

    const { data: updated, error: updateError } =
      await supabase.auth.admin.updateUserById(user_id, {
        user_metadata: newMeta,
      });

    if (updateError) {
      console.error(
        'Error in /auth/email-change-complete updateUserById:',
        updateError
      );
      return res.status(500).json({
        success: false,
        error: 'Failed to update user metadata',
      });
    }

    console.log(
      `Notification email updated for user ${user_id} to ${new_email}`
    );

    res.json({
      success: true,
      user_id,
      new_email,
    });
  } catch (err) {
    console.error('Error in /auth/email-change-complete route:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fallback: serve SPA index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`CRYPTOCARDS backend listening on port ${PORT}`);
});
