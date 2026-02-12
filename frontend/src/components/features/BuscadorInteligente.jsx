import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function BuscadorInteligente({ 
  data = [], 
  onSelect, 
  onClear, 
  placeholder = "Buscar...", 
  getSearchableText,
  renderItem 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const wrapperRef = useRef(null);

  // Cerrar resultados al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  // Normalizar texto para búsqueda
  const normalizeText = (text) => {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  // Filtrar datos
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const query = normalizeText(searchTerm);
    const queryDigits = searchTerm.replace(/\D/g, '');
    
    return data.filter(item => {
      const searchText = getSearchableText ? getSearchableText(item) : JSON.stringify(item);
      const normalizedSearchText = normalizeText(searchText);
      
      // Buscar por texto completo
      const matchText = normalizedSearchText.includes(query);
      
      // Buscar por dígitos si hay dígitos en la búsqueda (para teléfonos, rut, etc.)
      // Esto previene que una búsqueda de texto coincida con todos los números si replace devuelve vacío
      const matchDigits = queryDigits.length > 0 && String(searchText).replace(/\D/g, '').includes(queryDigits);
      
      return matchText || matchDigits;
    });
  }, [data, searchTerm, getSearchableText]);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowResults(!!value.trim());
    if (!value.trim()) {
      onClear && onClear();
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setShowResults(false);
    onClear && onClear();
  };

  // Resaltar coincidencias
  const highlightMatch = (text, term) => {
    if (!term || !text) return text;
    
    const normalizedText = String(text).toLowerCase();
    const normalizedTerm = String(term).toLowerCase();
    
    // Si no contiene el término, retornar el texto original
    if (!normalizedText.includes(normalizedTerm)) return text;
    
    // Escapar caracteres especiales para regex
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = String(text).split(new RegExp(`(${escapeRegExp(term)})`, 'gi'));
    
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === term.toLowerCase() ? (
            <span key={i} className="bg-yellow-200 font-medium text-black rounded px-0.5">{part}</span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className="w-full space-y-2 relative" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          value={searchTerm}
          onChange={handleSearch}
          placeholder={placeholder}
          className="pl-9 pr-9"
          onFocus={() => {
            if (searchTerm.trim()) setShowResults(true);
          }}
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
            onClick={handleClear}
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </Button>
        )}
      </div>

      {showResults && searchTerm && (
        <div className="absolute z-50 w-full border rounded-md shadow-lg bg-white mt-1 max-h-[300px] overflow-hidden">
          {filteredData.length > 0 ? (
            <ScrollArea className="h-[300px] w-full">
              <div className="p-1">
                {filteredData.map((item, index) => (
                  <div
                    key={index}
                    className="p-2 hover:bg-gray-100 rounded-md cursor-pointer transition-colors border-b last:border-b-0 border-gray-50"
                    onClick={() => {
                      onSelect && onSelect(item);
                      // Cerrar resultados después de seleccionar
                      setShowResults(false);
                    }}
                  >
                    {renderItem ? renderItem(item, searchTerm, highlightMatch) : (
                      <div className="text-sm">
                        {getSearchableText ? highlightMatch(getSearchableText(item), searchTerm) : JSON.stringify(item)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="p-4 text-center text-sm text-gray-500">
              No se encontraron resultados
            </div>
          )}
        </div>
      )}
    </div>
  );
}