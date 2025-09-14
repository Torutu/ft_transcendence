// pong-app/frontend/src/components/QRCode.tsx
import { QRCodeCanvas } from 'qrcode.react';

export default function QRCode({ value }: { value: string }) {
  return (
    <div>
      <QRCodeCanvas value={value} size={160} />
    </div>
  );
}



// Usage example:
// <MyQRCode value="otpauth://totp/YourApp:user@example.com?secret=ABC123&issuer=YourApp" />