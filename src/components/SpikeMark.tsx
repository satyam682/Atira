import React from 'react';

interface SpikeMarkProps {
  className?: string;
}

export default function SpikeMark({ className = "w-6 h-6" }: SpikeMarkProps) {
  return (
    <svg
      className={`${className} text-primary`}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Elegant 4-spoke radial asterisk / flare mark */}
      <path d="M12 2C12 7.5 16.5 12 22 12C16.5 12 12 16.5 12 22C12 16.5 7.5 12 2 12C7.5 12 12 7.5 12 2Z" />
    </svg>
  );
}
