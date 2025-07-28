import { QRCodeCanvas } from 'qrcode.react';

export default function QRCodeComponent({ value }: { value: string }) {
  return (
    <div>
      <QRCodeCanvas value={value} size={160} />
    </div>
  );
}

// Usage example:
// <MyQRCodeComponent value="otpauth://totp/YourApp:user@example.com?secret=ABC123&issuer=YourApp" />