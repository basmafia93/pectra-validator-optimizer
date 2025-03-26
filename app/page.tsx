import { ValidatorOptimizer } from './components/ValidatorOptimizer';

export default function Home() {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Validator Stake Optimizer</h1>
            <p className="text-muted-foreground">
              Optimize your validator stakes to maximize rewards while respecting the 2048 ETH cap.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <ValidatorOptimizer />
          </div>
        </div>
      </div>
    </div>
  );
}
