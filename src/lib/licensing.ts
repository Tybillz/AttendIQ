/**
 * AttendIQ Multi-Tenant Whitelabeling & Commercial Licensing Engine
 * Supports custom school branding, term-based monetization, pupil quotas, and cryptographic license verification.
 */

export interface SchoolBranding {
  schoolName: string;
  shortName: string;
  branchLocation: string;
  motto: string;
  logoUrl?: string; // Image URL or base64
  crestEmoji?: string; // Default fallback icon
  principalName: string;
  vicePrincipalName?: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  website?: string;
  currentTerm: string;
  resumptionDate: string;
  updatedAt: string;
}

export type LicensePlanType = 'trial' | 'term' | 'annual' | 'enterprise';

export interface SchoolLicense {
  licenseKey: string;
  schoolName: string; // Bound strictly to this school name
  planType: LicensePlanType;
  issuedAt: string; // ISO string
  validFrom: string; // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD
  maxPupils: number; // e.g. 250, 750, 99999
  maxStaff: number; // e.g. 25, 60, 99999
  features: string[];
  signature: string; // Cryptographic anti-tamper hash
  activatedAt?: string;
  vendorNotes?: string;
  isRevoked?: boolean;
  revokedAt?: string;
  revocationReason?: string;
}

export interface RevokedKeyEntry {
  key: string;
  reason: string;
  revokedAt: string;
  schoolName?: string;
}

export interface LicenseStatusResult {
  isValid: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean; // Within 14 days
  isRevoked?: boolean;
  revocationReason?: string;
  status: 'active' | 'expiring_soon' | 'expired' | 'unlicensed' | 'name_mismatch' | 'revoked';
  statusLabel: string;
  badgeColor: string;
  planName: string;
  daysRemaining: number;
  validUntilFormatted: string;
  schoolName: string;
  maxPupils: number;
  maxStaff: number;
  isWriteRestricted: boolean;
}

const STORAGE_KEYS = {
  BRANDING: 'attend_iq_school_branding_v1',
  LICENSE: 'attend_iq_active_license_v1',
  REVOCATION_BLACKLIST: 'attend_iq_revocation_blacklist_v1',
};

// Cryptographic secret salt for license signing (Known only to software vendor)
const VENDOR_SECRET_SALT = 'ATIQ_PRO_NIGERIA_SECURE_SALT_2026_X99';

// Default initial branding (Apex Crest Academy default)
export const DEFAULT_SCHOOL_BRANDING: SchoolBranding = {
  schoolName: 'Apex Crest Academy',
  shortName: 'Apex Crest',
  branchLocation: 'Abuja (FCT), Nigeria',
  motto: 'Excellence, Integrity & Academic Distinction',
  crestEmoji: '🎓',
  principalName: 'Mrs. Victoria Adebayo (M.Ed, TRCN)',
  vicePrincipalName: 'Mr. Chinedu Okonkwo (B.Sc, PGDE)',
  contactPhone: '+234 803 456 7890',
  contactEmail: 'admin@apexcrest.edu.ng',
  address: 'Plot 104, Diplomatic Crescent, Maitama Extension, Abuja',
  website: 'https://apexcrest.edu.ng',
  currentTerm: 'First Term (2026/2027 Session)',
  resumptionDate: 'Monday, 11th January 2027',
  updatedAt: new Date().toISOString(),
};

/**
 * Generate a deterministic anti-tamper signature for a license payload
 */
export function computeLicenseSignature(
  schoolName: string,
  planType: string,
  validUntil: string,
  maxPupils: number
): string {
  const normalizedSchool = schoolName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const data = `${normalizedSchool}|${planType}|${validUntil}|${maxPupils}|${VENDOR_SECRET_SALT}`;
  
  // Custom fast cryptographic 64-bit djb2-xor hash
  let hash1 = 5381;
  let hash2 = 52711;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1) ^ char;
    hash2 = ((hash2 << 5) + hash2) ^ (char * 31);
  }
  
  const part1 = Math.abs(hash1).toString(16).toUpperCase().padStart(4, '0').slice(-4);
  const part2 = Math.abs(hash2).toString(16).toUpperCase().padStart(4, '0').slice(-4);
  return `${part1}-${part2}`;
}

/**
 * Super Admin / Vendor Utility: Generate a valid, tamper-evident License Key
 */
export function generateSignedLicenseKey(
  schoolName: string,
  planType: LicensePlanType,
  durationMonths: number,
  maxPupils: number = 500,
  maxStaff: number = 50
): { licenseKey: string; license: SchoolLicense } {
  const now = new Date();
  const validFrom = now.toISOString().split('T')[0];
  
  const expiryDate = new Date(now);
  expiryDate.setDate(expiryDate.getDate() + Math.round(durationMonths * 30.5));
  const validUntil = expiryDate.toISOString().split('T')[0];
  
  const signature = computeLicenseSignature(schoolName, planType, validUntil, maxPupils);
  
  // Short acronym for school
  const schoolAcronym = schoolName
    .split(' ')
    .map((w) => w[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 4) || 'SCH';
  
  // Format: ATIQ-PLAN-ACRONYM-YYYYMMDD-SIGNATURE
  const dateTag = validUntil.replace(/-/g, '').slice(2); // e.g. "270115"
  const licenseKey = `ATIQ-${planType.toUpperCase()}-${schoolAcronym}-${dateTag}-${signature}`;
  
  const license: SchoolLicense = {
    licenseKey,
    schoolName: schoolName.trim(),
    planType,
    issuedAt: now.toISOString(),
    validFrom,
    validUntil,
    maxPupils,
    maxStaff,
    features: ['daily_roll_call', 'gps_anticheat', 'nerdc_gradebook', 'pdf_terminal_reports', 'whatsapp_safety_alerts'],
    signature,
    vendorNotes: `Licensed commercially by AttendIQ Platforms for ${durationMonths} month(s).`,
  };
  
  return { licenseKey, license };
}

/**
 * Convenience helper returning just the generated cryptographic key string
 */
export function generateLicenseKey(
  schoolName: string,
  planType: LicensePlanType,
  durationMonths: number,
  maxPupils: number = 500,
  maxStaff: number = 50
): string {
  return generateSignedLicenseKey(schoolName, planType, durationMonths, maxPupils, maxStaff).licenseKey;
}

/**
 * Verify if a raw license payload is mathematically authentic and untampered
 */
export function verifyLicenseSignature(license: SchoolLicense, targetSchoolName?: string): boolean {
  if (!license || !license.licenseKey || !license.validUntil || !license.signature) {
    return false;
  }
  
  // Check school name binding if target provided
  if (targetSchoolName) {
    const normA = license.schoolName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const normB = targetSchoolName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normA !== normB) return false;
  }
  
  const expectedSig = computeLicenseSignature(
    license.schoolName,
    license.planType,
    license.validUntil,
    license.maxPupils
  );
  
  return expectedSig === license.signature;
}

/**
 * Load active school branding
 */
export function getSchoolBranding(): SchoolBranding {
  if (typeof window === 'undefined') return DEFAULT_SCHOOL_BRANDING;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BRANDING);
    if (!raw) return DEFAULT_SCHOOL_BRANDING;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SCHOOL_BRANDING, ...parsed };
  } catch {
    return DEFAULT_SCHOOL_BRANDING;
  }
}

/**
 * Save school branding updates
 */
export function saveSchoolBranding(branding: Partial<SchoolBranding>): SchoolBranding {
  const current = getSchoolBranding();
  const updated: SchoolBranding = {
    ...current,
    ...branding,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEYS.BRANDING, JSON.stringify(updated));
      const perimeterRaw = localStorage.getItem('attend_iq_school_perimeter_v1');
      if (perimeterRaw) {
        try {
          const p = JSON.parse(perimeterRaw);
          p.schoolName = updated.schoolName;
          localStorage.setItem('attend_iq_school_perimeter_v1', JSON.stringify(p));
        } catch {}
      }
      window.dispatchEvent(new CustomEvent('attendiq:branding-updated', { detail: updated }));
    } catch (e) {
      console.error('Failed to save school branding', e);
    }
  }
  return updated;
}

/**
 * Load active school license from storage
 */
export function getSchoolLicense(): SchoolLicense | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LICENSE);
    if (!raw) {
      // Default to bundled 1-Year Commercial Enterprise License for default school
      const defaultLicense = generateSignedLicenseKey('Apex Crest Academy', 'annual', 12, 1000, 100).license;
      localStorage.setItem(STORAGE_KEYS.LICENSE, JSON.stringify(defaultLicense));
      return defaultLicense;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Activate or renew a school license
 */
export function activateLicenseKey(
  rawKey: string,
  targetSchoolName: string
): { success: boolean; message: string; license?: SchoolLicense } {
  try {
    const trimmedKey = rawKey.trim().toUpperCase();
    const blacklist = getRevocationBlacklist();
    const revokedRecord = blacklist.find((r) => r.key === trimmedKey);
    if (revokedRecord) {
      return {
        success: false,
        message: `Revocations Authority Notice: This license key was REVOKED by the software licensor (${revokedRecord.reason} on ${new Date(revokedRecord.revokedAt).toLocaleDateString()}). Activation denied.`,
      };
    }

    const parts = trimmedKey.split('-');
    
    if (parts.length < 5 || parts[0] !== 'ATIQ') {
      return {
        success: false,
        message: 'Invalid license key format. Authentic AttendIQ keys begin with "ATIQ-" followed by plan and signature.',
      };
    }
    
    const planType = parts[1].toLowerCase() as LicensePlanType;
    const dateStr = parts[3]; // e.g. "270115" -> 2027-01-15
    const sigPart = `${parts[4]}-${parts[5] || ''}`.replace(/-$/, '');
    
    // Parse date
    const year = 2000 + parseInt(dateStr.slice(0, 2), 10);
    const month = dateStr.slice(2, 4);
    const day = dateStr.slice(4, 6);
    const validUntil = `${year}-${month}-${day}`;
    
    // Determine quota from plan
    const maxPupils = planType === 'trial' ? 50 : planType === 'term' ? 500 : planType === 'annual' ? 1000 : 99999;
    const maxStaff = planType === 'trial' ? 10 : planType === 'term' ? 50 : 100;
    
    const candidateLicense: SchoolLicense = {
      licenseKey: trimmedKey,
      schoolName: targetSchoolName.trim(),
      planType,
      issuedAt: new Date().toISOString(),
      validFrom: new Date().toISOString().split('T')[0],
      validUntil,
      maxPupils,
      maxStaff,
      features: ['daily_roll_call', 'gps_anticheat', 'nerdc_gradebook', 'pdf_terminal_reports', 'whatsapp_safety_alerts'],
      signature: sigPart,
      activatedAt: new Date().toISOString(),
    };
    
    if (!verifyLicenseSignature(candidateLicense, targetSchoolName)) {
      return {
        success: false,
        message: `Cryptographic Signature Failed: This license key was not generated for "${targetSchoolName}" or the payload has been altered.`,
      };
    }
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.LICENSE, JSON.stringify(candidateLicense));
      window.dispatchEvent(new CustomEvent('attendiq:license-updated', { detail: candidateLicense }));
    }
    
    return {
      success: true,
      message: `License Activated Successfully! Enrolled in "${planType.toUpperCase()}" plan valid until ${validUntil}.`,
      license: candidateLicense,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `License Activation Error: ${err?.message || 'Invalid key'}`,
    };
  }
}

/**
 * Evaluates current license status, expiration countdown, and write restrictions
 */
export function getLicenseStatus(schoolName?: string): LicenseStatusResult {
  const branding = getSchoolBranding();
  const activeName = schoolName || branding.schoolName;
  const license = getSchoolLicense();
  
  if (!license) {
    return {
      isValid: false,
      isExpired: true,
      isExpiringSoon: false,
      status: 'unlicensed',
      statusLabel: 'Unlicensed System',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
      planName: 'Unlicensed',
      daysRemaining: 0,
      validUntilFormatted: 'None',
      schoolName: activeName,
      maxPupils: 0,
      maxStaff: 0,
      isWriteRestricted: true,
    };
  }
  
  // Verify binding
  const normA = license.schoolName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const normB = activeName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (normA !== normB) {
    return {
      isValid: false,
      isExpired: false,
      isExpiringSoon: false,
      status: 'name_mismatch',
      statusLabel: 'School Name Mismatch',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      planName: license.planType.toUpperCase(),
      daysRemaining: 0,
      validUntilFormatted: license.validUntil,
      schoolName: license.schoolName,
      maxPupils: license.maxPupils,
      maxStaff: license.maxStaff,
      isWriteRestricted: true,
    };
  }
  
  // Check Revocations Authority Kill-Switch
  const blacklist = getRevocationBlacklist();
  const isKeyBlacklisted = blacklist.some((r) => r.key === license.licenseKey.trim().toUpperCase());
  if (license.isRevoked || isKeyBlacklisted) {
    const reason =
      license.revocationReason ||
      blacklist.find((r) => r.key === license.licenseKey.trim().toUpperCase())?.reason ||
      'Commercial Rental Terminated / Suspended by Licensor';
    return {
      isValid: false,
      isExpired: true,
      isExpiringSoon: false,
      isRevoked: true,
      revocationReason: reason,
      status: 'revoked',
      statusLabel: 'LICENSE REVOKED BY LICENSOR',
      badgeColor: 'bg-rose-600 text-white border-rose-700 shadow-sm animate-pulse',
      planName: `${license.planType.toUpperCase()} (SUSPENDED / REVOKED)`,
      daysRemaining: 0,
      validUntilFormatted: license.validUntil,
      schoolName: license.schoolName,
      maxPupils: license.maxPupils,
      maxStaff: license.maxStaff,
      isWriteRestricted: true,
    };
  }

  // Calculate remaining days
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const expiry = new Date(license.validUntil);
  const diffTime = expiry.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const isExpired = daysRemaining <= 0 || todayStr > license.validUntil;
  const isExpiringSoon = !isExpired && daysRemaining <= 14;
  
  const planTitles: Record<LicensePlanType, string> = {
    trial: '14-Day Free Evaluation Pass',
    term: 'Commercial Academic Term License (4 Months)',
    annual: 'Annual Private School Enterprise (12 Months)',
    enterprise: 'Multi-Campus Unlimited Enterprise',
  };
  
  let status: 'active' | 'expiring_soon' | 'expired' = 'active';
  let statusLabel = `Active Subscription (${daysRemaining} days remaining)`;
  let badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
  
  if (isExpired) {
    status = 'expired';
    statusLabel = `License Expired on ${license.validUntil}`;
    badgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
  } else if (isExpiringSoon) {
    status = 'expiring_soon';
    statusLabel = `Expiring Soon (${daysRemaining} days left)`;
    badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
  }
  
  return {
    isValid: !isExpired,
    isExpired,
    isExpiringSoon,
    status,
    statusLabel,
    badgeColor,
    planName: planTitles[license.planType] || license.planType.toUpperCase(),
    daysRemaining: Math.max(0, daysRemaining),
    validUntilFormatted: license.validUntil,
    schoolName: license.schoolName,
    maxPupils: license.maxPupils,
    maxStaff: license.maxStaff,
    isWriteRestricted: isExpired,
  };
}

/**
 * Revocations Authority: Get list of revoked/blacklisted license keys
 */
export function getRevocationBlacklist(): RevokedKeyEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REVOCATION_BLACKLIST);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Revocations Authority: Blacklist a specific license key
 */
export function revokeLicenseByKey(
  licenseKey: string,
  reason: string = 'Payment Default / Agreement Terminated',
  schoolName?: string
): { success: boolean; message: string } {
  if (typeof window === 'undefined') return { success: false, message: 'Server context' };
  try {
    const cleanKey = licenseKey.trim().toUpperCase();
    const list = getRevocationBlacklist();
    if (!list.some((r) => r.key === cleanKey)) {
      list.unshift({
        key: cleanKey,
        reason,
        revokedAt: new Date().toISOString(),
        schoolName,
      });
      localStorage.setItem(STORAGE_KEYS.REVOCATION_BLACKLIST, JSON.stringify(list));
    }

    // If currently active license matches, revoke it immediately
    const active = getSchoolLicense();
    if (active && active.licenseKey.trim().toUpperCase() === cleanKey) {
      active.isRevoked = true;
      active.revokedAt = new Date().toISOString();
      active.revocationReason = reason;
      localStorage.setItem(STORAGE_KEYS.LICENSE, JSON.stringify(active));
      window.dispatchEvent(new CustomEvent('attendiq:license-updated', { detail: active }));
    }

    return {
      success: true,
      message: `License key ${cleanKey} revoked successfully. System access locked.`,
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Revocation failed' };
  }
}

/**
 * Revocations Authority: Kill-switch currently active license on this system
 */
export function revokeCurrentLicense(
  reason: string = 'Commercial Subscription Terminated by Software Licensor'
): { success: boolean; message: string } {
  if (typeof window === 'undefined') return { success: false, message: 'Server context' };
  const license = getSchoolLicense();
  if (!license) return { success: false, message: 'No active license found to revoke.' };
  return revokeLicenseByKey(license.licenseKey, reason, license.schoolName);
}

/**
 * Revocations Authority: Un-revoke and re-authorize a license key
 */
export function restoreRevokedLicense(
  licenseKey?: string
): { success: boolean; message: string } {
  if (typeof window === 'undefined') return { success: false, message: 'Server context' };
  try {
    const active = getSchoolLicense();
    const targetKey = (licenseKey || active?.licenseKey || '').trim().toUpperCase();
    if (!targetKey) return { success: false, message: 'No license key specified.' };

    const list = getRevocationBlacklist().filter((r) => r.key !== targetKey);
    localStorage.setItem(STORAGE_KEYS.REVOCATION_BLACKLIST, JSON.stringify(list));

    if (active && active.licenseKey.trim().toUpperCase() === targetKey) {
      delete active.isRevoked;
      delete active.revokedAt;
      delete active.revocationReason;
      localStorage.setItem(STORAGE_KEYS.LICENSE, JSON.stringify(active));
      window.dispatchEvent(new CustomEvent('attendiq:license-updated', { detail: active }));
    }

    return {
      success: true,
      message: `License key ${targetKey} restored and removed from revocation blacklist.`,
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Restoration failed' };
  }
}

