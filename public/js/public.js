import {db,doc,getDoc} from "./firebase.js";
import {getPublished} from "./services/content.js";

const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const initials=name=>String(name||"EESA").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();

const DEFAULT_SITE={
  eyebrow:"Electrical Engineering Students Association",
  title:"Build. Connect. Electrify the future.",
  description:"A student-led platform for technical activities, projects, events, achievements and the people shaping Electrical Engineering at DYPSEM.",
  aboutTitle:"A student association built around doing.",
  aboutText:"EESA brings together students who want to learn by building, participate in technical activities, share ideas and create a stronger Electrical Engineering community.",
  institutionalTitle:"Electrical Engineering at DYPSEM",
  institutionalText:"D. Y. Patil School of Engineering & Management is an AICTE-approved constituent unit of D. Y. Patil Education Society (Deemed to be University), Kolhapur. The school offers B.Tech programs including Electrical Engineering and emphasizes modern infrastructure, industry-oriented learning and practical exposure.",
  contact:"D.Y. Patil Vidyanagar, Kasaba Bavada, Kolhapur 416006, Maharashtra"
};

async function load(){
  const [events,projects,notices,achievements,gallery,site,committee]=await Promise.all([
    getPublished("events",6),getPublished("projects",8),getPublished("notices",6),
    getPublished("achievements",6),getPublished("gallery",8),getSite(),getCommittee()
  ]);
  const cfg={...DEFAULT_SITE,...(site||{})};

  const eventCount=events.length, projectCount=projects.length;
  $("hero-eyebrow").textContent=cfg.eyebrow;
  $("hero-title").innerHTML=highlightTitle(cfg.title);
  $("hero-description").textContent=cfg.description;
  $("about-title").textContent=cfg.aboutTitle;
  $("about-text").textContent=cfg.aboutText;
  $("institutional-title").textContent=cfg.institutionalTitle;
  $("institutional-text").textContent=cfg.institutionalText;
  $("contact-line").textContent=cfg.contact;

  $("stat-events").textContent=eventCount || "—";
  $("stat-projects").textContent=projectCount || "—";
  try{
    const stats=await getDoc(doc(db,"publicStats","current"));
    $("stat-members").textContent=stats.exists() ? (stats.data().memberCount ?? "—") : "—";
  }catch{$("stat-members").textContent="—";}

  renderEvents(events);renderProjects(projects);renderNotices(notices);renderAchievements(achievements);renderGallery(gallery);renderCommittee(committee);
}

function highlightTitle(title){
  const parts=String(title).split(/(electrify[^.?!]*)/i);
  return parts.map((p,i)=>/electrify/i.test(p)?`<span>${esc(p)}</span>`:esc(p)).join("");
}
function renderEvents(events){
  $("events-grid").innerHTML=events.length?events.map(e=>`<article class="card"><div class="card-body"><div class="card-meta">${esc(e.eventType||"EESA event")}</div><h3>${esc(e.title)}</h3><p>${esc(e.shortDescription||e.description||"")}</p><div class="card-footer"><span>${formatDate(e.startAt)}</span><span>${esc(e.venue||"Campus")}</span></div></div></article>`).join(""):`<div class="empty-state"><strong>No published events yet.</strong><span>Upcoming EESA activities will appear here when the committee publishes them.</span><a href="./portal.html#events">Open the member portal →</a></div>`;
}
function renderProjects(projects){
  $("projects-grid").innerHTML=projects.length?projects.map(p=>`<article class="card project-card"><div class="card-body"><div class="project-topline"><div class="card-meta">${esc((p.projectScale||"micro").toUpperCase())} PROJECT</div><span class="project-status">${esc(p.projectStatus||"Active")}</span></div><h3>${esc(p.title)}</h3>${p.tagline?`<p class="project-tagline">${esc(p.tagline)}</p>`:""}<p>${esc(p.description||"")}</p><div class="project-tags">${(p.techStack||[]).slice(0,5).map(x=>`<span>${esc(x)}</span>`).join("")}</div>${(p.builders||[]).length?`<div class="builder-list"><strong>Builders</strong>${(p.builders||[]).map(b=>`<span>${esc(b.name)}${b.role?` <small>• ${esc(b.role)}</small>`:""}</span>`).join("")}</div>`:""}<div class="card-footer"><span>${esc(p.category||"Student project")}</span><span>${esc(p.academicYear||"")}</span></div></div></article>`).join(""):`<div class="empty-state"><strong>Projects are coming to life.</strong><span>Published EESA micro and mega projects will be showcased here.</span><a href="./portal.html#projects">Open the project hub →</a></div>`;
}
function renderNotices(notices){
  $("notices-list").innerHTML=notices.length?notices.map(n=>`<article class="notice"><small>${esc(n.category||"General")} ${n.pinned?"• PINNED":""}</small><strong>${esc(n.title)}</strong><p>${esc(n.body||"")}</p></article>`).join(""):`<div class="empty-state"><strong>No public notices right now.</strong><span>Important EESA announcements will appear here.</span></div>`;
}
function renderAchievements(items){
  $("achievements-grid").innerHTML=items.length?items.map(a=>`<article class="feature achievement-card"><span class="icon">★</span><div class="card-meta">${esc(a.category||"Achievement")}</div><h3>${esc(a.title)}</h3><p>${esc(a.description||a.body||"")}</p>${a.date?`<small>${esc(formatDate(a.date))}</small>`:""}</article>`).join(""):`<div class="empty-state"><strong>Achievements will appear here.</strong><span>Competition results, recognitions and student milestones can be published from the EESA control room.</span></div>`;
}
function renderGallery(items){
  $("gallery-grid").innerHTML=items.length?items.map(g=>`<article class="gallery-card"><img src="${esc(g.imageUrl||g.url||"")}" alt="${esc(g.title||"EESA activity")}" loading="lazy"><div><small>${esc(g.category||"EESA")}</small><strong>${esc(g.title||"EESA activity")}</strong></div></article>`).join(""):`<div class="empty-state"><strong>The gallery is ready for your moments.</strong><span>Workshop, visit, competition and project photographs can be published here.</span></div>`;
}
function renderCommittee(members){
  const team=$("team-grid");
  if(!members?.length){team.innerHTML=`<div class="empty-state"><strong>The EESA team will appear here.</strong><span>Committee positions and public profiles will be published from the control room.</span></div>`;return;}
  team.innerHTML=members.map(m=>`<article class="team-card"><div class="team-avatar">${esc(initials(m.name))}</div><h3>${esc(m.name||"EESA Member")}</h3><small>${esc(m.positionLabel||m.position||"Committee Member")}</small><p>${esc(m.department||"Electrical Engineering")}${m.semester?` • ${esc(m.semester)}`:""}</p></article>`).join("");
}
async function getSite(){
  try{const s=await getDoc(doc(db,"siteSettings","public"));return s.exists()?s.data():null;}catch{return null;}
}
async function getCommittee(){
  try{const s=await getDoc(doc(db,"publicCommittee","current"));return s.exists()?(s.data().members||[]):[];}catch{return [];}
}
function formatDate(v){if(!v)return "Date TBA";try{const d=v.toDate?v.toDate():new Date(v);return d.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}catch{return "Date TBA"}}
load().catch(e=>console.error("EESA public page:",e));
