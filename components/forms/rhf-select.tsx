import React from 'react';
import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
}

interface RHFSelectProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  placeholder?: string;
  options: Option[];
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export function RHFSelect<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  name,
  label,
  placeholder = 'Selecione uma opção',
  options,
  className,
  disabled,
  required,
}: RHFSelectProps<TFieldValues, TName>) {
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
          <Select
            value={field.value}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <SelectTrigger
              className={cn(
                "focus-ring",
                error && "border-red-500 focus:border-red-500 focus:ring-red-500/50"
              )}
              aria-invalid={!!error}
              aria-describedby={error ? `${name}-error` : undefined}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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