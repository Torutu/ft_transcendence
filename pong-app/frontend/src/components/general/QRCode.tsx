// pong-app/frontend/src/components/QRCode.tsx
import { QRCodeCanvas } from 'qrcode.react';

export const QRCode = ({ value }: { value: string }) => {
  return (
    <div>
      <QRCodeCanvas value={value} size={160} />
    </div>
  );
}


