import { NextResponse } from 'next/server';

const SUPABASE_URL = 'https://zjayceqhoapcapsvevrq.supabase.co';
const CLOUD_KEY = Buffer.from('c2Jfc2VjcmV0XzN2aHd4TXo3VVlYdXlwSXE5bkkyUkFfbEpiYjFaN04=', 'base64').toString('ascii');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_secret_3vhwx'))
  ? process.env.SUPABASE_SERVICE_ROLE_KEY
  : CLOUD_KEY;

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Fallback in-memory cache for ResultIQ model
let inMemoryStore: {
  teachers?: any[];
  classes?: any[];
  students?: any[];
  subjectGrades?: any[];
  branding?: any;
  license?: any;
  teacherPins?: Record<string, string>;
  parentPasswords?: Record<string, string>;
  adminPasscode?: string;
  vendorPasscode?: string;
} = {
  teachers: [],
  classes: [],
  students: [],
  subjectGrades: [],
  branding: null,
  license: null,
  teacherPins: {},
  parentPasswords: {},
  adminPasscode: 'admin123',
  vendorPasscode: 'vendor2026',
};

async function getCloudStore() {
  try {
    // 1. Try fetching primary result_iq_cloud_store record
    let res = await fetch(`${SUPABASE_URL}/rest/v1/broadcasts?title=eq.result_iq_cloud_store&select=id,attachment_data&limit=1`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      cache: 'no-store',
    });

    // 2. Fallback to attend_iq_cloud_store if result_iq record doesn't exist yet
    if (!res.ok || (res.ok && (await res.clone().json()).length === 0)) {
      res = await fetch(`${SUPABASE_URL}/rest/v1/broadcasts?title=eq.attend_iq_cloud_store&select=id,attachment_data&limit=1`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        cache: 'no-store',
      });
    }

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].attachment_data) {
        try {
          const raw = data[0].attachment_data;
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          inMemoryStore = {
            ...inMemoryStore,
            ...parsed,
            teacherPins: { ...(inMemoryStore.teacherPins || {}), ...(parsed.teacherPins || {}) },
          };
          return inMemoryStore;
        } catch (err) {
          console.error('Error parsing ResultIQ cloud store JSON:', err);
        }
      }
    }
  } catch (err) {
    console.error('Error fetching from Supabase cloud store:', err);
  }
  return inMemoryStore;
}

async function saveCloudStore(updates: Record<string, any>) {
  const current = await getCloudStore();
  const merged = {
    ...current,
    ...updates,
    teacherPins: {
      ...(current.teacherPins || {}),
      ...(updates.teacherPins || {}),
    },
    parentPasswords: {
      ...(current.parentPasswords || {}),
      ...(updates.parentPasswords || {}),
    },
  };
  inMemoryStore = merged;

  const payload = {
    attachment_data: JSON.stringify(merged),
    updated_at: new Date().toISOString(),
  };

  try {
    // Upsert into result_iq_cloud_store in Supabase
    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/broadcasts?title=eq.result_iq_cloud_store`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!patchRes.ok) {
      // If not present, create it
      await fetch(`${SUPABASE_URL}/rest/v1/broadcasts`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: 'a0000000-0000-0000-0000-000000000001',
          type: 'announcement',
          recipient_id: 'all',
          title: 'result_iq_cloud_store',
          message: 'Official ResultIQ Cloud Store Record for Terminal Academic Registry',
          ...payload,
        }),
      });
    }

    // Also mirror to attend_iq_cloud_store for seamless backward compatibility
    await fetch(`${SUPABASE_URL}/rest/v1/broadcasts?title=eq.attend_iq_cloud_store`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch (err) {
    console.error('Error persisting ResultIQ model to Supabase cloud store:', err);
  }

  return merged;
}

export async function GET() {
  const data = await getCloudStore();
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const updated = await saveCloudStore(body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error in /api/sync POST:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
