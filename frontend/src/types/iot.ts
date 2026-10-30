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

export interface SensorPacket {
  deviceId: string;
  timestamp: number;
  metrics: SensorMetrics;
  fault?: InjectedFault | null;
  anomalyScore?: number;
}
