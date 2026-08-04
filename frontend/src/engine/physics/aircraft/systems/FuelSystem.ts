import { FuelSystem as IFuelSystem, Vector3D } from '../types/AircraftTypes';

export interface FuelSystemConfig {
  totalCapacity: number;
  consumptionRate: number;
  lowFuelThreshold: number;
  transferRate: number;
  pumpPressure: number;
}

export class FuelSystem {
  private state: IFuelSystem;
  private config: FuelSystemConfig;
  private fuelPumpFailure = false;
  private transferTimer = 0;

  constructor(config: FuelSystemConfig) {
    this.config = config;
    
    // Initialize fuel distribution (equal distribution)
    const fuelPerTank = config.totalCapacity / 3;
    
    this.state = {
      totalCapacity: config.totalCapacity,
      remaining: config.totalCapacity,
      consumptionRate: config.consumptionRate,
      efficiency: 1.0,
      lowFuelWarning: config.lowFuelThreshold,
      fuelPumps: true,
      fuelDistribution: {
        leftWing: fuelPerTank,
        rightWing: fuelPerTank,
        center: fuelPerTank
      }
    };
  }

  public update(
    deltaTime: number,
    throttleSetting: number,
    altitude: number,
    gForce: number
  ): void {
    // Calculate fuel consumption
    const baseConsumption = this.config.consumptionRate * throttleSetting;
    
    // Altitude effect on fuel efficiency
    const altitudeEfficiency = this.calculateAltitudeEfficiency(altitude);
    
    // G-force effect on fuel flow
    const gForceEffect = Math.max(0.1, Math.min(2.0, 1.0 + (Math.abs(gForce) - 1) * 0.1));
    
    const actualConsumption = baseConsumption * altitudeEfficiency * gForceEffect * deltaTime;
    
    // Consume fuel from tanks (prioritize center tank first)
    this.consumeFuel(actualConsumption);
    
    // Update fuel pumps and transfer
    this.updateFuelTransfer(deltaTime, gForce);
    
    // Update state
    this.updateFuelState();
  }

  private calculateAltitudeEfficiency(altitude: number): number {
    // Better efficiency at higher altitudes due to thinner air
    if (altitude < 3000) {
      return 1.0;
    } else if (altitude < 8000) {
      return 1.0 + (altitude - 3000) * 0.00004; // Slight improvement
    } else {
      return 1.2; // 20% better efficiency above 8000m
    }
  }

  private consumeFuel(amount: number): void {
    let remainingToConsume = amount;
    
    // Consume from center tank first
    if (this.state.fuelDistribution.center > 0 && remainingToConsume > 0) {
      const consumed = Math.min(this.state.fuelDistribution.center, remainingToConsume);
      this.state.fuelDistribution.center -= consumed;
      remainingToConsume -= consumed;
    }
    
    // Then consume equally from wing tanks
    if (remainingToConsume > 0) {
      const perWing = remainingToConsume / 2;
      
      const leftConsumed = Math.min(this.state.fuelDistribution.leftWing, perWing);
      const rightConsumed = Math.min(this.state.fuelDistribution.rightWing, perWing);
      
      this.state.fuelDistribution.leftWing -= leftConsumed;
      this.state.fuelDistribution.rightWing -= rightConsumed;
    }
  }

  private updateFuelTransfer(deltaTime: number, gForce: number): void {
    if (!this.state.fuelPumps || this.fuelPumpFailure) {
      return;
    }
    
    this.transferTimer += deltaTime;
    
    // Transfer fuel every second
    if (this.transferTimer >= 1.0) {
      this.balanceFuel(gForce);
      this.transferTimer = 0;
    }
  }

  private balanceFuel(gForce: number): void {
    const { leftWing, rightWing, center } = this.state.fuelDistribution;
    
    // Calculate imbalance
    const wingImbalance = leftWing - rightWing;
    const maxImbalance = this.config.totalCapacity * 0.1; // 10% max imbalance
    
    // Transfer fuel to balance wings
    if (Math.abs(wingImbalance) > maxImbalance) {
      const transferAmount = Math.min(
        this.config.transferRate,
        Math.abs(wingImbalance) * 0.5
      );
      
      if (wingImbalance > 0) {
        // Left wing has more fuel
        const actualTransfer = Math.min(transferAmount, leftWing);
        this.state.fuelDistribution.leftWing -= actualTransfer;
        this.state.fuelDistribution.rightWing += actualTransfer;
      } else {
        // Right wing has more fuel
        const actualTransfer = Math.min(transferAmount, rightWing);
        this.state.fuelDistribution.rightWing -= actualTransfer;
        this.state.fuelDistribution.leftWing += actualTransfer;
      }
    }
    
    // G-force effect on fuel distribution
    if (Math.abs(gForce) > 2.0) {
      const gEffect = (Math.abs(gForce) - 1.0) * 0.01;
      // High G-forces can cause fuel to shift
      const shift = Math.min(this.config.totalCapacity * 0.05, center * gEffect);
      
      if (gForce > 0) {
        // Positive G - fuel shifts aft (simplified as center to wings)
        this.state.fuelDistribution.center -= shift;
        this.state.fuelDistribution.leftWing += shift / 2;
        this.state.fuelDistribution.rightWing += shift / 2;
      }
    }
  }

  private updateFuelState(): void {
    // Calculate total remaining fuel
    this.state.remaining = 
      this.state.fuelDistribution.leftWing +
      this.state.fuelDistribution.rightWing +
      this.state.fuelDistribution.center;
    
    // Update efficiency based on fuel level
    const fuelRatio = this.state.remaining / this.state.totalCapacity;
    this.state.efficiency = 0.8 + (fuelRatio * 0.2); // 80-100% efficiency
  }

  public getFuelState(): IFuelSystem {
    return { ...this.state };
  }

  public getFuelBalance(): number {
    const { leftWing, rightWing } = this.state.fuelDistribution;
    const totalWingFuel = leftWing + rightWing;
    
    if (totalWingFuel === 0) return 0;
    
    return (leftWing - rightWing) / totalWingFuel;
  }

  public isLowFuel(): boolean {
    return this.state.remaining <= this.state.lowFuelWarning;
  }

  public isCriticalFuel(): boolean {
    return this.state.remaining <= this.state.lowFuelWarning * 0.5;
  }

  public getFuelTimeRemaining(currentConsumption: number): number {
    if (currentConsumption <= 0) return Infinity;
    return this.state.remaining / currentConsumption;
  }

  public addFuel(amount: number, tank: 'left' | 'right' | 'center' | 'all' = 'all'): void {
    const maxFuelPerTank = this.state.totalCapacity / 3;
    
    switch (tank) {
      case 'left':
        this.state.fuelDistribution.leftWing = Math.min(
          maxFuelPerTank,
          this.state.fuelDistribution.leftWing + amount
        );
        break;
      case 'right':
        this.state.fuelDistribution.rightWing = Math.min(
          maxFuelPerTank,
          this.state.fuelDistribution.rightWing + amount
        );
        break;
      case 'center':
        this.state.fuelDistribution.center = Math.min(
          maxFuelPerTank,
          this.state.fuelDistribution.center + amount
        );
        break;
      case 'all':
        const perTank = amount / 3;
        this.addFuel(perTank, 'left');
        this.addFuel(perTank, 'right');
        this.addFuel(perTank, 'center');
        break;
    }
    
    this.updateFuelState();
  }

  public setFuelPumps(enabled: boolean): void {
    this.state.fuelPumps = enabled;
  }

  public simulatePumpFailure(): void {
    this.fuelPumpFailure = true;
    this.state.fuelPumps = false;
  }

  public repairPumps(): void {
    this.fuelPumpFailure = false;
    this.state.fuelPumps = true;
  }
}