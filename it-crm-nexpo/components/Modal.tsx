import { ReactNode } from "react";
import Button from "./Button";

type ModalProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
};

// Reusable modal za prikaz dodatnih informacija.
export default function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>

          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>

        {children}
      </div>
    </div>
  );
}