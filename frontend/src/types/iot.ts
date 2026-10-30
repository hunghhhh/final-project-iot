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
  type: 'spike' | 'drift' | 'jam' | 'flatline';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface SensorPacket {
  deviceId: string;
  timestamp: number;
  metrics: SensorMetrics;
  fault?: InjectedFault | null;
}

export interface DeviceInfo {
  id: string;
  name: string;
  type: string;
  location: string;
  status: string;
  ratedPower: number;
  ratedRpm: number;
}
