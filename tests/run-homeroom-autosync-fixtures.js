const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
const file = path.join(root, 'assets/js/29-homeroom.js');
const code = fs.readFileSync(file, 'utf8');
const ctx = {
  console,
  cleanText: v => String(v ?? '').trim(),
  normalizeHomeroomDate: v => String(v ?? '').trim(),
  globalThis: { crypto: null },
  window: {},
  document: { getElementById: () => null },
};
vm.createContext(ctx);
vm.runInContext(code, ctx, { filename: file });

function assert(ok, message) {
  if (!ok) throw new Error(message);
  console.log('PASS:', message);
}
function entry(id, ruleId, type, points, date='2026-09-11') {
  return { id, studentId:'s1', date, semester:'1', type, ruleId, points, basePoints:points, severity:'medium', resolved:false, createdAt:`${date}T00:00:00Z` };
}

const book = { entries:[entry('e1','nn26_14','violation',-10)] };
let a = ctx.homeroomConductAssessment(book,'s1','1');
assert(a.violationCount === 1, 'Một lỗi đồng phục cập nhật ngay số lỗi học kỳ');
assert(a.totalRegulationPoints === -10, 'Một lỗi đồng phục cập nhật ngay điểm quy chế -10');
assert(a.unresolvedViolationCount === 1, 'Lỗi quy chế mới được đưa vào trạng thái chưa xử lý');
assert(ctx.homeroomEntryNeedsResolution(book.entries[0]) === true, 'Lỗi quy chế có nút xử lý');

let status = ctx.homeroomStudentMonitoringStatus({
  absenceTotal:0, absenceUnexcused:0, late:0, violation:1,
  weekScore:90, trend:{direction:'stable'}, conduct:a,
  activeSeriousCount:0, seriousHistoryCount:0,
}, {totalAbsence:3,unexcusedAbsence:2,late:3,violation:2});
assert(status.flagged === true, 'Học sinh có lỗi được đưa ngay vào Bảng ưu tiên GVCN');

book.entries[0].resolved = true;
a = ctx.homeroomConductAssessment(book,'s1','1');
assert(a.unresolvedViolationCount === 0, 'Đánh dấu đã xử lý cập nhật lại bảng nề nếp');

book.entries.push(entry('e2','nn26_08','late',-5,'2026-09-12'));
a = ctx.homeroomConductAssessment(book,'s1','1');
assert(a.violationCount === 2, 'Lỗi đi muộn theo quy chế cũng tính vào tổng lỗi nề nếp');
assert(a.suggested === 'Khá', 'Hai lỗi cập nhật gợi ý xếp loại Khá theo ngưỡng dự thảo');

book.entries.push(entry('e3','nn26_32','violation',-20,'2026-09-13'));
book.entries.push(entry('e4','nn26_32','violation',-20,'2026-09-14'));
a = ctx.homeroomConductAssessment(book,'s1','1');
assert(a.phoneCount === 2, 'Tự thống kê số lần vi phạm điện thoại');
assert(a.suggested === 'Yếu', 'Điện thoại lần thứ hai tự kích hoạt gợi ý Yếu');

assert(code.includes("|| (row.metrics.conduct?.violationCount || 0) > 0"), 'Chế độ Ưu tiên hiển thị cả học sinh vừa phát sinh lỗi quy chế');
console.log('ALL HOMEROOM AUTO-SYNC FIXTURES PASSED');
