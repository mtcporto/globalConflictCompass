import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  className?: string;
  text?: string;
}

export function LoadingSpinner({ className, text = "Carregando..." }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 p-10 text-muted-foreground", className)}>
      <Loader2 className="h-8 w-8 animate-spin" />
      {text && <p className="text-sm">{text}</p>}
    </div>
  );
}
