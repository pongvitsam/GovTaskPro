/** Local mock DB for Vite DEV only (stripped from production bundle) */

const SEED_VERSION = 8;

function buildDemoSeed() {
  const NOW = Date.now();
  const HOUR = 3600000;
  const DAY = 86400000;
  const d = (n) => new Date(NOW + DAY * n).toISOString().slice(0, 10);
  const t = (n, h = 0) => new Date(NOW + DAY * n + HOUR * h).toISOString();
  const user = (row) => ({
    email: '',
    notifyEmail: false,
    notifyAssign: true,
    notifyStatus: true,
    notifyReview: row.role === 'Head' || row.role === 'Admin',
    notifyLineDefault: true,
    password: '1234',
    active: true,
    ...row,
  });

  return {
    _seedVersion: SEED_VERSION,
    users: [
      user({ id: 'admin', name: 'ผู้ดูแลระบบ', role: 'Admin', department: 'SYSTEM', division: 'ผู้ดูแลระบบ', username: 'admin', email: 'admin@demo.local', notifyEmail: true }),
      user({ id: 'u1', name: 'คุณบอส (หัวหน้า IT)', role: 'Head', department: 'IT', division: 'กองเทคโนโลยี', username: 'boss', email: 'boss@demo.local', notifyEmail: true }),
      user({ id: 'u2', name: 'สมชาย (พนักงาน IT)', role: 'Staff', department: 'IT', division: 'กองเทคโนโลยี', username: 'somchai', email: 'somchai@demo.local', notifyEmail: true }),
      user({ id: 'u3', name: 'สมหญิง (พนักงาน IT)', role: 'Staff', department: 'IT', division: 'กองเทคโนโลยี', username: 'somying' }),
      user({ id: 'u4', name: 'สมศักดิ์ (พนักงาน IT)', role: 'Staff', department: 'IT', division: 'กองเทคโนโลยี', username: 'somsak' }),
      user({ id: 'u5', name: 'คุณนภา (หัวหน้า HR)', role: 'Head', department: 'HR', division: 'กองบุคคล', username: 'hrhead', email: 'hr@demo.local', notifyEmail: true }),
      user({ id: 'u6', name: 'มาลี (พนักงาน HR)', role: 'Staff', department: 'HR', division: 'กองบุคคล', username: 'mali' }),
      user({ id: 'u7', name: 'คุณวิชัย (หัวหน้าการเงิน)', role: 'Head', department: 'Finance', division: 'กองงบประมาณ', username: 'finhead' }),
      user({ id: 'u8', name: 'วิชัย (พนักงานการเงิน)', role: 'Staff', department: 'Finance', division: 'กองงบประมาณ', username: 'wichai' }),
      user({ id: 'u9', name: 'บัญชีปิดใช้ (ตัวอย่าง)', role: 'Staff', department: 'IT', division: 'กองเทคโนโลยี', username: 'olduser', active: false }),
    ],
    projects: [
      { id: 'p1', name: 'พัฒนาระบบ Intranet กอง', description: 'อัปเกรดระบบภายใน (Next-Gen) — มีประวัติขยายสัญญา 2 ครั้ง', createdBy: 'u1', department: 'IT', createdAt: t(-14), startDate: d(-14), endDate: d(75) },
      { id: 'p2', name: 'กิจกรรม 5ส ประจำปี', description: 'จัดระเบียบอุปกรณ์และสายไฟ', createdBy: 'u1', department: 'IT', createdAt: t(-7), startDate: d(-7), endDate: d(21) },
      { id: 'p3', name: 'แผนซ่อมบำรุงประจำไตรมาส (Q3)', description: 'ตรวจสอบอุปกรณ์ Network ทั่วตึก — ขยายสัญญารออะไหล่', createdBy: 'u1', department: 'IT', createdAt: t(-3), startDate: d(-3), endDate: d(75) },
      { id: 'p4', name: 'ระบบประเมินผลประจำปี', description: 'โปรเจกต์แผนก HR — สิทธิ์แยกตามแผนก', createdBy: 'u5', department: 'HR', createdAt: t(-10), startDate: d(-10), endDate: d(30) },
      { id: 'p5', name: 'จัดทำงบประมาณปี 69', description: 'โปรเจกต์แผนก Finance', createdBy: 'u7', department: 'Finance', createdAt: t(-5), startDate: d(-5), endDate: d(40) },
    ],
    milestones: [
      { id: 'm1', projectId: 'p1', title: 'เก็บความต้องการ & ออกแบบ', description: 'ประชุมผู้ใช้และออกแบบ UI/DB', plannedStart: d(-14), plannedEnd: d(-7), weight: 20, sortOrder: 1, completed: true, completedAt: t(-6) },
      { id: 'm2', projectId: 'p1', title: 'พัฒนา Backend / API', description: 'Auth และบริการหลัก', plannedStart: d(-7), plannedEnd: d(7), weight: 30, sortOrder: 2, completed: false, completedAt: null },
      { id: 'm3', projectId: 'p1', title: 'พัฒนา Frontend', description: 'หน้าจอ Intranet', plannedStart: d(-3), plannedEnd: d(21), weight: 25, sortOrder: 3, completed: false, completedAt: null },
      { id: 'm4', projectId: 'p1', title: 'ทดสอบระบบ & อบรม', description: 'UAT และคู่มือ', plannedStart: d(21), plannedEnd: d(35), weight: 15, sortOrder: 4, completed: false, completedAt: null },
      { id: 'm5', projectId: 'p1', title: 'ขึ้นระบบจริง (Go-live)', description: 'Deploy และส่งมอบ', plannedStart: d(35), plannedEnd: d(45), weight: 10, sortOrder: 5, completed: false, completedAt: null },
      { id: 'm6', projectId: 'p2', title: 'สำรวจพื้นที่ & วางแผน', description: 'ตรวจตู้ Rack / สายไฟ', plannedStart: d(-7), plannedEnd: d(-3), weight: 30, sortOrder: 1, completed: true, completedAt: t(-2) },
      { id: 'm7', projectId: 'p2', title: 'ดำเนินการ 5ส', description: 'จัดระเบียบและติดป้าย', plannedStart: d(-2), plannedEnd: d(10), weight: 50, sortOrder: 2, completed: false, completedAt: null },
      { id: 'm8', projectId: 'p2', title: 'ตรวจรับ & สรุปผล', description: 'รายงานผลกิจกรรม', plannedStart: d(10), plannedEnd: d(21), weight: 20, sortOrder: 3, completed: false, completedAt: null },
      { id: 'm9', projectId: 'p3', title: 'สำรวจอุปกรณ์ Network', description: 'Inventory ชั้น 1-3', plannedStart: d(-3), plannedEnd: d(14), weight: 40, sortOrder: 1, completed: false, completedAt: null },
      { id: 'm10', projectId: 'p3', title: 'ซ่อมบำรุง / เปลี่ยนอะไหล่', description: 'UPS สายแลน AP', plannedStart: d(14), plannedEnd: d(40), weight: 40, sortOrder: 2, completed: false, completedAt: null },
      { id: 'm11', projectId: 'p3', title: 'ทดสอบ & ปิดงานไตรมาส', description: 'รายงาน Q3', plannedStart: d(40), plannedEnd: d(60), weight: 20, sortOrder: 3, completed: false, completedAt: null },
      { id: 'm12', projectId: 'p4', title: 'ออกแบบแบบฟอร์มประเมิน', description: 'KPI รายบุคคล', plannedStart: d(-10), plannedEnd: d(-2), weight: 40, sortOrder: 1, completed: true, completedAt: t(-2) },
      { id: 'm13', projectId: 'p4', title: 'ทดลองใช้งาน & อบรม', description: 'อบรมหัวหน้าแผนก', plannedStart: d(-1), plannedEnd: d(14), weight: 40, sortOrder: 2, completed: false, completedAt: null },
      { id: 'm14', projectId: 'p4', title: 'ปิดรอบประเมิน', description: 'สรุปคะแนน', plannedStart: d(14), plannedEnd: d(30), weight: 20, sortOrder: 3, completed: false, completedAt: null },
      { id: 'm15', projectId: 'p5', title: 'รวบรวมคำของบ', description: 'จากทุกกอง', plannedStart: d(-5), plannedEnd: d(7), weight: 50, sortOrder: 1, completed: false, completedAt: null },
      { id: 'm16', projectId: 'p5', title: 'ปรับยอด & อนุมัติ', description: 'เสนอ ผอ.', plannedStart: d(7), plannedEnd: d(40), weight: 50, sortOrder: 2, completed: false, completedAt: null },
    ],
    contractExtensions: [
      {
        id: 'ce_demo_1', projectId: 'p1', extensionNo: 1,
        fromDate: d(45), toDate: d(60), startMilestoneId: 'm4',
        reason: 'รอผลทดสอบ UAT และปรับแก้ตามข้อเสนอแนะของผู้ใช้งาน',
        approvalRef: 'บันทึกอนุมัติ IT-EXT-001/2569', approvedAt: d(-2),
        createdBy: 'u1', createdAt: t(-2), updatedAt: t(-2),
      },
      {
        id: 'ce_demo_2', projectId: 'p1', extensionNo: 2,
        fromDate: d(60), toDate: d(75), startMilestoneId: 'm5',
        reason: 'เลื่อนการขึ้นระบบจริงเพื่อรอการเชื่อมต่อระบบกลาง',
        approvalRef: 'บันทึกอนุมัติ IT-EXT-002/2569', approvedAt: d(-1),
        createdBy: 'u1', createdAt: t(-1), updatedAt: t(-1),
      },
      {
        id: 'ce_demo_3', projectId: 'p3', extensionNo: 1,
        fromDate: d(60), toDate: d(75), startMilestoneId: 'm11',
        reason: 'รออะไหล่ Network เพิ่มเติมจากผู้จำหน่าย',
        approvalRef: 'บันทึกอนุมัติ NET-EXT-001/2569', approvedAt: d(0),
        createdBy: 'u1', createdAt: t(0), updatedAt: t(0),
      },
    ],
    tasks: [
      { id: 1, projectId: 'p1', title: 'ออกแบบหน้า Login ใหม่', description: 'ใช้โทนสีองค์กร — สถานะเสร็จสิ้น', createdBy: 'u1', assignedTo: 'u2', status: 'Completed', type: 'Assigned', dueDate: t(-2), isRecurring: false, createdAt: t(-7), completedAt: t(-2) },
      { id: 2, projectId: 'p1', title: 'พัฒนาระบบ Backend (API)', description: 'กำลังทำ + มีคอมเมนต์', createdBy: 'u1', assignedTo: 'u2', status: 'In Progress', type: 'Assigned', dueDate: t(5), isRecurring: false, createdAt: t(-1) },
      { id: 3, projectId: 'p1', title: 'เตรียม Database Server', description: 'สร้างตารางข้อมูล', createdBy: 'u1', assignedTo: 'u3', status: 'Completed', type: 'Assigned', dueDate: t(-3), isRecurring: false, createdAt: t(-7), completedAt: t(-3) },
      { id: 4, projectId: null, title: 'รายงานประเมินความเสี่ยง IT (ตีกลับ)', description: 'ตัวอย่างส่งต่อ/ตีกลับ + ประวัติงาน', createdBy: 'u1', assignedTo: 'u4', status: 'In Progress', type: 'Assigned', dueDate: t(1), isRecurring: false, createdAt: t(-4) },
      { id: 5, projectId: 'p2', title: 'ทำความสะอาดตู้ Rack', description: 'รอตรวจโดยหัวหน้า', createdBy: 'u1', assignedTo: 'u3', status: 'Review', type: 'Assigned', dueDate: t(0), isRecurring: false, createdAt: t(-1) },
      { id: 6, projectId: null, title: 'สรุปรายงาน Helpdesk (รายสัปดาห์)', description: 'งาน Self + ทำซ้ำ', createdBy: 'u2', assignedTo: 'u2', status: 'In Progress', type: 'Self', dueDate: t(2), isRecurring: true, createdAt: t(0, -2) },
      { id: 7, projectId: 'p3', title: 'เปลี่ยนแบตเตอรี่ UPS ชั้น 2', description: 'งานค้าง / overdue', createdBy: 'u1', assignedTo: 'u4', status: 'Pending', type: 'Assigned', dueDate: t(-1), isRecurring: false, createdAt: t(-2) },
      { id: 8, projectId: 'p1', title: 'เขียนคู่มือผู้ใช้ Intranet', description: 'งานใหม่รอรับ', createdBy: 'u1', assignedTo: 'u2', status: 'Pending', type: 'Assigned', dueDate: t(3), isRecurring: false, createdAt: t(0, -1) },
      { id: 9, projectId: 'p4', title: 'อัปโหลดแบบฟอร์ม KPI', description: 'งาน HR — แผนกอื่นไม่เห็น', createdBy: 'u5', assignedTo: 'u6', status: 'In Progress', type: 'Assigned', dueDate: t(4), isRecurring: false, createdAt: t(-2) },
      { id: 10, projectId: 'p4', title: 'ตรวจสอบรายชื่อผู้ถูกประเมิน', description: 'รอตรวจหัวหน้า HR', createdBy: 'u5', assignedTo: 'u6', status: 'Review', type: 'Assigned', dueDate: t(0), isRecurring: false, createdAt: t(-1) },
      { id: 11, projectId: null, title: 'สรุปวันลาประจำเดือน', description: 'งาน Self ของ HR', createdBy: 'u6', assignedTo: 'u6', status: 'Pending', type: 'Self', dueDate: t(6), isRecurring: true, createdAt: t(-1) },
      { id: 12, projectId: 'p5', title: 'รวบรวมคำของบกอง IT', description: 'งาน Finance', createdBy: 'u7', assignedTo: 'u8', status: 'In Progress', type: 'Assigned', dueDate: t(7), isRecurring: false, createdAt: t(-3) },
      { id: 13, projectId: 'p5', title: 'ตรวจยอดงบประมาณคงเหลือ', description: 'เสร็จแล้ว', createdBy: 'u7', assignedTo: 'u8', status: 'Completed', type: 'Assigned', dueDate: t(-1), isRecurring: false, createdAt: t(-5), completedAt: t(-1) },
      { id: 14, projectId: null, title: 'ประชุมวางแผนงบ Q4', description: 'ปฏิทินสัปดาห์หน้า', createdBy: 'u7', assignedTo: 'u7', status: 'Pending', type: 'Self', dueDate: t(8), isRecurring: false, createdAt: t(-1) },
      { id: 15, projectId: 'p2', title: 'ติดป้ายอุปกรณ์ Rack', description: 'ปฏิทินวันนี้', createdBy: 'u1', assignedTo: 'u3', status: 'Pending', type: 'Assigned', dueDate: t(0), isRecurring: false, createdAt: t(-1) },
      { id: 16, projectId: 'p3', title: 'สำรวจ AP ชั้น 3', description: 'ปฏิทินอีก 10 วัน', createdBy: 'u1', assignedTo: 'u2', status: 'Pending', type: 'Assigned', dueDate: t(10), isRecurring: false, createdAt: t(-1) },
    ],
    taskLogs: [
      { id: 'l1', taskId: 4, timestamp: t(-4), actionBy: 'u1', actionType: 'Created', detail: 'มอบหมายงานให้ สมศักดิ์' },
      { id: 'l2', taskId: 4, timestamp: t(-2), actionBy: 'u4', actionType: 'Status Changed', detail: 'เปลี่ยนสถานะเป็น "รอตรวจ"' },
      { id: 'l3', taskId: 4, timestamp: t(0, -12), actionBy: 'u1', actionType: 'Status Changed', detail: 'ตีกลับให้แก้ไข - ขาดข้อมูลกราฟแนวโน้ม' },
      { id: 'l4', taskId: 5, timestamp: t(-1), actionBy: 'u1', actionType: 'Created', detail: 'มอบหมายงานให้ สมหญิง' },
      { id: 'l5', taskId: 5, timestamp: t(0, -2), actionBy: 'u3', actionType: 'Status Changed', detail: 'เปลี่ยนสถานะเป็น "รอตรวจ"' },
      { id: 'l6', taskId: 9, timestamp: t(-2), actionBy: 'u5', actionType: 'Created', detail: 'มอบหมายงานให้ มาลี' },
      { id: 'l7', taskId: 10, timestamp: t(0, -3), actionBy: 'u6', actionType: 'Status Changed', detail: 'ส่งตรวจหัวหน้า HR' },
      { id: 'l8', taskId: 12, timestamp: t(-3), actionBy: 'u7', actionType: 'Created', detail: 'มอบหมายงานให้ วิชัย' },
      { id: 'l9', taskId: 1, timestamp: t(-7), actionBy: 'u1', actionType: 'Created', detail: 'มอบหมายงานให้ สมชาย' },
      { id: 'l10', taskId: 1, timestamp: t(-2), actionBy: 'u2', actionType: 'Status Changed', detail: 'เปลี่ยนสถานะเป็น "เสร็จสิ้น" · วันเสร็จ 27 ก.ค. 2569' },
      { id: 'l11', taskId: 2, timestamp: t(-1), actionBy: 'u1', actionType: 'Created', detail: 'มอบหมายงานพัฒนา API' },
      { id: 'l12', taskId: 2, timestamp: t(0, -4), actionBy: 'u2', actionType: 'Status Changed', detail: 'เปลี่ยนสถานะเป็น "กำลังทำ"' },
      { id: 'l13', taskId: 3, timestamp: t(-3), actionBy: 'u3', actionType: 'Status Changed', detail: 'เปลี่ยนสถานะเป็น "เสร็จสิ้น" · วันเสร็จ 26 ก.ค. 2569' },
      { id: 'l14', taskId: 8, timestamp: t(0, -1), actionBy: 'u1', actionType: 'Created', detail: 'มอบหมายงานเขียนคู่มือ' },
    ],
    comments: [
      { id: 'c1', taskId: 2, timestamp: t(0, -18), authorId: 'u1', text: 'ติดปัญหาตรงไหนเรื่อง API ทักมาได้เลยนะ' },
      { id: 'c2', taskId: 2, timestamp: t(0, -16), authorId: 'u2', text: 'ตอนนี้เชื่อม DB ได้แล้วครับ กำลังเขียนส่วน Auth' },
      { id: 'c3', taskId: 4, timestamp: t(0, -11), authorId: 'u1', text: '@สมศักดิ์ รบกวนแก้ด่วนนะ ผอ. จะใช้พรุ่งนี้' },
      { id: 'c4', taskId: 9, timestamp: t(-1), authorId: 'u5', text: 'ใช้เทมเพลตใหม่ในโฟลเดอร์แชร์ได้เลย' },
      { id: 'c5', taskId: 12, timestamp: t(-2), authorId: 'u8', text: 'รอตัวเลขจาก IT อีกชุดครับ' },
    ],
    stickyNotes: [
      { id: 'sn1', userId: 'u1', title: 'ประชุมทีม IT', body: 'เตรียมสไลด์รายงานประจำเดือน', color: 'yellow', emoji: '📌', x: 48, y: 56, width: 240, height: 220, zIndex: 1, createdAt: t(-1), updatedAt: t(-1), noteType: 'text', items: [], labels: ['งาน'], pinned: true, archived: false, trashed: false, reminderAt: t(1), imageUrl: '' },
      { id: 'sn2', userId: 'u2', title: 'ของตัวเอง', body: 'โน้ตส่วนตัวของสมชาย — คนอื่นไม่เห็น', color: 'mint', emoji: '✨', x: 80, y: 80, width: 240, height: 220, zIndex: 1, createdAt: t(0, -1), updatedAt: t(0, -1), noteType: 'text', items: [], labels: [], pinned: false, archived: false, trashed: false, reminderAt: null, imageUrl: '' },
      { id: 'sn3', userId: 'admin', title: 'เช็คลิสต์แอดมิน', body: '', color: 'lavender', emoji: '🛠', x: 120, y: 100, width: 260, height: 240, zIndex: 2, createdAt: t(-1), updatedAt: t(-1), noteType: 'list', items: [{ id: 'i1', text: 'ดูสิทธิ์ตามแผนก', done: true }, { id: 'i2', text: 'โหลด mock', done: false }, { id: 'i3', text: 'ตั้ง username', done: false }], labels: ['แอดมิน'], pinned: false, archived: false, trashed: false, reminderAt: null, imageUrl: '' },
      { id: 'sn4', userId: 'u5', title: 'รอบประเมิน', body: 'ปิดรับแบบฟอร์มวันศุกร์', color: 'pink', emoji: '📋', x: 60, y: 70, width: 240, height: 200, zIndex: 1, createdAt: t(-2), updatedAt: t(-2), noteType: 'text', items: [], labels: ['HR'], pinned: false, archived: false, trashed: false, reminderAt: null, imageUrl: '' },
      { id: 'sn5', userId: 'u7', title: 'งบ 69', body: 'นัดประชุมผอ. สัปดาห์หน้า', color: 'blue', emoji: '💰', x: 90, y: 90, width: 240, height: 200, zIndex: 1, createdAt: t(-1), updatedAt: t(-1), noteType: 'text', items: [], labels: ['งบ'], pinned: false, archived: false, trashed: false, reminderAt: null, imageUrl: '' },
    ],
    orgUnits: [
      { id: 'org_d1', type: 'department', name: 'IT', parent: '', active: true, code: 'IT', lineEnabled: false, lineGroupId: '', lineChannelToken: '', lineNotifyAssign: true, lineNotifyReview: true, lineNotifyComplete: true },
      { id: 'org_d2', type: 'department', name: 'SYSTEM', parent: '', active: true, code: 'SYSTEM', lineEnabled: false, lineGroupId: '', lineChannelToken: '', lineNotifyAssign: true, lineNotifyReview: true, lineNotifyComplete: true },
      { id: 'org_d3', type: 'department', name: 'HR', parent: '', active: true, code: 'HR', lineEnabled: false, lineGroupId: '', lineChannelToken: '', lineNotifyAssign: true, lineNotifyReview: true, lineNotifyComplete: true },
      { id: 'org_d4', type: 'department', name: 'Finance', parent: '', active: true, code: 'FIN', lineEnabled: false, lineGroupId: '', lineChannelToken: '', lineNotifyAssign: true, lineNotifyReview: true, lineNotifyComplete: true },
      { id: 'org_v1', type: 'division', name: 'กองเทคโนโลยี', parent: 'IT', active: true, code: '' },
      { id: 'org_v2', type: 'division', name: 'ผู้ดูแลระบบ', parent: 'SYSTEM', active: true, code: '' },
      { id: 'org_v3', type: 'division', name: 'กองบุคคล', parent: 'HR', active: true, code: '' },
      { id: 'org_v4', type: 'division', name: 'กองงบประมาณ', parent: 'Finance', active: true, code: '' },
    ],
  };
}

const SEED = buildDemoSeed();

let localDb = null;

function getLocalDb() {
  if (!localDb || localDb._seedVersion !== SEED_VERSION) {
    localDb = JSON.parse(JSON.stringify(SEED));
  }
  return localDb;
}

export function resetLocalDemo() {
  localDb = JSON.parse(JSON.stringify(buildDemoSeed()));
  return localDb;
}


function publicUser(u) {
  if (!u) return null;
  const { password, ...rest } = u;
  return { ...rest, active: u.active !== false, username: u.username || u.id };
}

function adminUser(u) {
  if (!u) return null;
  return { ...publicUser(u), password: String(u.password || '') };
}

function requireAdmin(db, adminId) {
  const admin = db.users.find((u) => String(u.id) === String(adminId));
  if (!admin || admin.role !== 'Admin' || admin.active === false) throw new Error('ไม่มีสิทธิ์แอดมิน');
  return admin;
}

function assertDeptAssign(db, actorId, assigneeId) {
  const actor = db.users.find((u) => String(u.id) === String(actorId));
  const assignee = db.users.find((u) => String(u.id) === String(assigneeId));
  if (!actor || actor.active === false) throw new Error('ไม่พบผู้มอบหมาย');
  if (!assignee || assignee.active === false) throw new Error('ไม่พบผู้รับงาน');
  if (actor.role === 'Admin') return;
  const actorDept = String(actor.department || '').trim();
  const assigneeDept = String(assignee.department || '').trim();
  if (!actorDept || actorDept !== assigneeDept) {
    throw new Error('มอบหมายได้เฉพาะคนในแผนกเดียวกัน');
  }
}

function assertCanDeleteTask(db, userId, task) {
  const user = db.users.find((u) => String(u.id) === String(userId));
  if (!user || user.active === false) throw new Error('ไม่พบผู้ใช้');
  if (user.role === 'Admin') return;
  if (String(task.createdBy) === String(userId)) return;
  if (user.role === 'Head') {
    const assignee = db.users.find((u) => String(u.id) === String(task.assignedTo));
    if (assignee && String(assignee.department || '') === String(user.department || '')) return;
  }
  throw new Error('ไม่มีสิทธิ์ลบงานนี้');
}

function assertCanEditTask(db, userId, task) {
  const user = db.users.find((u) => String(u.id) === String(userId));
  if (!user || user.active === false) throw new Error('ไม่พบผู้ใช้');
  if (user.role === 'Admin') return;
  if (String(task.createdBy) === String(userId)) return;
  if (String(task.assignedTo) === String(userId)) return;
  if (user.role === 'Head') {
    const assignee = db.users.find((u) => String(u.id) === String(task.assignedTo));
    if (assignee && String(assignee.department || '') === String(user.department || '')) return;
  }
  throw new Error('ไม่มีสิทธิ์แก้ไขงานนี้');
}

function publicOrgUnit(o) {
  if (!o) return o;
  const token = String(o.lineChannelToken || '').trim();
  const groupId = String(o.lineGroupId || '').trim();
  return {
    id: String(o.id),
    type: o.type === 'division' ? 'division' : 'department',
    name: String(o.name || '').trim(),
    parent: String(o.parent || '').trim(),
    active: o.active !== false,
    code: String(o.code || o.name || '').replace(/\s+/g, '').toUpperCase() || String(o.name || '').replace(/\s+/g, '').toUpperCase(),
    lineEnabled: o.lineEnabled === true,
    lineConfigured: !!(token && groupId),
    lineNotifyAssign: o.lineNotifyAssign !== false,
    lineNotifyReview: o.lineNotifyReview !== false,
    lineNotifyComplete: o.lineNotifyComplete !== false,
  };
}

function adminOrgUnit(o) {
  if (!o) return o;
  return {
    ...publicOrgUnit(o),
    lineGroupId: String(o.lineGroupId || '').trim(),
    lineChannelToken: String(o.lineChannelToken || '').trim(),
  };
}

function findDeptLineConfig(db, departmentName) {
  const name = String(departmentName || '').trim();
  if (!name) return null;
  const row = (db.orgUnits || []).find((o) => o.type === 'department' && o.active !== false && String(o.name) === name);
  if (!row) return null;
  const token = String(row.lineChannelToken || '').trim();
  const groupId = String(row.lineGroupId || '').trim();
  if (!token || !groupId || row.lineEnabled !== true) return null;
  return {
    deptName: name,
    notifyAssign: row.lineNotifyAssign !== false,
    notifyReview: row.lineNotifyReview !== false,
    notifyComplete: row.lineNotifyComplete !== false,
  };
}

function mockNotifyLineDept(db, departmentName, eventKey, message) {
  const cfg = findDeptLineConfig(db, departmentName);
  if (!cfg) return false;
  if (eventKey === 'assign' && !cfg.notifyAssign) return false;
  if (eventKey === 'review' && !cfg.notifyReview) return false;
  if (eventKey === 'complete' && !cfg.notifyComplete) return false;
  console.info('[Mock LINE → ' + cfg.deptName + ']', message);
  return true;
}

function buildLineAssignMsg(task, assignee, actor) {
  const dept = assignee?.department || '';
  const lines = [`📋 [${dept}] มอบหมายงาน`, `งาน: ${task.title}`];
  if (assignee?.name) lines.push(`มอบให้: ${assignee.name}`);
  if (actor?.name) lines.push(`โดย: ${actor.name}`);
  return lines.join('\n');
}

function buildLineReviewMsg(task, assignee, actor) {
  const dept = assignee?.department || '';
  const lines = [`🔍 [${dept}] ส่งงานรอตรวจ`, `งาน: ${task.title}`];
  if (assignee?.name) lines.push(`ผู้ทำ: ${assignee.name}`);
  return lines.join('\n');
}

function buildLineCompleteMsg(task, assignee, actor) {
  const dept = assignee?.department || '';
  const lines = [`✅ [${dept}] งานเสร็จสิ้น`, `งาน: ${task.title}`];
  if (assignee?.name) lines.push(`ผู้ทำ: ${assignee.name}`);
  if (actor?.name) lines.push(`ปิดงานโดย: ${actor.name}`);
  return lines.join('\n');
}

function buildLineForwardMsg(task, assignee, actor) {
  const dept = assignee?.department || '';
  const lines = [`🔁 [${dept}] โอนงาน`, `งาน: ${task.title}`];
  if (assignee?.name) lines.push(`มอบให้: ${assignee.name}`);
  if (actor?.name) lines.push(`โดย: ${actor.name}`);
  return lines.join('\n');
}

function ensureOrg(db, type, name, parent = '') {
  if (!db.orgUnits) db.orgUnits = [];
  name = String(name || '').trim();
  if (!name) return;
  const hit = db.orgUnits.find((o) => o.type === type && String(o.name).toLowerCase() === name.toLowerCase() && o.active !== false);
  if (hit) return hit;
  const row = {
    id: 'org_' + Date.now() + Math.floor(Math.random() * 100),
    type,
    name,
    parent: type === 'division' ? parent : '',
    active: true,
    code: type === 'department' ? name.replace(/\s+/g, '').toUpperCase() : '',
  };
  db.orgUnits.push(row);
  return row;
}

const localHandlers = {
  getBootstrap() {
    const db = getLocalDb();
    return {
      users: db.users.map(publicUser),
      projects: db.projects,
      tasks: db.tasks,
      taskLogs: db.taskLogs || [],
      comments: db.comments || [],
      commentCounts: {},
      milestones: db.milestones || [],
      contractExtensions: db.contractExtensions || [],
      orgUnits: (db.orgUnits || []).filter((o) => o.active !== false).map(publicOrgUnit),
      serverTime: new Date().toISOString(),
    };
  },
  login(payload) {
    const db = getLocalDb();
    const username = String(payload.username || '').trim().toLowerCase();
    const password = String(payload.password || '');
    if (!username || !password) throw new Error('กรอกชื่อผู้ใช้และรหัสผ่าน');
    const u = db.users.find((x) => String(x.username || x.id).toLowerCase() === username);
    if (!u) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    if (u.active === false) throw new Error('บัญชีถูกปิดการใช้งาน');
    if (String(u.password || '') !== password) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    return publicUser(u);
  },
  loginDept(payload) {
    const db = getLocalDb();
    const departmentCode = String(payload.departmentCode || '').trim().toLowerCase();
    const username = String(payload.username || '').trim().toLowerCase();
    if (!departmentCode) throw new Error('กรอกรหัสแผนก');
    if (!username) throw new Error('กรอกชื่อผู้ใช้');
    const orgs = db.orgUnits || [];
    const dept = orgs.find((o) => {
      if (o.type !== 'department' || o.active === false) return false;
      const c = String(o.code || o.name || '').replace(/\s+/g, '').toLowerCase();
      const n = String(o.name || '').toLowerCase();
      return c === departmentCode || n === departmentCode || n.replace(/\s+/g, '') === departmentCode;
    });
    if (!dept) throw new Error('รหัสแผนกไม่ถูกต้อง');
    const u = db.users.find((x) => String(x.username || x.id).toLowerCase() === username);
    if (!u) throw new Error('ไม่พบชื่อผู้ใช้ในแผนกนี้');
    if (u.active === false) throw new Error('บัญชีถูกปิดการใช้งาน');
    if (u.role === 'Admin') throw new Error('บัญชีแอดมินต้องเข้าสู่ระบบด้วย Username และรหัสผ่าน');
    if (String(u.department || '').toLowerCase() !== String(dept.name).toLowerCase()) {
      throw new Error('Username นี้ไม่อยู่ในแผนกที่ระบุ');
    }
    return publicUser(u);
  },
  loginStaff(payload) {
    const db = getLocalDb();
    const username = String(payload.username || '').trim().toLowerCase();
    if (!username) throw new Error('กรอกชื่อผู้ใช้');
    const u = db.users.find((x) => String(x.username || x.id).toLowerCase() === username);
    if (!u) throw new Error('ไม่พบชื่อผู้ใช้นี้');
    if (u.active === false) throw new Error('บัญชีถูกปิดการใช้งาน');
    if (u.role === 'Admin') throw new Error('บัญชีแอดมินกดปุ่ม "แอดมิน" มุมบนขวา แล้วใส่รหัสผ่าน');
    if (!String(u.department || '').trim()) throw new Error('บัญชีนี้ยังไม่ได้ผูกแผนก — ติดต่อแอดมิน');
    return publicUser(u);
  },
  listDeptUsersForLogin(payload) {
    const db = getLocalDb();
    const departmentCode = String(payload.departmentCode || '').trim().toLowerCase();
    if (!departmentCode) throw new Error('กรอก Username แผนก');
    const orgs = db.orgUnits || [];
    const dept = orgs.find((o) => {
      if (o.type !== 'department' || o.active === false) return false;
      const c = String(o.code || o.name || '').replace(/\s+/g, '').toLowerCase();
      const n = String(o.name || '').toLowerCase();
      return c === departmentCode || n === departmentCode || n.replace(/\s+/g, '') === departmentCode;
    });
    if (!dept) throw new Error('Username แผนกไม่ถูกต้อง');
    const users = db.users
      .filter((u) => u.active !== false && u.role !== 'Admin' && String(u.department || '').toLowerCase() === String(dept.name).toLowerCase())
      .map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        division: u.division || '',
        department: u.department || '',
      }))
      .sort((a, b) => (a.role === 'Head' ? 0 : 1) - (b.role === 'Head' ? 0 : 1) || String(a.name).localeCompare(String(b.name), 'th'));
    if (!users.length) throw new Error('แผนกนี้ยังไม่มีผู้ใช้ที่ใช้งานได้');
    return {
      department: { id: dept.id, name: dept.name, code: dept.code || dept.name, type: 'department', active: true, parent: '' },
      users,
    };
  },
  loginDeptPick(payload) {
    const db = getLocalDb();
    const departmentCode = String(payload.departmentCode || '').trim().toLowerCase();
    const userId = String(payload.userId || '').trim();
    if (!departmentCode) throw new Error('กรอก Username แผนก');
    if (!userId) throw new Error('เลือกชื่อผู้ใช้');
    const orgs = db.orgUnits || [];
    const dept = orgs.find((o) => {
      if (o.type !== 'department' || o.active === false) return false;
      const c = String(o.code || o.name || '').replace(/\s+/g, '').toLowerCase();
      const n = String(o.name || '').toLowerCase();
      return c === departmentCode || n === departmentCode || n.replace(/\s+/g, '') === departmentCode;
    });
    if (!dept) throw new Error('Username แผนกไม่ถูกต้อง');
    const u = db.users.find((x) => String(x.id) === userId);
    if (!u) throw new Error('ไม่พบผู้ใช้ในแผนกนี้');
    if (u.active === false) throw new Error('บัญชีถูกปิดการใช้งาน');
    if (u.role === 'Admin') throw new Error('บัญชีแอดมินกดปุ่ม "แอดมิน" มุมบนขวา แล้วใส่รหัสผ่าน');
    if (String(u.department || '').toLowerCase() !== String(dept.name).toLowerCase()) {
      throw new Error('ผู้ใช้นี้ไม่อยู่ในแผนกที่ระบุ');
    }
    return {
      user: publicUser(u),
      bootstrap: localHandlers.getBootstrap(),
    };
  },
  loginAdmin(payload) {
    const db = getLocalDb();
    const username = String(payload.username || '').trim().toLowerCase();
    const password = String(payload.password || '');
    if (!username || !password) throw new Error('กรอกชื่อผู้ใช้และรหัสผ่าน');
    const u = db.users.find((x) => String(x.username || x.id).toLowerCase() === username);
    if (!u) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    if (u.active === false) throw new Error('บัญชีถูกปิดการใช้งาน');
    if (u.role !== 'Admin') throw new Error('โหมดนี้สำหรับแอดมินเท่านั้น — พนักงาน/หัวหน้าใส่รหัสแผนกแล้วเลือกชื่อ');
    if (String(u.password || '') !== password) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    return {
      user: publicUser(u),
      bootstrap: localHandlers.getBootstrap(),
    };
  },
  changePassword(payload) {
    const db = getLocalDb();
    const userId = String(payload.userId || '');
    const idx = db.users.findIndex((u) => String(u.id) === userId);
    if (idx < 0) throw new Error('ไม่พบผู้ใช้');
    if (String(db.users[idx].password || '') !== String(payload.currentPassword || '')) {
      throw new Error('รหัสผ่านปัจจุบันไม่ถูกต้อง');
    }
    const next = String(payload.newPassword || '');
    if (next.length < 4) throw new Error('รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร');
    db.users[idx] = { ...db.users[idx], password: next };
    return { ok: true };
  },
  adminGetUsers(payload) {
    const db = getLocalDb();
    requireAdmin(db, payload.adminId);
    return db.users.map(adminUser);
  },
  adminGetDatabaseInfo(payload) {
    const db = getLocalDb();
    requireAdmin(db, payload.adminId);
    return {
      localMode: true,
      url: null,
      name: 'GovTaskPro_Database (local mock)',
      id: 'local-mock',
      counts: {
        users: db.users.length,
        projects: db.projects.length,
        tasks: db.tasks.length,
      },
    };
  },
  adminCreateUser(payload) {
    const db = getLocalDb();
    requireAdmin(db, payload.adminId);
    const name = String(payload.name || '').trim();
    const role = String(payload.role || 'Staff');
    let department = String(payload.department || '').trim();
    let username = String(payload.username || '').trim();
    let password = String(payload.password || '');
    if (!name) throw new Error('กรอกชื่อแสดง');
    if (!department) department = role === 'Admin' ? 'SYSTEM' : '';
    if (!department) throw new Error('ต้องระบุแผนก');
    if (role === 'Admin') {
      if (!username || !password) throw new Error('แอดมินต้องมี Username และรหัสผ่าน');
      if (password.length < 4) throw new Error('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
    } else {
      if (!username) username = String(name).replace(/\s+/g, '').toLowerCase() || ('user' + Date.now());
      if (!password) password = '-';
    }
    let lower = username.toLowerCase();
    let guard = 0;
    while (guard < 20 && db.users.some((u) => String(u.username || u.id).toLowerCase() === lower)) {
      if (role === 'Admin') throw new Error('Username นี้ถูกใช้แล้ว');
      username = `${username}_${String(Date.now() + guard).slice(-4)}`;
      lower = username.toLowerCase();
      guard += 1;
    }
    const division = String(payload.division || '').trim();
    const row = {
      id: 'u_' + Date.now(),
      name,
      role,
      department,
      division,
      active: true,
      email: '',
      notifyEmail: false,
      notifyAssign: true,
      notifyStatus: true,
      notifyReview: role === 'Head' || role === 'Admin',
      notifyLineDefault: true,
      username,
      password,
    };
    db.users.push(row);
    ensureOrg(db, 'department', department);
    if (division) ensureOrg(db, 'division', division, department);
    return adminUser(row);
  },
  adminUpdateUser(payload) {
    const db = getLocalDb();
    requireAdmin(db, payload.adminId);
    const idx = db.users.findIndex((u) => String(u.id) === String(payload.userId));
    if (idx < 0) throw new Error('ไม่พบผู้ใช้');
    const prev = db.users[idx];
    if (String(payload.userId) === String(payload.adminId) && payload.role && payload.role !== 'Admin') {
      throw new Error('ลดสิทธิ์แอดมินของตัวเองไม่ได้');
    }
    if (String(payload.userId) === String(payload.adminId) && payload.active === false) {
      throw new Error('ปิดบัญชีตัวเองไม่ได้');
    }
    if (payload.username) {
      const lower = String(payload.username).trim().toLowerCase();
      if (db.users.some((u, i) => i !== idx && String(u.username || u.id).toLowerCase() === lower)) {
        throw new Error('Username นี้ถูกใช้แล้ว (ใช้ได้คนเดียวทั้งระบบ)');
      }
    }
    if (payload.department !== undefined && !String(payload.department || '').trim()) {
      throw new Error('ต้องระบุแผนก (1 Username ต่อ 1 แผนก)');
    }
    const next = {
      ...prev,
      name: payload.name !== undefined ? String(payload.name || '').trim() : prev.name,
      username: payload.username !== undefined ? String(payload.username || '').trim() : prev.username,
      role: payload.role !== undefined ? String(payload.role) : prev.role,
      department: payload.department !== undefined ? String(payload.department || '').trim() : prev.department,
      division: payload.division !== undefined ? String(payload.division || '').trim() : prev.division,
      active: payload.active !== undefined ? !!payload.active : prev.active !== false,
      password: payload.password ? String(payload.password) : prev.password,
    };
    if (!next.name) throw new Error('ชื่อจำเป็น');
    if (payload.password && String(payload.password).length < 4) throw new Error('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
    db.users[idx] = next;
    ensureOrg(db, 'department', next.department);
    if (next.division) ensureOrg(db, 'division', next.division, next.department);
    return adminUser(next);
  },
  adminResetPassword(payload) {
    const db = getLocalDb();
    requireAdmin(db, payload.adminId);
    const idx = db.users.findIndex((u) => String(u.id) === String(payload.userId));
    if (idx < 0) throw new Error('ไม่พบผู้ใช้');
    const next = String(payload.newPassword || '');
    if (next.length < 4) throw new Error('รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร');
    db.users[idx] = { ...db.users[idx], password: next };
    return adminUser(db.users[idx]);
  },
  adminSetUserActive(payload) {
    const db = getLocalDb();
    requireAdmin(db, payload.adminId);
    if (String(payload.userId) === String(payload.adminId)) throw new Error('ปิดบัญชีตัวเองไม่ได้');
    const idx = db.users.findIndex((u) => String(u.id) === String(payload.userId));
    if (idx < 0) throw new Error('ไม่พบผู้ใช้');
    db.users[idx] = { ...db.users[idx], active: !!payload.active };
    return adminUser(db.users[idx]);
  },
  adminCreateOrgUnit(payload) {
    const db = getLocalDb();
    requireAdmin(db, payload.adminId);
    const type = payload.type === 'division' ? 'division' : 'department';
    const name = String(payload.name || '').trim();
    const parent = String(payload.parent || '').trim();
    let code = String(payload.code || '').trim();
    if (!name) throw new Error('กรอกชื่อ');
    if (type === 'division' && !parent) throw new Error('เลือกแผนกแม่ของกอง');
    if (type === 'department' && !code) code = name.replace(/\s+/g, '').toUpperCase();
    if (!db.orgUnits) db.orgUnits = [];
    if (db.orgUnits.some((o) => o.type === type && String(o.name).toLowerCase() === name.toLowerCase() && o.active !== false)) {
      throw new Error((type === 'division' ? 'กอง' : 'แผนก') + 'นี้มีอยู่แล้ว');
    }
    if (type === 'division') ensureOrg(db, 'department', parent);
    const row = {
      id: 'org_' + Date.now(),
      type,
      name,
      parent: type === 'division' ? parent : '',
      active: true,
      code: type === 'department' ? code : '',
    };
    db.orgUnits.push(row);
    return row;
  },
  adminGetOrgUnits(payload) {
    const db = getLocalDb();
    requireAdmin(db, payload.adminId);
    return (db.orgUnits || [])
      .filter((o) => o.type === 'department' && o.active !== false && o.name)
      .map(adminOrgUnit);
  },
  adminUpdateOrgUnit(payload) {
    const db = getLocalDb();
    requireAdmin(db, payload.adminId);
    if (!db.orgUnits) db.orgUnits = [];
    const idx = db.orgUnits.findIndex((o) => String(o.id) === String(payload.id));
    if (idx < 0) throw new Error('ไม่พบแผนก');
    const prev = db.orgUnits[idx];
    if (prev.type !== 'department') throw new Error('แก้ Username ได้เฉพาะแผนก');
    const next = { ...prev };
    if (payload.name !== undefined) {
      const name = String(payload.name || '').trim();
      if (!name) throw new Error('ชื่อแผนกจำเป็น');
      next.name = name;
    }
    if (payload.code !== undefined) {
      const code = String(payload.code || '').trim().replace(/\s+/g, '').toUpperCase();
      if (!code) throw new Error('Username แผนกจำเป็น');
      if (db.orgUnits.some((o, i) => i !== idx && o.type === 'department' && o.active !== false && String(o.code || o.name).replace(/\s+/g, '').toUpperCase() === code)) {
        throw new Error('Username แผนกนี้ถูกใช้แล้ว');
      }
      next.code = code;
    }
    if (payload.lineEnabled !== undefined) next.lineEnabled = !!payload.lineEnabled;
    if (payload.lineGroupId !== undefined) next.lineGroupId = String(payload.lineGroupId || '').trim();
    if (payload.lineChannelToken !== undefined) next.lineChannelToken = String(payload.lineChannelToken || '').trim();
    if (payload.lineNotifyAssign !== undefined) next.lineNotifyAssign = !!payload.lineNotifyAssign;
    if (payload.lineNotifyReview !== undefined) next.lineNotifyReview = !!payload.lineNotifyReview;
    if (payload.lineNotifyComplete !== undefined) next.lineNotifyComplete = !!payload.lineNotifyComplete;
    db.orgUnits[idx] = next;
    return adminOrgUnit(next);
  },
  adminDeleteOrgUnit(payload) {
    const db = getLocalDb();
    requireAdmin(db, payload.adminId);
    if (!db.orgUnits) db.orgUnits = [];
    const idx = db.orgUnits.findIndex((o) => String(o.id) === String(payload.id));
    if (idx < 0) throw new Error('ไม่พบรายการ');
    db.orgUnits[idx] = { ...db.orgUnits[idx], active: false };
    return { ok: true, id: payload.id };
  },
  adminSeedDemoData(payload) {
    const db = getLocalDb();
    requireAdmin(db, payload.adminId);
    resetLocalDemo();
    return {
      ok: true,
      message: 'รีเซ็ตข้อมูลตัวอย่างครบทุกฟังก์ชันแล้ว',
      bootstrap: localHandlers.getBootstrap(),
    };
  },
  createProject(payload) {
    const db = getLocalDb();
    const creator = db.users.find((u) => String(u.id) === String(payload.createdBy));
    if (!creator || creator.active === false) throw new Error('ไม่พบผู้สร้าง');
    let dept = String(payload.department || creator.department || '').trim();
    if (creator.role === 'Staff' || creator.role === 'Head') {
      dept = String(creator.department || '').trim();
    } else if (creator.role === 'Admin') {
      dept = String(payload.department || creator.department || '').trim();
    }
    const row = {
      id: `p_${Date.now()}`,
      name: payload.name,
      description: payload.description || '',
      createdBy: payload.createdBy,
      department: dept,
      createdAt: new Date().toISOString(),
      startDate: payload.startDate || null,
      endDate: payload.endDate || null,
    };
    if (!row.department) throw new Error('ต้องระบุแผนกของโปรเจกต์');
    db.projects = [row, ...db.projects];
    return row;
  },
  updateProject(payload) {
    const db = getLocalDb();
    db.projects = db.projects.map((p) => {
      if (p.id !== payload.id) return p;
      return {
        ...p,
        name: payload.name ?? p.name,
        description: payload.description ?? p.description,
        startDate: payload.startDate ?? p.startDate,
        endDate: payload.endDate ?? p.endDate,
      };
    });
    return db.projects.find((p) => p.id === payload.id);
  },
  createMilestone(payload) {
    const db = getLocalDb();
    if (!db.milestones) db.milestones = [];
    const row = {
      id: `m_${Date.now()}`,
      projectId: payload.projectId,
      title: payload.title,
      description: payload.description || '',
      plannedStart: payload.plannedStart || null,
      plannedEnd: payload.plannedEnd || null,
      weight: Number(payload.weight) || 1,
      sortOrder: Number(payload.sortOrder) || db.milestones.length + 1,
      completed: !!payload.completed,
      completedAt: payload.completed ? new Date().toISOString() : null,
    };
    db.milestones = [...db.milestones, row];
    return row;
  },
  updateMilestone(payload) {
    const db = getLocalDb();
    db.milestones = (db.milestones || []).map((m) => {
      if (m.id !== payload.id) return m;
      const next = { ...m, ...payload };
      if (payload.completed === true) next.completedAt = payload.completedAt || new Date().toISOString();
      if (payload.completed === false) next.completedAt = null;
      return next;
    });
    return db.milestones.find((m) => m.id === payload.id);
  },
  deleteMilestone(payload) {
    const db = getLocalDb();
    db.milestones = (db.milestones || []).filter((m) => m.id !== payload.id);
    return { ok: true, id: payload.id };
  },
  createContractExtension(payload) {
    const db = getLocalDb();
    if (!db.contractExtensions) db.contractExtensions = [];
    const project = db.projects.find((p) => String(p.id) === String(payload.projectId));
    if (!project) throw new Error('ไม่พบโปรเจกต์');
    if (!payload.fromDate || !payload.toDate) throw new Error('กรุณาระบุช่วงวันที่ขยายสัญญา');
    if (new Date(payload.toDate).getTime() < new Date(payload.fromDate).getTime()) {
      throw new Error('วันสิ้นสุดใหม่ต้องไม่น้อยกว่าวันเริ่มขยาย');
    }
    if (!payload.startMilestoneId) throw new Error('กรุณาระบุขั้นตอนที่เริ่มขยาย');
    if (!String(payload.reason || '').trim()) throw new Error('กรุณาระบุเหตุผลการขยายสัญญา');
    const mine = db.contractExtensions.filter((x) => String(x.projectId) === String(payload.projectId));
    const extensionNo = mine.reduce((max, x) => Math.max(max, Number(x.extensionNo) || 0), 0) + 1;
    const now = new Date().toISOString();
    const extension = {
      id: `ce_${Date.now()}`,
      projectId: String(payload.projectId),
      extensionNo,
      fromDate: payload.fromDate,
      toDate: payload.toDate,
      startMilestoneId: String(payload.startMilestoneId),
      reason: String(payload.reason || '').trim(),
      approvalRef: String(payload.approvalRef || '').trim(),
      approvedAt: payload.approvedAt || null,
      createdBy: String(payload.createdBy || ''),
      createdAt: now,
      updatedAt: now,
    };
    db.contractExtensions = [...db.contractExtensions, extension];
    const updatedProject = (!project.endDate || new Date(extension.toDate).getTime() > new Date(project.endDate).getTime())
      ? { ...project, endDate: extension.toDate }
      : { ...project };
    db.projects = db.projects.map((p) => String(p.id) === String(project.id) ? updatedProject : p);
    return { extension, project: updatedProject };
  },
  updateContractExtension(payload) {
    const db = getLocalDb();
    if (!db.contractExtensions) db.contractExtensions = [];
    const idx = db.contractExtensions.findIndex((x) => String(x.id) === String(payload.id));
    if (idx < 0) throw new Error('ไม่พบรายการขยายสัญญา');
    const extension = {
      ...db.contractExtensions[idx],
      ...payload,
      id: db.contractExtensions[idx].id,
      projectId: db.contractExtensions[idx].projectId,
      extensionNo: db.contractExtensions[idx].extensionNo,
      updatedAt: new Date().toISOString(),
    };
    if (new Date(extension.toDate).getTime() < new Date(extension.fromDate).getTime()) {
      throw new Error('วันสิ้นสุดใหม่ต้องไม่น้อยกว่าวันเริ่มขยาย');
    }
    db.contractExtensions = db.contractExtensions.map((x, i) => i === idx ? extension : x);
    const project = db.projects.find((p) => String(p.id) === String(extension.projectId));
    const updatedProject = project && (!project.endDate || new Date(extension.toDate).getTime() > new Date(project.endDate).getTime())
      ? { ...project, endDate: extension.toDate }
      : (project ? { ...project } : null);
    if (updatedProject) {
      db.projects = db.projects.map((p) => String(p.id) === String(updatedProject.id) ? updatedProject : p);
    }
    return { extension, project: updatedProject };
  },
  deleteContractExtension(payload) {
    const db = getLocalDb();
    if (!db.contractExtensions) db.contractExtensions = [];
    const before = db.contractExtensions.length;
    db.contractExtensions = db.contractExtensions.filter((x) => String(x.id) !== String(payload.id));
    if (before === db.contractExtensions.length) throw new Error('ไม่พบรายการขยายสัญญา');
    return { ok: true, id: payload.id };
  },
  createTask(payload) {
    const db = getLocalDb();
    assertDeptAssign(db, payload.createdBy, payload.assignedTo || payload.createdBy);
    const row = {
      id: Date.now(),
      projectId: payload.projectId || null,
      title: payload.title,
      description: payload.description || '',
      createdBy: payload.createdBy,
      assignedTo: payload.assignedTo,
      status: payload.status,
      type: payload.type,
      dueDate: payload.dueDate || null,
      isRecurring: !!payload.isRecurring,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    db.tasks = [row, ...db.tasks];
    db.taskLogs = [{
      id: `l_${Date.now()}`,
      taskId: row.id,
      timestamp: new Date().toISOString(),
      actionBy: payload.createdBy,
      actionType: 'Created',
      detail: payload.logDetail || 'สร้างงาน',
    }, ...db.taskLogs];
    const assignee = db.users.find((u) => String(u.id) === String(row.assignedTo));
    const actor = db.users.find((u) => String(u.id) === String(row.createdBy));
    const dept = assignee?.department || '';
    const selfAssign = String(row.assignedTo) === String(row.createdBy);
    if (dept && (payload.notifyLine || selfAssign)) {
      mockNotifyLineDept(db, dept, 'assign', buildLineAssignMsg(row, assignee, actor));
    }
    return { task: row, log: db.taskLogs[0] };
  },
  updateTaskStatus(payload) {
    const db = getLocalDb();
    const completedAt = payload.status === 'Completed' ? new Date().toISOString() : null;
    db.tasks = db.tasks.map((t) => {
      if (String(t.id) !== String(payload.taskId)) return t;
      return {
        ...t,
        status: payload.status,
        completedAt: payload.status === 'Completed' ? completedAt : null,
      };
    });
    const doneLabel = completedAt
      ? new Date(completedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';
    const defaultDetail = payload.status === 'Completed'
      ? `เปลี่ยนสถานะเป็น เสร็จสิ้น · วันเสร็จ ${doneLabel}`
      : `เปลี่ยนสถานะเป็น ${payload.status}`;
    db.taskLogs = [{
      id: `l_${Date.now()}`,
      taskId: payload.taskId,
      timestamp: new Date().toISOString(),
      actionBy: payload.userId,
      actionType: 'Status Changed',
      detail: payload.logDetail || defaultDetail,
    }, ...db.taskLogs];
    const task = db.tasks.find((t) => String(t.id) === String(payload.taskId));
    const assignee = db.users.find((u) => String(u.id) === String(task?.assignedTo));
    const actor = db.users.find((u) => String(u.id) === String(payload.userId));
    const dept = assignee?.department || '';
    if (dept && payload.status === 'Review') {
      mockNotifyLineDept(db, dept, 'review', buildLineReviewMsg(task, assignee, actor));
    }
    if (dept && payload.status === 'Completed') {
      mockNotifyLineDept(db, dept, 'complete', buildLineCompleteMsg(task, assignee, actor));
    }
    return {
      task,
      log: db.taskLogs[0],
    };
  },
  forwardTask(payload) {
    const db = getLocalDb();
    assertDeptAssign(db, payload.userId, payload.newAssigneeId);
    const name = db.users.find((u) => u.id === payload.newAssigneeId)?.name || payload.newAssigneeId;
    db.tasks = db.tasks.map((t) =>
      String(t.id) === String(payload.taskId)
        ? { ...t, assignedTo: payload.newAssigneeId, status: 'Pending' }
        : t
    );
    db.taskLogs = [{
      id: `l_${Date.now()}`,
      taskId: payload.taskId,
      timestamp: new Date().toISOString(),
      actionBy: payload.userId,
      actionType: 'Forwarded',
      detail: `โอนงานให้ ${name}`,
    }, ...db.taskLogs];
    const task = db.tasks.find((t) => String(t.id) === String(payload.taskId));
    const newAssignee = db.users.find((u) => String(u.id) === String(payload.newAssigneeId));
    const actor = db.users.find((u) => String(u.id) === String(payload.userId));
    const dept = newAssignee?.department || '';
    if (dept && task) {
      mockNotifyLineDept(db, dept, 'assign', buildLineForwardMsg(task, newAssignee, actor));
    }
    return {
      task,
      log: db.taskLogs[0],
    };
  },
  takeoverTask(payload) {
    const db = getLocalDb();
    const task = db.tasks.find((t) => String(t.id) === String(payload.taskId));
    const oldName = db.users.find((u) => u.id === task?.assignedTo)?.name || '';
    db.tasks = db.tasks.map((t) =>
      String(t.id) === String(payload.taskId)
        ? { ...t, assignedTo: payload.userId, status: 'In Progress' }
        : t
    );
    db.taskLogs = [{
      id: `l_${Date.now()}`,
      taskId: payload.taskId,
      timestamp: new Date().toISOString(),
      actionBy: payload.userId,
      actionType: 'Takeover',
      detail: `ดึงงานมาจาก ${oldName} เพื่อดำเนินการต่อ`,
    }, ...db.taskLogs];
    return {
      task: db.tasks.find((t) => String(t.id) === String(payload.taskId)),
      log: db.taskLogs[0],
    };
  },
  deleteTask(payload) {
    const db = getLocalDb();
    const taskId = String(payload.taskId || '');
    const userId = String(payload.userId || '');
    const task = db.tasks.find((t) => String(t.id) === taskId);
    if (!task) throw new Error('ไม่พบงาน');
    assertCanDeleteTask(db, userId, task);
    db.tasks = db.tasks.filter((t) => String(t.id) !== taskId);
    db.taskLogs = (db.taskLogs || []).filter((l) => String(l.taskId) !== taskId);
    db.comments = (db.comments || []).filter((c) => String(c.taskId) !== taskId);
    return { ok: true, id: taskId };
  },
  updateTask(payload) {
    const db = getLocalDb();
    const taskId = String(payload.taskId || '');
    const userId = String(payload.userId || '');
    const task = db.tasks.find((t) => String(t.id) === taskId);
    if (!task) throw new Error('ไม่พบงาน');
    assertCanEditTask(db, userId, task);
    const projectId = payload.projectId !== undefined
      ? (String(payload.projectId || '').trim() || null)
      : undefined;
    if (projectId !== undefined && projectId) {
      const project = db.projects.find((p) => String(p.id) === String(projectId));
      if (!project) throw new Error('ไม่พบโปรเจกต์');
      const user = db.users.find((u) => String(u.id) === String(userId));
      if (user?.role !== 'Admin' && String(project.department || '') !== String(user?.department || '')) {
        throw new Error('ไม่มีสิทธิ์ใช้โปรเจกต์นี้');
      }
    }
    if (payload.title !== undefined) {
      const title = String(payload.title || '').trim();
      if (!title) throw new Error('กรอกชื่องาน');
    }
    db.tasks = db.tasks.map((t) => {
      if (String(t.id) !== taskId) return t;
      const next = { ...t };
      if (projectId !== undefined) next.projectId = projectId;
      if (payload.title !== undefined) next.title = String(payload.title || '').trim();
      if (payload.description !== undefined) next.description = String(payload.description || '');
      if (payload.dueDate !== undefined) next.dueDate = payload.dueDate ? String(payload.dueDate) : null;
      if (payload.isRecurring !== undefined) next.isRecurring = !!payload.isRecurring;
      return next;
    });
    const updated = db.tasks.find((t) => String(t.id) === taskId);
    db.taskLogs = [{
      id: `l_${Date.now()}`,
      taskId,
      timestamp: new Date().toISOString(),
      actionBy: userId,
      actionType: 'Updated',
      detail: payload.logDetail || 'อัปเดตงาน',
    }, ...db.taskLogs];
    return { task: updated, log: db.taskLogs[0] };
  },
  addComment(payload) {
    const db = getLocalDb();
    const row = {
      id: `c_${Date.now()}`,
      taskId: payload.taskId,
      timestamp: new Date().toISOString(),
      authorId: payload.authorId,
      text: payload.text,
    };
    db.comments = [...db.comments, row];
    return row;
  },
  listStickyNotes(payload) {
    const db = getLocalDb();
    const userId = String(payload?.userId || '');
    if (!userId) throw new Error('ต้องระบุผู้ใช้');
    if (!db.stickyNotes) db.stickyNotes = [];
    return db.stickyNotes
      .filter((n) => String(n.userId) === userId)
      .map((n) => ({
        ...n,
        noteType: n.noteType === 'list' ? 'list' : 'text',
        items: Array.isArray(n.items) ? n.items : [],
        labels: Array.isArray(n.labels) ? n.labels : [],
        pinned: !!n.pinned,
        archived: !!n.archived,
        trashed: !!n.trashed,
        reminderAt: n.reminderAt || null,
        imageUrl: n.imageUrl || '',
      }))
      .sort((a, b) => {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
        return (a.zIndex || 0) - (b.zIndex || 0);
      });
  },
  createStickyNote(payload) {
    const db = getLocalDb();
    if (!db.stickyNotes) db.stickyNotes = [];
    const userId = String(payload.userId || '');
    if (!userId) throw new Error('ต้องระบุผู้ใช้');
    const mine = db.stickyNotes.filter((n) => String(n.userId) === userId);
    const maxZ = mine.reduce((m, n) => Math.max(m, n.zIndex || 0), 1);
    const offset = (mine.length % 8) * 28;
    const colors = ['yellow', 'orange', 'pink', 'mint', 'teal', 'blue', 'lavender', 'white'];
    const color = colors.includes(payload.color) ? payload.color : 'yellow';
    const noteType = payload.noteType === 'list' ? 'list' : 'text';
    const now = new Date().toISOString();
    const row = {
      id: `sn_${Date.now()}`,
      userId,
      title: String(payload.title || '').trim(),
      body: noteType === 'list' ? '' : String(payload.body || ''),
      color,
      emoji: String(payload.emoji || '').trim().slice(0, 8),
      x: payload.x !== undefined ? Number(payload.x) : 40 + offset,
      y: payload.y !== undefined ? Number(payload.y) : 40 + offset,
      width: payload.width !== undefined ? Number(payload.width) : 240,
      height: payload.height !== undefined ? Number(payload.height) : 220,
      zIndex: payload.zIndex !== undefined ? Number(payload.zIndex) : maxZ + 1,
      createdAt: now,
      updatedAt: now,
      noteType,
      items: Array.isArray(payload.items) ? payload.items : [],
      labels: Array.isArray(payload.labels)
        ? payload.labels
        : String(payload.labels || '').split(/[,|]/).map((x) => x.trim()).filter(Boolean),
      pinned: !!payload.pinned,
      archived: !!payload.archived,
      trashed: false,
      reminderAt: payload.reminderAt || null,
      imageUrl: String(payload.imageUrl || '').trim(),
      fontFamily: ['handwriting', 'sarabun', 'manrope', 'sans', 'mono'].includes(payload.fontFamily)
        ? payload.fontFamily
        : 'handwriting',
    };
    db.stickyNotes = [...db.stickyNotes, row];
    return row;
  },
  updateStickyNote(payload) {
    const db = getLocalDb();
    if (!db.stickyNotes) db.stickyNotes = [];
    const id = String(payload.id || '');
    const userId = String(payload.userId || '');
    if (!id || !userId) throw new Error('ไม่พบโน้ต');
    const idx = db.stickyNotes.findIndex((n) => String(n.id) === id && String(n.userId) === userId);
    if (idx < 0) throw new Error('ไม่พบโน้ต หรือไม่มีสิทธิ์แก้ไข');
    const colors = ['yellow', 'orange', 'pink', 'mint', 'teal', 'blue', 'lavender', 'white'];
    const prev = db.stickyNotes[idx];
    const next = {
      ...prev,
      title: payload.title !== undefined ? String(payload.title || '').trim() : prev.title,
      body: payload.body !== undefined ? String(payload.body || '') : prev.body,
      color: payload.color !== undefined && colors.includes(payload.color) ? payload.color : prev.color,
      emoji: payload.emoji !== undefined ? String(payload.emoji || '').trim().slice(0, 8) : prev.emoji,
      x: payload.x !== undefined ? Number(payload.x) || 0 : prev.x,
      y: payload.y !== undefined ? Number(payload.y) || 0 : prev.y,
      width: payload.width !== undefined ? Math.max(160, Number(payload.width) || 220) : prev.width,
      height: payload.height !== undefined ? Math.max(140, Number(payload.height) || 200) : prev.height,
      zIndex: payload.zIndex !== undefined ? Number(payload.zIndex) || 1 : prev.zIndex,
      noteType: payload.noteType !== undefined ? (payload.noteType === 'list' ? 'list' : 'text') : (prev.noteType || 'text'),
      items: payload.items !== undefined ? (Array.isArray(payload.items) ? payload.items : []) : (prev.items || []),
      labels: payload.labels !== undefined
        ? (Array.isArray(payload.labels) ? payload.labels : String(payload.labels || '').split(/[,|]/).map((x) => x.trim()).filter(Boolean))
        : (prev.labels || []),
      pinned: payload.pinned !== undefined ? !!payload.pinned : !!prev.pinned,
      archived: payload.archived !== undefined ? !!payload.archived : !!prev.archived,
      trashed: payload.trashed !== undefined ? !!payload.trashed : !!prev.trashed,
      reminderAt: payload.reminderAt !== undefined ? (payload.reminderAt || null) : (prev.reminderAt || null),
      imageUrl: payload.imageUrl !== undefined ? String(payload.imageUrl || '').trim() : (prev.imageUrl || ''),
      fontFamily: payload.fontFamily !== undefined && ['handwriting', 'sarabun', 'manrope', 'sans', 'mono'].includes(payload.fontFamily)
        ? payload.fontFamily
        : (prev.fontFamily || 'handwriting'),
      updatedAt: new Date().toISOString(),
    };
    db.stickyNotes = db.stickyNotes.map((n, i) => (i === idx ? next : n));
    return next;
  },
  getTaskActivity(payload) {
    const db = getLocalDb();
    const taskId = String(payload?.taskId || '');
    return {
      comments: db.comments.filter((c) => String(c.taskId) === taskId),
      taskLogs: db.taskLogs.filter((l) => String(l.taskId) === taskId),
    };
  },
  getProjectActivity(payload) {
    const db = getLocalDb();
    const projectId = String(payload?.projectId || '');
    const taskIds = new Set(
      db.tasks.filter((t) => String(t.projectId) === projectId).map((t) => String(t.id)),
    );
    const taskLogs = db.taskLogs.filter((l) => taskIds.has(String(l.taskId)));
    return { taskLogs };
  },
  deleteStickyNote(payload) {
    const db = getLocalDb();
    if (!db.stickyNotes) db.stickyNotes = [];
    const id = String(payload.id || '');
    const userId = String(payload.userId || '');
    const idx = db.stickyNotes.findIndex((n) => String(n.id) === id && String(n.userId) === userId);
    if (idx < 0) throw new Error('ไม่พบโน้ต หรือไม่มีสิทธิ์ลบ');
    const prev = db.stickyNotes[idx];
    const permanent = !!payload.permanent || !!prev.trashed;
    if (!permanent) {
      const next = { ...prev, trashed: true, archived: false, updatedAt: new Date().toISOString() };
      db.stickyNotes = db.stickyNotes.map((n, i) => (i === idx ? next : n));
      return { ok: true, id, trashed: true, note: next };
    }
    db.stickyNotes = db.stickyNotes.filter((n) => !(String(n.id) === id && String(n.userId) === userId));
    return { ok: true, id, deleted: true };
  },
  emptyStickyTrash(payload) {
    const db = getLocalDb();
    if (!db.stickyNotes) db.stickyNotes = [];
    const userId = String(payload?.userId || '');
    if (!userId) throw new Error('ต้องระบุผู้ใช้');
    const before = db.stickyNotes.length;
    db.stickyNotes = db.stickyNotes.filter((n) => !(String(n.userId) === userId && n.trashed));
    return { ok: true, removed: before - db.stickyNotes.length };
  },
  duplicateStickyNote(payload) {
    const existing = localHandlers.listStickyNotes(payload).find((n) => String(n.id) === String(payload.id));
    if (!existing) throw new Error('ไม่พบโน้ต หรือไม่มีสิทธิ์');
    return localHandlers.createStickyNote({
      userId: payload.userId,
      title: `${existing.title || 'โน้ต'} (สำเนา)`,
      body: existing.body,
      color: existing.color,
      emoji: existing.emoji,
      noteType: existing.noteType,
      items: existing.items,
      labels: existing.labels,
      reminderAt: existing.reminderAt,
      imageUrl: existing.imageUrl,
      x: (existing.x || 40) + 24,
      y: (existing.y || 40) + 24,
      width: existing.width,
      height: existing.height,
    });
  },
  updateUserProfile(payload) {
    const db = getLocalDb();
    const id = String(payload.id || '');
    const idx = db.users.findIndex((u) => String(u.id) === id);
    if (idx < 0) throw new Error('ไม่พบผู้ใช้');
    const prev = db.users[idx];
    const next = {
      ...prev,
      name: payload.name !== undefined ? String(payload.name || '').trim() : prev.name,
      email: payload.email !== undefined ? String(payload.email || '').trim() : (prev.email || ''),
      notifyEmail: payload.notifyEmail !== undefined ? !!payload.notifyEmail : !!prev.notifyEmail,
      notifyAssign: payload.notifyAssign !== undefined ? !!payload.notifyAssign : (prev.notifyAssign !== false),
      notifyStatus: payload.notifyStatus !== undefined ? !!payload.notifyStatus : (prev.notifyStatus !== false),
      notifyReview: payload.notifyReview !== undefined ? !!payload.notifyReview : !!prev.notifyReview,
      notifyLineDefault: payload.notifyLineDefault !== undefined ? !!payload.notifyLineDefault : (prev.notifyLineDefault !== false),
    };
    if (payload.department !== undefined || payload.division !== undefined) {
      if (prev.role !== 'Admin') {
        throw new Error('เปลี่ยนแผนกได้เฉพาะแอดมิน — ติดต่อผู้ดูแลระบบ');
      }
      if (payload.department !== undefined) {
        const dept = String(payload.department || '').trim();
        if (!dept) throw new Error('ต้องระบุแผนก');
        next.department = dept;
      }
      if (payload.division !== undefined) next.division = String(payload.division || '').trim();
    }
    if (!next.name) throw new Error('ชื่อจำเป็น');
    db.users = db.users.map((u, i) => (i === idx ? next : u));
    return publicUser(next);
  },

  dispatchTaskNotify() {
    return { ok: true };
  },
};

export async function runLocal(fnName, payload) {
  const handler = localHandlers[fnName];
  if (!handler) throw new Error('Unknown local API: ' + fnName);
  await new Promise((r) => setTimeout(r, 40));
  return handler(payload);
}
