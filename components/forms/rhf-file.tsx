import React, { useRef } from 'react';
import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Upload, X, File } from 'lucide-react';

interface RHFFileProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  accept?: string;
  multiple?: boolean;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  maxSize?: number; // in bytes
}

export function RHFFile<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  name,
  label,
  accept,
  multiple,
  className,
  disabled,
  required,
  maxSize = 5 * 1024 * 1024, // 5MB default
}: RHFFileProps<TFieldValues, TName>) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => {
        const files = field.value as FileList | File[] | null;
        const fileArray = files ? Array.from(files) : [];

        const handleFilesChange = (newFiles: FileList | null) => {
          if (!newFiles) {
            field.onChange(null);
            return;
          }

          // Validate file sizes
          const validFiles = Array.from(newFiles).filter(file => {
            if (file.size > maxSize) {
              return false;
            }
            return true;
          });

          if (multiple) {
            field.onChange(validFiles);
          } else {
            field.onChange(validFiles.length > 0 ? validFiles[0] : null);
          }
        };

        const removeFile = (index: number) => {
          const newFiles = fileArray.filter((_, i) => i !== index);
          field.onChange(multiple ? newFiles : null);
        };

        return (
          <div className={cn("space-y-2", className)}>
            <label className="block text-sm font-medium text-slate-300">
              {label}
              {required && <span className="text-red-400 ml-1">*</span>}
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              multiple={multiple}
              className="hidden"
              onChange={(e) => handleFilesChange(e.target.files)}
              disabled={disabled}
            />

            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-6 transition-colors",
                "border-slate-700 hover:border-cyan-400/50",
                error && "border-red-500",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="text-center">
                <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFileSelect}
                  disabled={disabled}
                  className="mb-2"
                >
                  Selecionar arquivo{multiple ? 's' : ''}
                </Button>
                <p className="text-xs text-slate-400">
                  {accept ? `Formatos aceitos: ${accept}` : 'Todos os formatos'}
                  <br />
                  Tamanho máximo: {formatFileSize(maxSize)}
                </p>
              </div>
            </div>

            {/* File Preview */}
            {fileArray.length > 0 && (
              <div className="space-y-2">
                {fileArray.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                  >
                    <div className="flex items-center space-x-2">
                      {file.type?.startsWith('image/') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-8 h-8 object-cover rounded"
                        />
                      ) : (
                        <File className="w-8 h-8 text-slate-400" />
                      )}
                      <div>
                        <p className="text-sm text-slate-200 font-medium">
                          {file.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error.message}
              </p>
            )}
          </div>
        );
      }}
    />
  );
}