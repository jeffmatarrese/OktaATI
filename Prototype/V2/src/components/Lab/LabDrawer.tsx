import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScenarioPicker } from './ScenarioPicker';
import { ClassifierResultPanel } from './ClassifierResultPanel';
import { useLabStore } from '@/store/labStore';
import { labScenarios } from '@/data/scenarios';
import { Skeleton } from '@/components/ui/skeleton';

export function LabDrawer() {
  const { isOpen, phase, lastResult, openDrawer, closeDrawer, sendScenario } = useLabStore();
  const navigate = useNavigate();

  const handleSend = (id: string) => {
    navigate('/');
    void sendScenario(id);
  };

  // Auto-close after a successful reveal so the alert lands visibly in the dashboard.
  useEffect(() => {
    if (phase !== 'revealed') return;
    const t = setTimeout(() => closeDrawer(), 1500);
    return () => clearTimeout(t);
  }, [phase, closeDrawer]);

  return (
    <Sheet open={isOpen} onOpenChange={(v) => (v ? openDrawer() : closeDrawer())}>
      <SheetContent side="left" className="w-full sm:max-w-3xl overflow-y-auto" data-testid="lab-drawer">
        <SheetHeader>
          <SheetTitle>Scenario Lab</SheetTitle>
          <SheetDescription>
            Send a simulated agent telemetry payload through both classifiers. The ML model's decision drives the alert that lands in the dashboard.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ScenarioPicker onSend={handleSend} disabled={phase === 'classifying'} />
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Classifier outputs
            </h3>
            {phase === 'idle' && (
              <p className="text-xs text-muted-foreground">
                Pick a scenario and click <em>Send to ATI</em> to see both classifiers score it.
              </p>
            )}
            {phase === 'classifying' && (
              <>
                <Skeleton className="h-44 w-full" />
                <Skeleton className="h-44 w-full" />
              </>
            )}
            {phase === 'revealed' && lastResult && (() => {
              const sc = labScenarios.find((s) => s.id === lastResult.scenarioId);
              if (!sc) return null;
              return (
                <>
                  <ClassifierResultPanel result={lastResult.nano} groundTruth={sc.groundTruthTier} />
                  <ClassifierResultPanel result={lastResult.ml}   groundTruth={sc.groundTruthTier} />
                  <div className="rounded-md border bg-muted/40 p-3 text-xs">
                    <div className="mb-1 font-semibold">Ground-truth rationale</div>
                    <p className="text-muted-foreground">{sc.groundTruthRationale}</p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
