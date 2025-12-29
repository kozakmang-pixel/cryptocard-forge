import { useEffect, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { SecurityBanner } from '@/components/SecurityBanner';
import { PriceBanner } from '@/components/PriceBanner';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { KeyRound } from 'lucide-react';
import { supabaseClient } from '@/lib/supabaseClient';

type ResetStatus = 'checking' | 'ready' | 'invalid' | 'done';

export default function ResetPasswordPage() {
  const [solPrice, setSolPrice] = useState(150);
  const [status, setStatus] = useState<ResetStatus>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Fetch SOL price for the price banner (same behaviour as other pages)
  useEffect(() => {
    let cancelled = false;

    async function fetchSolPrice() {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
        );
        const data = await res.json();
        if (!cancelled && data?.solana?.usd) {
          setSolPrice(data.solana.usd);
        }
      } catch (err) {
        console.error('Failed to fetch SOL price for reset page', err);
      }
    }

    fetchSolPrice();

    return () => {
      cancelled = true;
    };
  }, []);

  // Check that this reset link is valid (user session from Supabase)
  useEffect(() => {
    let cancelled = false;

    async function validateResetLink() {
      try {
        const { data, error } = await supabaseClient.auth.getUser();

        if (cancelled) return;

        if (error || !data?.user) {
          console.error('reset password user check error', error);
          setStatus('invalid');
          return;
        }

        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        console.error('reset password init error', err);
        setStatus('invalid');
      }
    }

    validateResetLink();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (status !== 'ready' || isSubmitting) return;

    if (!password || password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);

      const { error } = await supabaseClient.auth.updateUser({
        password,
      });

      if (error) {
        console.error('reset password error', error);
        toast.error(error.message || 'Failed to reset password. This link may be expired.');
        setStatus('invalid');
        return;
      }

      setStatus('done');
      toast.success('Password updated successfully. You can now log in with your new password.');

      // After a short delay, send the user back to the main site
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1800);
    } catch (err: any) {
      console.error('reset password error', err);
      toast.error(err?.message || 'Failed to reset password. This link may be expired.');
      setStatus('invalid');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />

        <div className="flex-1 px-2 pb-6 pt-2 md:px-4 md:pb-8">
          <div className="max-w-5xl mx-auto space-y-2 mb-4">
            <SecurityBanner />
            <PriceBanner solPrice={solPrice} />
          </div>

          <div className="max-w-md mx-auto">
            <div className="relative bg-black/40 border border-white/5 rounded-2xl p-4 shadow-xl backdrop-blur">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                  <KeyRound className="w-3 h-3 text-primary" />
                </div>
                <div>
                  <h1 className="text-[13px] font-semibold tracking-tight">
                    Reset Password
                  </h1>
                  <p className="text-[9px] text-muted-foreground">
                    Choose a new password for your CRYPTOCARDS account.
                  </p>
                </div>
              </div>

              {status === 'invalid' && (
                <div className="text-[9px] text-red-400 bg-red-950/40 border border-red-900/50 rounded-md px-3 py-2 mb-2">
                  <p className="font-semibold mb-1">Invalid or expired link</p>
                  <p>
                    This reset link is invalid or has expired. Please request a new password
                    reset from the login panel on the main page.
                  </p>
                  <Button
                    size="sm"
                    className="mt-2 h-7 text-[9px] font-semibold"
                    variant="outline"
                    onClick={() => navigate('/')}
                  >
                    ← Back to main site
                  </Button>
                </div>
              )}

              {status === 'done' && (
                <div className="text-[9px] text-emerald-300 bg-emerald-950/40 border border-emerald-900/50 rounded-md px-3 py-2 mb-2">
                  <p className="font-semibold mb-1">Password updated</p>
                  <p>Your password has been updated successfully.</p>
                  <p className="mt-1">
                    You can now log in with your new password. We&apos;ll send you back to the
                    main site in a moment.
                  </p>
                </div>
              )}

              {(status === 'ready' || status === 'checking') && (
                <form onSubmit={handleSubmit} className="space-y-3 mt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password" className="text-[9px]">
                      New password
                    </Label>
                    <div className="relative">
                      <KeyRound className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                      <Input
                        id="new-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={status !== 'ready' || isSubmitting}
                        className="pl-6 h-8 text-[10px]"
                        placeholder="Enter a new secure password"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password" className="text-[9px]">
                      Confirm password
                    </Label>
                    <div className="relative">
                      <KeyRound className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        disabled={status !== 'ready' || isSubmitting}
                        className="pl-6 h-8 text-[10px]"
                        placeholder="Type it again to confirm"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={status !== 'ready' || isSubmitting}
                    className="w-full h-8 text-[10px] font-semibold"
                  >
                    {isSubmitting ? 'Updating password...' : 'Reset Password'}
                  </Button>

                  {status === 'checking' && (
                    <p className="text-[9px] text-muted-foreground text-center mt-1">
                      Verifying reset link...
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
