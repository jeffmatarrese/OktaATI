export function AuditFooter({ runId }: { runId: string }) {
  return (
    <div className="border-t pt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
      Detected by ATI · Model run <span className="font-mono">{runId}</span>
    </div>
  );
}
