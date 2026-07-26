/** Local mock DB for Vite DEV only (stripped from production bundle) */

const SEED = (() => {
  const NOW = Date.now();
  const HOUR = 3600000;
  const DAY = 86400000;
  return {
    users: [
      { id: 'admin', name: 'ผู้ดูแลระบบ', role: 'Admin', department: 'SYSTEM', division: 'ผู้ดูแลระบบ', active: true, email: '', notifyEmail: false, notifyAssign: true, notifyStatus: true, notifyReview: true, notifyLineDefault: true, username: 'admin', password: '1234' },
      { id: 'u1', name: 'คุณบอส (หัวหน้าแผนก IT)', role: 'Head', department: 'IT', division: 'กองเทคโนโลยี', active: true, email: '', notifyEmail: false, notifyAssign: true, notifyStatus: true, notifyReview: true, notifyLineDefault: true, username: 'boss', password: '1234' },
      { id: 'u2', name: 'สมชาย (พนักงาน IT)', role: 'Staff', department: 'IT', division: 'กองเทคโนโลยี', active: true, email: '', notifyEmail: false, notifyAssign: true, notifyStatus: true, notifyReview: false, notifyLineDefault: true, username: 'somchai', password: '1234' },
      { id: 'u3', name: 'สมหญิง (พนักงาน IT)', role: 'Staff', department: 'IT', division: 'กองเทคโนโลยี', active: true, email: '', notifyEmail: false, notifyAssign: true, notifyStatus: true, notifyReview: false, notifyLineDefault: true, username: 'somying', password: '1234' },
      { id: 'u4', name: 'สมศักดิ์ (พนักงาน IT)', role: 'Staff', department: 'IT', division: 'กองเทคโนโลยี', active: true, email: '', notifyEmail: false, notifyAssign: true, notifyStatus: true, notifyReview: false, notifyLineDefault: true, username: 'somsak', password: '1234' },
    ],
    projects: [
      { id: 'p1', name: 'พัฒนาระบบ Intranet กอง', description: 'อัปเกรดระบบภายในให้รองรับการทำงานแบบใหม่ (Next-Gen)', createdBy: 'u1', startDate: new Date(NOW - DAY * 14).toISOString().slice(0, 10), endDate: new Date(NOW + DAY * 45).toISOString().slice(0, 10) },
      { id: 'p2', name: 'กิจกรรม 5ส ประจำปี', description: 'จัดระเบียบอุปกรณ์และสายไฟ', createdBy: 'u1', startDate: new Date(NOW - DAY * 7).toISOString().slice(0, 10), endDate: new Date(NOW + DAY * 21).toISOString().slice(0, 10) },
      { id: 'p3', name: 'แผนซ่อมบำรุงประจำไตรมาส (Q3)', description: 'ตรวจสอบอุปกรณ์ Network ทั่วตึก', createdBy: 'u1', startDate: new Date(NOW - DAY * 3).toISOString().slice(0, 10), endDate: new Date(NOW + DAY * 60).toISOString().slice(0, 10) },
    ],
    milestones: [
      { id: 'm1', projectId: 'p1', title: 'เก็บความต้องการ & ออกแบบ', description: 'ประชุมผู้ใช้และออกแบบ UI/DB', plannedStart: new Date(NOW - DAY * 14).toISOString().slice(0, 10), plannedEnd: new Date(NOW - DAY * 7).toISOString().slice(0, 10), weight: 20, sortOrder: 1, completed: true, completedAt: new Date(NOW - DAY * 6).toISOString() },
      { id: 'm2', projectId: 'p1', title: 'พัฒนา Backend / API', description: 'Auth และบริการหลัก', plannedStart: new Date(NOW - DAY * 7).toISOString().slice(0, 10), plannedEnd: new Date(NOW + DAY * 7).toISOString().slice(0, 10), weight: 30, sortOrder: 2, completed: false, completedAt: null },
      { id: 'm3', projectId: 'p1', title: 'พัฒนา Frontend', description: 'หน้าจอ Intranet', plannedStart: new Date(NOW - DAY * 3).toISOString().slice(0, 10), plannedEnd: new Date(NOW + DAY * 21).toISOString().slice(0, 10), weight: 25, sortOrder: 3, completed: false, completedAt: null },
      { id: 'm4', projectId: 'p1', title: 'ทดสอบระบบ & อบรม', description: 'UAT และคู่มือ', plannedStart: new Date(NOW + DAY * 21).toISOString().slice(0, 10), plannedEnd: new Date(NOW + DAY * 35).toISOString().slice(0, 10), weight: 15, sortOrder: 4, completed: false, completedAt: null },
      { id: 'm5', projectId: 'p1', title: 'ขึ้นระบบจริง (Go-live)', description: 'Deploy และส่งมอบ', plannedStart: new Date(NOW + DAY * 35).toISOString().slice(0, 10), plannedEnd: new Date(NOW + DAY * 45).toISOString().slice(0, 10), weight: 10, sortOrder: 5, completed: false, completedAt: null },
      { id: 'm6', projectId: 'p2', title: 'สำรวจพื้นที่ & วางแผน', description: 'ตรวจตู้ Rack / สายไฟ', plannedStart: new Date(NOW - DAY * 7).toISOString().slice(0, 10), plannedEnd: new Date(NOW - DAY * 3).toISOString().slice(0, 10), weight: 30, sortOrder: 1, completed: true, completedAt: new Date(NOW - DAY * 2).toISOString() },
      { id: 'm7', projectId: 'p2', title: 'ดำเนินการ 5ส', description: 'จัดระเบียบและติดป้าย', plannedStart: new Date(NOW - DAY * 2).toISOString().slice(0, 10), plannedEnd: new Date(NOW + DAY * 10).toISOString().slice(0, 10), weight: 50, sortOrder: 2, completed: false, completedAt: null },
      { id: 'm8', projectId: 'p2', title: 'ตรวจรับ & สรุปผล', description: 'รายงานผลกิจกรรม', plannedStart: new Date(NOW + DAY * 10).toISOString().slice(0, 10), plannedEnd: new Date(NOW + DAY * 21).toISOString().slice(0, 10), weight: 20, sortOrder: 3, completed: false, completedAt: null },
      { id: 'm9', projectId: 'p3', title: 'สำรวจอุปกรณ์ Network', description: 'Inventory ชั้น 1-3', plannedStart: new Date(NOW - DAY * 3).toISOString().slice(0, 10), plannedEnd: new Date(NOW + DAY * 14).toISOString().slice(0, 10), weight: 40, sortOrder: 1, completed: false, completedAt: null },
      { id: 'm10', projectId: 'p3', title: 'ซ่อมบำรุง / เปลี่ยนอะไหล่', description: 'UPS สายแลน AP', plannedStart: new Date(NOW + DAY * 14).toISOString().slice(0, 10), plannedEnd: new Date(NOW + DAY * 40).toISOString().slice(0, 10), weight: 40, sortOrder: 2, completed: false, completedAt: null },
      { id: 'm11', projectId: 'p3', title: 'ทดสอบ & ปิดงานไตรมาส', description: 'รายงาน Q3', plannedStart: new Date(NOW + DAY * 40).toISOString().slice(0, 10), plannedEnd: new Date(NOW + DAY * 60).toISOString().slice(0, 10), weight: 20, sortOrder: 3, completed: false, completedAt: null },
    ],
    tasks: [
      { id: 1, projectId: 'p1', title: 'ออกแบบหน้า Login ใหม่', description: 'ใช้โทนสีองค์กร', createdBy: 'u1', assignedTo: 'u2', status: 'Completed', type: 'Assigned', dueDate: new Date(NOW - DAY * 2).toISOString(), isRecurring: false, createdAt: new Date(NOW - DAY * 7).toISOString(), completedAt: new Date(NOW - DAY * 2).toISOString() },
      { id: 2, projectId: 'p1', title: 'พัฒนาระบบ Backend (API)', description: 'สร้าง API สำหรับ Login Auth', createdBy: 'u1', assignedTo: 'u2', status: 'In Progress', type: 'Assigned', dueDate: new Date(NOW + DAY * 5).toISOString(), isRecurring: false, createdAt: new Date(NOW - DAY).toISOString() },
      { id: 3, projectId: 'p1', title: 'เตรียม Database Server', description: 'สร้างตารางข้อมูล', createdBy: 'u1', assignedTo: 'u3', status: 'Completed', type: 'Assigned', dueDate: new Date(NOW - DAY * 3).toISOString(), isRecurring: false, createdAt: new Date(NOW - DAY * 7).toISOString(), completedAt: new Date(NOW - DAY * 3).toISOString() },
      { id: 4, projectId: null, title: 'รายงานผลการประเมินความเสี่ยง IT (ตีกลับ)', description: 'ผอ. ตีกลับให้เพิ่มข้อมูลกราฟ (เจ้าของงานคือสมศักดิ์ แต่ตอนนี้ลา)', createdBy: 'u1', assignedTo: 'u4', status: 'In Progress', type: 'Assigned', dueDate: new Date(NOW + DAY * 1).toISOString(), isRecurring: false, createdAt: new Date(NOW - DAY * 4).toISOString() },
      { id: 5, projectId: 'p2', title: 'ทำความสะอาดตู้ Rack', description: 'เป่าฝุ่นและเช็คพัดลม', createdBy: 'u1', assignedTo: 'u3', status: 'Review', type: 'Assigned', dueDate: new Date(NOW).toISOString(), isRecurring: false, createdAt: new Date(NOW - DAY * 1).toISOString() },
      { id: 6, projectId: null, title: 'สรุปรายงาน Helpdesk', description: 'ส่งหัวหน้ากอง', createdBy: 'u2', assignedTo: 'u2', status: 'In Progress', type: 'Self', dueDate: new Date(NOW + DAY * 2).toISOString(), isRecurring: true, createdAt: new Date(NOW - HOUR * 2).toISOString() },
      { id: 7, projectId: 'p3', title: 'เปลี่ยนแบตเตอรี่ UPS ชั้น 2', description: 'เปลี่ยนแบต 3 ตัว', createdBy: 'u1', assignedTo: 'u4', status: 'Pending', type: 'Assigned', dueDate: new Date(NOW - DAY * 1).toISOString(), isRecurring: false, createdAt: new Date(NOW - DAY * 2).toISOString() },
    ],
    taskLogs: [
      { id: 'l1', taskId: 4, timestamp: new Date(NOW - DAY * 4).toISOString(), actionBy: 'u1', actionType: 'Created', detail: 'มอบหมายงานให้ สมศักดิ์' },
      { id: 'l2', taskId: 4, timestamp: new Date(NOW - DAY * 2).toISOString(), actionBy: 'u4', actionType: 'Status Changed', detail: 'เปลี่ยนสถานะเป็น "รอตรวจ"' },
      { id: 'l3', taskId: 4, timestamp: new Date(NOW - HOUR * 12).toISOString(), actionBy: 'u1', actionType: 'Status Changed', detail: 'ตีกลับให้แก้ไข - ขาดข้อมูลกราฟแนวโน้ม' },
      { id: 'l4', taskId: 5, timestamp: new Date(NOW - DAY * 1).toISOString(), actionBy: 'u1', actionType: 'Created', detail: 'มอบหมายงานให้ สมหญิง' },
      { id: 'l5', taskId: 5, timestamp: new Date(NOW - HOUR * 2).toISOString(), actionBy: 'u3', actionType: 'Status Changed', detail: 'เปลี่ยนสถานะเป็น "รอตรวจ"' },
    ],
    comments: [
      { id: 'c1', taskId: 2, timestamp: new Date(NOW - HOUR * 18).toISOString(), authorId: 'u1', text: 'ติดปัญหาตรงไหนเรื่อง API ทักมาได้เลยนะ' },
      { id: 'c2', taskId: 2, timestamp: new Date(NOW - HOUR * 16).toISOString(), authorId: 'u2', text: 'ตอนนี้เชื่อม DB ได้แล้วครับ กำลังเขียนส่วน Auth' },
      { id: 'c3', taskId: 4, timestamp: new Date(NOW - HOUR * 11).toISOString(), authorId: 'u1', text: '@สมศักดิ์ รบกวนแก้ด่วนนะ ผอ. จะใช้พรุ่งนี้' },
    ],
    stickyNotes: [
      { id: 'sn1', userId: 'u1', title: 'ประชุมทีม', body: 'เตรียมสไลด์รายงานประจำเดือน', color: 'yellow', emoji: '📌', x: 48, y: 56, width: 220, height: 200, zIndex: 1, createdAt: new Date(NOW - DAY).toISOString(), updatedAt: new Date(NOW - DAY).toISOString() },
      { id: 'sn2', userId: 'u2', title: 'ของตัวเอง', body: 'โน้ตส่วนตัวของสมชาย — คนอื่นไม่เห็น', color: 'mint', emoji: '✨', x: 80, y: 80, width: 220, height: 200, zIndex: 1, createdAt: new Date(NOW - HOUR).toISOString(), updatedAt: new Date(NOW - HOUR).toISOString() },
    ],
    orgUnits: [
      { id: 'org_d1', type: 'department', name: 'IT', parent: '', active: true, code: 'IT' },
      { id: 'org_d2', type: 'department', name: 'SYSTEM', parent: '', active: true, code: 'SYSTEM' },
      { id: 'org_v1', type: 'division', name: 'กองเทคโนโลยี', parent: 'IT', active: true, code: '' },
      { id: 'org_v2', type: 'division', name: 'ผู้ดูแลระบบ', parent: 'SYSTEM', active: true, code: '' },
    ],
  };
})();

let localDb = null;

function getLocalDb() {
  if (!localDb) {
    localDb = JSON.parse(JSON.stringify(SEED));
  }
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
      taskLogs: [],
      comments: [],
      commentCounts: (() => {
        const m = {};
        for (const c of db.comments) {
          const k = String(c.taskId);
          m[k] = (m[k] || 0) + 1;
        }
        return m;
      })(),
      milestones: db.milestones || [],
      orgUnits: (db.orgUnits || []).filter((o) => o.active !== false),
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
  loginAdmin(payload) {
    const db = getLocalDb();
    const username = String(payload.username || '').trim().toLowerCase();
    const password = String(payload.password || '');
    if (!username || !password) throw new Error('กรอกชื่อผู้ใช้และรหัสผ่าน');
    const u = db.users.find((x) => String(x.username || x.id).toLowerCase() === username);
    if (!u) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    if (u.active === false) throw new Error('บัญชีถูกปิดการใช้งาน');
    if (u.role !== 'Admin') throw new Error('โหมดนี้สำหรับแอดมินเท่านั้น — พนักงาน/หัวหน้ากรอก Username ที่หน้าแรก');
    if (String(u.password || '') !== password) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    return publicUser(u);
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
  adminCreateUser(payload) {
    const db = getLocalDb();
    requireAdmin(db, payload.adminId);
    const username = String(payload.username || '').trim();
    const password = String(payload.password || '');
    const name = String(payload.name || '').trim();
    const role = String(payload.role || 'Staff');
    let department = String(payload.department || '').trim();
    if (!username || !password || !name) throw new Error('กรอกชื่อผู้ใช้ รหัสผ่าน และชื่อแสดง');
    if (!department) department = role === 'Admin' ? 'SYSTEM' : '';
    if (!department) throw new Error('ต้องระบุแผนก (1 Username ต่อ 1 แผนก)');
    if (db.users.some((u) => String(u.username || u.id).toLowerCase() === username.toLowerCase())) {
      throw new Error('Username นี้ถูกใช้แล้ว (ใช้ได้คนเดียวทั้งระบบ / 1 Username = 1 แผนก)');
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
  adminDeleteOrgUnit(payload) {
    const db = getLocalDb();
    requireAdmin(db, payload.adminId);
    if (!db.orgUnits) db.orgUnits = [];
    const idx = db.orgUnits.findIndex((o) => String(o.id) === String(payload.id));
    if (idx < 0) throw new Error('ไม่พบรายการ');
    db.orgUnits[idx] = { ...db.orgUnits[idx], active: false };
    return { ok: true, id: payload.id };
  },
  createProject(payload) {
    const db = getLocalDb();
    const row = {
      id: `p_${Date.now()}`,
      name: payload.name,
      description: payload.description || '',
      createdBy: payload.createdBy,
      createdAt: new Date().toISOString(),
      startDate: payload.startDate || null,
      endDate: payload.endDate || null,
    };
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
  createTask(payload) {
    const db = getLocalDb();
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
    return { task: row, log: db.taskLogs[0] };
  },
  updateTaskStatus(payload) {
    const db = getLocalDb();
    db.tasks = db.tasks.map((t) => {
      if (String(t.id) !== String(payload.taskId)) return t;
      return {
        ...t,
        status: payload.status,
        completedAt: payload.status === 'Completed' ? new Date().toISOString() : t.completedAt,
      };
    });
    db.taskLogs = [{
      id: `l_${Date.now()}`,
      taskId: payload.taskId,
      timestamp: new Date().toISOString(),
      actionBy: payload.userId,
      actionType: 'Status Changed',
      detail: payload.logDetail || `เปลี่ยนสถานะเป็น ${payload.status}`,
    }, ...db.taskLogs];
    return {
      task: db.tasks.find((t) => String(t.id) === String(payload.taskId)),
      log: db.taskLogs[0],
    };
  },
  forwardTask(payload) {
    const db = getLocalDb();
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
    return {
      task: db.tasks.find((t) => String(t.id) === String(payload.taskId)),
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
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  },
  createStickyNote(payload) {
    const db = getLocalDb();
    if (!db.stickyNotes) db.stickyNotes = [];
    const userId = String(payload.userId || '');
    if (!userId) throw new Error('ต้องระบุผู้ใช้');
    const mine = db.stickyNotes.filter((n) => String(n.userId) === userId);
    const maxZ = mine.reduce((m, n) => Math.max(m, n.zIndex || 0), 1);
    const offset = (mine.length % 8) * 28;
    const colors = ['yellow', 'pink', 'mint', 'blue', 'lavender'];
    const color = colors.includes(payload.color) ? payload.color : 'yellow';
    const now = new Date().toISOString();
    const row = {
      id: `sn_${Date.now()}`,
      userId,
      title: String(payload.title || '').trim(),
      body: String(payload.body || ''),
      color,
      emoji: String(payload.emoji || '').trim().slice(0, 8),
      x: payload.x !== undefined ? Number(payload.x) : 40 + offset,
      y: payload.y !== undefined ? Number(payload.y) : 40 + offset,
      width: payload.width !== undefined ? Number(payload.width) : 220,
      height: payload.height !== undefined ? Number(payload.height) : 200,
      zIndex: payload.zIndex !== undefined ? Number(payload.zIndex) : maxZ + 1,
      createdAt: now,
      updatedAt: now,
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
    const colors = ['yellow', 'pink', 'mint', 'blue', 'lavender'];
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
  deleteStickyNote(payload) {
    const db = getLocalDb();
    if (!db.stickyNotes) db.stickyNotes = [];
    const id = String(payload.id || '');
    const userId = String(payload.userId || '');
    const before = db.stickyNotes.length;
    db.stickyNotes = db.stickyNotes.filter((n) => !(String(n.id) === id && String(n.userId) === userId));
    if (db.stickyNotes.length === before) throw new Error('ไม่พบโน้ต หรือไม่มีสิทธิ์ลบ');
    return { ok: true, id };
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
};

export async function runLocal(fnName, payload) {
  const handler = localHandlers[fnName];
  if (!handler) throw new Error('Unknown local API: ' + fnName);
  await new Promise((r) => setTimeout(r, 40));
  return handler(payload);
}
