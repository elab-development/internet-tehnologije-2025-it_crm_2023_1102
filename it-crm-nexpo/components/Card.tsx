import { ReactNode } from "react";

type CardProps = {
  title?: string;
  children: ReactNode;
};

// Reusable kartica za prikaz grupisanih podataka.
export default function Card({ title, children }: CardProps) {
  return (
    <div className="card">
      {title && <h3>{title}</h3>}
      {children}
    </div>
  );
}