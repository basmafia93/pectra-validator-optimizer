'use client';

import * as React from "react"
import { useState } from 'react';
import { Card } from '../../components/ui/card';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoCircledIcon } from "@radix-ui/react-icons"

interface ValidatorOptimizerProps {
  className?: string;
}

export function ValidatorOptimizer({ className }: ValidatorOptimizerProps) {
  const [totalEth, setTotalEth] = useState(10000);
  const [networkApr, setNetworkApr] = useState(3.38);
  const [years, setYears] = useState(3);
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const splitNetworkApr = (networkAprPercent: number) => {
    const clRatio = 0.825;
    const elRatio = 0.175;
    const clApr = networkAprPercent * clRatio;
    const elApr = networkAprPercent * elRatio;
    return { clApr, elApr };
  };

  const calculateElRewards = (initialStake: number, elAprPercent: number, years: number) => {
    const r = elAprPercent / 100;
    return initialStake * r * years;
  };

  const calculateClRewards = (balance: number, apr: number) => {
    const flooredBalance = Math.floor(balance);
    return flooredBalance * (apr / 100);
  };

  const simulateValidatorGrowth = (initialStake: number, clApr: number, years: number) => {
    const balances = [initialStake];
    let current = initialStake;

    for (let i = 0; i < years; i++) {
      if (current >= 2048) {
        balances.push(2048);
        continue;
      }

      const rewards = calculateClRewards(current, clApr);
      current = Math.min(current + rewards, 2048);
      balances.push(current);
    }

    return balances;
  };

  const findOptimalDistribution = (totalEth: number, networkAprPercent: number, years: number) => {
    const { clApr, elApr } = splitNetworkApr(networkAprPercent);
    const target = 2048;
    const tolerance = 0.0001;
    let low = 32;
    let high = target;

    const simulateToTarget = (initial: number) => {
      let balance = initial;
      for (let i = 0; i < years; i++) {
        if (balance >= target) {
          return balance;
        }
        const rewards = calculateClRewards(balance, clApr);
        balance += rewards;
      }
      return balance;
    };

    while (high - low > tolerance) {
      const mid = (low + high) / 2;
      const finalBalance = simulateToTarget(mid);

      if (Math.abs(finalBalance - target) < tolerance) {
        break;
      } else if (finalBalance < target) {
        low = mid;
      } else {
        high = mid;
      }
    }

    const optimalStake = (low + high) / 2;
    const numValidators = Math.floor(totalEth / optimalStake);
    const remainingEth = totalEth - (numValidators * optimalStake);
    const hasExtra = remainingEth >= 32;

    return {
      optimalStake,
      numValidators,
      remainingEth: hasExtra ? remainingEth : 0,
      hasExtra
    };
  };

  const calculateResults = () => {
    try {
      setIsCalculating(true);
      setError(null);

      const { clApr, elApr } = splitNetworkApr(networkApr);
      const { optimalStake, numValidators, remainingEth, hasExtra } = findOptimalDistribution(totalEth, networkApr, years);

      // Initialize validator lists
      const mainValidators = Array(numValidators).fill(optimalStake);
      const extraValidator = hasExtra ? [remainingEth] : [];
      const allValidators = [...mainValidators, ...extraValidator];

      // Calculate EL rewards
      const standardElRewards = calculateElRewards(totalEth, elApr, years);
      const pectraElRewards = calculateElRewards(totalEth, elApr, years);

      // Track total balance over time
      const validatorBalances = allValidators.map(initialStake => 
        simulateValidatorGrowth(initialStake, clApr, years)
      );

      // Calculate rewards for standard method
      const standardInitialValidators = Math.floor(totalEth / 32);
      const standardInitialDepositCosts = standardInitialValidators * 0.002;
      let standardTotalRewards = 0;
      let currentValidators = standardInitialValidators;

      for (let year = 0; year < years; year++) {
        let yearRewards = 0;
        for (let i = 0; i < currentValidators; i++) {
          yearRewards += calculateClRewards(32, clApr);
        }
        standardTotalRewards += yearRewards;

        const newValidators = Math.floor(yearRewards / 32.002);
        if (newValidators > 0) {
          currentValidators += newValidators;
        }
      }

      // Calculate rewards for Pectra method
      let pectraTotalRewards = 0;
      const pectraInitialDepositCosts = numValidators * 0.002 + (hasExtra ? 0.002 : 0);

      for (const validator of allValidators) {
        let currentBalance = validator;
        for (let year = 0; year < years; year++) {
          if (currentBalance >= 2048) {
            continue;
          }
          const yearRewards = calculateClRewards(currentBalance, clApr);
          currentBalance = Math.min(currentBalance + yearRewards, 2048);
          pectraTotalRewards += yearRewards;
        }
      }

      // Calculate APRs
      const standardInitialStake = standardInitialValidators * 32;
      const standardClApr = ((standardTotalRewards - standardInitialDepositCosts) / standardInitialStake / years) * 100;
      const pectraInitialStake = mainValidators.reduce((a, b) => a + b, 0) + (hasExtra ? remainingEth : 0);
      const pectraClApr = ((pectraTotalRewards - pectraInitialDepositCosts) / pectraInitialStake / years) * 100;

      const standardTotalApr = standardClApr + elApr;
      const pectraTotalApr = pectraClApr + elApr;

      // Calculate improvements
      const standardTotal = standardTotalRewards - standardInitialDepositCosts + standardElRewards;
      const pectraTotal = pectraTotalRewards - pectraInitialDepositCosts + pectraElRewards;
      const rewardImprovement = pectraTotal - standardTotal;
      const totalImprovement = (rewardImprovement / standardTotal) * 100;
      const totalAprImprovement = pectraTotalApr - standardTotalApr;

      setResults({
        optimalStake,
        numValidators,
        remainingEth,
        hasExtra,
        standardTotal,
        pectraTotal,
        rewardImprovement,
        totalImprovement,
        standardTotalApr,
        pectraTotalApr,
        totalAprImprovement,
        validatorBalances
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while calculating results');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className={className}>
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">Pectra Validator Stake Optimizer</h1>
        
        <Alert className="mb-6">
          <InfoCircledIcon className="h-4 w-4" />
          <AlertTitle>Optimize your validator stakes</AlertTitle>
          <AlertDescription>
            Maximize rewards while respecting the 2048 ETH cap. Our advanced algorithm helps you find the perfect balance between initial stake and long-term growth.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-2">
            <Label htmlFor="totalEth">Total ETH Available</Label>
            <Input
              id="totalEth"
              type="number"
              value={totalEth}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTotalEth(Number(e.target.value))}
              min={32}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="networkApr">Network APR (%)</Label>
            <Input
              id="networkApr"
              type="number"
              value={networkApr}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNetworkApr(Number(e.target.value))}
              min={0}
              max={100}
              step={0.01}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="years">Time Horizon (Years)</Label>
            <Input
              id="years"
              type="number"
              value={years}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setYears(Number(e.target.value))}
              min={1}
              step={1}
            />
          </div>
        </div>

        <Button 
          onClick={calculateResults}
          disabled={isCalculating}
          className="w-full"
        >
          {isCalculating ? 'Calculating...' : 'Calculate Optimal Distribution'}
        </Button>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {results && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <h3 className="text-sm font-medium text-gray-500">Optimal Stake per Validator</h3>
                <p className="text-2xl font-bold">{results.optimalStake.toFixed(2)} ETH</p>
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-medium text-gray-500">Number of Validators</h3>
                <p className="text-2xl font-bold">{results.numValidators}</p>
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-medium text-gray-500">Additional Validator</h3>
                <p className="text-2xl font-bold">{results.remainingEth.toFixed(2)} ETH</p>
              </Card>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Standard 32-ETH</TableHead>
                  <TableHead>Pectra Auto-compounding</TableHead>
                  <TableHead>Improvement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Total Rewards (CL + EL)</TableCell>
                  <TableCell>{results.standardTotal.toFixed(2)} ETH</TableCell>
                  <TableCell>{results.pectraTotal.toFixed(2)} ETH</TableCell>
                  <TableCell className="text-green-600">+{results.rewardImprovement.toFixed(2)} ETH</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total APR (CL + EL)</TableCell>
                  <TableCell>{results.standardTotalApr.toFixed(3)}%</TableCell>
                  <TableCell>{results.pectraTotalApr.toFixed(3)}%</TableCell>
                  <TableCell className="text-green-600">+{results.totalAprImprovement.toFixed(3)}%</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Alert>
              <InfoCircledIcon className="h-4 w-4" />
              <AlertTitle>Why the difference?</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Standard 32-ETH validator with manual compounding: Requires manual reinvestment of rewards to create new validators (costs 0.002 ETH per validator)</li>
                  <li>Pectra: Auto-compounding maximizes rewards by automatically reinvesting earnings</li>
                  <li>Optimized validator sizes: Pectra calculates the optimal stake to reach the 2048 ETH cap</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </Card>
    </div>
  );
} 