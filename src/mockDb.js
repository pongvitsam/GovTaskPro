/** Local mock DB for Vite DEV only (stripped from production bundle) */

const SEED = (() => {
  const NOW = Date.now();
  const HOUR = 3600000;
  const DAY = 86400000;
  return {
    users: [
      { id: 'u1', name: 'คุณบอส (หัวหน้าแผนก IT)', role: 'Head', department: 'IT', division: 'กองเทคโนโลยี' },
      { id: 'u2', name: 'สมชาย (พนักงาน IT)', role: 'Staff', department: 'IT', division: 'กองเทคโนโลยี' },
      { id: 'u3', name: 'สมหญิง (พนักงาน IT)', role: 'Staff', department: 'IT', division: 'กองเทคโนโลยี' },
      { id: 'u4', name: 'สมศักดิ์ (พนักงาน IT)', role: 'Staff', department: 'IT', division: 'กองเทคโนโลยี' },
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
  };
})();

let localDb = null;

function getLocalDb() {
  if (!localDb) {
    localDb = JSON.parse(JSON.stringify(SEED));
  }
  return localDb;
}


const localHandlers = {
  getBootstrap() {
    const db = getLocalDb();
    return {
      users: db.users,
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
      serverTime: new Date().toISOString(),
    };
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
};

export async function runLocal(fnName, payload) {
  const handler = localHandlers[fnName];
  if (!handler) throw new Error('Unknown local API: ' + fnName);
  await new Promise((r) => setTimeout(r, 40));
  return handler(payload);
}
