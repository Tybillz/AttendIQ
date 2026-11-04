import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Default calibrated coordinates for Apex Crest Academy (Abuja, Nigeria)
const FALLBACK_PERIMETER = {
  schoolName: 'Innovative International Secondary School',
  schoolLat: 9.121251,
  schoolLng: 7.384811,
  radiusMeters: 250,
  resumptionTime: '08:00 AM',
  closingTime: '02:30 PM',
  portalWebUrl: 'https://attendiq.vercel.app',
};

// In-memory serverless cache
let currentServerConfig = { ...FALLBACK_PERIMETER };

const SUPABASE_URL = 'https://zjayceqhoapcapsvevrq.supabase.co';
const CLOUD_KEY = Buffer.from('c2Jfc2VjcmV0XzN2aHd4TXo3VVlYdXlwSXE5bkkyUkFfbEpiYjFaN04=', 'base64').toString('ascii');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_secret_3vhwx'))
  ? process.env.SUPABASE_SERVICE_ROLE_KEY
  : CLOUD_KEY;

async function fetchFromSupabase() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/branches?select=name,latitude,longitude,geofence_radius_meters&limit=1`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'User-Agent': 'AttendIQ-Server',
      },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && typeof data[0].latitude === 'number') {
        currentServerConfig.schoolLat = data[0].latitude;
        currentServerConfig.schoolLng = data[0].longitude;
        currentServerConfig.radiusMeters = data[0].geofence_radius_meters || 250;
        if (data[0].name) currentServerConfig.schoolName = data[0].name;
      }
    }
  } catch (err) {
    console.error('Error fetching perimeter from Supabase:', err);
  }
}

export async function GET() {
  await fetchFromSupabase();
  return NextResponse.json(currentServerConfig, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.schoolLat === 'number' && typeof body.schoolLng === 'number') {
      currentServerConfig = {
        ...currentServerConfig,
        ...body,
      };

      // Persist to Supabase so it survives across serverless cold starts
      try {
        const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/branches?id=eq.c0000000-0000-0000-0000-000000000001`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'User-Agent': 'AttendIQ-Server',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            name: body.schoolName || currentServerConfig.schoolName,
            latitude: body.schoolLat,
            longitude: body.schoolLng,
            geofence_radius_meters: body.radiusMeters || 250,
          }),
          cache: 'no-store',
        });
        if (patchRes.ok) {
          const patched = await patchRes.json();
          if (Array.isArray(patched) && patched.length > 0) {
            currentServerConfig.schoolLat = patched[0].latitude;
            currentServerConfig.schoolLng = patched[0].longitude;
            currentServerConfig.radiusMeters = patched[0].geofence_radius_meters;
          }
        }
      } catch (e) {
        console.error('Failed to sync perimeter update to Supabase:', e);
      }

      return NextResponse.json({ success: true, config: currentServerConfig }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'CDN-Cache-Control': 'no-store',
          'Vercel-CDN-Cache-Control': 'no-store',
        },
      });
    }
    return NextResponse.json({ success: false, error: 'Invalid coordinates' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update perimeter' }, { status: 500 });
  }
}
