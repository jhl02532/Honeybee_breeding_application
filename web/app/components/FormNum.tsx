import React from "react";
import { styles } from "../styles";

interface FormNumProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  step?: number;
}

export default function FormNum({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: FormNumProps) {
  const currentVal = parseFloat(value) || 0.0;
  const currentStep = step ?? 0.5;

  const decrement = (e: React.MouseEvent) => {
    e.preventDefault();
    let newVal = currentVal - currentStep;
    if (min !== undefined && newVal < min) newVal = min;
    onChange(String(Math.round(newVal * 100) / 100));
  };

  const increment = (e: React.MouseEvent) => {
    e.preventDefault();
    let newVal = currentVal + currentStep;
    if (max !== undefined && newVal > max) newVal = max;
    onChange(String(Math.round(newVal * 100) / 100));
  };

  return (
    <div style={{ ...styles.inputGroup, flex: 1 }}>
      <label style={styles.inputLabel}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <button
          onClick={decrement}
          style={{
            padding: "8px 12px",
            background: "rgba(17,24,39,0.8)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "6px",
            color: "#fbbf24",
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "16px",
            userSelect: "none",
          }}
        >
          -
        </button>
        <input
          style={{
            ...styles.input,
            textAlign: "center" as const,
            padding: "8px",
            flex: 1,
          }}
          type="number"
          step={step ?? "any"}
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          onClick={increment}
          style={{
            padding: "8px 12px",
            background: "rgba(17,24,39,0.8)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "6px",
            color: "#fbbf24",
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "16px",
            userSelect: "none",
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}
