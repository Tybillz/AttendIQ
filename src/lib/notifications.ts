// Notification utilities for WhatsApp, SMS, and Parent Alerting

export function formatNigerianPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('0') && digits.length === 11) {
    return '234' + digits.slice(1);
  }
  if (digits.startsWith('234')) {
    return digits;
  }
  return digits;
}

export function generateWhatsAppUrl(phone: string, message: string): string {
  const formatted = formatNigerianPhoneForWhatsApp(phone);
  return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
}

export function generateSmsUrl(phone: string, message: string): string {
  return `sms:${phone}?body=${encodeURIComponent(message)}`;
}

export async function sendLiveNotification(payload: {
  studentName: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  message: string;
  channel: 'WhatsApp' | 'SMS' | 'Both' | 'Email';
  type: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network failure' };
  }
}
