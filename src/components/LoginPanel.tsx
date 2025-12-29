import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { apiService } from '@/services/api';
import { KeyRound, User, Mail } from 'lucide-react';
import { useLanguage } from '@/lib/languageStore';

interface LoginPanelProps {
  onLoginSuccess: (token: string, user: { id: string; username: string; email?: string }) => void;
}

export function LoginPanel({ onLoginSuccess }: LoginPanelProps) {
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [forgotMode, setForgotMode] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Forgot password flow
      if (forgotMode) {
        if (!email.trim()) {
          throw new Error('Please enter your email address.');
        }

        await apiService.forgotPassword(email.trim());
        toast.success('If an account exists for this email, a reset link has been sent.');
        setForgotMode(false);
        setIsLogin(true);
        return;
      }

      // Login / Register flow
      if (isLogin) {
        const result = await apiService.login(username, password);
        if (result.success && result.token && result.user) {
          localStorage.setItem('auth_token', result.token);
          if (result.refreshToken) {
            localStorage.setItem('auth_refresh_token', result.refreshToken);
          }
          localStorage.setItem('auth_user', JSON.stringify(result.user));
          toast.success('Logged in successfully!');
          onLoginSuccess(result.token, result.user);
        } else {
          throw new Error(result.error || 'Login failed');
        }
      } else {
        const result = await apiService.register(username, password, email || undefined);
        if (result.success) {
          toast.success(
            'Account created! Please check your email and confirm your account before logging in.'
          );
          setIsLogin(true);
        } else {
          throw new Error(result.error || 'Registration failed');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const showRegisterFields = !forgotMode && !isLogin;
  const showPasswordField = !forgotMode;

  return (
    <div className="glass-card rounded-xl p-3 max-w-xs mx-auto mt-4">
      <h3 className="text-[10px] text-primary uppercase tracking-wider font-bold text-center mb-3">
        {forgotMode ? 'FORGOT PASSWORD' : isLogin ? t('login.title') : t('login.createTitle')}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-2">
        {!forgotMode && (
          <div>
            <Label className="text-[8px] uppercase tracking-wide opacity-80">
              {t('login.username')}
            </Label>
            <div className="relative mt-1">
              <User className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('login.usernamePlaceholder')}
                className="h-7 text-[9px] pl-7 bg-card/60 border-border/30"
                required
              />
            </div>
          </div>
        )}

        {/* Registration email field (for sign up) */}
        {showRegisterFields && (
          <div>
            <Label className="text-[8px] uppercase tracking-wide opacity-80">
              {t('login.email')}{' '}
              <span className="text-[7px] opacity-60">
                {t('login.emailOptional')}
              </span>
            </Label>
            <div className="relative mt-1">
              <Mail className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.emailPlaceholder')}
                className="h-7 text-[9px] pl-7 bg-card/60 border-border/30"
                required
              />
            </div>
            <p className="text-[7px] text-muted-foreground mt-0.5">
              {t('login.emailHint')}
            </p>
          </div>
        )}

        {/* Forgot password email field */}
        {forgotMode && (
          <div>
            <Label className="text-[8px] uppercase tracking-wide opacity-80">
              Email
            </Label>
            <div className="relative mt-1">
              <Mail className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your account email..."
                className="h-7 text-[9px] pl-7 bg-card/60 border-border/30"
                required
              />
            </div>
            <p className="text-[7px] text-muted-foreground mt-0.5">
              We&apos;ll send a password reset link to this address.
            </p>
          </div>
        )}

        {showPasswordField && (
          <div>
            <Label className="text-[8px] uppercase tracking-wide opacity-80">
              {t('login.password')}
            </Label>
            <div className="relative mt-1">
              <KeyRound className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.passwordPlaceholder')}
                className="h-7 text-[9px] pl-7 bg-card/60 border-border/30"
                required
              />
            </div>
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-7 text-[9px] mt-1"
          disabled={loading}
        >
          {loading
            ? t('login.loading')
            : forgotMode
            ? 'SEND RESET LINK'
            : isLogin
            ? t('login.loginButton')
            : t('login.registerButton')}
        </Button>
      </form>

      {/* Footer controls */}
      <div className="mt-2 space-y-1">
        {!forgotMode && (
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-[7px] text-primary hover:underline"
          >
            {isLogin ? t('login.noAccount') : t('login.hasAccount')}
          </button>
        )}

        {isLogin && !forgotMode && (
          <button
            type="button"
            onClick={() => {
              setForgotMode(true);
              setIsLogin(true);
            }}
            className="w-full text-[7px] text-muted-foreground hover:underline"
          >
            Forgot password?
          </button>
        )}

        {forgotMode && (
          <button
            type="button"
            onClick={() => {
              setForgotMode(false);
              setIsLogin(true);
            }}
            className="w-full text-[7px] text-primary hover:underline"
          >
            Back to login
          </button>
        )}
      </div>
    </div>
  );
}
