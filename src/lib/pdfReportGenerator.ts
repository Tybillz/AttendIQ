import { Student, ClassSection, SubjectGradeRecord, AttendanceSession } from '@/types/attendance';
import { getUnifiedAcademicReport } from './academicCalculations';
import { getSchoolBranding, SchoolBranding } from './licensing';

async function getJsPDFWithAutoTable(): Promise<any> {
  if (typeof window === 'undefined') return null;

  if ((window as any).jspdf?.jsPDF) {
    return (window as any).jspdf.jsPDF;
  }

  return new Promise((resolve, reject) => {
    const s1 = document.createElement('script');
    s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s1.onload = () => {
      const s2 = document.createElement('script');
      s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
      s2.onload = () => {
        resolve((window as any).jspdf.jsPDF);
      };
      s2.onerror = reject;
      document.head.appendChild(s2);
    };
    s1.onerror = reject;
    document.head.appendChild(s1);
  });
}

// Convert image URL to Base64 for embedding directly inside jsPDF
async function getBase64Image(url?: string): Promise<string | null> {
  if (!url || typeof window === 'undefined') return null;
  if (url.startsWith('data:image')) return url;

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 120;
          canvas.height = img.naturalHeight || img.height || 120;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
            return;
          }
        } catch (e) {
          console.warn('Canvas export error:', e);
        }
        resolve(null);
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

// Draw the official School Crest on the top header banner
function drawHeaderCrest(
  doc: any,
  x: number,
  y: number,
  size: number,
  branding: SchoolBranding,
  logoBase64: string | null
) {
  if (logoBase64) {
    // White rounded card background for high contrast on the dark banner
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, size, size, 2.5, 2.5, 'F');
    try {
      doc.addImage(logoBase64, 'PNG', x + 1.2, y + 1.2, size - 2.4, size - 2.4);
    } catch {
      // Fallback to vector crest if image render fails
      drawVectorCrest(doc, x, y, size, branding);
      return;
    }
    // Gold outer frame border
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, size, size, 2.5, 2.5, 'D');
  } else {
    drawVectorCrest(doc, x, y, size, branding);
  }
}

// High-resolution regal Institutional Vector Crest (rendered with pure vector lines)
function drawVectorCrest(doc: any, x: number, y: number, size: number, branding: SchoolBranding) {
  const monogram = (branding.shortName || branding.schoolName || 'IISS')
    .split(/\s+/)
    .map((w: string) => w[0])
    .join('')
    .slice(0, 4)
    .toUpperCase();

  // Outer navy crest shield
  doc.setFillColor(30, 41, 59);
  doc.setDrawColor(245, 158, 11); // Gold rim
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, size, size, 3, 3, 'FD');

  // Inner gold border
  doc.setDrawColor(251, 191, 36);
  doc.setLineWidth(0.2);
  doc.roundedRect(x + 1.2, y + 1.2, size - 2.4, size - 2.4, 2, 2, 'D');

  // Crest star
  doc.setTextColor(251, 191, 36);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('★', x + size / 2, y + 6.5, { align: 'center' });

  // Monogram initials
  doc.setFontSize(9.5);
  doc.text(monogram, x + size / 2, y + 13.5, { align: 'center' });

  // Bottom gold ribbon banner
  doc.setFillColor(245, 158, 11);
  doc.roundedRect(x + 2.5, y + 16, size - 5, 4.5, 1, 1, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.text('CREST', x + size / 2, y + 19.3, { align: 'center' });
}

// Draw Symmetrical Official Seal on the right side of the header banner
function drawHeaderSeal(doc: any, x: number, y: number, radius: number) {
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.4);
  doc.circle(x, y, radius, 'S');
  doc.setLineWidth(0.2);
  doc.circle(x, y, radius - 1.5, 'S');

  doc.setTextColor(251, 191, 36);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.text('OFFICIAL', x, y - 2.5, { align: 'center' });
  doc.setFontSize(6.5);
  doc.text('★ SEAL ★', x, y + 0.6, { align: 'center' });
  doc.setFontSize(4.5);
  doc.text('VERIFIED', x, y + 3.6, { align: 'center' });
}

// Anti-Criminality Security Watermark (Translucent & Visible yet Non-Obstructive)
function drawAntiTamperWatermark(
  doc: any,
  pageWidth: number,
  pageHeight: number,
  branding: SchoolBranding,
  rollNumber: string,
  logoBase64: string | null
) {
  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2 + 8;
  const hasGState = typeof doc.saveGraphicsState === 'function' && typeof doc.GState === 'function';

  if (hasGState) {
    doc.saveGraphicsState();
    // 7.5% opacity makes it clearly visible across the document while preserving complete legibility of scores
    doc.setGState(new doc.GState({ opacity: 0.075 }));
  }

  // Soft Indigo/Slate security tint
  doc.setTextColor(79, 70, 229);
  doc.setDrawColor(79, 70, 229);

  // 1. Concentric Anti-Forgery Security Rings
  doc.setLineWidth(0.5);
  doc.circle(centerX, centerY, 54, 'S');
  doc.setLineWidth(0.2);
  doc.circle(centerX, centerY, 48, 'S');
  doc.setLineWidth(0.4);
  doc.circle(centerX, centerY, 32, 'S');

  // 2. Central Monogram / School Emblem
  const monogram = (branding.shortName || branding.schoolName || 'IISS')
    .split(/\s+/)
    .map((w: string) => w[0])
    .join('')
    .slice(0, 4)
    .toUpperCase();

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', centerX - 18, centerY - 18, 36, 36);
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(36);
      doc.text(monogram, centerX, centerY + 4, { align: 'center' });
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(36);
    doc.text(monogram, centerX, centerY + 4, { align: 'center' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('★ OFFICIAL ACADEMIC DOSSIER ★', centerX, centerY - 14, { align: 'center' });
  doc.text('AUTHENTIC INSTITUTIONAL RECORD', centerX, centerY + 18, { align: 'center' });

  // 3. Diagonal Anti-Criminality Security Banners (Angled across the sheet)
  doc.setFontSize(13);
  doc.text(
    `${branding.schoolName.toUpperCase()} • OFFICIAL RESULT • DO NOT ALTER`,
    centerX,
    centerY - 58,
    { align: 'center', angle: -32 }
  );

  doc.setFontSize(11);
  doc.text(
    `AUTHENTIC RECORD • ANTI-TAMPER SECURE • CLASS ROLL NO: ${rollNumber}`,
    centerX,
    centerY + 68,
    { align: 'center', angle: -32 }
  );

  if (hasGState) {
    doc.restoreGraphicsState();
  }
}

export async function downloadStudentReportCardPDF(
  student: Student,
  classSection?: ClassSection
): Promise<void> {
  const JsPDFClass = await getJsPDFWithAutoTable();
  if (!JsPDFClass) return;

  const report = getUnifiedAcademicReport(student, classSection?.name, classSection);

  const doc = new JsPDFClass({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const accentColor: [number, number, number] = [79, 70, 229]; // Indigo 600
  const branding = getSchoolBranding();

  // Load logo as base64 if provided
  const logoBase64 = await getBase64Image(branding.logoUrl);

  // 1. School Header Banner (Spacious 32mm dark blue space at the top)
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 32, 'F');

  // 1A. Draw School Crest on the left side of the blue dark space
  drawHeaderCrest(doc, 12, 4.5, 23, branding, logoBase64);

  // 1B. Draw Symmetrical Verification Seal on the right side of the blue banner
  drawHeaderSeal(doc, pageWidth - 23.5, 16, 10);

  // 1C. Centered School Information
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.text(branding.schoolName.toUpperCase(), pageWidth / 2, 11.5, { align: 'center' });

  doc.setTextColor(251, 191, 36); // Regal Gold Motto
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(branding.motto, pageWidth / 2, 17.5, { align: 'center' });

  doc.setTextColor(226, 232, 240); // Clean Slate
  doc.setFontSize(7.5);
  doc.text(`${branding.address} • Tel: ${branding.contactPhone}`, pageWidth / 2, 23, { align: 'center' });

  // 2. Title Strip
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 32, pageWidth, 9, 'F');
  doc.setTextColor(...accentColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('OFFICIAL CONTINUOUS ASSESSMENT & ATTENDANCE TERMINAL DOSSIER', pageWidth / 2, 38, { align: 'center' });

  // 3. Render Anti-Criminality Transparent Watermark Layer
  drawAntiTamperWatermark(doc, pageWidth, pageHeight, branding, report.student.rollNumber, logoBase64);

  // 4. Pupil Bio Data Card
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(12, 44, pageWidth - 24, 30, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text(`PUPIL NAME: ${report.student.name.toUpperCase()}`, 16, 51);
  doc.text(`CLASS ROLL NO: ${report.student.rollNumber}`, 16, 58);
  doc.text(`CLASS: ${report.className}`, 16, 65);
  doc.text(`DATE ISSUED: ${new Date().toLocaleDateString('en-GB')}`, 16, 71);

  doc.text(`GENDER: ${report.student.gender || 'Not Specified'}`, 110, 51);
  doc.text(`ACADEMIC SESSION: 2026/2027`, 110, 58);
  doc.text(`TERM: First Term`, 110, 65);
  doc.text(`PARENT PHONE: ${report.student.parentPhone || 'N/A'}`, 110, 71);

  // 5. Attendance Summary Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, 77, pageWidth - 24, 16, 1.5, 1.5, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`TIMES SCHOOL OPENED: ${report.attendance.totalDays}`, 16, 84);
  doc.text(`TIMES PRESENT: ${report.attendance.totalPresent}`, 75, 84);
  doc.text(`TIMES ABSENT: ${report.attendance.totalAbsent}`, 125, 84);
  doc.text(`ATTENDANCE RATE: ${report.attendance.attendanceRateFormatted}`, 165, 84);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Punctuality Status: ${
      report.attendance.attendanceRate >= 85
        ? 'Exemplary Attendance'
        : report.attendance.attendanceRate >= 70
        ? 'Moderate Attendance'
        : 'Requires Administrative Attention'
    }`,
    16,
    89
  );

  // 6. Academic Evaluation Table
  const tableRows = report.subjects.map((g) => [
    g.subject,
    g.ca1.toString(),
    g.ca2.toString(),
    g.assignment.toString(),
    g.exam.toString(),
    g.total.toString(),
    g.grade,
    g.remark,
  ]);

  (doc as any).autoTable({
    startY: 96,
    head: [
      [
        'SUBJECT TITLE',
        'CA 1\n(15)',
        'CA 2\n(15)',
        'ASSIGN\n(10)',
        'EXAM\n(60)',
        'TOTAL\n(100)',
        'GRADE',
        'TEACHER REMARK',
      ],
    ],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: accentColor,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 46 },
      1: { halign: 'center', cellWidth: 14 },
      2: { halign: 'center', cellWidth: 14 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
      6: { halign: 'center', fontStyle: 'bold', cellWidth: 16 },
      7: { cellWidth: 46 },
    },
    margin: { left: 12, right: 12 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 160;

  // 7. Overall Summary Strip
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(12, finalY + 4, pageWidth - 24, 12, 1.5, 1.5, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(`TERM OVERALL TOTAL: ${report.grandTotal} / ${report.maxPossible}`, 16, finalY + 11.5);
  doc.text(`AVERAGE SCORE: ${report.termAverage}%`, 85, finalY + 11.5);
  doc.text(`CLASS RANKING: ${report.classPositionString} Pupils`, 140, finalY + 11.5);

  // 8. Remarks and Endorsements
  doc.roundedRect(12, finalY + 19, pageWidth - 24, 32, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('FORM TEACHER REMARK:', 16, finalY + 24.5);
  doc.setFont('helvetica', 'italic');
  const teacherLines = doc.splitTextToSize(report.teacherRemark, pageWidth - 32);
  doc.text(teacherLines.slice(0, 2), 16, finalY + 29);

  doc.setFont('helvetica', 'bold');
  doc.text('PRINCIPAL ENDORSEMENT:', 16, finalY + 38);
  doc.setFont('helvetica', 'italic');
  const principalLines = doc.splitTextToSize(report.principalRecommendation, pageWidth - 32);
  doc.text(principalLines.slice(0, 2), 16, finalY + 42.5);

  // 9. Signature Blocks
  const sigY = finalY + 55;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  doc.line(16, sigY + 8, 70, sigY + 8);
  doc.text('Form Teacher Signature & Date', 24, sigY + 12);

  doc.line(125, sigY + 8, 185, sigY + 8);
  doc.text('Principal Signature & Official Stamp', 130, sigY + 12);

  // 10. Anti-Fraud Security Fingerprint Footer
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `ANTI-FRAUD SECURITY INTEGRITY: ATIQ-SEC-${student.rollNumber.replace(/[^A-Za-z0-9]/g, '')}-${Date.now().toString(36).toUpperCase()} • OFFICIAL ACCREDITED TRANSCRIPT • TAMPER-EVIDENT`,
    pageWidth / 2,
    282,
    { align: 'center' }
  );

  doc.setFontSize(6.5);
  doc.text(
    `Generated digitally via AttendIQ System • ${branding.schoolName} • Ref: ${branding.shortName.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase()}-EVAL-${Date.now().toString().slice(-6)}`,
    pageWidth / 2,
    286,
    { align: 'center' }
  );

  const cleanName = student.name.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanSchool = branding.shortName.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`${cleanSchool}_ReportCard_${cleanName}_2026.pdf`);
}

export async function downloadClassAttendanceDossierPDF(
  classSection: ClassSection,
  students: Student[],
  session?: AttendanceSession,
  dateStr?: string
): Promise<void> {
  const JsPDFClass = await getJsPDFWithAutoTable();
  if (!JsPDFClass) return;

  const doc = new JsPDFClass({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const primaryColor: [number, number, number] = [15, 23, 42];
  const branding = getSchoolBranding();

  const logoBase64 = await getBase64Image(branding.logoUrl);

  // Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 26, 'F');

  // School crest on the left of header
  drawHeaderCrest(doc, 10, 3, 20, branding, logoBase64);

  // School Information
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`${branding.schoolName.toUpperCase()} - OFFICIAL CLASS REGISTER`, pageWidth / 2, 10, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Class: ${classSection.name} • Form Teacher: ${classSection.teacherName} • Date: ${dateStr || new Date().toISOString().split('T')[0]}`, pageWidth / 2, 17, { align: 'center' });

  // Anti-tamper watermark on class register
  drawAntiTamperWatermark(doc, pageWidth, pageHeight, branding, classSection.name, logoBase64);

  const rows = students.map((s, idx) => {
    const rec = session?.records[s.id];
    const status = rec?.status ? rec.status.toUpperCase() : 'UNMARKED';
    const time = rec?.markedAt || '--:--';
    const note = rec?.note || '-';
    return [(idx + 1).toString(), s.rollNumber, s.name, status, time, s.parentPhone, note];
  });

  (doc as any).autoTable({
    startY: 30,
    head: [['#', 'ROLL NO', 'PUPIL NAME', 'STATUS', 'TIME', 'PARENT CONTACT', 'NOTES']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 20 },
      2: { fontStyle: 'bold', cellWidth: 45 },
      3: { halign: 'center', cellWidth: 22 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'center', cellWidth: 32 },
    },
    margin: { left: 10, right: 10 },
  });

  const cleanClassName = classSection.name.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanSchool = branding.shortName.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`${cleanSchool}_Register_${cleanClassName}_${dateStr || 'Today'}.pdf`);
}
