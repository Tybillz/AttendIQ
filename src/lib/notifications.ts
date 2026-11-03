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

export interface ChildStatusNotificationParams {
  studentName: string;
  parentName: string;
  className: string;
  schoolName: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  time?: string;
  date?: string;
  minutesLate?: number;
  rollNumber?: string;
}

export function generateChildStatusWhatsAppMessage(params: ChildStatusNotificationParams): string {
  const { studentName, parentName, className, schoolName, status, time, date, minutesLate, rollNumber } = params;
  const todayStr = date || new Date().toLocaleDateString('en-GB');
  const timeStr = time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  if (status === 'present') {
    return `Good morning ${parentName || 'Parent'}! 👋\n\nOfficial notice from *${schoolName}*:\nYour child, *${studentName}* (Roll: ${rollNumber || className}), has safely arrived and was marked *PRESENT* in class *${className}* today (${todayStr}) at ${timeStr}.\n\nLessons are currently underway. Have a wonderful day! 📚`;
  }

  if (status === 'absent') {
    return `⚠️ *ATTENDANCE ALERT - ${schoolName.toUpperCase()}*\n\nDear ${parentName || 'Guardian'},\nThis is an urgent advisory that your child, *${studentName}*, was marked *ABSENT* from morning roll call in *${className}* today (${todayStr}).\n\nIf your child is unwell or with you, please submit a quick digital excuse note by tapping below:\n👉 https://attendiq.vercel.app/excuse\n\nFor immediate assistance, please contact the school administration office.`;
  }

  if (status === 'late') {
    const lateText = minutesLate ? ` (${minutesLate} minutes past resumption)` : '';
    return `⏱️ *LATE ARRIVAL NOTICE - ${schoolName}*\n\nDear ${parentName || 'Parent'},\nThis is to notify you that *${studentName}* arrived late to class *${className}* today at ${timeStr}${lateText}.\n\nPlease support us in ensuring timely resumption tomorrow morning. Thank you for your partnership!`;
  }

  return `Hello ${parentName || 'Parent'},\nThis is an update from *${schoolName}* regarding *${studentName}* in *${className}* for ${todayStr}. Attendance status recorded: *${status.toUpperCase()}*.`;
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
