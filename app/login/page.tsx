'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const result = await signIn('credentials', {
      login: formData.get('login'),
      password: formData.get('password'),
      redirect: false,
    });

    if (result?.error) {
      setError('Неверный логин или пароль');
    } else {
      router.push('/ads');
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">Ads Dashboard</h1>
        <p className="login-subtitle">Войдите для продолжения</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login">Логин</label>
            <input type="text" id="login" name="login" required autoFocus />
          </div>

          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <input type="password" id="password" name="password" required />
          </div>

          <button type="submit" className="btn">Войти</button>
        </form>
      </div>
    </div>
  );
}
