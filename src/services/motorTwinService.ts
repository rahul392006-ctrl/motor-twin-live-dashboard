import { ValidatedMetrics } from '../types/telemetry';

export const AMBIENT_TEMP = 24.0;
export const T_THRESH = 3.0; // °C
export const V_THRESH = 300.0; // units
export const DEFAULT_BAUD = 115200;
export const MAX_BUFFER_LEN = 100;

export interface TwinComputation {
  T_pred: number;
  V_pred: number;
  T_res: number;
  V_res: number;
  alarm_T: boolean;
  alarm_V: boolean;
}

export function computeTwinStep(
  temperature: number,
  vibration: number,
  motorState: 'ON' | 'OFF'
): TwinComputation {
  const T_pred = AMBIENT_TEMP + (motorState === 'ON' ? 12.0 : 0.0);
  const V_pred = motorState === 'ON' ? 500.0 : 0.0;
  const T_res = temperature - T_pred;
  const V_res = vibration - V_pred;

  const alarm_T = Math.abs(T_res) > T_THRESH;
  const alarm_V = Math.abs(V_res) > V_THRESH;

  return {
    T_pred: Number(T_pred.toFixed(2)),
    V_pred: Number(V_pred.toFixed(2)),
    T_res: Number(T_res.toFixed(2)),
    V_res: Number(V_res.toFixed(2)),
    alarm_T,
    alarm_V,
  };
}

export interface KambarContext {
  motorOn: boolean;
  alarmActive: boolean;
  connectionState: string;
  currentVib: number;
  currentTemp: number;
  vPred: number;
  tPred: number;
  vRes: number;
  tRes: number;
  activeAlarms: string[];
  totalAlarms: number;
  validatedMetrics?: ValidatedMetrics | null;
  selectedPort: string;
}

export function generateKambarResponse(
  question: string,
  ctx: KambarContext
): { text: string; badge?: string } {
  const q = question.trim().toLowerCase();
  if (!q) {
    return {
      text: "வணக்கம்! (Vanakkam!) I am Kambar AI — inspired by classical Tamil poet Kambar. Ask me anything regarding this motor digital twin, telemetry, thermal dynamics, or system provenance.",
      badge: "வணக்கம்",
    };
  }

  // 1. Live Dashboard Summary / Overall Status
  if (
    q.includes("summary") ||
    q.includes("status") ||
    q.includes("overall") ||
    q.includes("report") ||
    q.includes("how is everything") ||
    q.includes("dashboard status") ||
    q.includes("tell me about the dashboard") ||
    q.includes("explain the motor status")
  ) {
    const valStatusLine = ctx.validatedMetrics
      ? `VALIDATED — Precision ${ctx.validatedMetrics.p.toFixed(2)}, Recall ${ctx.validatedMetrics.r.toFixed(2)}, F1 ${ctx.validatedMetrics.f1.toFixed(2)} (from twin.py)`
      : "NOT VALIDATED — placeholder confusion matrix (zero weights). Run twin.py to populate real metrics.";

    return {
      text: `வணக்கம்! Here is the live status report of the Motor Digital Twin:\n\n` +
        `• Serial Link: ${ctx.connectionState} on ${ctx.selectedPort}\n` +
        `• Motor State: ${ctx.motorOn ? 'RUNNING / ON 🟢' : 'STOPPED / OFF ⚪'}\n` +
        `• Vibration: ${ctx.currentVib.toFixed(1)} units (Twin Prediction: ${ctx.vPred.toFixed(0)}, Residual: ${ctx.vRes > 0 ? '+' : ''}${ctx.vRes.toFixed(1)})\n` +
        `• Temperature: ${ctx.currentTemp.toFixed(1)} °C (Twin Prediction: ${ctx.tPred.toFixed(1)} °C, Residual: ${ctx.tRes > 0 ? '+' : ''}${ctx.tRes.toFixed(1)} °C)\n` +
        `• Active Alarms: ${ctx.activeAlarms.length > 0 ? ctx.activeAlarms.join(', ') + ' ⚠️' : '0 (Nominal)'}\n` +
        `• Cumulative Alarm Trips: ${ctx.totalAlarms}\n` +
        `• Model Validation: ${valStatusLine}\n\n` +
        `"எண்ணும் எழுத்தும் கண்ணெனத் தகும்" — Numbers and telemetry are the twin's true eyes.`,
      badge: "Live Telemetry",
    };
  }

  // 2. Digital Twin Definition
  if (q.includes("what is a digital twin") || q.includes("digital twin") || q.includes("twin")) {
    return {
      text: "A Digital Twin (மெய்நிகர் இரட்டை) is a mathematical software mirror that predicts what the physical electric motor SHOULD be doing in real time.\n\n" +
        "Here, our physics-informed model expects ~500 units of vibration and an operational thermal rise of +12 °C (reaching ~36 °C) when the motor is ON, and 0 units / 24 °C ambient when OFF. By comparing actual sensors against this expected baseline, we calculate residuals to identify degradation or bearing faults instantly.",
      badge: "Concept",
    };
  }

  // 3. Vibration Residual
  if (q.includes("vibration residual") || (q.includes("vibration") && q.includes("residual"))) {
    return {
      text: `Vibration Residual = V_measured − V_predicted.\n\n` +
        `Currently:\n` +
        `• Measured Vibration: ${ctx.currentVib.toFixed(1)}\n` +
        `• Predicted Vibration: ${ctx.vPred.toFixed(0)}\n` +
        `• Residual: ${ctx.vRes > 0 ? '+' : ''}${ctx.vRes.toFixed(1)} units\n` +
        `• Alarm Threshold: ±${V_THRESH} units.\n\n` +
        `When the motor runs normally without mechanical looseness or bearing cage defects, the residual hovers closely around zero. A persistent high residual signals impending mechanical bearing damage.`,
      badge: "Vibration Twin",
    };
  }

  // 4. Temperature Residual
  if (q.includes("temperature residual") || (q.includes("temperature") && q.includes("residual"))) {
    return {
      text: `Temperature Residual = T_measured − T_predicted.\n\n` +
        `Currently:\n` +
        `• Measured Temperature: ${ctx.currentTemp.toFixed(1)} °C\n` +
        `• Predicted Temperature: ${ctx.tPred.toFixed(1)} °C\n` +
        `• Residual: ${ctx.tRes > 0 ? '+' : ''}${ctx.tRes.toFixed(1)} °C\n` +
        `• Alarm Threshold: ±${T_THRESH} °C.\n\n` +
        `The motor casing temperature follows first-order thermal dissipation. If the winding overheats or cooling fins are blocked, the residual exceeds +3 °C, triggering an immediate thermal alert.`,
      badge: "Thermal Twin",
    };
  }

  // 5. Why did an alarm occur?
  if (q.includes("why did an alarm occur") || q.includes("alarm occur") || q.includes("why alarm")) {
    if (ctx.activeAlarms.length > 0) {
      return {
        text: `Active alarm condition: ${ctx.activeAlarms.join(' & ')}!\n\n` +
          `An alarm is tripped when the residual |measured − predicted| exceeds safety boundaries:\n` +
          `• Temperature boundary: ±${T_THRESH} °C (Current residual: ${ctx.tRes > 0 ? '+' : ''}${ctx.tRes.toFixed(1)} °C)\n` +
          `• Vibration boundary: ±${V_THRESH} units (Current residual: ${ctx.vRes > 0 ? '+' : ''}${ctx.vRes.toFixed(1)})\n\n` +
          `Check cooling fan obstruction, bearing lubrication, or mechanical mounting bolts.`,
        badge: "Active Alert",
      };
    } else {
      return {
        text: `Currently, all residuals are strictly within safety bounds (T < ±${T_THRESH} °C, V < ±${V_THRESH} units).\n\n` +
          `Alarms occur whenever dynamic anomalies arise—such as rotor imbalance, bearing wear, electrical winding hotspots, or loose base bolts that make real sensor telemetry diverge from the twin's predicted baseline.`,
        badge: "Nominal",
      };
    }
  }

  // 6. System Limitations
  if (q.includes("limitation") || q.includes("limitations") || q.includes("cannot do") || q.includes("weakness")) {
    return {
      text: "System Limitations & Technical Truth:\n\n" +
        "1. Simulated Vibration: Vibration data is currently synthesized in STM32 firmware with dual-harmonic harmonics, while temperature is read from a physical DHT11 sensor.\n" +
        "2. Advisory Alarms: Digital twin alerts are advisory only. Emergency power cut-offs and hardware circuit breakers operate independently for industrial safety.\n" +
        "3. No Remaining-Useful-Life (RUL): This dashboard does not predict exact hours until component failure without long-term degradation trend datasets.\n" +
        "4. Model Validation: Real model training/test validation requires separately validated offline datasets from `twin.py`.",
      badge: "Engineering Limits",
    };
  }

  // 7. Next Hardware Integration Step
  if (
    q.includes("next hardware") ||
    q.includes("hardware integration") ||
    q.includes("integration step") ||
    q.includes("physical hardware") ||
    q.includes("future step")
  ) {
    return {
      text: "Next Steps for Physical Hardware Integration:\n\n" +
        "1. Replace Firmware Vibration Simulation with a genuine MEMS accelerometer (MPU6050, ADXL345, or piezoelectric industrial ICP probe) connected to STM32 I2C/SPI.\n" +
        "2. Upgrade DHT11 to an RTD PT100 or thermocouple for high-temperature motor winding immersion (>120 °C).\n" +
        "3. Implement RS-485 Modbus RTU / CAN-bus communication alongside USB CDC for industrial factory floor reliability.\n" +
        "4. Stream live runs to offline storage for automated model validation via `twin.py`.",
      badge: "Roadmap",
    };
  }

  // 8. Model Validation
  if (
    q.includes("validation") ||
    q.includes("model validation") ||
    q.includes("validated") ||
    q.includes("confusion matrix") ||
    q.includes("precision") ||
    q.includes("recall") ||
    q.includes("f1") ||
    q.includes("is the model trained")
  ) {
    if (ctx.validatedMetrics) {
      return {
        text: `Model validation was performed by twin.py on a held-out test set:\n\n` +
          `• Precision: ${ctx.validatedMetrics.p.toFixed(2)}\n` +
          `• Recall: ${ctx.validatedMetrics.r.toFixed(2)}\n` +
          `• F1 Score: ${ctx.validatedMetrics.f1.toFixed(2)}\n` +
          `• Confusion Matrix: TP=${ctx.validatedMetrics.tp}, FN=${ctx.validatedMetrics.fn}, FP=${ctx.validatedMetrics.fp}, TN=${ctx.validatedMetrics.tn}\n` +
          `• Dataset: ${ctx.validatedMetrics.train_n} training samples, ${ctx.validatedMetrics.test_n} test samples.`,
        badge: "Validated",
      };
    } else {
      return {
        text: "No. Model validation has NOT been performed on this dashboard.\n\n" +
          "Section 5 displays an unvalidated zero-weight baseline placeholder. To validate the model, run `twin.py` on recorded normal and faulty hardware datasets. The resulting metrics will automatically load into the dashboard.",
        badge: "Unvalidated",
      };
    }
  }

  // 9. Motor Controls (O / F)
  if (q.includes("o and f") || q.includes("control") || q.includes("button") || q.includes("press o") || q.includes("press f")) {
    return {
      text: "Motor Controls:\n\n" +
        "• Press 'O' (or click ▶ Motor ON): Sends ASCII 'O' over serial. The motor spools up to 500 RPM with harmonic vibration and gradual heating.\n" +
        "• Press 'F' (or click ■ Motor OFF): Sends ASCII 'F' over serial. The motor smoothly spools down with exponential mechanical deceleration until stopping.\n\n" +
        "Note: Controls unlock once STM32 sends the 'STARTED' signal after pressing the blue Nucleo button.",
      badge: "Controls",
    };
  }

  // 10. Data Provenance
  if (q.includes("provenance") || q.includes("data source") || q.includes("where does the data come from")) {
    return {
      text: "Data Provenance:\n\n" +
        "• Temperature: Real physical measurements from a DHT11 sensor wired to STM32 Nucleo.\n" +
        "• Vibration: Generated dynamically in STM32 firmware (simulated harmonics).\n" +
        "• Transmission: USB Virtual COM port at 115200 baud, 8-N-1, transmitting packets every 200 ms: `DATA,T=<ms>,V=<vib>,Temp=<temp>,STATE=<ON|OFF>`.",
      badge: "Provenance",
    };
  }

  // 11. Safety
  if (q.includes("safe") || q.includes("safety") || q.includes("protection")) {
    return {
      text: "Safety Architecture:\n\n" +
        "The digital twin AI operates in an ADVISORY capacity only. The motor's industrial power supply, emergency stop contactor, and thermal overload relays are hardwired and independent of this software dashboard.",
      badge: "Safety",
    };
  }

  // 12. Tamil Literature / Who is Kambar
  if (q.includes("kambar") || q.includes("tamil") || q.includes("poet") || q.includes("who are you")) {
    return {
      text: "I am Kambar AI (கம்பர்), an artistic assistant inspired by the revered 12th-century Tamil poet Kambar, author of the celebrated epic *Kamba Ramayanam* (கம்பராமாயணம்).\n\n" +
        "Just as classical Tamil poetry harmonizes structure, rhythm, and profound insight, this digital twin harmonizes sensor physics, mathematics, and live industrial engineering.",
      badge: "கவிச்சக்கரவர்த்தி",
    };
  }

  // Fallback
  return {
    text: `வணக்கம்! I specialize in this Motor Digital Twin. Quick status: motor is ${
      ctx.motorOn ? 'ON 🟢' : 'OFF ⚪'
    }, model validation is unvalidated baseline.\n\n` +
      `Try asking:\n` +
      `• "What is a digital twin?"\n` +
      `• "Explain the motor status."\n` +
      `• "What is vibration residual?"\n` +
      `• "What is temperature residual?"\n` +
      `• "Why did an alarm occur?"\n` +
      `• "What are the system limitations?"\n` +
      `• "What is the next hardware integration step?"`,
    badge: "Assistance",
  };
}
