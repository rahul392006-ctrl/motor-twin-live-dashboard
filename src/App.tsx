import React, { useState } from 'react';
import { useMotorSimulation } from './hooks/useMotorSimulation';
import { Header } from './components/Header';
import { StatusBar } from './components/StatusBar';
import { MetricCards } from './components/MetricCards';
import { Motor3DViewer } from './components/Motor3DViewer';
import { TelemetryCharts } from './components/TelemetryCharts';
import { ResidualCharts } from './components/ResidualCharts';
import { AlarmLog } from './components/AlarmLog';
import { EvaluationSummary } from './components/EvaluationSummary';
import { ModelValidationSection } from './components/ModelValidationSection';
import { DatasetProvenance } from './components/DatasetProvenance';
import { SystemArchitecture } from './components/SystemArchitecture';
import { SerialConsole } from './components/SerialConsole';
import { KambarAI } from './components/kambar/KambarAI';
import './styles/dashboard.css';

export default function App() {
  const sim = useMotorSimulation();
  const [showConsole, setShowConsole] = useState<boolean>(false);

  // Active alarms list for Kambar AI context
  const activeAlarmsList: string[] = [];
  if (sim.alarmTActive) activeAlarmsList.push('Temperature');
  if (sim.alarmVActive) activeAlarmsList.push('Vibration');

  const curDuration = Math.max(0.0, Number((sim.elapsedT - sim.sessionStartT).toFixed(2)));

  return (
    <div className="min-h-screen bg-[#070d1e] text-slate-100 flex flex-col selection:bg-teal-500 selection:text-white">
      {/* 1. Header with Live Telemetry Badges & Connect to USB Button */}
      <Header
        connectionState={sim.connectionState}
        motorState={sim.motorState}
        alarmActive={sim.alarmTActive || sim.alarmVActive}
        selectedPort={sim.selectedPort}
        useVirtualStm32={sim.useVirtualStm32}
        onConnectUsb={() => sim.connectUsb()}
        onDisconnectUsb={() => sim.disconnectUsb()}
      />

      {/* Main Dashboard Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-6">
        {/* 2. Motor Controls & Serial Link State */}
        <StatusBar
          connectionState={sim.connectionState}
          motorState={sim.motorState}
          onSendCommand={sim.sendCommand}
          onPressBlueButton={sim.pressBlueButton}
          onConnectUsb={() => sim.connectUsb()}
          onToggleConsole={() => setShowConsole(!showConsole)}
          showConsole={showConsole}
        />

        {/* Optional Serial Hardware Console Drawer */}
        {showConsole && (
          <SerialConsole
            rxConsole={sim.rxConsole}
            connectionState={sim.connectionState}
            selectedPort={sim.selectedPort}
            baudRate={sim.baudRate}
            useVirtualStm32={sim.useVirtualStm32}
            onSelectPort={sim.connectPort}
            onToggleVirtual={sim.setUseVirtualStm32}
            onConnect={sim.connectPort}
            onDisconnect={sim.disconnectPort}
            onClose={() => setShowConsole(false)}
          />
        )}

        {/* 3. Core Workspace Grid: 3D Motor & Telemetry (Left) + Kambar AI Assistant (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* PRIMARY COLUMN: 3D CAD Twin, Metrics, Charts, Evaluation */}
          <div className="lg:col-span-8 space-y-6">
            {/* Interactive 3D Industrial Motor Twin */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-950 text-teal-400 border border-teal-800/60">
                    3D TWIN
                  </span>
                  <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
                    Interactive Industrial CAD Motor Visualization
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                  Drag to rotate • Scroll to zoom • Smooth damping
                </span>
              </div>

              <Motor3DViewer
                motorState={sim.motorState}
                curVib={sim.curVib}
                curTemp={sim.curTemp}
                alarmT={sim.alarmTActive}
                alarmV={sim.alarmVActive}
              />
            </div>

            {/* Metric Cards (Section 02) */}
            <MetricCards
              curVib={sim.curVib}
              curTemp={sim.curTemp}
              curVPred={sim.curVPred}
              curTPred={sim.curTPred}
              curVRes={sim.curVRes}
              curTRes={sim.curTRes}
              alarmV={sim.alarmVActive}
              alarmT={sim.alarmTActive}
            />

            {/* Telemetry Charts (Section 03A) */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-1.5">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-950 text-teal-400 border border-teal-800/60">
                  SECTION 03A
                </span>
                <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
                  Time-Series Telemetry (Measured vs Predicted)
                </h2>
              </div>
              <TelemetryCharts samples={sim.samples} />
            </div>

            {/* Residual Charts (Section 03B) */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-1.5">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-950 text-teal-400 border border-teal-800/60">
                  SECTION 03B
                </span>
                <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
                  Twin Residuals & Safety Threshold Boundaries
                </h2>
              </div>
              <ResidualCharts samples={sim.samples} />
            </div>

            {/* Anomaly Alarm Log (Section 03C) */}
            <AlarmLog
              alarmEvents={sim.alarmEvents}
              onClearAlarms={sim.clearAlarms}
            />

            {/* State-Session Evaluation Summary (Section 04) */}
            <EvaluationSummary
              sessions={sim.sessions}
              activeSession={{
                sessionId: sim.sessionId,
                motorState: sim.motorState,
                duration: curDuration,
                maxVRes: sim.currentMaxVRes,
                maxTRes: sim.currentMaxTRes,
                alarmsCount: sim.currentAlarmsInSession,
              }}
            />

            {/* Model Validation Status (Section 05) */}
            <ModelValidationSection validatedMetrics={sim.validatedMetrics} />

            {/* Dataset Provenance (Section 06) */}
            <DatasetProvenance />

            {/* System Architecture (Section 09) */}
            <SystemArchitecture />
          </div>

          {/* SECONDARY COLUMN: Kambar AI Tamil-Inspired Assistant (Right Sticky) */}
          <div className="lg:col-span-4 sticky top-20 space-y-4">
            <KambarAI
              motorOn={sim.motorState === 'ON'}
              alarmActive={sim.alarmTActive || sim.alarmVActive}
              connectionState={sim.connectionState}
              currentVib={sim.curVib}
              currentTemp={sim.curTemp}
              vPred={sim.curVPred}
              tPred={sim.curTPred}
              vRes={sim.curVRes}
              tRes={sim.curTRes}
              activeAlarms={activeAlarmsList}
              totalAlarms={sim.alarmEvents.length}
              validatedMetrics={sim.validatedMetrics}
              selectedPort={sim.selectedPort}
            />

            {/* Quick Architecture Reference Pill */}
            <div className="p-3 rounded-xl bg-[#091226]/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="font-semibold text-teal-400 font-mono">STM32 Nucleo-F401RE CDC</div>
              <p>Packet format: <code>DATA,T=&lt;ms&gt;,V=&lt;vib&gt;,Temp=&lt;temp&gt;,STATE=&lt;ON|OFF&gt;</code></p>
              <p>O/F Control: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-teal-300 font-mono">O</kbd> for ON, <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-teal-300 font-mono">F</kbd> for OFF.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#050914] px-4 py-4 text-center text-xs text-slate-500 font-mono">
        Motor Digital Twin Condition Monitoring • AI/ML-Ready Industrial Prototype • Kambar AI Edition (கம்பர்)
      </footer>
    </div>
  );
}
