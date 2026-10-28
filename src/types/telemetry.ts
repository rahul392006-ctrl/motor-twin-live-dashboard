export type ConnectionState = 'DISCONNECTED' | 'WAITING' | 'READY' | 'RUNNING' | 'ERROR';

export type MotorState = 'ON' | 'OFF';

export interface TelemetrySample {
  timestamp: number;
  motor_state: MotorState;
  session_id: number;
  vibration: number;
  temperature: number;
  T_pred: number;
  V_pred: number;
  T_res: number;
  V_res: number;
  alarm_T: boolean;
  alarm_V: boolean;
}

export interface AlarmEvent {
  id: string;
  timestamp: string;
  type: 'Temperature' | 'Vibration';
  residual: string;
  threshold: string;
  session_id: number;
}

export interface SessionRecord {
  session_id: number;
  state: string;
  duration: number;
  max_V_res: number;
  max_T_res: number;
  alarms_in_session: number;
}

export interface ValidatedMetrics {
  p: number;
  r: number;
  f1: number;
  tp: number;
  fn: number;
  fp: number;
  tn: number;
  train_n: number;
  test_n: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'kambar';
  text: string;
  timestamp: string;
  statusBadge?: string;
}
