import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function CollapsibleArea({
  icon: Icon,
  title,
  badge,
  badgeVariant = 'default',
  isOpen,
  onToggle,
  summary,
  children,
  defaultOpen = false
}) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  
  // Usar estado controlado si se proporciona isOpen, sino usar estado interno
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalOpen(!internalOpen);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader 
        className="cursor-pointer hover:bg-gray-50 transition-colors p-4"
        onClick={handleToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && <Icon className="h-6 w-6 text-gray-700" />}
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            {badge !== undefined && badge !== null && (
              <Badge variant={badgeVariant} className="ml-2">
                {badge}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {open ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </Button>
        </div>
        
        {/* Resumen cuando está colapsado */}
        {!open && summary && (
          <div className="mt-3 text-sm text-gray-600 space-y-1">
            {summary}
          </div>
        )}
      </CardHeader>
      
      {/* Contenido cuando está expandido */}
      {open && (
        <CardContent className="pt-0 pb-4 px-4">
          {children}
        </CardContent>
      )}
    </Card>
  );
}