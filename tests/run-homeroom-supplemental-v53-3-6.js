const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
const file = path.join(root, 'assets/js/29-homeroom.js');
const code = fs.readFileSync(file, 'utf8');

const controls = {
  homeroomSemesterSelect: { value: '1' },
  homeroomConductRuleSelect: { value: 'gvcn_deduct_reflection_missing' },
  homeroomStudentLogType: { value: 'note' }, // phải bị rule ghi đè thành violation
  homeroomStudentLogContent: { value: '' },
  homeroomStudentLogFollowUp: { value: '' },
  homeroomStudentLogDate: { value: '2026-09-14' },
  homeroomStudentLogSeverity: { value: 'medium' },
  homeroomStudentLogBasePoints: { value: '-5' },
  homeroomAbsenceException: { value: 'normal' },
};
const workspace = {};
const ctx = {
  console,
  cleanText: v => String(v ?? '').trim(),
  normalizeHomeroomDate: v => String(v ?? '').trim(),
  normalizeHomeroomWorkspace: value => JSON.parse(JSON.stringify(value || {})),
  normalizeHomeroomEntry: value => ({ resolved:false, resolvedAt:'', ...value }),
  normalizeHomeroomMonitoringThresholds: v => v || { totalAbsence:3, unexcusedAbsence:2, late:3, violation:2 },
  HOMEROOM_SEMESTERS: ['1','2'],
  HOMEROOM_SEVERITIES: ['neutral','positive','light','medium','heavy','critical'],
  state: {
    selectedAcademicYear: '2026-2027', teacherProfile: {},
    homeroom: {
      selectedBookId:'b1', selectedStudentId:'s1', selectedSemester:'1', selectedClassName:'10A4',
      books:{ b1:{ id:'b1', className:'10A4', students:[{id:'s1',name:'Học sinh A'}], entries:[], monitoringThresholds:{totalAbsence:3,unexcusedAbsence:2,late:3,violation:2} } },
    },
  },
  getActiveYearWorkspace: () => workspace,
  globalThis: { crypto:null },
  window: {},
  document: { getElementById: id => controls[id] || null },
  setTimeout, clearTimeout,
};
vm.createContext(ctx);
vm.runInContext(code, ctx, { filename:file });
ctx.renderHomeroom = () => {};
ctx.homeroomSchedulePersist = () => {};
ctx.homeroomUpdateRulePreview = () => {};
ctx.showToast = () => {};

function assert(ok, msg) { if (!ok) throw new Error(msg); console.log('PASS:', msg); }
function ev(expr) { return vm.runInContext(expr, ctx); }

assert(ev("HOMEROOM_TEACHER_TRACKING_RULES.length") >= 16, 'Có bộ điểm GVCN bổ sung đủ nhóm trừ và thưởng');
assert(ev("homeroomRuleById('gvcn_deduct_reflection_missing').points") === -5, 'Không hoàn thành bài thu hoạch mặc định -5');
assert(ev("homeroomRuleById('gvcn_deduct_online_incomplete').points") === -5, 'Không hoàn thành cuộc thi online mặc định -5');
assert(ev("homeroomRuleById('gvcn_reward_arts_team').points") === 5, 'Tham gia đội văn nghệ mặc định +5');
assert(ev("homeroomRuleById('gvcn_reward_school_award').points") === 10, 'Đạt thành tích cấp trường mặc định +10');
assert(ev("homeroomIsTeacherTrackingRule(homeroomRuleById('gvcn_reward_arts_team'))"), 'Mục bổ sung được nhận diện là điểm theo dõi GVCN');
assert(!ev("homeroomIsSchoolRule(homeroomRuleById('gvcn_reward_arts_team'))"), 'Mục GVCN không bị giả thành quy chế chính thức');

ctx.homeroomAddStudentEntry({preventDefault(){}});
let book = ctx.state.homeroom.books.b1;
assert(book.entries.length === 1, 'Thêm được lỗi GVCN vào đúng workspace');
assert(book.entries[0].type === 'violation', 'Rule GVCN tự đặt đúng nhóm Vi phạm dù combobox nhóm đang khác');
assert(book.entries[0].points === -5, 'Điểm lỗi GVCN được lưu đúng mức đã chọn');
assert(book.entries[0].regulationSource.includes('GVCN'), 'Bản ghi GVCN có nguồn nội bộ rõ ràng');
assert(ctx.homeroomEntryIsRegulationViolation(book.entries[0]), 'Lỗi GVCN được nhận diện là lỗi nề nếp có chấm điểm');
let assessment = ctx.homeroomConductAssessment(book, 's1', '1');
assert(assessment.violationCount === 1, 'Lỗi GVCN làm tăng Lỗi HK');
assert(assessment.totalRegulationPoints === -5, 'Điểm GVCN cộng vào tổng điểm nề nếp cá nhân');
assert(assessment.officialRegulationPoints === 0, 'Điểm GVCN không bị tính thành điểm quy chế chính thức');
assert(assessment.teacherTrackingPoints === -5, 'Điểm GVCN được tách riêng trong thống kê');
assert(ctx.homeroomClassConductMetrics(book, '1').net === 0, 'Điểm GVCN không tự động làm thay đổi thi đua lớp theo quy chế');

controls.homeroomConductRuleSelect.value = 'gvcn_reward_arts_team';
controls.homeroomStudentLogType.value = 'violation'; // phải bị rule ghi đè thành commendation
controls.homeroomStudentLogContent.value = '';
controls.homeroomStudentLogBasePoints.value = '6'; // kiểm tra khả năng GVCN tự điều chỉnh từ +5 lên +6
controls.homeroomStudentLogSeverity.value = 'positive';
ctx.homeroomAddStudentEntry({preventDefault(){}});
book = ctx.state.homeroom.books.b1;
assert(book.entries.length === 2, 'Thêm được khen thưởng GVCN');
assert(book.entries[1].type === 'commendation', 'Khen thưởng GVCN tự đặt đúng nhóm Khen thưởng');
assert(book.entries[1].points === 6, 'GVCN có thể điều chỉnh điểm gợi ý trước khi lưu');
assessment = ctx.homeroomConductAssessment(book, 's1', '1');
assert(assessment.totalRegulationPoints === 1, 'Tổng điểm nề nếp phản ánh -5 + 6 = +1');
assert(assessment.rewardPoints === 6 && assessment.deductionPoints === -5, 'Tách đúng điểm thưởng và điểm trừ GVCN');
assert(ctx.homeroomClassConductMetrics(book, '1').net === 0, 'Khen thưởng GVCN vẫn không làm thay đổi điểm thi đua lớp chính thức');

console.log('ALL v53.3.6 SUPPLEMENTAL CONDUCT/REWARD FIXTURES PASSED');
