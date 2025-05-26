"use client";

import type React from 'react';
import { useEffect } from 'react';
import type { SourceStatus } from '@/lib/types';
import { ExternalLink } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GpiPanelProps {
  onStatusChange: (status: SourceStatus) => void;
}

const gpiData = [
  {
    id: 'gpi-most-peaceful',
    title: '🏆 Mais Pacíficos 2024 (Exemplo)',
    description: '1. Islândia | 2. Dinamarca | 3. Irlanda | 4. Nova Zelândia | 5. Áustria',
  },
  {
    id: 'gpi-least-peaceful',
    title: '⚠️ Menos Pacíficos 2024 (Exemplo)',
    description: '159. Ucrânia | 160. Sudão | 161. Síria | 162. Iêmen | 163. Afeganistão',
  },
  {
    id: 'gpi-brazil',
    title: '🇧🇷 Brasil (Exemplo)',
    description: 'Posição: 132º de 163 países (Score: 2.123) - Dados de 2023 como referência, verificar Vision of Humanity para 2024.',
    link: 'https://www.visionofhumanity.org/maps/',
  },
];

export function GpiPanel({ onStatusChange }: GpiPanelProps) {
  useEffect(() => {
    onStatusChange({ status: 'success' });
  }, [onStatusChange]);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4">
        {gpiData.map(item => (
          <div key={item.id} className="py-3 border-b border-border last:border-b-0">
            <h3 className="font-medium mb-1.5 text-sm">{item.title}</h3>
            <p className="text-xs text-foreground/80 mb-2 leading-relaxed">{item.description}</p>
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Ver mapa completo <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        ))}
        <p className="text-xs text-muted-foreground pt-2">
          Nota: Os dados do GPI são atualizados anualmente. Consulte o site oficial Vision of Humanity para os dados mais recentes.
        </p>
      </div>
    </ScrollArea>
  );
}
