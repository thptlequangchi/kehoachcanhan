const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
const file = path.join(root, 'assets/js/29-homeroom.js');
const code = fs.readFileSync(file, 'utf8');

const controls = {
  homeroomSemesterSelect: { value: '1' },
  homeroomConductRuleSelect: { value: 'nn26_14' },
  homeroomStudentLogType: { value: 'violation' },
  homeroomStudentLogContent: { value: 'Không đúng đồng phục' },
  homeroomStudentLogFollowUp: { value: '' },
  homeroomStudentLogDate: { value: '2026-09-14' },
  homeroomStudentLogSeverity: { value: 'light' },
  homeroomStudentLogBasePoints: { value: '-10' },
  homeroomAbsenceException: { value: 'normal' },
};

const workspace = {};
const ctx = {
  console,
  cleanText: v => String(v ?? '').trim(),
  normalizeHomeroomDate: v => String(v ?? '').trim(),
  normalizeHomeroomWorkspace: value => JSON.parse(JSON.stringify(value || {})), // intentionally changes identity every call
  normalizeHomeroomEntry: value => ({ resolved:false, resolvedAt:'', ...value }),
  normalizeHomeroomMonitoringThresholds: v => v || { totalAbsence:3, unexcusedAbsence:2, late:3, violation:2 },
  HOMEROOM_SEMESTERS: ['1','2'],
  HOMEROOM_SEVERITIES: ['neutral','positive','light','medium','heavy','critical'],
  state: {
    selectedAcademicYear: '2026-2027',
    teacherProfile: {},
    homeroom: {
      selectedBookId: 'b1',
      selectedStudentId: 's1',
      selectedSemester: '1',
      selectedClassName: '10A4',
      books: {
        b1: {
          id:'b1', className:'10A4', students:[{id:'s1',name:'Học sinh A'}], entries:[],
          monitoringThresholds:{ totalAbsence:3, unexcusedAbsence:2, late:3, violation:2 },
        },
      },
    },
  },
  getActiveYearWorkspace: () => workspace,
  globalThis: { crypto: null },
  window: {},
  document: { getElementById: id => controls[id] || null },
  setTimeout,
  clearTimeout,
};
vm.createContext(ctx);
vm.runInContext(code, ctx, { filename: file });

// Avoid rendering/persistence dependencies; this test is about the in-memory live commit.
ctx.renderHomeroom = () => {};
ctx.homeroomSchedulePersist = () => {};
ctx.homeroomUpdateRulePreview = () => {};
ctx.showToast = () => {};

function assert(ok, message) {
  if (!ok) throw new Error(message);
  console.log('PASS:', message);
}

ctx.homeroomAddStudentEntry({ preventDefault() {} });
const liveBook = ctx.state.homeroom.books.b1;
assert(liveBook.entries.length === 1, 'Ghi nhận mới nằm trong workspace đang hoạt động dù normalize tạo object mới');
assert(workspace.homeroom === ctx.state.homeroom, 'Workspace năm học trỏ tới đúng state vừa commit');
let assessment = ctx.homeroomConductAssessment(liveBook, 's1', '1');
assert(assessment.violationCount === 1, 'Bảng Nề nếp tăng Lỗi HK ngay sau khi thêm lỗi quy chế');
assert(assessment.totalRegulationPoints === -10, 'Điểm quy chế cập nhật ngay sau khi thêm lỗi');

const manualBook = { entries:[{
  id:'m1', studentId:'s1', date:'2026-09-14', semester:'1', type:'violation', ruleId:'',
  content:'Vi phạm nhập tự do', points:0, basePoints:0, severity:'medium', resolved:false,
  createdAt:'2026-09-14T00:00:00Z',
}]};
assessment = ctx.homeroomConductAssessment(manualBook, 's1', '1');
assert(assessment.violationCount === 1, 'Vi phạm nhập tự do vẫn được tính vào tổng Lỗi HK');
assert(assessment.unresolvedViolationCount === 1, 'Vi phạm nhập tự do vẫn được tính là chưa xử lý');
assert(assessment.totalRegulationPoints === 0, 'Vi phạm tự do không tự sinh điểm quy chế khi chưa gắn điều khoản');
assert(assessment.lastViolationLabel === 'Vi phạm nhập tự do', 'Lỗi gần nhất hiển thị nội dung của ghi nhận tự do');

console.log('ALL v53.3.5 HOMEROOM LIVE-SYNC FIXTURES PASSED');
