import { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

// Reusable input polje za forme.
export default function Input({ label, ...props }: InputProps) {
  return (
    <div className="form-group">
      <label className="label">{label}</label>
      <input className="input" {...props} />
    </div>
  );
}