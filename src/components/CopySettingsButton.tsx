import { useState } from "react";
import Button from "./Button";

export interface ButtonProps extends React.ComponentPropsWithoutRef<"button"> {}

const labelDefault = "Copy Settings";

export default function CopySettingsButton({ onClick, ...rest }: ButtonProps) {
  const [label, setLabel] = useState(labelDefault);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    setLabel("Copied ✅");
    if (onClick) onClick(e);
    setTimeout(() => {
      setLabel(labelDefault);
    }, 1000);
  }

  return (
    <Button variant="primary" onClick={handleClick}>
      {label}
    </Button>
  );
}
