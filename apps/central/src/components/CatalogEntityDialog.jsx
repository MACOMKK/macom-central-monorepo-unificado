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

function resolveFieldProp(field, propName, formState, record) {
  const propValue = field[propName];
  return typeof propValue === 'function' ? propValue(formState, record) : propValue;
}

function keepOnlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function formatFieldValue(field, value) {
  if (value === null || value === undefined) {
    if (field.defaultValue !== undefined) {
      return String(field.defaultValue);
    }
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

function isMissingRequiredValue(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function getFieldValidationMessage(field, value, formState, record) {
  if (!field.validate) return '';
  return field.validate(value, formState, record) || '';
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
  const [validationMessage, setValidationMessage] = useState('');

  useEffect(() => {
    if (open) {
      setFormState(createInitialState(fields, record));
      setValidationMessage('');
    }
  }, [fields, open, record]);

  const handleChange = (key, value) => {
    setValidationMessage('');
    setFormState((current) => {
      const field = fields.find((item) => item.key === key);
      let nextValue = value;

      if (field?.digitsOnly) {
        nextValue = keepOnlyDigits(value);
      }

      if (field?.maxLength && typeof nextValue === 'string') {
        nextValue = nextValue.slice(0, field.maxLength);
      }

      return { ...current, [key]: nextValue };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = normalizePayload(fields, formState);
    const missingField = fields.find((field) => field.required && isMissingRequiredValue(payload[field.key]));

    if (missingField) {
      setValidationMessage(`Preencha o campo obrigatorio: ${resolveFieldProp(missingField, 'label', formState, record)}.`);
      return;
    }

    const invalidField = fields.find((field) => getFieldValidationMessage(field, payload[field.key], payload, record));

    if (invalidField) {
      setValidationMessage(getFieldValidationMessage(invalidField, payload[invalidField.key], payload, record));
      return;
    }

    try {
      await onSubmit(payload);
    } catch (error) {
      setValidationMessage(error?.message || 'Nao foi possivel salvar o registro.');
    }
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
              <Label htmlFor={field.key}>
                {resolveFieldProp(field, 'label', formState, record)}
                {field.required ? ' *' : ''}
              </Label>
              {field.type === 'select' ? (
                <Select
                  value={formState[field.key]}
                  onValueChange={(value) => handleChange(field.key, value)}
                  disabled={field.disabled}
                >
                  <SelectTrigger id={field.key} className={`mt-2 ${field.inputClassName || ''}`.trim()} disabled={field.disabled}>
                    <SelectValue placeholder={resolveFieldProp(field, 'placeholder', formState, record) || 'Selecione'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.allowEmpty ? [{ value: EMPTY_SELECT_VALUE, label: field.emptyLabel || 'Nenhum' }] : []).concat(resolveFieldProp(field, 'options', formState, record) || []).map((option) => (
                      <SelectItem key={`${field.key}-${option.value || 'empty'}`} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === 'textarea' ? (
                <textarea
                  id={field.key}
                  value={formState[field.key]}
                  onChange={(event) => handleChange(field.key, event.target.value)}
                  className={`mt-2 min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${field.inputClassName || ''}`.trim()}
                  placeholder={resolveFieldProp(field, 'placeholder', formState, record)}
                  required={field.required}
                  disabled={field.disabled}
                  maxLength={field.maxLength}
                />
              ) : (
                <Input
                  id={field.key}
                  type={field.type === 'date' ? 'date' : field.type === 'password' ? 'password' : 'text'}
                  value={formState[field.key]}
                  onChange={(event) => handleChange(field.key, event.target.value)}
                  className={`mt-2 ${field.inputClassName || ''}`.trim()}
                  placeholder={resolveFieldProp(field, 'placeholder', formState, record)}
                  required={field.required}
                  disabled={field.disabled}
                  inputMode={field.inputMode}
                  maxLength={field.maxLength}
                />
              )}
            </div>
          ))}

          {validationMessage ? <p className="sm:col-span-2 text-sm font-medium text-destructive">{validationMessage}</p> : null}

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
