"use client";

import React, { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function ValidatorOptimizer() {
  const [totalEth, setTotalEth] = useState(10000);
  const [networkApr, setNetworkApr] = useState(3.38);
  const [years, setYears] = useState(3);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Add useEffect to calculate results whenever inputs change
  useEffect(() => {
    calculateResults();
  }, [totalEth, networkApr, years]);

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
    
    // Handle case where total ETH is less than optimal stake
    if (totalEth < optimalStake) {
      return {
        optimalStake: totalEth,
        numValidators: 1,
        remainingEth: 0,
        hasExtra: false
      };
    }

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
      const standardYearlyRewards = [];

      for (let year = 0; year < years; year++) {
        let yearRewards = 0;
        for (let i = 0; i < currentValidators; i++) {
          yearRewards += calculateClRewards(32, clApr);
        }
        standardYearlyRewards.push(yearRewards);
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
        validatorBalances,
        standardYearlyRewards,
        standardClApr,
        pectraClApr,
        standardTotalRewards,
        pectraTotalRewards
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while calculating results');
    }
  };

  return (
    <div style={{ 
      maxWidth: "1200px", 
      margin: "0 auto", 
      padding: "2rem 1rem"
    }}>
      <div style={{ 
        padding: "2rem",
        marginBottom: "2rem"
      }}>
        <h1 style={{ 
          fontSize: "2.5rem", 
          fontWeight: "bold", 
          marginBottom: "0.75rem",
          color: "white",
          textShadow: "0 2px 4px rgba(0, 0, 0, 0.3)"
        }}>
          Validator Stake Optimizer
        </h1>
        <p style={{ 
          color: "white",
          fontSize: "1.1rem",
          lineHeight: "1.5",
          textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)"
        }}>
          Optimize your validator deployment strategy and maximize staking returns.
        </p>
      </div>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
        gap: "1.5rem", 
        marginBottom: "2rem",
        alignItems: "stretch"
      }}>
        {/* Input Section */}
        <Card className="card" style={{ 
          padding: "1.5rem",
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85))",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          display: "flex",
          flexDirection: "column"
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", flex: 1 }}>
            <div>
              <Label 
                htmlFor="totalEth" 
                style={{ 
                  display: "block", 
                  marginBottom: "0.75rem", 
                  fontSize: "0.95rem", 
                  fontWeight: "500",
                  position: "relative",
                  cursor: "help"
                }}
                title="The total amount of ETH you want to stake across all validators. This will be distributed optimally to maximize returns while respecting the 2048 ETH cap per validator."
              >
                Total Available ETH
              </Label>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <Input
                  id="totalEth"
                  type="number"
                  value={totalEth}
                  onChange={(e) => setTotalEth(Number(e.target.value))}
                  className="input"
                  style={{ width: "120px" }}
                />
                <input
                  type="range"
                  min="32"
                  max="100000"
                  step="100"
                  value={totalEth}
                  onChange={(e) => setTotalEth(Number(e.target.value))}
                  style={{ flex: 1, height: "6px", borderRadius: "3px", background: "var(--border)", outline: "none", WebkitAppearance: "none" }}
                />
              </div>
              <p style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.5rem" }}>
                Enter the total amount of ETH you want to stake.
              </p>
            </div>

            <div>
              <Label 
                htmlFor="networkApr" 
                style={{ 
                  display: "block", 
                  marginBottom: "0.75rem", 
                  fontSize: "0.95rem", 
                  fontWeight: "500",
                  position: "relative",
                  cursor: "help"
                }}
                title="The expected annual percentage rate (APR) for staking rewards. Current network APR is around 3.38%."
              >
                Network APR (%)
              </Label>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <Input
                  id="networkApr"
                  type="number"
                  value={networkApr}
                  onChange={(e) => setNetworkApr(Number(e.target.value))}
                  className="input"
                  style={{ width: "120px" }}
                  step="0.01"
                />
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.01"
                  value={networkApr}
                  onChange={(e) => setNetworkApr(Number(e.target.value))}
                  style={{ flex: 1, height: "6px", borderRadius: "3px", background: "var(--border)", outline: "none", WebkitAppearance: "none" }}
                />
              </div>
              <p style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.5rem" }}>
                The expected annual percentage rate for staking rewards.
              </p>
            </div>

            <div>
              <Label 
                htmlFor="years" 
                style={{ 
                  display: "block", 
                  marginBottom: "0.75rem", 
                  fontSize: "0.95rem", 
                  fontWeight: "500",
                  position: "relative",
                  cursor: "help"
                }}
                title="The number of years to project the staking rewards. Longer time horizons allow for more compound interest and better optimization of validator distribution."
              >
                Time Horizon (Years)
              </Label>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <Input
                  id="years"
                  type="number"
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                  className="input"
                  style={{ width: "120px" }}
                />
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                  style={{ flex: 1, height: "6px", borderRadius: "3px", background: "var(--border)", outline: "none", WebkitAppearance: "none" }}
                />
              </div>
              <p style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.5rem" }}>
                How many years you plan to stake.
              </p>
            </div>
          </div>
        </Card>

        {/* Results Section */}
        <Card className="card" style={{ 
          padding: "1.5rem",
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85))",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          display: "flex",
          flexDirection: "column"
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", flex: 1 }}>
            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem" }}>
                Optimal Distribution Strategy
              </h3>
              {results ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  <div>
                    <h4 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.75rem", color: "#4C4C4C" }}>
                      Validator Composition
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#4C4C4C" }}>Standard Method:</span>
                        <span style={{ fontWeight: "500" }}>{Math.floor(totalEth / 32)} × 32.00 ETH</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#4C4C4C" }}>Optimized Method:</span>
                        <span style={{ fontWeight: "500", color: "var(--primary)" }}>
                          {results.numValidators} × {results.optimalStake.toFixed(2)} ETH
                          {results.hasExtra && ` + 1 × ${results.remainingEth.toFixed(2)} ETH`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.75rem", color: "#4C4C4C" }}>
                      Consensus Layer APR% Comparison
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#4C4C4C" }}>Standard Method:</span>
                        <span style={{ fontWeight: "500" }}>{results.standardClApr.toFixed(3)}% ({results.standardTotalRewards.toFixed(2)} ETH)</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#4C4C4C" }}>Optimized Method:</span>
                        <span style={{ fontWeight: "500", color: "var(--primary)" }}>
                          {results.pectraClApr.toFixed(3)}% ({results.pectraTotalRewards.toFixed(2)} ETH)
                        </span>
                      </div>
                      <div style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        marginTop: "0.75rem",
                        paddingTop: "0.75rem",
                        borderTop: "1px solid var(--border)"
                      }}>
                        <span style={{ color: "#4C4C4C", fontWeight: "500" }}>Additional:</span>
                        <span style={{ fontWeight: "600", color: "var(--primary)" }}>
                          +{(results.pectraClApr - results.standardClApr).toFixed(3)}% (+{(results.pectraTotalRewards - results.standardTotalRewards).toFixed(2)} ETH)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ color: "#4C4C4C" }}>Enter your parameters and click calculate to see results.</p>
              )}
            </div>
            <div style={{ 
              backgroundColor: "rgba(81, 100, 220, 0.1)", 
              padding: "1rem", 
              borderRadius: "6px",
              textAlign: "center"
            }}>
              <p style={{ color: "var(--primary)", fontSize: "0.875rem", margin: 0 }}>
                Loads your validators as close to the cap as possible, optimizing autocompounding for quicker rewards—without exceeding MaxEB until the time horizon has completed
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* About Section */}
      <Card className="card" style={{ 
        padding: "1.5rem",
        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85))",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
        maxHeight: "400px",
        overflowY: "auto"
      }}>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "1fr 1fr", 
          gap: "2rem",
          marginBottom: "2rem"
        }}>
          <div>
            <h3 style={{ 
              fontSize: "1.25rem", 
              fontWeight: "600", 
              marginBottom: "1rem",
              color: "#1a1a1a"
            }}>
              About Pectra
            </h3>
            <ul style={{ 
              margin: 0, 
              paddingLeft: "1.5rem",
              color: "#4C4C4C",
              fontSize: "0.95rem",
              lineHeight: "1.6"
            }}>
              <li style={{ marginBottom: "0.75rem" }}>Advanced Ethereum staking protocol revolutionizing validator management</li>
              <li style={{ marginBottom: "0.75rem" }}>Automated reward reinvestment and optimized allocation strategies</li>
              <li style={{ marginBottom: "0.75rem" }}>Eliminates manual restaking processes to reduce operational overhead</li>
              <li style={{ marginBottom: "0.75rem" }}>Distributes ETH across larger validators instead of traditional 32-ETH configuration</li>
              <li style={{ marginBottom: "0.75rem" }}>Strategic distribution keeps compounded rewards below MaxEB until target date</li>
              <li style={{ marginBottom: "0.75rem" }}>Enables optimal autocompounding for enhanced returns</li>
              <li style={{ marginBottom: "0.75rem" }}>Delivers significant returns through long-term compounding effects</li>
            </ul>
          </div>

          <div>
            <h3 style={{ 
              fontSize: "1.25rem", 
              fontWeight: "600", 
              marginBottom: "1rem",
              color: "#1a1a1a"
            }}>
              Implementation Assumptions
            </h3>
            <ul style={{ 
              margin: 0, 
              paddingLeft: "1.5rem",
              color: "#4C4C4C",
              fontSize: "0.95rem",
              lineHeight: "1.6"
            }}>
              <li style={{ marginBottom: "0.75rem" }}>Network APR remains constant throughout the simulation period</li>
              <li style={{ marginBottom: "0.75rem" }}>No slashing events or validator penalties are considered</li>
              <li style={{ marginBottom: "0.75rem" }}>Consensus layer rewards are fixed at 82.5% of total APR</li>
              <li style={{ marginBottom: "0.75rem" }}>Validator deposit costs are standardized at 0.002 ETH per validator</li>
              <li style={{ marginBottom: "0.75rem" }}>Maximum effective balance (MaxEB) is capped at 2048 ETH</li>
              <li style={{ marginBottom: "0.75rem" }}>No protocol upgrades or changes are assumed during the simulation period</li>
              <li style={{ marginBottom: "0.75rem" }}>The model compares against standard 32-ETH validators with manual reward compounding</li>
              <li style={{ marginBottom: "0.75rem" }}>Execution layer rewards remain constant and are excluded from the model</li>
              <li style={{ marginBottom: "0.75rem" }}>Partial withdrawals are not considered in the calculations</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
} 