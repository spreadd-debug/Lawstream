import React from 'react';
import { cn } from '../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className }) => {
  const variants = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    error: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
    info: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
    outline: 'bg-transparent border border-border text-muted-foreground',
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.15em]',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
};

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={cn(
        'bg-card border border-border rounded-2xl shadow-sm overflow-hidden transition-all',
        onClick && 'cursor-pointer hover:border-primary/40 hover:shadow-lg active:scale-[0.98]',
        className
      )}
    >
      {children}
    </div>
  );
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className,
  ...props 
}) => {
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/10',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border border-border bg-transparent text-foreground hover:bg-muted',
    ghost: 'text-muted-foreground hover:text-foreground hover:bg-muted',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/10',
  };

  const sizes = {
    sm: 'px-4 py-2 text-[10px] tracking-[0.1em]',
    md: 'px-5 py-2.5 text-xs tracking-[0.05em]',
    lg: 'px-8 py-4 text-sm tracking-[0.05em]',
  };

  return (
    <button 
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-black uppercase transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:pointer-events-none active:scale-95',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Input: React.FC<InputProps> = ({ className, ...props }) => {
  return (
    <input
      className={cn(
        'w-full px-4 py-2 bg-muted/50 border border-border/50 rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all outline-none',
        className
      )}
      {...props}
    />
  );
};

// ── MoneyInput ───────────────────────────────────────────────────

interface MoneyInputProps {
  value: string | number;
  onChange: (raw: string) => void;
  currency?: 'ARS' | 'USD';
  onCurrencyChange?: (c: 'ARS' | 'USD') => void;
  showCurrencySelector?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function formatMoneyDisplay(raw: string | number): string {
  const num = typeof raw === 'number' ? raw : parseFloat(raw.replace(/\./g, '').replace(',', '.'));
  if (isNaN(num) || num === 0) return '';
  const [intPart, decPart] = num.toFixed(2).split('.');
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decPart === '00' ? formatted : `${formatted},${decPart}`;
}

function parseMoneyInput(display: string): string {
  return display.replace(/\./g, '').replace(',', '.');
}

export const MoneyInput: React.FC<MoneyInputProps> = ({
  value,
  onChange,
  currency = 'ARS',
  onCurrencyChange,
  showCurrencySelector = false,
  placeholder,
  className,
  disabled,
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const [displayValue, setDisplayValue] = React.useState('');

  React.useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatMoneyDisplay(value));
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    const raw = typeof value === 'number' ? (value === 0 ? '' : value.toString()) : value;
    setDisplayValue(raw);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseMoneyInput(displayValue);
    onChange(parsed);
    setDisplayValue(formatMoneyDisplay(parsed));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (isFocused) {
      // While focused, allow raw number typing
      if (/^[\d]*[,.]?[\d]{0,2}$/.test(v) || v === '') {
        setDisplayValue(v);
        onChange(v.replace(',', '.'));
      }
    }
  };

  const symbol = currency === 'USD' ? 'US$' : '$';

  return (
    <div className={cn('flex items-center gap-0', className)}>
      {showCurrencySelector && onCurrencyChange && (
        <select
          value={currency}
          onChange={e => onCurrencyChange(e.target.value as 'ARS' | 'USD')}
          disabled={disabled}
          className="h-11 px-2 bg-muted border border-r-0 border-border/50 rounded-l-xl text-xs font-black text-muted-foreground focus:outline-none appearance-none cursor-pointer"
        >
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
      )}
      <div className={cn('relative flex-1', showCurrencySelector ? '' : '')}>
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground pointer-events-none">
          {symbol}
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder || '0'}
          className={cn(
            'w-full pl-8 pr-4 py-2 h-11 bg-muted/50 border border-border/50 text-sm font-bold text-right focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all outline-none tabular-nums',
            showCurrencySelector ? 'rounded-r-xl' : 'rounded-xl',
          )}
        />
      </div>
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ className, ...props }) => {
  return (
    <textarea
      className={cn(
        'w-full px-4 py-3 bg-muted/50 border border-border/50 rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all outline-none min-h-[100px]',
        className
      )}
      {...props}
    />
  );
};

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
  className?: string;
}

export const Label: React.FC<LabelProps> = ({ children, className, ...props }) => {
  return (
    <label 
      className={cn(
        'text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1',
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
};

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  preventBackdropClose?: boolean;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  preventBackdropClose = false,
}) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={preventBackdropClose ? undefined : onClose}
      />
      <div className={cn(
        "relative w-full bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300",
        sizes[size]
      )}>
        <header className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tighter text-foreground">{title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-all"
          >
            <XIcon size={20} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
        {footer && (
          <footer className="p-6 border-t border-border bg-muted/30">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden">
        <header className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-black tracking-tighter text-foreground">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-all"
          >
            <XIcon size={20} />
          </button>
        </header>
        <div className="p-6">
          {children}
        </div>
        {footer && (
          <footer className="p-6 border-t border-border bg-muted/30 flex justify-end gap-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: string[];
  className?: string;
}

export const Select: React.FC<SelectProps> = ({ options, className, ...props }) => {
  return (
    <select
      className={cn(
        'w-full px-4 py-2 bg-muted/50 border border-border/50 rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all outline-none',
        className
      )}
      {...props}
    >
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
};

const XIcon = ({ size }: { size?: number }) => (
  <svg 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
