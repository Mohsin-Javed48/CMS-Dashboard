'use client';

import React, { useState } from 'react';

export default function LoginForm({ onLogin }: { onLogin: (email: string, password: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onLogin(email.trim(), password);
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-semibold text-slate-700">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          placeholder="name@univ.edu"
          className="cms-input mt-1"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700">Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          placeholder="Enter your password"
          className="cms-input mt-1"
        />
      </div>
      <div>
        <button className="cms-button cms-button-primary w-full">Login</button>
      </div>
      <div className="text-xs text-slate-500">Tip: use an email containing "teacher" to login as teacher.</div>
    </form>
  );
}
