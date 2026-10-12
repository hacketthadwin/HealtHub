import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Minus, Plus } from 'lucide-react';

// Same look as the text inputs on the signup page.
const FIELD =
  'w-full rounded-2xl border border-[#1F3A4B]/10 bg-[#1F3A4B]/5 dark:bg-white/5 text-[#1F3A4B] dark:text-[#FAFDEE] font-bold outline-none transition-all focus:border-[#C2F84F]';

const SCROLLBAR =
  '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#1F3A4B]/20 dark:[&::-webkit-scrollbar-thumb]:bg-white/10';

/**
 * Themed replacement for <select>. The browser's native dropdown can't be styled, so this renders its own
 * list (in a portal, so it is never clipped by a card). onChange receives { target: { name, value } },
 * the same shape as a normal input event, so existing handlers work unchanged.
 */
export function ThemedSelect({ name, value, onChange, options, placeholder = 'SELECT...', ariaLabel }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState({ left: 0, top: 0, width: 0, maxHeight: 256, up: false });
  const btnRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  const selectedIndex = options.indexOf(value);

  const openList = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 220 && above > below;
    setPos({
      left: r.left, width: r.width, up,
      top: up ? undefined : r.bottom + 8,
      bottom: up ? window.innerHeight - r.top + 8 : undefined,
      maxHeight: Math.max(140, Math.min(288, up ? above : below)),
    });
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }, [selectedIndex]);

  const closeList = useCallback((refocus = false) => {
    setOpen(false);
    if (refocus) btnRef.current?.focus();
  }, []);

  const choose = (opt) => {
    onChange({ target: { name, value: opt } });
    closeList(true);
  };

  // Close on outside click, resize, or page scroll (scrolling inside the list is fine).
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (btnRef.current?.contains(e.target) || listRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onScroll = (e) => { if (!listRef.current?.contains(e.target)) setOpen(false); };
    const onResize = () => setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  // Keep the keyboard-highlighted option visible.
  useEffect(() => {
    if (open) listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView?.({ block: 'nearest' });
  }, [open, active]);

  const onKeyDown = (e) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList(); }
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive((i) => Math.min(options.length - 1, i + 1)); break;
      case 'ArrowUp':   e.preventDefault(); setActive((i) => Math.max(0, i - 1)); break;
      case 'Home':      e.preventDefault(); setActive(0); break;
      case 'End':       e.preventDefault(); setActive(options.length - 1); break;
      case 'Enter':
      case ' ':         e.preventDefault(); choose(options[active]); break;
      case 'Escape':    e.preventDefault(); closeList(true); break;
      case 'Tab':       setOpen(false); break;
      default: {
        const i = options.findIndex((o) => o.toLowerCase().startsWith(e.key.toLowerCase()));
        if (e.key.length === 1 && i >= 0) setActive(i);
      }
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        name={name}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? closeList() : openList())}
        onKeyDown={onKeyDown}
        className={`${FIELD} flex items-center justify-between gap-3 px-5 py-4 text-left text-base uppercase ${open ? 'border-[#C2F84F]' : ''}`}
      >
        <span className={`truncate ${value ? '' : 'text-sm opacity-60'}`}>{value || placeholder}</span>
        <ChevronDown size={20} className={`shrink-0 transition-transform duration-300 ${open ? 'rotate-180 text-emerald-600 dark:text-[#C2F84F]' : 'opacity-60'}`} />
      </button>

      {open && createPortal(
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }}
          className={`z-[100] overflow-y-auto rounded-2xl border border-[#1F3A4B]/10 dark:border-white/10 bg-white dark:bg-[#111827] p-1.5 shadow-2xl font-roboto-slab antialiased ${SCROLLBAR}`}
        >
          {options.map((opt, i) => {
            const selected = opt === value;
            return (
              <li
                key={opt}
                id={`${listId}-${i}`}
                data-index={i}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(opt)}
                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl cursor-pointer text-sm md:text-base font-bold uppercase tracking-wide transition-colors ${
                  selected
                    ? 'bg-[#1F3A4B] text-[#C2F84F] dark:bg-[#C2F84F] dark:text-[#1F3A4B]'
                    : i === active
                      ? 'bg-[#1F3A4B]/10 dark:bg-white/10 text-[#1F3A4B] dark:text-[#FAFDEE]'
                      : 'text-[#1F3A4B] dark:text-[#FAFDEE]'
                }`}
              >
                <span className="truncate">{opt}</span>
                {selected && <Check size={16} className="shrink-0" />}
              </li>
            );
          })}
        </ul>,
        document.body
      )}
    </>
  );
}

/**
 * Number field with themed − / + buttons instead of the browser's spinner arrows. Digits only, clamped to
 * min..max. onChange receives { target: { name, value } } with value as a string ('' when empty).
 */
export function NumberStepper({ name, value, onChange, min = 0, max = 60, placeholder, ariaLabel = 'Value' }) {
  const num = value === '' || value == null ? null : Number(value);
  const clamp = (n) => Math.min(max, Math.max(min, n));
  const emit = (n) => onChange({ target: { name, value: n === null ? '' : String(n) } });
  const step = (d) => emit(num === null ? clamp(d > 0 ? Math.max(min, 1) : min) : clamp(num + d));

  const onType = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, String(max).length);
    emit(digits === '' ? null : clamp(Number(digits)));
  };
  const onKey = (e) => {
    if (e.key === 'ArrowUp')   { e.preventDefault(); step(1); }
    if (e.key === 'ArrowDown') { e.preventDefault(); step(-1); }
  };

  const btn =
    'h-10 w-10 shrink-0 rounded-xl flex items-center justify-center bg-[#1F3A4B] text-[#C2F84F] dark:bg-[#C2F84F] dark:text-[#1F3A4B] transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:pointer-events-none';

  return (
    <div className={`${FIELD} flex items-center gap-2 p-2 focus-within:border-[#C2F84F]`}>
      <button type="button" aria-label={`Decrease ${ariaLabel}`} className={btn} disabled={num !== null && num <= min} onClick={() => step(-1)}>
        <Minus size={18} />
      </button>
      <input
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={onType}
        onKeyDown={onKey}
        className="min-w-0 flex-1 bg-transparent text-center text-base font-bold uppercase outline-none placeholder:text-sm placeholder:font-bold placeholder:opacity-60"
      />
      <button type="button" aria-label={`Increase ${ariaLabel}`} className={btn} disabled={num !== null && num >= max} onClick={() => step(1)}>
        <Plus size={18} />
      </button>
    </div>
  );
}