import { useId } from 'react';

interface InputFieldProps {
  label: string;
  value: number | string;
  onChange: (value: number | string) => void;
  type?: 'number' | 'text' | 'currency' | 'percent';
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  disabled?: boolean;
}

export function InputField({
  label,
  value,
  onChange,
  type = 'number',
  min,
  max,
  step = 1,
  prefix,
  suffix,
  disabled = false,
}: InputFieldProps) {
  const id = useId();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (type === 'text') {
      onChange(e.target.value);
    } else {
      const numValue = parseFloat(e.target.value) || 0;
      onChange(numValue);
    }
  };

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="corporate-label">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type={type === 'text' ? 'text' : 'number'}
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={`corporate-input ${prefix ? 'pl-10' : ''} ${suffix ? 'pr-10' : ''}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
