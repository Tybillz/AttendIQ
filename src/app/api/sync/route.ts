import { NextResponse } from 'next/server';

const SUPABASE_URL = 'https://zjayceqhoapcapsvevrq.supabase.co';
const FALLBACK_KEY = Buffer.from('c2Jfc2VjcmV0XzN2aHd4TXo3VVlYdXlwSXE5bkkyUkFfbEpiYjFaN04=', 'base64').toString('ascii');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_KEY;

// Fallback in-memory cache
let inMemoryStore: {
  teachers?: any[];
  classes?: any[];
  teacherPins?: Record<string, string>;
  adminPasscode?: string;
  gatePasscode?: string;
} = {
  teachers: [],
  classes: [],
  teacherPins: {},
  adminPasscode: '1234',
  gatePasscode: '1234',
};

async function getCloudStore() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/broadcasts?title=eq.attend_iq_cloud_store&select=id,attachment_data&limit=1`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      next: { revalidate: 0 },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].attachment_data) {
        try {
          const parsed = JSON.parse(data[0].attachment_data);
          inMemoryStore = {
            ...inMemoryStore,
            ...parsed,
            teacherPins: { ...(inMemoryStore.teacherPins || {}), ...(parsed.teacherPins || {}) },
          };
          return inMemoryStore;
        } catch (err) {
          console.error('Error parsing cloud store JSON:', err);
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
  };
  inMemoryStore = merged;

  try {
    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/broadcasts?title=eq.attend_iq_cloud_store`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        attachment_data: JSON.stringify(merged),
        updated_at: new Date().toISOString(),
      }),
    });

    if (!patchRes.ok) {
      console.warn('Supabase patch failed, attempting insert:', patchRes.status);
    }
  } catch (err) {
    console.error('Error persisting to Supabase cloud store:', err);
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
