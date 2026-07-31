/**
 * GovTaskPro - Google Apps Script API + Spreadsheet database
 */

var USERS_SHEET = 'Users';
var PROJECTS_SHEET = 'Projects';
var TASKS_SHEET = 'Tasks';
var LOGS_SHEET = 'TaskLogs';
var COMMENTS_SHEET = 'Comments';
var MILESTONES_SHEET = 'Milestones';
var CONTRACT_EXTENSIONS_SHEET = 'ContractExtensions';
var STICKY_NOTES_SHEET = 'StickyNotes';
var ORG_UNITS_SHEET = 'OrgUnits';

var USER_HEADERS = [
  'id', 'name', 'role', 'department', 'division', 'active',
  'email', 'notifyEmail', 'notifyAssign', 'notifyStatus', 'notifyReview', 'notifyLineDefault',
  'username', 'password'
];
var PROJECT_HEADERS = ['id', 'name', 'description', 'createdBy', 'department', 'createdAt', 'startDate', 'endDate'];
var TASK_HEADERS = [
  'id', 'projectId', 'title', 'description', 'createdBy', 'assignedTo',
  'status', 'type', 'dueDate', 'isRecurring', 'createdAt', 'completedAt'
];
var LOG_HEADERS = ['id', 'taskId', 'timestamp', 'actionBy', 'actionType', 'detail'];
var COMMENT_HEADERS = ['id', 'taskId', 'timestamp', 'authorId', 'text'];
var MILESTONE_HEADERS = [
  'id', 'projectId', 'title', 'description', 'plannedStart', 'plannedEnd',
  'weight', 'sortOrder', 'completed', 'completedAt'
];
var CONTRACT_EXTENSION_HEADERS = [
  'id', 'projectId', 'extensionNo', 'fromDate', 'toDate',
  'startMilestoneId', 'reason', 'approvalRef', 'approvedAt',
  'createdBy', 'createdAt', 'updatedAt'
];
var STICKY_NOTE_HEADERS = [
  'id', 'userId', 'title', 'body', 'color', 'emoji',
  'x', 'y', 'width', 'height', 'zIndex', 'createdAt', 'updatedAt',
  'noteType', 'items', 'labels', 'pinned', 'archived', 'trashed',
  'reminderAt', 'imageUrl'
];
var ORG_HEADERS = ['id', 'type', 'name', 'parent', 'active', 'code'];

var FRONTEND_URL = 'https://pongvitsam.github.io/GovTaskPro/';

function doGet(e) {
  e = e || {};
  var p = e.parameter || {};

  // JSONP / JSON HTTP API for GitHub Pages (ContentService — no HtmlService iframe)
  if (String(p.api || '') === '1' || (p.fn && String(p.callback || '') !== '')) {
    return handleHttpApi_(p);
  }

  // Legacy in-GAS UI (optional)
  if (String(p.embed || '') === '1') {
    return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('GovTaskPro')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  // Hidden legacy bridge page (kept for debugging)
  if (String(p.bridge || '') === '1') {
    return HtmlService.createHtmlOutputFromFile('Bridge')
      .setTitle('GovTaskPro Bridge')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // Default: send users to GitHub Pages frontend
  var html =
    '<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"/>' +
    '<meta http-equiv="refresh" content="0;url=' + FRONTEND_URL + '"/>' +
    '<title>GovTaskPro</title>' +
    '<script>location.replace(' + JSON.stringify(FRONTEND_URL) + ');</script>' +
    '</head><body style="font-family:sans-serif;padding:2rem;text-align:center">' +
    '<p>กำลังเปิด GovTaskPro…</p>' +
    '<p><a href="' + FRONTEND_URL + '">' + FRONTEND_URL + '</a></p>' +
    '</body></html>';

  return HtmlService.createHtmlOutput(html)
    .setTitle('GovTaskPro')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Form POST from GitHub Pages → run API server-side → postMessage to window.top
 * (Works around HtmlService nested-iframe postMessage limits)
 */
function doPost(e) {
  e = e || {};
  var p = e.parameter || {};

  // Prefer form fields; also accept JSON body
  if ((!p.fn || p.fn === '') && e.postData && e.postData.contents) {
    try {
      var body = JSON.parse(e.postData.contents);
      p.fn = body.fn || p.fn;
      p.id = body.id || p.id;
      p.replyOrigin = body.replyOrigin || p.replyOrigin;
      if (body.payload !== undefined) {
        p.payload = typeof body.payload === 'string' ? body.payload : JSON.stringify(body.payload);
        p.hasPayload = '1';
      }
    } catch (parseErr) { /* keep form params */ }
  }

  var id = String(p.id || '');
  var replyOrigin = String(p.replyOrigin || FRONTEND_URL);
  var out;
  try {
    var payload = undefined;
    var hasPayload = String(p.hasPayload || '') === '1' || (p.payload !== undefined && p.payload !== null && String(p.payload) !== '');
    if (hasPayload) {
      payload = p.payload === '' || p.payload == null ? null : JSON.parse(String(p.payload));
    }
    var result = dispatchApi_(String(p.fn || ''), payload, hasPayload);
    out = { type: 'gtp-result', id: id, ok: true, result: result };
  } catch (err) {
    out = {
      type: 'gtp-result',
      id: id,
      ok: false,
      error: err && err.message ? err.message : String(err)
    };
  }

  var html =
    '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>' +
    '<script>(function(){try{window.top.postMessage(' +
    JSON.stringify(out) +
    ',' +
    JSON.stringify(replyOrigin) +
    ');}catch(e){try{window.top.postMessage(' +
    JSON.stringify(out) +
    ',\"*\");}catch(e2){}}})();</script>' +
    '</body></html>';

  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function handleHttpApi_(p) {
  var out;
  try {
    var payload = undefined;
    var hasPayload = String(p.hasPayload || '') === '1' || (p.payload !== undefined && p.payload !== null && String(p.payload) !== '');
    if (hasPayload) {
      payload = p.payload === '' || p.payload == null ? null : JSON.parse(String(p.payload));
    }
    var result = dispatchApi_(String(p.fn || ''), payload, hasPayload);
    out = { ok: true, result: result };
  } catch (err) {
    out = { ok: false, error: err && err.message ? err.message : String(err) };
  }

  var json = JSON.stringify(out);
  var cb = String(p.callback || '');
  if (cb && /^[A-Za-z_$][\w$]*$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function dispatchApi_(fn, payload, hasPayload) {
  if (!fn) throw new Error('ไม่ได้ระบุฟังก์ชัน API');

  // no-arg
  if (fn === 'ping') return ping();
  if (fn === 'getBootstrap') return getBootstrap(payload || {});

  // payload optional / required
  if (fn === 'getTaskActivity') return getTaskActivity(payload || {});
  if (fn === 'getProjectActivity') return getProjectActivity(payload || {});
  if (fn === 'createProject') return createProject(payload || {});
  if (fn === 'updateProject') return updateProject(payload || {});
  if (fn === 'createMilestone') return createMilestone(payload || {});
  if (fn === 'updateMilestone') return updateMilestone(payload || {});
  if (fn === 'deleteMilestone') return deleteMilestone(payload || {});
  if (fn === 'createContractExtension') return createContractExtension(payload || {});
  if (fn === 'updateContractExtension') return updateContractExtension(payload || {});
  if (fn === 'deleteContractExtension') return deleteContractExtension(payload || {});
  if (fn === 'createTask') return createTask(payload || {});
  if (fn === 'updateTaskStatus') return updateTaskStatus(payload || {});
  if (fn === 'forwardTask') return forwardTask(payload || {});
  if (fn === 'takeoverTask') return takeoverTask(payload || {});
  if (fn === 'addComment') return addComment(payload || {});
  if (fn === 'listStickyNotes') return listStickyNotes(payload || {});
  if (fn === 'createStickyNote') return createStickyNote(payload || {});
  if (fn === 'updateStickyNote') return updateStickyNote(payload || {});
  if (fn === 'deleteStickyNote') return deleteStickyNote(payload || {});
  if (fn === 'emptyStickyTrash') return emptyStickyTrash(payload || {});
  if (fn === 'duplicateStickyNote') return duplicateStickyNote(payload || {});
  if (fn === 'updateUserProfile') return updateUserProfile(payload || {});
  if (fn === 'login') return login(payload || {});
  if (fn === 'loginDept') return loginDept(payload || {});
  if (fn === 'loginStaff') return loginStaff(payload || {});
  if (fn === 'listDeptUsersForLogin') return listDeptUsersForLogin(payload || {});
  if (fn === 'loginDeptPick') return loginDeptPick(payload || {});
  if (fn === 'loginAdmin') return loginAdmin(payload || {});
  if (fn === 'changePassword') return changePassword(payload || {});
  if (fn === 'adminCreateUser') return adminCreateUser(payload || {});
  if (fn === 'adminResetPassword') return adminResetPassword(payload || {});
  if (fn === 'adminSetUserActive') return adminSetUserActive(payload || {});
  if (fn === 'adminGetUsers') return adminGetUsers(payload || {});
  if (fn === 'adminUpdateUser') return adminUpdateUser(payload || {});
  if (fn === 'adminCreateOrgUnit') return adminCreateOrgUnit(payload || {});
  if (fn === 'adminUpdateOrgUnit') return adminUpdateOrgUnit(payload || {});
  if (fn === 'adminDeleteOrgUnit') return adminDeleteOrgUnit(payload || {});
  if (fn === 'adminSeedDemoData') return adminSeedDemoData(payload || {});

  throw new Error('Unknown API: ' + fn);
}

/** Inject HTML/JS/CSS partials into Index template (<?!= include('AppJs1'); ?>). */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function include_(filename) {
  return include(filename);
}

var SCHEMA_VERSION = '13';
var BOOT_CACHE_KEY = 'gtp_boot_v9';
var BOOT_CACHE_TTL = 90;
var _ssCache = null;
var _sheetHeaderCache = {};
var STICKY_COLORS = ['yellow', 'orange', 'pink', 'mint', 'teal', 'blue', 'lavender', 'white'];

function invalidateBootstrapCache_() {
  try {
    CacheService.getScriptCache().remove(BOOT_CACHE_KEY);
  } catch (e) { /* ignore */ }
}

/** Client bootstrap: core sheets only (logs/comments lazy via getTaskActivity) */
function getBootstrap(opt) {
  try {
    opt = opt || {};
    var forceFresh = !!(opt.force || opt.fresh || opt.nocache);
    var cache = CacheService.getScriptCache();
    if (!forceFresh) {
      var hit = cache.get(BOOT_CACHE_KEY);
      if (hit) {
        try {
          return JSON.parse(hit);
        } catch (parseErr) { /* rebuild */ }
      }
    }

    var ss = openDatabase_(false);
    var props = PropertiesService.getScriptProperties();
    if ((props.getProperty('SCHEMA_VERSION') || '') !== SCHEMA_VERSION) {
      var lock = LockService.getScriptLock();
      try {
        lock.waitLock(8000);
        maybeMigrateAndSeed_(ss);
      } catch (lockErr) {
        throw new Error('ระบบกำลังเตรียมฐานข้อมูล กรุณารอสักครู่แล้วลองใหม่');
      } finally {
        try { lock.releaseLock(); } catch (e) {}
      }
    }

    // Comments/logs are lazy via getTaskActivity — skip Comments sheet on boot
    var payload = {
      users: listUsersFromSs_(ss),
      projects: listProjectsFromSs_(ss),
      tasks: listTasksFromSs_(ss),
      taskLogs: [],
      comments: [],
      commentCounts: {},
      milestones: listMilestonesFromSs_(ss),
      contractExtensions: listContractExtensionsFromSs_(ss),
      orgUnits: listOrgUnitsFromSs_(ss),
      serverTime: new Date().toISOString()
    };

    try {
      var json = JSON.stringify(payload);
      if (json.length < 95000) {
        cache.put(BOOT_CACHE_KEY, json, BOOT_CACHE_TTL);
      }
    } catch (cacheErr) { /* ignore */ }

    return payload;
  } catch (err) {
    throw new Error(err && err.message ? err.message : String(err));
  }
}

/** Per-task comments + timeline (loaded when modal opens) */
function getTaskActivity(payload) {
  openDatabase_(false);
  var taskId = String((payload && payload.taskId) || '');
  if (!taskId) throw new Error('ไม่พบงาน');
  var comments = listByTaskId_(COMMENTS_SHEET, taskId).map(function (c) {
    return {
      id: String(c.id),
      taskId: isFinite(Number(c.taskId)) ? Number(c.taskId) : String(c.taskId),
      timestamp: toIso_(c.timestamp),
      authorId: String(c.authorId || ''),
      text: String(c.text || '')
    };
  });
  var taskLogs = listByTaskId_(LOGS_SHEET, taskId).map(function (l) {
    return {
      id: String(l.id),
      taskId: isFinite(Number(l.taskId)) ? Number(l.taskId) : String(l.taskId),
      timestamp: toIso_(l.timestamp),
      actionBy: String(l.actionBy || ''),
      actionType: String(l.actionType || ''),
      detail: String(l.detail || '')
    };
  });
  return { comments: comments, taskLogs: taskLogs };
}

/** Task timeline logs for all board tasks in a project */
function getProjectActivity(payload) {
  openDatabase_(false);
  var projectId = String((payload && payload.projectId) || '');
  if (!projectId) throw new Error('ไม่พบโปรเจกต์');
  var tasks = listObjects_(TASKS_SHEET);
  var taskIds = {};
  for (var ti = 0; ti < tasks.length; ti++) {
    if (String(tasks[ti].projectId) !== projectId) continue;
    taskIds[String(tasks[ti].id)] = true;
  }
  var rawLogs = listObjectsFromSheet_(getSheet_(LOGS_SHEET));
  var taskLogs = [];
  for (var li = 0; li < rawLogs.length; li++) {
    var l = rawLogs[li];
    if (!taskIds[String(l.taskId)]) continue;
    taskLogs.push({
      id: String(l.id),
      taskId: isFinite(Number(l.taskId)) ? Number(l.taskId) : String(l.taskId),
      timestamp: toIso_(l.timestamp),
      actionBy: String(l.actionBy || ''),
      actionType: String(l.actionType || ''),
      detail: String(l.detail || '')
    });
  }
  taskLogs.sort(function (a, b) {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
  return { taskLogs: taskLogs };
}

function createProject(payload) {
  openDatabase_(false);
  var id = 'p_' + Date.now();
  var dept = resolveProjectDepartment_(payload);
  var row = {
    id: id,
    name: String(payload.name || '').trim(),
    description: String(payload.description || ''),
    createdBy: String(payload.createdBy || ''),
    department: dept,
    createdAt: new Date().toISOString(),
    startDate: payload.startDate ? String(payload.startDate) : '',
    endDate: payload.endDate ? String(payload.endDate) : ''
  };
  if (!row.name) throw new Error('ชื่อโปรเจกต์จำเป็น');
  if (!row.department) throw new Error('ต้องระบุแผนกของโปรเจกต์');
  appendObject_(PROJECTS_SHEET, PROJECT_HEADERS, row);
  invalidateBootstrapCache_();
  return normalizeProject_(row);
}

function updateProject(payload) {
  openDatabase_(false);
  var projectId = String(payload.id || payload.projectId || '');
  if (!projectId) throw new Error('ไม่พบโปรเจกต์');
  var updates = {
    name: payload.name,
    description: payload.description,
    startDate: payload.startDate,
    endDate: payload.endDate
  };
  var found = updateRowById_(PROJECTS_SHEET, projectId, updates);
  if (!found) throw new Error('ไม่พบโปรเจกต์');
  invalidateBootstrapCache_();
  return normalizeProject_(found);
}

function createMilestone(payload) {
  openDatabase_(false);
  var row = {
    id: 'm_' + Date.now(),
    projectId: String(payload.projectId || ''),
    title: String(payload.title || '').trim(),
    description: String(payload.description || ''),
    plannedStart: payload.plannedStart ? String(payload.plannedStart) : '',
    plannedEnd: payload.plannedEnd ? String(payload.plannedEnd) : '',
    weight: payload.weight !== undefined && payload.weight !== '' ? Number(payload.weight) : 1,
    sortOrder: payload.sortOrder !== undefined && payload.sortOrder !== '' ? Number(payload.sortOrder) : Date.now(),
    completed: payload.completed ? 'TRUE' : 'FALSE',
    completedAt: payload.completed ? (payload.completedAt || new Date().toISOString()) : ''
  };
  if (!row.projectId) throw new Error('ต้องระบุโปรเจกต์');
  if (!row.title) throw new Error('ชื่องาน/ขั้นตอนจำเป็น');
  appendObject_(MILESTONES_SHEET, MILESTONE_HEADERS, row);
  invalidateBootstrapCache_();
  return normalizeMilestone_(row);
}

function updateMilestone(payload) {
  openDatabase_(false);
  var id = String(payload.id || '');
  if (!id) throw new Error('ไม่พบขั้นตอน');
  var updates = {};
  if (payload.title !== undefined) updates.title = payload.title;
  if (payload.description !== undefined) updates.description = payload.description;
  if (payload.plannedStart !== undefined) updates.plannedStart = payload.plannedStart || '';
  if (payload.plannedEnd !== undefined) updates.plannedEnd = payload.plannedEnd || '';
  if (payload.weight !== undefined) updates.weight = Number(payload.weight) || 1;
  if (payload.sortOrder !== undefined) updates.sortOrder = Number(payload.sortOrder) || 0;
  if (payload.completed !== undefined) {
    var done = !!payload.completed;
    updates.completed = done ? 'TRUE' : 'FALSE';
    updates.completedAt = done ? (payload.completedAt || new Date().toISOString()) : '';
  }
  var found = updateRowById_(MILESTONES_SHEET, id, updates);
  if (!found) throw new Error('ไม่พบขั้นตอน');
  invalidateBootstrapCache_();
  return normalizeMilestone_(found);
}

function deleteMilestone(payload) {
  openDatabase_(false);
  var id = String(payload.id || '');
  if (!id) throw new Error('ไม่พบขั้นตอน');
  var sheet = getSheet_(MILESTONES_SHEET);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idIdx = headers.indexOf('id');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) === id) {
      sheet.deleteRow(i + 1);
      invalidateBootstrapCache_();
      return { ok: true, id: id };
    }
  }
  throw new Error('ไม่พบขั้นตอน');
}

function createContractExtension(payload) {
  openDatabase_(false);
  var projectId = String(payload.projectId || '');
  if (!projectId) throw new Error('ต้องระบุโปรเจกต์');
  var project = findProjectById_(projectId);
  if (!project) throw new Error('ไม่พบโปรเจกต์');

  var fromDate = payload.fromDate ? String(payload.fromDate).slice(0, 10) : '';
  var toDate = payload.toDate ? String(payload.toDate).slice(0, 10) : '';
  if (!fromDate || !toDate) throw new Error('กรุณาระบุช่วงวันที่ขยายสัญญา');
  if (new Date(toDate).getTime() < new Date(fromDate).getTime()) {
    throw new Error('วันสิ้นสุดใหม่ต้องไม่น้อยกว่าวันเริ่มขยาย');
  }

  var existing = listContractExtensions_().filter(function (x) {
    return String(x.projectId) === projectId;
  });
  var maxNo = 0;
  for (var i = 0; i < existing.length; i++) {
    maxNo = Math.max(maxNo, Number(existing[i].extensionNo) || 0);
  }
  var now = new Date().toISOString();
  var row = {
    id: 'ce_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    projectId: projectId,
    extensionNo: maxNo + 1,
    fromDate: fromDate,
    toDate: toDate,
    startMilestoneId: String(payload.startMilestoneId || ''),
    reason: String(payload.reason || '').trim(),
    approvalRef: String(payload.approvalRef || '').trim(),
    approvedAt: payload.approvedAt ? String(payload.approvedAt).slice(0, 10) : '',
    createdBy: String(payload.createdBy || ''),
    createdAt: now,
    updatedAt: now
  };
  if (!row.startMilestoneId) throw new Error('กรุณาระบุขั้นตอนที่เริ่มขยาย');
  if (!row.reason) throw new Error('กรุณาระบุเหตุผลการขยายสัญญา');

  appendObject_(CONTRACT_EXTENSIONS_SHEET, CONTRACT_EXTENSION_HEADERS, row);
  var updatedProject = project;
  if (!project.endDate || new Date(toDate).getTime() > new Date(project.endDate).getTime()) {
    var foundProject = updateRowById_(PROJECTS_SHEET, projectId, { endDate: toDate });
    if (foundProject) updatedProject = normalizeProject_(foundProject);
  }
  invalidateBootstrapCache_();
  return { extension: normalizeContractExtension_(row), project: updatedProject };
}

function updateContractExtension(payload) {
  openDatabase_(false);
  var id = String(payload.id || '');
  if (!id) throw new Error('ไม่พบรายการขยายสัญญา');
  var updates = { updatedAt: new Date().toISOString() };
  if (payload.fromDate !== undefined) updates.fromDate = payload.fromDate ? String(payload.fromDate).slice(0, 10) : '';
  if (payload.toDate !== undefined) updates.toDate = payload.toDate ? String(payload.toDate).slice(0, 10) : '';
  if (payload.startMilestoneId !== undefined) updates.startMilestoneId = String(payload.startMilestoneId || '');
  if (payload.reason !== undefined) updates.reason = String(payload.reason || '').trim();
  if (payload.approvalRef !== undefined) updates.approvalRef = String(payload.approvalRef || '').trim();
  if (payload.approvedAt !== undefined) updates.approvedAt = payload.approvedAt ? String(payload.approvedAt).slice(0, 10) : '';
  if (updates.fromDate && updates.toDate && new Date(updates.toDate).getTime() < new Date(updates.fromDate).getTime()) {
    throw new Error('วันสิ้นสุดใหม่ต้องไม่น้อยกว่าวันเริ่มขยาย');
  }
  var found = updateRowById_(CONTRACT_EXTENSIONS_SHEET, id, updates);
  if (!found) throw new Error('ไม่พบรายการขยายสัญญา');
  var extension = normalizeContractExtension_(found);
  var project = findProjectById_(extension.projectId);
  if (project && extension.toDate && (!project.endDate || new Date(extension.toDate).getTime() > new Date(project.endDate).getTime())) {
    var projectRow = updateRowById_(PROJECTS_SHEET, extension.projectId, { endDate: extension.toDate });
    if (projectRow) project = normalizeProject_(projectRow);
  }
  invalidateBootstrapCache_();
  return { extension: extension, project: project };
}

function deleteContractExtension(payload) {
  openDatabase_(false);
  var id = String(payload.id || '');
  if (!id) throw new Error('ไม่พบรายการขยายสัญญา');
  var sheet = getSheet_(CONTRACT_EXTENSIONS_SHEET);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) throw new Error('ไม่พบรายการขยายสัญญา');
  var idIdx = data[0].indexOf('id');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) !== id) continue;
    sheet.deleteRow(i + 1);
    invalidateBootstrapCache_();
    return { ok: true, id: id };
  }
  throw new Error('ไม่พบรายการขยายสัญญา');
}

function findProjectById_(projectId) {
  var rows = listProjects_();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id) === String(projectId)) return rows[i];
  }
  return null;
}

function createTask(payload) {
  openDatabase_(false);
  var id = String(Date.now());
  var status = payload.status || 'Pending';
  var row = {
    id: id,
    projectId: payload.projectId ? String(payload.projectId) : '',
    title: String(payload.title || '').trim(),
    description: String(payload.description || ''),
    createdBy: String(payload.createdBy || ''),
    assignedTo: String(payload.assignedTo || ''),
    status: status,
    type: payload.type || 'Assigned',
    dueDate: payload.dueDate ? String(payload.dueDate) : '',
    isRecurring: payload.isRecurring ? 'TRUE' : 'FALSE',
    createdAt: new Date().toISOString(),
    completedAt: ''
  };
  if (!row.title) throw new Error('หัวข้องานจำเป็น');
  appendObject_(TASKS_SHEET, TASK_HEADERS, row);
  var log = addLog_(id, row.createdBy, 'Created', payload.logDetail || 'สร้างงาน');
  if (payload.notifyLine) notifyLine_('งานใหม่: ' + row.title);
  var assignee = findUserById_(row.assignedTo);
  if (assignee && assignee.notifyAssign && String(row.assignedTo) !== String(row.createdBy)) {
    notifyUserEmail_(assignee, 'ได้รับมอบหมายงานใหม่', 'คุณได้รับมอบหมายงาน: "' + row.title + '"');
  }
  invalidateBootstrapCache_();
  return { task: normalizeTask_(row), log: log };
}

function updateTaskStatus(payload) {
  openDatabase_(false);
  var taskId = String(payload.taskId);
  var newStatus = String(payload.status);
  var userId = String(payload.userId || '');
  var sheet = getSheet_(TASKS_SHEET);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idIdx = headers.indexOf('id');
  var statusIdx = headers.indexOf('status');
  var completedIdx = headers.indexOf('completedAt');
  var found = null;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) === taskId) {
      sheet.getRange(i + 1, statusIdx + 1).setValue(newStatus);
      found = rowToObject_(headers, data[i]);
      found.status = newStatus;
      if (newStatus === 'Completed') {
        var completedAt = new Date().toISOString();
        sheet.getRange(i + 1, completedIdx + 1).setValue(completedAt);
        found.completedAt = completedAt;
      }
      break;
    }
  }
  if (!found) throw new Error('ไม่พบงาน');
  var defaultDetail = 'เปลี่ยนสถานะเป็น ' + newStatus;
  if (newStatus === 'Completed') {
    var doneDate = found.completedAt ? toDateOnly_(found.completedAt) : toDateOnly_(new Date());
    defaultDetail = 'เปลี่ยนสถานะเป็น เสร็จสิ้น · วันเสร็จ ' + formatThaiDateShort_(doneDate);
  }
  var statusLog = addLog_(taskId, userId, 'Status Changed', payload.logDetail || defaultDetail);
  if (payload.notifyLine) notifyLine_('อัปเดตงาน: ' + found.title + ' → ' + newStatus);
  var assignee = findUserById_(found.assignedTo);
  if (assignee && assignee.notifyStatus && String(assignee.id) !== String(userId)) {
    notifyUserEmail_(assignee, 'สถานะงานเปลี่ยน', 'งาน "' + found.title + '" เปลี่ยนเป็น: ' + newStatus);
  }
  if (newStatus === 'Review') {
    notifyHeadsReview_(found.title);
  }
  invalidateBootstrapCache_();
  return { task: normalizeTask_(found), log: statusLog };
}

function forwardTask(payload) {
  openDatabase_(false);
  var taskId = String(payload.taskId);
  var newAssigneeId = String(payload.newAssigneeId);
  var userId = String(payload.userId || '');
  var sheet = getSheet_(TASKS_SHEET);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idIdx = headers.indexOf('id');
  var assignedIdx = headers.indexOf('assignedTo');
  var statusIdx = headers.indexOf('status');
  var found = null;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) === taskId) {
      sheet.getRange(i + 1, assignedIdx + 1).setValue(newAssigneeId);
      sheet.getRange(i + 1, statusIdx + 1).setValue('Pending');
      found = rowToObject_(headers, data[i]);
      found.assignedTo = newAssigneeId;
      found.status = 'Pending';
      break;
    }
  }
  if (!found) throw new Error('ไม่พบงาน');
  var name = findUserName_(newAssigneeId);
  var fwdLog = addLog_(taskId, userId, 'Forwarded', 'โอนงานให้ ' + name);
  var newAssignee = findUserById_(newAssigneeId);
  if (newAssignee && newAssignee.notifyAssign) {
    notifyUserEmail_(newAssignee, 'ได้รับโอนงาน', 'คุณได้รับโอนงาน: "' + (found.title || '') + '"');
  }
  invalidateBootstrapCache_();
  return { task: normalizeTask_(found), log: fwdLog };
}

function takeoverTask(payload) {
  openDatabase_(false);
  var taskId = String(payload.taskId);
  var userId = String(payload.userId);
  var sheet = getSheet_(TASKS_SHEET);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idIdx = headers.indexOf('id');
  var assignedIdx = headers.indexOf('assignedTo');
  var statusIdx = headers.indexOf('status');
  var found = null;
  var oldAssignee = '';

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) === taskId) {
      oldAssignee = String(data[i][assignedIdx]);
      sheet.getRange(i + 1, assignedIdx + 1).setValue(userId);
      sheet.getRange(i + 1, statusIdx + 1).setValue('In Progress');
      found = rowToObject_(headers, data[i]);
      found.assignedTo = userId;
      found.status = 'In Progress';
      break;
    }
  }
  if (!found) throw new Error('ไม่พบงาน');
  var takeLog = addLog_(taskId, userId, 'Takeover', 'ดึงงานมาจาก ' + findUserName_(oldAssignee) + ' เพื่อดำเนินการต่อ');
  invalidateBootstrapCache_();
  return { task: normalizeTask_(found), log: takeLog };
}

function addComment(payload) {
  openDatabase_(false);
  var row = {
    id: 'c_' + Date.now(),
    taskId: String(payload.taskId),
    timestamp: new Date().toISOString(),
    authorId: String(payload.authorId || ''),
    text: String(payload.text || '').trim()
  };
  if (!row.text) throw new Error('ข้อความว่าง');
  appendObject_(COMMENTS_SHEET, COMMENT_HEADERS, row);
  invalidateBootstrapCache_();
  return {
    id: String(row.id),
    taskId: isFinite(Number(row.taskId)) ? Number(row.taskId) : String(row.taskId),
    timestamp: row.timestamp,
    authorId: String(row.authorId || ''),
    text: String(row.text || '')
  };
}

/** Personal sticky notes — Google Keep–style fields, scoped to payload.userId */
function listStickyNotes(payload) {
  openDatabase_(false);
  var userId = String((payload && payload.userId) || '');
  if (!userId) throw new Error('ต้องระบุผู้ใช้');
  var cache = CacheService.getScriptCache();
  var key = stickyCacheKey_(userId);
  if (!payload || !payload.force) {
    try {
      var cached = cache.get(key);
      if (cached) return JSON.parse(cached);
    } catch (e) { /* read Sheets below */ }
  }
  var rows = listStickyNotesForUser_(userId);
  try {
    var json = JSON.stringify(rows);
    if (json.length < 95000) cache.put(key, json, 120);
  } catch (e2) { /* cache is optional */ }
  return rows;
}

function stickyCacheKey_(userId) {
  return 'gtp_sticky_' + String(userId || '').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80);
}

function invalidateStickyCache_(userId) {
  try {
    CacheService.getScriptCache().remove(stickyCacheKey_(userId));
  } catch (e) { /* ignore */ }
}

function boolFlag_(v, fallback) {
  if (v === undefined || v === null || v === '') return !!fallback;
  if (v === true || v === false) return v;
  var s = String(v).toUpperCase();
  if (s === 'TRUE' || s === '1' || s === 'YES') return true;
  if (s === 'FALSE' || s === '0' || s === 'NO') return false;
  return !!fallback;
}

function parseStickyItems_(raw) {
  if (raw === undefined || raw === null || raw === '') return [];
  if (Object.prototype.toString.call(raw) === '[object Array]') return raw;
  try {
    var parsed = JSON.parse(String(raw));
    if (Object.prototype.toString.call(parsed) === '[object Array]') return parsed;
  } catch (e) { /* ignore */ }
  return [];
}

function stringifyStickyItems_(items) {
  var list = parseStickyItems_(items);
  var out = [];
  for (var i = 0; i < list.length; i++) {
    var it = list[i] || {};
    out.push({
      id: String(it.id || ('i_' + i + '_' + Date.now())),
      text: String(it.text || ''),
      done: !!it.done
    });
  }
  return JSON.stringify(out);
}

function parseStickyLabels_(raw) {
  if (raw === undefined || raw === null || raw === '') return [];
  if (Object.prototype.toString.call(raw) === '[object Array]') {
    return raw.map(function (x) { return String(x || '').trim(); }).filter(Boolean);
  }
  var s = String(raw).trim();
  if (!s) return [];
  if (s.charAt(0) === '[') {
    try {
      var parsed = JSON.parse(s);
      if (Object.prototype.toString.call(parsed) === '[object Array]') {
        return parsed.map(function (x) { return String(x || '').trim(); }).filter(Boolean);
      }
    } catch (e) { /* fall through */ }
  }
  return s.split(/[,|]/).map(function (x) { return String(x || '').trim(); }).filter(Boolean);
}

function stringifyStickyLabels_(labels) {
  return parseStickyLabels_(labels).join(',');
}

function createStickyNote(payload) {
  openDatabase_(false);
  ensureStickyHeaders_();
  var userId = String(payload.userId || '');
  if (!userId) throw new Error('ต้องระบุผู้ใช้');
  var now = new Date().toISOString();
  var color = String(payload.color || 'yellow');
  if (STICKY_COLORS.indexOf(color) < 0) color = 'yellow';
  var noteType = String(payload.noteType || 'text') === 'list' ? 'list' : 'text';
  var existing = listStickyNotesForUser_(userId);
  var maxZ = 1;
  for (var i = 0; i < existing.length; i++) {
    if ((existing[i].zIndex || 0) > maxZ) maxZ = existing[i].zIndex;
  }
  var offset = (existing.length % 8) * 28;
  var itemsJson = stringifyStickyItems_(payload.items);
  if (noteType === 'list' && itemsJson === '[]' && payload.body) {
    var lines = String(payload.body || '').split(/\r?\n/);
    var bootItems = [];
    for (var li = 0; li < lines.length; li++) {
      var text = String(lines[li] || '').replace(/^[\-\*\u2022]\s*/, '').trim();
      if (!text) continue;
      bootItems.push({ id: 'i_' + Date.now() + '_' + li, text: text, done: false });
    }
    itemsJson = stringifyStickyItems_(bootItems);
  }
  var row = {
    id: 'sn_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    userId: userId,
    title: String(payload.title || '').trim(),
    body: noteType === 'list' ? '' : String(payload.body || ''),
    color: color,
    emoji: String(payload.emoji || '').trim().slice(0, 8),
    x: payload.x !== undefined && payload.x !== '' ? Number(payload.x) : 40 + offset,
    y: payload.y !== undefined && payload.y !== '' ? Number(payload.y) : 40 + offset,
    width: payload.width !== undefined && payload.width !== '' ? Number(payload.width) : 240,
    height: payload.height !== undefined && payload.height !== '' ? Number(payload.height) : 220,
    zIndex: payload.zIndex !== undefined && payload.zIndex !== '' ? Number(payload.zIndex) : maxZ + 1,
    createdAt: now,
    updatedAt: now,
    noteType: noteType,
    items: itemsJson,
    labels: stringifyStickyLabels_(payload.labels),
    pinned: boolFlag_(payload.pinned, false) ? 'TRUE' : 'FALSE',
    archived: boolFlag_(payload.archived, false) ? 'TRUE' : 'FALSE',
    trashed: 'FALSE',
    reminderAt: payload.reminderAt ? String(payload.reminderAt) : '',
    imageUrl: String(payload.imageUrl || '').trim()
  };
  appendObject_(STICKY_NOTES_SHEET, STICKY_NOTE_HEADERS, row);
  invalidateStickyCache_(userId);
  return normalizeStickyNote_(row);
}

/** Ensure StickyNotes has Keep columns (trashed/archived/…) even if SCHEMA already matched */
function ensureStickyHeaders_() {
  var ss = openDatabase_(false);
  ensureSheetWithHeaders_(ss, STICKY_NOTES_SHEET, STICKY_NOTE_HEADERS);
  try { delete _sheetHeaderCache[STICKY_NOTES_SHEET]; } catch (e) {}
}

function updateStickyNote(payload) {
  openDatabase_(false);
  ensureStickyHeaders_();
  var id = String(payload.id || '');
  var userId = String(payload.userId || '');
  if (!id) throw new Error('ไม่พบโน้ต');
  if (!userId) throw new Error('ต้องระบุผู้ใช้');
  var existing = findStickyNoteOwned_(id, userId);
  if (!existing) throw new Error('ไม่พบโน้ต หรือไม่มีสิทธิ์แก้ไข');

  var updates = { updatedAt: new Date().toISOString() };
  if (payload.title !== undefined) updates.title = String(payload.title || '').trim();
  if (payload.body !== undefined) updates.body = String(payload.body || '');
  if (payload.color !== undefined) {
    var color = String(payload.color || 'yellow');
    updates.color = STICKY_COLORS.indexOf(color) >= 0 ? color : existing.color;
  }
  if (payload.emoji !== undefined) updates.emoji = String(payload.emoji || '').trim().slice(0, 8);
  if (payload.x !== undefined) updates.x = Number(payload.x) || 0;
  if (payload.y !== undefined) updates.y = Number(payload.y) || 0;
  if (payload.width !== undefined) updates.width = Math.max(160, Number(payload.width) || 220);
  if (payload.height !== undefined) updates.height = Math.max(140, Number(payload.height) || 200);
  if (payload.zIndex !== undefined) updates.zIndex = Number(payload.zIndex) || 1;
  if (payload.noteType !== undefined) updates.noteType = String(payload.noteType) === 'list' ? 'list' : 'text';
  if (payload.items !== undefined) updates.items = stringifyStickyItems_(payload.items);
  if (payload.labels !== undefined) updates.labels = stringifyStickyLabels_(payload.labels);
  if (payload.pinned !== undefined) updates.pinned = boolFlag_(payload.pinned, false) ? 'TRUE' : 'FALSE';
  if (payload.archived !== undefined) updates.archived = boolFlag_(payload.archived, false) ? 'TRUE' : 'FALSE';
  if (payload.trashed !== undefined) updates.trashed = boolFlag_(payload.trashed, false) ? 'TRUE' : 'FALSE';
  if (payload.reminderAt !== undefined) updates.reminderAt = payload.reminderAt ? String(payload.reminderAt) : '';
  if (payload.imageUrl !== undefined) updates.imageUrl = String(payload.imageUrl || '').trim();

  var found = updateRowById_(STICKY_NOTES_SHEET, id, updates);
  if (!found) throw new Error('ไม่พบโน้ต');
  invalidateStickyCache_(userId);
  return normalizeStickyNote_(found);
}

function deleteStickyNote(payload) {
  openDatabase_(false);
  ensureStickyHeaders_();
  var id = String(payload.id || '');
  var userId = String(payload.userId || '');
  if (!id) throw new Error('ไม่พบโน้ต');
  if (!userId) throw new Error('ต้องระบุผู้ใช้');
  var existing = findStickyNoteOwned_(id, userId);
  if (!existing) throw new Error('ไม่พบโน้ต หรือไม่มีสิทธิ์ลบ');

  var permanent = boolFlag_(payload.permanent, false) || existing.trashed;
  if (!permanent) {
    var soft = updateRowById_(STICKY_NOTES_SHEET, id, {
      trashed: 'TRUE',
      archived: 'FALSE',
      updatedAt: new Date().toISOString()
    });
    if (!soft) throw new Error('ย้ายไปถังขยะไม่สำเร็จ');
    var normalized = normalizeStickyNote_(soft);
    // If column was missing before ensure, re-read after forced header repair
    if (!normalized.trashed) {
      ensureStickyHeaders_();
      soft = updateRowById_(STICKY_NOTES_SHEET, id, {
        trashed: 'TRUE',
        archived: 'FALSE',
        updatedAt: new Date().toISOString()
      });
      if (!soft) throw new Error('ย้ายไปถังขยะไม่สำเร็จ');
      normalized = normalizeStickyNote_(soft);
    }
    if (!normalized.trashed) {
      throw new Error('ชีต StickyNotes ยังไม่มีคอลัมน์ถังขยะ — รีเฟรชหน้าแล้วลองใหม่');
    }
    invalidateStickyCache_(userId);
    return { ok: true, id: id, trashed: true, note: normalized };
  }

  var sheet = getSheet_(STICKY_NOTES_SHEET);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idIdx = headers.indexOf('id');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) === id) {
      sheet.deleteRow(i + 1);
      invalidateStickyCache_(userId);
      return { ok: true, id: id, deleted: true };
    }
  }
  throw new Error('ไม่พบโน้ต');
}

function emptyStickyTrash(payload) {
  openDatabase_(false);
  ensureStickyHeaders_();
  var userId = String((payload && payload.userId) || '');
  if (!userId) throw new Error('ต้องระบุผู้ใช้');
  var sheet = getSheet_(STICKY_NOTES_SHEET);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return { ok: true, removed: 0 };
  var headers = data[0];
  var idIdx = headers.indexOf('id');
  var userIdx = headers.indexOf('userId');
  var trashIdx = headers.indexOf('trashed');
  if (trashIdx < 0) return { ok: true, removed: 0 };
  var removed = 0;
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][userIdx]) !== String(userId)) continue;
    var trashed = boolFlag_(data[i][trashIdx], false);
    if (!trashed) continue;
    sheet.deleteRow(i + 1);
    removed++;
  }
  invalidateStickyCache_(userId);
  return { ok: true, removed: removed };
}

function duplicateStickyNote(payload) {
  openDatabase_(false);
  var id = String(payload.id || '');
  var userId = String(payload.userId || '');
  if (!id || !userId) throw new Error('ไม่พบโน้ต');
  var existing = findStickyNoteOwned_(id, userId);
  if (!existing) throw new Error('ไม่พบโน้ต หรือไม่มีสิทธิ์');
  return createStickyNote({
    userId: userId,
    title: (existing.title || 'โน้ต') + ' (สำเนา)',
    body: existing.body,
    color: existing.color,
    emoji: existing.emoji,
    noteType: existing.noteType,
    items: existing.items,
    labels: existing.labels,
    pinned: false,
    archived: false,
    reminderAt: existing.reminderAt || '',
    imageUrl: existing.imageUrl || '',
    x: (existing.x || 40) + 24,
    y: (existing.y || 40) + 24,
    width: existing.width,
    height: existing.height
  });
}

function ping() {
  return { ok: true, version: '1.0.0', time: new Date().toISOString() };
}

// --- Sheet helpers ---

/**
 * Open spreadsheet once per execution.
 * @param {boolean} forceMigrate - if true, always ensure sheet headers
 */
function openDatabase_(forceMigrate) {
  if (_ssCache) return _ssCache;

  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty('SPREADSHEET_ID');
  var ss;

  if (sheetId) {
    try {
      ss = SpreadsheetApp.openById(sheetId);
    } catch (e) {
      sheetId = null;
    }
  }

  if (!ss) {
    ss = SpreadsheetApp.create('GovTaskPro_Database');
    props.setProperty('SPREADSHEET_ID', ss.getId());
    props.setProperty('SCHEMA_VERSION', '');
    forceMigrate = true;
  }

  if (forceMigrate) {
    ensureSheets_(ss);
  }

  _ssCache = ss;
  return ss;
}

function ensureDatabase_() {
  return openDatabase_(false);
}

/** Run seed/migrate only when SCHEMA_VERSION mismatches */
function maybeMigrateAndSeed_(ss) {
  var props = PropertiesService.getScriptProperties();
  var version = props.getProperty('SCHEMA_VERSION') || '';
  if (version === SCHEMA_VERSION) {
    ensureAdminUser_();
    try { ensureOrgUnitsSeed_(); } catch (orgWarm) { /* non-fatal */ }
    return;
  }

  ensureSheets_(ss);
  ensureSeed_();
  try { ensureMilestoneDemo_(); } catch (msErr) { /* non-fatal */ }
  try { ensureProjectDates_(); } catch (pdErr) { /* non-fatal */ }
  try { ensureUserAuthDefaults_(); } catch (uaErr) { /* non-fatal */ }
  try { ensureOrgUnitsSeed_(); } catch (orgErr) { /* non-fatal */ }
  try { ensureProjectDepartments_(); } catch (pdDeptErr) { /* non-fatal */ }
  try { ensureDemoShowcase_(); } catch (demoErr) { /* non-fatal */ }
  ensureAdminUser_();
  props.setProperty('SCHEMA_VERSION', SCHEMA_VERSION);
}

function ensureSheets_(ss) {
  ensureSheetWithHeaders_(ss, USERS_SHEET, USER_HEADERS);
  ensureSheetWithHeaders_(ss, PROJECTS_SHEET, PROJECT_HEADERS);
  ensureSheetWithHeaders_(ss, TASKS_SHEET, TASK_HEADERS);
  ensureSheetWithHeaders_(ss, LOGS_SHEET, LOG_HEADERS);
  ensureSheetWithHeaders_(ss, COMMENTS_SHEET, COMMENT_HEADERS);
  ensureSheetWithHeaders_(ss, MILESTONES_SHEET, MILESTONE_HEADERS);
  ensureSheetWithHeaders_(ss, CONTRACT_EXTENSIONS_SHEET, CONTRACT_EXTENSION_HEADERS);
  ensureSheetWithHeaders_(ss, STICKY_NOTES_SHEET, STICKY_NOTE_HEADERS);
  ensureSheetWithHeaders_(ss, ORG_UNITS_SHEET, ORG_HEADERS);

  var sheets = ss.getSheets();
  if (sheets.length > 8) {
    for (var i = 0; i < sheets.length; i++) {
      var n = sheets[i].getName();
      if (n === 'Sheet1' && ss.getSheets().length > 1) {
        try { ss.deleteSheet(sheets[i]); } catch (e) {}
      }
    }
  }
}

function ensureSheetWithHeaders_(ss, name, headers) {
  try { delete _sheetHeaderCache[name]; } catch (e) {}
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return sheet;
  }
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
    return String(h || '');
  });
  for (var i = 0; i < headers.length; i++) {
    if (existing.indexOf(headers[i]) === -1) {
      var col = existing.length + 1;
      sheet.getRange(1, col).setValue(headers[i]);
      existing.push(headers[i]);
    }
  }
  sheet.setFrozenRows(1);
  return sheet;
}

function getSheet_(name) {
  var ss = openDatabase_(false);
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    ensureSheets_(ss);
    sheet = ss.getSheetByName(name);
  }
  return sheet;
}

function getCachedHeaders_(sheet, sheetName, minCols) {
  if (sheetName && _sheetHeaderCache[sheetName]) return _sheetHeaderCache[sheetName];
  var lastCol = Math.max(sheet.getLastColumn(), minCols || 1);
  var sheetHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if (sheetName) _sheetHeaderCache[sheetName] = sheetHeaders;
  return sheetHeaders;
}

function appendObject_(sheetName, headers, obj) {
  var sheet = getSheet_(sheetName);
  var sheetHeaders = getCachedHeaders_(sheet, sheetName, headers.length);
  var row = [];
  for (var i = 0; i < sheetHeaders.length; i++) {
    var h = String(sheetHeaders[i] || '');
    if (!h) {
      row.push('');
      continue;
    }
    var v = obj[h];
    row.push(v === null || v === undefined ? '' : v);
  }
  sheet.appendRow(row);
}

function updateRowById_(sheetName, id, updates) {
  var sheet = getSheet_(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  var headers = data[0];
  var idIdx = headers.indexOf('id');
  if (idIdx < 0) return null;
  var colCount = headers.length;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) !== String(id)) continue;
    var changed = false;
    for (var key in updates) {
      if (!Object.prototype.hasOwnProperty.call(updates, key)) continue;
      if (updates[key] === undefined) continue;
      var col = headers.indexOf(key);
      if (col < 0) continue;
      data[i][col] = updates[key] === null ? '' : updates[key];
      changed = true;
    }
    if (changed) {
      var writeRow = [];
      for (var c = 0; c < colCount; c++) writeRow.push(data[i][c]);
      sheet.getRange(i + 1, 1, 1, colCount).setValues([writeRow]);
    }
    return rowToObject_(headers, data[i]);
  }
  return null;
}

/** Filter by taskId in one pass (avoids map-all-then-filter) */
function listByTaskId_(sheetName, taskId) {
  var sheet = getSheet_(sheetName);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0];
  var taskIdx = headers.indexOf('taskId');
  if (taskIdx < 0) return [];
  var needle = String(taskId);
  var out = [];
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][taskIdx]) !== needle) continue;
    if (!values[i][0] && values[i].every(function (c) { return c === ''; })) continue;
    out.push(rowToObject_(headers, values[i]));
  }
  return out;
}

function listObjectsFromSheet_(sheet) {
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0];
  var out = [];
  for (var i = 1; i < values.length; i++) {
    if (!values[i][0] && values[i].every(function (c) { return c === ''; })) continue;
    out.push(rowToObject_(headers, values[i]));
  }
  return out;
}

function listObjects_(sheetName) {
  return listObjectsFromSheet_(getSheet_(sheetName));
}

function rowToObject_(headers, row) {
  var obj = {};
  for (var i = 0; i < headers.length; i++) {
    obj[String(headers[i])] = row[i];
  }
  return obj;
}

function listUsersFromSs_(ss) {
  return listObjectsFromSheet_(ss.getSheetByName(USERS_SHEET)).map(normalizeUser_);
}

function listUsersRaw_() {
  return listObjects_(USERS_SHEET);
}

function normalizeUser_(u) {
  function flag(v, defVal) {
    if (v === undefined || v === null || v === '') return defVal;
    var s = String(v).toUpperCase();
    if (s === 'FALSE' || s === '0' || s === 'NO') return false;
    if (s === 'TRUE' || s === '1' || s === 'YES') return true;
    return defVal;
  }
  var role = String(u.role || 'Staff');
  return {
    id: String(u.id),
    name: String(u.name || ''),
    role: role,
    department: String(u.department || ''),
    division: String(u.division || ''),
    active: String(u.active) !== 'FALSE',
    email: String(u.email || ''),
    notifyEmail: flag(u.notifyEmail, false),
    notifyAssign: flag(u.notifyAssign, true),
    notifyStatus: flag(u.notifyStatus, true),
    notifyReview: flag(u.notifyReview, role === 'Head'),
    notifyLineDefault: flag(u.notifyLineDefault, true),
    username: String(u.username || '').trim()
    // password never returned to client (except adminGetUsers / adminUpdate*)
  };
}

function normalizeUserAdmin_(u) {
  var base = normalizeUser_(u);
  base.password = String(u.password || '');
  return base;
}

function normalizeOrgUnit_(o) {
  var name = String(o.name || '').trim();
  var code = String(o.code || '').trim();
  if (!code && name) code = name.replace(/\s+/g, '').toUpperCase();
  return {
    id: String(o.id),
    type: String(o.type || 'department') === 'division' ? 'division' : 'department',
    name: name,
    parent: String(o.parent || '').trim(),
    active: String(o.active) !== 'FALSE',
    code: code
  };
}

function listOrgUnitsFromSs_(ss) {
  var sheet = ss.getSheetByName(ORG_UNITS_SHEET);
  if (!sheet) return [];
  return listObjectsFromSheet_(sheet).map(normalizeOrgUnit_).filter(function (o) {
    return o.active && o.name;
  });
}

function listOrgUnitsRaw_() {
  return listObjects_(ORG_UNITS_SHEET);
}

function requireAdmin_(adminId) {
  var admin = findUserById_(adminId);
  if (!admin || admin.role !== 'Admin' || !admin.active) {
    throw new Error('ไม่มีสิทธิ์แอดมิน');
  }
  return admin;
}

function findDeptByCode_(code) {
  var needle = String(code || '').trim().toLowerCase();
  if (!needle) return null;
  var raw = listOrgUnitsRaw_();
  for (var i = 0; i < raw.length; i++) {
    var o = raw[i];
    if (String(o.type) !== 'department') continue;
    if (String(o.active).toUpperCase() === 'FALSE') continue;
    var c = String(o.code || '').trim().toLowerCase();
    var n = String(o.name || '').trim().toLowerCase();
    if (!c) c = n.replace(/\s+/g, '');
    if (c === needle || n === needle || n.replace(/\s+/g, '') === needle) {
      return normalizeOrgUnit_(o);
    }
  }
  return null;
}

/** Staff/Head: รหัสแผนก + username (legacy) */
function loginDept(payload) {
  openDatabase_(false);
  var departmentCode = String(payload.departmentCode || '').trim();
  var username = String(payload.username || '').trim().toLowerCase();
  if (!departmentCode) throw new Error('กรอกรหัสแผนก');
  if (!username) throw new Error('กรอกชื่อผู้ใช้');

  var dept = findDeptByCode_(departmentCode);
  if (!dept) throw new Error('รหัสแผนกไม่ถูกต้อง');

  var raw = listUsersRaw_();
  for (var i = 0; i < raw.length; i++) {
    var u = raw[i];
    var uname = String(u.username || '').trim().toLowerCase();
    if (!uname) uname = String(u.id || '').trim().toLowerCase();
    if (uname !== username) continue;
    if (String(u.active).toUpperCase() === 'FALSE') throw new Error('บัญชีถูกปิดการใช้งาน');
    if (String(u.role) === 'Admin') {
      throw new Error('บัญชีแอดมินต้องเข้าสู่ระบบด้วย Username และรหัสผ่าน');
    }
    var userDept = String(u.department || '').trim().toLowerCase();
    if (userDept !== String(dept.name).trim().toLowerCase()) {
      throw new Error('Username นี้ไม่อยู่ในแผนกที่ระบุ');
    }
    return normalizeUser_(u);
  }
  throw new Error('ไม่พบชื่อผู้ใช้ในแผนกนี้');
}

/** Staff/Head: เปิดแผนกด้วยรหัส → ได้รายชื่อให้เลือก */
function listDeptUsersForLogin(payload) {
  openDatabase_(false);
  var departmentCode = String(payload.departmentCode || '').trim();
  if (!departmentCode) throw new Error('กรอก Username แผนก');

  var dept = findDeptByCode_(departmentCode);
  if (!dept) throw new Error('Username แผนกไม่ถูกต้อง');

  var deptName = String(dept.name || '').trim().toLowerCase();
  var users = [];
  var raw = listUsersRaw_();
  for (var i = 0; i < raw.length; i++) {
    var u = raw[i];
    if (String(u.active).toUpperCase() === 'FALSE') continue;
    if (String(u.role) === 'Admin') continue;
    if (String(u.department || '').trim().toLowerCase() !== deptName) continue;
    users.push({
      id: String(u.id),
      name: String(u.name || ''),
      role: String(u.role || 'Staff'),
      division: String(u.division || ''),
      department: String(u.department || '')
    });
  }
  users.sort(function (a, b) {
    var ra = a.role === 'Head' ? 0 : 1;
    var rb = b.role === 'Head' ? 0 : 1;
    if (ra !== rb) return ra - rb;
    return String(a.name).localeCompare(String(b.name), 'th');
  });
  if (!users.length) throw new Error('แผนกนี้ยังไม่มีผู้ใช้ที่ใช้งานได้');

  return {
    department: dept,
    users: users
  };
}

/** Staff/Head: เลือกชื่อตัวเองหลังเปิดแผนก */
function loginDeptPick(payload) {
  openDatabase_(false);
  var departmentCode = String(payload.departmentCode || '').trim();
  var userId = String(payload.userId || '').trim();
  if (!departmentCode) throw new Error('กรอก Username แผนก');
  if (!userId) throw new Error('เลือกชื่อผู้ใช้');

  var dept = findDeptByCode_(departmentCode);
  if (!dept) throw new Error('Username แผนกไม่ถูกต้อง');

  var raw = listUsersRaw_();
  for (var i = 0; i < raw.length; i++) {
    var u = raw[i];
    if (String(u.id) !== userId) continue;
    if (String(u.active).toUpperCase() === 'FALSE') throw new Error('บัญชีถูกปิดการใช้งาน');
    if (String(u.role) === 'Admin') {
      throw new Error('บัญชีแอดมินกดปุ่ม "แอดมิน" มุมบนขวา แล้วใส่รหัสผ่าน');
    }
    if (String(u.department || '').trim().toLowerCase() !== String(dept.name).trim().toLowerCase()) {
      throw new Error('ผู้ใช้นี้ไม่อยู่ในแผนกที่ระบุ');
    }
    return normalizeUser_(u);
  }
  throw new Error('ไม่พบผู้ใช้ในแผนกนี้');
}

/** Staff/Head: กรอกแค่ username (legacy) */
function loginStaff(payload) {
  openDatabase_(false);
  var username = String(payload.username || '').trim().toLowerCase();
  if (!username) throw new Error('กรอกชื่อผู้ใช้');

  var raw = listUsersRaw_();
  for (var i = 0; i < raw.length; i++) {
    var u = raw[i];
    var uname = String(u.username || '').trim().toLowerCase();
    if (!uname) uname = String(u.id || '').trim().toLowerCase();
    if (uname !== username) continue;
    if (String(u.active).toUpperCase() === 'FALSE') throw new Error('บัญชีถูกปิดการใช้งาน');
    if (String(u.role) === 'Admin') {
      throw new Error('บัญชีแอดมินกดปุ่ม "แอดมิน" มุมบนขวา แล้วใส่รหัสผ่าน');
    }
    if (!String(u.department || '').trim()) {
      throw new Error('บัญชีนี้ยังไม่ได้ผูกแผนก — ติดต่อแอดมิน');
    }
    return normalizeUser_(u);
  }
  throw new Error('ไม่พบชื่อผู้ใช้นี้');
}

/** แอดมิน: username + password */
function loginAdmin(payload) {
  openDatabase_(false);
  var username = String(payload.username || '').trim().toLowerCase();
  var password = String(payload.password || '');
  if (!username || !password) throw new Error('กรอกชื่อผู้ใช้และรหัสผ่าน');

  var raw = listUsersRaw_();
  for (var i = 0; i < raw.length; i++) {
    var u = raw[i];
    var uname = String(u.username || '').trim().toLowerCase();
    if (!uname) uname = String(u.id || '').trim().toLowerCase();
    if (uname !== username) continue;
    if (String(u.active).toUpperCase() === 'FALSE') throw new Error('บัญชีถูกปิดการใช้งาน');
    if (String(u.role) !== 'Admin') {
      throw new Error('โหมดนี้สำหรับแอดมินเท่านั้น — พนักงาน/หัวหน้าใส่รหัสแผนกแล้วเลือกชื่อ');
    }
    if (String(u.password || '') !== password) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    return normalizeUser_(u);
  }
  throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
}

function login(payload) {
  // backward compatible: route by role after password match
  openDatabase_(false);
  var username = String(payload.username || '').trim().toLowerCase();
  var password = String(payload.password || '');
  if (!username || !password) throw new Error('กรอกชื่อผู้ใช้และรหัสผ่าน');

  var raw = listUsersRaw_();
  for (var i = 0; i < raw.length; i++) {
    var u = raw[i];
    var uname = String(u.username || '').trim().toLowerCase();
    if (!uname) uname = String(u.id || '').trim().toLowerCase();
    if (uname !== username) continue;
    if (String(u.active).toUpperCase() === 'FALSE') throw new Error('บัญชีถูกปิดการใช้งาน');
    if (String(u.password || '') !== password) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    return normalizeUser_(u);
  }
  throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
}

function changePassword(payload) {
  openDatabase_(false);
  var userId = String(payload.userId || '');
  var currentPassword = String(payload.currentPassword || '');
  var newPassword = String(payload.newPassword || '');
  if (!userId) throw new Error('ไม่พบผู้ใช้');
  if (!newPassword || newPassword.length < 4) throw new Error('รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร');

  var raw = listUsersRaw_();
  for (var i = 0; i < raw.length; i++) {
    if (String(raw[i].id) !== userId) continue;
    if (String(raw[i].password || '') !== currentPassword) {
      throw new Error('รหัสผ่านปัจจุบันไม่ถูกต้อง');
    }
    var found = updateRowById_(USERS_SHEET, userId, { password: newPassword });
    if (!found) throw new Error('ไม่พบผู้ใช้');
    invalidateBootstrapCache_();
    return { ok: true };
  }
  throw new Error('ไม่พบผู้ใช้');
}

function adminGetUsers(payload) {
  openDatabase_(false);
  requireAdmin_(payload.adminId);
  ensureAdminUser_();
  return listUsersRaw_().map(normalizeUserAdmin_);
}

function adminCreateUser(payload) {
  openDatabase_(false);
  requireAdmin_(payload.adminId);
  var name = String(payload.name || '').trim();
  var role = String(payload.role || 'Staff');
  var department = String(payload.department || '').trim();
  var username = String(payload.username || '').trim();
  var password = String(payload.password || '');
  if (!name) throw new Error('กรอกชื่อแสดง');
  if (['Staff', 'Head', 'Admin'].indexOf(role) < 0) throw new Error('บทบาทไม่ถูกต้อง');
  if (!department) {
    department = role === 'Admin' ? 'SYSTEM' : '';
  }
  if (!department) throw new Error('ต้องระบุแผนก');

  // พนักงาน/หัวหน้า: ไม่ใช้รหัสผ่านล็อกอิน — แอดมินเท่านั้นที่ต้องมี username+password
  if (role === 'Admin') {
    if (!username || !password) throw new Error('แอดมินต้องมี Username และรหัสผ่าน');
    if (password.length < 4) throw new Error('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
  } else {
    if (!username) {
      username = String(name).replace(/\s+/g, '').toLowerCase() || ('user' + Date.now());
    }
    if (!password) password = '-';
  }

  var raw = listUsersRaw_();
  if (!username) username = 'user' + Date.now();
  var lower = username.toLowerCase();
  var guard = 0;
  while (guard < 20) {
    var clash = false;
    for (var i = 0; i < raw.length; i++) {
      var existing = String(raw[i].username || raw[i].id || '').trim().toLowerCase();
      if (existing === lower) { clash = true; break; }
    }
    if (!clash) break;
    if (role === 'Admin') throw new Error('Username นี้ถูกใช้แล้ว');
    username = username + '_' + String(Date.now() + guard).slice(-4);
    lower = username.toLowerCase();
    guard++;
  }
  if (guard >= 20) throw new Error('สร้าง Username อ้างอิงไม่สำเร็จ');

  var row = {
    id: 'u_' + Date.now(),
    name: name,
    role: role,
    department: department,
    division: String(payload.division || '').trim(),
    active: 'TRUE',
    email: '',
    notifyEmail: 'FALSE',
    notifyAssign: 'TRUE',
    notifyStatus: 'TRUE',
    notifyReview: role === 'Head' || role === 'Admin' ? 'TRUE' : 'FALSE',
    notifyLineDefault: 'TRUE',
    username: username,
    password: password
  };
  appendObject_(USERS_SHEET, USER_HEADERS, row);
  try { upsertOrgFromUserFields_(row.department, row.division); } catch (e) {}
  invalidateBootstrapCache_();
  return normalizeUserAdmin_(row);
}

function adminUpdateUser(payload) {
  openDatabase_(false);
  requireAdmin_(payload.adminId);
  var userId = String(payload.userId || '');
  if (!userId) throw new Error('ไม่พบผู้ใช้');

  var updates = {};
  if (payload.name !== undefined) {
    var name = String(payload.name || '').trim();
    if (!name) throw new Error('ชื่อจำเป็น');
    updates.name = name;
  }
  if (payload.role !== undefined) {
    var role = String(payload.role || '');
    if (['Staff', 'Head', 'Admin'].indexOf(role) < 0) throw new Error('บทบาทไม่ถูกต้อง');
    if (String(userId) === String(payload.adminId) && role !== 'Admin') {
      throw new Error('ลดสิทธิ์แอดมินของตัวเองไม่ได้');
    }
    updates.role = role;
    if (role === 'Head' || role === 'Admin') updates.notifyReview = 'TRUE';
  }
  if (payload.department !== undefined) {
    var dept = String(payload.department || '').trim();
    if (!dept) throw new Error('ต้องระบุแผนก (1 Username ต่อ 1 แผนก)');
    updates.department = dept;
  }
  if (payload.division !== undefined) updates.division = String(payload.division || '').trim();
  if (payload.username !== undefined) {
    var username = String(payload.username || '').trim();
    if (!username) throw new Error('Username จำเป็น');
    var rawUsers = listUsersRaw_();
    var lower = username.toLowerCase();
    for (var i = 0; i < rawUsers.length; i++) {
      if (String(rawUsers[i].id) === userId) continue;
      var existing = String(rawUsers[i].username || rawUsers[i].id || '').trim().toLowerCase();
      if (existing === lower) throw new Error('Username นี้ถูกใช้แล้ว (ใช้ได้คนเดียวทั้งระบบ)');
    }
    updates.username = username;
  }
  if (payload.password !== undefined && String(payload.password) !== '') {
    if (String(payload.password).length < 4) throw new Error('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
    updates.password = String(payload.password);
  }
  if (payload.active !== undefined) {
    if (String(userId) === String(payload.adminId) && !payload.active) {
      throw new Error('ปิดบัญชีตัวเองไม่ได้');
    }
    updates.active = payload.active ? 'TRUE' : 'FALSE';
  }

  var keys = Object.keys(updates);
  if (!keys.length) throw new Error('ไม่มีข้อมูลที่ต้องอัปเดต');

  var found = updateRowById_(USERS_SHEET, userId, updates);
  if (!found) throw new Error('ไม่พบผู้ใช้');
  try {
    upsertOrgFromUserFields_(
      updates.department !== undefined ? updates.department : found.department,
      updates.division !== undefined ? updates.division : found.division
    );
  } catch (e2) {}
  invalidateBootstrapCache_();
  return normalizeUserAdmin_(found);
}

function adminResetPassword(payload) {
  openDatabase_(false);
  requireAdmin_(payload.adminId);
  var userId = String(payload.userId || '');
  var newPassword = String(payload.newPassword || '');
  if (!userId) throw new Error('ไม่พบผู้ใช้');
  if (!newPassword || newPassword.length < 4) throw new Error('รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร');
  var found = updateRowById_(USERS_SHEET, userId, { password: newPassword });
  if (!found) throw new Error('ไม่พบผู้ใช้');
  invalidateBootstrapCache_();
  return normalizeUserAdmin_(found);
}

function adminSetUserActive(payload) {
  openDatabase_(false);
  requireAdmin_(payload.adminId);
  var userId = String(payload.userId || '');
  if (!userId) throw new Error('ไม่พบผู้ใช้');
  if (String(userId) === String(payload.adminId)) throw new Error('ปิดบัญชีตัวเองไม่ได้');
  var found = updateRowById_(USERS_SHEET, userId, {
    active: payload.active ? 'TRUE' : 'FALSE'
  });
  if (!found) throw new Error('ไม่พบผู้ใช้');
  invalidateBootstrapCache_();
  return normalizeUserAdmin_(found);
}

function upsertOrgFromUserFields_(department, division) {
  var dept = String(department || '').trim();
  var div = String(division || '').trim();
  if (dept) ensureOrgUnitExists_('department', dept, '');
  if (div) ensureOrgUnitExists_('division', div, dept);
}

function ensureOrgUnitExists_(type, name, parent, codeOpt) {
  name = String(name || '').trim();
  if (!name) return null;
  parent = String(parent || '').trim();
  var code = String(codeOpt || '').trim();
  if (!code && type === 'department') code = name.replace(/\s+/g, '').toUpperCase();
  var raw = listOrgUnitsRaw_();
  for (var i = 0; i < raw.length; i++) {
    var o = raw[i];
    if (String(o.type) === type && String(o.name || '').trim().toLowerCase() === name.toLowerCase()) {
      var patch = {};
      if (type === 'division' && parent && String(o.parent || '').trim() !== parent) patch.parent = parent;
      if (String(o.active).toUpperCase() === 'FALSE') patch.active = 'TRUE';
      if (type === 'department' && code && !String(o.code || '').trim()) patch.code = code;
      if (Object.keys(patch).length) updateRowById_(ORG_UNITS_SHEET, String(o.id), patch);
      return String(o.id);
    }
  }
  var row = {
    id: 'org_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    type: type,
    name: name,
    parent: type === 'division' ? parent : '',
    active: 'TRUE',
    code: type === 'department' ? code : ''
  };
  appendObject_(ORG_UNITS_SHEET, ORG_HEADERS, row);
  return row.id;
}

function ensureOrgUnitsSeed_() {
  ensureSheets_(openDatabase_(false));
  var raw = listOrgUnitsRaw_();
  if (raw.length === 0) {
    ensureOrgUnitExists_('department', 'IT', '', 'IT');
    ensureOrgUnitExists_('department', 'SYSTEM', '', 'SYSTEM');
    ensureOrgUnitExists_('division', 'กองเทคโนโลยี', 'IT');
    ensureOrgUnitExists_('division', 'ผู้ดูแลระบบ', 'SYSTEM');
  }
  raw = listOrgUnitsRaw_();
  for (var r = 0; r < raw.length; r++) {
    if (String(raw[r].type) !== 'department') continue;
    if (String(raw[r].code || '').trim()) continue;
    var autoCode = String(raw[r].name || '').replace(/\s+/g, '').toUpperCase();
    if (autoCode) updateRowById_(ORG_UNITS_SHEET, String(raw[r].id), { code: autoCode });
  }
  var users = listUsersRaw_();
  for (var i = 0; i < users.length; i++) {
    upsertOrgFromUserFields_(users[i].department, users[i].division);
  }
}

function adminCreateOrgUnit(payload) {
  openDatabase_(false);
  requireAdmin_(payload.adminId);
  var type = String(payload.type || 'department') === 'division' ? 'division' : 'department';
  var name = String(payload.name || '').trim();
  var parent = String(payload.parent || '').trim();
  var code = String(payload.code || '').trim();
  if (!name) throw new Error('กรอกชื่อ' + (type === 'division' ? 'กอง' : 'แผนก'));
  if (type === 'division' && !parent) throw new Error('เลือกแผนกแม่ของกอง');
  if (type === 'department' && !code) code = name.replace(/\s+/g, '').toUpperCase();

  var raw = listOrgUnitsRaw_();
  for (var i = 0; i < raw.length; i++) {
    if (String(raw[i].type) === type && String(raw[i].name || '').trim().toLowerCase() === name.toLowerCase()
      && String(raw[i].active).toUpperCase() !== 'FALSE') {
      throw new Error((type === 'division' ? 'กอง' : 'แผนก') + 'นี้มีอยู่แล้ว');
    }
    if (type === 'department' && code) {
      var existingCode = String(raw[i].code || raw[i].name || '').replace(/\s+/g, '').toLowerCase();
      if (String(raw[i].type) === 'department' && existingCode === code.toLowerCase()
        && String(raw[i].active).toUpperCase() !== 'FALSE') {
        throw new Error('รหัสแผนกนี้ถูกใช้แล้ว');
      }
    }
  }
  if (type === 'division') {
    var parentOk = false;
    for (var j = 0; j < raw.length; j++) {
      if (String(raw[j].type) === 'department' && String(raw[j].name || '').trim() === parent
        && String(raw[j].active).toUpperCase() !== 'FALSE') {
        parentOk = true;
        break;
      }
    }
    if (!parentOk) {
      ensureOrgUnitExists_('department', parent, '');
    }
  }

  var row = {
    id: 'org_' + Date.now(),
    type: type,
    name: name,
    parent: type === 'division' ? parent : '',
    active: 'TRUE',
    code: type === 'department' ? code : ''
  };
  appendObject_(ORG_UNITS_SHEET, ORG_HEADERS, row);
  invalidateBootstrapCache_();
  return normalizeOrgUnit_(row);
}

/** แก้ Username แผนก (1 แผนก = 1 username) — ทุกคนในแผนกใช้รหัสนี้เข้า */
function adminUpdateOrgUnit(payload) {
  openDatabase_(false);
  requireAdmin_(payload.adminId);
  var id = String(payload.id || '');
  if (!id) throw new Error('ไม่พบแผนก');
  var raw = listOrgUnitsRaw_();
  var found = null;
  for (var i = 0; i < raw.length; i++) {
    if (String(raw[i].id) === id) {
      found = raw[i];
      break;
    }
  }
  if (!found) throw new Error('ไม่พบแผนก');
  if (String(found.type) !== 'department') throw new Error('แก้ Username ได้เฉพาะแผนก');

  var updates = {};
  if (payload.name !== undefined) {
    var name = String(payload.name || '').trim();
    if (!name) throw new Error('ชื่อแผนกจำเป็น');
    updates.name = name;
  }
  if (payload.code !== undefined) {
    var code = String(payload.code || '').trim().replace(/\s+/g, '').toUpperCase();
    if (!code) throw new Error('Username แผนกจำเป็น');
    for (var j = 0; j < raw.length; j++) {
      if (String(raw[j].id) === id) continue;
      if (String(raw[j].type) !== 'department') continue;
      if (String(raw[j].active).toUpperCase() === 'FALSE') continue;
      var existingCode = String(raw[j].code || raw[j].name || '').replace(/\s+/g, '').toUpperCase();
      if (existingCode === code) throw new Error('Username แผนกนี้ถูกใช้แล้ว');
    }
    updates.code = code;
  }
  if (!Object.keys(updates).length) throw new Error('ไม่มีข้อมูลที่ต้องอัปเดต');

  var row = updateRowById_(ORG_UNITS_SHEET, id, updates);
  if (!row) throw new Error('ไม่พบแผนก');
  invalidateBootstrapCache_();
  return normalizeOrgUnit_(row);
}

function adminDeleteOrgUnit(payload) {
  openDatabase_(false);
  requireAdmin_(payload.adminId);
  var id = String(payload.id || '');
  if (!id) throw new Error('ไม่พบรายการ');
  var found = updateRowById_(ORG_UNITS_SHEET, id, { active: 'FALSE' });
  if (!found) throw new Error('ไม่พบรายการ');
  invalidateBootstrapCache_();
  return { ok: true, id: id };
}

/** เติมข้อมูลตัวอย่างให้ครบทุกฟังก์ชัน (เพิ่มเฉพาะ id ที่ยังไม่มี) */
function adminSeedDemoData(payload) {
  openDatabase_(false);
  requireAdmin_(payload.adminId);
  var result = ensureDemoShowcase_();
  invalidateBootstrapCache_();
  return result;
}

function sheetHasId_(sheetName, id) {
  var rows = listObjects_(sheetName);
  var needle = String(id);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id) === needle) return true;
  }
  return false;
}

function ensureDemoShowcase_() {
  ensureSheets_(openDatabase_(false));
  var now = Date.now();
  var HOUR = 3600000;
  var DAY = 86400000;
  function d(n) { return dateOnly_(now + DAY * n); }
  function iso(n, h) { return new Date(now + DAY * n + HOUR * (h || 0)).toISOString(); }

  var added = { users: 0, projects: 0, tasks: 0, milestones: 0, contractExtensions: 0, orgs: 0, comments: 0, logs: 0, stickies: 0 };

  ensureOrgUnitExists_('department', 'IT', '', 'IT');
  ensureOrgUnitExists_('department', 'SYSTEM', '', 'SYSTEM');
  ensureOrgUnitExists_('department', 'HR', '', 'HR');
  ensureOrgUnitExists_('department', 'Finance', '', 'FIN');
  ensureOrgUnitExists_('division', 'กองเทคโนโลยี', 'IT');
  ensureOrgUnitExists_('division', 'ผู้ดูแลระบบ', 'SYSTEM');
  ensureOrgUnitExists_('division', 'กองบุคคล', 'HR');
  ensureOrgUnitExists_('division', 'กองงบประมาณ', 'Finance');
  added.orgs = 8;

  var demoUsers = [
    ['admin', 'ผู้ดูแลระบบ', 'Admin', 'SYSTEM', 'ผู้ดูแลระบบ', 'TRUE', 'admin@demo.local', 'TRUE', 'TRUE', 'TRUE', 'TRUE', 'TRUE', 'admin', '1234'],
    ['u1', 'คุณบอส (หัวหน้า IT)', 'Head', 'IT', 'กองเทคโนโลยี', 'TRUE', 'boss@demo.local', 'TRUE', 'TRUE', 'TRUE', 'TRUE', 'TRUE', 'boss', '1234'],
    ['u2', 'สมชาย (พนักงาน IT)', 'Staff', 'IT', 'กองเทคโนโลยี', 'TRUE', 'somchai@demo.local', 'TRUE', 'TRUE', 'TRUE', 'FALSE', 'TRUE', 'somchai', '1234'],
    ['u3', 'สมหญิง (พนักงาน IT)', 'Staff', 'IT', 'กองเทคโนโลยี', 'TRUE', '', 'FALSE', 'TRUE', 'TRUE', 'FALSE', 'TRUE', 'somying', '1234'],
    ['u4', 'สมศักดิ์ (พนักงาน IT)', 'Staff', 'IT', 'กองเทคโนโลยี', 'TRUE', '', 'FALSE', 'TRUE', 'TRUE', 'FALSE', 'TRUE', 'somsak', '1234'],
    ['u5', 'คุณนภา (หัวหน้า HR)', 'Head', 'HR', 'กองบุคคล', 'TRUE', 'hr@demo.local', 'TRUE', 'TRUE', 'TRUE', 'TRUE', 'TRUE', 'hrhead', '1234'],
    ['u6', 'มาลี (พนักงาน HR)', 'Staff', 'HR', 'กองบุคคล', 'TRUE', '', 'FALSE', 'TRUE', 'TRUE', 'FALSE', 'TRUE', 'mali', '1234'],
    ['u7', 'คุณวิชัย (หัวหน้าการเงิน)', 'Head', 'Finance', 'กองงบประมาณ', 'TRUE', '', 'FALSE', 'TRUE', 'TRUE', 'TRUE', 'TRUE', 'finhead', '1234'],
    ['u8', 'วิชัย (พนักงานการเงิน)', 'Staff', 'Finance', 'กองงบประมาณ', 'TRUE', '', 'FALSE', 'TRUE', 'TRUE', 'FALSE', 'TRUE', 'wichai', '1234'],
    ['u9', 'บัญชีปิดใช้ (ตัวอย่าง)', 'Staff', 'IT', 'กองเทคโนโลยี', 'FALSE', '', 'FALSE', 'TRUE', 'TRUE', 'FALSE', 'TRUE', 'olduser', '1234']
  ];
  for (var ui = 0; ui < demoUsers.length; ui++) {
    if (!sheetHasId_(USERS_SHEET, demoUsers[ui][0])) {
      writeRows_(getSheet_(USERS_SHEET), getSheet_(USERS_SHEET).getLastRow() + 1, [demoUsers[ui]]);
      added.users++;
    }
  }

  var demoProjects = [
    ['p1', 'พัฒนาระบบ Intranet กอง', 'อัปเกรดระบบภายใน (Next-Gen) — มีประวัติขยายสัญญา 2 ครั้ง', 'u1', 'IT', iso(-14), d(-14), d(75)],
    ['p2', 'กิจกรรม 5ส ประจำปี', 'จัดระเบียบอุปกรณ์และสายไฟ', 'u1', 'IT', iso(-7), d(-7), d(21)],
    ['p3', 'แผนซ่อมบำรุงประจำไตรมาส (Q3)', 'ตรวจสอบอุปกรณ์ Network ทั่วตึก — ขยายสัญญารออะไหล่', 'u1', 'IT', iso(-3), d(-3), d(75)],
    ['p4', 'ระบบประเมินผลประจำปี', 'โปรเจกต์แผนก HR — สิทธิ์แยกตามแผนก', 'u5', 'HR', iso(-10), d(-10), d(30)],
    ['p5', 'จัดทำงบประมาณปี 69', 'โปรเจกต์แผนก Finance', 'u7', 'Finance', iso(-5), d(-5), d(40)]
  ];
  for (var pi = 0; pi < demoProjects.length; pi++) {
    if (!sheetHasId_(PROJECTS_SHEET, demoProjects[pi][0])) {
      writeRows_(getSheet_(PROJECTS_SHEET), getSheet_(PROJECTS_SHEET).getLastRow() + 1, [demoProjects[pi]]);
      added.projects++;
    }
  }

  var demoMs = [
    ['m1', 'p1', 'เก็บความต้องการ & ออกแบบ', 'ประชุมผู้ใช้และออกแบบ UI/DB', d(-14), d(-7), 20, 1, 'TRUE', iso(-6)],
    ['m2', 'p1', 'พัฒนา Backend / API', 'Auth และบริการหลัก', d(-7), d(7), 30, 2, 'FALSE', ''],
    ['m3', 'p1', 'พัฒนา Frontend', 'หน้าจอ Intranet', d(-3), d(21), 25, 3, 'FALSE', ''],
    ['m4', 'p1', 'ทดสอบระบบ & อบรม', 'UAT และคู่มือ', d(21), d(35), 15, 4, 'FALSE', ''],
    ['m5', 'p1', 'ขึ้นระบบจริง (Go-live)', 'Deploy และส่งมอบ', d(35), d(45), 10, 5, 'FALSE', ''],
    ['m6', 'p2', 'สำรวจพื้นที่ & วางแผน', 'ตรวจตู้ Rack / สายไฟ', d(-7), d(-3), 30, 1, 'TRUE', iso(-2)],
    ['m7', 'p2', 'ดำเนินการ 5ส', 'จัดระเบียบและติดป้าย', d(-2), d(10), 50, 2, 'FALSE', ''],
    ['m8', 'p2', 'ตรวจรับ & สรุปผล', 'รายงานผลกิจกรรม', d(10), d(21), 20, 3, 'FALSE', ''],
    ['m9', 'p3', 'สำรวจอุปกรณ์ Network', 'Inventory ชั้น 1-3', d(-3), d(14), 40, 1, 'FALSE', ''],
    ['m10', 'p3', 'ซ่อมบำรุง / เปลี่ยนอะไหล่', 'UPS สายแลน AP', d(14), d(40), 40, 2, 'FALSE', ''],
    ['m11', 'p3', 'ทดสอบ & ปิดงานไตรมาส', 'รายงาน Q3', d(40), d(60), 20, 3, 'FALSE', ''],
    ['m12', 'p4', 'ออกแบบแบบฟอร์มประเมิน', 'KPI รายบุคคล', d(-10), d(-2), 40, 1, 'TRUE', iso(-2)],
    ['m13', 'p4', 'ทดลองใช้งาน & อบรม', 'อบรมหัวหน้าแผนก', d(-1), d(14), 40, 2, 'FALSE', ''],
    ['m14', 'p4', 'ปิดรอบประเมิน', 'สรุปคะแนน', d(14), d(30), 20, 3, 'FALSE', ''],
    ['m15', 'p5', 'รวบรวมคำของบ', 'จากทุกกอง', d(-5), d(7), 50, 1, 'FALSE', ''],
    ['m16', 'p5', 'ปรับยอด & อนุมัติ', 'เสนอ ผอ.', d(7), d(40), 50, 2, 'FALSE', '']
  ];
  for (var mi = 0; mi < demoMs.length; mi++) {
    if (!sheetHasId_(MILESTONES_SHEET, demoMs[mi][0])) {
      writeRows_(getSheet_(MILESTONES_SHEET), getSheet_(MILESTONES_SHEET).getLastRow() + 1, [demoMs[mi]]);
      added.milestones++;
    }
  }

  var demoExtensions = [
    ['ce_demo_1', 'p1', 1, d(45), d(60), 'm4', 'รอผลทดสอบ UAT และปรับแก้ตามข้อเสนอแนะของผู้ใช้งาน', 'บันทึกอนุมัติ IT-EXT-001/2569', d(-2), 'u1', iso(-2), iso(-2)],
    ['ce_demo_2', 'p1', 2, d(60), d(75), 'm5', 'เลื่อนการขึ้นระบบจริงเพื่อรอการเชื่อมต่อระบบกลาง', 'บันทึกอนุมัติ IT-EXT-002/2569', d(-1), 'u1', iso(-1), iso(-1)],
    ['ce_demo_3', 'p3', 1, d(60), d(75), 'm11', 'รออะไหล่ Network เพิ่มเติมจากผู้จำหน่าย', 'บันทึกอนุมัติ NET-EXT-001/2569', d(0), 'u1', iso(0), iso(0)]
  ];
  for (var cei = 0; cei < demoExtensions.length; cei++) {
    if (!sheetHasId_(CONTRACT_EXTENSIONS_SHEET, demoExtensions[cei][0])) {
      writeRows_(getSheet_(CONTRACT_EXTENSIONS_SHEET), getSheet_(CONTRACT_EXTENSIONS_SHEET).getLastRow() + 1, [demoExtensions[cei]]);
      added.contractExtensions++;
    }
  }
  // Demo projects reflect the latest approved contract end date.
  if (sheetHasId_(PROJECTS_SHEET, 'p1')) updateRowById_(PROJECTS_SHEET, 'p1', { endDate: d(75) });
  if (sheetHasId_(PROJECTS_SHEET, 'p3')) updateRowById_(PROJECTS_SHEET, 'p3', { endDate: d(75) });

  var demoTasks = [
    [1, 'p1', 'ออกแบบหน้า Login ใหม่', 'ใช้โทนสีองค์กร — สถานะเสร็จสิ้น', 'u1', 'u2', 'Completed', 'Assigned', iso(-2), 'FALSE', iso(-7), iso(-2)],
    [2, 'p1', 'พัฒนาระบบ Backend (API)', 'กำลังทำ + มีคอมเมนต์', 'u1', 'u2', 'In Progress', 'Assigned', iso(5), 'FALSE', iso(-1), ''],
    [3, 'p1', 'เตรียม Database Server', 'สร้างตารางข้อมูล', 'u1', 'u3', 'Completed', 'Assigned', iso(-3), 'FALSE', iso(-7), iso(-3)],
    [4, '', 'รายงานประเมินความเสี่ยง IT (ตีกลับ)', 'ตัวอย่างส่งต่อ/ตีกลับ + ประวัติงาน', 'u1', 'u4', 'In Progress', 'Assigned', iso(1), 'FALSE', iso(-4), ''],
    [5, 'p2', 'ทำความสะอาดตู้ Rack', 'รอตรวจโดยหัวหน้า', 'u1', 'u3', 'Review', 'Assigned', iso(0), 'FALSE', iso(-1), ''],
    [6, '', 'สรุปรายงาน Helpdesk (รายสัปดาห์)', 'งาน Self + ทำซ้ำ', 'u2', 'u2', 'In Progress', 'Self', iso(2), 'TRUE', iso(0, -2), ''],
    [7, 'p3', 'เปลี่ยนแบตเตอรี่ UPS ชั้น 2', 'งานค้าง / overdue', 'u1', 'u4', 'Pending', 'Assigned', iso(-1), 'FALSE', iso(-2), ''],
    [8, 'p1', 'เขียนคู่มือผู้ใช้ Intranet', 'งานใหม่รอรับ', 'u1', 'u2', 'Pending', 'Assigned', iso(3), 'FALSE', iso(0, -1), ''],
    [9, 'p4', 'อัปโหลดแบบฟอร์ม KPI', 'งาน HR — แผนกอื่นไม่เห็น', 'u5', 'u6', 'In Progress', 'Assigned', iso(4), 'FALSE', iso(-2), ''],
    [10, 'p4', 'ตรวจสอบรายชื่อผู้ถูกประเมิน', 'รอตรวจหัวหน้า HR', 'u5', 'u6', 'Review', 'Assigned', iso(0), 'FALSE', iso(-1), ''],
    [11, '', 'สรุปวันลาประจำเดือน', 'งาน Self ของ HR', 'u6', 'u6', 'Pending', 'Self', iso(6), 'TRUE', iso(-1), ''],
    [12, 'p5', 'รวบรวมคำของบกอง IT', 'งาน Finance', 'u7', 'u8', 'In Progress', 'Assigned', iso(7), 'FALSE', iso(-3), ''],
    [13, 'p5', 'ตรวจยอดงบประมาณคงเหลือ', 'เสร็จแล้ว', 'u7', 'u8', 'Completed', 'Assigned', iso(-1), 'FALSE', iso(-5), iso(-1)],
    [14, '', 'ประชุมวางแผนงบ Q4', 'ปฏิทินสัปดาห์หน้า', 'u7', 'u7', 'Pending', 'Self', iso(8), 'FALSE', iso(-1), ''],
    [15, 'p2', 'ติดป้ายอุปกรณ์ Rack', 'ปฏิทินวันนี้', 'u1', 'u3', 'Pending', 'Assigned', iso(0), 'FALSE', iso(-1), ''],
    [16, 'p3', 'สำรวจ AP ชั้น 3', 'ปฏิทินอีก 10 วัน', 'u1', 'u2', 'Pending', 'Assigned', iso(10), 'FALSE', iso(-1), '']
  ];
  for (var ti = 0; ti < demoTasks.length; ti++) {
    if (!sheetHasId_(TASKS_SHEET, demoTasks[ti][0])) {
      writeRows_(getSheet_(TASKS_SHEET), getSheet_(TASKS_SHEET).getLastRow() + 1, [demoTasks[ti]]);
      added.tasks++;
    }
  }

  var demoLogs = [
    ['l1', 4, iso(-4), 'u1', 'Created', 'มอบหมายงานให้ สมศักดิ์'],
    ['l2', 4, iso(-2), 'u4', 'Status Changed', 'เปลี่ยนสถานะเป็น "รอตรวจ"'],
    ['l3', 4, iso(0, -12), 'u1', 'Status Changed', 'ตีกลับให้แก้ไข - ขาดข้อมูลกราฟแนวโน้ม'],
    ['l4', 5, iso(-1), 'u1', 'Created', 'มอบหมายงานให้ สมหญิง'],
    ['l5', 5, iso(0, -2), 'u3', 'Status Changed', 'เปลี่ยนสถานะเป็น "รอตรวจ"'],
    ['l6', 9, iso(-2), 'u5', 'Created', 'มอบหมายงานให้ มาลี'],
    ['l7', 10, iso(0, -3), 'u6', 'Status Changed', 'ส่งตรวจหัวหน้า HR'],
    ['l8', 12, iso(-3), 'u7', 'Created', 'มอบหมายงานให้ วิชัย'],
    ['l9', 1, iso(-7), 'u1', 'Created', 'มอบหมายงานให้ สมชาย'],
    ['l10', 1, iso(-2), 'u2', 'Status Changed', 'เปลี่ยนสถานะเป็น "เสร็จสิ้น" · วันเสร็จ'],
    ['l11', 2, iso(-1), 'u1', 'Created', 'มอบหมายงานพัฒนา API'],
    ['l12', 2, iso(0, -4), 'u2', 'Status Changed', 'เปลี่ยนสถานะเป็น "กำลังทำ"'],
    ['l13', 3, iso(-3), 'u3', 'Status Changed', 'เปลี่ยนสถานะเป็น "เสร็จสิ้น" · วันเสร็จ'],
    ['l14', 8, iso(0, -1), 'u1', 'Created', 'มอบหมายงานเขียนคู่มือ']
  ];
  for (var li = 0; li < demoLogs.length; li++) {
    if (!sheetHasId_(LOGS_SHEET, demoLogs[li][0])) {
      writeRows_(getSheet_(LOGS_SHEET), getSheet_(LOGS_SHEET).getLastRow() + 1, [demoLogs[li]]);
      added.logs++;
    }
  }

  var demoComments = [
    ['c1', 2, iso(0, -18), 'u1', 'ติดปัญหาตรงไหนเรื่อง API ทักมาได้เลยนะ'],
    ['c2', 2, iso(0, -16), 'u2', 'ตอนนี้เชื่อม DB ได้แล้วครับ กำลังเขียนส่วน Auth'],
    ['c3', 4, iso(0, -11), 'u1', '@สมศักดิ์ รบกวนแก้ด่วนนะ ผอ. จะใช้พรุ่งนี้'],
    ['c4', 9, iso(-1), 'u5', 'ใช้เทมเพลตใหม่ในโฟลเดอร์แชร์ได้เลย'],
    ['c5', 12, iso(-2), 'u8', 'รอตัวเลขจาก IT อีกชุดครับ']
  ];
  for (var ci = 0; ci < demoComments.length; ci++) {
    if (!sheetHasId_(COMMENTS_SHEET, demoComments[ci][0])) {
      writeRows_(getSheet_(COMMENTS_SHEET), getSheet_(COMMENTS_SHEET).getLastRow() + 1, [demoComments[ci]]);
      added.comments++;
    }
  }

  var demoStickies = [
    ['sn1', 'u1', 'ประชุมทีม IT', 'เตรียมสไลด์รายงานประจำเดือน', 'yellow', '📌', 48, 56, 220, 200, 1, iso(-1), iso(-1)],
    ['sn2', 'u2', 'ของตัวเอง', 'โน้ตส่วนตัวของสมชาย — คนอื่นไม่เห็น', 'mint', '✨', 80, 80, 220, 200, 1, iso(0, -1), iso(0, -1)],
    ['sn3', 'admin', 'เช็คลิสต์แอดมิน', 'ดูสิทธิ์ตามแผนก · โหลด mock · ตั้ง username', 'lavender', '🛠', 120, 100, 240, 210, 2, iso(-1), iso(-1)],
    ['sn4', 'u5', 'รอบประเมิน', 'ปิดรับแบบฟอร์มวันศุกร์', 'pink', '📋', 60, 70, 220, 190, 1, iso(-2), iso(-2)],
    ['sn5', 'u7', 'งบ 69', 'นัดประชุมผอ. สัปดาห์หน้า', 'blue', '💰', 90, 90, 220, 190, 1, iso(-1), iso(-1)]
  ];
  for (var si = 0; si < demoStickies.length; si++) {
    if (!sheetHasId_(STICKY_NOTES_SHEET, demoStickies[si][0])) {
      writeRows_(getSheet_(STICKY_NOTES_SHEET), getSheet_(STICKY_NOTES_SHEET).getLastRow() + 1, [demoStickies[si]]);
      added.stickies++;
    }
  }

  return {
    ok: true,
    message: 'โหลดข้อมูลตัวอย่างครบทุกฟังก์ชันแล้ว (เพิ่มเฉพาะรายการที่ยังไม่มี)',
    added: added
  };
}

function ensureAdminUser_() {
  var raw = listUsersRaw_();
  for (var i = 0; i < raw.length; i++) {
    if (String(raw[i].role) === 'Admin' || String(raw[i].username || '').toLowerCase() === 'admin') {
      return;
    }
  }
  appendObject_(USERS_SHEET, USER_HEADERS, {
    id: 'admin',
    name: 'ผู้ดูแลระบบ',
    role: 'Admin',
    department: 'SYSTEM',
    division: 'ผู้ดูแลระบบ',
    active: 'TRUE',
    email: '',
    notifyEmail: 'FALSE',
    notifyAssign: 'TRUE',
    notifyStatus: 'TRUE',
    notifyReview: 'TRUE',
    notifyLineDefault: 'TRUE',
    username: 'admin',
    password: '1234'
  });
  invalidateBootstrapCache_();
}

function ensureUserAuthDefaults_() {
  var sheet = getSheet_(USERS_SHEET);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return;
  var headers = data[0].map(function (h) { return String(h || ''); });
  var idIdx = headers.indexOf('id');
  var userIdx = headers.indexOf('username');
  var passIdx = headers.indexOf('password');
  if (idIdx < 0 || userIdx < 0 || passIdx < 0) return;
  for (var r = 1; r < data.length; r++) {
    var id = String(data[r][idIdx] || '');
    if (!id) continue;
    if (!String(data[r][userIdx] || '').trim()) {
      sheet.getRange(r + 1, userIdx + 1).setValue(id);
    }
    if (!String(data[r][passIdx] || '').trim()) {
      sheet.getRange(r + 1, passIdx + 1).setValue('1234');
    }
  }
}

function updateUserProfile(payload) {
  openDatabase_(false);
  var id = String(payload.id || '');
  if (!id) throw new Error('ไม่พบผู้ใช้');
  var self = findUserById_(id);
  if (!self) throw new Error('ไม่พบผู้ใช้');

  var updates = {};
  if (payload.name !== undefined) {
    var name = String(payload.name || '').trim();
    if (!name) throw new Error('ชื่อจำเป็น');
    updates.name = name;
  }
  if (payload.email !== undefined) updates.email = String(payload.email || '').trim();

  // แผนก/กอง: แก้ได้เฉพาะแอดมิน (หรือแอดมินแก้โปรไฟล์ตัวเอง)
  // พนักงาน/หัวหน้าเปลี่ยนแผนกเองไม่ได้ — 1 Username ต่อ 1 แผนก โดยแอดมินเป็นผู้กำหนด
  if (payload.department !== undefined || payload.division !== undefined) {
    if (self.role !== 'Admin') {
      throw new Error('เปลี่ยนแผนกได้เฉพาะแอดมิน — ติดต่อผู้ดูแลระบบ');
    }
    if (payload.department !== undefined) {
      var dept = String(payload.department || '').trim();
      if (!dept) throw new Error('ต้องระบุแผนก');
      updates.department = dept;
    }
    if (payload.division !== undefined) updates.division = String(payload.division || '').trim();
  }

  if (payload.notifyEmail !== undefined) updates.notifyEmail = payload.notifyEmail ? 'TRUE' : 'FALSE';
  if (payload.notifyAssign !== undefined) updates.notifyAssign = payload.notifyAssign ? 'TRUE' : 'FALSE';
  if (payload.notifyStatus !== undefined) updates.notifyStatus = payload.notifyStatus ? 'TRUE' : 'FALSE';
  if (payload.notifyReview !== undefined) updates.notifyReview = payload.notifyReview ? 'TRUE' : 'FALSE';
  if (payload.notifyLineDefault !== undefined) updates.notifyLineDefault = payload.notifyLineDefault ? 'TRUE' : 'FALSE';

  var found = updateRowById_(USERS_SHEET, id, updates);
  if (!found) throw new Error('ไม่พบผู้ใช้');
  try {
    if (updates.department !== undefined || updates.division !== undefined) {
      upsertOrgFromUserFields_(
        updates.department !== undefined ? updates.department : found.department,
        updates.division !== undefined ? updates.division : found.division
      );
    }
  } catch (orgE) {}
  invalidateBootstrapCache_();
  return normalizeUser_(found);
}

function findUserById_(userId) {
  var users = listUsers_();
  for (var i = 0; i < users.length; i++) {
    if (users[i].id === String(userId)) return users[i];
  }
  return null;
}

function notifyUserEmail_(user, subject, body) {
  if (!user || !user.notifyEmail || !user.email) return false;
  try {
    MailApp.sendEmail({
      to: String(user.email),
      subject: '[GovTaskPro] ' + subject,
      body: body + '\n\n— GovTaskPro'
    });
    return true;
  } catch (e) {
    return false;
  }
}

function notifyHeadsReview_(taskTitle) {
  var users = listUsers_();
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    if (u.role === 'Head' && u.notifyReview) {
      notifyUserEmail_(u, 'มีงานรอตรวจ', 'งาน "' + taskTitle + '" เข้าสู่สถานะรอตรวจแล้ว');
    }
  }
}

function listProjectsFromSs_(ss) {
  return listObjectsFromSheet_(ss.getSheetByName(PROJECTS_SHEET)).map(normalizeProject_);
}

function listTasksFromSs_(ss) {
  return listObjectsFromSheet_(ss.getSheetByName(TASKS_SHEET)).map(normalizeTask_);
}

function listLogsFromSs_(ss) {
  return listObjectsFromSheet_(ss.getSheetByName(LOGS_SHEET)).map(function (l) {
    return {
      id: String(l.id),
      taskId: isFinite(Number(l.taskId)) ? Number(l.taskId) : String(l.taskId),
      timestamp: toIso_(l.timestamp),
      actionBy: String(l.actionBy || ''),
      actionType: String(l.actionType || ''),
      detail: String(l.detail || '')
    };
  });
}

function listCommentsFromSs_(ss) {
  return listObjectsFromSheet_(ss.getSheetByName(COMMENTS_SHEET)).map(function (c) {
    return {
      id: String(c.id),
      taskId: isFinite(Number(c.taskId)) ? Number(c.taskId) : String(c.taskId),
      timestamp: toIso_(c.timestamp),
      authorId: String(c.authorId || ''),
      text: String(c.text || '')
    };
  });
}

function listMilestonesFromSs_(ss) {
  return listObjectsFromSheet_(ss.getSheetByName(MILESTONES_SHEET)).map(normalizeMilestone_).sort(function (a, b) {
    return (a.sortOrder || 0) - (b.sortOrder || 0);
  });
}

function listContractExtensionsFromSs_(ss) {
  return listObjectsFromSheet_(ss.getSheetByName(CONTRACT_EXTENSIONS_SHEET))
    .map(normalizeContractExtension_)
    .sort(function (a, b) {
      if (a.projectId !== b.projectId) return String(a.projectId).localeCompare(String(b.projectId));
      return (a.extensionNo || 0) - (b.extensionNo || 0);
    });
}

function listUsers_() {
  return listUsersFromSs_(openDatabase_(false));
}

function listProjects_() {
  return listProjectsFromSs_(openDatabase_(false));
}

function normalizeProject_(p) {
  return {
    id: String(p.id),
    name: String(p.name || ''),
    description: String(p.description || ''),
    createdBy: String(p.createdBy || ''),
    department: String(p.department || ''),
    createdAt: toIso_(p.createdAt),
    startDate: p.startDate ? toDateOnly_(p.startDate) : null,
    endDate: p.endDate ? toDateOnly_(p.endDate) : null
  };
}

function resolveProjectDepartment_(payload) {
  var dept = String((payload && payload.department) || '').trim();
  if (dept) return dept;
  var creatorId = String((payload && payload.createdBy) || '');
  if (creatorId) {
    var creator = findUserById_(creatorId);
    if (creator && String(creator.department || '').trim()) {
      return String(creator.department).trim();
    }
  }
  return '';
}

/** Backfill department on legacy projects (from creator or known demo ids) */
function ensureProjectDepartments_() {
  var rows = listObjects_(PROJECTS_SHEET);
  if (!rows.length) return;
  var known = { p1: 'IT', p2: 'IT', p3: 'IT', p4: 'HR', p5: 'Finance' };
  for (var i = 0; i < rows.length; i++) {
    var p = rows[i];
    if (String(p.department || '').trim()) continue;
    var dept = known[String(p.id)] || '';
    if (!dept && p.createdBy) {
      var creator = findUserById_(String(p.createdBy));
      if (creator) dept = String(creator.department || '').trim();
    }
    if (dept) updateRowById_(PROJECTS_SHEET, p.id, { department: dept });
  }
}

function listMilestones_() {
  return listObjects_(MILESTONES_SHEET).map(normalizeMilestone_).sort(function (a, b) {
    return (a.sortOrder || 0) - (b.sortOrder || 0);
  });
}

function listContractExtensions_() {
  return listObjects_(CONTRACT_EXTENSIONS_SHEET).map(normalizeContractExtension_);
}

function normalizeContractExtension_(x) {
  return {
    id: String(x.id || ''),
    projectId: String(x.projectId || ''),
    extensionNo: Number(x.extensionNo) || 0,
    fromDate: x.fromDate ? toDateOnly_(x.fromDate) : null,
    toDate: x.toDate ? toDateOnly_(x.toDate) : null,
    startMilestoneId: String(x.startMilestoneId || ''),
    reason: String(x.reason || ''),
    approvalRef: String(x.approvalRef || ''),
    approvedAt: x.approvedAt ? toDateOnly_(x.approvedAt) : null,
    createdBy: String(x.createdBy || ''),
    createdAt: toIso_(x.createdAt) || new Date().toISOString(),
    updatedAt: toIso_(x.updatedAt) || toIso_(x.createdAt) || new Date().toISOString()
  };
}

function normalizeMilestone_(m) {
  return {
    id: String(m.id),
    projectId: String(m.projectId || ''),
    title: String(m.title || ''),
    description: String(m.description || ''),
    plannedStart: m.plannedStart ? toDateOnly_(m.plannedStart) : null,
    plannedEnd: m.plannedEnd ? toDateOnly_(m.plannedEnd) : null,
    weight: Number(m.weight) || 1,
    sortOrder: Number(m.sortOrder) || 0,
    completed: String(m.completed).toUpperCase() === 'TRUE' || m.completed === true,
    completedAt: m.completedAt ? toIso_(m.completedAt) : null
  };
}

function listStickyNotesForUser_(userId) {
  return listObjects_(STICKY_NOTES_SHEET)
    .filter(function (n) { return String(n.userId) === String(userId); })
    .map(normalizeStickyNote_)
    .sort(function (a, b) {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return (a.zIndex || 0) - (b.zIndex || 0);
    });
}

function findStickyNoteOwned_(id, userId) {
  var notes = listObjects_(STICKY_NOTES_SHEET);
  for (var i = 0; i < notes.length; i++) {
    if (String(notes[i].id) === String(id) && String(notes[i].userId) === String(userId)) {
      return normalizeStickyNote_(notes[i]);
    }
  }
  return null;
}

function normalizeStickyNote_(n) {
  var color = String(n.color || 'yellow');
  if (STICKY_COLORS.indexOf(color) < 0) color = 'yellow';
  var noteType = String(n.noteType || 'text') === 'list' ? 'list' : 'text';
  return {
    id: String(n.id),
    userId: String(n.userId || ''),
    title: String(n.title || ''),
    body: String(n.body || ''),
    color: color,
    emoji: String(n.emoji || ''),
    x: Number(n.x) || 0,
    y: Number(n.y) || 0,
    width: Math.max(160, Number(n.width) || 220),
    height: Math.max(140, Number(n.height) || 200),
    zIndex: Number(n.zIndex) || 1,
    createdAt: toIso_(n.createdAt) || new Date().toISOString(),
    updatedAt: toIso_(n.updatedAt) || toIso_(n.createdAt) || new Date().toISOString(),
    noteType: noteType,
    items: parseStickyItems_(n.items),
    labels: parseStickyLabels_(n.labels),
    pinned: boolFlag_(n.pinned, false),
    archived: boolFlag_(n.archived, false),
    trashed: boolFlag_(n.trashed, false),
    reminderAt: n.reminderAt ? toIso_(n.reminderAt) : null,
    imageUrl: String(n.imageUrl || '').trim()
  };
}

function toDateOnly_(v) {
  var iso = toIso_(v);
  if (!iso) return null;
  return iso.slice(0, 10);
}

/** Short Thai Buddhist date for logs, e.g. 29 ก.ค. 2569 */
function formatThaiDateShort_(v) {
  var d = v instanceof Date ? v : new Date(String(v || ''));
  if (isNaN(d.getTime())) d = new Date();
  try {
    return Utilities.formatDate(d, Session.getScriptTimeZone() || 'Asia/Bangkok', 'd MMM yyyy');
  } catch (e) {
    var be = d.getFullYear() + 543;
    return (d.getDate()) + '/' + (d.getMonth() + 1) + '/' + be;
  }
}

function listTasks_() {
  return listObjects_(TASKS_SHEET).map(normalizeTask_);
}

function normalizeTask_(t) {
  return {
    id: isFinite(Number(t.id)) ? Number(t.id) : String(t.id),
    projectId: t.projectId ? String(t.projectId) : null,
    title: String(t.title || ''),
    description: String(t.description || ''),
    createdBy: String(t.createdBy || ''),
    assignedTo: String(t.assignedTo || ''),
    status: String(t.status || 'Pending'),
    type: String(t.type || 'Assigned'),
    dueDate: t.dueDate ? toIso_(t.dueDate) : null,
    isRecurring: String(t.isRecurring).toUpperCase() === 'TRUE' || t.isRecurring === true,
    createdAt: toIso_(t.createdAt) || new Date().toISOString(),
    completedAt: t.completedAt ? toIso_(t.completedAt) : null
  };
}

function listLogs_() {
  return listObjects_(LOGS_SHEET).map(function (l) {
    return {
      id: String(l.id),
      taskId: isFinite(Number(l.taskId)) ? Number(l.taskId) : String(l.taskId),
      timestamp: toIso_(l.timestamp),
      actionBy: String(l.actionBy || ''),
      actionType: String(l.actionType || ''),
      detail: String(l.detail || '')
    };
  });
}

function listComments_() {
  return listObjects_(COMMENTS_SHEET).map(function (c) {
    return {
      id: String(c.id),
      taskId: isFinite(Number(c.taskId)) ? Number(c.taskId) : String(c.taskId),
      timestamp: toIso_(c.timestamp),
      authorId: String(c.authorId || ''),
      text: String(c.text || '')
    };
  });
}

function addLog_(taskId, actionBy, actionType, detail) {
  var row = {
    id: 'l_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    taskId: String(taskId),
    timestamp: new Date().toISOString(),
    actionBy: String(actionBy || ''),
    actionType: String(actionType || ''),
    detail: String(detail || '')
  };
  appendObject_(LOGS_SHEET, LOG_HEADERS, row);
  return {
    id: String(row.id),
    taskId: isFinite(Number(row.taskId)) ? Number(row.taskId) : String(row.taskId),
    timestamp: row.timestamp,
    actionBy: row.actionBy,
    actionType: row.actionType,
    detail: row.detail
  };
}

function findUserName_(userId) {
  var u = findUserById_(userId);
  return u ? u.name : String(userId);
}

function toIso_(v) {
  if (!v && v !== 0) return '';
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v)) {
    return v.toISOString();
  }
  var s = String(v);
  if (!s) return '';
  var d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString();
  return s;
}

function notifyLine_(message) {
  var props = PropertiesService.getScriptProperties();
  var webhook = props.getProperty('LINE_WEBHOOK_URL');
  if (!webhook) return false;
  try {
    UrlFetchApp.fetch(webhook, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ message: String(message) }),
      muteHttpExceptions: true
    });
    return true;
  } catch (e) {
    return false;
  }
}

function ensureSeed_() {
  var ss = ensureDatabase_();
  var users = ss.getSheetByName(USERS_SHEET);
  if (users.getLastRow() > 1) return;

  var now = Date.now();
  var HOUR = 3600000;
  var DAY = 86400000;

  var seedUsers = [
    ['admin', 'ผู้ดูแลระบบ', 'Admin', 'SYSTEM', 'ผู้ดูแลระบบ', 'TRUE', '', 'FALSE', 'TRUE', 'TRUE', 'TRUE', 'TRUE', 'admin', '1234'],
    ['u1', 'คุณบอส (หัวหน้าแผนก IT)', 'Head', 'IT', 'กองเทคโนโลยี', 'TRUE', '', 'FALSE', 'TRUE', 'TRUE', 'TRUE', 'TRUE', 'boss', '1234'],
    ['u2', 'สมชาย (พนักงาน IT)', 'Staff', 'IT', 'กองเทคโนโลยี', 'TRUE', '', 'FALSE', 'TRUE', 'TRUE', 'FALSE', 'TRUE', 'somchai', '1234'],
    ['u3', 'สมหญิง (พนักงาน IT)', 'Staff', 'IT', 'กองเทคโนโลยี', 'TRUE', '', 'FALSE', 'TRUE', 'TRUE', 'FALSE', 'TRUE', 'somying', '1234'],
    ['u4', 'สมศักดิ์ (พนักงาน IT)', 'Staff', 'IT', 'กองเทคโนโลยี', 'TRUE', '', 'FALSE', 'TRUE', 'TRUE', 'FALSE', 'TRUE', 'somsak', '1234']
  ];
  // getRange(row, column, numRows, numColumns) — NOT lastRow/lastColumn
  writeRows_(users, 2, seedUsers);

  var projects = [
    ['p1', 'พัฒนาระบบ Intranet กอง', 'อัปเกรดระบบภายในให้รองรับการทำงานแบบใหม่ (Next-Gen)', 'u1', 'IT', new Date(now - DAY * 10).toISOString(), dateOnly_(now - DAY * 14), dateOnly_(now + DAY * 45)],
    ['p2', 'กิจกรรม 5ส ประจำปี', 'จัดระเบียบอุปกรณ์และสายไฟ', 'u1', 'IT', new Date(now - DAY * 8).toISOString(), dateOnly_(now - DAY * 7), dateOnly_(now + DAY * 21)],
    ['p3', 'แผนซ่อมบำรุงประจำไตรมาส (Q3)', 'ตรวจสอบอุปกรณ์ Network ทั่วตึก', 'u1', 'IT', new Date(now - DAY * 5).toISOString(), dateOnly_(now - DAY * 3), dateOnly_(now + DAY * 60)]
  ];
  writeRows_(ss.getSheetByName(PROJECTS_SHEET), 2, projects);

  var tasks = [
    [1, 'p1', 'ออกแบบหน้า Login ใหม่', 'ใช้โทนสีองค์กร', 'u1', 'u2', 'Completed', 'Assigned', new Date(now - DAY * 2).toISOString(), 'FALSE', new Date(now - DAY * 7).toISOString(), new Date(now - DAY * 2).toISOString()],
    [2, 'p1', 'พัฒนาระบบ Backend (API)', 'สร้าง API สำหรับ Login Auth', 'u1', 'u2', 'In Progress', 'Assigned', new Date(now + DAY * 5).toISOString(), 'FALSE', new Date(now - DAY).toISOString(), ''],
    [3, 'p1', 'เตรียม Database Server', 'สร้างตารางข้อมูล', 'u1', 'u3', 'Completed', 'Assigned', new Date(now - DAY * 3).toISOString(), 'FALSE', new Date(now - DAY * 7).toISOString(), new Date(now - DAY * 3).toISOString()],
    [4, '', 'รายงานผลการประเมินความเสี่ยง IT (ตีกลับ)', 'ผอ. ตีกลับให้เพิ่มข้อมูลกราฟ (เจ้าของงานคือสมศักดิ์ แต่ตอนนี้ลา)', 'u1', 'u4', 'In Progress', 'Assigned', new Date(now + DAY * 1).toISOString(), 'FALSE', new Date(now - DAY * 4).toISOString(), ''],
    [5, 'p2', 'ทำความสะอาดตู้ Rack', 'เป่าฝุ่นและเช็คพัดลม', 'u1', 'u3', 'Review', 'Assigned', new Date(now).toISOString(), 'FALSE', new Date(now - DAY * 1).toISOString(), ''],
    [6, '', 'สรุปรายงาน Helpdesk', 'ส่งหัวหน้ากอง', 'u2', 'u2', 'In Progress', 'Self', new Date(now + DAY * 2).toISOString(), 'TRUE', new Date(now - HOUR * 2).toISOString(), ''],
    [7, 'p3', 'เปลี่ยนแบตเตอรี่ UPS ชั้น 2', 'เปลี่ยนแบต 3 ตัว', 'u1', 'u4', 'Pending', 'Assigned', new Date(now - DAY * 1).toISOString(), 'FALSE', new Date(now - DAY * 2).toISOString(), '']
  ];
  writeRows_(ss.getSheetByName(TASKS_SHEET), 2, tasks);

  var logs = [
    ['l1', 4, new Date(now - DAY * 4).toISOString(), 'u1', 'Created', 'มอบหมายงานให้ สมศักดิ์'],
    ['l2', 4, new Date(now - DAY * 2).toISOString(), 'u4', 'Status Changed', 'เปลี่ยนสถานะเป็น "รอตรวจ"'],
    ['l3', 4, new Date(now - HOUR * 12).toISOString(), 'u1', 'Status Changed', 'ตีกลับให้แก้ไข - ขาดข้อมูลกราฟแนวโน้ม'],
    ['l4', 5, new Date(now - DAY * 1).toISOString(), 'u1', 'Created', 'มอบหมายงานให้ สมหญิง'],
    ['l5', 5, new Date(now - HOUR * 2).toISOString(), 'u3', 'Status Changed', 'เปลี่ยนสถานะเป็น "รอตรวจ"']
  ];
  writeRows_(ss.getSheetByName(LOGS_SHEET), 2, logs);

  var comments = [
    ['c1', 2, new Date(now - HOUR * 18).toISOString(), 'u1', 'ติดปัญหาตรงไหนเรื่อง API ทักมาได้เลยนะ'],
    ['c2', 2, new Date(now - HOUR * 16).toISOString(), 'u2', 'ตอนนี้เชื่อม DB ได้แล้วครับ กำลังเขียนส่วน Auth'],
    ['c3', 4, new Date(now - HOUR * 11).toISOString(), 'u1', '@สมศักดิ์ รบกวนแก้ด่วนนะ ผอ. จะใช้พรุ่งนี้']
  ];
  writeRows_(ss.getSheetByName(COMMENTS_SHEET), 2, comments);

  ensureMilestoneDemo_();
}

function dateOnly_(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Seed milestone plan for existing projects if Milestones sheet is empty */
function ensureMilestoneDemo_() {
  ensureDatabase_();
  var sheet = getSheet_(MILESTONES_SHEET);
  if (sheet.getLastRow() > 1) return;

  var now = Date.now();
  var DAY = 86400000;
  var milestones = [
    ['m1', 'p1', 'เก็บความต้องการ & ออกแบบ', 'ประชุมผู้ใช้และออกแบบ UI/DB', dateOnly_(now - DAY * 14), dateOnly_(now - DAY * 7), 20, 1, 'TRUE', new Date(now - DAY * 6).toISOString()],
    ['m2', 'p1', 'พัฒนา Backend / API', 'Auth และบริการหลัก', dateOnly_(now - DAY * 7), dateOnly_(now + DAY * 7), 30, 2, 'FALSE', ''],
    ['m3', 'p1', 'พัฒนา Frontend', 'หน้าจอ Intranet', dateOnly_(now - DAY * 3), dateOnly_(now + DAY * 21), 25, 3, 'FALSE', ''],
    ['m4', 'p1', 'ทดสอบระบบ & อบรม', 'UAT และคู่มือ', dateOnly_(now + DAY * 21), dateOnly_(now + DAY * 35), 15, 4, 'FALSE', ''],
    ['m5', 'p1', 'ขึ้นระบบจริง (Go-live)', 'Deploy และส่งมอบ', dateOnly_(now + DAY * 35), dateOnly_(now + DAY * 45), 10, 5, 'FALSE', ''],
    ['m6', 'p2', 'สำรวจพื้นที่ & วางแผน', 'ตรวจตู้ Rack / สายไฟ', dateOnly_(now - DAY * 7), dateOnly_(now - DAY * 3), 30, 1, 'TRUE', new Date(now - DAY * 2).toISOString()],
    ['m7', 'p2', 'ดำเนินการ 5ส', 'จัดระเบียบและติดป้าย', dateOnly_(now - DAY * 2), dateOnly_(now + DAY * 10), 50, 2, 'FALSE', ''],
    ['m8', 'p2', 'ตรวจรับ & สรุปผล', 'รายงานผลกิจกรรม', dateOnly_(now + DAY * 10), dateOnly_(now + DAY * 21), 20, 3, 'FALSE', ''],
    ['m9', 'p3', 'สำรวจอุปกรณ์ Network', 'Inventory ชั้น 1-3', dateOnly_(now - DAY * 3), dateOnly_(now + DAY * 14), 40, 1, 'FALSE', ''],
    ['m10', 'p3', 'ซ่อมบำรุง / เปลี่ยนอะไหล่', 'UPS สายแลน AP', dateOnly_(now + DAY * 14), dateOnly_(now + DAY * 40), 40, 2, 'FALSE', ''],
    ['m11', 'p3', 'ทดสอบ & ปิดงานไตรมาส', 'รายงาน Q3', dateOnly_(now + DAY * 40), dateOnly_(now + DAY * 60), 20, 3, 'FALSE', '']
  ];
  writeRows_(sheet, 2, milestones);
}

/** Backfill start/end dates for legacy projects */
function ensureProjectDates_() {
  var now = Date.now();
  var DAY = 86400000;
  var defaults = {
    p1: [dateOnly_(now - DAY * 14), dateOnly_(now + DAY * 45)],
    p2: [dateOnly_(now - DAY * 7), dateOnly_(now + DAY * 21)],
    p3: [dateOnly_(now - DAY * 3), dateOnly_(now + DAY * 60)]
  };
  var projects = listProjects_();
  for (var i = 0; i < projects.length; i++) {
    var p = projects[i];
    if (p.startDate && p.endDate) continue;
    var d = defaults[p.id] || [dateOnly_(now), dateOnly_(now + DAY * 30)];
    updateRowById_(PROJECTS_SHEET, p.id, {
      startDate: p.startDate || d[0],
      endDate: p.endDate || d[1]
    });
  }
}

/** Write 2D values starting at startRow. getRange(r,c,numRows,numCols). */
function writeRows_(sheet, startRow, rows) {
  if (!rows || !rows.length) return;
  var numRows = rows.length;
  var numCols = rows[0].length;
  sheet.getRange(startRow, 1, numRows, numCols).setValues(rows);
}
