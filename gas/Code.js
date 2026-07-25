/**
 * GovTaskPro - Google Apps Script API + Spreadsheet database
 */

var USERS_SHEET = 'Users';
var PROJECTS_SHEET = 'Projects';
var TASKS_SHEET = 'Tasks';
var LOGS_SHEET = 'TaskLogs';
var COMMENTS_SHEET = 'Comments';
var MILESTONES_SHEET = 'Milestones';
var STICKY_NOTES_SHEET = 'StickyNotes';

var USER_HEADERS = ['id', 'name', 'role', 'department', 'division', 'active'];
var PROJECT_HEADERS = ['id', 'name', 'description', 'createdBy', 'createdAt', 'startDate', 'endDate'];
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
var STICKY_NOTE_HEADERS = [
  'id', 'userId', 'title', 'body', 'color', 'emoji',
  'x', 'y', 'width', 'height', 'zIndex', 'createdAt', 'updatedAt'
];

var FRONTEND_URL = 'https://pongvitsam.github.io/GovTaskPro/';

function doGet(e) {
  e = e || {};
  var p = e.parameter || {};

  // Hidden iframe bridge for GitHub Pages frontend (google.script.run)
  if (String(p.bridge || '') === '1') {
    return HtmlService.createHtmlOutputFromFile('Bridge')
      .setTitle('GovTaskPro Bridge')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  // Legacy in-GAS UI (optional)
  if (String(p.embed || '') === '1') {
    return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('GovTaskPro')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
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

/** Inject HTML/JS/CSS partials into Index template (<?!= include('AppJs1'); ?>). */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function include_(filename) {
  return include(filename);
}

var SCHEMA_VERSION = '4';
var BOOT_CACHE_KEY = 'gtp_boot_v2';
var BOOT_CACHE_TTL = 45;
var _ssCache = null;
var STICKY_COLORS = ['yellow', 'pink', 'mint', 'blue', 'lavender'];

function invalidateBootstrapCache_() {
  try {
    CacheService.getScriptCache().remove(BOOT_CACHE_KEY);
  } catch (e) { /* ignore */ }
}

/** Client bootstrap: core sheets only (logs/comments lazy via getTaskActivity) */
function getBootstrap() {
  try {
    var cache = CacheService.getScriptCache();
    var hit = cache.get(BOOT_CACHE_KEY);
    if (hit) {
      try {
        return JSON.parse(hit);
      } catch (parseErr) { /* rebuild */ }
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

    var comments = listCommentsFromSs_(ss);
    var commentCounts = {};
    for (var i = 0; i < comments.length; i++) {
      var tid = String(comments[i].taskId);
      commentCounts[tid] = (commentCounts[tid] || 0) + 1;
    }

    var payload = {
      users: listUsersFromSs_(ss),
      projects: listProjectsFromSs_(ss),
      tasks: listTasksFromSs_(ss),
      taskLogs: [],
      comments: [],
      commentCounts: commentCounts,
      milestones: listMilestonesFromSs_(ss),
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
  var comments = listComments_().filter(function (c) {
    return String(c.taskId) === taskId;
  });
  var taskLogs = listLogs_().filter(function (l) {
    return String(l.taskId) === taskId;
  });
  return { comments: comments, taskLogs: taskLogs };
}

function createProject(payload) {
  openDatabase_(false);
  var id = 'p_' + Date.now();
  var row = {
    id: id,
    name: String(payload.name || '').trim(),
    description: String(payload.description || ''),
    createdBy: String(payload.createdBy || ''),
    createdAt: new Date().toISOString(),
    startDate: payload.startDate ? String(payload.startDate) : '',
    endDate: payload.endDate ? String(payload.endDate) : ''
  };
  if (!row.name) throw new Error('ชื่อโปรเจกต์จำเป็น');
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
  var statusLog = addLog_(taskId, userId, 'Status Changed', payload.logDetail || ('เปลี่ยนสถานะเป็น ' + newStatus));
  if (payload.notifyLine) notifyLine_('อัปเดตงาน: ' + found.title + ' → ' + newStatus);
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

/** Personal sticky notes — always scoped to payload.userId */
function listStickyNotes(payload) {
  openDatabase_(false);
  var userId = String((payload && payload.userId) || '');
  if (!userId) throw new Error('ต้องระบุผู้ใช้');
  return listStickyNotesForUser_(userId);
}

function createStickyNote(payload) {
  openDatabase_(false);
  var userId = String(payload.userId || '');
  if (!userId) throw new Error('ต้องระบุผู้ใช้');
  var now = new Date().toISOString();
  var color = String(payload.color || 'yellow');
  if (STICKY_COLORS.indexOf(color) < 0) color = 'yellow';
  var existing = listStickyNotesForUser_(userId);
  var maxZ = 1;
  for (var i = 0; i < existing.length; i++) {
    if ((existing[i].zIndex || 0) > maxZ) maxZ = existing[i].zIndex;
  }
  var offset = (existing.length % 8) * 28;
  var row = {
    id: 'sn_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    userId: userId,
    title: String(payload.title || '').trim(),
    body: String(payload.body || ''),
    color: color,
    emoji: String(payload.emoji || '').trim().slice(0, 8),
    x: payload.x !== undefined && payload.x !== '' ? Number(payload.x) : 40 + offset,
    y: payload.y !== undefined && payload.y !== '' ? Number(payload.y) : 40 + offset,
    width: payload.width !== undefined && payload.width !== '' ? Number(payload.width) : 220,
    height: payload.height !== undefined && payload.height !== '' ? Number(payload.height) : 200,
    zIndex: payload.zIndex !== undefined && payload.zIndex !== '' ? Number(payload.zIndex) : maxZ + 1,
    createdAt: now,
    updatedAt: now
  };
  appendObject_(STICKY_NOTES_SHEET, STICKY_NOTE_HEADERS, row);
  return normalizeStickyNote_(row);
}

function updateStickyNote(payload) {
  openDatabase_(false);
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

  var found = updateRowById_(STICKY_NOTES_SHEET, id, updates);
  if (!found) throw new Error('ไม่พบโน้ต');
  return normalizeStickyNote_(found);
}

function deleteStickyNote(payload) {
  openDatabase_(false);
  var id = String(payload.id || '');
  var userId = String(payload.userId || '');
  if (!id) throw new Error('ไม่พบโน้ต');
  if (!userId) throw new Error('ต้องระบุผู้ใช้');
  if (!findStickyNoteOwned_(id, userId)) throw new Error('ไม่พบโน้ต หรือไม่มีสิทธิ์ลบ');

  var sheet = getSheet_(STICKY_NOTES_SHEET);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idIdx = headers.indexOf('id');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) === id) {
      sheet.deleteRow(i + 1);
      return { ok: true, id: id };
    }
  }
  throw new Error('ไม่พบโน้ต');
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
  if (version === SCHEMA_VERSION) return;

  ensureSheets_(ss);
  ensureSeed_();
  try { ensureMilestoneDemo_(); } catch (msErr) { /* non-fatal */ }
  try { ensureProjectDates_(); } catch (pdErr) { /* non-fatal */ }
  props.setProperty('SCHEMA_VERSION', SCHEMA_VERSION);
}

function ensureSheets_(ss) {
  ensureSheetWithHeaders_(ss, USERS_SHEET, USER_HEADERS);
  ensureSheetWithHeaders_(ss, PROJECTS_SHEET, PROJECT_HEADERS);
  ensureSheetWithHeaders_(ss, TASKS_SHEET, TASK_HEADERS);
  ensureSheetWithHeaders_(ss, LOGS_SHEET, LOG_HEADERS);
  ensureSheetWithHeaders_(ss, COMMENTS_SHEET, COMMENT_HEADERS);
  ensureSheetWithHeaders_(ss, MILESTONES_SHEET, MILESTONE_HEADERS);
  ensureSheetWithHeaders_(ss, STICKY_NOTES_SHEET, STICKY_NOTE_HEADERS);

  var sheets = ss.getSheets();
  if (sheets.length > 7) {
    for (var i = 0; i < sheets.length; i++) {
      var n = sheets[i].getName();
      if (n === 'Sheet1' && ss.getSheets().length > 1) {
        try { ss.deleteSheet(sheets[i]); } catch (e) {}
      }
    }
  }
}

function ensureSheetWithHeaders_(ss, name, headers) {
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

function appendObject_(sheetName, headers, obj) {
  var sheet = getSheet_(sheetName);
  var lastCol = Math.max(sheet.getLastColumn(), headers.length);
  var sheetHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
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
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) !== String(id)) continue;
    for (var key in updates) {
      if (!Object.prototype.hasOwnProperty.call(updates, key)) continue;
      if (updates[key] === undefined) continue;
      var col = headers.indexOf(key);
      if (col < 0) continue;
      sheet.getRange(i + 1, col + 1).setValue(updates[key] === null ? '' : updates[key]);
      data[i][col] = updates[key] === null ? '' : updates[key];
    }
    return rowToObject_(headers, data[i]);
  }
  return null;
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
  return listObjectsFromSheet_(ss.getSheetByName(USERS_SHEET)).map(function (u) {
    return {
      id: String(u.id),
      name: String(u.name),
      role: String(u.role),
      department: String(u.department),
      division: String(u.division),
      active: String(u.active) !== 'FALSE'
    };
  }).filter(function (u) { return u.active; });
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
    createdAt: toIso_(p.createdAt),
    startDate: p.startDate ? toDateOnly_(p.startDate) : null,
    endDate: p.endDate ? toDateOnly_(p.endDate) : null
  };
}

function listMilestones_() {
  return listObjects_(MILESTONES_SHEET).map(normalizeMilestone_).sort(function (a, b) {
    return (a.sortOrder || 0) - (b.sortOrder || 0);
  });
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
    .sort(function (a, b) { return (a.zIndex || 0) - (b.zIndex || 0); });
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
    updatedAt: toIso_(n.updatedAt) || toIso_(n.createdAt) || new Date().toISOString()
  };
}

function toDateOnly_(v) {
  var iso = toIso_(v);
  if (!iso) return null;
  return iso.slice(0, 10);
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
  var users = listUsers_();
  for (var i = 0; i < users.length; i++) {
    if (users[i].id === String(userId)) return users[i].name;
  }
  return String(userId);
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
    ['u1', 'คุณบอส (หัวหน้าแผนก IT)', 'Head', 'IT', 'กองเทคโนโลยี', 'TRUE'],
    ['u2', 'สมชาย (พนักงาน IT)', 'Staff', 'IT', 'กองเทคโนโลยี', 'TRUE'],
    ['u3', 'สมหญิง (พนักงาน IT)', 'Staff', 'IT', 'กองเทคโนโลยี', 'TRUE'],
    ['u4', 'สมศักดิ์ (พนักงาน IT)', 'Staff', 'IT', 'กองเทคโนโลยี', 'TRUE']
  ];
  // getRange(row, column, numRows, numColumns) — NOT lastRow/lastColumn
  writeRows_(users, 2, seedUsers);

  var projects = [
    ['p1', 'พัฒนาระบบ Intranet กอง', 'อัปเกรดระบบภายในให้รองรับการทำงานแบบใหม่ (Next-Gen)', 'u1', new Date(now - DAY * 10).toISOString(), dateOnly_(now - DAY * 14), dateOnly_(now + DAY * 45)],
    ['p2', 'กิจกรรม 5ส ประจำปี', 'จัดระเบียบอุปกรณ์และสายไฟ', 'u1', new Date(now - DAY * 8).toISOString(), dateOnly_(now - DAY * 7), dateOnly_(now + DAY * 21)],
    ['p3', 'แผนซ่อมบำรุงประจำไตรมาส (Q3)', 'ตรวจสอบอุปกรณ์ Network ทั่วตึก', 'u1', new Date(now - DAY * 5).toISOString(), dateOnly_(now - DAY * 3), dateOnly_(now + DAY * 60)]
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
