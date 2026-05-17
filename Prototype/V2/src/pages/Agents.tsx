import { useEffect, useMemo, useState } from 'react';
import { seedAgents } from '@/data/agents';
import { AgentDirectory } from '@/components/Agents/AgentDirectory';
import { AgentKpis } from '@/components/Agents/AgentKpis';
import { ShadowAiToggle } from '@/components/Agents/ShadowAiToggle';
import { AgentDetailDrawer } from '@/components/Agents/AgentDetailDrawer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 10;

export default function Agents() {
  const [shadowOnly, setShadowOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return seedAgents.filter((a) => {
      if (shadowOnly && a.status !== 'shadow') return false;
      if (q && !`${a.name} ${a.identity} ${a.ownerTeam}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [shadowOnly, query]);

  // Snap back to page 1 whenever the filter set changes.
  useEffect(() => { setPage(1); }, [shadowOnly, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  const open = openId !== null;
  const agent = seedAgents.find((a) => a.id === openId) ?? null;

  return (
    <div className="p-3 sm:p-6">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold">Agents</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ShadowAiToggle value={shadowOnly} onChange={setShadowOnly} />
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search agents…"
              className="h-9 w-full pl-8 sm:w-64"
            />
          </div>
        </div>
      </header>

      <div className="mb-4">
        <AgentKpis agents={filtered} />
      </div>

      <div className="overflow-x-auto rounded-md border bg-card">
        <AgentDirectory agents={visible} onOpen={setOpenId} />
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">
          {filtered.length === 0
            ? 'No agents match the current filter.'
            : <>Showing <span className="font-medium text-foreground">{start + 1}</span>–<span className="font-medium text-foreground">{Math.min(start + PAGE_SIZE, filtered.length)}</span> of <span className="font-medium text-foreground">{filtered.length}</span></>
          }
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">
            Page {safePage} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={safePage >= pageCount}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AgentDetailDrawer agent={agent} open={open} onOpenChange={(v) => !v && setOpenId(null)} />
    </div>
  );
}
