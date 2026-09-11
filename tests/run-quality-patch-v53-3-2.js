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
vm.runInContext(code, ctx, { filename:file });
function assert(ok,msg){ if(!ok) throw new Error(msg); console.log('PASS:',msg); }
let book={entries:[]};
let a=ctx.homeroomAbsenceExceptionInfo(book,'s1','1','2026-12-25','normal');
assert(a.points===-2,'Vắng có phép thông thường = -2');
a=ctx.homeroomAbsenceExceptionInfo(book,'s1','1','2026-12-25','noel');
assert(a.points===0,'Ngoại lệ Noel = 0');
a=ctx.homeroomAbsenceExceptionInfo(book,'s1','1','2026-09-15','religious_holiday');
assert(a.points===-0.5,'Lễ tôn giáo có giấy xác nhận = -0,5');
book.entries=[
 {studentId:'s1',semester:'1',ruleId:'nn26_06',absenceException:'long_term',date:'2026-09-01'},
 {studentId:'s1',semester:'1',ruleId:'nn26_06',absenceException:'long_term',date:'2026-09-02'},
 {studentId:'s1',semester:'1',ruleId:'nn26_06',absenceException:'long_term',date:'2026-09-03'},
];
a=ctx.homeroomAbsenceExceptionInfo(book,'s1','1','2026-09-04','long_term');
assert(a.points===0,'Vắng dài ngày từ ngày thứ 4 = 0');
const rule=ctx.homeroomRuleById('nn26_43');
assert(rule.quantityUnit==='tuần','Rule 43 có đơn vị tuần');
assert(ctx.homeroomRuleTotalPoints(rule,6)===-120,'6 tuần × -20 = -120, không bị cap -100');
const perf=ctx.homeroomRuleById('nn26_reward_performance');
assert(ctx.homeroomRuleTotalPoints(perf,3)===150,'3 tiết mục × +50 = +150');
assert(code.includes("violation: (metrics.conduct?.violationCount || 0) > 0"),'Filter Có lỗi nề nếp dựa trên tổng lỗi quy chế');
console.log('ALL v53.3.2 QUALITY PATCH FIXTURES PASSED');
