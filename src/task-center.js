(function initTaskCenter(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FinLensTaskCenter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function taskCenterFactory() {
  const MAX_TASKS = 100;
  const TASK_TYPES = new Set([
    'annotation',
    'focus-batch',
    'mind-map',
    'ai-summary',
    'knowledge-revalidation',
    'crawl',
    'backup',
    'generic'
  ]);
  const TASK_STATUSES = new Set(['queued', 'running', 'success', 'failed', 'cancelled']);

  function createId(prefix = 'task') {
    if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function cleanText(value, max = 500) {
    return String(value || '').trim().slice(0, max);
  }

  function cleanRecovery(value) {
    return [...new Set((Array.isArray(value) ? value : [])
      .map(item => cleanText(item, 240))
      .filter(Boolean))]
      .slice(0, 6);
  }

  function normalizeTask(input = {}) {
    const now = Date.now();
    const type = TASK_TYPES.has(input.type) ? input.type : 'generic';
    const status = TASK_STATUSES.has(input.status) ? input.status : 'queued';
    const createdAt = Number(input.createdAt) || now;
    const updatedAt = Number(input.updatedAt) || createdAt;
    const progress = Math.max(0, Math.min(100, Math.round(Number(input.progress) || 0)));
    const terminal = ['success', 'failed', 'cancelled'].includes(status);
    return {
      id: String(input.id || createId()),
      type,
      title: cleanText(input.title, 120) || '后台任务',
      subtitle: cleanText(input.subtitle, 200),
      status,
      progress: status === 'success' ? 100 : progress,
      step: cleanText(input.step, 80),
      message: cleanText(input.message, 500),
      error: cleanText(input.error, 1200),
      recovery: cleanRecovery(input.recovery),
      articleId: String(input.articleId || ''),
      meta: input.meta && typeof input.meta === 'object' && !Array.isArray(input.meta)
        ? { ...input.meta }
        : {},
      createdAt,
      updatedAt,
      finishedAt: terminal ? (Number(input.finishedAt) || updatedAt) : 0
    };
  }

  function ensureState(state) {
    if (!state || typeof state !== 'object') return state;
    state.tasks = Array.isArray(state.tasks)
      ? state.tasks.map(normalizeTask).sort((left, right) => left.createdAt - right.createdAt).slice(-MAX_TASKS)
      : [];
    return state;
  }

  function createTask(state, input = {}) {
    ensureState(state);
    const task = normalizeTask({ ...input, createdAt: Date.now(), updatedAt: Date.now() });
    state.tasks.push(task);
    if (state.tasks.length > MAX_TASKS) state.tasks = state.tasks.slice(-MAX_TASKS);
    return task;
  }

  function updateTask(state, id, patch = {}) {
    ensureState(state);
    const index = state.tasks.findIndex(task => task.id === id);
    if (index < 0) return null;
    const merged = normalizeTask({
      ...state.tasks[index],
      ...patch,
      id,
      updatedAt: Date.now()
    });
    state.tasks[index] = merged;
    return merged;
  }

  function finishTask(state, id, patch = {}) {
    return updateTask(state, id, {
      ...patch,
      status: 'success',
      progress: 100,
      error: '',
      finishedAt: Date.now()
    });
  }

  function failTask(state, id, error, recovery = []) {
    const message = cleanText(error, 1200) || '任务失败';
    return updateTask(state, id, {
      status: 'failed',
      message,
      error: message,
      recovery: cleanRecovery(recovery),
      finishedAt: Date.now()
    });
  }

  function cancelTask(state, id, message = '任务已取消') {
    return updateTask(state, id, {
      status: 'cancelled',
      message,
      finishedAt: Date.now()
    });
  }

  function deleteTask(state, id) {
    ensureState(state);
    const index = state.tasks.findIndex(task => task.id === id);
    if (index < 0) return false;
    state.tasks.splice(index, 1);
    return true;
  }

  function clearInvalidTasks(state) {
    ensureState(state);
    const before = state.tasks.length;
    state.tasks = state.tasks.filter(task => !['failed', 'cancelled'].includes(task.status));
    return before - state.tasks.length;
  }

  function listTasks(state, filter = 'all') {
    ensureState(state);
    const tasks = [...state.tasks].sort((left, right) => right.updatedAt - left.updatedAt);
    if (filter === 'running') return tasks.filter(task => task.status === 'running' || task.status === 'queued');
    if (filter === 'failed') return tasks.filter(task => task.status === 'failed');
    if (filter === 'history') return tasks.filter(task => ['success', 'failed', 'cancelled'].includes(task.status));
    return tasks;
  }

  function taskSummary(state) {
    ensureState(state);
    const runningTasks = state.tasks.filter(task => task.status === 'running' || task.status === 'queued');
    const failedTasks = state.tasks.filter(task => task.status === 'failed');
    const successTasks = state.tasks.filter(task => task.status === 'success');
    const latest = [...state.tasks].sort((left, right) => right.updatedAt - left.updatedAt)[0] || null;
    return {
      running: runningTasks.length,
      failed: failedTasks.length,
      success: successTasks.length,
      active: runningTasks.length > 0,
      latest,
      runningTasks,
      failedTasks
    };
  }

  return {
    MAX_TASKS,
    normalizeTask,
    ensureState,
    createTask,
    updateTask,
    finishTask,
    failTask,
    cancelTask,
    deleteTask,
    clearInvalidTasks,
    listTasks,
    taskSummary
  };
});
