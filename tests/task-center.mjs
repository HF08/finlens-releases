import assert from 'node:assert/strict';
import TaskCenter from '../src/task-center.js';

const state = {};
TaskCenter.ensureState(state);
assert.deepEqual(state.tasks, []);

const task = TaskCenter.createTask(state, {
  type: 'crawl',
  title: '抓取订阅源',
  subtitle: 'Fixture feed',
  recovery: ['检查网络']
});
assert.equal(task.status, 'queued');
assert.equal(task.progress, 0);
assert.equal(state.tasks.length, 1);

TaskCenter.updateTask(state, task.id, {
  status: 'running',
  progress: 42.6,
  step: 'fetch',
  message: '正在读取订阅源'
});
assert.equal(state.tasks[0].progress, 43);
assert.equal(state.tasks[0].status, 'running');
assert.equal(TaskCenter.taskSummary(state).running, 1);
assert.equal(TaskCenter.taskSummary(state).latest.progress, 43);

TaskCenter.failTask(state, task.id, 'network down', ['检查网络', '稍后重试']);
assert.equal(state.tasks[0].status, 'failed');
assert.equal(state.tasks[0].error, 'network down');
assert.deepEqual(state.tasks[0].recovery, ['检查网络', '稍后重试']);
assert.equal(TaskCenter.taskSummary(state).failed, 1);

const success = TaskCenter.createTask(state, { type: 'mind-map', title: '生成导图' });
TaskCenter.finishTask(state, success.id, { message: '导图已生成' });
assert.equal(state.tasks.find(item => item.id === success.id).status, 'success');
assert.equal(state.tasks.find(item => item.id === success.id).progress, 100);

const invalid = TaskCenter.createTask(state, { type: 'unknown', title: '' });
assert.equal(invalid.type, 'generic');
assert.equal(invalid.title, '后台任务');

for (let index = 0; index < 110; index += 1) {
  TaskCenter.createTask(state, { type: 'generic', title: `Task ${index}` });
}
TaskCenter.ensureState(state);
assert.equal(state.tasks.length, 100);
assert.equal(state.tasks.at(-1).title, 'Task 109');

console.log('PASS task center lifecycle, summaries, normalization and retention cap');
