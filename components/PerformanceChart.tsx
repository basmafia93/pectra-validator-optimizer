'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartDataPoint {
  year: number;
  standardBalance: number;
  pectraBalance: number;
  maxEffectiveBalance: number;
}

interface PerformanceChartProps {
  data: ChartDataPoint[];
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-semibold mb-6">Growth Comparison</h2>
      
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="year" 
              label={{ value: 'Year', position: 'bottom' }} 
            />
            <YAxis 
              label={{ value: 'ETH', angle: -90, position: 'left' }}
            />
            <Tooltip 
              formatter={(value: number) => `${value.toFixed(2)} ETH`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="standardBalance" 
              name="Standard 32-ETH"
              stroke="#6366f1" 
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="pectraBalance" 
              name="Pectra Auto-compounding"
              stroke="#2563eb" 
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="maxEffectiveBalance" 
              name="Max Effective Balance"
              stroke="#dc2626" 
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 