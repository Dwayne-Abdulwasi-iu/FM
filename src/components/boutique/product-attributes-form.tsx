'use client';

import { AttributeField } from '@/lib/boutique/product-attributes';

interface ProductAttributesFormProps {
  fields: AttributeField[];
  values: Record<string, string | number | readonly string[] | undefined>;
  onChange: (key: string, value: string | number | readonly string[] | undefined) => void;
}

export function ProductAttributesForm({
  fields,
  values,
  onChange,
}: ProductAttributesFormProps) {
  if (!fields || fields.length === 0) {
    return null;
  }

  return (
    <>
      {fields.map((field) => (
        <div key={field.key} className="mb-4 sm:mb-6">
          {/* Label */}
          <label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500"> *</span>}
          </label>

          {/* Text Input */}
          {field.type === 'text' && (
            <>
              <input
                type="text"
                value={values[field.key] || ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm text-gray-900 placeholder:text-gray-400"
              />
            </>
          )}

          {/* Number Input */}
          {field.type === 'number' && (
            <>
              <input
                type="number"
                value={values[field.key] || ''}
                onChange={(e) => onChange(field.key, e.target.value ? parseFloat(e.target.value) : '')}
                placeholder={field.placeholder}
                min={field.min}
                max={field.max}
                className="w-full px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm text-gray-900 placeholder:text-gray-400"
              />
            </>
          )}

          {/* Select */}
          {field.type === 'select' && field.options && (
            <>
              <select
                value={values[field.key] || ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="w-full px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm text-gray-900"
              >
                <option value="" className="text-gray-900">
                  Select {field.label.toLowerCase()}
                </option>
                {field.options.map((option) => (
                  <option key={option.value} value={option.value} className="text-gray-900">
                    {option.label}
                  </option>
                ))}
              </select>
            </>
          )}

          {/* Multiline Textarea */}
          {field.type === 'multiline' && (
            <>
              <textarea
                value={values[field.key] || ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                className="w-full px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm text-gray-900 placeholder:text-gray-400 resize-none"
              />
            </>
          )}

          {/* Comma-separated Input */}
          {field.type === 'comma-separated' && (
            <>
              <input
                type="text"
                value={values[field.key] || ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm text-gray-900 placeholder:text-gray-400"
              />
            </>
          )}

          {/* Help Text */}
          {field.helpText && (
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{field.helpText}</p>
          )}
        </div>
      ))}
    </>
  );
}
