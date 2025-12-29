import { useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner, toast } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Index from './pages/Index';
import ClaimPage from './pages/ClaimPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import NotFound from './pages/NotFound';
import { apiService } from '@/services/api';

const queryClient = new QueryClient();

function parseSupabaseCallback(location: ReturnType<typeof useLocation>) {
  const searchParams = new URLSearchParams(location.search);
  const hashParams =
    location.hash && location.hash.startsWith('#')
      ? new URLSearchParams(location.hash.slice(1))
      : null;

  const type = searchParams.get('type') || hashParams?.get('type') || null;
  const message = searchParams.get('message') || hashParams?.get('message') || null;

  return { type, message };
}

function AuthCallbackNotifier() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const { type, message } = parseSupabaseCallback(location);
    if (!type && !message) return;

    const lowerMessage = message?.toLowerCase() || '';

    // --- Signup confirmation ---
    if (type === 'signup') {
      toast.success('Email confirmed. You can now log in.');
      return;
    }

    // --- Password recovery link ---
    if (type === 'recovery') {
      // If Supabase sent us a recovery link, ensure we are on the reset-password route
      if (location.pathname !== '/reset-password') {
        const targetPath = `/reset-password${location.search}${location.hash}`;
        navigate(targetPath, { replace: true });
      }
      return;
    }

    // --- Halfway through "confirm both emails" flow ---
    // Example: "Confirmation link accepted. Please proceed to confirm link sent to the other email"
    if (message && lowerMessage.includes('other email')) {
      toast.info(
        'First confirmation accepted. Please click the confi...on link sent to your other email address to finish the change.'
      );
      return;
    }

    // --- Email change complete (or final callback without explicit type) ---
    if (type === 'email_change' || (message && !lowerMessage.includes('other email'))) {
      toast.success('Email address updated successfully.');

      const token = localStorage.getItem('auth_token');
      if (token) {
        apiService
          .finalizeEmailChange(token)
          .then((result) => {
            if (result.success && result.user) {
              try {
                const existingRaw = localStorage.getItem('auth_user');
                if (existingRaw) {
                  const existing = JSON.parse(existingRaw);
                  const updated = { ...existing, ...result.user };
                  localStorage.setItem('auth_user', JSON.stringify(updated));
                } else {
                  localStorage.setItem('auth_user', JSON.stringify(result.user));
                }
              } catch {
                // ignore localStorage parse errors
              }
            }
          })
          .catch(() => {
            // If this fails, Supabase has still done its thing auth-side.
            // We at least showed the success toast.
          });
      }

      return;
    }
  }, [location.key, location.search, location.hash, navigate]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthCallbackNotifier />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/claim" element={<ClaimPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          {/* All custom routes above this */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
