import { apiClient, saveConfig, loadConfig } from "./api.js";

const KEY_API = "DSP_API_URL";
const KEY_STUDENT = "DSP_STUDENT_ID";

let API_URL = loadConfig(KEY_API,"");
let api = API_URL ? apiClient(API_URL) : null;

const nav = document.getElementById("nav");
const navMore = document.getElementById("navMore");
const view = document.getElementById("view");
const crumb = document.getElementById("crumb");

const modal = document.getElementById("modal");
document.getElementById("btnConfig").onclick = ()=> modal.classList.add("show");
document.getElementById("modalClose").onclick = ()=> modal.classList.remove("show");
document.getElementById("saveApi").onclick = ()=>{
  const v = document.getElementById("apiUrl").value.trim();
  if(!v) return alert("Paste API URL");
  saveConfig(KEY_API, v);
  location.reload();
};
document.getElementById("btnLogout").onclick = ()=>{
  localStorage.removeItem(KEY_STUDENT);
  location.reload();
};

document.getElementById("apiUrl").value = API_URL;

const MENU = [
  {id:"home", label:"Home (Dashboard)"},
  {id:"courses", label:"My Courses"},
  {id:"subjects", label:"Subjects"},
  {id:"notes", label:"Notes Library"},
  {id:"exams", label:"Quizzes / Exams"},
  {id:"history", label:"History (Attempts)"},
  {id:"certs", label:"Certificates & Marksheet"},
  {id:"support", label:"Support Center"},
  {id:"settings", label:"Settings"},
];

function setCrumb(name){ crumb.textContent = `Home › ${name}`; }

function renderNav(activeId){
  nav.innerHTML = MENU.map(m=>`<a href="#${m.id}" class="${m.id===activeId?'active':''}">${m.label}</a>`).join("");
}

function requireApi(){
  if(!API_URL) {
    view.innerHTML = `<div class="card">
      <h3>API not set</h3>
      <p class="muted">Click “API Settings” and paste your Apps Script Web App URL.</p>
    </div>`;
    throw new Error("API not set");
  }
}

async function bootstrapPublic(){
  requireApi();
  const b = await api.call("student.bootstrap", {});
  return b;
}

function getStudentId(){ return loadConfig(KEY_STUDENT,""); }

async function ensureLogin(){
  const sid = getStudentId();
  if(sid) return sid;

  setCrumb("Login");
  renderNav("home");
  const b = await bootstrapPublic();

  view.innerHTML = `
    <div class="split">
      <div class="card">
        <h3>Create / Continue</h3>
        <div class="row">
          <div style="flex:1">
            <label class="muted">Name</label>
            <input class="input" id="name" placeholder="Student name"/>
          </div>
          <div style="flex:1">
            <label class="muted">Mobile</label>
            <input class="input" id="mobile" placeholder="10-digit mobile"/>
          </div>
        </div>
        <div style="height:10px"></div>
        <label class="muted">Select Course</label>
        <select class="input" id="course">
          ${b.courses.map(c=>`<option value="${c.course_id}">${c.course_name}</option>`).join("")}
        </select>
        <div style="height:12px"></div>
        <button class="btn" id="go">Continue</button>
      </div>
      <div class="card">
        <h3>About</h3>
        <p class="muted">Your dashboard, notes, exams, results, certificates, and support — in one place.</p>
        <p class="muted">Results are visible only after Admin releases them.</p>
      </div>
    </div>
  `;

  document.getElementById("go").onclick = async ()=>{
    const name = document.getElementById("name").value.trim();
    const mobile = document.getElementById("mobile").value.trim();
    const course_id = document.getElementById("course").value;
    if(!name || !mobile) return alert("Enter name + mobile");
    const r = await api.call("student.register",{name,mobile,course_id});
    saveConfig(KEY_STUDENT, r.student_id);
    location.hash = "#home";
    location.reload();
  };

  return null;
}

async function loadStudentData(){
  const student_id = getStudentId();
  if(!student_id) return null;
  const data = await api.call("student.getCourseData",{student_id});
  return data;
}

function monthReleased(data, attempt){
  const my = attempt.month_year;
  return data.released_months.includes(my) || attempt.result_released;
}

function buildMoreDropdown(customTabs){
  // custom tabs go here
  const items = (customTabs||[]).map(t=>{
    const mode = (t.open_mode||"iframe");
    return { label: t.tab_name, url: t.url, mode };
  });
  navMore.innerHTML = `
    <button id="moreBtn">More ▾</button>
    <div id="morePanel" style="display:none"></div>
  `;
  const panel = navMore.querySelector("#morePanel");
  panel.innerHTML = items.length ? items.map(i=>`
    <a href="#" data-url="${i.url}" data-mode="${i.mode}">${i.label}</a>
  `).join("") : `<div class="card"><small class="muted">No extra tools added yet.</small></div>`;

  const btn = navMore.querySelector("#moreBtn");
  btn.onclick = ()=>{
    panel.style.display = panel.style.display==="none" ? "block" : "none";
    panel.style.marginTop = "8px";
  };
  panel.onclick = (e)=>{
    const a = e.target.closest("a"); if(!a) return;
    e.preventDefault();
    const url = a.getAttribute("data-url");
    const mode = a.getAttribute("data-mode");
    if(mode==="new_tab") window.open(url,"_blank");
    else {
      setCrumb("Extra Tool");
      view.innerHTML = `<div class="card"><h3>${a.textContent}</h3><iframe src="${url}" style="width:100%;height:75vh;border:1px solid var(--border);border-radius:12px"></iframe></div>`;
    }
  };
}

function renderHome(data){
  setCrumb("Dashboard");
  const student = data.student;
  const course = data.course;

  const attempts = data.attempts || [];
  const latest = attempts[0];

  view.innerHTML = `
    <div class="grid">
      <div class="card"><h3>Student</h3><div class="kpi">${student.name}</div><div class="muted">${student.student_id}</div></div>
      <div class="card"><h3>Course</h3><div class="kpi">${course.course_name}</div><div class="muted">${course.description||""}</div></div>
      <div class="card"><h3>Active Exams</h3><div class="kpi">${(data.exams||[]).filter(x=>x.active).length}</div><div class="muted">Allowed exams only appear in Exams tab</div></div>
      <div class="card"><h3>Latest Attempt</h3>
        <div class="kpi">${latest?latest.month_year:"—"}</div>
        <div class="muted">${latest?latest.exam_id:"No attempts yet"}</div>
      </div>
    </div>

    <div style="height:14px"></div>

    <div class="split">
      <div class="card">
        <h3>Announcements</h3>
        <p class="muted">Announcements UI will show here (v1+). For now, use Notes or Support for updates.</p>
      </div>
      <div class="card">
        <h3>Support</h3>
        <div class="row">
          ${course.support.whatsapp?`<a class="btn" href="${course.support.whatsapp}" target="_blank">WhatsApp</a>`:""}
          ${course.support.call?`<a class="btn secondary" href="tel:${course.support.call}">Call</a>`:""}
          ${course.support.email?`<a class="btn secondary" href="mailto:${course.support.email}">Email</a>`:""}
        </div>
        <div style="height:10px"></div>
        <div class="row">
          ${course.social.fb?`<a class="badge" href="${course.social.fb}" target="_blank">Facebook</a>`:""}
          ${course.social.ig?`<a class="badge" href="${course.social.ig}" target="_blank">Instagram</a>`:""}
          ${course.social.yt?`<a class="badge" href="${course.social.yt}" target="_blank">YouTube</a>`:""}
        </div>
      </div>
    </div>
  `;
}

function renderSubjects(data){
  setCrumb("Subjects");
  const examsBySubject = new Map();
  (data.exams||[]).forEach(ex=>{
    if(!examsBySubject.has(ex.subject_id)) examsBySubject.set(ex.subject_id,[]);
    examsBySubject.get(ex.subject_id).push(ex);
  });

  view.innerHTML = `
    <div class="card">
      <h3>Subjects</h3>
      <p class="muted">Exam button appears only when Subject Active + Exam Active + You are Allowed.</p>
    </div>
    <div style="height:12px"></div>
    <div class="grid" style="grid-template-columns:repeat(3,minmax(260px,1fr))">
      ${(data.subjects||[]).map(s=>{
        const exams = examsBySubject.get(s.subject_id)||[];
        const ex = exams[0];
        const allowed = ex && data.allowed_exam_ids.includes(ex.exam_id) && ex.active && s.active && s.exam_enabled;
        return `
          <div class="card">
            <h3>${s.subject_name}</h3>
            <div class="row">
              <span class="badge ${s.active?'good':'bad'}">${s.active?'Active':'Inactive'}</span>
              <span class="badge">${s.notes_enabled?'Notes On':'Notes Off'}</span>
              <span class="badge">${s.exam_enabled?'Exam On':'Exam Off'}</span>
            </div>
            <div style="height:10px"></div>
            <div class="row">
              <button class="btn secondary" data-sub="${s.subject_id}" data-act="notes">Open Notes</button>
              <button class="btn" ${allowed?'':'disabled style="opacity:.5;cursor:not-allowed"'}
                data-ex="${ex?ex.exam_id:''}" data-act="exam">
                ${allowed?'Start Exam':'Exam Not Available'}
              </button>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  view.onclick = (e)=>{
    const b = e.target.closest("button");
    if(!b) return;
    const act = b.getAttribute("data-act");
    if(act==="notes"){ location.hash="#notes"; }
    if(act==="exam"){
      const exid = b.getAttribute("data-ex");
      if(exid) openExam(data, exid);
    }
  };
}

function renderNotes(data){
  setCrumb("Notes Library");
  const notes = (data.notes||[]);
  view.innerHTML = `
    <div class="card">
      <h3>Notes</h3>
      <p class="muted">Course & subject-wise notes controlled by Admin.</p>
    </div>
    <div style="height:12px"></div>
    <div class="card">
      <table class="table">
        <thead><tr><th>Title</th><th>Type</th><th>Open</th></tr></thead>
        <tbody>
          ${notes.map(n=>`
            <tr>
              <td>${n.title}</td>
              <td><span class="badge">${n.type}</span></td>
              <td><a class="btn secondary" href="${n.url}" target="_blank">Open</a></td>
            </tr>
          `).join("") || `<tr><td colspan="3" class="muted">No notes added yet.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function renderExams(data){
  setCrumb("Quizzes / Exams");
  const list = (data.exams||[])
    .filter(ex=>ex.active && data.allowed_exam_ids.includes(ex.exam_id));
  view.innerHTML = `
    <div class="card">
      <h3>Available Exams</h3>
      <p class="muted">Only active + allowed exams appear here.</p>
    </div>
    <div style="height:12px"></div>
    <div class="card">
      <table class="table">
        <thead><tr><th>Exam</th><th>Duration</th><th>Pass</th><th>Action</th></tr></thead>
        <tbody>
          ${list.map(ex=>`
            <tr>
              <td>${ex.exam_title}</td>
              <td>${ex.duration_min} min</td>
              <td>${ex.pass_marks}</td>
              <td><button class="btn" data-ex="${ex.exam_id}">Start</button></td>
            </tr>
          `).join("") || `<tr><td colspan="4" class="muted">No exams available yet.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
  view.onclick = (e)=>{
    const b = e.target.closest("button[data-ex]");
    if(!b) return;
    openExam(data, b.getAttribute("data-ex"));
  };
}

async function openExam(data, exam_id){
  setCrumb("Exam");
  const student_id = data.student.student_id;
  const payload = await api.call("student.getExam",{student_id, exam_id});
  const ex = payload.exam;
  let qs = payload.questions || [];

  // shuffle questions if enabled
  if(ex.shuffle_questions) qs = qs.sort(()=>Math.random()-0.5);

  const started_at = new Date().toISOString();
  const answers = {};

  view.innerHTML = `
    <div class="card">
      <h3>${ex.exam_title}</h3>
      <div class="row">
        <span class="badge">Duration: ${ex.duration_min} min</span>
        <span class="badge">Pass: ${ex.pass_marks}</span>
        <span class="badge">Questions: ${qs.length}</span>
      </div>
      <p class="muted">No auto-submit. You decide when to submit.</p>
    </div>
    <div style="height:12px"></div>
    <div class="card">
      ${qs.map((q,idx)=>`
        <div style="padding:10px 0;border-bottom:1px solid var(--border)">
          <div><b>Q${idx+1}.</b> ${q.question}</div>
          <div style="height:8px"></div>
          ${renderQ_(q)}
        </div>
      `).join("") || `<div class="muted">No questions added yet for this exam.</div>`}
      <div style="height:12px"></div>
      <button class="btn" id="submitExam" ${qs.length? "":"disabled style='opacity:.5'"}>Submit</button>
      <button class="btn secondary" id="backExams">Back</button>
    </div>
  `;

  function renderQ_(q){
    const t = String(q.type||"mcq").toLowerCase();
    if(t==="truefalse"){
      return `
        <label><input type="radio" name="${q.question_id}" value="TRUE"> TRUE</label><br/>
        <label><input type="radio" name="${q.question_id}" value="FALSE"> FALSE</label>
      `;
    }
    if(t==="fill"){
      return `<input class="input" data-qid="${q.question_id}" placeholder="Type your answer"/>`;
    }
    if(t==="multi"){
      return `
        <label><input type="checkbox" name="${q.question_id}" value="A"> ${q.opt_a}</label><br/>
        <label><input type="checkbox" name="${q.question_id}" value="B"> ${q.opt_b}</label><br/>
        <label><input type="checkbox" name="${q.question_id}" value="C"> ${q.opt_c}</label><br/>
        <label><input type="checkbox" name="${q.question_id}" value="D"> ${q.opt_d}</label>
      `;
    }
    // mcq default
    return `
      <label><input type="radio" name="${q.question_id}" value="A"> ${q.opt_a}</label><br/>
      <label><input type="radio" name="${q.question_id}" value="B"> ${q.opt_b}</label><br/>
      <label><input type="radio" name="${q.question_id}" value="C"> ${q.opt_c}</label><br/>
      <label><input type="radio" name="${q.question_id}" value="D"> ${q.opt_d}</label>
    `;
  }

  // collect answers on submit
  document.getElementById("submitExam").onclick = async ()=>{
    // radio/checkbox
    qs.forEach(q=>{
      const t = String(q.type||"mcq").toLowerCase();
      const qid = q.question_id;
      if(t==="fill"){
        const inp = view.querySelector(`input[data-qid="${qid}"]`);
        answers[qid] = inp ? inp.value : "";
      } else if (t==="multi") {
        const boxes = [...view.querySelectorAll(`input[type="checkbox"][name="${qid}"]:checked`)];
        answers[qid] = boxes.map(b=>b.value);
      } else {
        const sel = view.querySelector(`input[type="radio"][name="${qid}"]:checked`);
        answers[qid] = sel ? sel.value : "";
      }
    });

    const r = await api.call("student.submitAttempt",{student_id, exam_id, answers, started_at});
    alert(`Submitted! Auto score: ${r.score_auto}\nResult will be visible after admin releases.`);
    location.hash="#history";
    route();
  };

  document.getElementById("backExams").onclick = ()=>{ location.hash="#exams"; route(); };
}

function renderHistory(data){
  setCrumb("History (Attempts)");
  const attempts = data.attempts || [];
  view.innerHTML = `
    <div class="card">
      <h3>Attempts</h3>
      <p class="muted">PASS/FAIL appears only after Admin releases results for that month.</p>
    </div>
    <div style="height:12px"></div>
    <div class="card">
      <table class="table">
        <thead><tr><th>Month</th><th>Exam</th><th>Status</th><th>Score</th></tr></thead>
        <tbody>
          ${attempts.map(a=>{
            const visible = monthReleased(data,a);
            return `
              <tr>
                <td>${a.month_year}</td>
                <td>${a.exam_id}</td>
                <td>${visible ? `<span class="badge ${a.pass_fail==='PASS'?'good':'bad'}">${a.pass_fail}</span>` : `<span class="badge">Hidden</span>`}</td>
                <td>${visible ? a.score_final : "—"}</td>
              </tr>
            `;
          }).join("") || `<tr><td colspan="4" class="muted">No attempts yet.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function renderSupport(data){
  setCrumb("Support Center");
  const c = data.course;
  view.innerHTML = `
    <div class="card">
      <h3>Support</h3>
      <p class="muted">Contact your institute using the options below.</p>
      <div class="row">
        ${c.support.whatsapp?`<a class="btn" href="${c.support.whatsapp}" target="_blank">WhatsApp</a>`:""}
        ${c.support.call?`<a class="btn secondary" href="tel:${c.support.call}">Call</a>`:""}
        ${c.support.email?`<a class="btn secondary" href="mailto:${c.support.email}">Email</a>`:""}
      </div>
      <div style="height:10px"></div>
      <div class="row">
        ${c.social.fb?`<a class="badge" href="${c.social.fb}" target="_blank">Facebook</a>`:""}
        ${c.social.ig?`<a class="badge" href="${c.social.ig}" target="_blank">Instagram</a>`:""}
        ${c.social.yt?`<a class="badge" href="${c.social.yt}" target="_blank">YouTube</a>`:""}
      </div>
    </div>
  `;
}

function renderSettings(data){
  setCrumb("Settings");
  view.innerHTML = `
    <div class="card">
      <h3>Settings</h3>
      <p class="muted">Student ID: <b>${data.student.student_id}</b></p>
      <button class="btn secondary" id="clear">Clear Student Login</button>
    </div>
  `;
  document.getElementById("clear").onclick = ()=>{
    localStorage.removeItem(KEY_STUDENT);
    location.reload();
  };
}

function renderCerts(){
  setCrumb("Certificates & Marksheet");
  view.innerHTML = `
    <div class="card">
      <h3>Certificates & Marksheet</h3>
      <p class="muted">v1: Data tables are ready. UI issuance/release will be enabled after template upload.</p>
      <p class="muted">Admin will add 5–10 templates in Document Studio.</p>
    </div>
  `;
}

function renderProgress(){
  setCrumb("My Progress");
  view.innerHTML = `
    <div class="card">
      <h3>My Progress</h3>
      <p class="muted">v1: Progress engine (notes completed, time spent) will be added next.</p>
    </div>
  `;
}
function renderRank(){
  setCrumb("Rank & Badges");
  view.innerHTML = `
    <div class="card">
      <h3>Rank & Badges</h3>
      <p class="muted">v1: Badges & points rules table ready. Leaderboard UI in next iteration.</p>
    </div>
  `;
}
function renderLeaderboard(){
  setCrumb("Leaderboard");
  view.innerHTML = `
    <div class="card">
      <h3>Leaderboard</h3>
      <p class="muted">v1: Leaderboard engine will be enabled after points rules finalize.</p>
    </div>
  `;
}

async function route(){
  try{
    renderNav((location.hash||"#home").slice(1));
    await ensureLogin();
    const sid = getStudentId();
    if(!sid) return;

    const data = await loadStudentData();
    buildMoreDropdown(data.custom_tabs);

    const page = (location.hash||"#home").slice(1);
    if(page==="home") return renderHome(data);
    if(page==="courses") return renderHome(data);
    if(page==="subjects") return renderSubjects(data);
    if(page==="notes") return renderNotes(data);
    if(page==="exams") return renderExams(data);
    if(page==="history") return renderHistory(data);
    if(page==="support") return renderSupport(data);
    if(page==="settings") return renderSettings(data);
    if(page==="certs") return renderCerts();
    if(page==="progress") return renderProgress();
    if(page==="rank") return renderRank();
    if(page==="leaderboard") return renderLeaderboard();

    // default
    renderHome(data);
  }catch(err){
    console.error(err);
    if(String(err.message||"").includes("API not set")) return;
    view.innerHTML = `<div class="card"><h3>Error</h3><p class="muted">${err.message}</p></div>`;
  }
}
window.addEventListener("hashchange", route);
route();
