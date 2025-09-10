import React from 'react';
import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form';
import InputMask from 'react-input-mask';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface RHFMaskedInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  mask: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export function RHFMaskedInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  name,
  label,
  mask,
  placeholder,
  className,
  disabled,
  required,
}: RHFMaskedInputProps<TFieldValues, TName>) {
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
          <InputMask
            {...field}
            mask={mask}
            disabled={disabled}
            placeholder={placeholder}
          >
            {() => (
              <Input
                id={name}
                className={cn(
                  "focus-ring",
                  error && "border-red-500 focus:border-red-500 focus:ring-red-500/50"
                )}
                aria-invalid={!!error}
                aria-describedby={error ? `${name}-error` : undefined}
              />
            )}
          </InputMask>
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