import { supabaseClient } from '@/lib/supabaseClient';

const RAW_BASE_URL = import.meta.env.VITE_BACKEND_URL || '';
const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');

export interface StatsResponse {
  total_funded: number;
  total_burned: number;
}

export interface CardStatusResponse {
  public_id: string;
  message: string;
  currency: string;
  amount_fiat: number | null;
  expires_at: string | null;
  template_url: string | null;
  deposit_address: string | null;
  locked: boolean;
  claimed: boolean;
  funded: boolean;
}

export interface MyCard {
  public_id: string;
  message: string | null;
  currency: string;
  amount_fiat: number | null;
  created_at: string;
  locked: boolean;
  claimed: boolean;
  funded: boolean;
}

export interface LoginResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: { id: string; username: string; email?: string };
  error?: string;
}

export interface RegisterResult {
  success: boolean;
  error?: string;
}

export interface ForgotPasswordResult {
  success: boolean;
  error?: string;
}

export interface UpdateEmailResult {
  success: boolean;
  user?: any;
  error?: string;
}

export interface FinalizeEmailChangeResult {
  success: boolean;
  user?: any;
  error?: string;
}

class ApiService {
  baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const text = await response.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error('Invalid server response');
    }

    if (!response.ok) {
      const message = data?.error || data?.message || 'Request failed';
      throw new Error(message);
    }

    return data as T;
  }

  // --- AUTH ---

  async login(username: string, password: string): Promise<LoginResult> {
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = (await res.json().catch(() => ({}))) as LoginResult;
    return data;
  }

  async register(username: string, password: string, email?: string): Promise<RegisterResult> {
    const res = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email }),
    });

    const data = (await res.json().catch(() => ({}))) as RegisterResult;
    return data;
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResult> {
    const res = await fetch(`${this.baseUrl}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = (await res.json().catch(() => ({}))) as ForgotPasswordResult;
    return data;
  }

  /**
   * Update email using Supabase secure email change flow.
   * - Uses Supabase client on the frontend to request the change.
   * - Then hits backend /auth/update-email to sync notification_email.
   *
   * Requires:
   * - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY configured
   * - auth_token and auth_refresh_token saved in localStorage after login
   * - Secure email change enabled in Supabase Auth settings
   */
  async updateEmail(email: string, token: string): Promise<UpdateEmailResult> {
    const newEmail = email.trim();
    if (!newEmail) {
      throw new Error('Email is required');
    }

    const accessToken = localStorage.getItem('auth_token');
    const refreshToken = localStorage.getItem('auth_refresh_token');

    if (!accessToken || !refreshToken) {
      throw new Error('Please log out and log back in before changing your email.');
    }

    // Attach session to Supabase client
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError || !sessionData?.session?.user) {
      console.error('[Supabase] setSession error:', sessionError);
      throw new Error('Unable to verify your session. Please log in again before changing email.');
    }

    // Build redirect URL for the email-change confirm link
    const frontendUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
    const redirectTo = `${frontendUrl.replace(/\/+$/, '')}/?type=email_change`;

    // 1) Trigger Supabase secure email change flow (sends confirmation email)
    const { error: changeError } = await supabaseClient.auth.updateUser({
      email: newEmail,
      options: {
        emailRedirectTo: redirectTo,
      } as any,
    } as any);

    if (changeError) {
      console.error('[Supabase] updateUser email error:', changeError);
      throw new Error(
        changeError.message || 'Failed to request email change. Please try again.'
      );
    }

    // 2) Sync notification_email metadata in backend (for dashboards/notifications)
    const res = await fetch(`${this.baseUrl}/auth/update-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email: newEmail }),
    });

    const data = (await res.json().catch(() => ({}))) as UpdateEmailResult;
    return data;
  }

  /**
   * Called after the user clicks the Supabase email change confirmation link
   * and is redirected back to the site with type=email_change.
   * This lets the backend sync and returns the latest user object.
   */
  async finalizeEmailChange(token: string): Promise<FinalizeEmailChangeResult> {
    const res = await fetch(`${this.baseUrl}/auth/email-change-complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    const data = (await res.json().catch(() => ({}))) as FinalizeEmailChangeResult;
    return data;
  }

  // Upload a custom card template image/GIF to the backend (Supabase Storage) and get a persistent URL.
  async uploadTemplate(file: File): Promise<{ url: string }> {
    const form = new FormData();
    form.append('file', file);

    const res = await fetch(`${this.baseUrl}/upload-template`, {
      method: 'POST',
      body: form,
    });

    return this.handleResponse<{ url: string }>(res);
  }


  /**
   * List uploaded templates (Supabase Storage public URLs).
   * Used by ImageGrid to show user-uploaded images/GIFs alongside stock images.
   */
  async listTemplates(params?: { type?: 'image' | 'gif' | 'all'; limit?: number }): Promise<{ urls: string[] }> {
    const sp = new URLSearchParams();
    if (params?.type) sp.set('type', params.type);
    if (typeof params?.limit === 'number') sp.set('limit', String(params.limit));

    const qs = sp.toString();
    const url = `${this.baseUrl}/list-templates${qs ? `?${qs}` : ''}`;

    const res = await fetch(url);
    return this.handleResponse<{ urls: string[] }>(res);
  }


  // --- CARDS / STATS ---

  async createCard(payload: any, token?: string): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${this.baseUrl}/create-card`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    return this.handleResponse<any>(res);
  }

  async getCardStatus(publicId: string): Promise<CardStatusResponse> {
    const res = await fetch(`${this.baseUrl}/card-status/${publicId}`);
    return this.handleResponse<CardStatusResponse>(res);
  }

  async lockCard(publicId: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`${this.baseUrl}/lock-card`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_id: publicId }),
    });

    return this.handleResponse<{ success: boolean; error?: string }>(res);
  }

  async claimCard(body: {
    public_id: string;
    cvv: string;
    destination_wallet: string;
  }): Promise<{ success: boolean; error?: string; signature?: string; amount_sol?: number }> {
    const res = await fetch(`${this.baseUrl}/claim-card`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return this.handleResponse<{
      success: boolean;
      error?: string;
      signature?: string;
      amount_sol?: number;
    }>(res);
  }

  async getStats(): Promise<StatsResponse> {
    const res = await fetch(`${this.baseUrl}/stats`);
    return this.handleResponse<StatsResponse>(res);
  }

  async getMyCards(token: string): Promise<MyCard[]> {
    const res = await fetch(`${this.baseUrl}/my-cards`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return this.handleResponse<MyCard[]>(res);
  }

  /**
   * Poll Solana + Supabase to sync whether a card is funded.
   * Backend route: POST /sync-card-funding/:publicId
   * Returns { public_id, deposit_address, lamports, sol, funded }
   */
  async syncCardFunding(publicId: string): Promise<{
    public_id: string;
    deposit_address: string;
    lamports: number;
    sol: number;
    funded: boolean;
  }> {
    const res = await fetch(
      `${this.baseUrl}/sync-card-funding/${encodeURIComponent(publicId)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return this.handleResponse<{
      public_id: string;
      deposit_address: string;
      lamports: number;
      sol: number;
      funded: boolean;
    }>(res);
  }
}

export const apiService = new ApiService();
