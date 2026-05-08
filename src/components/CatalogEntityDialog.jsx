import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const EMPTY_SELECT_VALUE = '__empty__';

function formatFieldValue(field, value) {
  if (value === null || value === undefined) {
    return field.valueType === 'boolean' ? 'true' : '';
  }

  if (field.type === 'date') {
    if (typeof value === 'string') {
      return value.slice(0, 10);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }

  return String(value);
}

const createInitialState = (fields, record) =>
  fields.reduce((acc, field) => {
    const value = record?.[field.key];
    acc[field.key] = formatFieldValue(field, value);
    return acc;
  }, {});

function normalizePayload(fields, formState) {
  return fields.reduce((acc, field) => {
    let value = formState[field.key];
    if (value === EMPTY_SELECT_VALUE) {
      value = '';
    }
    if (field.valueType === 'boolean') {
      acc[field.key] = value === 'true';
      return acc;
    }
    if (value === '') {
      acc[field.key] = null;
      return acc;
    }
    acc[field.key] = value;
    return acc;
  }, {});
}

export default function CatalogEntityDialog({
  open,
  onOpenChange,
  title,
  description,
  record,
  fields,
  onSubmit,
  loading,
  submitLabel,
  cancelLabel,
  dialogClassName,
  formClassName,
  footerClassName,
  submitButtonClassName,
  cancelButtonClassName,
  hideDescription,
}) {
  const [formState, setFormState] = useState(() => createInitialState(fields, record));

  useEffect(() => {
    if (open) {
      setFormState(createInitialState(fields, record));
    }
  }, [fields, open, record]);

  const handleChange = (key, value) => {
    setFormState((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit(normalizePayload(fields, formState));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogClassName || 'sm:max-w-2xl'}>
        <DialogHeader className={hideDescription ? 'space-y-0' : ''}>
          <DialogTitle>{title}</DialogTitle>
          {hideDescription ? null : <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form className={formClassName || 'grid gap-4 sm:grid-cols-2'} onSubmit={handleSubmit}>
          {fields.map((field) => (
            <div key={field.key} className={field.fullWidth ? 'sm:col-span-2' : field.halfWidth ? 'sm:col-span-1' : ''}>
              <Label htmlFor={field.key}>{field.label}</Label>
              {field.type === 'select' ? (
                <Select value={formState[field.key]} onValueChange={(value) => handleChange(field.key, value)}>
                  <SelectTrigger id={field.key} className={`mt-2 ${field.inputClassName || ''}`.trim()}>
                    <SelectValue placeholder={field.placeholder || 'Selecione'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.allowEmpty ? [{ value: EMPTY_SELECT_VALUE, label: field.emptyLabel || 'Nenhum' }] : []).concat(field.options || []).map((option) => (
                      <SelectItem key={`${field.key}-${option.value || 'empty'}`} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={field.key}
                  type={field.type === 'date' ? 'date' : field.type === 'password' ? 'password' : 'text'}
                  value={formState[field.key]}
                  onChange={(event) => handleChange(field.key, event.target.value)}
                  className={`mt-2 ${field.inputClassName || ''}`.trim()}
                  placeholder={field.placeholder}
                  required={field.required}
                  disabled={field.disabled}
                />
              )}
            </div>
          ))}

          <DialogFooter className={`sm:col-span-2 ${footerClassName || ''}`.trim()}>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className={cancelButtonClassName}
            >
              {cancelLabel || 'Cancelar'}
            </Button>
            <Button type="submit" disabled={loading} className={submitButtonClassName}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel || (record ? 'Salvar' : 'Criar')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
