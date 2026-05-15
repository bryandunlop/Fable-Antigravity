// ─── Collapsible Compartment Section ─────────────────────────────────────────

import React, { useRef, type ReactNode } from 'react';
import {
  Droplets,
  Coffee,
  Armchair,
  UtensilsCrossed,
  Package,
  Snowflake,
  Luggage,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../ui/utils';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../../ui/collapsible';
import { readinessColor, readinessBg } from '../constants';
import type { CompartmentDefinition } from '../types';

// ─── Icon lookup ────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  Droplets,
  Coffee,
  Armchair,
  UtensilsCrossed,
  Package,
  Snowflake,
  Luggage,
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface CompartmentSectionProps {
  compartment: CompartmentDefinition;
  itemCount: number;
  readinessPct: number;
  children: ReactNode;
  defaultOpen?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CompartmentSection({
  compartment,
  itemCount,
  readinessPct,
  children,
  defaultOpen = true,
}: CompartmentSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const Icon = ICON_MAP[compartment.icon] ?? Package;

  function scrollToTop() {
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div ref={sectionRef}>
      <Collapsible defaultOpen={defaultOpen}>
        {/* Header */}
        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card/60 px-4 py-3">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex flex-1 items-center gap-3 text-left"
            >
              <Icon className={cn('h-5 w-5 shrink-0', compartment.color)} />
              <span className="font-semibold text-sm">{compartment.label}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {itemCount}
              </span>
              <span
                className={cn(
                  'rounded-full border px-2 py-0.5 text-xs font-medium',
                  readinessBg(readinessPct),
                  readinessColor(readinessPct),
                )}
              >
                {readinessPct}%
              </span>
              <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
            </button>
          </CollapsibleTrigger>

          <button
            type="button"
            onClick={scrollToTop}
            className="ml-3 shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Top ▲
          </button>
        </div>

        {/* Content */}
        <CollapsibleContent className="pt-2 space-y-1">
          {children}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
