import { useState, useEffect } from "react";

// ── Storage ──────────────────────────────────────────────────────────────────
function load(k, fb) { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } }
function save(k, v)  { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

// ── Latvian public holidays (MM-DD) ─────────────────────────────────────────
const HOLIDAYS = {
  "01-01": "Jaunais gads",
  "05-01": "Darba svētki",
  "05-04": "Neatkarības atjaunošanas diena",
  "06-23": "Līgo",
  "06-24": "Jāņi",
  "11-18": "Proklamēšanas diena",
  "12-24": "Ziemassvētku vakars",
  "12-25": "Ziemassvētki",
  "12-26": "Ziemassvētki",
  "12-31": "Vecgada vakars",
};

const MONTHS_LV = ["Janvāris","Februāris","Marts","Aprīlis","Maijs","Jūnijs","Jūlijs","Augusts","Septembris","Oktobris","Novembris","Decembris"];
const DAY_HDRS  = ["P","O","T","C","Pk","S","Sv"];
const DAYS_FULL = ["Pirmdiena","Otrdiena","Trešdiena","Ceturtdiena","Piektdiena","Sestdiena","Svētdiena"];

function todayStr() { return new Date().toISOString().slice(0,10); }
function pad(n) { return String(n).padStart(2,"0"); }
function dateKey(y,m,d) { return `${y}-${pad(m+1)}-${pad(d)}`; }
function isWeekend(date) { const d = new Date(date+"T12:00:00"); return d.getDay()===0||d.getDay()===6; }
function isHoliday(date) { return HOLIDAYS[date.slice(5)] !== undefined; }
function holidayName(date) { return HOLIDAYS[date.slice(5)] || ""; }
function getDayOfWeek(date) { return (new Date(date+"T12:00:00").getDay()+6)%7; }

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:       "#f5f4f0",
  card:     "#ffffff",
  text:     "#1a1a2e",
  muted:    "#9a98aa",
  accent:   "#4a6fa5",   // blue — Unihouse brand
  accentL:  "#e8eef6",
  green:    "#4caf7d",
  greenL:   "#eaf7f0",
  red:      "#e05c5c",
  redL:     "#fdeaea",
  orange:   "#e8943a",
  orangeL:  "#fef3e6",
  holiday:  "#9b5de5",
  holidayL: "#f3ecfd",
  weekend:  "#e05c5c",
  hdr:      "#1a1a2e",
  border:   "#ece9e3",
};

const ST = {
  todo:  { lbl:"Gaida",    clr:C.orange, bg:C.orangeL },
  doing: { lbl:"Procesā", clr:C.accent, bg:C.accentL },
  done:  { lbl:"Gatavs",   clr:C.green,  bg:C.greenL  },
};
const ST_ORDER = ["todo","doing","done"];

// ── Icon ─────────────────────────────────────────────────────────────────────
const Ic = ({ d, size=18, color="currentColor", sw=1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
  </svg>
);
const I = {
  plus:  "M12 5v14M5 12h14",
  x:     "M18 6 6 18M6 6l12 12",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  task:  "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  cal:   "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  meet:  "M8 7a4 4 0 108 0A4 4 0 008 7zM3 21v-1a8 8 0 0116 0v1",
  home:  "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10",
  check: "M20 6 9 17l-5-5",
  user:  "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  arrow: "M5 12h14M12 5l7 7-7 7",
  build: "M2 20h20M4 20V10l8-7 8 7v10M10 20v-6h4v6",
  star:  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
};

// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab]         = useState("home");
  const [tasks,    _setT]     = useState(() => load("uh_t", []));
  const [schedule, _setS]     = useState(() => load("uh_s", {}));
  const [meetings, _setM]     = useState(() => load("uh_m", []));

  const setTasks    = v => { _setT(v); save("uh_t", v); };
  const setSchedule = v => { _setS(v); save("uh_s", v); };
  const setMeetings = v => { _setM(v); save("uh_m", v); };

  const pending = tasks.filter(t => t.status !== "done").length;
  const today   = todayStr();

  const NAV = [
    { key:"home",     lbl:"Sākums",   icon:I.home },
    { key:"tasks",    lbl:"Darbi",    icon:I.task },
    { key:"schedule", lbl:"Grafiks",  icon:I.cal  },
    { key:"meetings", lbl:"Tikšanās", icon:I.meet },
  ];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", justifyContent:"center",
      fontFamily:"'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ width:"100%", maxWidth:430, minHeight:"100vh", background:C.bg,
        display:"flex", flexDirection:"column", position:"relative" }}>

        <main style={{ flex:1, overflowY:"auto", paddingBottom:72 }}>
          {tab==="home"     && <HomeTab tasks={tasks} meetings={meetings} schedule={schedule} today={today}/>}
          {tab==="tasks"    && <TasksTab tasks={tasks} setTasks={setTasks}/>}
          {tab==="schedule" && <ScheduleTab schedule={schedule} setSchedule={setSchedule} tasks={tasks}/>}
          {tab==="meetings" && <MeetingsTab meetings={meetings} setMeetings={setMeetings}/>}
        </main>

        {/* Bottom Nav */}
        <nav style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
          width:"100%", maxWidth:430, background:"rgba(255,255,255,0.96)",
          backdropFilter:"blur(12px)", borderTop:`1px solid ${C.border}`,
          display:"flex", zIndex:99, paddingBottom:"env(safe-area-inset-bottom,4px)" }}>
          {NAV.map(({ key, lbl, icon }) => {
            const on = tab===key;
            return (
              <button key={key} onClick={() => setTab(key)} style={{
                flex:1, background:"none", border:"none", cursor:"pointer",
                display:"flex", flexDirection:"column", alignItems:"center",
                gap:3, padding:"9px 0 7px", position:"relative",
              }}>
                {key==="tasks" && pending>0 && (
                  <span style={{ position:"absolute", top:6, right:"calc(50% - 18px)",
                    background:C.red, color:"#fff", fontSize:9, fontWeight:700,
                    borderRadius:8, padding:"1px 5px", lineHeight:1.4 }}>{pending}</span>
                )}
                <Ic d={icon} size={21} color={on?C.accent:C.muted}/>
                <span style={{ fontSize:10, fontWeight:on?700:500, color:on?C.accent:C.muted }}>{lbl}</span>
                {on && <div style={{ position:"absolute", bottom:0, left:"50%",
                  transform:"translateX(-50%)", width:24, height:2,
                  background:C.accent, borderRadius:2 }}/>}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

// ── Evening mode helpers ─────────────────────────────────────────────────────
const EVENING_HOUR = 19; // after 19:00 → show tomorrow

function getViewDate(forceToday = false) {
  const now  = new Date();
  const hour = now.getHours();
  if (!forceToday && hour >= EVENING_HOUR) {
    const tom = new Date(now);
    tom.setDate(tom.getDate() + 1);
    return tom.toISOString().slice(0, 10);
  }
  return now.toISOString().slice(0, 10);
}

function isEvening() {
  return new Date().getHours() >= EVENING_HOUR;
}


// ════════════════════════════════════════════════════════════════════════════
// HOME TAB — animated hero + today/tomorrow summary
// ════════════════════════════════════════════════════════════════════════════
function HomeTab({ tasks, meetings, schedule, today }) {
  const [visible, setVisible] = useState(false);
  const [cardsIn, setCardsIn] = useState([false,false,false,false]);
  const [forceToday, setForceToday] = useState(false);

  const evening   = isEvening();
  const viewDate  = getViewDate(forceToday);
  const isForTomorrow = viewDate !== today;

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 80);
    const t2 = setTimeout(() => setCardsIn([true,false,false,false]), 380);
    const t3 = setTimeout(() => setCardsIn([true,true,false,false]), 560);
    const t4 = setTimeout(() => setCardsIn([true,true,true,false]), 720);
    const t5 = setTimeout(() => setCardsIn([true,true,true,true]), 880);
    return () => [t1,t2,t3,t4,t5].forEach(clearTimeout);
  }, [forceToday]);

  const viewDow     = getDayOfWeek(viewDate);
  const viewDayName = DAYS_FULL[viewDow];
  const viewLabel   = new Date(viewDate+"T12:00:00").toLocaleDateString("lv-LV",{day:"numeric",month:"long",year:"numeric"});

  const viewTasks    = tasks.filter(t => t.date === viewDate);
  const viewMeetings = meetings.filter(m => m.date === viewDate);
  const viewSched    = schedule[viewDate] || [];

  // For evening mode: also show today's remaining summary
  const todayTasks   = tasks.filter(t => t.date === today);
  const doneCnt      = todayTasks.filter(t => t.status==="done").length;
  const totalCnt     = todayTasks.length;
  const pct          = totalCnt ? Math.round(doneCnt/totalCnt*100) : 0;

  const hol = isHoliday(viewDate);
  const wkd = isWeekend(viewDate);

  // Hero gradient: evening = deeper/warmer tone
  const heroGrad = isForTomorrow
    ? "linear-gradient(145deg, #1a1228 0%, #2d1b4e 55%, #1a2a4a 100%)"
    : "linear-gradient(145deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)";

  return (
    <div>
      {/* ── Hero ── */}
      <div style={{
        background: heroGrad,
        padding:"36px 22px 32px",
        borderRadius:"0 0 28px 28px",
        position:"relative", overflow:"hidden",
        transition:"background 0.6s ease",
      }}>
        {/* Building silhouette */}
        <svg style={{ position:"absolute", bottom:0, right:0, opacity:0.07 }}
          width="180" height="140" viewBox="0 0 180 140" fill="white">
          <rect x="10" y="40" width="40" height="100"/>
          <rect x="15" y="50" width="8" height="10"/><rect x="28" y="50" width="8" height="10"/>
          <rect x="15" y="65" width="8" height="10"/><rect x="28" y="65" width="8" height="10"/>
          <rect x="15" y="80" width="8" height="10"/><rect x="28" y="80" width="8" height="10"/>
          <rect x="15" y="95" width="8" height="10"/><rect x="28" y="95" width="8" height="10"/>
          <rect x="60" y="20" width="50" height="120"/>
          <rect x="67" y="30" width="10" height="12"/><rect x="82" y="30" width="10" height="12"/>
          <rect x="67" y="48" width="10" height="12"/><rect x="82" y="48" width="10" height="12"/>
          <rect x="67" y="66" width="10" height="12"/><rect x="82" y="66" width="10" height="12"/>
          <rect x="67" y="84" width="10" height="12"/><rect x="82" y="84" width="10" height="12"/>
          <rect x="67" y="102" width="10" height="12"/><rect x="82" y="102" width="10" height="12"/>
          <rect x="120" y="60" width="55" height="80"/>
          <rect x="128" y="70" width="10" height="12"/><rect x="143" y="70" width="10" height="12"/>
          <rect x="158" y="70" width="10" height="12"/>
          <rect x="128" y="88" width="10" height="12"/><rect x="143" y="88" width="10" height="12"/>
          <rect x="158" y="88" width="10" height="12"/>
          <rect x="128" y="106" width="10" height="12"/><rect x="143" y="106" width="10" height="12"/>
          <rect x="158" y="106" width="10" height="12"/>
        </svg>

        {/* Moon decoration for evening */}
        {isForTomorrow && (
          <div style={{ position:"absolute", top:20, right:24, opacity:0.35, fontSize:28 }}>🌙</div>
        )}

        <div style={{
          opacity: visible?1:0, transform: visible?"translateY(0)":"translateY(16px)",
          transition:"all 0.55s cubic-bezier(.4,0,.2,1)", position:"relative", zIndex:1,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <Ic d={I.build} size={16} color="rgba(255,255,255,0.5)"/>
            <span style={{ color:"rgba(255,255,255,0.5)", fontSize:12, fontWeight:600, letterSpacing:"1.5px", textTransform:"uppercase" }}>Unihouse</span>
          </div>

          {/* Evening mode toggle + greeting */}
          {isForTomorrow ? (
            <div style={{ marginBottom:6 }}>
              <div style={{ color:"#fff", fontSize:26, fontWeight:800, letterSpacing:"-0.5px", lineHeight:1.2 }}>
                Labvakar! 🌙
              </div>
              <div style={{ color:"rgba(255,255,255,0.6)", fontSize:13, marginTop:4 }}>
                Rādīts: <span style={{ color:"#c9b8ff", fontWeight:600, textTransform:"capitalize" }}>{viewDayName}, {viewLabel}</span>
              </div>
            </div>
          ) : (
            <div style={{ color:"#fff", fontSize:26, fontWeight:800, letterSpacing:"-0.5px", lineHeight:1.2, marginBottom:6 }}>
              Labdien! 👋
            </div>
          )}
          <div style={{ color:"rgba(255,255,255,0.45)", fontSize:12, textTransform:"capitalize", marginBottom:16 }}>
            {!isForTomorrow && `${viewDayName}, ${viewLabel}`}
          </div>

          {/* Evening: today's progress summary */}
          {isForTomorrow && totalCnt > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:10,
              background:"rgba(255,255,255,0.07)", borderRadius:14, padding:"10px 14px", marginBottom:14 }}>
              <ProgressRing pct={pct} size={46}/>
              <div>
                <div style={{ color:"rgba(255,255,255,0.5)", fontSize:11, marginBottom:2 }}>Šodienas rezultāts</div>
                <div style={{ color:"#fff", fontSize:13, fontWeight:600 }}>{doneCnt}/{totalCnt} pabeigti</div>
              </div>
            </div>
          )}

          {/* Toggle button: forceToday ↔ tomorrow */}
          {evening && (
            <button onClick={() => setForceToday(f => !f)} style={{
              background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.18)",
              borderRadius:20, padding:"5px 14px", color:"rgba(255,255,255,0.8)",
              fontSize:12, fontWeight:600, cursor:"pointer", marginBottom:16,
            }}>
              {isForTomorrow ? "← Šodiena" : "Rīt →"}
            </button>
          )}

          {/* Holiday / weekend banner */}
          {(hol||wkd) && (
            <div style={{
              background: hol?"rgba(155,93,229,0.25)":"rgba(224,92,92,0.2)",
              border: `1px solid ${hol?"rgba(155,93,229,0.4)":"rgba(224,92,92,0.35)"}`,
              borderRadius:12, padding:"8px 14px", marginBottom:16,
              display:"flex", alignItems:"center", gap:8,
            }}>
              <span style={{ fontSize:16 }}>{hol?"🎉":"🏖️"}</span>
              <span style={{ color:"#fff", fontSize:13, fontWeight:600 }}>
                {hol ? holidayName(viewDate) : "Brīvdiena"}
              </span>
            </div>
          )}

          {/* Progress ring — tomorrow: show viewTasks preview count; today: show done/total */}
          {!isForTomorrow && totalCnt > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:14,
              background:"rgba(255,255,255,0.08)", borderRadius:16, padding:"12px 16px" }}>
              <ProgressRing pct={pct} size={52}/>
              <div>
                <div style={{ color:"#fff", fontSize:15, fontWeight:700 }}>
                  {doneCnt}/{totalCnt} darbi pabeigti
                </div>
                <div style={{ color:"rgba(255,255,255,0.5)", fontSize:12, marginTop:2 }}>šodien</div>
              </div>
            </div>
          )}

          {isForTomorrow && viewTasks.length > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:12,
              background:"rgba(255,255,255,0.08)", borderRadius:16, padding:"12px 16px" }}>
              <div style={{ width:44, height:44, borderRadius:"50%",
                background:"rgba(201,184,255,0.2)", border:"2px solid rgba(201,184,255,0.4)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:20, flexShrink:0 }}>📋</div>
              <div>
                <div style={{ color:"#fff", fontSize:15, fontWeight:700 }}>{viewTasks.length} darbi plānoti</div>
                <div style={{ color:"rgba(255,255,255,0.45)", fontSize:12, marginTop:2 }}>rītdienai</div>
              </div>
            </div>
          )}

          {!isForTomorrow && totalCnt===0 && (
            <div style={{ color:"rgba(255,255,255,0.4)", fontSize:13 }}>Šodien nav pievienoti darbi</div>
          )}
          {isForTomorrow && viewTasks.length===0 && viewSched.length===0 && viewMeetings.length===0 && (
            <div style={{ color:"rgba(255,255,255,0.4)", fontSize:13 }}>Rītdienai vēl nav plānu</div>
          )}
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div style={{ padding:"20px 16px 8px" }}>

        {/* Day label pill when in evening mode */}
        {isForTomorrow && (
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <div style={{ flex:1, height:1, background:C.border }}/>
            <span style={{ fontSize:11, fontWeight:700, color:C.holiday, textTransform:"uppercase",
              letterSpacing:"0.8px", whiteSpace:"nowrap" }}>🌙 Rītdienas plāns</span>
            <div style={{ flex:1, height:1, background:C.border }}/>
          </div>
        )}

        {/* Tasks card */}
        <AnimCard visible={cardsIn[0]} delay={0}>
          <SectionHdr icon={I.task} color={C.accent}
            label={isForTomorrow ? "Rīt darāmie darbi" : "Šodienas darbi"}
            count={viewTasks.length}/>
          {viewTasks.length===0
            ? <Hint>{isForTomorrow ? "Rītdienai nav plānotu darbu" : "Nav darbu šodien"}</Hint>
            : viewTasks.slice(0,5).map(t=>(
                <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0",
                  borderBottom:`1px solid ${C.border}` }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:ST[t.status].clr, flexShrink:0 }}/>
                  <span style={{ flex:1, fontSize:13,
                    textDecoration:t.status==="done"?"line-through":"none",
                    color:t.status==="done"?C.muted:C.text }}>{t.text}</span>
                  <span style={{ ...pillSm, background:ST[t.status].bg, color:ST[t.status].clr }}>
                    {ST[t.status].lbl}
                  </span>
                </div>
              ))
          }
          {viewTasks.length>5 && <Hint>+{viewTasks.length-5} vairāk…</Hint>}
        </AnimCard>

        {/* Schedule card */}
        {viewSched.length>0 && (
          <AnimCard visible={cardsIn[1]} delay={0}>
            <SectionHdr icon={I.cal} color={C.green}
              label={isForTomorrow ? "Rīt grafiks" : "Grafiks šodien"}
              count={viewSched.length}/>
            {viewSched.map(e=>(
              <div key={e.id} style={{ display:"flex", gap:8, padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ width:3, background:C.green, borderRadius:3, flexShrink:0 }}/>
                <div>
                  <div style={{ fontSize:13, color:C.text }}>{e.note}</div>
                  {e.who && <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>👤 {e.who}</div>}
                </div>
              </div>
            ))}
          </AnimCard>
        )}

        {/* Meetings card */}
        <AnimCard visible={cardsIn[2]} delay={0}>
          <SectionHdr icon={I.meet} color={C.holiday}
            label={isForTomorrow ? "Rīt tikšanās" : "Tikšanās šodien"}
            count={viewMeetings.length}/>
          {viewMeetings.length===0
            ? <Hint>{isForTomorrow ? "Rītdienai nav tikšanos" : "Nav tikšanos šodien"}</Hint>
            : viewMeetings.map(m=>(
                <div key={m.id} style={{ padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{m.title}</div>
                  {m.time && <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>🕐 {m.time}</div>}
                </div>
              ))
          }
        </AnimCard>

        {/* Evening: also show today's remaining tasks if any unfinished */}
        {isForTomorrow && todayTasks.filter(t=>t.status!=="done").length>0 && (
          <AnimCard visible={cardsIn[3]} delay={0}>
            <SectionHdr icon={I.task} color={C.orange} label="Šodien vēl nepabeigts"
              count={todayTasks.filter(t=>t.status!=="done").length}/>
            {todayTasks.filter(t=>t.status!=="done").slice(0,3).map(t=>(
              <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0",
                borderBottom:`1px solid ${C.border}` }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:ST[t.status].clr, flexShrink:0 }}/>
                <span style={{ flex:1, fontSize:13, color:C.muted }}>{t.text}</span>
                <span style={{ ...pillSm, background:ST[t.status].bg, color:ST[t.status].clr }}>
                  {ST[t.status].lbl}
                </span>
              </div>
            ))}
            {todayTasks.filter(t=>t.status!=="done").length>3 &&
              <Hint>+{todayTasks.filter(t=>t.status!=="done").length-3} vairāk…</Hint>}
          </AnimCard>
        )}
      </div>
    </div>
  );
}

function ProgressRing({ pct, size }) {
  const r = (size-8)/2, circ = 2*Math.PI*r;
  const offset = circ*(1-pct/100);
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={5}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.green} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition:"stroke-dashoffset 1s ease" }}/>
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        fill="#fff" fontSize={11} fontWeight={700} style={{ transform:"rotate(90deg)", transformOrigin:"center" }}>
        {pct}%
      </text>
    </svg>
  );
}

function AnimCard({ children, visible, delay }) {
  return (
    <div style={{
      background:C.card, borderRadius:18, padding:"14px 16px", marginBottom:12,
      boxShadow:"0 2px 12px rgba(0,0,0,0.06)",
      opacity: visible?1:0, transform: visible?"translateY(0)":"translateY(20px)",
      transition:`opacity 0.45s ease ${delay}ms, transform 0.45s ease ${delay}ms`,
    }}>{children}</div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TASKS TAB
// ════════════════════════════════════════════════════════════════════════════
function TasksTab({ tasks, setTasks }) {
  const [open,   setOpen]   = useState(false);
  const [text,   setText]   = useState("");
  const [who,    setWho]    = useState("");
  const [status, setStatus] = useState("todo");

  const add = () => {
    if (!text.trim()) return;
    setTasks([{ id:Date.now(), text:text.trim(), who:who.trim(), status, date:todayStr() }, ...tasks]);
    setText(""); setWho(""); setStatus("todo"); setOpen(false);
  };
  const cycle = id => setTasks(tasks.map(t =>
    t.id===id ? { ...t, status:ST_ORDER[(ST_ORDER.indexOf(t.status)+1)%3] } : t
  ));
  const del = id => setTasks(tasks.filter(t => t.id!==id));

  const groups = { doing:[], todo:[], done:[] };
  tasks.forEach(t => groups[t.status].push(t));

  return (
    <div style={{ padding:"0 0 8px" }}>
      <PageHdr title="Darbi" sub="Visi uzdevumi"/>

      <div style={{ padding:"0 16px" }}>
        <button onClick={() => setOpen(o=>!o)} style={addBtnStyle}>
          <Ic d={open?I.x:I.plus} size={14} color="#fff"/> {open?"Aizvērt":"Jauns darbs"}
        </button>

        {open && (
          <Card style={{ marginBottom:14 }}>
            <textarea style={taStyle} rows={2} placeholder="Ko jādara…" value={text}
              onChange={e=>setText(e.target.value)} autoFocus/>
            <input style={inpStyle} placeholder="Izpildītājs (nav obligāti)" value={who}
              onChange={e=>setWho(e.target.value)}/>
            <div style={{ display:"flex", gap:8 }}>
              <select style={{ ...inpStyle, flex:1, marginBottom:0 }} value={status}
                onChange={e=>setStatus(e.target.value)}>
                {Object.entries(ST).map(([k,v])=><option key={k} value={k}>{v.lbl}</option>)}
              </select>
              <ActionBtn onClick={add}>Pievienot</ActionBtn>
            </div>
          </Card>
        )}

        {tasks.length===0 && <EmptyState>Nav darbu. Pievieno pirmo!</EmptyState>}

        {["doing","todo","done"].map(st =>
          groups[st].length>0 && (
            <div key={st} style={{ marginBottom:6 }}>
              <div style={grpLblStyle}>
                <span style={{ width:7,height:7,borderRadius:"50%",background:ST[st].clr,display:"inline-block",flexShrink:0 }}/>
                {ST[st].lbl} · {groups[st].length}
              </div>
              {groups[st].map(t => (
                <Card key={t.id} style={{ marginBottom:8, display:"flex", gap:10, padding:"11px 13px",
                  borderLeft:`3px solid ${ST[t.status].clr}` }}>
                  <button onClick={()=>cycle(t.id)} style={{
                    width:22,height:22,borderRadius:"50%",border:`2px solid ${ST[t.status].clr}`,
                    background:t.status==="done"?ST[t.status].clr:"transparent",
                    cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",marginTop:1,
                  }}>
                    {t.status==="done"&&<Ic d={I.check} size={11} color="#fff" sw={2.5}/>}
                  </button>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14,color:t.status==="done"?C.muted:C.text,
                      textDecoration:t.status==="done"?"line-through":"none",lineHeight:1.4,marginBottom:5 }}>
                      {t.text}
                    </div>
                    <div style={{ display:"flex",gap:8,flexWrap:"wrap",alignItems:"center" }}>
                      {t.who&&<span style={{ ...pillSm,background:"#f0f4f9",color:C.muted }}>👤 {t.who}</span>}
                      <span style={{ fontSize:11,color:C.muted,marginLeft:"auto" }}>{t.date}</span>
                    </div>
                  </div>
                  <button onClick={()=>del(t.id)} style={iconBtnStyle}>
                    <Ic d={I.trash} size={14} color="#d4cece"/>
                  </button>
                </Card>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SCHEDULE TAB — full month calendar
// ════════════════════════════════════════════════════════════════════════════
function ScheduleTab({ schedule, setSchedule, tasks }) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selDay, setSelDay] = useState(todayStr());
  const [open,   setOpen]   = useState(false);
  const [note,   setNote]   = useState("");
  const [who,    setWho]    = useState("");

  const dayName   = DAYS_FULL[getDayOfWeek(selDay)];
  const entries   = schedule[selDay] || [];

  const prevMonth = () => { if(month===0){setYear(y=>y-1);setMonth(11);}else setMonth(m=>m-1); };
  const nextMonth = () => { if(month===11){setYear(y=>y+1);setMonth(0);}else setMonth(m=>m+1); };

  const add = () => {
    if (!note.trim()) return;
    setSchedule({ ...schedule, [selDay]: [...entries, { id:Date.now(), note:note.trim(), who:who.trim() }] });
    setNote(""); setWho(""); setOpen(false);
  };
  const del = id => setSchedule({ ...schedule, [selDay]: entries.filter(e=>e.id!==id) });

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  const offset   = (firstDay.getDay()+6)%7; // Mon=0
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const cells = [];
  for(let i=0;i<offset;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(d);
  while(cells.length%7!==0) cells.push(null);

  // Compute per-day status color
  function dayColor(dk) {
    if (!dk) return null;
    if (isHoliday(dk)) return C.holiday;
    const dow = getDayOfWeek(dk);
    if (dow>=5) return C.weekend; // Sat/Sun
    const dayTasks = tasks.filter(t=>t.date===dk);
    if (dayTasks.length===0) return null;
    if (dayTasks.every(t=>t.status==="done")) return C.green;
    if (dayTasks.some(t=>t.status==="doing")) return C.orange;
    return C.red;
  }


  return (
    <div style={{ padding:"0 0 8px" }}>
      <PageHdr title="Grafiks" sub={`${MONTHS_LV[month]} ${year}`}/>

      <div style={{ padding:"0 16px" }}>
        {/* Month nav */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <button onClick={prevMonth} style={navArrowBtn}>‹</button>
          <span style={{ fontSize:15, fontWeight:700, color:C.text }}>{MONTHS_LV[month]} {year}</span>
          <button onClick={nextMonth} style={navArrowBtn}>›</button>
        </div>

        {/* Legend */}
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:12 }}>
          {[
            { clr:C.green,   lbl:"Pabeigts" },
            { clr:C.red,     lbl:"Gaida" },
            { clr:C.orange,  lbl:"Procesā" },
            { clr:C.weekend, lbl:"Brīvdiena" },
            { clr:C.holiday, lbl:"Svētki" },
          ].map(({ clr, lbl }) => (
            <div key={lbl} style={{ display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ width:9,height:9,borderRadius:"50%",background:clr,display:"inline-block" }}/>
              <span style={{ fontSize:10, color:C.muted }}>{lbl}</span>
            </div>
          ))}
        </div>

        {/* Day headers */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:4 }}>
          {DAY_HDRS.map(d=>(
            <div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:700,
              color:d==="S"||d==="Sv"?C.weekend:C.muted, padding:"4px 0" }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:18 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i}/>;
            const dk = dateKey(year, month, d);
            const isToday = dk===todayStr();
            const isSel   = dk===selDay;
            const dc      = dayColor(dk);
            const hasSched = (schedule[dk]||[]).length>0;
            return (
              <button key={i} onClick={()=>setSelDay(dk)} style={{
                aspectRatio:"1", border:"none", cursor:"pointer", borderRadius:10,
                background: isToday?C.accent : isSel?C.accentL : C.card,
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                boxShadow: isToday?"0 2px 8px rgba(74,111,165,0.3)": isSel?"0 1px 4px rgba(74,111,165,0.15)":"none",
                position:"relative", padding:0,
              }}>
                <span style={{ fontSize:13, fontWeight: isToday||isSel?700:400,
                  color: isToday?"#fff":C.text }}>{d}</span>
                <div style={{ display:"flex", gap:2, marginTop:2 }}>
                  {dc && <span style={{ width:5,height:5,borderRadius:"50%",background:dc }}/>}
                  {hasSched && <span style={{ width:5,height:5,borderRadius:"50%",background:C.accent,opacity:0.6 }}/>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected day detail */}
        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{dayName}</div>
              <div style={{ fontSize:12, color:C.muted }}>{selDay}</div>
              {isHoliday(selDay) && (
                <div style={{ fontSize:11, color:C.holiday, fontWeight:600, marginTop:2 }}>
                  🎉 {holidayName(selDay)}
                </div>
              )}
              {!isHoliday(selDay) && isWeekend(selDay) && (
                <div style={{ fontSize:11, color:C.weekend, fontWeight:600, marginTop:2 }}>🏖️ Brīvdiena</div>
              )}
            </div>
            <button onClick={()=>setOpen(o=>!o)} style={{ ...addBtnStyle, margin:0, padding:"7px 12px", fontSize:12 }}>
              <Ic d={open?I.x:I.plus} size={13} color="#fff"/> {open?"Aizvērt":"Pievienot"}
            </button>
          </div>

          {open && (
            <div style={{ marginBottom:10 }}>
              <textarea style={taStyle} rows={2} placeholder="Ko plānots darīt…" value={note}
                onChange={e=>setNote(e.target.value)} autoFocus/>
              <input style={inpStyle} placeholder="Kas veic (nav obligāti)" value={who}
                onChange={e=>setWho(e.target.value)}/>
              <ActionBtn onClick={add} full>Pievienot</ActionBtn>
            </div>
          )}

          {entries.length===0 && !open && <Hint>Nav ierakstu šai dienai</Hint>}
          {entries.map(e=>(
            <div key={e.id} style={{ display:"flex", gap:8, alignItems:"flex-start",
              padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ width:3, alignSelf:"stretch", background:C.accent, borderRadius:3, flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, color:C.text }}>{e.note}</div>
                {e.who&&<div style={{ fontSize:11, color:C.muted, marginTop:2 }}>👤 {e.who}</div>}
              </div>
              <button onClick={()=>del(e.id)} style={iconBtnStyle}>
                <Ic d={I.trash} size={13} color="#d4cece"/>
              </button>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MEETINGS TAB
// ════════════════════════════════════════════════════════════════════════════
function MeetingsTab({ meetings, setMeetings }) {
  const [open,  setOpen]  = useState(false);
  const [title, setTitle] = useState("");
  const [date,  setDate]  = useState(todayStr());
  const [time,  setTime]  = useState("");
  const [with_, setWith_] = useState("");
  const [note,  setNote]  = useState("");

  const add = () => {
    if (!title.trim()) return;
    const sorted = [...meetings, { id:Date.now(), title:title.trim(), date, time, with:with_.trim(), note:note.trim() }]
      .sort((a,b)=>(a.date+a.time)>(b.date+b.time)?1:-1);
    setMeetings(sorted);
    setTitle(""); setDate(todayStr()); setTime(""); setWith_(""); setNote(""); setOpen(false);
  };
  const del = id => setMeetings(meetings.filter(m=>m.id!==id));

  const today    = todayStr();
  const upcoming = meetings.filter(m=>m.date>=today);
  const past     = meetings.filter(m=>m.date<today);
  function fmtDate(d) { return new Date(d+"T12:00:00").toLocaleDateString("lv-LV",{weekday:"short",day:"numeric",month:"short"}); }

  return (
    <div style={{ padding:"0 0 8px" }}>
      <PageHdr title="Tikšanās" sub="Sanāksmes un tikšanās"/>
      <div style={{ padding:"0 16px" }}>
        <button onClick={()=>setOpen(o=>!o)} style={addBtnStyle}>
          <Ic d={open?I.x:I.plus} size={14} color="#fff"/> {open?"Aizvērt":"Jauna tikšanās"}
        </button>

        {open && (
          <Card style={{ marginBottom:14 }}>
            <input style={inpStyle} placeholder="Nosaukums *" value={title}
              onChange={e=>setTitle(e.target.value)} autoFocus/>
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              <input type="date" style={{ ...inpStyle, flex:1, marginBottom:0 }} value={date} onChange={e=>setDate(e.target.value)}/>
              <input type="time" style={{ ...inpStyle, flex:1, marginBottom:0 }} value={time} onChange={e=>setTime(e.target.value)}/>
            </div>
            <input style={inpStyle} placeholder="Ar ko" value={with_} onChange={e=>setWith_(e.target.value)}/>
            <textarea style={taStyle} rows={2} placeholder="Piezīmes…" value={note} onChange={e=>setNote(e.target.value)}/>
            <ActionBtn onClick={add} full>Pievienot</ActionBtn>
          </Card>
        )}

        {meetings.length===0 && <EmptyState>Nav tikšanos. Pievieno pirmo!</EmptyState>}

        {upcoming.length>0 && <>
          <div style={grpLblStyle}><span style={{ width:7,height:7,borderRadius:"50%",background:C.accent,display:"inline-block" }}/> Gaidāmās · {upcoming.length}</div>
          {upcoming.map(m=>(
            <Card key={m.id} style={{ marginBottom:8, display:"flex", gap:10, padding:"11px 13px" }}>
              <div style={{ width:3, background:C.accent, borderRadius:3, flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.accent, marginBottom:2, textTransform:"capitalize" }}>
                  {fmtDate(m.date)}{m.time?` · ${m.time}`:""}
                </div>
                <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{m.title}</div>
                {m.with&&<div style={{ fontSize:12, color:C.muted, marginTop:2 }}>👤 {m.with}</div>}
                {m.note&&<div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{m.note}</div>}
              </div>
              <button onClick={()=>del(m.id)} style={iconBtnStyle}>
                <Ic d={I.trash} size={14} color="#d4cece"/>
              </button>
            </Card>
          ))}
        </>}

        {past.length>0 && <>
          <div style={{ ...grpLblStyle, marginTop:14 }}><span style={{ width:7,height:7,borderRadius:"50%",background:C.muted,display:"inline-block" }}/> Pagājušās · {past.length}</div>
          {past.map(m=>(
            <Card key={m.id} style={{ marginBottom:8, display:"flex", gap:10, padding:"11px 13px", opacity:0.5 }}>
              <div style={{ width:3, background:C.muted, borderRadius:3, flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:C.muted, marginBottom:2, textTransform:"capitalize" }}>
                  {fmtDate(m.date)}{m.time?` · ${m.time}`:""}
                </div>
                <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{m.title}</div>
                {m.with&&<div style={{ fontSize:12, color:C.muted, marginTop:2 }}>👤 {m.with}</div>}
              </div>
              <button onClick={()=>del(m.id)} style={iconBtnStyle}>
                <Ic d={I.trash} size={14} color="#d4cece"/>
              </button>
            </Card>
          ))}
        </>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Shared components & styles
// ════════════════════════════════════════════════════════════════════════════
const Card = ({ children, style }) => (
  <div style={{ background:C.card, borderRadius:16, padding:14,
    boxShadow:"0 1px 6px rgba(0,0,0,0.06)", ...style }}>{children}</div>
);
const ActionBtn = ({ children, onClick, full }) => (
  <button onClick={onClick} style={{ background:C.accent, color:"#fff", border:"none", borderRadius:10,
    padding:"9px 18px", fontSize:13, fontWeight:600, cursor:"pointer", width:full?"100%":"auto" }}>
    {children}
  </button>
);
const PageHdr = ({ title, sub }) => (
  <div style={{ background:C.hdr, padding:"24px 22px 20px" }}>
    <div style={{ color:"rgba(255,255,255,0.45)", fontSize:11, fontWeight:600,
      letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:4 }}>Unihouse</div>
    <div style={{ color:"#fff", fontSize:22, fontWeight:800 }}>{title}</div>
    {sub && <div style={{ color:"rgba(255,255,255,0.45)", fontSize:12, marginTop:3 }}>{sub}</div>}
  </div>
);
const SectionHdr = ({ icon, color, label, count }) => (
  <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:8 }}>
    <Ic d={icon} size={15} color={color}/>
    <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{label}</span>
    {count>0 && <span style={{ ...pillSm, background:C.accentL, color:C.accent, marginLeft:"auto" }}>{count}</span>}
  </div>
);
const EmptyState = ({ children }) => (
  <div style={{ textAlign:"center", color:C.muted, fontSize:14, padding:"36px 0", lineHeight:1.8 }}>{children}</div>
);
const Hint = ({ children }) => (
  <div style={{ color:C.muted, fontSize:12, padding:"8px 0" }}>{children}</div>
);

const pillSm = { display:"inline-flex", alignItems:"center", gap:3, fontSize:11,
  fontWeight:600, padding:"2px 8px", borderRadius:20 };
const addBtnStyle = { display:"flex", alignItems:"center", gap:6, background:C.hdr, color:"#fff",
  border:"none", borderRadius:10, padding:"10px 15px", fontSize:13, fontWeight:600,
  cursor:"pointer", marginBottom:14 };
const taStyle = { width:"100%", border:`1px solid ${C.border}`, borderRadius:10, padding:"9px 11px",
  fontSize:14, fontFamily:"inherit", resize:"vertical", outline:"none", background:"#fafaf9",
  boxSizing:"border-box", marginBottom:8, color:C.text };
const inpStyle = { width:"100%", border:`1px solid ${C.border}`, borderRadius:10, padding:"9px 11px",
  fontSize:13, fontFamily:"inherit", outline:"none", background:"#fafaf9",
  boxSizing:"border-box", marginBottom:8, color:C.text };
const iconBtnStyle = { background:"none", border:"none", cursor:"pointer", padding:3,
  borderRadius:6, display:"flex", alignItems:"center", flexShrink:0 };
const grpLblStyle = { display:"flex", alignItems:"center", gap:6, fontSize:11, fontWeight:700,
  color:C.muted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8, marginTop:4 };
const navArrowBtn = { background:"none", border:"none", fontSize:20, cursor:"pointer",
  color:C.text, padding:"4px 10px", borderRadius:8 };
