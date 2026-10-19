'use client';

import { useState } from 'react';

import { TextField, type TextFieldProps } from './TextField';

export type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'trailingAddon'>;

export function PasswordField(props: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <TextField
      {...props}
      type={isVisible ? 'text' : 'password'}
      trailingAddon={
        <button
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          aria-label={isVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          className="text-slate-400 transition-colors hover:text-neon-cyan"
        >
          {isVisible ? '🙈' : '👁'}
        </button>
      }
    />
  );
}
