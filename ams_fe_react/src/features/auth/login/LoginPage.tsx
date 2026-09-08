import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AlertCircle, CheckCircle, Eye, EyeOff, Lock, User, Check, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../core/auth/AuthContext';
import styles from './LoginPage.module.scss';

// ── Types ─────────────────────────────────────────────────────────────────────
type AuthMode = 'login' | 'forgot' | 'verify' | 'reset';

interface LoginFormValues {
  username: string;
  password: string;
  rememberMe: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getHeading(mode: AuthMode, t: (k: string) => string): string {
  switch (mode) {
    case 'login':   return t('login.welcomeBack');
    case 'forgot':  return t('login.forgotPasswordTitle');
    case 'verify':  return t('login.verifyOtpTitle');
    case 'reset':   return t('login.resetPasswordTitle');
  }
}

function getSubheading(mode: AuthMode, t: (k: string) => string): string {
  switch (mode) {
    case 'login':   return t('login.signInSubtitle');
    case 'forgot':  return t('login.forgotPasswordSubtitle');
    case 'verify':  return t('login.verifyOtpSubtitle');
    case 'reset':   return t('login.resetPasswordSubtitle');
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { login, forgotPassword, verifyOtp, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [verifiedOtp, setVerifiedOtp] = useState('');

  const { register, handleSubmit, getValues, setValue, reset: resetForm } = useForm<LoginFormValues>({
    defaultValues: { username: '', password: '', rememberMe: false },
  });

  // ── Handlers ─────────────────────────────────────────────────────────────
  const clearMessages = () => { setError(''); setSuccess(''); };

  const onSubmit = async (values: LoginFormValues) => {
    if (authMode !== 'login') return;
    clearMessages();
    setIsLoading(true);
    try {
      const authData = await login({ username: values.username.trim(), password: values.password });
      const rawRole = authData?.role || (Array.isArray((authData as any)?.roles) ? (authData as any).roles[0] : '') || '';
      const role = String(rawRole).toUpperCase().replace(/^ROLE_/, '');
      if (role === 'ADMIN' || role === 'MANAGER' || role === 'HR') {
        navigate('/dashboard');
      } else {
        navigate('/hrm/employee-portal');
      }
    } catch {
      setError(t('login.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const openForgotPassword = () => {
    setAuthMode('forgot');
    clearMessages();
    setForgotEmail(getValues('username').trim());
    setVerifiedOtp('');
    setValue('password', '');
  };

  const backToLogin = () => {
    setAuthMode('login');
    clearMessages();
    setVerifiedOtp('');
    setValue('password', '');
  };

  const sendOtp = async () => {
    const email = getValues('username').trim();
    clearMessages();
    if (!email) { setError(t('login.enterEmail')); return; }
    setForgotEmail(email);
    setIsLoading(true);
    try {
      const res = await forgotPassword(email);
      setSuccess(res.message);
      setAuthMode('verify');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || t('login.sendOtpError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otp = getValues('password').trim();
    clearMessages();
    if (!forgotEmail || !otp) { setError(t('login.enterEmailAndOtp')); return; }
    setIsLoading(true);
    try {
      const res = await verifyOtp(forgotEmail, otp);
      setSuccess(res.message);
      setVerifiedOtp(otp);
      setValue('password', '');
      setAuthMode('reset');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || t('login.verifyOtpError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const newPassword = getValues('password').trim();
    clearMessages();
    if (newPassword.length < 6) { setError(t('login.minPasswordLength')); return; }
    setIsLoading(true);
    try {
      const res = await resetPassword(forgotEmail, verifiedOtp, newPassword);
      setSuccess(res.message);
      setAuthMode('login');
      resetForm({ username: forgotEmail, password: '', rememberMe: false });
      setVerifiedOtp('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || t('login.resetPasswordError'));
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Decorative blobs */}
      <div className={styles.blob1} aria-hidden="true" />
      <div className={styles.blob2} aria-hidden="true" />

      <div className={styles.wrapper}>
        {/* ── Brand ── */}
        <div className={styles.brand}>
          <div className={styles.logoDisc} aria-hidden="true">
            <span className={styles.logoLetter}>A</span>
          </div>
          <h1 className={styles.brandTitle}>
            AMS<span>Core</span>
          </h1>
          <p className={styles.brandSub}>{t('login.brandSub')}</p>
        </div>

        {/* ── Card ── */}
        <div className={styles.card}>
          {/* Mode heading */}
          <div className={styles.cardHeading}>
            <h2 className={styles.heading}>{getHeading(authMode, t)}</h2>
            <p className={styles.subheading}>{getSubheading(authMode, t)}</p>
          </div>

          {/* Mode indicator dots */}
          <div className={styles.modeDots} aria-hidden="true">
            {(['login', 'forgot', 'verify', 'reset'] as AuthMode[]).map((m) => (
              <span
                key={m}
                className={`${styles.modeDot} ${authMode === m ? styles.modeDotActive : ''}`}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className={`${styles.alert} ${styles.alertError}`} role="alert">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className={`${styles.alert} ${styles.alertSuccess}`} role="status">
              <CheckCircle size={15} />
              <span>{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
            {/* Username / Email */}
            <div className={styles.field}>
              <label htmlFor="username" className={styles.label}>
                {authMode === 'login' ? t('login.username') : t('login.accountEmail')}
              </label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}><User size={16} /></span>
                <input
                  id="username"
                  type="text"
                  placeholder={authMode === 'login' ? t('login.usernamePlaceholder') : t('login.accountEmailPlaceholder')}
                  disabled={isLoading || authMode === 'verify' || authMode === 'reset'}
                  {...register('username', { required: true })}
                  className={styles.input}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password / OTP */}
            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>
                {authMode === 'login' ? t('login.password') : authMode === 'verify' ? t('login.otpCode') : t('login.newPassword')}
              </label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}><Lock size={16} /></span>
                <input
                  id="password"
                  type={authMode === 'verify' ? 'text' : showPassword ? 'text' : 'password'}
                  placeholder={authMode === 'verify' ? t('login.otpPlaceholder') : authMode === 'reset' ? t('login.newPasswordPlaceholder') : t('login.passwordPlaceholder')}
                  disabled={isLoading}
                  {...register('password', { required: true })}
                  className={styles.input}
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                />
                {authMode !== 'verify' && (
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    disabled={isLoading}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className={styles.eyeBtn}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
            </div>

            {/* Remember me + Forgot */}
            {authMode === 'login' && (
              <div className={styles.rememberRow}>
                <label className={styles.checkLabel}>
                  <span className={styles.checkWrap}>
                    <input
                      type="checkbox"
                      {...register('rememberMe')}
                      className={styles.checkbox}
                    />
                    <span className={styles.checkBox} aria-hidden="true" />
                  </span>
                  <span>{t('login.rememberMe')}</span>
                </label>
                <button
                  type="button"
                  onClick={openForgotPassword}
                  disabled={isLoading}
                  className={styles.forgotBtn}
                >
                  {t('login.forgotPassword')}
                </button>
              </div>
            )}

            {/* Submit buttons — switch by authMode */}
            {authMode === 'login' && (
              <button
                type="submit"
                disabled={isLoading}
                className={`${styles.btnPrimary} ${isLoading ? styles.btnLoading : ''}`}
              >
                {isLoading ? (
                  <>
                    <div className={styles.spinner} />
                    {t('login.signingIn')}
                  </>
                ) : (
                  <>
                    <Check size={17} />
                    {t('login.signIn')}
                  </>
                )}
              </button>
            )}

            {authMode === 'forgot' && (
              <button
                type="button"
                onClick={sendOtp}
                disabled={isLoading}
                className={styles.btnPrimary}
              >
                {isLoading ? t('login.sendingOtp') : t('login.sendOtp')}
              </button>
            )}

            {authMode === 'verify' && (
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={isLoading}
                className={styles.btnPrimary}
              >
                {isLoading ? t('login.verifying') : t('login.verifyOtp')}
              </button>
            )}

            {authMode === 'reset' && (
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={isLoading}
                className={styles.btnPrimary}
              >
                {isLoading ? t('login.resetting') : t('login.resetPassword')}
              </button>
            )}

            {/* Back to Login */}
            {authMode !== 'login' && (
              <button
                type="button"
                onClick={backToLogin}
                disabled={isLoading}
                className={styles.btnBack}
              >
                <ArrowLeft size={15} />
                {t('login.backToLogin')}
              </button>
            )}
          </form>
        </div>

        {/* Footer */}
        <p className={styles.footer}>
          {t('login.copyright', { year: new Date().getFullYear() })}
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
