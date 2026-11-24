export interface SensorMetrics {
  temperature: number;
  vibration_x: number;
  vibration_y: number;
  vibration_z: number;
  current: number;
  rpm: number;
}

export interface InjectedFault {
  injected: boolean;
  type: 'spike' | 'drift' | 'jam' | 'flatline' | 'critical';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface FeatureExtractionItem {
  name: string;
  sensor: string;
  unit: string;
  raw: number;
  mean: number;
  std: number;
  zScore: number;
  status: 'NOMINAL' | 'WARNING' | 'CRITICAL';
}

export interface AIDiagnostics {
  isAnomaly: boolean;
  severity: 'NORMAL' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  faultType?: string | null;
  rootCause: string;
  latencyMs: number;
  features?: FeatureExtractionItem[];
  details?: Record<string, number>;
}

export interface SensorPacket {
  deviceId: string;
  timestamp: number;
  metrics: SensorMetrics;
  fault?: InjectedFault | null;
  anomalyScore?: number;
  aiDiagnostics?: AIDiagnostics;
}

export interface MotorDevice {
  id: string;
  name: string;
  type: string;
  location: string;
  ratedPower?: number;
  ratedRpm?: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'OFFLINE' | 'FAULT';
}

export interface AlertRecord {
  id: string;
  deviceId: string;
  modelName: string;
  anomalyScore: number;
  severity: string;
  faultType?: string | null;
  message: string;
  acknowledged: boolean;
  resolvedAt?: string | null;
  createdAt: string;
}
