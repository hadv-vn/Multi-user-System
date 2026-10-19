import { PASSWORD_RULE_HINT_TEXT } from '@/lib/validation/password-rules';

export interface PasswordRuleHintProps {
  className?: string;
}

export function PasswordRuleHint({ className = '' }: PasswordRuleHintProps) {
  return <p className={`mt-1.5 text-xs text-slate-500 ${className}`}>{PASSWORD_RULE_HINT_TEXT}</p>;
}
