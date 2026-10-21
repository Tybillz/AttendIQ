import { TeacherClockRecord, SchoolPerimeterConfig, TeacherDeviceLock } from '@/types/attendance';

export const DEFAULT_PERIMETER_CONFIG: SchoolPerimeterConfig = {
  schoolName: 'AttendIQ Model Academy',
  schoolLat: 6.5244, // Default Lagos Coordinates (Customizable in Admin Console)
  schoolLng: 3.3792,
  radiusMeters: 250, // 250m school perimeter
  resumptionTime: '08:00 AM',
  closingTime: '02:30 PM',
  dailyEntranceCodeOverride: {},
};

const STORAGE_KEYS = {
  PERIMETER_CONFIG: 'attend_iq_school_perimeter_v1',
  TEACHER_CLOCK_RECORDS: 'attend_iq_teacher_clock_records_v1',
  DEVICE_LOCKS: 'attend_iq_device_locks_v1',
};

// Safe storage access
export function getPerimeterConfig(): SchoolPerimeterConfig {
  if (typeof window === 'undefined') return DEFAULT_PERIMETER_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PERIMETER_CONFIG);
    return raw ? { ...DEFAULT_PERIMETER_CONFIG, ...JSON.parse(raw) } : DEFAULT_PERIMETER_CONFIG;
  } catch {
    return DEFAULT_PERIMETER_CONFIG;
  }
}

export function savePerimeterConfig(config: SchoolPerimeterConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.PERIMETER_CONFIG, JSON.stringify(config));
    window.dispatchEvent(new Event('attend-iq-perimeter-update'));
  } catch (e) {
    console.error('Failed to save perimeter config', e);
  }
}

/**
 * Device Lock Management (Anti-Cheat)
 */
export const INITIAL_DEVICE_LOCKS: TeacherDeviceLock[] = [
  {
    teacherId: 't-101',
    teacherName: 'Mrs. Victoria Adebayo',
    deviceFingerprint: 'dev_hw_samsung_a14_adebayo',
    deviceName: 'Samsung Galaxy A14 (Android)',
    pairedAt: '2026-10-15 07:30 AM',
    hardwareSignature: { gpu: 'Mali-G52 MC2', cpuCores: 8, screenRes: '1080x2408@2.6' },
  },
  {
    teacherId: 't-102',
    teacherName: 'Mr. Chinedu Okonkwo',
    deviceFingerprint: 'dev_hw_tecno_spark10_okonkwo',
    deviceName: 'Tecno Spark 10 Pro (Android)',
    pairedAt: '2026-10-15 07:35 AM',
    hardwareSignature: { gpu: 'Mali-G52 2EEMC2', cpuCores: 8, screenRes: '1080x2460@2.5' },
  },
  {
    teacherId: 't-104',
    teacherName: 'Mrs. Folake Balogun',
    deviceFingerprint: 'dev_hw_iphone13_balogun',
    deviceName: 'Apple iPhone 13 (iOS)',
    pairedAt: '2026-10-15 07:40 AM',
    hardwareSignature: { gpu: 'Apple GPU', cpuCores: 6, screenRes: '390x844@3' },
  },
];

export function getDeviceLocks(): TeacherDeviceLock[] {
  if (typeof window === 'undefined') return INITIAL_DEVICE_LOCKS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DEVICE_LOCKS);
    return raw ? JSON.parse(raw) : INITIAL_DEVICE_LOCKS;
  } catch {
    return INITIAL_DEVICE_LOCKS;
  }
}

export function saveDeviceLocks(locks: TeacherDeviceLock[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.DEVICE_LOCKS, JSON.stringify(locks));
    window.dispatchEvent(new Event('attend-iq-device-locks-update'));
  } catch (e) {
    console.error('Failed to save device locks', e);
  }
}

export function getTeacherDeviceLock(teacherId: string): TeacherDeviceLock | undefined {
  const locks = getDeviceLocks();
  return locks.find((l) => l.teacherId === teacherId);
}

/**
 * Principal resets/unpairs teacher's locked device (when they buy a new phone)
 */
export function unpairTeacherDevice(teacherId: string): void {
  const locks = getDeviceLocks().filter((l) => l.teacherId !== teacherId);
  saveDeviceLocks(locks);
}

/**
 * Manually lock a teacher to a device
 */
export function pairTeacherDevice(lock: TeacherDeviceLock): void {
  const locks = getDeviceLocks().filter((l) => l.teacherId !== lock.teacherId);
  locks.push(lock);
  saveDeviceLocks(locks);
}

/**
 * Calculates deterministic 4-digit code based on date string (YYYY-MM-DD)
 * or returns custom override set by Principal.
 */
export function getDailyEntranceCode(dateStr: string, config?: SchoolPerimeterConfig): string {
  const currentConfig = config || getPerimeterConfig();
  if (currentConfig.dailyEntranceCodeOverride && currentConfig.dailyEntranceCodeOverride[dateStr]) {
    return currentConfig.dailyEntranceCodeOverride[dateStr];
  }

  // Deterministic daily hash from date string
  let hash = 5381;
  const str = `ATTENDIQ-NIGERIA-DAILY-${dateStr}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  const positive = Math.abs(hash);
  const code = (positive % 9000 + 1000).toString(); // Always 4 digits: 1000 - 9999
  return code;
}

/**
 * Sets a custom daily 4-digit code for a specific date (Principal override).
 */
export function setDailyEntranceCodeOverride(dateStr: string, code: string): void {
  const config = getPerimeterConfig();
  if (!config.dailyEntranceCodeOverride) config.dailyEntranceCodeOverride = {};
  config.dailyEntranceCodeOverride[dateStr] = code.trim();
  savePerimeterConfig(config);
}

/**
 * Calculates Haversine distance in meters between two coordinates.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Checks if a given coordinate is within school perimeter.
 */
export function checkSchoolPerimeter(
  userLat: number,
  userLng: number,
  config?: SchoolPerimeterConfig,
  accuracyMeters?: number
): { isInside: boolean; distanceMeters: number; radiusMeters: number } {
  const activeConfig = config || getPerimeterConfig();
  const distance = calculateHaversineDistance(
    userLat,
    userLng,
    activeConfig.schoolLat,
    activeConfig.schoolLng
  );

  // Add small accuracy tolerance margin for indoor Wi-Fi / cell bounce
  const accuracyMargin = accuracyMeters !== undefined && !isNaN(accuracyMeters)
    ? Math.min(Math.max(accuracyMeters, 0), 40)
    : 0;

  const effectiveRadius = activeConfig.radiusMeters + accuracyMargin;

  return {
    isInside: distance <= effectiveRadius,
    distanceMeters: distance,
    radiusMeters: activeConfig.radiusMeters,
  };
}

/**
 * Helper to determine if an arrival time is on-time or late.
 */
export function evaluateOnTime(
  clockInDate: Date,
  resumptionTimeStr: string = '08:00 AM'
): 'on_time' | 'late' {
  const parts = resumptionTimeStr.split(' ');
  const [hStr, mStr] = parts[0].split(':');
  let hour = parseInt(hStr, 10);
  const minutes = parseInt(mStr || '0', 10);
  const ampm = parts[1] || 'AM';

  if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
  if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;

  const cutoff = new Date(clockInDate);
  cutoff.setHours(hour, minutes, 0, 0);

  return clockInDate.getTime() <= cutoff.getTime() ? 'on_time' : 'late';
}

/**
 * Formats time into "07:42 AM"
 */
export function formatTimeAmPm(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minsStr = minutes < 10 ? `0${minutes}` : minutes;
  const hoursStr = hours < 10 ? `0${hours}` : hours;
  return `${hoursStr}:${minsStr} ${ampm}`;
}

export const INITIAL_TEACHER_RECORDS: TeacherClockRecord[] = [
  {
    id: 't-101-2026-10-20',
    teacherId: 't-101',
    teacherName: 'Mrs. Victoria Adebayo',
    className: 'Primary 4 - Gold',
    date: '2026-10-20',
    clockInTime: '07:38 AM',
    clockInTimestamp: new Date('2026-10-20T07:38:00').getTime(),
    status: 'on_time',
    distanceMeters: 32,
    isWithinPerimeter: true,
    codeUsed: '8492',
    deviceInfo: 'Samsung Galaxy A14 (Android)',
  },
  {
    id: 't-102-2026-10-20',
    teacherId: 't-102',
    teacherName: 'Mr. Chinedu Okonkwo',
    className: 'Primary 5 - Diamond',
    date: '2026-10-20',
    clockInTime: '08:14 AM',
    clockInTimestamp: new Date('2026-10-20T08:14:00').getTime(),
    status: 'late',
    distanceMeters: 55,
    isWithinPerimeter: true,
    codeUsed: '8492',
    deviceInfo: 'Tecno Spark 10 Pro (Android)',
  },
  {
    id: 't-103-2026-10-20',
    teacherId: 't-103',
    teacherName: 'Mal. Ibrahim Danladi',
    className: 'JSS 2 - Sapphire',
    date: '2026-10-20',
    status: 'not_clocked_in',
  },
  {
    id: 't-104-2026-10-20',
    teacherId: 't-104',
    teacherName: 'Mrs. Folake Balogun',
    className: 'SSS 1 - Science',
    date: '2026-10-20',
    clockInTime: '07:46 AM',
    clockInTimestamp: new Date('2026-10-20T07:46:00').getTime(),
    status: 'on_time',
    distanceMeters: 41,
    isWithinPerimeter: true,
    codeUsed: '8492',
    deviceInfo: 'Apple iPhone 13 (iOS)',
  },
];

export function getTeacherClockRecords(): TeacherClockRecord[] {
  if (typeof window === 'undefined') return INITIAL_TEACHER_RECORDS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TEACHER_CLOCK_RECORDS);
    return raw ? JSON.parse(raw) : INITIAL_TEACHER_RECORDS;
  } catch {
    return INITIAL_TEACHER_RECORDS;
  }
}

export function saveTeacherClockRecords(records: TeacherClockRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.TEACHER_CLOCK_RECORDS, JSON.stringify(records));
    window.dispatchEvent(new Event('attend-iq-teacher-clock-update'));
  } catch (e) {
    console.error('Failed to save teacher clock records', e);
  }
}

export function getTeacherRecordForDate(teacherId: string, dateStr: string): TeacherClockRecord | undefined {
  const records = getTeacherClockRecords();
  return records.find((r) => r.teacherId === teacherId && r.date === dateStr);
}

/**
 * Record a teacher clock-in with ANTI-CHEAT & HARDWARE DEVICE LOCKING
 */
export function clockInTeacher(
  teacherId: string,
  teacherName: string,
  className: string,
  dateStr: string,
  enteredCode: string,
  userCoords?: { lat: number; lng: number },
  accuracyMeters?: number,
  hardwareProfile?: {
    fingerprint: string;
    deviceName: string;
    gpuRenderer?: string;
    cpuCores?: number;
    screenRes?: string;
  }
): { success: boolean; message: string; record?: TeacherClockRecord } {
  const config = getPerimeterConfig();
  const expectedCode = getDailyEntranceCode(dateStr, config);

  // 1. Verify 4-digit Entrance Code
  if (enteredCode.trim() !== expectedCode.trim()) {
    return {
      success: false,
      message: `Invalid 4-digit entrance code. Please check today's code with the school administration.`,
    };
  }

  // 2. ANTI-CHEAT: HARDWARE DEVICE LOCKING
  if (hardwareProfile) {
    const existingLock = getTeacherDeviceLock(teacherId);

    if (!existingLock) {
      // First time clock-in: Automatically pair and lock this teacher to this physical device!
      pairTeacherDevice({
        teacherId,
        teacherName,
        deviceFingerprint: hardwareProfile.fingerprint,
        deviceName: hardwareProfile.deviceName,
        pairedAt: `${dateStr} ${formatTimeAmPm(new Date())}`,
        hardwareSignature: {
          gpu: hardwareProfile.gpuRenderer,
          cpuCores: hardwareProfile.cpuCores,
          screenRes: hardwareProfile.screenRes,
        },
      });
    } else {
      // Device already locked: Validate that this device matches the registered hardware fingerprint
      if (existingLock.deviceFingerprint !== hardwareProfile.fingerprint) {
        return {
          success: false,
          message: `🛑 Anti-Cheat Device Mismatch: Your account is locked to your registered device (${existingLock.deviceName}). You cannot clock in for yourself from another phone, nor can colleagues clock in for you. Please notify the Principal if you changed phones.`,
        };
      }
    }

    // 3. ANTI-CHEAT: SINGLE-DEVICE PER DAY CONSTRAINT
    // Ensure this physical device has not already clocked in another teacher today
    const allRecords = getTeacherClockRecords();
    const conflictRecord = allRecords.find(
      (r) =>
        r.date === dateStr &&
        r.clockInTime &&
        r.teacherId !== teacherId &&
        r.deviceInfo?.includes(hardwareProfile.fingerprint)
    );

    if (conflictRecord) {
      return {
        success: false,
        message: `🛑 Anti-Cheat Device Sharing Conflict: This smartphone has already clocked in ${conflictRecord.teacherName} today. A single device cannot be shared to clock in multiple teachers.`,
      };
    }
  }

  // 4. Verify School Perimeter Geofence
  let distanceMeters = 0;
  let isWithin = true;
  if (userCoords) {
    const perimeterCheck = checkSchoolPerimeter(
      userCoords.lat,
      userCoords.lng,
      config,
      accuracyMeters
    );
    distanceMeters = perimeterCheck.distanceMeters;
    isWithin = perimeterCheck.isInside;

    if (!isWithin) {
      return {
        success: false,
        message: `🛑 School Parameter Breach: You are ${distanceMeters} meters away from school grounds (Maximum allowed: ${config.radiusMeters}m). Clock-in is only accepted within school grounds.`,
      };
    }
  }

  const now = new Date();
  const formattedTime = formatTimeAmPm(now);
  const status = evaluateOnTime(now, config.resumptionTime);

  const records = getTeacherClockRecords();
  const existingIdx = records.findIndex((r) => r.teacherId === teacherId && r.date === dateStr);

  const deviceString = hardwareProfile
    ? `${hardwareProfile.deviceName} [${hardwareProfile.fingerprint}]`
    : typeof navigator !== 'undefined'
    ? navigator.userAgent.slice(0, 40)
    : undefined;

  const updatedRecord: TeacherClockRecord = {
    id: `${teacherId}-${dateStr}`,
    teacherId,
    teacherName,
    className,
    date: dateStr,
    clockInTime: formattedTime,
    clockInTimestamp: now.getTime(),
    status,
    distanceMeters,
    isWithinPerimeter: true,
    codeUsed: enteredCode.trim(),
    coords: userCoords,
    deviceInfo: deviceString,
  };

  if (existingIdx >= 0) {
    records[existingIdx] = { ...records[existingIdx], ...updatedRecord };
  } else {
    records.push(updatedRecord);
  }

  saveTeacherClockRecords(records);

  return {
    success: true,
    message: `Clock-In Recorded Successfully at ${formattedTime}! Status: ${status === 'on_time' ? 'On-Time' : 'Late Arrival'}.`,
    record: updatedRecord,
  };
}

/**
 * Record a teacher clock-out
 */
export function clockOutTeacher(
  teacherId: string,
  dateStr: string
): { success: boolean; message: string; record?: TeacherClockRecord } {
  const records = getTeacherClockRecords();
  const existing = records.find((r) => r.teacherId === teacherId && r.date === dateStr);

  if (!existing || !existing.clockInTimestamp) {
    return {
      success: false,
      message: 'You have not clocked in for today yet.',
    };
  }

  const now = new Date();
  const formattedTime = formatTimeAmPm(now);
  const diffMs = now.getTime() - existing.clockInTimestamp;
  const hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;

  existing.clockOutTime = formattedTime;
  existing.clockOutTimestamp = now.getTime();
  existing.hoursWorked = hoursWorked;

  saveTeacherClockRecords(records);

  return {
    success: true,
    message: `Clock-Out Recorded at ${formattedTime}! Total time logged: ${hoursWorked} hrs.`,
    record: existing,
  };
}
