import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  full?: boolean;
};

// Reusable dugme za sve akcije u aplikaciji.
export default function Button({
  children,
  variant = "primary",
  full = false,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`button button-${variant} ${full ? "button-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}