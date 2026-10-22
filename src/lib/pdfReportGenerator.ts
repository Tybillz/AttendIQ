import { Student, ClassSection, SubjectGradeRecord, AttendanceSession } from '@/types/attendance';
import { getUnifiedAcademicReport } from './academicCalculations';

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
  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const accentColor: [number, number, number] = [79, 70, 229]; // Indigo 600

  // 1. School Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('APEX CREST ACADEMY', pageWidth / 2, 11, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Knowledge, Character, and Technological Excellence', pageWidth / 2, 16, { align: 'center' });
  doc.text('Plot 1024, Diplomatic Zone, Garki, Abuja, FCT, Nigeria • Tel: +234 809 112 3344', pageWidth / 2, 21, { align: 'center' });

  // Title Strip
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 28, pageWidth, 9, 'F');
  doc.setTextColor(...accentColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('OFFICIAL CONTINUOUS ASSESSMENT & ATTENDANCE TERMINAL DOSSIER', pageWidth / 2, 34, { align: 'center' });

  // 2. Pupil Bio Data Card
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(12, 41, pageWidth - 24, 30, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text(`PUPIL NAME: ${report.student.name.toUpperCase()}`, 16, 48);
  doc.text(`ADMISSION / ROLL NO: ${report.student.rollNumber}`, 16, 55);
  doc.text(`CLASS: ${report.className}`, 16, 62);

  doc.text(`GENDER: ${report.student.gender || 'Not Specified'}`, 110, 48);
  doc.text(`ACADEMIC SESSION: 2026/2027`, 110, 55);
  doc.text(`TERM: First Term`, 110, 62);

  doc.text(`PARENT PHONE: ${report.student.parentPhone || 'N/A'}`, 110, 68);
  doc.text(`DATE ISSUED: ${new Date().toLocaleDateString('en-GB')}`, 16, 68);

  // 3. Attendance Summary Box (Zero discrepancy, identical to profile card)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, 74, pageWidth - 24, 16, 1.5, 1.5, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`TIMES SCHOOL OPENED: ${report.attendance.totalDays}`, 16, 81);
  doc.text(`TIMES PRESENT: ${report.attendance.totalPresent}`, 75, 81);
  doc.text(`TIMES ABSENT: ${report.attendance.totalAbsent}`, 125, 81);
  doc.text(`ATTENDANCE RATE: ${report.attendance.attendanceRateFormatted}`, 165, 81);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Punctuality Status: ${report.attendance.attendanceRate >= 85 ? 'Exemplary Attendance' : report.attendance.attendanceRate >= 70 ? 'Moderate Attendance' : 'Requires Administrative Attention'}`, 16, 86);

  // 4. Academic Evaluation Table
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
    startY: 94,
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

  // 5. Overall Summary Strip
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(12, finalY + 4, pageWidth - 24, 12, 1.5, 1.5, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(`TERM OVERALL TOTAL: ${report.grandTotal} / ${report.maxPossible}`, 16, finalY + 11.5);
  doc.text(`AVERAGE SCORE: ${report.termAverage}%`, 85, finalY + 11.5);
  doc.text(`CLASS RANKING: ${report.classPositionString} Pupils`, 140, finalY + 11.5);

  // 6. Remarks and Endorsements
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

  // 7. Signature Blocks
  const sigY = finalY + 56;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  doc.line(16, sigY + 8, 70, sigY + 8);
  doc.text('Form Teacher Signature & Date', 24, sigY + 12);

  doc.line(125, sigY + 8, 185, sigY + 8);
  doc.text('Principal Signature & Official Stamp', 130, sigY + 12);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generated digitally via AttendIQ System • Apex Crest Academy • Ref: ACA-EVAL-${Date.now().toString().slice(-6)}`,
    pageWidth / 2,
    285,
    { align: 'center' }
  );

  const cleanName = student.name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`ApexCrest_ReportCard_${cleanName}_2026.pdf`);
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
  const primaryColor: [number, number, number] = [15, 23, 42];

  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('APEX CREST ACADEMY - OFFICIAL CLASS REGISTER', pageWidth / 2, 10, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Class: ${classSection.name} • Form Teacher: ${classSection.teacherName} • Date: ${dateStr || new Date().toISOString().split('T')[0]}`, pageWidth / 2, 17, { align: 'center' });

  const rows = students.map((s, idx) => {
    const rec = session?.records[s.id];
    const status = rec?.status ? rec.status.toUpperCase() : 'UNMARKED';
    const time = rec?.markedAt || '--:--';
    const note = rec?.note || '-';
    return [(idx + 1).toString(), s.rollNumber, s.name, status, time, s.parentPhone, note];
  });

  (doc as any).autoTable({
    startY: 28,
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
  doc.save(`ApexCrest_Register_${cleanClassName}_${dateStr || 'Today'}.pdf`);
}
