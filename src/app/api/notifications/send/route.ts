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

    // Meta WhatsApp Cloud API / Termii (Nigerian SMS & WhatsApp) / Webhook dispatch hook
    const whatsappToken = process.env.WHATSAPP_CLOUD_TOKEN;
    const whatsappPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const termiiApiKey = process.env.TERMII_API_KEY;
    const termiiSenderId = process.env.TERMII_SENDER_ID || 'APEXCREST';
    const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;

    let dispatched = false;
    let provider = 'browser_direct';

    const formattedPhone = parentPhone.replace(/[^0-9]/g, '');
    const to = formattedPhone.startsWith('0') ? '234' + formattedPhone.slice(1) : formattedPhone;

    // 1. Direct Meta WhatsApp Cloud API Dispatch
    if (whatsappToken && whatsappPhoneId) {
      try {
        const waRes = await fetch(`https://graph.facebook.com/v19.0/${whatsappPhoneId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${whatsappToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'text',
            text: { preview_url: true, body: message },
          }),
        });

        if (waRes.ok) {
          dispatched = true;
          provider = 'meta_whatsapp_cloud';
        }
      } catch (e) {
        console.warn('Meta WhatsApp Cloud dispatch attempt failed:', e);
      }
    }

    // 2. Termii SMS / WhatsApp fallback
    if (!dispatched && termiiApiKey) {
      try {
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

    // 3. Custom Institutional Webhook (Zapier / Make / n8n / Bot)
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentName,
            parentName,
            parentPhone: to,
            message,
            channel: channel || 'WhatsApp',
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (e) {
        console.warn('Webhook dispatch attempt failed:', e);
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
