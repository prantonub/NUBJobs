import { cn } from '@/lib/utils';

/** Filter tabs for the messages page (spec: All | Professional | Community). */
export function MessageFilter({
  value,
  onChange,
  tabs = [
    { label: 'All', value: 'all' },
    { label: 'Professional', value: 'professional' },
    { label: 'Community', value: 'community' },
  ],
}: {
  value: string;
  onChange: (v: string) => void;
  tabs?: { label: string; value: string }[];
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            value === tab.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
