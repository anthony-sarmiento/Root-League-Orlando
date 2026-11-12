"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, X } from "lucide-react";
import { searchNames, type NameOption } from "@/lib/name-search";

interface Props {
  /** Name of the form field that carries the chosen id. */
  name: string;
  options: NameOption[];
  /** The chosen id, or "" for nobody. */
  value: string;
  onChange: (id: string) => void;
  /** Accessible name when there is no visible label. */
  label?: string;
  placeholder?: string;
  className?: string;
}

/**
 * A name field you can type into: start typing and the list narrows to matching names (capitals and accents
 * ignored). Works with the keyboard (arrows, Enter, Escape) and with taps. The chosen id is submitted under `name`.
 */
export function NamePicker({ name, options, value, onChange, label, placeholder = "Type a name…", className = "" }: Props) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((o) => o.id === value);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // While the list is closed the box shows the chosen name; while open it shows what is being typed.
  const shown = open ? query : (selected?.name ?? "");

  const matches = useMemo(() => searchNames(options, open ? query : ""), [options, query, open]);

  // Native form validation: a field left empty (or filled with text that isn't a chosen name) can't be submitted.
  useEffect(() => {
    inputRef.current?.setCustomValidity(value ? "" : "Pick a name from the list.");
  }, [value]);

  const choose = (option: NameOption) => {
    if (option.disabled) return;
    onChange(option.id);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setQuery("");
        setActive(0);
      } else setActive((i) => Math.min(i + 1, Math.max(matches.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open) {
      e.preventDefault(); // choosing a name must not submit the form
      const option = matches[active];
      if (option) choose(option);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input type="hidden" name={name} value={value} />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${listId}-${matches[active].id}` : undefined}
        aria-label={label}
        autoComplete="off"
        spellCheck={false}
        required
        placeholder={placeholder}
        value={shown}
        className="field pr-16"
        onFocus={(e) => {
          setOpen(true);
          setQuery("");
          setActive(0);
          // Select what is there so typing replaces it.
          e.currentTarget.select();
        }}
        onBlur={() => {
          setOpen(false);
          setQuery("");
        }}
        onChange={(e) => {
          setOpen(true);
          setQuery(e.target.value);
          setActive(0);
          // Typing over a choice means they're looking for someone else.
          if (value) onChange("");
        }}
        onKeyDown={onKeyDown}
      />
      <span className="pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1 text-bark-soft">
        {value && (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Clear this name"
            className="pointer-events-auto rounded-full p-1 hover:bg-bark/10"
            // mousedown (not click) so the input doesn't lose focus first
            onMouseDown={(e) => {
              e.preventDefault();
              onChange("");
              setQuery("");
              inputRef.current?.focus();
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
        <ChevronDown size={18} aria-hidden="true" />
      </span>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label ?? "Names"}
          className="absolute z-30 mt-1 max-h-60 w-full min-w-48 overflow-y-auto rounded-xl border-2 border-bark/30 bg-paper p-1 shadow-[var(--shadow-lift)]"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-bark-soft">No one by that name.</li>
          ) : (
            matches.map((option, i) => (
              <li
                key={option.id}
                id={`${listId}-${option.id}`}
                role="option"
                aria-selected={option.id === value}
                aria-disabled={option.disabled || undefined}
                // mousedown (not click) so the list is still there when the choice is made
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(option);
                }}
                onMouseMove={() => setActive(i)}
                className={`flex items-baseline justify-between gap-3 rounded-lg px-3 py-2 ${
                  option.disabled ? "cursor-not-allowed text-bark/40" : "cursor-pointer"
                } ${i === active && !option.disabled ? "bg-moss/20" : ""} ${option.id === value ? "font-bold" : ""}`}
              >
                <span className="truncate">{option.name}</span>
                {option.hint && <span className="shrink-0 text-xs text-bark-soft">{option.hint}</span>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
