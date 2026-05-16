import { useMemo, useState } from 'react';
import { seedAgents } from '@/data/agents';
import { AgentDirectory } from '@/components/Agents/AgentDirectory';
import { ShadowAiToggle } from '@/components/Agents/ShadowAiToggle';
import { AgentDetailDrawer } from '@/components/Agents/AgentDetailDrawer';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default function Agents() {
  const [shadowOnly, setShadowOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return seedAgents.filter((a) => {
      if (shadowOnly && a.status !== 'shadow') return false;
      if (q && !`${a.name} ${a.identity} ${a.ownerTeam}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [shadowOnly, query]);

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
      <div className="overflow-x-auto rounded-md border bg-card">
        <AgentDirectory agents={filtered} onOpen={setOpenId} />
      </div>
      <AgentDetailDrawer agent={agent} open={open} onOpenChange={(v) => !v && setOpenId(null)} />
    </div>
  );
}
