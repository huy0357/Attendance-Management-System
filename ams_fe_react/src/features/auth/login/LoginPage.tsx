import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AlertCircle, CheckCircle, Eye, EyeOff, Lock, User, Check, ArrowLeft } from 'lucide-react';
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
function getHeading(mode: AuthMode): string {
  switch (mode) {
    case 'login':   return 'Welcome back';
    case 'forgot':  return 'Forgot password';
    case 'verify':  return 'Verify OTP';
    case 'reset':   return 'Reset password';
  }
}

function getSubheading(mode: AuthMode): string {
  switch (mode) {
    case 'login':   return 'Sign in to access your dashboard';
    case 'forgot':  return 'Send an OTP to your account email';
    case 'verify':  return 'Enter the OTP sent by the backend email flow';
    case 'reset':   return 'Set a new password using the verified OTP';
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
const LoginPage: React.FC = () => {
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
      const role = authData.role?.toUpperCase().replace(/^ROLE_/, '') || '';
      if (role === 'ADMIN' || role === 'MANAGER') {
        navigate('/dashboard');
      } else {
        navigate('/hrm/employee-portal');
      }
    } catch {
      setError('Login failed. Please check your credentials.');
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
    if (!email) { setError('Please enter your email address.'); return; }
    setForgotEmail(email);
    setIsLoading(true);
    try {
      const res = await forgotPassword(email);
      setSuccess(res.message);
      setAuthMode('verify');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Unable to send OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otp = getValues('password').trim();
    clearMessages();
    if (!forgotEmail || !otp) { setError('Please enter email and OTP.'); return; }
    setIsLoading(true);
    try {
      const res = await verifyOtp(forgotEmail, otp);
      setSuccess(res.message);
      setVerifiedOtp(otp);
      setValue('password', '');
      setAuthMode('reset');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'OTP verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const newPassword = getValues('password').trim();
    clearMessages();
    if (newPassword.length < 6) { setError('New password must be at least 6 characters.'); return; }
    setIsLoading(true);
    try {
      const res = await resetPassword(forgotEmail, verifiedOtp, newPassword);
      setSuccess(res.message);
      setAuthMode('login');
      resetForm({ username: forgotEmail, password: '', rememberMe: false });
      setVerifiedOtp('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Unable to reset password.');
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
          <p className={styles.brandSub}>Attendance &amp; HR Management System</p>
        </div>

        {/* ── Card ── */}
        <div className={styles.card}>
          {/* Mode heading */}
          <div className={styles.cardHeading}>
            <h2 className={styles.heading}>{getHeading(authMode)}</h2>
            <p className={styles.subheading}>{getSubheading(authMode)}</p>
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
                {authMode === 'login' ? 'Username' : 'Account Email'}
              </label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}><User size={16} /></span>
                <input
                  id="username"
                  type="text"
                  placeholder="username"
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
                {authMode === 'login' ? 'Password' : authMode === 'verify' ? 'OTP Code' : 'New Password'}
              </label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}><Lock size={16} /></span>
                <input
                  id="password"
                  type={authMode === 'verify' ? 'text' : showPassword ? 'text' : 'password'}
                  placeholder={authMode === 'verify' ? 'Enter 6-digit OTP' : 'Enter your password'}
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
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={openForgotPassword}
                  disabled={isLoading}
                  className={styles.forgotBtn}
                >
                  Forgot password?
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
                    Signing in…
                  </>
                ) : (
                  <>
                    <Check size={17} />
                    Sign In
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
                {isLoading ? 'Sending OTP…' : 'Send OTP'}
              </button>
            )}

            {authMode === 'verify' && (
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={isLoading}
                className={styles.btnPrimary}
              >
                {isLoading ? 'Verifying…' : 'Verify OTP'}
              </button>
            )}

            {authMode === 'reset' && (
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={isLoading}
                className={styles.btnPrimary}
              >
                {isLoading ? 'Resetting…' : 'Reset Password'}
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
                Back to Login
              </button>
            )}
          </form>
        </div>

        {/* Footer */}
        <p className={styles.footer}>
          &copy; {new Date().getFullYear()} AMS Core — All rights reserved
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
