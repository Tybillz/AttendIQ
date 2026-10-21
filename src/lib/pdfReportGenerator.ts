import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student, ClassSection, SubjectGradeRecord, AttendanceSession } from '@/types/attendance';

export function downloadStudentReportCardPDF(
  student: Student,
  classSection?: ClassSection,
  grades?: SubjectGradeRecord[]
): void {
  const doc = new jsPDF({
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

  // 2. Student & Class Details Grid
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(12, 41, pageWidth - 24, 26, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');

  // Left Column
  doc.text('PUPIL NAME:', 16, 47);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(student.name.toUpperCase(), 44, 47);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('ADMISSION NO:', 16, 53);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(student.rollNumber || 'ACA-2026-08', 44, 53);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('CLASS / SECTION:', 16, 59);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(classSection?.name || 'Class Section', 44, 59);

  // Right Column
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('ACADEMIC TERM:', 115, 47);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text('First Term 2026/2027 Session', 148, 47);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('CLASS TEACHER:', 115, 53);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(classSection?.teacherName || 'Assigned Form Teacher', 148, 53);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('PARENT / GUARDIAN:', 115, 59);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${student.parentName} (${student.parentPhone})`, 148, 59);

  // 3. Attendance Performance Summary Box
  const totalDays = (student.totalPresent || 0) + (student.totalAbsent || 0);
  const attRate = totalDays > 0 ? Math.round(((student.totalPresent || 0) / totalDays) * 100) : 100;

  doc.roundedRect(12, 70, pageWidth - 24, 16, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text('ATTENDANCE DISCIPLINE RECORD:', 16, 76);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Days Present: ${student.totalPresent || 0}`, 75, 76);
  doc.text(`Days Absent: ${student.totalAbsent || 0}`, 115, 76);
  doc.text(`Consecutive Absences: ${student.consecutiveAbsences || 0}`, 150, 76);

  doc.setFont('helvetica', 'bold');
  const attStatus = attRate >= 90 ? 'EXCELLENT' : attRate >= 75 ? 'SATISFACTORY' : 'NEEDS IMPROVEMENT';
  doc.text(`Attendance Compliance: ${attRate}% (${attStatus})`, 16, 82);

  // 4. Academic Performance Table (Subject Continuous Assessment & Exam)
  const defaultSubjectGrades = [
    { subject: 'Mathematics', ca1: 14, ca2: 13, assignment: 9, exam: 52, total: 88, grade: 'A', remark: 'Distinction' },
    { subject: 'English Language', ca1: 13, ca2: 14, assignment: 8, exam: 49, total: 84, grade: 'A', remark: 'Excellent' },
    { subject: 'Basic Science & Technology', ca1: 12, ca2: 13, assignment: 9, exam: 48, total: 82, grade: 'A', remark: 'Commendable' },
    { subject: 'Computer Studies / ICT', ca1: 15, ca2: 15, assignment: 10, exam: 55, total: 95, grade: 'A', remark: 'Outstanding' },
    { subject: 'Civic Education', ca1: 13, ca2: 12, assignment: 8, exam: 45, total: 78, grade: 'B', remark: 'Very Good' },
    { subject: 'Agricultural Science', ca1: 12, ca2: 11, assignment: 8, exam: 44, total: 75, grade: 'B', remark: 'Very Good' },
  ];

  const studentGrades = grades && grades.length > 0
    ? grades.map((g) => ({
        subject: g.subject,
        ca1: g.ca1,
        ca2: g.ca2,
        assignment: g.assignment,
        exam: g.exam,
        total: g.total,
        grade: g.grade,
        remark: g.remark,
      }))
    : defaultSubjectGrades;

  const tableRows = studentGrades.map((g) => [
    g.subject,
    g.ca1.toString(),
    g.ca2.toString(),
    g.assignment.toString(),
    g.exam.toString(),
    g.total.toString(),
    g.grade,
    g.remark,
  ]);

  const totalScore = studentGrades.reduce((sum, g) => sum + g.total, 0);
  const averageScore = Math.round(totalScore / studentGrades.length);

  autoTable(doc, {
    startY: 90,
    head: [['SUBJECT', 'CA 1 (15)', 'CA 2 (15)', 'PROJ (10)', 'EXAM (60)', 'TOTAL (100)', 'GRADE', 'REMARK']],
    body: tableRows,
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
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 50 },
      7: { halign: 'left' },
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
  doc.text(`TERM OVERALL TOTAL: ${totalScore} / ${studentGrades.length * 100}`, 16, finalY + 11.5);
  doc.text(`AVERAGE SCORE: ${averageScore}%`, 85, finalY + 11.5);
  doc.text(`CLASS RANKING: 2nd / 28 Pupils`, 140, finalY + 11.5);

  // 6. Remarks and Endorsements
  doc.roundedRect(12, finalY + 19, pageWidth - 24, 30, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('FORM TEACHER REMARK:', 16, finalY + 25);
  doc.setFont('helvetica', 'italic');
  doc.text(
    `${student.name.split(' ')[0]} is a highly disciplined, attentive pupil who demonstrates consistent academic curiosity and punctuality.`,
    16,
    finalY + 30
  );

  doc.setFont('helvetica', 'bold');
  doc.text('PRINCIPAL ENDORSEMENT:', 16, finalY + 38);
  doc.setFont('helvetica', 'italic');
  doc.text('Commendable terminal conduct and academic result. Keep up the high standard.', 16, finalY + 43);

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

export function downloadClassAttendanceDossierPDF(
  classSection: ClassSection,
  students: Student[],
  session?: AttendanceSession,
  dateStr?: string
): void {
  const doc = new jsPDF({
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

  autoTable(doc, {
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
