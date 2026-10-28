"""
MOTOR DIGITAL TWIN — LIVE STM32 SERIAL CONDITION MONITORING DASHBOARD
=====================================================================
Communicates with an STM32 Nucleo microcontroller over USB Serial (115200 baud).
- STM32 sends real DHT11 temperature and firmware-simulated vibration.
- SECRET KEYBOARD MOTOR CONTROLS:
    * Motor control buttons are HIDDEN (secret mode).
    * Press 'O' on your keyboard -> Motor turns ON, values show and spin up.
    * Press 'F' on your keyboard -> Motor turns OFF, data slowly coasts down and turns off.
- Section 5: Formal unvalidated notice, placeholder confusion matrix (zeroes),
  metrics set to '—', and italic disclaimer.

Dependencies:
    pip install streamlit pandas numpy pyserial

Run:
    streamlit run dashboard.py
"""

import collections
import os
import time
from datetime import datetime
import numpy as np
import pandas as pd
import streamlit as st
import streamlit.components.v1 as components

def load_validated_metrics():
    """Checks and loads validated_metrics.csv once at startup if twin.py has generated it."""
    csv_path = "validated_metrics.csv"
    if os.path.exists(csv_path):
        try:
            df = pd.read_csv(csv_path)
            row = df.iloc[0].to_dict()
            return {
                "p": float(row.get("precision", row.get("Precision", 0.0))),
                "r": float(row.get("recall", row.get("Recall", 0.0))),
                "f1": float(row.get("f1", row.get("F1", 0.0))),
                "tp": int(row.get("tp", row.get("TP", 0))),
                "fn": int(row.get("fn", row.get("FN", 0))),
                "fp": int(row.get("fp", row.get("FP", 0))),
                "tn": int(row.get("tn", row.get("TN", 0))),
                "train_n": int(row.get("train_n", row.get("train_samples", 0))),
                "test_n": int(row.get("test_n", row.get("test_samples", 0))),
                "df": df,
            }
        except Exception:
            return None
    return None

VALIDATED_METRICS = load_validated_metrics()


# Safe import of pyserial
try:
    import serial
    import serial.tools.list_ports
    from serial.serialutil import SerialException
    PYSERIAL_AVAILABLE = True
except ImportError:
    PYSERIAL_AVAILABLE = False
    SerialException = Exception
    serial = None

# ==============================================================================
# CONFIGURATION & CONSTANTS
# ==============================================================================
st.set_page_config(
    page_title="Motor Digital Twin — Live Dashboard",
    page_icon="⚙️",
    layout="wide",
    initial_sidebar_state="expanded",
)

AMBIENT_TEMP = 25.0       # Baseline ambient temperature (°C)
T_THRESH = 3.0            # Temperature residual threshold (°C)
V_THRESH = 300.0          # Vibration residual threshold (units)
MAX_BUFFER_LEN = 300      # 300 samples * 0.2s = 60s live rolling buffer
DEFAULT_BAUD = 115200

# ==============================================================================
# INDUSTRIAL DARK NAVY STYLES
# ==============================================================================
CUSTOM_CSS = """
<style>
    /* Dark navy background and font configuration */
    .stApp {
        background: linear-gradient(180deg, #070d1e 0%, #0b132b 100%);
        color: #e2e8f0;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    
    /* Sidebar styling */
    [data-testid="stSidebar"] {
        background-color: #0d1836 !important;
        border-right: 1px solid #1e294b;
    }

    /* Metric card styling */
    .metric-card {
        background: #111e3f;
        border: 1px solid #1f2d5a;
        border-radius: 12px;
        padding: 16px 20px;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
        transition: transform 0.15s ease, border-color 0.15s ease;
    }
    .metric-card:hover {
        border-color: #00d2d3;
        transform: translateY(-1px);
    }
    .metric-card.alarm-active {
        border: 1px solid #ef4444;
        background: linear-gradient(180deg, #2a111a 0%, #170d18 100%);
        box-shadow: 0 0 16px rgba(239, 68, 68, 0.35);
    }
    .metric-title {
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #94a3b8;
        margin-bottom: 6px;
    }
    .metric-value {
        font-size: 2.1rem;
        font-weight: 700;
        color: #f8fafc;
        line-height: 1.1;
    }
    .metric-unit {
        font-size: 0.9rem;
        font-weight: 500;
        color: #64748b;
        margin-left: 4px;
    }
    .metric-sub {
        font-size: 0.75rem;
        color: #38bdf8;
        margin-top: 6px;
    }

    /* Badges */
    .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 14px;
        border-radius: 9999px;
        font-size: 0.85rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
    }
    .badge-on {
        background-color: rgba(16, 185, 129, 0.18);
        border: 1px solid #10b981;
        color: #34d399;
    }
    .badge-off {
        background-color: rgba(148, 163, 184, 0.15);
        border: 1px solid #64748b;
        color: #94a3b8;
    }
    .badge-alarm {
        background-color: rgba(239, 68, 68, 0.22);
        border: 1px solid #ef4444;
        color: #f87171;
        animation: pulse 1.5s infinite;
    }

    /* Connection State Badges */
    .badge-conn-running {
        background-color: rgba(16, 185, 129, 0.18);
        border: 1px solid #10b981;
        color: #34d399;
    }
    .badge-conn-ready {
        background-color: rgba(249, 115, 22, 0.18);
        border: 1px solid #f97316;
        color: #fb923c;
    }
    .badge-conn-waiting {
        background-color: rgba(234, 179, 8, 0.18);
        border: 1px solid #eab308;
        color: #fde047;
    }
    .badge-conn-error {
        background-color: rgba(239, 68, 68, 0.22);
        border: 1px solid #ef4444;
        color: #f87171;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
    }

    /* Section Headers */
    .section-header {
        font-size: 1.15rem;
        font-weight: 600;
        color: #f1f5f9;
        border-bottom: 1px solid #1e294b;
        padding-bottom: 8px;
        margin-top: 24px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .section-badge {
        font-size: 0.7rem;
        padding: 2px 8px;
        border-radius: 4px;
        background: #1e294b;
        color: #00d2d3;
        font-weight: 700;
    }
</style>
"""
st.markdown(CUSTOM_CSS, unsafe_allow_html=True)


# ==============================================================================
# STATE INITIALIZATION
# ==============================================================================
def init_session_state():
    """Initializes persistent application session state."""
    defaults = {
        # Serial connection & state machine
        "connection_state": "WAITING",
        "ser": None,
        "selected_port": "COM3",
        "baud_rate": DEFAULT_BAUD,
        "serial_error": None,
        "serial_rx_buffer": "",
        "use_virtual_stm32": False,          # Hardware-free fallback loopback simulator
        
        # Telemetry and motor state
        "motor_state": "OFF",                # "ON" or "OFF"
        "motor_on": False,
        "last_sample_t": 0.0,
        "samples": collections.deque(maxlen=MAX_BUFFER_LEN),
        "total_samples": 0,
        
        # Telemetry metrics
        "cur_vib": 0.0,
        "cur_temp": AMBIENT_TEMP,
        "cur_T_pred": AMBIENT_TEMP,
        "cur_V_pred": 0.0,
        "cur_T_res": 0.0,
        "cur_V_res": 0.0,
        "alarm_T_active": False,
        "alarm_V_active": False,
        
        # Anomaly detection state (transition tracking)
        "prev_alarm_T": False,
        "prev_alarm_V": False,
        "alarm_log": [],
        
        # State-Session tracking
        "sessions": [],
        "session_id": 1,
        "session_start_t": 0.0,
        "current_max_V_res": 0.0,
        "current_max_T_res": 0.0,
        "current_alarms_count": 0,
        
        # Spool-down coasting physics state (slowly goes down and off)
        "vib_spool": 0.0,
        "sim_t": 0.0,
        "_sim_temp": AMBIENT_TEMP,
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v


init_session_state()


# ==============================================================================
# SECRET KEYBOARD EVENT LISTENER (O / F)
# ==============================================================================
# Inject invisible JavaScript key listener:
# Pressing 'O' on the keyboard turns motor ON.
# Pressing 'F' on the keyboard turns motor OFF (data slowly coasts down).
components.html(
    """
    <script>
    const parentDoc = window.parent.document;
    if (!window.parent._secret_key_listener_registered) {
        window.parent._secret_key_listener_registered = true;
        parentDoc.addEventListener('keydown', function(event) {
            // Ignore if user is currently typing in an input element
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
            const key = event.key.toUpperCase();
            if (key === 'O' || key === 'F') {
                const url = new URL(window.parent.location.href);
                url.searchParams.set('secret_cmd', key);
                window.parent.location.replace(url.toString());
            }
        });
    }
    </script>
    """,
    height=0,
    width=0,
)


# ==============================================================================
# SERIAL COMMUNICATION HANDLERS
# ==============================================================================
def list_available_ports():
    """Returns detected system COM / serial ports, including COM3 default."""
    ports = []
    if PYSERIAL_AVAILABLE:
        try:
            detected = serial.tools.list_ports.comports()
            for p in detected:
                ports.append(p.device)
        except Exception:
            pass
    if "COM3" not in ports:
        ports.append("COM3")
    if "/dev/ttyACM0" not in ports:
        ports.append("/dev/ttyACM0")
    if "/dev/ttyUSB0" not in ports:
        ports.append("/dev/ttyUSB0")
    return sorted(list(set(ports)))


def open_serial_connection(port_name: str, baud: int):
    """Establishes USB serial connection to STM32."""
    if not PYSERIAL_AVAILABLE:
        st.session_state.serial_error = "pyserial library not installed. Run: pip install pyserial"
        st.session_state.connection_state = "ERROR"
        return False

    close_serial_connection()

    try:
        ser = serial.Serial(
            port=port_name,
            baudrate=baud,
            timeout=0.05,
            write_timeout=0.1,
        )
        st.session_state.ser = ser
        st.session_state.connection_state = "WAITING"
        st.session_state.serial_error = None
        return True
    except SerialException as e:
        st.session_state.ser = None
        st.session_state.connection_state = "ERROR"
        st.session_state.serial_error = f"Cannot open port {port_name}: {str(e)}"
        return False
    except Exception as e:
        st.session_state.ser = None
        st.session_state.connection_state = "ERROR"
        st.session_state.serial_error = f"Serial error on {port_name}: {str(e)}"
        return False


def close_serial_connection():
    """Safely closes serial handle."""
    if st.session_state.ser is not None:
        try:
            st.session_state.ser.close()
        except Exception:
            pass
    st.session_state.ser = None
    st.session_state.connection_state = "ERROR"


def send_command(char_cmd: str):
    """
    Sends single character ('O' or 'F') to STM32 over serial.
    Updates UI and session state accordingly.
    """
    cmd = char_cmd.strip().upper()
    if cmd not in ['O', 'F']:
        return

    # Write single char to physical serial port if open
    if st.session_state.ser is not None and st.session_state.ser.is_open:
        try:
            st.session_state.ser.write(cmd.encode('utf-8'))
            st.session_state.ser.flush()
        except SerialException as e:
            st.session_state.connection_state = "ERROR"
            st.session_state.serial_error = f"Serial error sending '{cmd}': {str(e)}"
        except Exception as e:
            st.session_state.connection_state = "ERROR"
            st.session_state.serial_error = f"Write error: {str(e)}"

    # If in virtual STM32 simulation mode, simulate firmware echo response
    if st.session_state.use_virtual_stm32:
        target_state = "ON" if cmd == "O" else "OFF"
        process_incoming_line(f"MOTOR_{target_state}")

    # Immediately reflect state change in session manager
    if cmd == "O" and st.session_state.motor_state != "ON":
        st.session_state.vib_spool = 500.0
        handle_motor_state_change("ON")
    elif cmd == "F" and st.session_state.motor_state != "OFF":
        # Start smooth spool-down from current vibration
        st.session_state.vib_spool = max(st.session_state.cur_vib, 400.0)
        handle_motor_state_change("OFF")


# Process any secret command from query params
if "secret_cmd" in st.query_params:
    secret_received = str(st.query_params["secret_cmd"]).strip().upper()
    if secret_received in ["O", "F"]:
        send_command(secret_received)
    del st.query_params["secret_cmd"]


# ==============================================================================
# STATE & SESSION MANAGEMENT
# ==============================================================================
def handle_motor_state_change(new_state: str):
    """
    Manages session evaluation when motor toggles between ON and OFF.
    Finalizes prior session and starts a new numbered session.
    """
    if st.session_state.motor_state == new_state:
        return

    # Conclude prior session
    elapsed_t = st.session_state.last_sample_t
    duration = max(0.0, elapsed_t - st.session_state.session_start_t)
    completed_session = {
        "session_id": st.session_state.session_id,
        "state": st.session_state.motor_state,
        "duration (s)": round(duration, 2),
        "max_V_res": round(st.session_state.current_max_V_res, 2),
        "max_T_res": round(st.session_state.current_max_T_res, 2),
        "alarms_in_session": st.session_state.current_alarms_count,
    }
    st.session_state.sessions.append(completed_session)

    # Initialize new session
    st.session_state.motor_state = new_state
    st.session_state.motor_on = (new_state == "ON")
    st.session_state.session_id += 1
    st.session_state.session_start_t = elapsed_t
    st.session_state.current_max_V_res = 0.0
    st.session_state.current_max_T_res = 0.0
    st.session_state.current_alarms_count = 0


# ==============================================================================
# PROTOCOL PARSER (STM32 -> Dashboard)
# ==============================================================================
def process_incoming_line(line: str):
    """
    Parses messages from STM32 per specification.
    """
    raw = line.strip()
    if not raw:
        return

    # Transition rule 1: WAITING -> READY when line == "READY"
    if raw == "READY":
        st.session_state.connection_state = "READY"
        return

    # Transition rule 2: READY -> RUNNING when line == "STARTED"
    if raw == "STARTED":
        st.session_state.connection_state = "RUNNING"
        return

    # State Change Notifications
    if raw == "MOTOR_ON":
        st.session_state.vib_spool = 500.0
        handle_motor_state_change("ON")
        return
    elif raw == "MOTOR_OFF":
        st.session_state.vib_spool = max(st.session_state.cur_vib, 400.0)
        handle_motor_state_change("OFF")
        return

    # Telemetry Data Lines
    if raw.startswith("DATA,") or raw.startswith("DATA"):
        parts = raw.split(",")
        parsed = {}
        for part in parts[1:]:
            if "=" in part:
                k, v = part.split("=", 1)
                parsed[k.strip()] = v.strip()

        try:
            t_ms = float(parsed.get("T", 0.0))
            t_sec = round(t_ms / 1000.0, 2)
            vibration = float(parsed.get("V", 0.0))
            temperature = float(parsed.get("Temp", AMBIENT_TEMP))
            state_str = parsed.get("STATE", st.session_state.motor_state).upper()

            # Align motor state
            if state_str in ["ON", "OFF"] and state_str != st.session_state.motor_state:
                handle_motor_state_change(state_str)

            # DIGITAL TWIN MODEL (calculated per sample)
            T_pred = AMBIENT_TEMP + (12.0 if state_str == "ON" else 0.0)
            V_pred = 500.0 if state_str == "ON" else 0.0

            T_res = temperature - T_pred
            V_res = vibration - V_pred

            # ANOMALY DETECTION:
            # T_THRESH = 3.0, V_THRESH = 300
            alarm_T = abs(T_res) > T_THRESH
            alarm_V = abs(V_res) > V_THRESH

            # Log only on False -> True transition
            new_alarm_tripped = False
            if alarm_T and not st.session_state.prev_alarm_T:
                st.session_state.alarm_log.append({
                    "timestamp": f"{t_sec:.2f}s",
                    "type": "Temperature (T)",
                    "residual": f"{T_res:+.2f} °C",
                    "threshold": f"±{T_THRESH:.1f} °C",
                    "session_id": st.session_state.session_id,
                })
                new_alarm_tripped = True

            if alarm_V and not st.session_state.prev_alarm_V:
                st.session_state.alarm_log.append({
                    "timestamp": f"{t_sec:.2f}s",
                    "type": "Vibration (V)",
                    "residual": f"{V_res:+.1f}",
                    "threshold": f"±{V_THRESH:.0f}",
                    "session_id": st.session_state.session_id,
                })
                new_alarm_tripped = True

            st.session_state.prev_alarm_T = alarm_T
            st.session_state.prev_alarm_V = alarm_V

            if abs(V_res) > st.session_state.current_max_V_res:
                st.session_state.current_max_V_res = abs(V_res)
            if abs(T_res) > st.session_state.current_max_T_res:
                st.session_state.current_max_T_res = abs(T_res)
            if new_alarm_tripped:
                st.session_state.current_alarms_count += 1

            # Update live metrics
            st.session_state.last_sample_t = t_sec
            st.session_state.cur_vib = vibration
            st.session_state.cur_temp = temperature
            st.session_state.cur_T_pred = T_pred
            st.session_state.cur_V_pred = V_pred
            st.session_state.cur_T_res = T_res
            st.session_state.cur_V_res = V_res
            st.session_state.alarm_T_active = alarm_T
            st.session_state.alarm_V_active = alarm_V
            st.session_state.total_samples += 1

            sample_entry = {
                "timestamp": t_sec,
                "vibration": round(vibration, 2),
                "temperature": round(temperature, 2),
                "T_pred": round(T_pred, 2),
                "V_pred": round(V_pred, 2),
                "T_res": round(T_res, 2),
                "V_res": round(V_res, 2),
                "motor_state": state_str,
                "session_id": st.session_state.session_id,
            }
            st.session_state.samples.append(sample_entry)

        except Exception as parse_err:
            st.session_state.serial_error = f"Parse warning: {parse_err} on line '{raw}'"


def poll_serial_data():
    """
    Non-blocking poll of serial buffer using in_waiting.
    """
    ser = st.session_state.ser
    if ser is not None and ser.is_open:
        try:
            waiting = ser.in_waiting
            if waiting > 0:
                chunk = ser.read(waiting).decode('utf-8', errors='ignore')
                st.session_state.serial_rx_buffer += chunk
                while '\n' in st.session_state.serial_rx_buffer:
                    line, st.session_state.serial_rx_buffer = st.session_state.serial_rx_buffer.split('\n', 1)
                    process_incoming_line(line)
        except SerialException as e:
            st.session_state.connection_state = "ERROR"
            st.session_state.serial_error = f"Serial exception: {str(e)}"
        except Exception as e:
            st.session_state.connection_state = "ERROR"
            st.session_state.serial_error = f"Serial read error: {str(e)}"

    elif st.session_state.use_virtual_stm32 and st.session_state.connection_state == "RUNNING":
        simulate_stm32_telemetry_tick()


def simulate_stm32_telemetry_tick():
    """
    Generates synthetic STM32 tick adhering strictly to the firmware protocol.
    Includes realistic smooth spool-down dynamics when motor is turned OFF.
    """
    st.session_state.sim_t += 0.2
    t_ms = int(st.session_state.sim_t * 1000)
    is_on = (st.session_state.motor_state == "ON")

    if is_on:
        # Motor is ON: active dual-harmonic vibration and warming
        vib = 500.0 + float(np.random.normal(0, 35)) + 120.0 * np.sin(2 * np.pi * 7.3 * st.session_state.sim_t)
        cur_t = getattr(st.session_state, "_sim_temp", AMBIENT_TEMP)
        cur_t += ((AMBIENT_TEMP + 12.0) - cur_t) * 0.025 + float(np.random.normal(0, 0.04))
        st.session_state._sim_temp = cur_t
        st.session_state.vib_spool = 500.0
    else:
        # Motor is OFF: slowly coasts down and off
        if st.session_state.vib_spool > 10.0:
            # Exponential mechanical deceleration coasting down
            st.session_state.vib_spool *= 0.88
            vib = st.session_state.vib_spool + float(abs(np.random.normal(0, 4)))
        else:
            # Idle background level
            st.session_state.vib_spool = 0.0
            vib = float(abs(np.random.normal(0, 3)))

        # Temperature slowly cools down toward ambient
        cur_t = getattr(st.session_state, "_sim_temp", AMBIENT_TEMP)
        cur_t += (AMBIENT_TEMP - cur_t) * 0.015 + float(np.random.normal(0, 0.02))
        st.session_state._sim_temp = cur_t

    data_line = f"DATA,T={t_ms},V={vib:.1f},Temp={cur_t:.1f},STATE={st.session_state.motor_state}"
    process_incoming_line(data_line)


# Poll serial inputs before rendering
poll_serial_data()


# ==============================================================================
# AI PET WIDGET — KAMBAR AI (DETERMINISTIC HELPER)
# ==============================================================================
def kambar_answer(
    question: str,
    motor_on: bool,
    alarm_active: bool,
    connection_state: str,
    current_vib: float,
    current_temp: float,
    V_pred: float,
    T_pred: float,
    active_alarms: list,
    validated_metrics: dict | None,
) -> str:
    """
    Answers user queries about the dashboard based on live state and deterministic dictionary.
    No model, network, or external API calls.
    """
    q = question.strip().lower()
    if not q:
        return "Hi! I'm Kambar AI. Ask me about the dashboard."

    # (b) Summary / status / overall / report -> live dashboard summary
    if any(k in q for k in [
        "summary", "status", "overall", "report", "how is everything",
        "dashboard status", "tell me about the dashboard"
    ]):
        if validated_metrics is not None:
            p = validated_metrics["p"]
            r = validated_metrics["r"]
            f1 = validated_metrics["f1"]
            validation_status_line = f"VALIDATED — Precision {p:.2f}, Recall {r:.2f}, F1 {f1:.2f} (from twin.py)"
        else:
            validation_status_line = (
                "NOT VALIDATED — placeholder confusion matrix (zero weights). "
                "Run twin.py to populate real metrics."
            )

        return (
            f"Dashboard status:\n"
            f"- Connection: {connection_state}\n"
            f"- Motor: {'ON 🟢' if motor_on else 'OFF ⚪'}\n"
            f"- Vibration: {current_vib:.0f} (predicted {V_pred:.0f})\n"
            f"- Temperature: {current_temp:.1f} °C (predicted {T_pred:.1f})\n"
            f"- Active alarms: {len(active_alarms)}\n"
            f"- Model validation: {validation_status_line}"
        )

    # Validation inquiries
    if any(k in q for k in [
        "validation", "model validation", "validated", "confusion matrix",
        "precision", "recall", "f1", "is the model trained"
    ]):
        if validated_metrics is not None:
            p = validated_metrics["p"]
            r = validated_metrics["r"]
            f1 = validated_metrics["f1"]
            tp = validated_metrics["tp"]
            fn = validated_metrics["fn"]
            fp = validated_metrics["fp"]
            tn = validated_metrics["tn"]
            train_n = validated_metrics["train_n"]
            test_n = validated_metrics["test_n"]
            return (
                f"Yes. Model validation was performed by twin.py on a held-out test "
                f"set. Results: Precision={p:.2f}, Recall={r:.2f}, F1={f1:.2f}. "
                f"Confusion matrix: TP={tp}, FN={fn}, FP={fp}, TN={tn}. "
                f"Trained on {train_n} normal samples, tested on {test_n} samples."
            )
        else:
            return (
                "No. Model validation has NOT been performed. The dashboard shows a "
                "placeholder confusion matrix with zero weights. To validate, run "
                "twin.py on separate training and test datasets — the results will "
                "appear here automatically."
            )

    # How does it work
    if any(k in q for k in [
        "how does it work", "how does the dashboard work",
        "explain the dashboard", "what is this"
    ]):
        return (
            "This dashboard monitors a motor digital twin. The STM32 sends "
            "vibration and temperature over USB serial. The dashboard compares "
            "measured values to predicted values (the twin) and flags anomalies "
            "when the residual is too large. Use O and F to turn the motor on/off. "
            "Ask me about: digital twin, residual, vibration, temperature, alarms, "
            "limitations, validation, provenance, safety."
        )

    # What can you do / help
    if any(k in q for k in [
        "what can you do", "help", "who are you", "your name", "what do you know"
    ]):
        return (
            "I'm Kambar AI, your dashboard assistant. I can explain: digital twin, "
            "residual, vibration chart, temperature chart, alarms, O/F controls, "
            "model validation status, data provenance, safety, and limitations. "
            "I can also give you an overall summary — just ask 'summary' or "
            "'status'."
        )

    # (a) Specific keyword matches
    if any(k in q for k in ["digital twin", "twin"]):
        return (
            "A digital twin is a software model that predicts what the motor SHOULD be doing. "
            "We compare the real sensor values to the prediction — the difference is called the residual."
        )

    if "residual" in q:
        return (
            "Residual = measured value − predicted value. Small residual means the motor behaves as expected. "
            "Large residual triggers an alarm."
        )

    if any(k in q for k in ["vibration chart", "vibration"]):
        return (
            "The vibration chart shows the measured vibration (blue) and the twin's predicted baseline (orange dashed). "
            "They should overlap when the motor is healthy."
        )

    if any(k in q for k in ["temperature chart", "temperature"]):
        return (
            "The temperature chart shows the motor casing temperature from the DHT11 (blue) and the twin's thermal prediction (orange dashed). "
            "The motor warms up slowly when ON and cools when OFF."
        )

    if any(k in q for k in ["alarm", "anomaly"]):
        return (
            "An alarm fires when |residual| exceeds the threshold (3 °C for temperature, 300 units for vibration). "
            "Every alarm is timestamped and logged in the Alarm Log section."
        )

    if any(k in q for k in ["motor on", "is the motor", "motor state"]):
        return f"Motor is currently {'ON 🟢' if motor_on else 'OFF ⚪'}. You can change it with the O and F buttons."

    if any(k in q for k in ["o and f", "control", "button", "press o", "press f"]):
        return (
            "Press O to turn the motor ON, F to turn it OFF. These buttons send a single character over USB serial "
            "to the STM32, which switches its data stream between ON and OFF behavior."
        )

    if any(k in q for k in ["limitation", "limitations", "cannot", "cannot do"]):
        return (
            "Vibration is simulated in firmware; only temperature is real from the DHT11. "
            "AI output is advisory — it does not replace hardware protection. No remaining-useful-life claim is made."
        )

    if any(k in q for k in ["provenance", "data source", "where does the data"]):
        return (
            "Temperature comes from a real DHT11 sensor on the STM32. Vibration is generated in STM32 firmware (simulated). "
            "All data arrives over USB serial at 115200 baud."
        )

    if any(k in q for k in ["safe", "safety", "protection"]):
        return (
            "AI alarms are ADVISORY only. The motor has an independent power supply and its own hardware protection. "
            "The AI never controls the motor directly — it only suggests when something looks wrong."
        )

    # (c) Updated fallback when no keyword matches
    val_status_word = "complete" if validated_metrics is not None else "not yet performed"
    return (
        f"I only know about this dashboard. Quick status: motor is "
        f"{'ON 🟢' if motor_on else 'OFF ⚪'}, model validation is "
        f"{val_status_word}. Try asking:\n"
        f"- 'summary' — full dashboard status\n"
        f"- 'what is a digital twin?'\n"
        f"- 'what is the residual?'\n"
        f"- 'is the model validated?'\n"
        f"- 'what are the limitations?'"
    )


# ==============================================================================
# SIDEBAR — SERIAL PORT, SECRET CONTROLS & KAMBAR AI
# ==============================================================================
with st.sidebar:
    st.markdown("### 🔌 STM32 USB Serial Port")
    st.caption("115200 Baud | Nucleo USB CDC")

    available_ports = list_available_ports()
    default_idx = available_ports.index("COM3") if "COM3" in available_ports else 0
    selected_port = st.selectbox(
        "Serial Port",
        options=available_ports,
        index=default_idx,
        help="Select the USB virtual COM port assigned to the STM32 Nucleo board.",
    )
    st.session_state.selected_port = selected_port

    col_c1, col_c2 = st.columns(2)
    with col_c1:
        if st.button("🔗 Connect", use_container_width=True, type="primary"):
            st.session_state.use_virtual_stm32 = False
            open_serial_connection(selected_port, DEFAULT_BAUD)
            st.rerun()

    with col_c2:
        if st.button("🔌 Disconnect", use_container_width=True):
            close_serial_connection()
            st.session_state.use_virtual_stm32 = False
            st.rerun()

    # Reconnect button when in ERROR state
    if st.session_state.connection_state == "ERROR":
        st.markdown("---")
        st.error(st.session_state.serial_error or "Serial connection lost or disconnected.")
        if st.button("🔄 Reconnect Serial Port", type="primary", use_container_width=True):
            open_serial_connection(st.session_state.selected_port, DEFAULT_BAUD)
            st.rerun()

    # Hardware-Free Fallback Simulator Toggle
    st.markdown("---")
    st.markdown("### 🧪 Hardware Loopback Simulator")
    st.caption("Test the dashboard without physical hardware attached.")

    use_sim = st.toggle(
        "Enable Virtual STM32",
        value=st.session_state.use_virtual_stm32,
        help="Simulates STM32 READY -> STARTED -> DATA sequence in software for testing."
    )
    if use_sim != st.session_state.use_virtual_stm32:
        st.session_state.use_virtual_stm32 = use_sim
        if use_sim:
            close_serial_connection()
            st.session_state.connection_state = "READY"
        else:
            st.session_state.connection_state = "ERROR"
        st.rerun()

    if st.session_state.use_virtual_stm32:
        if st.session_state.connection_state == "READY":
            st.warning("STM32 in READY state. Press virtual Nucleo Blue Button below:")
            if st.button("🔵 Press Blue Button (Simulate STARTED)", use_container_width=True):
                process_incoming_line("STARTED")
                st.rerun()
        elif st.session_state.connection_state == "RUNNING":
            st.success("Virtual STM32 RUNNING. Telemetry stream active.")

    # Secret Keyboard Listener Box in Sidebar (discrete input fallback for browser)
    st.markdown("---")
    st.caption("⌨️ **Secret Keyboard Listener**")
    st.markdown(
        "<span style='font-size:0.75rem; color:#94a3b8;'>"
        "• Press <b>O</b> to activate motor telemetry.<br>"
        "• Press <b>F</b> for slow coast-down shutdown."
        "</span>",
        unsafe_allow_html=True,
    )
    secret_box = st.text_input(
        "Secret Key Input",
        value="",
        max_chars=1,
        placeholder="Type O or F here",
        key="secret_cmd_input",
        label_visibility="collapsed",
    )
    if secret_box:
        if secret_box.lower() == "o":
            send_command("O")
            st.session_state.secret_cmd_input = ""
            st.rerun()
        elif secret_box.lower() == "f":
            send_command("F")
            st.session_state.secret_cmd_input = ""
            st.rerun()

    # ==============================================================================
    # AI PET WIDGET — KAMBAR AI (Sidebar Widget)
    # ==============================================================================
    st.markdown("---")
    st.markdown("### 🤖 Kambar AI")

    # Mood emoji that changes based on dashboard state:
    # 😴 when connection_state == "WAITING"
    # 👀 when connection_state == "READY"
    # 😊 when connection_state == "RUNNING" and motor is OFF
    # 🤩 when connection_state == "RUNNING" and motor is ON
    # 😟 when an alarm is active
    # 😵 when connection_state == "ERROR"
    current_alarm = st.session_state.alarm_T_active or st.session_state.alarm_V_active
    curr_conn = st.session_state.connection_state
    curr_motor_on = (st.session_state.motor_state == "ON")

    if current_alarm:
        mood_emoji = "😟"
    elif curr_conn == "WAITING":
        mood_emoji = "😴"
    elif curr_conn == "READY":
        mood_emoji = "👀"
    elif curr_conn == "RUNNING":
        mood_emoji = "🤩" if curr_motor_on else "😊"
    elif curr_conn == "ERROR":
        mood_emoji = "😵"
    else:
        mood_emoji = "😴"

    st.markdown(f"**Mood:** {mood_emoji}")

    if "kambar_history" not in st.session_state:
        st.session_state.kambar_history = []

    # Greeting on first load if no history yet
    if len(st.session_state.kambar_history) == 0:
        st.caption("Hi! I'm Kambar AI. Ask me about the dashboard.")

    active_alarms = []
    if st.session_state.alarm_T_active:
        active_alarms.append("Temperature")
    if st.session_state.alarm_V_active:
        active_alarms.append("Vibration")

    question = st.text_input("Ask Kambar AI", max_chars=100, key="kambar_q")
    if question:
        answer = kambar_answer(
            question=question,
            motor_on=curr_motor_on,
            alarm_active=current_alarm,
            connection_state=curr_conn,
            current_vib=st.session_state.cur_vib,
            current_temp=st.session_state.cur_temp,
            V_pred=st.session_state.cur_V_pred,
            T_pred=st.session_state.cur_T_pred,
            active_alarms=active_alarms,
            validated_metrics=VALIDATED_METRICS,
        )
        # Store in history if not duplicate of latest
        if len(st.session_state.kambar_history) == 0 or st.session_state.kambar_history[-1]["q"] != question:
            st.session_state.kambar_history.append({"q": question, "a": answer})
            if len(st.session_state.kambar_history) > 3:
                st.session_state.kambar_history = st.session_state.kambar_history[-3:]
        st.info(answer)

    # Show the last 3 Q&A pairs as a small chat log
    if len(st.session_state.kambar_history) > 0:
        st.markdown("**Recent Q&A:**")
        for item in reversed(st.session_state.kambar_history):
            st.markdown(f"**You:** {item['q']}")
            st.markdown(f"🤖 **Kambar:** {item['a']}")


# ==============================================================================
# SECTION 0 — HEADER & STATUS BADGES
# ==============================================================================
st.markdown("<h1 style='margin-bottom:4px; font-weight:800;'>Motor Digital Twin — Live Dashboard</h1>", unsafe_allow_html=True)
st.markdown("<p style='color:#00d2d3; font-size:1.0rem; margin-top:0;'>Live STM32 USB Serial Telemetry | Condition Monitoring | Real-Time Anomaly Detection</p>", unsafe_allow_html=True)

head_col1, head_col2, head_col3, head_col4 = st.columns([3, 2, 2, 2])

# Status badge reflecting connection_state
with head_col1:
    conn_state = st.session_state.connection_state
    if conn_state == "RUNNING":
        st.markdown('<div class="status-badge badge-conn-running">🟢 STM32 running — O/F enabled</div>', unsafe_allow_html=True)
    elif conn_state == "READY":
        st.markdown('<div class="status-badge badge-conn-ready">🟠 Press blue button on STM32</div>', unsafe_allow_html=True)
    elif conn_state == "WAITING":
        st.markdown('<div class="status-badge badge-conn-waiting">🟡 Waiting for STM32...</div>', unsafe_allow_html=True)
    else:
        st.markdown('<div class="status-badge badge-conn-error">🔴 Disconnected</div>', unsafe_allow_html=True)

# Motor State Badge
with head_col2:
    if st.session_state.alarm_T_active or st.session_state.alarm_V_active:
        st.markdown('<div class="status-badge badge-alarm">🚨 ALARM ACTIVE</div>', unsafe_allow_html=True)
    elif st.session_state.motor_state == "ON":
        st.markdown('<div class="status-badge badge-on">🟢 MOTOR ON</div>', unsafe_allow_html=True)
    else:
        st.markdown('<div class="status-badge badge-off">⚪ MOTOR OFF</div>', unsafe_allow_html=True)

with head_col3:
    st.metric("Elapsed Time", f"{st.session_state.last_sample_t:.1f} s")

with head_col4:
    st.metric("Total Samples", f"{st.session_state.total_samples}")


# ==============================================================================
# SECTION 1 — BIG METRIC BOXES (4 COLUMNS)
# ==============================================================================
st.markdown('<div class="section-header"><span class="section-badge">01</span> LIVE TELEMETRY & DIGITAL TWIN STEADY-STATE ESTIMATES</div>', unsafe_allow_html=True)

v_alarm = st.session_state.alarm_V_active
t_alarm = st.session_state.alarm_T_active

m_col1, m_col2, m_col3, m_col4 = st.columns(4)

with m_col1:
    v_cls = "metric-card alarm-active" if v_alarm else "metric-card"
    st.markdown(
        f"""
        <div class="{v_cls}">
            <div class="metric-title">Vibration (Measured)</div>
            <div class="metric-value">{st.session_state.cur_vib:.1f}<span class="metric-unit">units</span></div>
            <div class="metric-sub" style="color:{'#f87171' if v_alarm else '#38bdf8'};">
                V_res: {st.session_state.cur_V_res:+.1f} (Bound: ±{V_THRESH:.0f})
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

with m_col2:
    t_cls = "metric-card alarm-active" if t_alarm else "metric-card"
    st.markdown(
        f"""
        <div class="{t_cls}">
            <div class="metric-title">Temperature (DHT11)</div>
            <div class="metric-value">{st.session_state.cur_temp:.1f}<span class="metric-unit">°C</span></div>
            <div class="metric-sub" style="color:{'#f87171' if t_alarm else '#38bdf8'};">
                T_res: {st.session_state.cur_T_res:+.2f} °C (Bound: ±{T_THRESH:.1f}°C)
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

with m_col3:
    st.markdown(
        f"""
        <div class="metric-card">
            <div class="metric-title">Twin Predicted Temp (T_pred)</div>
            <div class="metric-value">{st.session_state.cur_T_pred:.1f}<span class="metric-unit">°C</span></div>
            <div class="metric-sub">ambient + (12 if ON else 0)</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

with m_col4:
    st.markdown(
        f"""
        <div class="metric-card">
            <div class="metric-title">Twin Predicted Vib (V_pred)</div>
            <div class="metric-value">{st.session_state.cur_V_pred:.0f}<span class="metric-unit">units</span></div>
            <div class="metric-sub">500 if ON else 0</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


# ==============================================================================
# SECTION 2 — 3 LIVE CHARTS (st.line_chart)
# ==============================================================================
st.markdown('<div class="section-header"><span class="section-badge">02</span> LIVE TIME-SERIES VISUALIZATIONS (300 ROLLING SAMPLES)</div>', unsafe_allow_html=True)

if len(st.session_state.samples) > 0:
    df_samples = pd.DataFrame(list(st.session_state.samples))

    tab_a, tab_b, tab_c = st.tabs([
        "📈 A) Vibration (Measured vs V_pred)",
        "🌡️ B) Temperature (DHT11 vs T_pred)",
        "🎯 C) Residuals & Threshold Bands (±T_THRESH, ±V_THRESH)",
    ])

    with tab_a:
        st.markdown("**Chart A: Vibration Measured vs. Digital Twin V_pred**")
        df_vib = df_samples[["timestamp", "vibration", "V_pred"]].set_index("timestamp")
        df_vib.columns = ["Measured Vibration (firmware)", "Digital Twin V_pred"]
        st.line_chart(df_vib, height=280)
        st.caption("Compares STM32 firmware vibration telemetry with steady-state baseline (500 units when ON, 0 when OFF).")

    with tab_b:
        st.markdown("**Chart B: Temperature Measured (DHT11) vs. Digital Twin T_pred**")
        df_temp = df_samples[["timestamp", "temperature", "T_pred"]].set_index("timestamp")
        df_temp.columns = ["Measured DHT11 Temp (°C)", "Digital Twin T_pred (°C)"]
        st.line_chart(df_temp, height=280)
        st.caption("Compares real DHT11 temperature telemetry with steady-state thermal model (37°C when ON, 25°C when OFF).")

    with tab_c:
        st.markdown("**Chart C: Residuals T_res and V_res with ±threshold Horizontal Lines**")
        col_res1, col_res2 = st.columns(2)
        with col_res1:
            st.markdown("##### Vibration Residual (V_res) & Bounds (Units: raw index)")
            df_vres = pd.DataFrame({
                "timestamp": df_samples["timestamp"],
                "V_res": df_samples["V_res"],
                "+V_THRESH": V_THRESH,
                "-V_THRESH": -V_THRESH,
            }).set_index("timestamp")
            st.line_chart(df_vres, height=260)
            st.caption(f"Trips alarm when |V_res| > {V_THRESH:.0f} units.")

        with col_res2:
            st.markdown("##### Temperature Residual (T_res) & Bounds (Units: °C)")
            df_tres = pd.DataFrame({
                "timestamp": df_samples["timestamp"],
                "T_res (°C)": df_samples["T_res"],
                "+T_THRESH": T_THRESH,
                "-T_THRESH": -T_THRESH,
            }).set_index("timestamp")
            st.line_chart(df_tres, height=260)
            st.caption(f"Trips alarm when |T_res| > {T_THRESH:.1f}°C.")
else:
    st.info("Awaiting serial data from STM32. Press blue button on Nucleo to start stream.")


# ==============================================================================
# SECTION 3 — ALARM LOG (st.dataframe)
# ==============================================================================
st.markdown('<div class="section-header"><span class="section-badge">03</span> ANOMALY EVENT LOG (FALSE -> TRUE TRANSITIONS)</div>', unsafe_allow_html=True)

if len(st.session_state.alarm_log) > 0:
    df_alarms = pd.DataFrame(st.session_state.alarm_log)
    df_alarms_rev = df_alarms.iloc[::-1].reset_index(drop=True)
    st.dataframe(df_alarms_rev, use_container_width=True, hide_index=True)
    st.caption(f"Total anomaly events logged: {len(st.session_state.alarm_log)}. Logged strictly on False->True threshold breach.")
else:
    st.success("✅ Nominal operation — Zero anomaly events recorded.")


# ==============================================================================
# SECTION 4 — EVALUATION SUMMARY (st.dataframe)
# ==============================================================================
st.markdown('<div class="section-header"><span class="section-badge">04</span> STATE-SESSION EVALUATION SUMMARY</div>', unsafe_allow_html=True)

all_sessions = list(st.session_state.sessions)
cur_dur = max(0.0, st.session_state.last_sample_t - st.session_state.session_start_t)
current_session_summary = {
    "session_id": st.session_state.session_id,
    "state": f"{st.session_state.motor_state} (Active)",
    "duration (s)": round(cur_dur, 2),
    "max_V_res": round(st.session_state.current_max_V_res, 2),
    "max_T_res": round(st.session_state.current_max_T_res, 2),
    "alarms_in_session": st.session_state.current_alarms_count,
}
all_sessions.append(current_session_summary)

df_sessions = pd.DataFrame(all_sessions)
st.dataframe(df_sessions, use_container_width=True, hide_index=True)
st.caption("A session is instantiated whenever the motor state changes between ON and OFF. Completed session summaries are preserved permanently.")


# ==============================================================================
# SECTION 5 — MODEL VALIDATION STATUS
# ==============================================================================
st.markdown('<div class="section-header"><span class="section-badge">05</span> MODEL VALIDATION STATUS</div>', unsafe_allow_html=True)

# 1. Prominent Formal Notice at top of Section 5
st.warning(
    "⚠️ **FORMAL NOTICE**\n\n"
    "Model validation is NOT performed by this dashboard.\n"
    "Training/test separation, confusion matrices, and model performance\n"
    "must be evaluated using a separately validated model and appropriate\n"
    "test datasets."
)

if VALIDATED_METRICS is not None:
    st.success(
        f"✅ **Model Validation Active (twin.py):** "
        f"Precision = {VALIDATED_METRICS['p']:.2f} | Recall = {VALIDATED_METRICS['r']:.2f} | F1 = {VALIDATED_METRICS['f1']:.2f}"
    )
    conf_df = pd.DataFrame(
        [
            {"Model Classification": "Predicted Anomaly (+)", "Actual Anomaly (+)": VALIDATED_METRICS['tp'], "Actual Normal (-)": VALIDATED_METRICS['fp']},
            {"Model Classification": "Predicted Normal (-)", "Actual Anomaly (+)": VALIDATED_METRICS['fn'], "Actual Normal (-)": VALIDATED_METRICS['tn']},
        ]
    ).set_index("Model Classification")
    st.markdown("**Validated Confusion Matrix (from twin.py)**")
    st.dataframe(conf_df, use_container_width=True)

    metric_col1, metric_col2, metric_col3, metric_col4 = st.columns(4)
    metric_col1.metric("Precision", f"{VALIDATED_METRICS['p']:.2f}")
    metric_col2.metric("Recall", f"{VALIDATED_METRICS['r']:.2f}")
    metric_col3.metric("F1", f"{VALIDATED_METRICS['f1']:.2f}")
    acc = (VALIDATED_METRICS['tp'] + VALIDATED_METRICS['tn']) / max(1, VALIDATED_METRICS['test_n'])
    metric_col4.metric("Accuracy", f"{acc:.2f}")
else:
    # 2. Placeholder Confusion Matrix with clear label
    st.markdown("**Placeholder Confusion Matrix (Unvalidated Baseline — Zero Weights)**")

    confusion_data = pd.DataFrame(
        [
            {"Model Classification": "Predicted Anomaly (+)", "Actual Anomaly (+)": 0, "Actual Normal (-)": 0},
            {"Model Classification": "Predicted Normal (-)", "Actual Anomaly (+)": 0, "Actual Normal (-)": 0},
        ]
    ).set_index("Model Classification")

    st.dataframe(confusion_data, use_container_width=True)

    # 3. Placeholder st.metric boxes all set to "—" (dash meaning not computed)
    metric_col1, metric_col2, metric_col3, metric_col4 = st.columns(4)
    metric_col1.metric("Precision", "—")
    metric_col2.metric("Recall", "—")
    metric_col3.metric("F1", "—")
    metric_col4.metric("Accuracy", "—")

    # 4. Italic caption below metrics
    st.markdown(
        "*This dashboard displays live telemetry and twin residuals only. "
        "No classifier is trained or evaluated here. The placeholder matrix "
        "above will be populated by twin.py after a separately validated "
        "train/test procedure on recorded hardware runs. Until then, all "
        "values remain zero and no performance claim is made.*"
    )


# ==============================================================================
# SECTION 6 — DATASET PROVENANCE PLACEHOLDER (st.info)
# ==============================================================================
st.markdown('<div class="section-header"><span class="section-badge">06</span> DATASET PROVENANCE</div>', unsafe_allow_html=True)
st.info("Live data from STM32 DHT11 (real) + simulated vibration (firmware).")


# ==============================================================================
# AUTO-REFRESH LOOP
# ==============================================================================
if st.session_state.connection_state in ["WAITING", "READY", "RUNNING"] and (st.session_state.ser is not None or st.session_state.use_virtual_stm32):
    time.sleep(0.2)
    st.rerun()
