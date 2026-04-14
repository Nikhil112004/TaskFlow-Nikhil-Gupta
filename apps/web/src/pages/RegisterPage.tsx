import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAppSelector } from '../store';
import AuthLayout from '../components/auth/AuthLayout';
import { Input, FormField } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const authLoading  = useAppSelector((s) => s.auth.loading);

  const [form,   setForm]   = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim())          errs.name     = 'Name is required';
    if (!form.email)                errs.email    = 'Email is required';
    if (form.password.length < 8)   errs.password = 'Must be at least 8 characters';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    try {
      await register(form.name.trim(), form.email, form.password);
      navigate('/projects', { replace: true });
    } catch (err: unknown) {
      const e = err as Error & { fields?: Record<string, string> };
      if (e.fields) setErrors(e.fields);
      else setErrors({ general: 'Registration failed. Please try again.' });
    }
  };

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Start managing your projects with TaskFlow"
      footer={<>Already have an account? <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Name" htmlFor="name">
          <Input id="name" placeholder="Jane Smith" value={form.name}
            onChange={set('name')} error={errors.name} autoComplete="name" autoFocus />
        </FormField>
        <FormField label="Email" htmlFor="email">
          <Input id="email" type="email" placeholder="you@example.com" value={form.email}
            onChange={set('email')} error={errors.email} autoComplete="email" />
        </FormField>
        <FormField label="Password" htmlFor="password">
          <Input id="password" type="password" placeholder="Min. 8 characters" value={form.password}
            onChange={set('password')} error={errors.password} autoComplete="new-password" />
        </FormField>
        {errors.general && <p className="text-sm text-destructive text-center">{errors.general}</p>}
        <Button type="submit" loading={authLoading} className="w-full mt-2">Create account</Button>
      </form>
    </AuthLayout>
  );
}
