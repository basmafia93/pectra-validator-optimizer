# Pectra Validator Stake Optimizer

A Streamlit web application that helps Ethereum stakers optimize their validator deployment strategy and visualize long-term staking returns.

## Features

- Calculate optimal starting stake based on APY and time horizon
- Simulate growth with both consensus layer and execution layer rewards
- Visualize staking returns over time
- Export detailed growth projections as CSV
- Support for multiple validator calculations

## Installation

1. Clone this repository
2. Install the required packages:
```bash
pip install -r requirements.txt
```

## Usage

Run the Streamlit app:
```bash
streamlit run validator_optimizer.py
```

The app will open in your default web browser. You can then:

1. Enter your desired Consensus Layer APY (%)
2. Set your investment time horizon in years
3. Input the Execution Layer reward rate (%)
4. Specify your total available ETH for staking
5. View the optimal starting stake and number of validators you can create
6. Simulate growth with different initial stake amounts
7. Download the growth projection data as CSV

## How it Works

The optimizer uses compound interest mathematics to calculate the optimal starting stake that will reach the MaxEB (2048 ETH) cap at the end of your specified time horizon. This helps maximize returns while avoiding stake dilution from hitting the cap too early.

The growth simulation takes into account:
- Consensus layer rewards (staking APY)
- Execution layer rewards
- MaxEB cap of 2048 ETH per validator
- Compound interest effects

## Notes

- All calculations assume a constant APY over the time horizon
- The MaxEB cap is set at 2048 ETH per validator
- Execution layer rewards are calculated based on the capped validator balance
- The tool supports both discrete and continuous compounding models 