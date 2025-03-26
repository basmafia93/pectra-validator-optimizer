'use client';

interface ResultsDisplayProps {
  metrics: {
    optimalStake: number;
    mainValidators: number;
    remainingEth: number;
    standardTotal: number;
    pectraTotal: number;
    standardApr: number;
    pectraApr: number;
  };
}

export function ResultsDisplay({ metrics }: ResultsDisplayProps) {
  const formatEth = (value: number) => {
    return value >= 100 
      ? `${Math.round(value)} ETH`
      : `${value.toFixed(2)} ETH`;
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(3)}%`;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h2 className="text-2xl font-semibold mb-6">Performance Comparison</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-500">Optimal Stake per Validator</div>
          <div className="text-xl font-semibold">{formatEth(metrics.optimalStake)}</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-500">Number of Validators</div>
          <div className="text-xl font-semibold">{metrics.mainValidators}</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-500">Remaining ETH</div>
          <div className="text-xl font-semibold">{formatEth(metrics.remainingEth)}</div>
        </div>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Metric</th>
            <th className="text-right py-2">Standard</th>
            <th className="text-right py-2">Pectra</th>
            <th className="text-right py-2">Improvement</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="py-3">Total Rewards</td>
            <td className="text-right">{formatEth(metrics.standardTotal)}</td>
            <td className="text-right">{formatEth(metrics.pectraTotal)}</td>
            <td className="text-right text-green-600">
              +{formatEth(metrics.pectraTotal - metrics.standardTotal)}
            </td>
          </tr>
          <tr>
            <td className="py-3">Total APR</td>
            <td className="text-right">{formatPercent(metrics.standardApr)}</td>
            <td className="text-right">{formatPercent(metrics.pectraApr)}</td>
            <td className="text-right text-green-600">
              +{formatPercent(metrics.pectraApr - metrics.standardApr)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
} 