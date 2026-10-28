// Logs every step's wall-clock start/end so captions can be lined up with the video.
const fs = require('fs');

function depth(s) {
  let d = 0;
  while (s.parent) { d++; s = s.parent; }
  return d;
}

class StepReporter {
  constructor() { this.rows = []; }
  onTestBegin(test, result) {
    this.rows.push({ kind: 'test', title: test.title, t: result.startTime.getTime() });
  }
  onStepBegin(test, result, step) {
    this.rows.push({ kind: 'begin', cat: step.category, title: step.title, depth: depth(step), t: step.startTime.getTime() });
  }
  onStepEnd(test, result, step) {
    this.rows.push({
      kind: 'end', cat: step.category, title: step.title, depth: depth(step),
      t: step.startTime.getTime() + step.duration,
      error: step.error ? String(step.error.message).slice(0, 400) : undefined,
    });
  }
  onTestEnd(test, result) {
    const video = result.attachments.find((a) => a.name === 'video');
    this.rows.push({
      kind: 'testEnd', status: result.status, t: result.startTime.getTime() + result.duration,
      error: result.error ? String(result.error.message).slice(0, 600) : undefined,
      video: video && video.path,
    });
  }
  onEnd() { fs.writeFileSync(process.env.STEP_LOG, JSON.stringify(this.rows, null, 1)); }
}

module.exports = StepReporter;
