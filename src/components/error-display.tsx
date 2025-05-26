import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorDisplayProps {
  message: string;
  className?: string;
}

export function ErrorDisplay({ message, className }: ErrorDisplayProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 p-6 text-destructive bg-destructive/10 border border-destructive/30 rounded-md", className)}>
      <AlertTriangle className="h-8 w-8" />
      <p className="text-sm text-center">{message}</p>
    </div>
  );
}
