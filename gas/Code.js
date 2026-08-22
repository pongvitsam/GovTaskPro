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
var PROJECT_HEADERS = [
  'id', 'name', 'description', 'createdBy', 'department', 'createdAt', 'startDate', 'endDate',
  'customerName', 'customerContractNo', 'customerContractValue', 'customerStartDate', 'customerEndDate', 'customerContact',
  'contractorName', 'contractorContractNo', 'contractorContractValue', 'contractorStartDate', 'contractorEndDate', 'contractorContact',
  'projectTeam', 'siteAddress', 'systemSizeKwp'
];
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
  'createdBy', 'createdAt', 'updatedAt', 'party'
];
var STICKY_NOTE_HEADERS = [
  'id', 'userId', 'title', 'body', 'color', 'emoji',
  'x', 'y', 'width', 'height', 'zIndex', 'createdAt', 'updatedAt',
  'noteType', 'items', 'labels', 'pinned', 'archived', 'trashed',
  'reminderAt', 'imageUrl', 'fontFamily'
];
var ORG_HEADERS = [
  'id', 'type', 'name', 'parent', 'active', 'code',
  'lineEnabled', 'lineGroupId', 'lineChannelToken',
  'lineNotifyAssign', 'lineNotifyReview', 'lineNotifyComplete'
];

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
  if (fn === 'dispatchTaskNotify') return dispatchTaskNotify(payload || {});
  if (fn === 'forwardTask') return forwardTask(payload || {});
  if (fn === 'takeoverTask') return takeoverTask(payload || {});
  if (fn === 'deleteTask') return deleteTask(payload || {});
  if (fn === 'updateTask') return updateTask(payload || {});
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
  if (fn === 'adminGetOrgUnits') return adminGetOrgUnits(payload || {});
  if (fn === 'adminUpdateOrgUnit') return adminUpdateOrgUnit(payload || {});
  if (fn === 'adminDeleteOrgUnit') return adminDeleteOrgUnit(payload || {});
  if (fn === 'adminSeedDemoData') return adminSeedDemoData(payload || {});
  if (fn === 'adminGetDatabaseInfo') return adminGetDatabaseInfo(payload || {});

  throw new Error('Unknown API: ' + fn);
}

/** Inject HTML/JS/CSS partials into Index template (<?!= include('AppJs1'); ?>). */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function include_(filename) {
  return include(filename);
}

var SCHEMA_VERSION = '15';
var BOOT_CACHE_KEY = 'gtp_boot_v11';
var BOOT_CACHE_TTL = 300;
var _ssCache = null;
var _sheetHeaderCache = {};
var _usersListCache = null;
var _usersByIdMap = null;
var STICKY_COLORS = ['yellow', 'orange', 'pink', 'mint', 'teal', 'blue', 'lavender', 'white'];
var STICKY_FONTS = ['handwriting', 'sarabun', 'manrope', 'sans', 'mono'];

function invalidateLocalCaches_() {
  _usersListCache = null;
  _usersByIdMap = null;
  _orgUnitsRawCache = null;
}

function invalidateBootstrapCache_() {
  invalidateLocalCaches_();
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

    var lock = LockService.getScriptLock();
    var gotLock = false;
    try {
      gotLock = lock.tryLock(5000);
      if (!forceFresh) {
        var hitAfterLock = cache.get(BOOT_CACHE_KEY);
        if (hitAfterLock) {
          try {
            return JSON.parse(hitAfterLock);
          } catch (parseErr2) { /* rebuild */ }
        }
      }

    var ss = openDatabase_(false);
    var migrateLock = LockService.getScriptLock();
    try {
      migrateLock.waitLock(8000);
      maybeMigrateAndSeed_(ss);
    } catch (lockErr) {
      throw new Error('ระบบกำลังเตรียมฐานข้อมูล กรุณารอสักครู่แล้วลองใหม่');
    } finally {
      try { migrateLock.releaseLock(); } catch (e) {}
    }

    // Read all sheets in one pass: get all sheet objects up front to avoid
    // repeated SpreadsheetApp.getSheetByName() round-trips.
    var sheetsMap = {};
    var allSheets = ss.getSheets();
    for (var si = 0; si < allSheets.length; si++) {
      sheetsMap[allSheets[si].getName()] = allSheets[si];
    }

    var payload = {
      users: listObjectsFromSheet_(sheetsMap[USERS_SHEET]).map(normalizeUser_),
      projects: listObjectsFromSheet_(sheetsMap[PROJECTS_SHEET]).map(normalizeProject_),
      tasks: listObjectsFromSheet_(sheetsMap[TASKS_SHEET]).map(normalizeTask_),
      taskLogs: [],
      comments: [],
      commentCounts: {},
      milestones: listObjectsFromSheet_(sheetsMap[MILESTONES_SHEET]).map(normalizeMilestone_).sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); }),
      contractExtensions: listObjectsFromSheet_(sheetsMap[CONTRACT_EXTENSIONS_SHEET]).map(normalizeContractExtension_).sort(function (a, b) {
        if (a.projectId !== b.projectId) return String(a.projectId).localeCompare(String(b.projectId));
        return (a.extensionNo || 0) - (b.extensionNo || 0);
      }),
      orgUnits: sheetsMap[ORG_UNITS_SHEET]
        ? listObjectsFromSheet_(sheetsMap[ORG_UNITS_SHEET]).map(normalizeOrgUnit_).filter(function (o) { return o.active && o.name; })
        : [],
      serverTime: new Date().toISOString()
    };

    // Warm in-memory caches from the data we already read
    _usersListCache = payload.users.map(function (u) {
      return { id: u.id, name: u.name, role: u.role, department: u.department,
        division: u.division, active: u.active, email: u.email,
        notifyEmail: u.notifyEmail, notifyAssign: u.notifyAssign,
        notifyStatus: u.notifyStatus, notifyReview: u.notifyReview,
        notifyLineDefault: u.notifyLineDefault, username: u.username };
    });

    try {
      var json = JSON.stringify(payload);
      if (json.length < 500000) {
        cache.put(BOOT_CACHE_KEY, json, BOOT_CACHE_TTL);
      }
    } catch (cacheErr) { /* ignore */ }

    return payload;
    } finally {
      if (gotLock) {
        try { lock.releaseLock(); } catch (e) { /* ignore */ }
      }
    }
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
  var taskIds = {};
  var sheet = getSheet_(TASKS_SHEET);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow >= 2 && lastCol >= 1) {
    var taskValues = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var taskHeaders = taskValues[0];
    var idIdx = taskHeaders.indexOf('id');
    var projIdx = taskHeaders.indexOf('projectId');
    if (idIdx >= 0 && projIdx >= 0) {
      for (var ti = 1; ti < taskValues.length; ti++) {
        if (String(taskValues[ti][projIdx]) !== projectId) continue;
        taskIds[String(taskValues[ti][idIdx])] = true;
      }
    }
  }
  var logSheet = getSheet_(LOGS_SHEET);
  var logLastRow = logSheet.getLastRow();
  var logLastCol = logSheet.getLastColumn();
  var taskLogs = [];
  if (logLastRow >= 2 && logLastCol >= 1) {
    var rawLogs = logSheet.getRange(1, 1, logLastRow, logLastCol).getValues();
    var logHeaders = rawLogs[0];
    var taskIdIdx = logHeaders.indexOf('taskId');
    if (taskIdIdx >= 0) {
      var logIdIdx = logHeaders.indexOf('id');
      var logTsIdx = logHeaders.indexOf('timestamp');
      var logByIdx = logHeaders.indexOf('actionBy');
      var logTypeIdx = logHeaders.indexOf('actionType');
      var logDetailIdx = logHeaders.indexOf('detail');
      for (var li = 1; li < rawLogs.length; li++) {
        var l = rawLogs[li];
        if (!taskIds[String(l[taskIdIdx])]) continue;
        taskLogs.push({
          id: String(l[logIdIdx]),
          taskId: isFinite(Number(l[taskIdIdx])) ? Number(l[taskIdIdx]) : String(l[taskIdIdx]),
          timestamp: toIso_(l[logTsIdx]),
          actionBy: String(l[logByIdx] || ''),
          actionType: String(l[logTypeIdx] || ''),
          detail: String(l[logDetailIdx] || '')
        });
      }
    }
  }
  taskLogs.sort(function (a, b) {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
  return { taskLogs: taskLogs };
}

function createProject(payload) {
  openDatabase_(false);
  var creator = findUserById_(String(payload.createdBy || ''));
  if (!creator || String(creator.active) === 'FALSE') throw new Error('ไม่พบผู้สร้าง');
  var dept = resolveProjectDepartment_(payload);
  if (creator.role === 'Staff' || creator.role === 'Head') {
    dept = String(creator.department || '').trim();
  } else if (creator.role === 'Admin') {
    dept = String(payload.department || creator.department || '').trim();
  }
  var id = 'p_' + Date.now();
  var row = buildProjectRowFromPayload_(payload, {
    id: id,
    createdBy: String(payload.createdBy || ''),
    department: dept,
    createdAt: new Date().toISOString()
  });
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
  var updates = projectFieldUpdatesFromPayload_(payload);
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
  deleteRowsByField_(MILESTONES_SHEET, 'id', id);
  invalidateBootstrapCache_();
  return { ok: true, id: id };
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
  var party = normalizeContractParty_(payload.party);
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
    updatedAt: now,
    party: party
  };
  if (!row.startMilestoneId) throw new Error('กรุณาระบุขั้นตอนที่เริ่มขยาย');
  if (!row.reason) throw new Error('กรุณาระบุเหตุผลการขยายสัญญา');

  appendObject_(CONTRACT_EXTENSIONS_SHEET, CONTRACT_EXTENSION_HEADERS, row);
  var updatedProject = applyContractExtensionDates_(projectId, party, toDate) || project;
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
  if (payload.party !== undefined) updates.party = normalizeContractParty_(payload.party);
  if (updates.fromDate && updates.toDate && new Date(updates.toDate).getTime() < new Date(updates.fromDate).getTime()) {
    throw new Error('วันสิ้นสุดใหม่ต้องไม่น้อยกว่าวันเริ่มขยาย');
  }
  var found = updateRowById_(CONTRACT_EXTENSIONS_SHEET, id, updates);
  if (!found) throw new Error('ไม่พบรายการขยายสัญญา');
  var extension = normalizeContractExtension_(found);
  var project = applyContractExtensionDates_(extension.projectId, extension.party, extension.toDate);
  invalidateBootstrapCache_();
  return { extension: extension, project: project };
}

function deleteContractExtension(payload) {
  openDatabase_(false);
  var id = String(payload.id || '');
  if (!id) throw new Error('ไม่พบรายการขยายสัญญา');
  deleteRowsByField_(CONTRACT_EXTENSIONS_SHEET, 'id', id);
  invalidateBootstrapCache_();
  return { ok: true, id: id };
}

function findProjectById_(projectId) {
  var sheet = getSheet_(PROJECTS_SHEET);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return null;
  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0];
  var idIdx = headers.indexOf('id');
  if (idIdx < 0) return null;
  var needle = String(projectId);
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idIdx]) !== needle) continue;
    if (!values[i][0] && values[i].every(function (c) { return c === ''; })) continue;
    return normalizeProject_(rowToObject_(headers, values[i]));
  }
  return null;
}

function createTask(payload) {
  openDatabase_(false);
  var creatorId = String(payload.createdBy || '');
  var assigneeId = String(payload.assignedTo || creatorId);
  assertDeptAssign_(creatorId, assigneeId);
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
  invalidateBootstrapCache_();
  return { task: normalizeTask_(row), log: log };
}

function updateTaskStatus(payload) {
  openDatabase_(false);
  var taskId = String(payload.taskId);
  var newStatus = String(payload.status);
  var userId = String(payload.userId || '');
  if (!userId) throw new Error('ต้องระบุผู้ใช้');
  var found = mutateTaskById_(taskId, function (task) {
    assertCanControlTask_(userId, task);
    var updates = { status: newStatus };
    if (newStatus === 'Completed') {
      updates.completedAt = new Date().toISOString();
    } else {
      updates.completedAt = '';
    }
    return updates;
  });
  if (!found) throw new Error('ไม่พบงาน');
  var defaultDetail = 'เปลี่ยนสถานะเป็น ' + newStatus;
  if (newStatus === 'Completed') {
    var doneDate = found.completedAt ? toDateOnly_(found.completedAt) : toDateOnly_(new Date());
    defaultDetail = 'เปลี่ยนสถานะเป็น เสร็จสิ้น · วันเสร็จ ' + formatThaiDateShort_(doneDate);
  }
  var statusLog = addLog_(taskId, userId, 'Status Changed', payload.logDetail || defaultDetail);
  return { task: normalizeTask_(found), log: statusLog };
}

function forwardTask(payload) {
  openDatabase_(false);
  var taskId = String(payload.taskId);
  var newAssigneeId = String(payload.newAssigneeId);
  var userId = String(payload.userId || '');
  if (!userId) throw new Error('ต้องระบุผู้ใช้');
  assertDeptAssign_(userId, newAssigneeId);
  var found = mutateTaskById_(taskId, function (task) {
    assertCanControlTask_(userId, task);
    return { assignedTo: newAssigneeId, status: 'Pending' };
  });
  if (!found) throw new Error('ไม่พบงาน');
  var name = findUserName_(newAssigneeId);
  var fwdLog = addLog_(taskId, userId, 'Forwarded', 'โอนงานให้ ' + name);
  return { task: normalizeTask_(found), log: fwdLog };
}

function takeoverTask(payload) {
  openDatabase_(false);
  var taskId = String(payload.taskId);
  var userId = String(payload.userId);
  var oldAssignee = '';
  var found = mutateTaskById_(taskId, function (task) {
    assertCanTakeoverTask_(userId, task);
    oldAssignee = String(task.assignedTo || '');
    return { assignedTo: userId, status: 'In Progress' };
  });
  if (!found) throw new Error('ไม่พบงาน');
  var takeLog = addLog_(taskId, userId, 'Takeover', 'ดึงงานมาจาก ' + findUserName_(oldAssignee) + ' เพื่อดำเนินการต่อ');
  return { task: normalizeTask_(found), log: takeLog };
}

function deleteTask(payload) {
  openDatabase_(false);
  var taskId = String(payload.taskId || '');
  var userId = String(payload.userId || '');
  if (!taskId) throw new Error('ไม่พบงาน');
  if (!userId) throw new Error('ต้องระบุผู้ใช้');
  var task = findTaskById_(taskId);
  if (!task) throw new Error('ไม่พบงาน');
  assertCanDeleteTask_(userId, task);
  deleteRowsByField_(TASKS_SHEET, 'id', taskId);
  deleteRowsByField_(LOGS_SHEET, 'taskId', taskId);
  deleteRowsByField_(COMMENTS_SHEET, 'taskId', taskId);
  invalidateBootstrapCache_();
  return { ok: true, id: taskId };
}

function updateTask(payload) {
  openDatabase_(false);
  var taskId = String(payload.taskId || '');
  var userId = String(payload.userId || '');
  if (!taskId) throw new Error('ไม่พบงาน');
  if (!userId) throw new Error('ต้องระบุผู้ใช้');
  var task = findTaskById_(taskId);
  if (!task) throw new Error('ไม่พบงาน');
  assertCanEditTask_(userId, task);

  var updates = {};
  if (payload.title !== undefined) {
    var title = String(payload.title || '').trim();
    if (!title) throw new Error('กรอกชื่องาน');
    updates.title = title;
  }
  if (payload.description !== undefined) {
    updates.description = String(payload.description || '');
  }
  if (payload.dueDate !== undefined) {
    updates.dueDate = payload.dueDate ? String(payload.dueDate) : '';
  }
  if (payload.isRecurring !== undefined) {
    updates.isRecurring = payload.isRecurring ? 'TRUE' : 'FALSE';
  }
  if (payload.projectId !== undefined) {
    var pid = String(payload.projectId || '').trim();
    if (pid) {
      var project = findProjectById_(pid);
      if (!project) throw new Error('ไม่พบโปรเจกต์');
      assertProjectVisibleToUser_(userId, project);
      updates.projectId = pid;
    } else {
      updates.projectId = '';
    }
  }
  if (!Object.keys(updates).length) throw new Error('ไม่มีข้อมูลที่ต้องอัปเดต');

  var sheet = getSheet_(TASKS_SHEET);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) throw new Error('ไม่พบงาน');
  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0];
  var idIdx = headers.indexOf('id');
  if (idIdx < 0) throw new Error('ไม่พบงาน');
  var colCount = headers.length;

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idIdx]) !== taskId) continue;
    if (!values[i][0] && values[i].every(function (c) { return c === ''; })) continue;
    var existing = normalizeTask_(rowToObject_(headers, values[i]));
    assertCanEditTask_(userId, existing);
    for (var key in updates) {
      if (!Object.prototype.hasOwnProperty.call(updates, key)) continue;
      var col = headers.indexOf(key);
      if (col < 0) continue;
      values[i][col] = updates[key] === null ? '' : updates[key];
    }
    var writeRow = [];
    for (var c = 0; c < colCount; c++) writeRow.push(values[i][c]);
    sheet.getRange(i + 1, 1, 1, colCount).setValues([writeRow]);
    var row = rowToObject_(headers, values[i]);
    var log = addLog_(taskId, userId, 'Updated', payload.logDetail || 'อัปเดตงาน');
    return { task: normalizeTask_(row), log: log };
  }
  throw new Error('ไม่พบงาน');
}

/** Send LINE/email after task write — called separately so saves return faster */
function dispatchTaskNotify(payload) {
  payload = payload || {};
  var event = String(payload.event || '');
  var taskId = String(payload.taskId || '');
  var userId = String(payload.userId || '');
  if (!taskId || !event) return { ok: false, skipped: true };

  openDatabase_(false);
  var task = findTaskById_(taskId);
  if (!task) return { ok: false, skipped: true };

  try {
    if (event === 'create') {
      runCreateTaskNotifications_(task, payload);
    } else if (event === 'status') {
      runStatusTaskNotifications_(task, userId, String(payload.status || task.status), payload);
    } else if (event === 'forward') {
      runForwardTaskNotifications_(task, userId);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

function runCreateTaskNotifications_(task, payload) {
  var assignee = findUserById_(task.assignedTo);
  var actor = findUserById_(task.createdBy);
  var dept = assignee ? String(assignee.department || '').trim() : '';
  var selfAssign = String(task.assignedTo) === String(task.createdBy);
  if (dept && (payload.notifyLine || selfAssign)) {
    notifyLineDept_(dept, 'assign', buildLineAssignMsg_(task, assignee, actor));
  }
  if (assignee && assignee.notifyAssign && !selfAssign) {
    notifyUserEmail_(assignee, 'ได้รับมอบหมายงานใหม่', 'คุณได้รับมอบหมายงาน: "' + task.title + '"');
  }
}

function runStatusTaskNotifications_(task, userId, newStatus) {
  var assignee = findUserById_(task.assignedTo);
  var actor = findUserById_(userId);
  var dept = assignee ? String(assignee.department || '').trim() : '';
  if (newStatus === 'Review' && dept) {
    notifyLineDept_(dept, 'review', buildLineReviewMsg_(task, assignee, actor));
  }
  if (newStatus === 'Completed' && dept) {
    notifyLineDept_(dept, 'complete', buildLineCompleteMsg_(task, assignee, actor));
  }
  if (assignee && assignee.notifyStatus && String(assignee.id) !== String(userId)) {
    notifyUserEmail_(assignee, 'สถานะงานเปลี่ยน', 'งาน "' + task.title + '" เปลี่ยนเป็น: ' + newStatus);
  }
  if (newStatus === 'Review') {
    notifyHeadsReview_(task.title);
  }
}

function runForwardTaskNotifications_(task, userId) {
  var newAssignee = findUserById_(task.assignedTo);
  if (newAssignee && newAssignee.notifyAssign) {
    notifyUserEmail_(newAssignee, 'ได้รับโอนงาน', 'คุณได้รับโอนงาน: "' + (task.title || '') + '"');
  }
  if (newAssignee) {
    var fwdDept = String(newAssignee.department || '').trim();
    var fwdActor = findUserById_(userId);
    if (fwdDept) notifyLineDept_(fwdDept, 'assign', buildLineForwardMsg_(task, newAssignee, fwdActor));
  }
}

function assertCanEditTask_(userId, task) {
  var user = findUserById_(userId);
  if (!user || String(user.active) === 'FALSE') throw new Error('ไม่พบผู้ใช้');
  if (user.role === 'Admin') return;
  if (String(task.createdBy) === String(userId)) return;
  if (String(task.assignedTo) === String(userId)) return;
  if (user.role === 'Head') {
    var assignee = findUserById_(task.assignedTo);
    if (assignee && String(assignee.department || '') === String(user.department || '')) return;
  }
  throw new Error('ไม่มีสิทธิ์แก้ไขงานนี้');
}

function assertCanControlTask_(userId, task) {
  var user = findUserById_(userId);
  if (!user || String(user.active) === 'FALSE') throw new Error('ไม่พบผู้ใช้');
  if (user.role === 'Admin') return;
  if (String(task.assignedTo) === String(userId)) return;
  if (user.role === 'Head') {
    var assignee = findUserById_(task.assignedTo);
    if (assignee && String(assignee.department || '') === String(user.department || '')) return;
  }
  throw new Error('ไม่มีสิทธิ์ดำเนินการงานนี้');
}

function assertCanTakeoverTask_(userId, task) {
  var user = findUserById_(userId);
  if (!user || String(user.active) === 'FALSE') throw new Error('ไม่พบผู้ใช้');
  if (String(task.assignedTo) === String(userId)) throw new Error('คุณรับผิดชอบงานนี้อยู่แล้ว');
  if (String(task.status) === 'Completed') throw new Error('งานเสร็จแล้ว ไม่สามารถดึงงานได้');
  if (user.role === 'Admin') return;
  if (user.role === 'Head') {
    var assignee = findUserById_(task.assignedTo);
    if (assignee && String(assignee.department || '') === String(user.department || '')) return;
    throw new Error('ไม่มีสิทธิ์ดึงงานนี้');
  }
  if (user.role === 'Staff') return;
  throw new Error('ไม่มีสิทธิ์ดึงงานนี้');
}

function assertProjectVisibleToUser_(userId, project) {
  var user = findUserById_(userId);
  if (!user) throw new Error('ไม่พบผู้ใช้');
  if (user.role === 'Admin') return;
  var projDept = String(project.department || '').trim();
  var userDept = String(user.department || '').trim();
  if (!projDept || projDept !== userDept) throw new Error('ไม่มีสิทธิ์ใช้โปรเจกต์นี้');
}

function findTaskById_(taskId) {
  var sheet = getSheet_(TASKS_SHEET);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return null;
  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0];
  var idIdx = headers.indexOf('id');
  if (idIdx < 0) return null;
  var needle = String(taskId);
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idIdx]) !== needle) continue;
    if (!values[i][0] && values[i].every(function (c) { return c === ''; })) continue;
    return normalizeTask_(rowToObject_(headers, values[i]));
  }
  return null;
}

function mutateTaskById_(taskId, beforeUpdate) {
  var sheet = getSheet_(TASKS_SHEET);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return null;
  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0];
  var idIdx = headers.indexOf('id');
  if (idIdx < 0) return null;
  var needle = String(taskId);
  var colCount = headers.length;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idIdx]) !== needle) continue;
    if (!values[i][0] && values[i].every(function (c) { return c === ''; })) continue;
    var task = normalizeTask_(rowToObject_(headers, values[i]));
    var updates = beforeUpdate(task);
    if (!updates) return null;
    for (var key in updates) {
      if (!Object.prototype.hasOwnProperty.call(updates, key)) continue;
      if (updates[key] === undefined) continue;
      var col = headers.indexOf(key);
      if (col < 0) continue;
      values[i][col] = updates[key] === null ? '' : updates[key];
    }
    var writeRow = [];
    for (var c = 0; c < colCount; c++) writeRow.push(values[i][c]);
    sheet.getRange(i + 1, 1, 1, colCount).setValues([writeRow]);
    return normalizeTask_(rowToObject_(headers, values[i]));
  }
  return null;
}

function assertCanDeleteTask_(userId, task) {
  var user = findUserById_(userId);
  if (!user || String(user.active) === 'FALSE') throw new Error('ไม่พบผู้ใช้');
  if (user.role === 'Admin') return;
  if (String(task.createdBy) === String(userId)) return;
  if (String(task.assignedTo) === String(userId) && String(task.status) === 'Pending') return;
  if (user.role === 'Head') {
    var assignee = findUserById_(task.assignedTo);
    if (assignee && String(assignee.department || '') === String(user.department || '')) return;
  }
  throw new Error('ไม่มีสิทธิ์ลบงานนี้');
}

function deleteRowsByField_(sheetName, field, value) {
  var sheet = getSheet_(sheetName);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return;
  var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = data[0];
  var idx = headers.indexOf(field);
  if (idx < 0) return;
  var needle = String(value);
  var removeCount = 0;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idx]) !== needle) continue;
    if (!data[i][0] && data[i].every(function (c) { return c === ''; })) continue;
    removeCount++;
  }
  if (removeCount === 0) return;
  if (removeCount === 1) {
    for (var j = data.length - 1; j >= 1; j--) {
      if (String(data[j][idx]) !== needle) continue;
      if (!data[j][0] && data[j].every(function (c) { return c === ''; })) continue;
      sheet.deleteRow(j + 1);
      return;
    }
  }
  var kept = [headers];
  for (var k = 1; k < data.length; k++) {
    if (String(data[k][idx]) === needle) {
      if (!data[k][0] && data[k].every(function (c) { return c === ''; })) {
        kept.push(data[k]);
      }
      continue;
    }
    kept.push(data[k]);
  }
  rewriteSheetRows_(sheet, kept, lastRow, lastCol);
}

function rewriteSheetRows_(sheet, rows, prevLastRow, prevLastCol) {
  if (prevLastRow > 0 && prevLastCol > 0) {
    sheet.getRange(1, 1, prevLastRow, prevLastCol).clearContent();
  }
  if (rows.length > 0 && rows[0].length > 0) {
    sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  }
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
  ensureStickyHeaders_();
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
    imageUrl: String(payload.imageUrl || '').trim(),
    fontFamily: normalizeStickyFontId_(payload.fontFamily)
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
  if (payload.fontFamily !== undefined) updates.fontFamily = normalizeStickyFontId_(payload.fontFamily);

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
  deleteRowsByField_(STICKY_NOTES_SHEET, 'id', id);
  invalidateStickyCache_(userId);
  return { ok: true, id: id, deleted: true };
}

function emptyStickyTrash(payload) {
  openDatabase_(false);
  ensureStickyHeaders_();
  var userId = String((payload && payload.userId) || '');
  if (!userId) throw new Error('ต้องระบุผู้ใช้');
  var sheet = getSheet_(STICKY_NOTES_SHEET);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return { ok: true, removed: 0 };
  var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = data[0];
  var userIdx = headers.indexOf('userId');
  var trashIdx = headers.indexOf('trashed');
  if (trashIdx < 0) return { ok: true, removed: 0 };
  var kept = [headers];
  var removed = 0;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][userIdx]) === String(userId) && boolFlag_(data[i][trashIdx], false)) {
      removed++;
      continue;
    }
    kept.push(data[i]);
  }
  if (removed === 0) return { ok: true, removed: 0 };
  rewriteSheetRows_(sheet, kept, lastRow, lastCol);
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
    fontFamily: existing.fontFamily || 'handwriting',
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
    ensureSheets_(ss);
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
  invalidateBootstrapCache_();
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
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return null;
  var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
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
  return normalizeOrgUnitPublic_(o);
}

function normalizeOrgUnitPublic_(o) {
  var name = String(o.name || '').trim();
  var code = String(o.code || '').trim();
  if (!code && name) code = name.replace(/\s+/g, '').toUpperCase();
  var token = String(o.lineChannelToken || '').trim();
  var groupId = String(o.lineGroupId || '').trim();
  return {
    id: String(o.id),
    type: String(o.type || 'department') === 'division' ? 'division' : 'department',
    name: name,
    parent: String(o.parent || '').trim(),
    active: String(o.active) !== 'FALSE',
    code: code,
    lineEnabled: truthy_(o.lineEnabled),
    lineConfigured: !!(token && groupId),
    lineNotifyAssign: o.lineNotifyAssign === undefined || o.lineNotifyAssign === '' ? true : truthy_(o.lineNotifyAssign),
    lineNotifyReview: o.lineNotifyReview === undefined || o.lineNotifyReview === '' ? true : truthy_(o.lineNotifyReview),
    lineNotifyComplete: o.lineNotifyComplete === undefined || o.lineNotifyComplete === '' ? true : truthy_(o.lineNotifyComplete)
  };
}

function normalizeOrgUnitAdmin_(o) {
  var base = normalizeOrgUnitPublic_(o);
  base.lineGroupId = String(o.lineGroupId || '').trim();
  base.lineChannelToken = String(o.lineChannelToken || '').trim();
  return base;
}

function listOrgUnitsFromSs_(ss) {
  var sheet = ss.getSheetByName(ORG_UNITS_SHEET);
  if (!sheet) return [];
  return listObjectsFromSheet_(sheet).map(normalizeOrgUnit_).filter(function (o) {
    return o.active && o.name;
  });
}

var _orgUnitsRawCache = null;

function listOrgUnitsRaw_() {
  if (_orgUnitsRawCache) return _orgUnitsRawCache;
  _orgUnitsRawCache = listObjects_(ORG_UNITS_SHEET);
  return _orgUnitsRawCache;
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
  if (needle === 'pth2') needle = 'ผธท.2';
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
    return {
      user: normalizeUser_(u),
      bootstrap: getBootstrap({})
    };
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
    return {
      user: normalizeUser_(u),
      bootstrap: getBootstrap({})
    };
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
      if (type === 'department' && code && String(o.code || '').trim() !== code) patch.code = code;
      if (Object.keys(patch).length) {
        updateRowById_(ORG_UNITS_SHEET, String(o.id), patch);
        invalidateLocalCaches_();
      }
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

/** แก้ Username / LINE แผนก — ทุกคนในแผนกใช้ username นี้เข้า */
function adminGetOrgUnits(payload) {
  openDatabase_(false);
  requireAdmin_(payload.adminId);
  return listOrgUnitsRaw_()
    .map(normalizeOrgUnitAdmin_)
    .filter(function (o) {
      return o.active && o.name && o.type === 'department';
    });
}

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
  if (payload.lineEnabled !== undefined) updates.lineEnabled = payload.lineEnabled ? 'TRUE' : 'FALSE';
  if (payload.lineGroupId !== undefined) updates.lineGroupId = String(payload.lineGroupId || '').trim();
  if (payload.lineChannelToken !== undefined) updates.lineChannelToken = String(payload.lineChannelToken || '').trim();
  if (payload.lineNotifyAssign !== undefined) updates.lineNotifyAssign = payload.lineNotifyAssign ? 'TRUE' : 'FALSE';
  if (payload.lineNotifyReview !== undefined) updates.lineNotifyReview = payload.lineNotifyReview ? 'TRUE' : 'FALSE';
  if (payload.lineNotifyComplete !== undefined) updates.lineNotifyComplete = payload.lineNotifyComplete ? 'TRUE' : 'FALSE';
  if (!Object.keys(updates).length) throw new Error('ไม่มีข้อมูลที่ต้องอัปเดต');

  var row = updateRowById_(ORG_UNITS_SHEET, id, updates);
  if (!row) throw new Error('ไม่พบแผนก');
  invalidateBootstrapCache_();
  return normalizeOrgUnitAdmin_(row);
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
  result.bootstrap = getBootstrap({ force: true });
  return result;
}

/** Admin: link to the live Google Sheet backing this deployment */
function adminGetDatabaseInfo(payload) {
  openDatabase_(false);
  requireAdmin_(payload.adminId);
  var ss = openDatabase_(false);
  function rowCount_(name) {
    var sh = ss.getSheetByName(name);
    if (!sh) return 0;
    return Math.max(0, sh.getLastRow() - 1);
  }
  return {
    url: ss.getUrl(),
    name: ss.getName(),
    id: ss.getId(),
    counts: {
      users: rowCount_(USERS_SHEET),
      projects: rowCount_(PROJECTS_SHEET),
      tasks: rowCount_(TASKS_SHEET),
    },
  };
}

function sheetHasId_(sheetName, id) {
  var rows = listObjects_(sheetName);
  var needle = String(id);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id) === needle) return true;
  }
  return false;
}

function buildSheetIdSet_(sheetName) {
  var rows = listObjects_(sheetName);
  var set = {};
  for (var i = 0; i < rows.length; i++) {
    var id = String(rows[i].id || '');
    if (id) set[id] = true;
  }
  return set;
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
  ensureOrgUnitExists_('department', 'ผธท.2', '', 'PTH2');
  ensureOrgUnitExists_('division', 'กองเทคโนโลยี', 'IT');
  ensureOrgUnitExists_('division', 'ผู้ดูแลระบบ', 'SYSTEM');
  ensureOrgUnitExists_('division', 'กองบุคคล', 'HR');
  ensureOrgUnitExists_('division', 'กองงบประมาณ', 'Finance');
  ensureOrgUnitExists_('division', 'กองพัฒนาระบบไฟฟ้า', 'ผธท.2');
  added.orgs = 10;
  invalidateLocalCaches_();
  var pth2Dept = findDeptByCode_('PTH2') || findDeptByCode_('ผธท.2');
  if (pth2Dept && String(pth2Dept.code || '').toUpperCase() !== 'PTH2') {
    updateRowById_(ORG_UNITS_SHEET, String(pth2Dept.id), { code: 'PTH2' });
    invalidateLocalCaches_();
  }

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
    ['u9', 'บัญชีปิดใช้ (ตัวอย่าง)', 'Staff', 'IT', 'กองเทคโนโลยี', 'FALSE', '', 'FALSE', 'TRUE', 'TRUE', 'FALSE', 'TRUE', 'olduser', '1234'],
    ['u_pth2_head', 'คุณสมหมาย (หัวหน้า ผธท.2)', 'Head', 'ผธท.2', 'กองพัฒนาระบบไฟฟ้า', 'TRUE', 'pth2@demo.local', 'TRUE', 'TRUE', 'TRUE', 'TRUE', 'TRUE', 'pth2head', '1234'],
    ['u_pth2_1', 'วิชัย (วิศวกร ผธท.2)', 'Staff', 'ผธท.2', 'กองพัฒนาระบบไฟฟ้า', 'TRUE', 'pth2vichai@demo.local', 'TRUE', 'TRUE', 'TRUE', 'FALSE', 'TRUE', 'pth2vichai', '1234'],
    ['u_pth2_2', 'มณี (เอกสารสัญญา)', 'Staff', 'ผธท.2', 'กองพัฒนาระบบไฟฟ้า', 'TRUE', '', 'FALSE', 'TRUE', 'TRUE', 'FALSE', 'TRUE', 'pth2manee', '1234'],
    ['u_pth2_3', 'เกษียร (ภาคสนาม)', 'Staff', 'ผธท.2', 'กองพัฒนาระบบไฟฟ้า', 'TRUE', '', 'FALSE', 'TRUE', 'TRUE', 'FALSE', 'TRUE', 'pth2kaset', '1234']
  ];
  var userIds = buildSheetIdSet_(USERS_SHEET);
  var newUsers = [];
  for (var ui = 0; ui < demoUsers.length; ui++) {
    if (!userIds[String(demoUsers[ui][0])]) {
      newUsers.push(demoUsers[ui]);
      userIds[String(demoUsers[ui][0])] = true;
    }
  }
  if (newUsers.length) {
    var uSheet = getSheet_(USERS_SHEET);
    writeRows_(uSheet, uSheet.getLastRow() + 1, newUsers);
    added.users += newUsers.length;
  }

  var demoProjects = [
    ['p1', 'พัฒนาระบบ Intranet กอง', 'อัปเกรดระบบภายใน (Next-Gen) — มีประวัติขยายสัญญา 2 ครั้ง', 'u1', 'IT', iso(-14), d(-14), d(75)],
    ['p2', 'กิจกรรม 5ส ประจำปี', 'จัดระเบียบอุปกรณ์และสายไฟ', 'u1', 'IT', iso(-7), d(-7), d(21)],
    ['p3', 'แผนซ่อมบำรุงประจำไตรมาส (Q3)', 'ตรวจสอบอุปกรณ์ Network ทั่วตึก — ขยายสัญญารออะไหล่', 'u1', 'IT', iso(-3), d(-3), d(75)],
    ['p4', 'ระบบประเมินผลประจำปี', 'โปรเจกต์แผนก HR — สิทธิ์แยกตามแผนก', 'u5', 'HR', iso(-10), d(-10), d(30)],
    ['p5', 'จัดทำงบประมาณปี 69', 'โปรเจกต์แผนก Finance', 'u7', 'Finance', iso(-5), d(-5), d(40)]
  ];
  var projIds = buildSheetIdSet_(PROJECTS_SHEET);
  var newProjs = [];
  for (var pi = 0; pi < demoProjects.length; pi++) {
    if (!projIds[String(demoProjects[pi][0])]) { newProjs.push(demoProjects[pi]); projIds[String(demoProjects[pi][0])] = true; }
  }
  if (newProjs.length) { var pSheet = getSheet_(PROJECTS_SHEET); writeRows_(pSheet, pSheet.getLastRow() + 1, newProjs); added.projects += newProjs.length; }

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
  var msIds = buildSheetIdSet_(MILESTONES_SHEET);
  var newMs = [];
  for (var mi = 0; mi < demoMs.length; mi++) {
    if (!msIds[String(demoMs[mi][0])]) { newMs.push(demoMs[mi]); msIds[String(demoMs[mi][0])] = true; }
  }
  if (newMs.length) { var mSheet = getSheet_(MILESTONES_SHEET); writeRows_(mSheet, mSheet.getLastRow() + 1, newMs); added.milestones += newMs.length; }

  var demoExtensions = [
    ['ce_demo_1', 'p1', 1, d(45), d(60), 'm4', 'รอผลทดสอบ UAT และปรับแก้ตามข้อเสนอแนะของผู้ใช้งาน', 'บันทึกอนุมัติ IT-EXT-001/2569', d(-2), 'u1', iso(-2), iso(-2)],
    ['ce_demo_2', 'p1', 2, d(60), d(75), 'm5', 'เลื่อนการขึ้นระบบจริงเพื่อรอการเชื่อมต่อระบบกลาง', 'บันทึกอนุมัติ IT-EXT-002/2569', d(-1), 'u1', iso(-1), iso(-1)],
    ['ce_demo_3', 'p3', 1, d(60), d(75), 'm11', 'รออะไหล่ Network เพิ่มเติมจากผู้จำหน่าย', 'บันทึกอนุมัติ NET-EXT-001/2569', d(0), 'u1', iso(0), iso(0)]
  ];
  var ceIds = buildSheetIdSet_(CONTRACT_EXTENSIONS_SHEET);
  var newCe = [];
  for (var cei = 0; cei < demoExtensions.length; cei++) {
    if (!ceIds[String(demoExtensions[cei][0])]) { newCe.push(demoExtensions[cei]); ceIds[String(demoExtensions[cei][0])] = true; }
  }
  if (newCe.length) { var ceSheet = getSheet_(CONTRACT_EXTENSIONS_SHEET); writeRows_(ceSheet, ceSheet.getLastRow() + 1, newCe); added.contractExtensions += newCe.length; }
  // Demo projects reflect the latest approved contract end date.
  if (projIds['p1']) updateRowById_(PROJECTS_SHEET, 'p1', { endDate: d(75) });
  if (projIds['p3']) updateRowById_(PROJECTS_SHEET, 'p3', { endDate: d(75) });

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
  var taskIds = buildSheetIdSet_(TASKS_SHEET);
  var newTasks = [];
  for (var ti = 0; ti < demoTasks.length; ti++) {
    if (!taskIds[String(demoTasks[ti][0])]) { newTasks.push(demoTasks[ti]); taskIds[String(demoTasks[ti][0])] = true; }
  }
  if (newTasks.length) { var tSheet = getSheet_(TASKS_SHEET); writeRows_(tSheet, tSheet.getLastRow() + 1, newTasks); added.tasks += newTasks.length; }

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
  var logIds = buildSheetIdSet_(LOGS_SHEET);
  var newLogs = [];
  for (var li = 0; li < demoLogs.length; li++) {
    if (!logIds[String(demoLogs[li][0])]) { newLogs.push(demoLogs[li]); logIds[String(demoLogs[li][0])] = true; }
  }
  if (newLogs.length) { var lSheet = getSheet_(LOGS_SHEET); writeRows_(lSheet, lSheet.getLastRow() + 1, newLogs); added.logs += newLogs.length; }

  var demoComments = [
    ['c1', 2, iso(0, -18), 'u1', 'ติดปัญหาตรงไหนเรื่อง API ทักมาได้เลยนะ'],
    ['c2', 2, iso(0, -16), 'u2', 'ตอนนี้เชื่อม DB ได้แล้วครับ กำลังเขียนส่วน Auth'],
    ['c3', 4, iso(0, -11), 'u1', '@สมศักดิ์ รบกวนแก้ด่วนนะ ผอ. จะใช้พรุ่งนี้'],
    ['c4', 9, iso(-1), 'u5', 'ใช้เทมเพลตใหม่ในโฟลเดอร์แชร์ได้เลย'],
    ['c5', 12, iso(-2), 'u8', 'รอตัวเลขจาก IT อีกชุดครับ']
  ];
  var cmIds = buildSheetIdSet_(COMMENTS_SHEET);
  var newCm = [];
  for (var ci = 0; ci < demoComments.length; ci++) {
    if (!cmIds[String(demoComments[ci][0])]) { newCm.push(demoComments[ci]); cmIds[String(demoComments[ci][0])] = true; }
  }
  if (newCm.length) { var cmSheet = getSheet_(COMMENTS_SHEET); writeRows_(cmSheet, cmSheet.getLastRow() + 1, newCm); added.comments += newCm.length; }

  var demoStickies = [
    ['sn1', 'u1', 'ประชุมทีม IT', 'เตรียมสไลด์รายงานประจำเดือน', 'yellow', '📌', 48, 56, 220, 200, 1, iso(-1), iso(-1)],
    ['sn2', 'u2', 'ของตัวเอง', 'โน้ตส่วนตัวของสมชาย — คนอื่นไม่เห็น', 'mint', '✨', 80, 80, 220, 200, 1, iso(0, -1), iso(0, -1)],
    ['sn3', 'admin', 'เช็คลิสต์แอดมิน', 'ดูสิทธิ์ตามแผนก · โหลด mock · ตั้ง username', 'lavender', '🛠', 120, 100, 240, 210, 2, iso(-1), iso(-1)],
    ['sn4', 'u5', 'รอบประเมิน', 'ปิดรับแบบฟอร์มวันศุกร์', 'pink', '📋', 60, 70, 220, 190, 1, iso(-2), iso(-2)],
    ['sn5', 'u7', 'งบ 69', 'นัดประชุมผอ. สัปดาห์หน้า', 'blue', '💰', 90, 90, 220, 190, 1, iso(-1), iso(-1)]
  ];
  var stickyIds = buildSheetIdSet_(STICKY_NOTES_SHEET);
  var newStickies = [];
  for (var si = 0; si < demoStickies.length; si++) {
    if (!stickyIds[String(demoStickies[si][0])]) { newStickies.push(demoStickies[si]); stickyIds[String(demoStickies[si][0])] = true; }
  }
  if (newStickies.length) { var snSheet = getSheet_(STICKY_NOTES_SHEET); writeRows_(snSheet, snSheet.getLastRow() + 1, newStickies); added.stickies += newStickies.length; }

  // โปรเจกตสาธิตครบทุกฟังก์ชัน — แผนก IT (สัญญา 2 ฝ่าย, แผนงาน, S-Curve, ขยายสัญญา, งานบอร์ด)
  if (!projIds['p_demo_it']) {
    appendObject_(PROJECTS_SHEET, PROJECT_HEADERS, {
      id: 'p_demo_it',
      name: '[ตัวอย่าง IT] ติดตั้งโซลาร์เซลล์ — ครบทุกฟังก์ชัน',
      description: 'โปรเจกตสาธิตสำหรับแผนก IT — สัญญาลูกค้า/ผู้รับเหมา, ทีมงาน, ที่ตั้ง, kWp, แผนงาน, S-Curve, ขยายสัญญา 3 ฝ่าย, งานครบทุกสถานะ',
      createdBy: 'u1',
      department: 'IT',
      createdAt: iso(-30),
      startDate: d(-25),
      endDate: d(110),
      customerName: 'บริษัท เอ็นเนอร์จี้ พลัส จำกัด',
      customerContractNo: 'CUS-PV-DEMO-2026-001',
      customerContractValue: 18500000,
      customerStartDate: d(-25),
      customerEndDate: d(140),
      customerContact: '02-999-8888 คุณสุดา',
      contractorName: 'บริษัท ซันไลท์ โซลาร์ จำกัด',
      contractorContractNo: 'CON-PV-DEMO-2026-001',
      contractorContractValue: 14200000,
      contractorStartDate: d(-20),
      contractorEndDate: d(95),
      contractorContact: '089-777-6655 คุณประเสริฐ',
      projectTeam: serializeProjectTeam_([
        { name: 'คุณบอส (หัวหน้า IT)', position: 'ผู้จัดการโครงการ' },
        { name: 'สมชาย (พนักงาน IT)', position: 'วิศวกรประสานงาน' },
        { name: 'สมหญิง (พนักงาน IT)', position: 'เอกสารและสัญญา' },
        { name: 'สมศักดิ์ (พนักงาน IT)', position: 'ติดตามงานภาคสนาม' }
      ]),
      siteAddress: '123/4 ถ.พหลโยธิน แขวงลาดยาว เขตจตุจักร กรุงเทพฯ 10900',
      systemSizeKwp: 350
    });
    projIds['p_demo_it'] = true;
    added.projects += 1;
  }

  var itMs = [
    ['m_demo_it_1', 'p_demo_it', 'สำรวจไซต์ & ออกแบบระบบ', 'Site survey, ออกแบบแผง/อินเวอร์เตอร์, คำนวณ kWp', d(-25), d(-10), 15, 1, 'TRUE', iso(-9)],
    ['m_demo_it_2', 'p_demo_it', 'จัดหาวัสดุ & ขนส่ง', 'แผง อินเวอร์เตอร์ โครงสร้าง — รอขยายสัญญาผู้รับเหมา', d(-10), d(15), 20, 2, 'FALSE', ''],
    ['m_demo_it_3', 'p_demo_it', 'ติดตั้งโครงสร้างและแผง', 'งานก่อสร้างบนหลังคา — ขั้นตอนหลัก S-Curve', d(15), d(50), 35, 3, 'FALSE', ''],
    ['m_demo_it_4', 'p_demo_it', 'ระบบไฟฟ้า & ทดสอบ', 'เดินสาย ต่ออินเวอร์เตอร์ Commissioning', d(50), d(75), 20, 4, 'FALSE', ''],
    ['m_demo_it_5', 'p_demo_it', 'ส่งมอบ & ติดตามหลังขาย', 'Handover ลูกค้า + เอกสารรับประกัน', d(75), d(100), 10, 5, 'FALSE', '']
  ];
  for (var imi = 0; imi < itMs.length; imi++) {
    if (!msIds[String(itMs[imi][0])]) {
      var itMsSheet = getSheet_(MILESTONES_SHEET);
      writeRows_(itMsSheet, itMsSheet.getLastRow() + 1, [itMs[imi]]);
      msIds[String(itMs[imi][0])] = true;
      added.milestones += 1;
    }
  }

  var itExtensions = [
    ['ce_demo_it_1', 'p_demo_it', 1, d(80), d(95), 'm_demo_it_3', 'ผู้รับเหมาขอเลื่อน — รอวัสดุโครงสร้างเพิ่มเติม', 'บันทึกอนุมัติ CON-EXT-001/2569', d(-3), 'u1', iso(-3), iso(-3), 'contractor'],
    ['ce_demo_it_2', 'p_demo_it', 2, d(120), d(140), 'm_demo_it_5', 'ลูกค้าขอเลื่อนวันส่งมอบ — รอตรวจ PEA', 'บันทึกอนุมัติ CUS-EXT-001/2569', d(-2), 'u1', iso(-2), iso(-2), 'customer'],
    ['ce_demo_it_3', 'p_demo_it', 3, d(100), d(110), 'm_demo_it_4', 'ขยายกรอบโครงการรวม — รอผลทดสอบระบบกลาง', 'บันทึกอนุมัติ PRJ-EXT-001/2569', d(-1), 'u1', iso(-1), iso(-1), 'project']
  ];
  for (var iei = 0; iei < itExtensions.length; iei++) {
    if (!ceIds[String(itExtensions[iei][0])]) {
      var itCeSheet = getSheet_(CONTRACT_EXTENSIONS_SHEET);
      writeRows_(itCeSheet, itCeSheet.getLastRow() + 1, [itExtensions[iei]]);
      ceIds[String(itExtensions[iei][0])] = true;
      added.contractExtensions += 1;
    }
  }
  if (projIds['p_demo_it']) {
    updateRowById_(PROJECTS_SHEET, 'p_demo_it', {
      endDate: d(110),
      customerEndDate: d(140),
      contractorEndDate: d(95)
    });
  }

  var itTasks = [
    [101, 'p_demo_it', 'ตรวจสอบหลังคาและโครงสร้าง', 'สถานะเสร็จสิ้น — ตัวอย่างงาน Completed', 'u1', 'u4', 'Completed', 'Assigned', iso(-5), 'FALSE', iso(-20), iso(-5)],
    [102, 'p_demo_it', 'ประสานงานผู้รับเหมาติดตั้งแผง', 'กำลังทำ + มีคอมเมนต์และประวัติ', 'u1', 'u2', 'In Progress', 'Assigned', iso(10), 'FALSE', iso(-8), ''],
    [103, 'p_demo_it', 'ตรวจรับงานเดินสายไฟ', 'รอตรวจโดยหัวหน้า — สถานะ Review', 'u1', 'u3', 'Review', 'Assigned', iso(0), 'FALSE', iso(-4), ''],
    [104, 'p_demo_it', 'จัดทำเอกสารส่งมอบลูกค้า', 'งานใหม่รอรับ — สถานะ Pending', 'u1', 'u3', 'Pending', 'Assigned', iso(5), 'FALSE', iso(-1), ''],
    [105, 'p_demo_it', 'อัปเดตแผน S-Curve รายสัปดาห์', 'งาน Self + ทำซ้ำ — ตัวอย่างงานส่วนตัว', 'u1', 'u1', 'In Progress', 'Self', iso(3), 'TRUE', iso(-2), ''],
    [106, 'p_demo_it', 'ลงนามสัญญาลูกค้า', 'เสร็จแล้ว — ตัวอย่างสัญญาฝ่ายลูกค้า', 'u1', 'u2', 'Completed', 'Assigned', iso(-15), 'FALSE', iso(-22), iso(-15)]
  ];
  for (var iti = 0; iti < itTasks.length; iti++) {
    if (!taskIds[String(itTasks[iti][0])]) {
      var itTaskSheet = getSheet_(TASKS_SHEET);
      writeRows_(itTaskSheet, itTaskSheet.getLastRow() + 1, [itTasks[iti]]);
      taskIds[String(itTasks[iti][0])] = true;
      added.tasks += 1;
    }
  }

  var itLogs = [
    ['l_demo_it_1', 101, iso(-20), 'u1', 'Created', 'มอบหมายงานให้ สมศักดิ์'],
    ['l_demo_it_2', 101, iso(-5), 'u4', 'Status Changed', 'เปลี่ยนสถานะเป็น "เสร็จสิ้น"'],
    ['l_demo_it_3', 102, iso(-8), 'u1', 'Created', 'มอบหมายงานให้ สมชาย'],
    ['l_demo_it_4', 102, iso(-2), 'u2', 'Status Changed', 'เปลี่ยนสถานะเป็น "กำลังทำ"'],
    ['l_demo_it_5', 103, iso(-4), 'u1', 'Created', 'มอบหมายงานให้ สมหญิง'],
    ['l_demo_it_6', 103, iso(0, -3), 'u3', 'Status Changed', 'เปลี่ยนสถานะเป็น "รอตรวจ"'],
    ['l_demo_it_7', 104, iso(-1), 'u1', 'Created', 'มอบหมายงานจัดทำเอกสารส่งมอบ'],
    ['l_demo_it_8', 106, iso(-22), 'u1', 'Created', 'มอบหมายงานลงนามสัญญา'],
    ['l_demo_it_9', 106, iso(-15), 'u2', 'Status Changed', 'เปลี่ยนสถานะเป็น "เสร็จสิ้น"']
  ];
  for (var ili = 0; ili < itLogs.length; ili++) {
    if (!logIds[String(itLogs[ili][0])]) {
      var itLogSheet = getSheet_(LOGS_SHEET);
      writeRows_(itLogSheet, itLogSheet.getLastRow() + 1, [itLogs[ili]]);
      logIds[String(itLogs[ili][0])] = true;
      added.logs += 1;
    }
  }

  var itComments = [
    ['c_demo_it_1', 102, iso(0, -20), 'u1', 'ผู้รับเหมายืนยันเริ่มติดตั้งสัปดาห์หน้า รบกวนติดตามใบส่งของ'],
    ['c_demo_it_2', 102, iso(0, -16), 'u2', 'รับทราบครับ จะประสานคลังวัสดุให้'],
    ['c_demo_it_3', 103, iso(0, -8), 'u3', 'เดินสายเสร็จแล้ว รอหัวหน้าตรวจรับ'],
    ['c_demo_it_4', 104, iso(-1), 'u1', 'ใช้เทมเพลตส่งมอบในโฟลเดอร์แชร์ IT/Solar']
  ];
  for (var ici = 0; ici < itComments.length; ici++) {
    if (!cmIds[String(itComments[ici][0])]) {
      var itCmSheet = getSheet_(COMMENTS_SHEET);
      writeRows_(itCmSheet, itCmSheet.getLastRow() + 1, [itComments[ici]]);
      cmIds[String(itComments[ici][0])] = true;
      added.comments += 1;
    }
  }

  // โปรเจกตสาธิตครบทุกฟังก์ชัน — แผนก ผธท.2 โรงพยาบาลจ๊ะเอ๋ (งานไม่รวมกระดานหลัก)
  if (!projIds['p_demo_joae']) {
    appendObject_(PROJECTS_SHEET, PROJECT_HEADERS, {
      id: 'p_demo_joae',
      name: '[ตัวอย่าง] ติดตั้งโซลาร์เซลล์ โรงพยาบาลจ๊ะเอ๋',
      description: 'Mockup ครบทุกฟังก์ชัน — สัญญา 2 ฝ่าย, ทีมงาน, kWp, แผนงาน, S-Curve, ขยายสัญญา 3 ฝ่าย, งานบอร์ด (แสดงเฉพาะในโปรเจกตนี้)',
      createdBy: 'u_pth2_head',
      department: 'ผธท.2',
      createdAt: iso(-35),
      startDate: d(-30),
      endDate: d(115),
      customerName: 'โรงพยาบาลจ๊ะเอ๋',
      customerContractNo: 'CUS-JOAE-PV-2026-001',
      customerContractValue: 22800000,
      customerStartDate: d(-28),
      customerEndDate: d(150),
      customerContact: '053-999-888 คุณผู้อำนวยการ',
      contractorName: 'บริษัท ซันเพาเวอร์ เมด จำกัด',
      contractorContractNo: 'CON-JOAE-PV-2026-001',
      contractorContractValue: 17600000,
      contractorStartDate: d(-22),
      contractorEndDate: d(100),
      contractorContact: '081-555-1234 คุณประเสริฐ',
      projectTeam: serializeProjectTeam_([
        { name: 'คุณสมหมาย ใจดี', position: 'ผู้จัดการโครงการ (ผธท.2)' },
        { name: 'วิชัย พรหมมา', position: 'วิศวกรไฟฟ้า/โซลาร์' },
        { name: 'มณี แสงทอง', position: 'เอกสารและสัญญา' },
        { name: 'เกษียร มั่นคง', position: 'ติดตามงานภาคสนาม' }
      ]),
      siteAddress: 'โรงพยาบาลจ๊ะเอ๋ 99 ถ.เชียงใหม่-ลำปาง ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200',
      systemSizeKwp: 280
    });
    projIds['p_demo_joae'] = true;
    added.projects += 1;
  }

  var joaeMs = [
    ['m_joae_1', 'p_demo_joae', 'สำรวจหลังคา & ออกแบบระบบ', 'Site survey อาคาร A/B, คำนวณ kWp, ออกแบบ Single Line', d(-30), d(-12), 15, 1, 'TRUE', iso(-11)],
    ['m_joae_2', 'p_demo_joae', 'จัดหาแผง/อินเวอร์เตอร์ & ขนส่ง', 'PO วัสดุ, ประสานผู้รับเหมา — รอขยายสัญญาผู้รับเหมา', d(-12), d(18), 20, 2, 'FALSE', ''],
    ['m_joae_3', 'p_demo_joae', 'ติดตั้งโครงสร้างและแผง', 'งานบนหลังคาอาคารผู้ป่วย — ขั้นตอนหลัก S-Curve', d(18), d(55), 35, 3, 'FALSE', ''],
    ['m_joae_4', 'p_demo_joae', 'ระบบไฟฟ้า PEA & Commissioning', 'เดินสาย ต่อ กฟภ. ทดสอบระบบ', d(55), d(80), 20, 4, 'FALSE', ''],
    ['m_joae_5', 'p_demo_joae', 'ส่งมอบ รพ.จ๊ะเอ๋ & ติดตาม', 'Handover + เอกสารรับประกัน + อบรมเจ้าหน้าที่', d(80), d(110), 10, 5, 'FALSE', '']
  ];
  for (var jmi = 0; jmi < joaeMs.length; jmi++) {
    if (!msIds[String(joaeMs[jmi][0])]) {
      var joaeMsSheet = getSheet_(MILESTONES_SHEET);
      writeRows_(joaeMsSheet, joaeMsSheet.getLastRow() + 1, [joaeMs[jmi]]);
      msIds[String(joaeMs[jmi][0])] = true;
      added.milestones += 1;
    }
  }

  var joaeExtensions = [
    ['ce_joae_1', 'p_demo_joae', 1, d(85), d(100), 'm_joae_3', 'ผู้รับเหมาขอเลื่อน — รอแผ่นกันลื่นสำหรับหลังคาโรงพยาบาล', 'บันทึกอนุมัติ CON-JOAE-001/2569', d(-4), 'u_pth2_head', iso(-4), iso(-4), 'contractor'],
    ['ce_joae_2', 'p_demo_joae', 2, d(130), d(150), 'm_joae_5', 'รพ.จ๊ะเอ๋ ขอเลื่อนส่งมอบ — รอ กฟภ. ตรวจรับระบบ', 'บันทึกอนุมัติ CUS-JOAE-001/2569', d(-2), 'u_pth2_head', iso(-2), iso(-2), 'customer'],
    ['ce_joae_3', 'p_demo_joae', 3, d(110), d(115), 'm_joae_4', 'ขยายกรอบบริหารโครงการ — รอผลทดสอบระบบสำรองไฟ', 'บันทึกอนุมัติ PRJ-JOAE-001/2569', d(-1), 'u_pth2_head', iso(-1), iso(-1), 'project']
  ];
  for (var jei = 0; jei < joaeExtensions.length; jei++) {
    if (!ceIds[String(joaeExtensions[jei][0])]) {
      var joaeCeSheet = getSheet_(CONTRACT_EXTENSIONS_SHEET);
      writeRows_(joaeCeSheet, joaeCeSheet.getLastRow() + 1, [joaeExtensions[jei]]);
      ceIds[String(joaeExtensions[jei][0])] = true;
      added.contractExtensions += 1;
    }
  }
  if (projIds['p_demo_joae']) {
    updateRowById_(PROJECTS_SHEET, 'p_demo_joae', {
      endDate: d(115),
      customerEndDate: d(150),
      contractorEndDate: d(100)
    });
  }

  var joaeTasks = [
    [201, 'p_demo_joae', 'สำรวจหลังคาอาคาร A/B', 'สถานะเสร็จสิ้น — ตัวอย่าง Completed', 'u_pth2_head', 'u_pth2_3', 'Completed', 'Assigned', iso(-6), 'FALSE', iso(-22), iso(-6)],
    [202, 'p_demo_joae', 'ประสานผู้รับเหมาติดตั้งแผง', 'กำลังทำ + คอมเมนต์', 'u_pth2_head', 'u_pth2_1', 'In Progress', 'Assigned', iso(12), 'FALSE', iso(-9), ''],
    [203, 'p_demo_joae', 'ตรวจรับงานเดินสาย กฟภ.', 'รอตรวจหัวหน้า — Review', 'u_pth2_head', 'u_pth2_2', 'Review', 'Assigned', iso(0), 'FALSE', iso(-5), ''],
    [204, 'p_demo_joae', 'จัดทำเอกสารส่งมอบ รพ.จ๊ะเอ๋', 'Pending — งานใหม่รอรับ', 'u_pth2_head', 'u_pth2_2', 'Pending', 'Assigned', iso(6), 'FALSE', iso(-1), ''],
    [205, 'p_demo_joae', 'อัปเดต S-Curve รายสัปดาห์', 'Self + ทำซ้ำ', 'u_pth2_head', 'u_pth2_head', 'In Progress', 'Self', iso(4), 'TRUE', iso(-3), ''],
    [206, 'p_demo_joae', 'ลงนามสัญญา รพ.จ๊ะเอ๋', 'เสร็จแล้ว — สัญญาลูกค้า', 'u_pth2_head', 'u_pth2_1', 'Completed', 'Assigned', iso(-18), 'FALSE', iso(-25), iso(-18)]
  ];
  for (var jti = 0; jti < joaeTasks.length; jti++) {
    if (!taskIds[String(joaeTasks[jti][0])]) {
      var joaeTaskSheet = getSheet_(TASKS_SHEET);
      writeRows_(joaeTaskSheet, joaeTaskSheet.getLastRow() + 1, [joaeTasks[jti]]);
      taskIds[String(joaeTasks[jti][0])] = true;
      added.tasks += 1;
    }
  }

  var joaeLogs = [
    ['l_joae_1', 201, iso(-22), 'u_pth2_head', 'Created', 'มอบหมายงานให้ เกษียร'],
    ['l_joae_2', 201, iso(-6), 'u_pth2_3', 'Status Changed', 'เปลี่ยนสถานะเป็น "เสร็จสิ้น"'],
    ['l_joae_3', 202, iso(-9), 'u_pth2_head', 'Created', 'มอบหมายงานให้ วิชัย'],
    ['l_joae_4', 202, iso(-2), 'u_pth2_1', 'Status Changed', 'เปลี่ยนสถานะเป็น "กำลังทำ"'],
    ['l_joae_5', 203, iso(-5), 'u_pth2_head', 'Created', 'มอบหมายงานให้ มณี'],
    ['l_joae_6', 203, iso(0, -3), 'u_pth2_2', 'Status Changed', 'เปลี่ยนสถานะเป็น "รอตรวจ"'],
    ['l_joae_7', 204, iso(-1), 'u_pth2_head', 'Created', 'มอบหมายงานจัดทำเอกสารส่งมอบ'],
    ['l_joae_8', 206, iso(-25), 'u_pth2_head', 'Created', 'มอบหมายงานลงนามสัญญา'],
    ['l_joae_9', 206, iso(-18), 'u_pth2_1', 'Status Changed', 'เปลี่ยนสถานะเป็น "เสร็จสิ้น"']
  ];
  for (var jli = 0; jli < joaeLogs.length; jli++) {
    if (!logIds[String(joaeLogs[jli][0])]) {
      var joaeLogSheet = getSheet_(LOGS_SHEET);
      writeRows_(joaeLogSheet, joaeLogSheet.getLastRow() + 1, [joaeLogs[jli]]);
      logIds[String(joaeLogs[jli][0])] = true;
      added.logs += 1;
    }
  }

  var joaeComments = [
    ['c_joae_1', 202, iso(0, -20), 'u_pth2_head', 'ผู้รับเหมายืนยันเริ่มติดตั้งสัปดาห์หน้า รบกวนติดตามใบส่งของ'],
    ['c_joae_2', 202, iso(0, -16), 'u_pth2_1', 'รับทราบครับ จะประสานคลังวัสดุและแจ้ง รพ.จ๊ะเอ๋'],
    ['c_joae_3', 203, iso(0, -8), 'u_pth2_2', 'เดินสาย กฟภ. เสร็จแล้ว รอหัวหน้าตรวจรับ'],
    ['c_joae_4', 204, iso(-1), 'u_pth2_head', 'ใช้เทมเพลตส่งมอบในโฟลเดอร์แชร์ ผธท.2/JoAe-Solar']
  ];
  for (var jci = 0; jci < joaeComments.length; jci++) {
    if (!cmIds[String(joaeComments[jci][0])]) {
      var joaeCmSheet = getSheet_(COMMENTS_SHEET);
      writeRows_(joaeCmSheet, joaeCmSheet.getLastRow() + 1, [joaeComments[jci]]);
      cmIds[String(joaeComments[jci][0])] = true;
      added.comments += 1;
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
  if (!_usersByIdMap) {
    var users = listUsers_();
    _usersByIdMap = {};
    for (var i = 0; i < users.length; i++) {
      _usersByIdMap[users[i].id] = users[i];
    }
  }
  return _usersByIdMap[String(userId)] || null;
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
  if (_usersListCache) return _usersListCache;
  _usersListCache = listUsersFromSs_(openDatabase_(false));
  return _usersListCache;
}

function listProjects_() {
  return listProjectsFromSs_(openDatabase_(false));
}

function normalizeContractParty_(party) {
  var p = String(party || 'contractor').trim().toLowerCase();
  if (p === 'customer' || p === 'project' || p === 'contractor') return p;
  return 'contractor';
}

function serializeProjectTeam_(team) {
  if (team == null || team === '') return '[]';
  if (typeof team === 'string') {
    try {
      var parsed = JSON.parse(team);
      return JSON.stringify(Array.isArray(parsed) ? parsed : []);
    } catch (e) {
      return '[]';
    }
  }
  if (!Array.isArray(team)) return '[]';
  return JSON.stringify(team.map(function (m) {
    return {
      name: String((m && m.name) || '').trim(),
      position: String((m && m.position) || '').trim()
    };
  }).filter(function (m) { return m.name; }));
}

function parseProjectTeam_(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map(function (m) {
      return {
        name: String((m && m.name) || '').trim(),
        position: String((m && m.position) || '').trim()
      };
    }).filter(function (m) { return m.name; });
  }
  try {
    var parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed.map(function (m) {
      return {
        name: String((m && m.name) || '').trim(),
        position: String((m && m.position) || '').trim()
      };
    }).filter(function (m) { return m.name; });
  } catch (e) {
    return [];
  }
}

function optionalDateOnly_(v) {
  return v ? toDateOnly_(v) : null;
}

function optionalString_(v) {
  return v == null ? '' : String(v);
}

function optionalNumberOrNull_(v) {
  if (v === undefined || v === null || v === '') return null;
  var n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function projectFieldUpdatesFromPayload_(payload) {
  var updates = {};
  var keys = [
    'name', 'description', 'startDate', 'endDate',
    'customerName', 'customerContractNo', 'customerContractValue', 'customerStartDate', 'customerEndDate', 'customerContact',
    'contractorName', 'contractorContractNo', 'contractorContractValue', 'contractorStartDate', 'contractorEndDate', 'contractorContact',
    'siteAddress', 'systemSizeKwp'
  ];
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (payload[key] !== undefined) updates[key] = payload[key] == null ? '' : payload[key];
  }
  if (payload.projectTeam !== undefined) updates.projectTeam = serializeProjectTeam_(payload.projectTeam);
  return updates;
}

function buildProjectRowFromPayload_(payload, base) {
  var row = base || {};
  row.name = String(payload.name || '').trim();
  row.description = String(payload.description || '');
  row.startDate = payload.startDate ? String(payload.startDate) : '';
  row.endDate = payload.endDate ? String(payload.endDate) : '';
  row.customerName = String(payload.customerName || '');
  row.customerContractNo = String(payload.customerContractNo || '');
  row.customerContractValue = payload.customerContractValue == null || payload.customerContractValue === ''
    ? '' : payload.customerContractValue;
  row.customerStartDate = payload.customerStartDate ? String(payload.customerStartDate) : '';
  row.customerEndDate = payload.customerEndDate ? String(payload.customerEndDate) : '';
  row.customerContact = String(payload.customerContact || '');
  row.contractorName = String(payload.contractorName || '');
  row.contractorContractNo = String(payload.contractorContractNo || '');
  row.contractorContractValue = payload.contractorContractValue == null || payload.contractorContractValue === ''
    ? '' : payload.contractorContractValue;
  row.contractorStartDate = payload.contractorStartDate ? String(payload.contractorStartDate) : '';
  row.contractorEndDate = payload.contractorEndDate ? String(payload.contractorEndDate) : '';
  row.contractorContact = String(payload.contractorContact || '');
  row.projectTeam = serializeProjectTeam_(payload.projectTeam);
  row.siteAddress = String(payload.siteAddress || '');
  row.systemSizeKwp = payload.systemSizeKwp == null || payload.systemSizeKwp === ''
    ? '' : payload.systemSizeKwp;
  return row;
}

function applyContractExtensionDates_(projectId, party, toDate) {
  if (!toDate) return findProjectById_(projectId);
  var project = findProjectById_(projectId);
  if (!project) return null;
  var updates = {};
  var partyKey = party === 'customer'
    ? 'customerEndDate'
    : (party === 'project' ? 'endDate' : 'contractorEndDate');
  var currentPartyEnd = project[partyKey];
  if (!currentPartyEnd || new Date(toDate).getTime() > new Date(currentPartyEnd).getTime()) {
    updates[partyKey] = toDate;
  }
  if (partyKey !== 'endDate' && (!project.endDate || new Date(toDate).getTime() > new Date(project.endDate).getTime())) {
    updates.endDate = toDate;
  }
  if (!Object.keys(updates).length) return project;
  var found = updateRowById_(PROJECTS_SHEET, projectId, updates);
  return found ? normalizeProject_(found) : project;
}

function normalizeProject_(p) {
  return {
    id: String(p.id),
    name: String(p.name || ''),
    description: String(p.description || ''),
    createdBy: String(p.createdBy || ''),
    department: String(p.department || ''),
    createdAt: toIso_(p.createdAt),
    startDate: optionalDateOnly_(p.startDate),
    endDate: optionalDateOnly_(p.endDate),
    customerName: optionalString_(p.customerName),
    customerContractNo: optionalString_(p.customerContractNo),
    customerContractValue: optionalNumberOrNull_(p.customerContractValue),
    customerStartDate: optionalDateOnly_(p.customerStartDate),
    customerEndDate: optionalDateOnly_(p.customerEndDate),
    customerContact: optionalString_(p.customerContact),
    contractorName: optionalString_(p.contractorName),
    contractorContractNo: optionalString_(p.contractorContractNo),
    contractorContractValue: optionalNumberOrNull_(p.contractorContractValue),
    contractorStartDate: optionalDateOnly_(p.contractorStartDate),
    contractorEndDate: optionalDateOnly_(p.contractorEndDate),
    contractorContact: optionalString_(p.contractorContact),
    projectTeam: parseProjectTeam_(p.projectTeam),
    siteAddress: optionalString_(p.siteAddress),
    systemSizeKwp: optionalNumberOrNull_(p.systemSizeKwp)
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
    updatedAt: toIso_(x.updatedAt) || toIso_(x.createdAt) || new Date().toISOString(),
    party: normalizeContractParty_(x.party)
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
  var sheet = getSheet_(STICKY_NOTES_SHEET);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0];
  var userIdx = headers.indexOf('userId');
  if (userIdx < 0) return [];
  var needle = String(userId);
  var out = [];
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][userIdx]) !== needle) continue;
    if (!values[i][0] && values[i].every(function (c) { return c === ''; })) continue;
    out.push(normalizeStickyNote_(rowToObject_(headers, values[i])));
  }
  out.sort(function (a, b) {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return (a.zIndex || 0) - (b.zIndex || 0);
  });
  return out;
}

function findStickyNoteOwned_(id, userId) {
  var sheet = getSheet_(STICKY_NOTES_SHEET);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return null;
  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0];
  var idIdx = headers.indexOf('id');
  var userIdx = headers.indexOf('userId');
  if (idIdx < 0 || userIdx < 0) return null;
  var idNeedle = String(id);
  var userNeedle = String(userId);
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idIdx]) !== idNeedle) continue;
    if (String(values[i][userIdx]) !== userNeedle) continue;
    return normalizeStickyNote_(rowToObject_(headers, values[i]));
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
    imageUrl: String(n.imageUrl || '').trim(),
    fontFamily: normalizeStickyFontId_(n.fontFamily)
  };
}

function normalizeStickyFontId_(id) {
  var value = String(id || '').trim();
  return STICKY_FONTS.indexOf(value) >= 0 ? value : 'handwriting';
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

function assertDeptAssign_(actorId, assigneeId) {
  var actor = findUserById_(actorId);
  var assignee = findUserById_(assigneeId);
  if (!actor || String(actor.active) === 'FALSE') throw new Error('ไม่พบผู้มอบหมาย');
  if (!assignee || String(assignee.active) === 'FALSE') throw new Error('ไม่พบผู้รับงาน');
  if (actor.role === 'Admin') return;
  var actorDept = String(actor.department || '').trim();
  var assigneeDept = String(assignee.department || '').trim();
  if (!actorDept || actorDept !== assigneeDept) {
    throw new Error('มอบหมายได้เฉพาะคนในแผนกเดียวกัน');
  }
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

function truthy_(v) {
  if (v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1') return true;
  return false;
}

function findDeptLineConfig_(departmentName) {
  var name = String(departmentName || '').trim();
  if (!name) return null;
  var raw = listOrgUnitsRaw_();
  for (var i = 0; i < raw.length; i++) {
    if (String(raw[i].type) !== 'department') continue;
    if (String(raw[i].active).toUpperCase() === 'FALSE') continue;
    if (String(raw[i].name || '').trim() !== name) continue;
    var token = String(raw[i].lineChannelToken || '').trim();
    var groupId = String(raw[i].lineGroupId || '').trim();
    if (!token || !groupId) return null;
    return {
      enabled: truthy_(raw[i].lineEnabled),
      channelToken: token,
      groupId: groupId,
      notifyAssign: raw[i].lineNotifyAssign === undefined || raw[i].lineNotifyAssign === '' ? true : truthy_(raw[i].lineNotifyAssign),
      notifyReview: raw[i].lineNotifyReview === undefined || raw[i].lineNotifyReview === '' ? true : truthy_(raw[i].lineNotifyReview),
      notifyComplete: raw[i].lineNotifyComplete === undefined || raw[i].lineNotifyComplete === '' ? true : truthy_(raw[i].lineNotifyComplete),
      deptName: name
    };
  }
  return null;
}

function pushLineGroupMessage_(token, groupId, text) {
  if (!token || !groupId) return false;
  try {
    var res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method: 'post',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        to: groupId,
        messages: [{ type: 'text', text: String(text).slice(0, 5000) }]
      }),
      muteHttpExceptions: true
    });
    var code = res.getResponseCode();
    return code >= 200 && code < 300;
  } catch (e) {
    return false;
  }
}

function notifyLineDept_(departmentName, eventKey, message) {
  var cfg = findDeptLineConfig_(departmentName);
  if (!cfg || !cfg.enabled) return false;
  if (eventKey === 'assign' && !cfg.notifyAssign) return false;
  if (eventKey === 'review' && !cfg.notifyReview) return false;
  if (eventKey === 'complete' && !cfg.notifyComplete) return false;
  return pushLineGroupMessage_(cfg.channelToken, cfg.groupId, message);
}

function buildLineAssignMsg_(task, assignee, actor) {
  var dept = assignee ? String(assignee.department || '') : '';
  var lines = ['📋 [' + dept + '] มอบหมายงาน', 'งาน: ' + String(task.title || '')];
  if (assignee && assignee.name) lines.push('มอบให้: ' + assignee.name);
  if (actor && actor.name) lines.push('โดย: ' + actor.name);
  if (task.dueDate) {
    try { lines.push('ครบกำหนด: ' + formatThaiDateShort_(toDateOnly_(task.dueDate))); } catch (e) {}
  }
  return lines.join('\n');
}

function buildLineForwardMsg_(task, assignee, actor) {
  var dept = assignee ? String(assignee.department || '') : '';
  var lines = ['🔁 [' + dept + '] โอนงาน', 'งาน: ' + String(task.title || '')];
  if (assignee && assignee.name) lines.push('มอบให้: ' + assignee.name);
  if (actor && actor.name) lines.push('โดย: ' + actor.name);
  return lines.join('\n');
}

function buildLineReviewMsg_(task, assignee, actor) {
  var dept = assignee ? String(assignee.department || '') : '';
  var lines = ['🔍 [' + dept + '] ส่งงานรอตรวจ', 'งาน: ' + String(task.title || '')];
  if (assignee && assignee.name) lines.push('ผู้ทำ: ' + assignee.name);
  if (actor && actor.name && String(actor.id) !== String(assignee && assignee.id)) lines.push('โดย: ' + actor.name);
  return lines.join('\n');
}

function buildLineCompleteMsg_(task, assignee, actor) {
  var dept = assignee ? String(assignee.department || '') : '';
  var lines = ['✅ [' + dept + '] งานเสร็จสิ้น', 'งาน: ' + String(task.title || '')];
  if (assignee && assignee.name) lines.push('ผู้ทำ: ' + assignee.name);
  if (task.completedAt) {
    try { lines.push('วันเสร็จ: ' + formatThaiDateShort_(toDateOnly_(task.completedAt))); } catch (e) {}
  }
  if (actor && actor.name) lines.push('ปิดงานโดย: ' + actor.name);
  return lines.join('\n');
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
