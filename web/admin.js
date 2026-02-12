import { apiClient, saveConfig, loadConfig, fmtMonthYear } from "./api.js";

const KEY_API="DSP_API_URL";
const KEY_ADMIN="DSP_ADMIN_TOKEN";

let API_URL = loadConfig(KEY_API,"");
let ADMIN_TOKEN = loadConfig(KEY_ADMIN,"");
let api = API_URL ? apiClient(API_URL) : null;

const nav = document.getElementById("nav");
const navMore = document.getElementById("navMore");
const view = document.getElementById("view");
const crumb = document.getElementById("crumb");

const modal = document.getElementById("modal");
document.getElementById("btnConfig").onclick = ()=> modal.classList.add("show");
document.getElementById("modalClose").onclick = ()=> modal.classList.remove("show");
document.getElementById("saveCfg").onclick = ()=>{
  const u = document.getElementById("apiUrl").value.trim();
  const t = document.getElementById("adminToken").value.trim();
  if(!u || !t) return alert("API URL + Admin Token required");
  saveConfig(KEY_API,u);
  saveConfig(KEY_ADMIN,t);
  location.reload();
};
document.getElementById("btnLogout").onclick = ()=>{
  localStorage.removeItem(KEY_ADMIN);
  location.reload();
};
document.getElementById("apiUrl").value = API_URL;
document.getElementById("adminToken").value = ADMIN_TOKEN;

const MENU = [
  {id:"overview", label:"Overview"},
  {id:"courses", label:"Courses"},
  {id:"subjects", label:"Subjects"},
  {id:"notes", label:"Notes"},
  {id:"exams", label:"Exams"},
  {id:"students", label:"Students"},
  {id:"attempts", label:"Attempts"},
  {id:"release", label:"Result Release"},
  {id:"tabs", label:"Custom Tabs"},
  {id:"settings", label:"Settings"},
];
function setCrumb(name){ crumb.textContent = `Home › ${name}`; }
function renderNav(activeId){
  nav.innerHTML = MENU.map(m=>`<a href="#${m.id}" class="${m.id===activeId?'active':''}">${m.label}</a>`).join("");
  navMore.innerHTML = `<button id="moreBtn">More ▾</button>`;
}

function requireApi(){
  if(!API_URL){ view.innerHTML=`<div class="card"><h3>API not set</h3><p class="muted">Open API Settings and paste URL.</p></div>`; throw new Error("API not set"); }
  if(!ADMIN_TOKEN){ view.innerHTML=`<div class="card"><h3>Admin token not set</h3><p class="muted">Open API Settings and paste Admin Token.</p></div>`; throw new Error("Admin token not set"); }
}

async function bootstrap(){
  requireApi();
  const data = await api.call("admin.bootstrap",{admin_token: ADMIN_TOKEN});
  return data;
}

function kpiCard(title, value, hint=""){
  return `<div class="card"><h3>${title}</h3><div class="kpi">${value}</div><div class="muted">${hint}</div></div>`;
}

function formRow(label, id, placeholder=""){
  return `<div style="flex:1"><label class="muted">${label}</label><input class="input" id="${id}" placeholder="${placeholder}"/></div>`;
}

async function renderOverview(d){
  setCrumb("Overview");
  const activeStudents = (d.students||[]).filter(s=>String(s.status).toUpperCase()!=="BLOCKED").length;
  const attemptsThisMonth = (d.attempts||[]).filter(a=>String(a.month_year)===fmtMonthYear()).length;

  view.innerHTML = `
    <div class="grid">
      ${kpiCard("Active Students", activeStudents, "Not blocked")}
      ${kpiCard("Courses", (d.courses||[]).length, "Total")}
      ${kpiCard("Exams", (d.exams||[]).length, "Configured")}
      ${kpiCard("Attempts (This Month)", attemptsThisMonth, fmtMonthYear())}
    </div>
    <div style="height:14px"></div>
    <div class="card">
      <h3>Quick Actions</h3>
      <div class="row">
        <a class="btn" href="#courses">Add Course</a>
        <a class="btn secondary" href="#subjects">Add Subject</a>
        <a class="btn secondary" href="#exams">Add Exam</a>
        <a class="btn secondary" href="#release">Release Results</a>
      </div>
      <p class="muted">Question upload is done in Google Sheet (QUESTIONS tab) using question_exam_code.</p>
    </div>
  `;
}

async function renderCourses(d){
  setCrumb("Courses");
  view.innerHTML = `
    <div class="split">
      <div class="card">
        <h3>Add / Update Course</h3>
        ${formRow("Course ID (blank = new)","course_id","CRS-...")}
        <div style="height:10px"></div>
        ${formRow("Course Name","course_name","Tally Prime Pro")}
        <div style="height:10px"></div>
        <label class="muted">Active</label>
        <select class="input" id="course_active"><option>TRUE</option><option>FALSE</option></select>
        <div style="height:10px"></div>
        <label class="muted">Description</label>
        <textarea class="input" id="course_desc" rows="3"></textarea>
        <div style="height:10px"></div>
        <div class="row">
          ${formRow("Facebook URL","social_fb","")}
          ${formRow("Instagram URL","social_ig","")}
        </div>
        <div style="height:10px"></div>
        ${formRow("YouTube URL","social_yt","")}
        <div style="height:10px"></div>
        <div class="row">
          ${formRow("WhatsApp Link","support_whatsapp","https://wa.me/91...")}
          ${formRow("Call No.","support_call","")}
        </div>
        <div style="height:10px"></div>
        ${formRow("Support Email","support_email","")}
        <div style="height:12px"></div>
        <button class="btn" id="saveCourse">Save Course</button>
      </div>
      <div class="card">
        <h3>Courses</h3>
        <table class="table">
          <thead><tr><th>ID</th><th>Name</th><th>Active</th></tr></thead>
          <tbody>
            ${(d.courses||[]).map(c=>`
              <tr>
                <td>${c.course_id}</td>
                <td>${c.course_name}</td>
                <td>${c.active}</td>
              </tr>
            `).join("") || `<tr><td colspan="3" class="muted">No courses</td></tr>`}
          </tbody>
        </table>
        <p class="muted">To edit: copy Course ID into form and change fields.</p>
      </div>
    </div>
  `;

  document.getElementById("saveCourse").onclick = async ()=>{
    const payload = {
      admin_token: ADMIN_TOKEN,
      course_id: document.getElementById("course_id").value.trim(),
      course_name: document.getElementById("course_name").value.trim(),
      active: document.getElementById("course_active").value,
      description: document.getElementById("course_desc").value,
      social_fb: document.getElementById("social_fb").value,
      social_ig: document.getElementById("social_ig").value,
      social_yt: document.getElementById("social_yt").value,
      support_whatsapp: document.getElementById("support_whatsapp").value,
      support_call: document.getElementById("support_call").value,
      support_email: document.getElementById("support_email").value
    };
    await api.call("admin.upsertCourse", payload);
    alert("Saved");
    location.reload();
  };
}

async function renderSubjects(d){
  setCrumb("Subjects");
  const courseOpts = (d.courses||[]).map(c=>`<option value="${c.course_id}">${c.course_name}</option>`).join("");
  view.innerHTML = `
    <div class="split">
      <div class="card">
        <h3>Add / Update Subject</h3>
        <label class="muted">Course</label>
        <select class="input" id="s_course">${courseOpts}</select>
        <div style="height:10px"></div>
        ${formRow("Subject ID (blank = new)","s_id","SUB-...")}
        <div style="height:10px"></div>
        ${formRow("Subject Name","s_name","Basics")}
        <div style="height:10px"></div>
        <div class="row">
          ${formRow("Sort Order","s_order","1")}
          `<div style="flex:1"><label class="muted">Active</label><select class="input" id="s_active"><option>TRUE</option><option>FALSE</option></select></div>`
        </div>
        <div style="height:10px"></div>
        <div class="row">
          `<div style="flex:1"><label class="muted">Notes Enabled</label><select class="input" id="s_notes"><option>TRUE</option><option>FALSE</option></select></div>`
          `<div style="flex:1"><label class="muted">Exam Enabled</label><select class="input" id="s_exam"><option>TRUE</option><option>FALSE</option></select></div>`
        </div>
        <div style="height:12px"></div>
        <button class="btn" id="saveSubject">Save Subject</button>
      </div>
      <div class="card">
        <h3>Subjects</h3>
        <table class="table">
          <thead><tr><th>ID</th><th>Course</th><th>Name</th><th>Active</th></tr></thead>
          <tbody>
            ${(d.subjects||[]).map(s=>`
              <tr><td>${s.subject_id}</td><td>${s.course_id}</td><td>${s.subject_name}</td><td>${s.active}</td></tr>
            `).join("") || `<tr><td colspan="4" class="muted">No subjects</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
  document.getElementById("saveSubject").onclick = async ()=>{
    const payload = {
      admin_token: ADMIN_TOKEN,
      subject_id: document.getElementById("s_id").value.trim(),
      course_id: document.getElementById("s_course").value,
      subject_name: document.getElementById("s_name").value.trim(),
      sort_order: document.getElementById("s_order").value,
      active: document.getElementById("s_active").value,
      notes_enabled: document.getElementById("s_notes").value,
      exam_enabled: document.getElementById("s_exam").value
    };
    await api.call("admin.upsertSubject", payload);
    alert("Saved");
    location.reload();
  };
}

async function renderNotes(d){
  setCrumb("Notes");
  const courseOpts = (d.courses||[]).map(c=>`<option value="${c.course_id}">${c.course_name}</option>`).join("");
  const subjOpts = (d.subjects||[]).map(s=>`<option value="${s.subject_id}">${s.subject_name} (${s.course_id})</option>`).join("");
  view.innerHTML = `
    <div class="split">
      <div class="card">
        <h3>Add / Update Note</h3>
        <label class="muted">Course</label>
        <select class="input" id="n_course">${courseOpts}</select>
        <div style="height:10px"></div>
        <label class="muted">Subject</label>
        <select class="input" id="n_subject">${subjOpts}</select>
        <div style="height:10px"></div>
        ${formRow("Note ID (blank = new)","n_id","N-...")}
        <div style="height:10px"></div>
        ${formRow("Title","n_title","Excel Formulas PDF")}
        <div style="height:10px"></div>
        <label class="muted">Type</label>
        <select class="input" id="n_type"><option>PDF</option><option>DRIVE</option><option>YOUTUBE</option><option>LINK</option></select>
        <div style="height:10px"></div>
        ${formRow("URL","n_url","https://...")}
        <div style="height:10px"></div>
        <div class="row">
          ${formRow("Sort Order","n_order","1")}
          `<div style="flex:1"><label class="muted">Active</label><select class="input" id="n_active"><option>TRUE</option><option>FALSE</option></select></div>`
        </div>
        <div style="height:12px"></div>
        <button class="btn" id="saveNote">Save Note</button>
      </div>

      <div class="card">
        <h3>Notes</h3>
        <table class="table">
          <thead><tr><th>Title</th><th>Subject</th><th>Type</th><th>Active</th></tr></thead>
          <tbody>
            ${(d.notes||[]).map(n=>`
              <tr><td>${n.title}</td><td>${n.subject_id}</td><td>${n.type}</td><td>${n.active}</td></tr>
            `).join("") || `<tr><td colspan="4" class="muted">No notes</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
  document.getElementById("saveNote").onclick = async ()=>{
    const payload = {
      admin_token: ADMIN_TOKEN,
      note_id: document.getElementById("n_id").value.trim(),
      course_id: document.getElementById("n_course").value,
      subject_id: document.getElementById("n_subject").value,
      title: document.getElementById("n_title").value.trim(),
      type: document.getElementById("n_type").value,
      url: document.getElementById("n_url").value.trim(),
      sort_order: document.getElementById("n_order").value,
      active: document.getElementById("n_active").value
    };
    await api.call("admin.upsertNote", payload);
    alert("Saved");
    location.reload();
  };
}

async function renderExams(d){
  setCrumb("Exams");
  const courseOpts = (d.courses||[]).map(c=>`<option value="${c.course_id}">${c.course_name}</option>`).join("");
  const subjOpts = (d.subjects||[]).map(s=>`<option value="${s.subject_id}">${s.subject_name} (${s.course_id})</option>`).join("");
  view.innerHTML = `
    <div class="split">
      <div class="card">
        <h3>Add / Update Exam</h3>
        <label class="muted">Course</label>
        <select class="input" id="e_course">${courseOpts}</select>
        <div style="height:10px"></div>
        <label class="muted">Subject</label>
        <select class="input" id="e_subject">${subjOpts}</select>
        <div style="height:10px"></div>
        ${formRow("Exam ID (blank = new)","e_id","EXM-...")}
        <div style="height:10px"></div>
        ${formRow("Exam Title","e_title","Excel Test 1")}
        <div style="height:10px"></div>
        <div class="row">
          ${formRow("Duration (min)","e_dur","30")}
          ${formRow("Total Marks","e_total","50")}
        </div>
        <div style="height:10px"></div>
        <div class="row">
          ${formRow("Pass Marks","e_pass","30")}
          ${formRow("Negative per wrong","e_neg","0")}
        </div>
        <div style="height:10px"></div>
        ${formRow("Question Exam Code (key)","e_qcode","EXCEL_TEST_1")}
        <div style="height:10px"></div>
        <div class="row">
          `<div style="flex:1"><label class="muted">Active</label><select class="input" id="e_active"><option>TRUE</option><option>FALSE</option></select></div>`
          `<div style="flex:1"><label class="muted">Shuffle Q</label><select class="input" id="e_shq"><option>TRUE</option><option>FALSE</option></select></div>`
          `<div style="flex:1"><label class="muted">Shuffle Options</label><select class="input" id="e_sho"><option>TRUE</option><option>FALSE</option></select></div>`
        </div>
        <div style="height:12px"></div>
        <button class="btn" id="saveExam">Save Exam</button>
        <p class="muted">Upload questions in Google Sheet QUESTIONS using the same Question Exam Code.</p>
      </div>

      <div class="card">
        <h3>Exams</h3>
        <table class="table">
          <thead><tr><th>Exam</th><th>Course</th><th>Subject</th><th>Active</th></tr></thead>
          <tbody>
            ${(d.exams||[]).map(x=>`
              <tr><td>${x.exam_title}</td><td>${x.course_id}</td><td>${x.subject_id}</td><td>${x.active}</td></tr>
            `).join("") || `<tr><td colspan="4" class="muted">No exams</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
  document.getElementById("saveExam").onclick = async ()=>{
    const payload = {
      admin_token: ADMIN_TOKEN,
      exam_id: document.getElementById("e_id").value.trim(),
      course_id: document.getElementById("e_course").value,
      subject_id: document.getElementById("e_subject").value,
      exam_title: document.getElementById("e_title").value.trim(),
      duration_min: document.getElementById("e_dur").value,
      total_marks: document.getElementById("e_total").value,
      pass_marks: document.getElementById("e_pass").value,
      negative_marks: document.getElementById("e_neg").value,
      question_exam_code: document.getElementById("e_qcode").value.trim(),
      active: document.getElementById("e_active").value,
      shuffle_questions: document.getElementById("e_shq").value,
      shuffle_options: document.getElementById("e_sho").value
    };
    await api.call("admin.upsertExam", payload);
    alert("Saved");
    location.reload();
  };
}

async function renderStudents(d){
  setCrumb("Students");
  view.innerHTML = `
    <div class="card">
      <h3>Students</h3>
      <p class="muted">Block/Unblock students. Allow exams via Student Access.</p>
    </div>
    <div style="height:12px"></div>
    <div class="card">
      <table class="table">
        <thead><tr><th>ID</th><th>Name</th><th>Mobile</th><th>Course</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          ${(d.students||[]).map(s=>`
            <tr>
              <td>${s.student_id}</td><td>${s.name}</td><td>${s.mobile}</td><td>${s.assigned_course_id}</td>
              <td>${s.status}</td>
              <td>
                <button class="btn secondary" data-sid="${s.student_id}" data-st="${String(s.status).toUpperCase()==="BLOCKED"?"ACTIVE":"BLOCKED"}">
                  ${String(s.status).toUpperCase()==="BLOCKED"?"Unblock":"Block"}
                </button>
              </td>
            </tr>
          `).join("") || `<tr><td colspan="6" class="muted">No students yet</td></tr>`}
        </tbody>
      </table>
    </div>

    <div style="height:12px"></div>
    <div class="card">
      <h3>Allow Exam (Student Access)</h3>
      <div class="row">
        ${formRow("Student ID","a_sid","DS-...")}
        ${formRow("Course ID","a_cid","CRS-...")}
      </div>
      <div style="height:10px"></div>
      <div class="row">
        ${formRow("Subject ID","a_sub","SUB-...")}
        ${formRow("Exam ID","a_ex","EXM-...")}
      </div>
      <div style="height:10px"></div>
      <label class="muted">Allowed</label>
      <select class="input" id="a_allow"><option>TRUE</option><option>FALSE</option></select>
      <div style="height:12px"></div>
      <button class="btn" id="saveAllow">Save Allow</button>
      <p class="muted">Tip: copy IDs from Courses/Subjects/Exams tables.</p>
    </div>
  `;

  view.onclick = async (e)=>{
    const b = e.target.closest("button[data-sid]");
    if(!b) return;
    await api.call("admin.setStudentStatus",{admin_token: ADMIN_TOKEN, student_id: b.dataset.sid, status: b.dataset.st});
    alert("Updated");
    location.reload();
  };
  document.getElementById("saveAllow").onclick = async ()=>{
    const payload = {
      admin_token: ADMIN_TOKEN,
      student_id: document.getElementById("a_sid").value.trim(),
      course_id: document.getElementById("a_cid").value.trim(),
      subject_id: document.getElementById("a_sub").value.trim(),
      exam_id: document.getElementById("a_ex").value.trim(),
      allowed: document.getElementById("a_allow").value
    };
    await api.call("admin.setStudentAllow", payload);
    alert("Saved");
    location.reload();
  };
}

async function renderAttempts(d){
  setCrumb("Attempts");
  view.innerHTML = `
    <div class="card">
      <h3>Attempts</h3>
      <p class="muted">Review attempts and override marks if needed.</p>
    </div>
    <div style="height:12px"></div>
    <div class="card">
      <table class="table">
        <thead><tr><th>Attempt</th><th>Student</th><th>Exam</th><th>Month</th><th>Auto</th><th>Final</th><th>Status</th></tr></thead>
        <tbody>
          ${(d.attempts||[]).slice(0,100).map(a=>`
            <tr>
              <td>${a.attempt_id}</td>
              <td>${a.student_id}</td>
              <td>${a.exam_id}</td>
              <td>${a.month_year}</td>
              <td>${a.score_auto}</td>
              <td>${a.score_final}</td>
              <td>${a.review_status}</td>
            </tr>
          `).join("") || `<tr><td colspan="7" class="muted">No attempts</td></tr>`}
        </tbody>
      </table>
    </div>

    <div style="height:12px"></div>
    <div class="card">
      <h3>Review / Override</h3>
      ${formRow("Attempt ID","rv_id","AT-...")}
      <div style="height:10px"></div>
      ${formRow("Final Score","rv_score","")}
      <div style="height:10px"></div>
      <label class="muted">Remarks</label>
      <textarea class="input" id="rv_rem" rows="3"></textarea>
      <div style="height:12px"></div>
      <button class="btn" id="saveReview">Save Review</button>
    </div>
  `;
  document.getElementById("saveReview").onclick = async ()=>{
    const payload = {
      admin_token: ADMIN_TOKEN,
      attempt_id: document.getElementById("rv_id").value.trim(),
      score_final: document.getElementById("rv_score").value,
      remarks: document.getElementById("rv_rem").value
    };
    await api.call("admin.reviewAttempt", payload);
    alert("Reviewed");
    location.reload();
  };
}

async function renderRelease(d){
  setCrumb("Result Release");
  const cur = fmtMonthYear();
  const months = Array.from(new Set((d.attempts||[]).map(a=>String(a.month_year)))).sort();
  view.innerHTML = `
    <div class="card">
      <h3>Month-Year Buckets</h3>
      <p class="muted">Release results month-wise (e.g., Feb2026). Students see PASS/FAIL only after release.</p>
    </div>
    <div style="height:12px"></div>
    <div class="split">
      <div class="card">
        <h3>Release Month</h3>
        <label class="muted">MonthYear</label>
        <select class="input" id="m_my">
          <option>${cur}</option>
          ${months.filter(m=>m!==cur).map(m=>`<option>${m}</option>`).join("")}
        </select>
        <div style="height:10px"></div>
        <label class="muted">Course ID</label>
        <input class="input" id="m_course" placeholder="ALL or CRS-... (default ALL)" value="ALL"/>
        <div style="height:10px"></div>
        <label class="muted">Released</label>
        <select class="input" id="m_rel"><option>TRUE</option><option>FALSE</option></select>
        <div style="height:12px"></div>
        <button class="btn" id="doRelease">Save</button>
      </div>

      <div class="card">
        <h3>Current Releases</h3>
        <table class="table">
          <thead><tr><th>Month</th><th>Course</th><th>Released</th></tr></thead>
          <tbody>
            ${(d.releases||[]).map(r=>`
              <tr><td>${r.month_year}</td><td>${r.course_id}</td><td>${r.released}</td></tr>
            `).join("") || `<tr><td colspan="3" class="muted">No releases</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
  document.getElementById("doRelease").onclick = async ()=>{
    const payload = {
      admin_token: ADMIN_TOKEN,
      month_year: document.getElementById("m_my").value,
      course_id: document.getElementById("m_course").value.trim() || "ALL",
      released: document.getElementById("m_rel").value
    };
    await api.call("admin.releaseMonth", payload);
    alert("Saved");
    location.reload();
  };
}

async function renderTabs(d){
  setCrumb("Custom Tabs");
  view.innerHTML = `
    <div class="split">
      <div class="card">
        <h3>Add / Update Tab</h3>
        ${formRow("Tab ID (blank = new)","t_id","TAB-...")}
        <div style="height:10px"></div>
        ${formRow("Tab Name","t_name","Resume Builder")}
        <div style="height:10px"></div>
        ${formRow("URL","t_url","https://...")}
        <div style="height:10px"></div>
        <label class="muted">Open Mode</label>
        <select class="input" id="t_mode"><option value="iframe">iframe</option><option value="new_tab">new_tab</option></select>
        <div style="height:10px"></div>
        <label class="muted">Course ID</label>
        <input class="input" id="t_course" value="ALL"/>
        <div style="height:10px"></div>
        <div class="row">
          ${formRow("Sort Order","t_order","1")}
          `<div style="flex:1"><label class="muted">Active</label><select class="input" id="t_active"><option>TRUE</option><option>FALSE</option></select></div>`
        </div>
        <div style="height:12px"></div>
        <button class="btn" id="saveTab">Save Tab</button>
      </div>
      <div class="card">
        <h3>Tabs</h3>
        <table class="table">
          <thead><tr><th>Name</th><th>Course</th><th>Mode</th><th>Active</th></tr></thead>
          <tbody>
            ${(d.custom_tabs||[]).map(t=>`
              <tr><td>${t.tab_name}</td><td>${t.course_id}</td><td>${t.open_mode}</td><td>${t.active}</td></tr>
            `).join("") || `<tr><td colspan="4" class="muted">No tabs</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
  document.getElementById("saveTab").onclick = async ()=>{
    const payload = {
      admin_token: ADMIN_TOKEN,
      tab_id: document.getElementById("t_id").value.trim(),
      tab_name: document.getElementById("t_name").value.trim(),
      url: document.getElementById("t_url").value.trim(),
      open_mode: document.getElementById("t_mode").value,
      course_id: document.getElementById("t_course").value.trim() || "ALL",
      sort_order: document.getElementById("t_order").value,
      active: document.getElementById("t_active").value
    };
    await api.call("admin.upsertCustomTab", payload);
    alert("Saved");
    location.reload();
  };
}

async function renderSettings(){
  setCrumb("Settings");
  view.innerHTML = `
    <div class="card">
      <h3>Settings</h3>
      <p class="muted">API URL and Admin Token are saved in your browser.</p>
      <button class="btn secondary" id="clear">Clear Admin Token</button>
    </div>
  `;
  document.getElementById("clear").onclick = ()=>{
    localStorage.removeItem(KEY_ADMIN);
    location.reload();
  };
}

async function route(){
  try{
    const page = (location.hash||"#overview").slice(1);
    renderNav(page);
    const d = await bootstrap();

    if(page==="overview") return renderOverview(d);
    if(page==="courses") return renderCourses(d);
    if(page==="subjects") return renderSubjects(d);
    if(page==="notes") return renderNotes(d);
    if(page==="exams") return renderExams(d);
    if(page==="students") return renderStudents(d);
    if(page==="attempts") return renderAttempts(d);
    if(page==="release") return renderRelease(d);
    if(page==="tabs") return renderTabs(d);
    if(page==="settings") return renderSettings();

    renderOverview(d);
  }catch(err){
    console.error(err);
    if(String(err.message||"").includes("API not set") || String(err.message||"").includes("token not set")) return;
    view.innerHTML = `<div class="card"><h3>Error</h3><p class="muted">${err.message}</p></div>`;
  }
}
window.addEventListener("hashchange", route);
route();
