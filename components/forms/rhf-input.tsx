import React from 'react';
import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface RHFInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number';
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export function RHFInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  name,
  label,
  placeholder,
  type = 'text',
  className,
  disabled,
  required,
}: RHFInputProps<TFieldValues, TName>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => (
        <div className={cn("space-y-2", className)}>
          <label
            htmlFor={name}
            className="block text-sm font-medium text-slate-300"
          >
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
          <Input
            {...field}
            id={name}
            type={type}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "focus-ring",
              error && "border-red-500 focus:border-red-500 focus:ring-red-500/50"
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${name}-error` : undefined}
          />
          {error && (
            <p
              id={`${name}-error`}
              className="text-sm text-red-400"
              role="alert"
            >
              {error.message}
            </p>
          )}
        </div>
      )}
    />
  );
}