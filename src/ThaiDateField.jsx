import React, { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { formatThaiDateLong, toDateInputValue } from './formatThaiDate';

/**
 * Date picker that shows วัน เดือน ปี พ.ศ. beautifully.
 * value / onChange use yyyy-mm-dd (or '').
 * For plain forms, pass inputName and omit value (uncontrolled).
 */
export default function ThaiDateField({
  value,
  onChange,
  disabled = false,
  placeholder = 'เลือกวันที่',
  clearable = false,
  size = 'md',
  className = '',
  inputName,
  required = false,
  defaultValue = '',
}) {
  const controlled = value !== undefined;
  const [inner, setInner] = useState(() => toDateInputValue(controlled ? value : defaultValue));

  useEffect(() => {
    if (controlled) setInner(toDateInputValue(value));
  }, [controlled, value]);

  const inputValue = controlled ? toDateInputValue(value) : inner;
  const hasValue = !!inputValue;
  const label = hasValue ? formatThaiDateLong(inputValue) : placeholder;
  const parts = hasValue ? label.split(/\s+/) : [];
  const dayPart = parts[0] || '';
  const restPart = parts.slice(1).join(' ');

  const setDate = (next) => {
    if (!controlled) setInner(next);
    onChange?.(next);
  };

  return (
    <label
      className={`thai-date-field thai-date-field--${size} ${hasValue ? 'thai-date-field--filled' : ''} ${disabled ? 'thai-date-field--disabled' : ''} ${className}`}
      title={hasValue ? label : placeholder}
    >
      <span className="thai-date-field__face">
        <span className="thai-date-field__icon-wrap">
          <CalendarDays className="thai-date-field__icon" />
        </span>
        <span className="thai-date-field__text">
          {hasValue ? (
            <>
              <span className="thai-date-field__day">{dayPart}</span>
              <span className="thai-date-field__rest">{restPart}</span>
            </>
          ) : (
            <span className="thai-date-field__placeholder">{placeholder}</span>
          )}
        </span>
        {clearable && hasValue && !disabled && (
          <button
            type="button"
            className="thai-date-field__clear"
            aria-label="ล้างวันที่"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDate('');
            }}
          >
            ×
          </button>
        )}
      </span>
      <input
        type="date"
        name={inputName}
        required={required}
        className="thai-date-field__input"
        value={inputValue}
        disabled={disabled}
        onChange={(e) => setDate(e.target.value || '')}
      />
    </label>
  );
}
