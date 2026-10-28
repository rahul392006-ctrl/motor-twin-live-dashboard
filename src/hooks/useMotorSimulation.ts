import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ConnectionState,
  MotorState,
  TelemetrySample,
  AlarmEvent,
  SessionRecord,
  ValidatedMetrics,
} from '../types/telemetry';
import {
  AMBIENT_TEMP,
  T_THRESH,
  V_THRESH,
  MAX_BUFFER_LEN,
  computeTwinStep,
} from '../services/motorTwinService';

export function useMotorSimulation() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('DISCONNECTED');
  const [selectedPort, setSelectedPort] = useState<string>('COM3');
  const [baudRate] = useState<number>(115200);
  const [useVirtualStm32, setUseVirtualStm32] = useState<boolean>(true);
  const [serialError, setSerialError] = useState<string | null>(null);

  const [rxConsole, setRxConsole] = useState<string[]>([
    '[USB] Standby — Click "Connect to USB" in the top bar to connect to STM32.',
    '[INFO] Motor controls (O / F) remain locked until USB is connected.',
  ]);

  // Motor & Telemetry state
  const [motorState, setMotorState] = useState<MotorState>('OFF');
  const [elapsedT, setElapsedT] = useState<number>(0.0);
  const [samples, setSamples] = useState<TelemetrySample[]>([]);
  const [totalSamples, setTotalSamples] = useState<number>(0);

  // Live telemetry metrics
  const [curVib, setCurVib] = useState<number>(0.0);
  const [curTemp, setCurTemp] = useState<number>(AMBIENT_TEMP);
  const [curTPred, setCurTPred] = useState<number>(AMBIENT_TEMP);
  const [curVPred, setCurVPred] = useState<number>(0.0);
  const [curTRes, setCurTRes] = useState<number>(0.0);
  const [curVRes, setCurVRes] = useState<number>(0.0);
  const [alarmTActive, setAlarmTActive] = useState<boolean>(false);
  const [alarmVActive, setAlarmVActive] = useState<boolean>(false);

  // Alarm history and session tracking
  const [alarmEvents, setAlarmEvents] = useState<AlarmEvent[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [sessionId, setSessionId] = useState<number>(1);
  const [sessionStartT, setSessionStartT] = useState<number>(0.0);
  const [currentMaxVRes, setCurrentMaxVRes] = useState<number>(0.0);
  const [currentMaxTRes, setCurrentMaxTRes] = useState<number>(0.0);
  const [currentAlarmsInSession, setCurrentAlarmsInSession] = useState<number>(0);

  // Optional validated metrics
  const [validatedMetrics] = useState<ValidatedMetrics | null>(null);

  // Internal physics & spool-down refs
  const simTempRef = useRef<number>(AMBIENT_TEMP);
  const vibSpoolRef = useRef<number>(0.0);
  const prevAlarmTRef = useRef<boolean>(false);
  const prevAlarmVRef = useRef<boolean>(false);
  const motorStateRef = useRef<MotorState>('OFF');
  const connectionStateRef = useRef<ConnectionState>('DISCONNECTED');
  const sessionIdRef = useRef<number>(1);
  const currentMaxVResRef = useRef<number>(0.0);
  const currentMaxTResRef = useRef<number>(0.0);
  const currentAlarmsInSessionRef = useRef<number>(0);

  motorStateRef.current = motorState;
  connectionStateRef.current = connectionState;
  sessionIdRef.current = sessionId;
  currentMaxVResRef.current = currentMaxVRes;
  currentMaxTResRef.current = currentMaxTRes;
  currentAlarmsInSessionRef.current = currentAlarmsInSession;

  // Append line to raw RX console (keeps last 60 lines)
  const appendConsole = useCallback((line: string) => {
    setRxConsole((prev) => {
      const next = [...prev, line];
      return next.length > 60 ? next.slice(-60) : next;
    });
  }, []);

  // Handle motor state transition and session recording
  const handleMotorStateChange = useCallback((newState: MotorState, currentSimTime: number) => {
    const oldState = motorStateRef.current;
    if (newState === oldState) return;

    // Archive completed session
    setSessions((prev) => [
      ...prev,
      {
        session_id: sessionIdRef.current,
        state: oldState,
        duration: Math.max(0.1, Number((currentSimTime - sessionStartT).toFixed(2))),
        max_V_res: Number(currentMaxVResRef.current.toFixed(2)),
        max_T_res: Number(currentMaxTResRef.current.toFixed(2)),
        alarms_in_session: currentAlarmsInSessionRef.current,
      },
    ]);

    // Initialize next session
    const nextId = sessionIdRef.current + 1;
    setSessionId(nextId);
    setSessionStartT(currentSimTime);
    setCurrentMaxVRes(0.0);
    setCurrentMaxTRes(0.0);
    setCurrentAlarmsInSession(0);
    setMotorState(newState);

    if (newState === 'ON') {
      vibSpoolRef.current = 500.0;
    }
  }, [sessionStartT]);

  // Command sender (O / F) — strictly locked if USB is not connected
  const sendCommand = useCallback((cmd: 'O' | 'F') => {
    if (connectionStateRef.current !== 'RUNNING') {
      appendConsole(`[DENIED] Cannot send '${cmd}': USB is not connected! Click 'Connect to USB' first.`);
      return;
    }

    appendConsole(`[TX] Sent '${cmd}' command across USB serial line.`);
    if (cmd === 'O') {
      handleMotorStateChange('ON', elapsedT);
      appendConsole(`[RX] MOTOR_ON`);
    } else if (cmd === 'F') {
      handleMotorStateChange('OFF', elapsedT);
      appendConsole(`[RX] MOTOR_OFF`);
    }
  }, [appendConsole, elapsedT, handleMotorStateChange]);

  // Nucleo Blue Button Click (sends STARTED)
  const pressBlueButton = useCallback(() => {
    if (connectionState === 'READY' || connectionState === 'WAITING') {
      setConnectionState('RUNNING');
      appendConsole('[RX] STARTED (Blue button pressed on STM32 Nucleo)');
      appendConsole('[SYSTEM] Motor controls (O / F) unlocked and active.');
    }
  }, [connectionState, appendConsole]);

  // Direct USB Connect Action
  const connectUsb = useCallback((portName?: unknown) => {
    const port = (typeof portName === 'string' && portName.trim()) ? portName.trim() : (typeof selectedPort === 'string' ? selectedPort : 'COM3');
    setSelectedPort(port);
    setSerialError(null);
    setConnectionState('WAITING');
    appendConsole(`[USB] Opening serial port ${port} @ 115200 baud...`);
    appendConsole('[STATE] WAITING for "READY" response from STM32...');

    // Boot handshake sequence
    setTimeout(() => {
      setConnectionState('READY');
      appendConsole('[RX] READY (STM32 Nucleo booted and verified)');
      appendConsole('[SYSTEM] Starting telemetry stream & unlocking O / F motor controls...');

      setTimeout(() => {
        setConnectionState('RUNNING');
        appendConsole('[RX] STARTED (STM32 active stream)');
        appendConsole('[STATUS] USB Connected! Motor ON/OFF controls enabled.');
      }, 500);
    }, 600);
  }, [appendConsole, selectedPort]);

  // Direct USB Disconnect Action
  const disconnectUsb = useCallback(() => {
    if (motorStateRef.current === 'ON') {
      handleMotorStateChange('OFF', elapsedT);
    }
    setConnectionState('DISCONNECTED');
    appendConsole(`[USB] Disconnected from ${selectedPort}.`);
    appendConsole('[SYSTEM] Motor controls disabled until USB is reconnected.');
  }, [appendConsole, selectedPort, elapsedT, handleMotorStateChange]);

  // Reconnect / Connect by port
  const connectPort = useCallback((port: string) => {
    connectUsb(port);
  }, [connectUsb]);

  // Disconnect
  const disconnectPort = useCallback(() => {
    disconnectUsb();
  }, [disconnectUsb]);

  // Keyboard shortcut listener for O and F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in form inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if (connectionStateRef.current !== 'RUNNING') return;

      const key = e.key.toUpperCase();
      if (key === 'O') {
        sendCommand('O');
      } else if (key === 'F') {
        sendCommand('F');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sendCommand]);

  // Simulation tick loop (every 200ms)
  useEffect(() => {
    if (!useVirtualStm32) return;
    if (connectionState !== 'RUNNING') return;

    const interval = setInterval(() => {
      setElapsedT((prevT) => {
        const nextT = Number((prevT + 0.2).toFixed(2));
        const isMotorOn = motorStateRef.current === 'ON';

        let vib: number;
        let temp = simTempRef.current;

        if (isMotorOn) {
          // Motor ON: ~500 units dual harmonic vibration + thermal heating towards 36°C
          const harmonic = 120 * Math.sin(2 * Math.PI * 7.3 * nextT);
          const noise = (Math.random() - 0.5) * 50;
          vib = Math.max(0, 500 + harmonic + noise);

          // Thermal rise
          temp += ((AMBIENT_TEMP + 12.0) - temp) * 0.03 + (Math.random() - 0.5) * 0.08;
          simTempRef.current = temp;
          vibSpoolRef.current = 500.0;
        } else {
          // Motor OFF: spool-down coasting physics slowly decaying to zero
          if (vibSpoolRef.current > 10.0) {
            vibSpoolRef.current *= 0.88;
            vib = vibSpoolRef.current + Math.random() * 8;
          } else {
            vibSpoolRef.current = 0.0;
            vib = Math.random() * 5;
          }

          // Thermal cooling towards ambient 24°C
          temp += (AMBIENT_TEMP - temp) * 0.02 + (Math.random() - 0.5) * 0.04;
          simTempRef.current = temp;
        }

        const twin = computeTwinStep(temp, vib, motorStateRef.current);

        // Update live metrics
        setCurVib(vib);
        setCurTemp(temp);
        setCurTPred(twin.T_pred);
        setCurVPred(twin.V_pred);
        setCurTRes(twin.T_res);
        setCurVRes(twin.V_res);
        setAlarmTActive(twin.alarm_T);
        setAlarmVActive(twin.alarm_V);
        setTotalSamples((s) => s + 1);

        // Update max residuals in current session
        if (Math.abs(twin.V_res) > currentMaxVResRef.current) {
          setCurrentMaxVRes(Math.abs(twin.V_res));
        }
        if (Math.abs(twin.T_res) > currentMaxTResRef.current) {
          setCurrentMaxTRes(Math.abs(twin.T_res));
        }

        // Anomaly transition logging (only on False -> True transition)
        let trippedThisTick = false;
        if (twin.alarm_T && !prevAlarmTRef.current) {
          trippedThisTick = true;
          setAlarmEvents((prev) => [
            {
              id: `${nextT}-T`,
              timestamp: `${nextT.toFixed(2)}s`,
              type: 'Temperature',
              residual: `${twin.T_res > 0 ? '+' : ''}${twin.T_res.toFixed(2)} °C`,
              threshold: `±${T_THRESH.toFixed(1)} °C`,
              session_id: sessionIdRef.current,
            },
            ...prev,
          ]);
        }
        if (twin.alarm_V && !prevAlarmVRef.current) {
          trippedThisTick = true;
          setAlarmEvents((prev) => [
            {
              id: `${nextT}-V`,
              timestamp: `${nextT.toFixed(2)}s`,
              type: 'Vibration',
              residual: `${twin.V_res > 0 ? '+' : ''}${twin.V_res.toFixed(1)}`,
              threshold: `±${V_THRESH.toFixed(0)}`,
              session_id: sessionIdRef.current,
            },
            ...prev,
          ]);
        }

        if (trippedThisTick) {
          setCurrentAlarmsInSession((c) => c + 1);
        }

        prevAlarmTRef.current = twin.alarm_T;
        prevAlarmVRef.current = twin.alarm_V;

        // Append to rolling sample buffer
        const newSample: TelemetrySample = {
          timestamp: nextT,
          motor_state: motorStateRef.current,
          session_id: sessionIdRef.current,
          vibration: Number(vib.toFixed(2)),
          temperature: Number(temp.toFixed(2)),
          T_pred: twin.T_pred,
          V_pred: twin.V_pred,
          T_res: twin.T_res,
          V_res: twin.V_res,
          alarm_T: twin.alarm_T,
          alarm_V: twin.alarm_V,
        };

        setSamples((prev) => {
          const next = [...prev, newSample];
          return next.length > MAX_BUFFER_LEN ? next.slice(-MAX_BUFFER_LEN) : next;
        });

        // Add telemetry line to console
        const tMs = Math.round(nextT * 1000);
        appendConsole(`[DATA] T=${tMs},V=${vib.toFixed(1)},Temp=${temp.toFixed(1)},STATE=${motorStateRef.current}`);

        return nextT;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [useVirtualStm32, connectionState, appendConsole]);

  const clearAlarms = useCallback(() => {
    setAlarmEvents([]);
  }, []);

  return {
    // Connection
    connectionState,
    setConnectionState,
    selectedPort,
    baudRate,
    useVirtualStm32,
    setUseVirtualStm32,
    serialError,
    rxConsole,
    pressBlueButton,
    connectPort,
    disconnectPort,
    connectUsb,
    disconnectUsb,

    // Motor Controls
    motorState,
    sendCommand,

    // Telemetry
    elapsedT,
    samples,
    totalSamples,
    curVib,
    curTemp,
    curTPred,
    curVPred,
    curTRes,
    curVRes,
    alarmTActive,
    alarmVActive,

    // History & Evaluation
    alarmEvents,
    clearAlarms,
    sessions,
    sessionId,
    sessionStartT,
    currentMaxVRes,
    currentMaxTRes,
    currentAlarmsInSession,
    validatedMetrics,
  };
}
