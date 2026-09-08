const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..','assets','js');
const store=new Map();
const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
const ctx={console,localStorage,sessionStorage:localStorage,window:null,globalThis:null,Date,JSON,Math,Map,Set,URL,Blob,TextEncoder,TextDecoder,setTimeout,clearTimeout,structuredClone:global.structuredClone};
ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(root+'/01-state.js','utf8'),ctx);
vm.runInContext(`function getSortedScheduleItems(items){const d={'Thứ 2':0,'Thứ 3':1,'Thứ 4':2,'Thứ 5':3,'Thứ 6':4,'Thứ 7':5},s={'Buổi sáng':0,'Buổi chiều':1};return [...items].sort((a,b)=>(d[a.day]??9)-(d[b.day]??9)||(s[a.session]??9)-(s[b.session]??9)||(parseInt(a.period)||0)-(parseInt(b.period)||0));}`,ctx);
let timetableSource=fs.readFileSync(root+'/12-timetable.js','utf8');
timetableSource=timetableSource.split('        function getDefaultProgressWeek()')[0];
vm.runInContext(timetableSource,ctx);
const ev=x=>vm.runInContext(x,ctx), tests=[];

ev(`state.curriculumProfiles=normalizeCurriculumProfiles([
 {scope:'class',grade:'12',className:'12A2',subject:'Toán',session:'all',weeks:[{week:1,lessons:[{ppctPeriod:'1',topic:'Sáng chung 1'},{ppctPeriod:'2',topic:'Sáng chung 2'}]},{week:2,lessons:[{ppctPeriod:'3',topic:'Sáng chung 3'}]}]},
 {scope:'class',grade:'12',className:'12A2',subject:'Toán',session:'afternoon',weeks:[{week:1,lessons:[{ppctPeriod:'1',topic:'Chiều riêng 1'},{ppctPeriod:'2',topic:'Chiều riêng 2'}]},{week:2,lessons:[{ppctPeriod:'3',topic:'Chiều riêng 3'}]}]}
]);`);

tests.push(['afternoon profile overrides all',ev(`(()=>{const a=getCurriculumForClass(1,'12A2','Toán','Buổi sáng'),b=getCurriculumForClass(1,'12A2','Toán','Buổi chiều');return a.sourceLabel==='Lớp 12A2'&&b.sourceLabel==='Lớp 12A2 · Buổi chiều'})()`)]);
tests.push(['lesson lookup separated by session',ev(`getCurriculumLessonByPpct('12A2','Toán',1,new Map(),'Buổi sáng').topic==='Sáng chung 1'&&getCurriculumLessonByPpct('12A2','Toán',1,new Map(),'Buổi chiều').topic==='Chiều riêng 1'`)]);

ev(`state.curriculumProfiles=normalizeCurriculumProfiles([
 {scope:'class',grade:'12',className:'12A2',subject:'Toán',session:'all',weeks:[{week:1,lessons:[{ppctPeriod:'1',topic:'Lớp dùng chung'}]}]},
 {scope:'grade',grade:'12',className:'',subject:'Toán',session:'afternoon',weeks:[{week:1,lessons:[{ppctPeriod:'1',topic:'Khối chiều riêng'}]}]}
]);`);
tests.push(['exact session beats all fallback across scopes',ev(`getCurriculumForClass(1,'12A2','Toán','Buổi chiều').lessons[0].topic==='Khối chiều riêng'`)]);

ev(`state.curriculumProfiles=normalizeCurriculumProfiles([
 {scope:'class',grade:'12',className:'12A2',subject:'Toán',session:'all',weeks:[{week:1,lessons:[{ppctPeriod:'1',topic:'Sáng chung 1'},{ppctPeriod:'2',topic:'Sáng chung 2'}]},{week:2,lessons:[{ppctPeriod:'3',topic:'Sáng chung 3'}]}]},
 {scope:'class',grade:'12',className:'12A2',subject:'Toán',session:'afternoon',weeks:[{week:1,lessons:[{ppctPeriod:'1',topic:'Chiều riêng 1'},{ppctPeriod:'2',topic:'Chiều riêng 2'}]},{week:2,lessons:[{ppctPeriod:'3',topic:'Chiều riêng 3'}]}]}
]);`);

ev(`state.teachingSchedule={1:[
 normalizeScheduleItem({day:'Thứ 2',session:'Buổi sáng',period:'1',class:'12A2',subject:'Toán'},1,0),
 normalizeScheduleItem({day:'Thứ 3',session:'Buổi sáng',period:'1',class:'12A2',subject:'Toán'},1,1),
 normalizeScheduleItem({day:'Thứ 2',session:'Buổi chiều',period:'1',class:'12A2',subject:'Toán'},1,2),
 normalizeScheduleItem({day:'Thứ 3',session:'Buổi chiều',period:'1',class:'12A2',subject:'Toán'},1,3)
],2:[
 normalizeScheduleItem({day:'Thứ 2',session:'Buổi sáng',period:'1',class:'12A2',subject:'Toán'},2,0),
 normalizeScheduleItem({day:'Thứ 2',session:'Buổi chiều',period:'1',class:'12A2',subject:'Toán'},2,1)
]}; renumberSchedulePpct(1); renumberSchedulePpct(2);`);

tests.push(['week 1 ppct restarts by session',ev(`(()=>{const m=state.teachingSchedule[1].filter(x=>x.session==='Buổi sáng').map(x=>x.ppctPeriod).join(','),a=state.teachingSchedule[1].filter(x=>x.session==='Buổi chiều').map(x=>x.ppctPeriod).join(',');return m==='1,2'&&a==='1,2'})()`)]);
tests.push(['week 2 continues each session independently',ev(`(()=>{const m=state.teachingSchedule[2].find(x=>x.session==='Buổi sáng'),a=state.teachingSchedule[2].find(x=>x.session==='Buổi chiều');return m.ppctPeriod==='3'&&a.ppctPeriod==='3'&&m.topic==='Sáng chung 3'&&a.topic==='Chiều riêng 3'})()`)]);
tests.push(['course key contains session',ev(`scheduleClassSubjectKey({class:'12A2',subject:'Toán',session:'Buổi sáng'})!==scheduleClassSubjectKey({class:'12A2',subject:'Toán',session:'Buổi chiều'})`)]);

for(const [name,ok] of tests) console.log(name,ok?'PASS':'FAIL');
if(tests.some(([,ok])=>!ok)) process.exit(1);
