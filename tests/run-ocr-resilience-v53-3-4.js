const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
function assert(ok, msg) {
  if (!ok) throw new Error(msg);
  console.log('PASS:', msg);
}
const state = read('assets/js/01-state.js');
const recognition = read('assets/js/06-recognition.js');
const gemini = read('assets/js/08-gemini.js');
const timetable = read('assets/js/12-timetable.js');
const cloud = read('assets/js/04-account-firestore.js');
const sw = read('service-worker.js');
const pwa = read('assets/js/20-pwa.js');

assert(/RECOGNITION_ENGINE_VERSION\s*=\s*5/.test(state), 'Recognition Engine v5 invalidates old blank OCR cache');
assert(gemini.includes('createTimetableDraftFromSpatialOcr'), 'Offline timetable has spatial OCR reconstruction');
assert(gemini.includes('{ text: true, tsv: true }'), 'Tesseract requests TSV coordinates when supported');
assert(gemini.includes('parseOcrTsvWords'), 'TSV coordinates are parsed into OCR words');
assert(recognition.includes('countRecognizedTimetableCells(data) > 0'), 'Blank timetable recognition is not cached');
assert(recognition.includes("cleanText(data.sourceMode) === 'manual'"), 'Manual fallback is not cached');
assert(recognition.includes('deleteRecognitionEntry?.(key)'), 'Recognition cache entry can be deleted from IndexedDB');
assert(timetable.includes("teacherNotebookForgetRecognitionEntry?.('timetable'"), 'Deleting a timetable also forgets its source-image cache');
assert(sw.includes('WARM_OCR_CACHE') && pwa.includes('WARM_OCR_CACHE'), 'PWA can proactively warm OCR assets');
assert(sw.includes('vie.traineddata.gz') && sw.includes('eng.traineddata.gz'), 'Vietnamese and English OCR language data are prewarmed');
assert(cloud.includes('personalDirtyHash') && cloud.includes('personalPendingWriteHash'), 'Personal sync tracks unsaved local state');
assert(cloud.includes('incomingHash !== dirtyHash && incomingHash !== pendingHash'), 'Stale personal snapshot is rejected while local changes are dirty');
assert(!/setDoc\(personalRef,[\s\S]{0,600}\{\s*merge:\s*true\s*\}\)/.test(cloud), 'Personal year snapshot is not deep-merged, so deleted week keys disappear on cloud');
console.log('ALL v53.3.4 OCR/SYNC RESILIENCE FIXTURES PASSED');
