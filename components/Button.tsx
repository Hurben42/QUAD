import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react';
type Variant = 'primary' | 'secondary' | 'ghost';
const cls = (v: Variant, sm?: boolean, extra?: string) => ['q-btn', `q-btn--${v}`, sm && 'q-btn--sm', extra].filter(Boolean).join(' ');

export function Button({ variant = 'primary', sm, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; sm?: boolean }) {
  return <button className={cls(variant, sm, className)} {...rest} />;
}
export function LinkButton({ variant = 'primary', sm, className, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; sm?: boolean }) {
  return <a className={cls(variant, sm, className)} {...rest} />;
}
