// frontend/src/components/Alert.tsx
import React from "react";
import clsx from "clsx";

interface AlertProps {
  type: "success" | "error" | "info";
  message: string;
}

export const Alert = ({ type, message }: AlertProps) => {
  if (!message) return null;

  return (
    <div
      className={clsx(
        "mb-4 p-3 rounded-md text-sm",
        type === "success" && "bg-green-100 text-green-700",
        type === "error" && "bg-red-100 text-red-700",
        type === "info" && "bg-blue-100 text-blue-700"
      )}
    >
      {message}
    </div>
  );
};
