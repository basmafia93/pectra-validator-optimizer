function simulateValidatorGrowth(initialStake: number, clApr: number, years: number): number[] {
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
}

export function calculateValidatorMetrics(
  totalEth: number,
  networkAprPercent: number,
  years: number
): ValidatorMetrics {
  const { clApr, elApr } = splitNetworkApr(networkAprPercent);
  
  // Standard method calculations
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
    
    // Create new validators if possible
    const newValidators = Math.floor(yearRewards / 32.002);
    if (newValidators > 0) {
      currentValidators += newValidators;
      standardInitialDepositCosts += newValidators * 0.002;
    }
  }
  
  // Pectra method calculations
  const { optimalStake, mainValidators, remainingEth, hasExtra } = 
    findOptimalDistribution(totalEth, networkAprPercent, years);
  
  let pectraTotalRewards = 0;
  const pectraInitialDepositCosts = (mainValidators + (hasExtra ? 1 : 0)) * 0.002;
  
  const validators = [...Array(mainValidators)].fill(optimalStake);
  if (hasExtra) validators.push(remainingEth);
  
  for (const validator of validators) {
    let current = validator;
    for (let year = 0; year < years; year++) {
      if (current >= 2048) continue;
      const yearRewards = calculateClRewards(current, clApr);
      current = Math.min(current + yearRewards, 2048);
      pectraTotalRewards += yearRewards;
    }
  }
  
  // Calculate EL rewards
  const standardElRewards = calculateElRewards(totalEth, elApr, years);
  const pectraElRewards = calculateElRewards(totalEth, elApr, years);
  
  // Calculate final totals and APRs
  const standardTotal = standardTotalRewards - standardInitialDepositCosts + standardElRewards;
  const pectraTotal = pectraTotalRewards - pectraInitialDepositCosts + pectraElRewards;
  
  const standardInitialStake = standardInitialValidators * 32;
  const pectraInitialStake = mainValidators * optimalStake + (hasExtra ? remainingEth : 0);
  
  const standardApr = ((standardTotal - standardInitialStake) / standardInitialStake / years) * 100;
  const pectraApr = ((pectraTotal - pectraInitialStake) / pectraInitialStake / years) * 100;
  
  // Generate chart data
  const chartData = Array.from({ length: years + 1 }, (_, i) => ({
    year: i,
    standardBalance: standardInitialStake + (standardTotal - standardInitialStake) * (i / years),
    pectraBalance: pectraInitialStake + (pectraTotal - pectraInitialStake) * (i / years),
    maxEffectiveBalance: 2048 * mainValidators
  }));

  return {
    optimalStake,
    mainValidators,
    remainingEth,
    hasExtra,
    standardTotal,
    pectraTotal,
    standardApr,
    pectraApr,
    chartData
  };
} 