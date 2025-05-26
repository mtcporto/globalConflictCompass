import type { NewsItem } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

interface EventDisplayProps {
  item: NewsItem;
}

export function EventDisplay({ item }: EventDisplayProps) {
  return (
    <div className="py-3 border-b border-border last:border-b-0">
      <p className="text-xs text-muted-foreground mb-1">
        {formatDate(item.date)}
        {item.country && ` - ${item.country}`}
        {item.location && ` - ${item.location}`}
      </p>
      <h3 className="font-medium mb-1.5 text-sm">{item.title}</h3>
      {item.eventType && <p className="text-xs text-muted-foreground mb-1">Type: {item.eventType}</p>}
      <p className="text-xs text-foreground/80 mb-2 leading-relaxed">{item.description}</p>
      {item.link && (
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          Read more <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}
