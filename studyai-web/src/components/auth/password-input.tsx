"use client";

import { useState, type InputHTMLAttributes } from "react";
import eyeIcon from "@/assets/icons/eye.svg";
import eyeOffIcon from "@/assets/icons/eye-off.svg";

export function PasswordInput({
  id,
  disabled,
  className = "workspace-field",
  style,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        id={id}
        disabled={disabled}
        type={visible ? "text" : "password"}
        className={className}
        style={{ ...style, paddingInlineEnd: "3rem" }}
      />
      <button
        type="button"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-controls={id}
        aria-pressed={visible}
        disabled={disabled}
        onClick={() => setVisible((value) => !value)}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-xl text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          aria-hidden="true"
          className="size-5 bg-current [mask-repeat:no-repeat] [mask-position:center] [mask-size:contain]"
          style={{
            maskImage: `url(${visible ? eyeOffIcon.src : eyeIcon.src})`,
            WebkitMaskImage: `url(${visible ? eyeOffIcon.src : eyeIcon.src})`,
          }}
        />
      </button>
    </div>
  );
}
