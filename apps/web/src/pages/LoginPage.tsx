import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAppSelector } from '../store';
import AuthLayout from '../components/auth/AuthLayout';
import { Input, FormField } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export default function LoginPage() {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const authLoading = useAppSelector((s) => s.auth.loading);

  const [form,   setForm]   = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.email)    errs.email    = 'Email is required';
    if (!form.password) errs.password = 'Password is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    try {
      await login(form.email, form.password);
      navigate('/projects', { replace: true });
    } catch {
      setErrors({ password: 'Invalid email or password' });
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your TaskFlow account"
      footer={<>Don't have an account? <Link to="/register" className="text-primary hover:underline font-medium">Create one</Link></>}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Email" htmlFor="email">
          <Input id="email" type="email" placeholder="you@example.com" value={form.email}
            onChange={set('email')} error={errors.email} autoComplete="email" autoFocus />
        </FormField>
        <FormField label="Password" htmlFor="password">
          <Input id="password" type="password" placeholder="••••••••" value={form.password}
            onChange={set('password')} error={errors.password} autoComplete="current-password" />
        </FormField>
        <Button type="submit" loading={authLoading} className="w-full mt-2">Sign in</Button>
      </form>
    </AuthLayout>
  );
}
