'use client';

import { FC, useState } from 'react';
import { Input } from '@/components/ui/input';
import { SearchIcon, XIcon } from 'lucide-react';

/**
 * Generic search box (spec §8 SearchBar). Controlled — the parent owns the
 * query so it can debounce requests or filter client-side.
 */
export const SearchBar: FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder = 'Search…', className }) => {
  return (
    <div className={className}>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9 pr-8"
          aria-label={placeholder}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
