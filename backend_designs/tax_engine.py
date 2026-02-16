class TaxEngine:
    def __init__(self):
        # SIFL Rates (Example for 2023 Period 1: Jan 1 - Jun 30)
        # Rates are in Dollars
        self.sifl_rates = {
            "2023-H1": {
                "0-500": 0.2845,   # $0.2845 per mile
                "500+": 0.2169,    # $0.2169 per mile
                "terminal_charge": 52.00 # $52.00 per landing
            }
        }

    def calculate_sifl(self, aircraft_weight, distance_miles, period, tax_status):
        """
        Calculates IRS SIFL Imputed Income.
        Formula: (Rate * Miles) + Terminal Charge.
        """
        # Constraint: Business trips have $0 imputed income
        if tax_status == "Business":
            return 0.00

        # Select rates for the period
        rates = self.sifl_rates.get(period)
        if not rates:
            raise ValueError(f"No rates found for period {period}")

        # Multipliers based on aircraft weight (Simplification for standard executive jets)
        # For Control Employees on Employer-provided aircraft:
        # If weight > 25,000 lbs, typical multiplier logic might apply, 
        # but standard SIFL is often just the cents-per-mile calculation for the seat.
        # We will use the standard rate * distance.
        
        income = 0.0
        
        if distance_miles <= 500:
            income = distance_miles * rates["0-500"]
        else:
            # First 500 miles at higher rate, remainder at lower rate
            # Note: The IRS formula is often strictly applied to the total logic, 
            # but usually it's per statute mile. 
            # Correct precise brackets: 
            #  (500 * Rate1) + ((Total - 500) * Rate2) ??
            #  Actually, usually it calculates the whole flight based on the bracket it falls into OR progressive?
            #  Standard IRS method: 
            #  Up to 500 miles: Multiplier * (MileRate1 * Miles)
            #  Over 500 miles: Multiplier * ((MileRate1 * 500) + (MileRate2 * (Miles-500)))
            #  Plus Terminal Charge
            
            income = (500 * rates["0-500"]) + ((distance_miles - 500) * rates["500+"])

        # Add Terminal Charge
        income += rates["terminal_charge"]

        return round(income, 2)

    def calculate_sec_incremental_cost(self, leg_type, variable_costs, allocated_to_pax=None):
        """
        Calculates SEC Incremental Cost.
        Logic: Sum of variable costs.
        Allocation: If 'Deadhead', assign 100% to the specific owner (allocated_to_pax).
        """
        total_variable_cost = sum(variable_costs.values())

        if leg_type == "Deadhead":
            if not allocated_to_pax:
                return {
                    "error": "Deadhead requires an allocated passenger/owner.",
                    "total_cost": total_variable_cost,
                    "allocation": "Unassigned"
                }
            
            return {
                "total_cost": total_variable_cost,
                "allocation": {
                    allocated_to_pax: total_variable_cost
                },
                "note": "100% allocated to owner for repositioning."
            }
        
        # For Live legs, cost is reportable but usually SIFL is the income key. 
        # SEC requires reporting the incremental cost of the personal benefit.
        # If multiple passengers, simple division or specific logic?
        # We will return the total for the leg to be divided by the platform logic later.
        return {
            "total_cost": total_variable_cost,
            "allocation": "Shared (Requires Passenger Count Logic)"
        }

# Example Usage
if __name__ == "__main__":
    engine = TaxEngine()
    
    # 1. Test SIFL Calculation
    # Personal trip, 600 miles
    sifl_value = engine.calculate_sifl(
        aircraft_weight=30000, 
        distance_miles=600, 
        period="2023-H1", 
        tax_status="Personal-Ent"
    )
    print(f"SIFL Income (600 miles, Personal): ${sifl_value}") # Exp: (500*.2845) + (100*.2169) + 52

    # 2. Test SEC Cost
    # Deadhead leg cost allocation
    costs = {"Fuel": 1500, "Catering": 0, "Crew": 200, "Landing": 100}
    sec_cost = engine.calculate_sec_incremental_cost(
        leg_type="Deadhead", 
        variable_costs=costs, 
        allocated_to_pax="CEO_John_Doe"
    )
    print(f"SEC Allocation: {sec_cost}")
