/** Showcase / mockup projects — tasks hidden from main board unless that project is open */

export const SHOWCASE_PROJECT_IDS = new Set([
  'p_demo_joae',
  'p_demo_it',
]);

export function isShowcaseProjectId(projectId) {
  return SHOWCASE_PROJECT_IDS.has(String(projectId || ''));
}

export function isShowcaseProject(project) {
  return isShowcaseProjectId(project?.id);
}

/** Hide showcase tasks on the department board unless user opened board from that project */
export function shouldHideShowcaseTask(task, activeProjectId) {
  const pid = task?.projectId;
  if (!pid || !isShowcaseProjectId(pid)) return false;
  return String(activeProjectId || '') !== String(pid);
}
