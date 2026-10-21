import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentName, parentName, parentPhone, message, channel } = body;

    if (!parentPhone || !message) {
      return NextResponse.json(
        { success: false, error: 'Recipient phone and message content are required' },
        { status: 400 }
      );
    }

    // Termii (Nigerian SMS Provider) / Twilio / Webhook dispatch hook
    const termiiApiKey = process.env.TERMII_API_KEY;
    const termiiSenderId = process.env.TERMII_SENDER_ID || 'APEXCREST';

    let dispatched = false;
    let provider = 'browser_direct';

    if (termiiApiKey) {
      try {
        const formattedPhone = parentPhone.replace(/[^0-9]/g, '');
        const to = formattedPhone.startsWith('0') ? '234' + formattedPhone.slice(1) : formattedPhone;

        const termiiRes = await fetch('https://api.ng.termii.com/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to,
            from: termiiSenderId,
            sms: message,
            type: 'plain',
            channel: 'generic',
            api_key: termiiApiKey,
          }),
        });

        if (termiiRes.ok) {
          dispatched = true;
          provider = 'termii_nigeria';
        }
      } catch (e) {
        console.warn('Termii dispatch attempt failed:', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Notification queued successfully via ${provider}`,
      details: {
        studentName,
        parentName,
        parentPhone,
        channel,
        dispatched,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/notifications/send:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
