import { useState, useRef, useEffect } from "react";

export type Cave = {
  id: string | number;
  title: string;
};

type CaveAutocompleteProps = {
  value: Cave | null;
  onChange: (cave: Cave | null) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
};

export function CaveAutocomplete({
  value,
  onChange,
  placeholder = "Search caves...",
  required = false,
  disabled = false,
}: CaveAutocompleteProps) {
  const [query, setQuery] = useState(value?.title ?? "");
  const [results, setResults] = useState<Cave[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      setQuery(value.title);
    } else {
      setQuery("");
    }
  }, [value?.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setSearchError(null);
      fetch(`/api/caves?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data: Cave[] | { error: string }) => {
          if (Array.isArray(data)) {
            setResults(data);
            setSearchError(null);
          } else {
            setResults([]);
            setSearchError("error" in data ? data.error : "Search failed");
          }
        })
        .catch((err) => {
          setResults([]);
          setSearchError(err.message || "Search failed");
        })
        .finally(() => {
          setLoading(false);
          debounceRef.current = null;
        });
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = (cave: Cave) => {
    onChange(cave);
    setQuery(cave.title);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
    if (value) onChange(null);
  };

  const handleFocus = () => {
    if (query.length >= 2 && results.length > 0) setIsOpen(true);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          required={required && !value}
          disabled={disabled}
          autoComplete="off"
          className="w-full rounded-lg border border-stone-300 px-4 py-2 pr-20 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded px-2 py-0.5 text-xs text-stone-500 hover:bg-stone-200 hover:text-stone-700 dark:hover:bg-stone-600 dark:hover:text-stone-300"
            >
              Clear
            </button>
          )}
          {loading && (
            <span className="px-2 text-xs text-stone-400">...</span>
          )}
        </div>
      </div>

      {isOpen && (results.length > 0 || (query.length >= 2 && !loading)) && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-600 dark:bg-stone-800">
          {results.length === 0 ? (
            <li className="px-4 py-2 text-sm text-stone-500">
              {searchError ? (
                <span className="text-amber-600 dark:text-amber-500">
                  {searchError}
                </span>
              ) : (
                "No caves found"
              )}
            </li>
          ) : (
            results.map((cave) => (
              <li key={cave.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(cave)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-700"
                >
                  {cave.title}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
