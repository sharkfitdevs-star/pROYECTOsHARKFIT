import { useState, useMemo } from 'react';
import '../../styles/tables.css';

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No hay datos disponibles',
  emptyIcon = 'bi-inbox',
  error = null,
  searchable = false,
  searchKeys = [],
  searchPlaceholder = 'Buscar...',
  onRowClick,
  pageSize = 50,
  actions,
  toolbarExtra,
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search || !searchable) return data;
    const term = search.toLowerCase();
    const keys = searchKeys.length > 0 ? searchKeys : columns.map(c => c.key);
    return data.filter(row =>
      keys.some(k => {
        const v = row[k];
        return v && String(v).toLowerCase().includes(term);
      })
    );
  }, [data, search, searchable, searchKeys, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key) => {
    if (!columns.find(c => c.key === key)?.sortable) return;
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  if (error) {
    return (
      <div className="sf-empty">
        <i className="bi bi-exclamation-triangle" style={{ color: 'var(--color-danger)' }}></i>
        <p>{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="sf-empty">
        <i className="bi bi-arrow-repeat spin"></i>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div>
      {(searchable || toolbarExtra) && (
        <div className="sf-filters">
          {searchable && (
            <input
              type="text"
              className="sf-search"
              placeholder={searchPlaceholder}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          )}
          {toolbarExtra}
          <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            {sorted.length} resultado{sorted.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className="sf-table-wrapper">
        <table className="sf-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={col.sortable ? { cursor: 'pointer', userSelect: 'none' } : undefined}
                >
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <span style={{ marginLeft: '4px', opacity: 0.7 }}>
                      {sortDir === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
              ))}
              {actions && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)}>
                  <div className="sf-empty">
                    <i className={`bi ${emptyIcon}`}></i>
                    <p>{search ? `Sin resultados para "${search}"` : emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paged.map((row, idx) => (
                <tr
                  key={row._id || row.id || idx}
                  onClick={() => onRowClick?.(row)}
                  style={onRowClick ? { cursor: 'pointer' } : undefined}
                >
                  {columns.map(col => (
                    <td key={col.key} className={col.muted ? 'muted' : ''}>
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                  {actions && (
                    <td>
                      <div className="sf-actions">
                        {actions(row)}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="sf-pagination">
          <span>Página {page} de {totalPages} · {sorted.length} registros</span>
          <div className="sf-pagination-btns">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>←</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page + i - 2;
              if (p < 1 || p > totalPages) return null;
              return (
                <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>→</button>
          </div>
        </div>
      )}
    </div>
  );
}
