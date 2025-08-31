import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

const QRCodeCanvas: React.FC<{ otpauth_url: string }> = ({ otpauth_url }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (otpauth_url && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, otpauth_url, {
        width: 128,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      });
    }
  }, [otpauth_url]);

  return <canvas ref={canvasRef} />;
};

export default QRCodeCanvas;