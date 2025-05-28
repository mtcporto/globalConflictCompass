import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';
import type React from 'react';
import { cn } from '@/lib/utils';

interface DataCardProps {
  title: string;
  icon: LucideIcon;
  onRefresh?: () => void;
  isLoading?: boolean;
  children: React.ReactNode;
  className?: string;
  disableMaxHeight?: boolean; // New prop
}

export function DataCard({ title, icon: Icon, onRefresh, isLoading, children, className, disableMaxHeight = false }: DataCardProps) {
  return (
    <Card className={cn("flex flex-col shadow-lg", className)}>
      <CardHeader className="bg-[hsl(var(--app-header-background))] text-[hsl(var(--app-header-foreground))] p-4 rounded-t-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={isLoading}
              aria-label={`Refresh ${title}`}
              className="text-[hsl(var(--app-header-foreground))] hover:bg-white/20 focus-visible:ring-offset-[hsl(var(--app-header-background))]"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className={cn(
        "p-4 flex-grow",
        !disableMaxHeight && "overflow-y-auto max-h-[400px]" // Apply only if not disabled
      )}>
        {children}
      </CardContent>
    </Card>
  );
}

// Helper for cn was removed as it's imported from lib/utils
