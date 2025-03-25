import math
import pandas as pd
import streamlit as st
import numpy as np
from math import floor
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import traceback

# Set page configuration
st.set_page_config(
    page_title="Pectra Validator Stake Optimizer",
    page_icon="🌟",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
    <style>
    .main {
        padding: 2rem;
    }
    .stButton>button {
        width: 100%;
        padding: 0.5rem;
        font-weight: 600;
    }
    .stProgress .st-bo {
        background-color: #00A3FF;
    }
    h1 {
        font-size: 2.5rem !important;
        font-weight: 700 !important;
        margin-bottom: 2rem !important;
        color: #1a1a1a;
    }
    h3 {
        font-size: 1.5rem !important;
        font-weight: 600 !important;
        margin: 1.5rem 0 !important;
        color: #1a1a1a;
    }
    .stNumberInput input {
        font-size: 1.1rem;
    }
    .info-box {
        padding: 1.5rem;
        border-radius: 0.5rem;
        background-color: #f8f9fa;
        border: 1px solid #e9ecef;
        margin: 1rem 0;
        color: #495057;
    }
    .metric-container {
        background-color: white;
        padding: 1rem;
        border-radius: 0.5rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        margin-bottom: 1rem;
    }
    .section-header {
        color: #1a1a1a;
        font-weight: 600;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #e9ecef;
    }
    .comparison-table {
        background-color: white;
        border-radius: 0.8rem;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        margin: 1.5rem 0;
        overflow: hidden;
    }
    .comparison-table th {
        background-color: #f1f5f9;
        color: #334155;
        font-weight: 600;
        padding: 1.2rem 1rem;
        text-align: left;
        white-space: nowrap;
    }
    .comparison-table td {
        padding: 1rem;
        border-bottom: 1px solid #e2e8f0;
        color: #1a1a1a;
    }
    .comparison-table tr:last-child td {
        border-bottom: none;
    }
    .comparison-table tr:hover {
        background-color: #f8fafc;
    }
    .improvement-cell {
        font-weight: 600;
        color: #059669;
    }
    .equal-cell {
        color: #6b7280;
        font-style: italic;
    }
    .table-title {
        font-size: 1.5rem;
        font-weight: 600;
        color: #1a1a1a;
        margin: 2rem 0 1rem 0;
    }
    .table-description {
        color: #4b5563;
        margin-bottom: 1rem;
        font-size: 1.1rem;
    }
    </style>
""", unsafe_allow_html=True)

try:
    def split_network_apr(network_apr_percent):
        """Split network APR into Consensus Layer and Execution Layer components"""
        # Based on current ratio: CL is ~82.5% and EL is ~17.5% of network APR
        cl_ratio = 0.825
        el_ratio = 0.175
        
        cl_apr = network_apr_percent * cl_ratio
        el_apr = network_apr_percent * el_ratio
        return cl_apr, el_apr

    def calculate_el_rewards(initial_stake, EL_APR_percent, years):
        """Calculate execution layer rewards (non-compounding, paid to withdrawal address)"""
        r = EL_APR_percent / 100
        rewards = initial_stake * r * years
        
        # Debug info
        print(f"\nEL Rewards for {initial_stake:.2f} ETH:")
        print(f"EL APR: {EL_APR_percent:.2f}%")
        print(f"Years: {years}")
        print(f"Total EL rewards: {rewards:.2f} ETH")
        print(f"Average EL rewards per year: {(rewards/years):.2f} ETH")
        
        return rewards

    def calculate_cl_rewards(balance, apr):
        """Calculate consensus layer rewards based on floored balance"""
        # Floor the balance before calculating rewards
        floored_balance = floor(balance)
        return floored_balance * (apr / 100)

    def simulate_validator_growth(initial_stake, cl_apr, years):
        """Simulate validator balance growth with floor-based rewards"""
        balances = [initial_stake]
        current = initial_stake
        
        for _ in range(years):
            if current >= 2048:
                balances.append(2048)
                continue
                
            # Calculate rewards based on floored balance
            rewards = calculate_cl_rewards(current, cl_apr)
            # Add rewards and cap at 2048
            current = min(current + rewards, 2048)
            balances.append(current)
        
        return balances

    def find_optimal_distribution(total_eth, network_apr_percent, years):
        """Find optimal initial stake to reach 2048 ETH exactly at target year"""
        cl_apr, el_apr = split_network_apr(network_apr_percent)
        
        print(f"\nCalculating optimal stake for {total_eth:.2f} ETH:")
        print(f"Network APR: {network_apr_percent:.2f}%")
        print(f"CL APR: {cl_apr:.2f}%")
        print(f"Target years: {years}")
        
        # Binary search for optimal stake
        target = 2048
        tolerance = 0.0001
        low = 32  # Minimum stake
        high = target  # Maximum possible stake
        
        def simulate_to_target(initial):
            balance = initial
            for _ in range(years):
                if balance >= target:
                    return balance
                rewards = calculate_cl_rewards(balance, cl_apr)
                balance += rewards
            return balance
        
        while high - low > tolerance:
            mid = (low + high) / 2
            final_balance = simulate_to_target(mid)
            
            if abs(final_balance - target) < tolerance:
                break
            elif final_balance < target:
                low = mid
            else:
                high = mid
        
        optimal_stake = mid
        
        # Verify the calculation
        verification = simulate_to_target(optimal_stake)
        print(f"\nVerification:")
        print(f"Initial stake: {optimal_stake:.2f}")
        print(f"Final balance: {verification:.2f}")
        
        # Calculate number of validators and remaining ETH
        num_validators = int(total_eth // optimal_stake)
        remaining_eth = total_eth - (num_validators * optimal_stake)
        
        # If we have enough remaining for another validator, use it
        has_extra = remaining_eth >= 32
        
        print(f"\nDistribution:")
        print(f"Number of main validators: {num_validators}")
        print(f"Optimal stake per validator: {optimal_stake:.2f} ETH")
        print(f"Remaining ETH: {remaining_eth:.2f}")
        print(f"Has extra validator: {has_extra}")
        
        return optimal_stake, num_validators, remaining_eth if has_extra else 0, has_extra

    def format_eth(value):
        """Format a number as ETH with 2 decimal places for small numbers, no decimals for large numbers"""
        if value >= 100:  # For larger numbers, no decimals
            return f"{int(round(value))} ETH"
        return f"{value:.2f} ETH"

    def format_eth_value(eth_str):
        """Convert ETH string back to float, handling commas and ETH suffix"""
        # Remove ETH suffix, commas, and any whitespace
        cleaned_str = eth_str.replace(" ETH", "").replace(",", "").strip()
        return float(cleaned_str)

    # Streamlit web app UI
    if __name__ == "__main__":
        # Header section
        st.title("Pectra Validator Stake Optimizer")
        st.markdown("""
            <div class="info-box">
            <p>Optimize your validator stakes to maximize rewards while respecting the 2048 ETH cap. 
            Our advanced algorithm helps you find the perfect balance between initial stake and long-term growth.</p>
            </div>
        """, unsafe_allow_html=True)

        # Input parameters in sidebar
        st.sidebar.markdown("## Configuration")
        st.sidebar.markdown("Adjust your staking parameters below:")
        
        total_eth_available = st.sidebar.number_input(
            "Total ETH Available",
            value=10000,
            step=1,
            format="%d",
            help="Enter the total amount of ETH you have available for staking"
        )
        
        network_apr = st.sidebar.number_input(
            "Network APR (%)",
            value=3.38,
            step=0.01,
            help="Current network Annual Percentage Rate (APR)"
        )
        
        years = st.sidebar.number_input(
            "Time Horizon (Years)",
            value=3,
            step=1,
            help="Number of years you plan to stake"
        )

        # Network stats in sidebar
        st.sidebar.markdown("---")
        cl_apr, el_apr = split_network_apr(network_apr)

        # Calculate optimal distribution
        optimal_stake, main_count, remaining_eth, has_extra = find_optimal_distribution(total_eth_available, network_apr, years)
        
        # Initialize validator lists
        main_validators = [optimal_stake] * main_count
        extra_validator = [remaining_eth] if has_extra else []
        all_validators = main_validators + extra_validator
        
        # Results in a clean grid layout
        st.markdown("### Optimal Distribution Strategy")
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.metric(
                "Optimal Stake per Validator",
                format_eth(optimal_stake)
            )
        
        with col2:
            st.metric(
                "Number of Validators",
                str(main_count)
            )
        
        with col3:
            st.metric(
                "Additional Validator",
                format_eth(remaining_eth)
            )

        # Calculate EL rewards for both methods
        standard_el_rewards = calculate_el_rewards(total_eth_available, el_apr, years)
        pectra_el_rewards = calculate_el_rewards(total_eth_available, el_apr, years)

        # Track total balance over time
        validator_balances = []
        for initial_stake in all_validators:
            balances = simulate_validator_growth(initial_stake, cl_apr, years)
            validator_balances.append(balances)
        
        # Create balance data for chart
        chart_data = []
        year_labels = list(range(years + 1))
        
        for year in year_labels:
            year_data = {'Year': f'Year {year}'}
            total_initial_stake = sum(main_validators)
            total_balance = sum(validator_balances[i][year] for i in range(len(main_validators)))
            cl_rewards = total_balance - total_initial_stake
                
            # Calculate EL rewards based on current balance
            el_rewards = (el_apr / 100) * total_balance * year
            
            year_data['Initial Stake'] = total_initial_stake
            year_data['CL Rewards'] = cl_rewards
            year_data['EL Rewards'] = el_rewards
            year_data['Max Effective Balance'] = 2048 * main_count
            chart_data.append(year_data)
        
        df = pd.DataFrame(chart_data)
        
        # Create the chart
        st.write("### Validator Balances Over Time")
        st.write("This chart shows the initial stake, consensus layer rewards, and execution layer rewards. The maximum effective balance cap (2048 ETH per validator) is shown as a red dashed line. Note that only the initial stake and consensus layer rewards count towards the validator balance cap - execution layer rewards are paid to the withdrawal address and do not affect the validator balance.")
        
        # Create main chart with stacked bars
        fig = go.Figure()
        
        fig.add_trace(go.Bar(
            x=df['Year'],
            y=df['Initial Stake'],
            name='Initial Stake',
            marker_color='rgba(100, 149, 237, 0.8)'
        ))
        fig.add_trace(go.Bar(
            x=df['Year'],
            y=df['CL Rewards'],
            name='CL Rewards',
            marker_color='rgba(135, 206, 250, 0.8)'
        ))
        fig.add_trace(go.Bar(
            x=df['Year'],
            y=df['EL Rewards'],
            name='EL Rewards',
            marker_color='rgba(200, 200, 200, 0.8)'
        ))
        
        max_eb_value = df['Max Effective Balance'].iloc[0]
        fig.add_hline(
            y=max_eb_value,
            line_dash="dash",
            line_color="red",
            line_width=2,
            name='MAX EB Cap'
        )
        
        fig.update_layout(
            barmode='stack',
            xaxis_title='Year',
            yaxis_title='ETH',
            height=400,
            showlegend=True,
            hovermode='x unified',
            yaxis=dict(
                range=[0, max_eb_value * 1.2],
                showgrid=False
            ),
            xaxis=dict(
                showgrid=False,
                range=[-0.5, len(df) - 0.5]
            ),
            plot_bgcolor='white'
        )
        
        st.plotly_chart(fig, use_container_width=True)

        # Calculate total rewards and deposit costs for standard method
        standard_initial_validators = int(total_eth_available // 32)
        standard_initial_deposit_costs = standard_initial_validators * 0.002
        standard_total_rewards = 0
        current_validators = standard_initial_validators
        
        for year in range(years):
            year_rewards = 0
            for _ in range(current_validators):
                year_rewards += calculate_cl_rewards(32, cl_apr)
            standard_total_rewards += year_rewards
            
            # Create new validators if rewards are sufficient
            new_validators = int(year_rewards // 32.002)
            if new_validators > 0:
                current_validators += new_validators
                standard_initial_deposit_costs += new_validators * 0.002
        
        # Calculate total rewards for Pectra method
        pectra_total_rewards = 0
        pectra_initial_deposit_costs = main_count * 0.002
        if has_extra:
            pectra_initial_deposit_costs += 0.002
            
        # Calculate rewards for each validator with auto-compounding
        for validator in all_validators:
            current_balance = validator
            for year in range(years):
                if current_balance >= 2048:
                    year_rewards = 0
                else:
                    year_rewards = calculate_cl_rewards(current_balance, cl_apr)
                    current_balance = min(current_balance + year_rewards, 2048)
                pectra_total_rewards += year_rewards
        
        # Calculate APRs first
        standard_cl_apr = ((standard_total_rewards - standard_initial_deposit_costs) / total_eth_available / years) * 100
        pectra_cl_apr = ((pectra_total_rewards - pectra_initial_deposit_costs) / total_eth_available / years) * 100
        
        # EL APR is the same for both methods
        standard_el_apr = el_apr
        pectra_el_apr = el_apr
        
        # Calculate total APRs
        standard_total_apr = standard_cl_apr + standard_el_apr
        pectra_total_apr = pectra_cl_apr + pectra_el_apr
        
        # Calculate improvements
        standard_total = standard_total_rewards - standard_initial_deposit_costs + standard_el_rewards
        pectra_total = pectra_total_rewards - pectra_initial_deposit_costs + pectra_el_rewards
        reward_improvement = pectra_total - standard_total
        total_improvement = (reward_improvement / standard_total) * 100
        
        # Calculate APR improvements based on actual APR differences
        total_apr_improvement = pectra_total_apr - standard_total_apr

        # Create side-by-side comparison sections
        st.markdown("<h3 class='table-title'>Performance Comparison</h3>", unsafe_allow_html=True)
        st.markdown("<p class='table-description'>Compare the total rewards and APRs between staking methods over your investment period:</p>", unsafe_allow_html=True)
        
        comparison_data = {
            'Metric': [
                '<strong>Total Rewards (CL + EL)</strong>',
                '<strong>Total APR (CL + EL)</strong>'
            ],
            'Standard 32-ETH validator with manual compounding': [
                f"{standard_total:.2f} ETH",
                f"{standard_total_apr:.3f}%"
            ],
            'Pectra Auto-compounding': [
                f"{pectra_total:.2f} ETH",
                f"{pectra_total_apr:.3f}%"
            ],
            'Improvement': [
                f"<span class='improvement-cell'>+{reward_improvement:.2f} ETH</span>",
                f"<span class='improvement-cell'>+{total_apr_improvement:.3f}%</span>"
            ]
        }
        
        comparison_df = pd.DataFrame(comparison_data)
        st.write(comparison_df.to_html(escape=False, index=False), unsafe_allow_html=True)

        # Add explanation
        st.markdown("""
            <div class="info-box">
            <p><strong>Why the difference?</strong></p>
            <ul>
                <li>Standard 32-ETH validator with manual compounding: Requires manual reinvestment of rewards to create new validators (costs 0.002 ETH per validator)</li>
                <li>Pectra: Auto-compounding maximizes rewards by automatically reinvesting earnings</li>
                <li>Optimized validator sizes: Pectra calculates the optimal stake to reach the 2048 ETH cap</li>
            </ul>
            </div>
        """, unsafe_allow_html=True)

        # Key assumptions in an expandable section
        with st.expander("Key Assumptions and Methodology", expanded=False):
            st.markdown("""
                <div class="info-box">
                <h4>Calculation Methodology</h4>
                
                * **Network APR Split:**
                  * Consensus Layer (82.5%): Rewards based on validator balance
                  * Execution Layer (17.5%): Paid to withdrawal address (not restaked)
                
                * **Standard 32-ETH validator with manual compounding:**
                  * Fixed 32 ETH per validator
                  * Rewards = 32 ETH × CL_APR × years
                  * New validators created when rewards ≥ 32.002 ETH
                  * Deposit cost: 0.002 ETH per new validator
                  * Rewards from new validators start in next year
                  * Execution layer rewards are paid to withdrawal address (not restaked)
                
                * **Pectra Auto-compounding:**
                  * Optimal stake calculated to reach 2048 ETH at target year
                  * Daily rewards = floor(balance) × (CL_APR / 365)
                  * Annual compounding: balance = min(balance + daily_rewards × 365, 2048)
                  * All consensus layer rewards auto-compound until 2048 ETH cap
                  * No new validators created
                  * Execution layer rewards are paid to withdrawal address (not restaked)
                </div>
            """, unsafe_allow_html=True)

        # Footer
        st.markdown("""
            <div style="text-align: center; margin-top: 2rem; padding: 1rem; color: #666;">
            <p>Powered by Pectra | Built for Ethereum Stakers</p>
            </div>
        """, unsafe_allow_html=True)

except Exception as e:
    st.error(f"An error occurred: {str(e)}")
    st.error(f"Traceback: {traceback.format_exc()}") 