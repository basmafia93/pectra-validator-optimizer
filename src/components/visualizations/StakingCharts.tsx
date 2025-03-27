"use client";

import React from "react";
import { Chart } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface StakingChartsProps {
  projections: number[][];
  standardRewards?: number[];
  networkApr?: number;
}

export function StakingCharts({ projections, standardRewards, networkApr = 3.38 }: StakingChartsProps) {
  if (!projections || projections.length === 0) {
    return <div>No data available</div>;
  }

  // Calculate CL APR (82.5% of total APR)
  const clApr = networkApr * 0.825;

  const calculateClRewards = (balance: number, apr: number) => {
    const flooredBalance = Math.floor(balance);
    return flooredBalance * (apr / 100);
  };

  // Use all validators
  const validatorsToShow = projections;
  const totalValidators = validatorsToShow.length;
  const validatorCap = 2048;
  const totalCap = validatorCap * totalValidators;

  // Calculate yearly optimized rewards directly
  const yearlyData = validatorsToShow[0]?.map((_, yearIndex) => {
    let yearlyRewards = 0;

    // Calculate rewards for each validator for this year
    validatorsToShow.forEach(validator => {
      if (yearIndex === 0) {
        return; // No rewards in first year
      }
      const previousBalance = validator[yearIndex - 1] || 0; // Use previous year's balance
      if (previousBalance >= 2048) {
        return; // No rewards if at cap
      }
      // Use exact same calculation as ValidatorOptimizer
      const yearRewards = calculateClRewards(previousBalance, clApr);
      yearlyRewards += yearRewards;
    });

    return {
      rewards: yearlyRewards
    };
  }) || [];

  if (yearlyData.length === 0) {
    return <div>No yearly data available</div>;
  }

  // Only show the first 3 years
  const yearsToShow = Array.from({ length: Math.min(yearlyData.length, 3) }, (_, i) => i);
  const data = {
    labels: yearsToShow.map((_, i) => `Year ${i + 1}`),
    datasets: [
      {
        label: "Additional Consensus Rewards vs Standard Method",
        data: yearsToShow.map((_, index) => {
          const optimizedRewards = yearlyData[index]?.rewards || 0;
          const standardRewardsValue = standardRewards?.[index] || 0;
          // This should sum to 3.77 ETH over the total period
          return optimizedRewards - standardRewardsValue;
        }),
        backgroundColor: "rgba(59, 130, 246, 0.4)",
        borderColor: "rgb(59, 130, 246)",
        borderWidth: 1
      }
    ]
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.raw as number;
            if (value >= 0) {
              return `+${value.toFixed(2)} ETH more than Standard Method`;
            } else {
              return `${value.toFixed(2)} ETH less than Standard Method`;
            }
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Additional Consensus Rewards vs Standard Method (ETH)',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        ticks: {
          callback: function(value) {
            const numValue = Number(value);
            return numValue >= 0 ? '+' + numValue : numValue;
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Year',
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      }
    }
  };

  // Calculate metrics
  const initialStake = validatorsToShow[0]?.[0] || 0;
  const finalStake = validatorsToShow[validatorsToShow.length - 1]?.[validatorsToShow[validatorsToShow.length - 1].length - 1] || 0;
  const cappedCount = validatorsToShow.filter(v => v[v.length - 1] >= validatorCap).length;
  const firstCapYear = validatorsToShow.findIndex(v => v.some(b => b >= validatorCap));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Chart will be added here */}
    </div>
  );
} 