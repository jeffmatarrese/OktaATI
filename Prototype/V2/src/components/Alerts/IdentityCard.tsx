import type { IdentityCard as IC } from '@/data/alerts';

export function IdentityCard({ identity }: { identity: IC }) {
  const rows: Array<[string, string]> = [
    ['Service account', identity.serviceAccount],
    ['Token issuer', identity.tokenIssuer],
    ['IdP', identity.idp],
    ['Last MFA', identity.lastMfa],
    ['Auth method', identity.authMethod],
  ];
  return (
    <div className="rounded-md border bg-muted/30 p-3 text-xs">
      <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-mono break-all">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
