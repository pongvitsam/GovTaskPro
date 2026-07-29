import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatThaiDateLong, toDateInputValue } from './formatThaiDate';

const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

function parseYmd(value) {
  const s = toDateInputValue(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toYmd(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function sameDay(a, b) {
  return a && b
    && a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/**
 * Date picker that shows วัน เดือน ปี พ.ศ. beautifully,
 * with a custom Thai Buddhist Era calendar popover.
 * value / onChange use yyyy-mm-dd (or '').
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
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (controlled) setInner(toDateInputValue(value));
  }, [controlled, value]);

  const inputValue = controlled ? toDateInputValue(value) : inner;
  const selected = parseYmd(inputValue);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  }, []);

  const [viewYear, setViewYear] = useState(() => (selected || today).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => (selected || today).getMonth());

  useEffect(() => {
    if (!open) return;
    const base = selected || today;
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
  }, [open, selected, today]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const hasValue = !!inputValue;
  const label = hasValue ? formatThaiDateLong(inputValue) : placeholder;
  const parts = hasValue ? label.split(/\s+/) : [];
  const dayPart = parts[0] || '';
  const restPart = parts.slice(1).join(' ');

  const setDate = (next) => {
    if (!controlled) setInner(next);
    onChange?.(next);
  };

  const days = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1, 12, 0, 0);
    const startPad = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startPad; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) {
      cells.push(new Date(viewYear, viewMonth, d, 12, 0, 0));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const shiftMonth = (delta) => {
    const next = new Date(viewYear, viewMonth + delta, 1, 12, 0, 0);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const beYear = viewYear + 543;

  return (
    <div
      ref={rootRef}
      className={`thai-date-field thai-date-field--${size} ${hasValue ? 'thai-date-field--filled' : ''} ${disabled ? 'thai-date-field--disabled' : ''} ${open ? 'thai-date-field--open' : ''} ${className}`}
      title={hasValue ? label : placeholder}
    >
      <button
        type="button"
        disabled={disabled}
        className="thai-date-field__face"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!disabled) setOpen((v) => !v);
        }}
      >
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
          <span
            role="button"
            tabIndex={0}
            className="thai-date-field__clear"
            aria-label="ล้างวันที่"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDate('');
              setOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                setDate('');
                setOpen(false);
              }
            }}
          >
            ×
          </span>
        )}
      </button>

      {/* Hidden field for native form submit / required validation */}
      <input
        type="text"
        name={inputName}
        required={required}
        value={inputValue}
        readOnly
        tabIndex={-1}
        aria-hidden="true"
        className="thai-date-field__native"
        onFocus={(e) => e.target.blur()}
      />

      {open && !disabled && (
        <div className="thai-date-pop" role="dialog" aria-label="เลือกวันที่ พ.ศ.">
          <div className="thai-date-pop__head">
            <button type="button" className="thai-date-pop__nav" onClick={() => shiftMonth(-1)} aria-label="เดือนก่อน">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="thai-date-pop__title">
              <span className="thai-date-pop__month">{THAI_MONTHS[viewMonth]}</span>
              <span className="thai-date-pop__year">{beYear}</span>
            </div>
            <button type="button" className="thai-date-pop__nav" onClick={() => shiftMonth(1)} aria-label="เดือนถัดไป">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="thai-date-pop__weekdays">
            {WEEKDAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="thai-date-pop__grid">
            {days.map((day, idx) => {
              if (!day) return <span key={`e-${idx}`} className="thai-date-pop__cell thai-date-pop__cell--empty" />;
              const isSelected = sameDay(day, selected);
              const isToday = sameDay(day, today);
              return (
                <button
                  key={toYmd(day)}
                  type="button"
                  className={`thai-date-pop__cell ${isSelected ? 'thai-date-pop__cell--selected' : ''} ${isToday ? 'thai-date-pop__cell--today' : ''}`}
                  onClick={() => {
                    setDate(toYmd(day));
                    setOpen(false);
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="thai-date-pop__foot">
            <button
              type="button"
              className="thai-date-pop__today"
              onClick={() => {
                setDate(toYmd(today));
                setOpen(false);
              }}
            >
              วันนี้
            </button>
            {clearable && (
              <button
                type="button"
                className="thai-date-pop__clear-all"
                onClick={() => {
                  setDate('');
                  setOpen(false);
                }}
              >
                ล้างวันที่
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
