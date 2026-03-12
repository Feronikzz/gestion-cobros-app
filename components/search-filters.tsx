'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';

interface SearchFiltersProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: Record<string, string>) => void;
  filters?: Array<{
    key: string;
    label: string;
    options: Array<{ value: string; label: string }>;
  }>;
  placeholder?: string;
}

export function SearchFilters({
  onSearch,
  onFilterChange,
  filters = [],
  placeholder = 'Buscar...',
}: SearchFiltersProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<Record<string, string>>({});

  const handleSearch = (v: string) => { setQuery(v); onSearch(v); };
  const handleFilter = (key: string, value: string) => {
    const next = { ...active, [key]: value };
    if (!value) delete next[key];
    setActive(next);
    onFilterChange(next);
  };
  const clear = () => { setQuery(''); setActive({}); onSearch(''); onFilterChange({}); };
  const hasFilters = query || Object.keys(active).length > 0;

  return (
    <div>
      <div className="search-bar">
        <div className="search-input-wrap">
          <Search />
          <input
            type="text"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            placeholder={placeholder}
            className="form-input"
          />
        </div>
        {filters.map(f => (
          <select
            key={f.key}
            value={active[f.key] || ''}
            onChange={e => handleFilter(f.key, e.target.value)}
            className="form-input search-select"
          >
            <option value="">{f.label}</option>
            {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}
        {hasFilters && (
          <button onClick={clear} className="search-clear" title="Limpiar">
            <X style={{ width: '0.875rem', height: '0.875rem', display: 'inline' }} /> Limpiar
          </button>
        )}
      </div>
      {hasFilters && (
        <div className="search-tags">
          {query && <span className="search-tag">Busca: &quot;{query}&quot;</span>}
          {Object.entries(active).map(([k, v]) => {
            const f = filters.find(x => x.key === k);
            const o = f?.options.find(x => x.value === v);
            return <span key={k} className="search-tag">{f?.label}: {o?.label}</span>;
          })}
        </div>
      )}
    </div>
  );
}
