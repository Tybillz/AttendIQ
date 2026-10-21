import { NextResponse } from 'next/server';

// Default calibrated coordinates for Apex Crest Academy (Abuja, Nigeria)
const FALLBACK_PERIMETER = {
  schoolName: 'Apex Crest Academy',
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
const FALLBACK_KEY = Buffer.from('c2Jfc2VjcmV0XzN2aHd4TXo3VVlYdXlwSXE5bkkyUkFfbEpiYjFaN04=', 'base64').toString('ascii');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_KEY;

async function fetchFromSupabase() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/branches?select=name,latitude,longitude,geofence_radius_meters&limit=1`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      next: { revalidate: 10 },
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
  return NextResponse.json(currentServerConfig);
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
        await fetch(`${SUPABASE_URL}/rest/v1/branches?id=eq.c0000000-0000-0000-0000-000000000001`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: body.schoolName || currentServerConfig.schoolName,
            latitude: body.schoolLat,
            longitude: body.schoolLng,
            geofence_radius_meters: body.radiusMeters || 250,
          }),
        });
      } catch (e) {
        console.error('Failed to sync perimeter update to Supabase:', e);
      }

      return NextResponse.json({ success: true, config: currentServerConfig });
    }
    return NextResponse.json({ success: false, error: 'Invalid coordinates' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update perimeter' }, { status: 500 });
  }
}
