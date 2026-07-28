"use client";

import { useEffect, useMemo, useState } from "react";

type Subject = { name: string; color: string; tint: string; icon: string };
type Result = { subject: string; text: string; status: string };
type Saved = { id: string; student: string; grade: string; subject: string; createdAt: string; results: Result[] };

const subjects: Subject[] = [
  { name: "국어", color: "#f07857", tint: "#fff1ec", icon: "文" },
  { name: "수학", color: "#4f70e8", tint: "#eef2ff", icon: "∑" },
  { name: "영어", color: "#19a68a", tint: "#e9fbf5", icon: "A" },
  { name: "과학", color: "#9b68d8", tint: "#f5efff", icon: "◌" },
  { name: "사회", color: "#dfaa39", tint: "#fff8e5", icon: "◎" },
];

const examples: Record<string, string> = {
  국어: "토론에서 근거를 들어 의견을 조리 있게 제시함, 작품 속 인물의 선택을 자신의 경험과 연결하여 해석함",
  수학: "함수의 개념을 실생활 자료에 적용, 풀이 과정을 친구에게 단계적으로 설명함",
  영어: "영어 원서의 핵심 내용을 요약, 모둠 활동에서 자연스럽게 대화를 이끔",
  과학: "생태계 조사에서 변인을 통제하고 관찰 결과를 표와 그래프로 정리함",
  사회: "지역 문제를 다양한 관점에서 분석, 자료를 비교해 합리적인 해결 방안을 제안함",
};

function makeDraft(subject: string, keyword: string, grade: string) {
  const clean = keyword.trim() || examples[subject];
  return `${grade}학년 ${subject} 수업에서 ${clean}을(를) 바탕으로 탐구 과정에 성실히 참여함. 자료와 자신의 생각을 연결하여 핵심 내용을 구체적으로 정리하고, 활동 과정에서 다른 사람의 의견을 경청하며 자신의 관점을 발전시키는 모습이 돋보임. 배운 내용을 새로운 상황에 적용하려는 태도가 꾸준하며, 앞으로의 성장이 기대됨.`;
}

function loadSaved(): Saved[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("setukit-saved") || "[]"); } catch { return []; }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hasSupabase = Boolean(supabaseUrl && supabaseKey);
async function supabaseFetch(path: string, init?: RequestInit) {
  if (!hasSupabase) return null;
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers: { apikey: supabaseKey!, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json", ...(init?.headers || {}) } });
}

export default function Home() {
  const [active, setActive] = useState("국어");
  const [grade, setGrade] = useState("고등학교 1학년");
  const [student, setStudent] = useState("2026-014");
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<"new" | "saved">("new");
  const [saved, setSaved] = useState<Saved[]>(loadSaved);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("Gemini 3.5 Flash-Lite");
  const [supabaseState, setSupabaseState] = useState<"checking" | "connected" | "setup">(hasSupabase ? "checking" : "setup");
  const selected = subjects.find((s) => s.name === active)!;
  const progress = useMemo(() => results.length ? `${results.length}/3 단계 완료` : "대기 중", [results]);
  useEffect(() => {
    supabaseFetch("setuk_records?select=*&order=created_at.desc").then(async (response) => {
      if (!response?.ok) { setSupabaseState("setup"); return; }
      setSupabaseState("connected");
      const rows = await response.json();
      setSaved(rows.map((row: { id: string; student_identifier: string; grade: string; subject: string; created_at: string; agent_results: Result[] }) => ({ id: row.id, student: row.student_identifier, grade: row.grade, subject: row.subject, createdAt: new Date(row.created_at).toLocaleString("ko-KR"), results: row.agent_results })));
    });
  }, []);

  const generate = () => {
    setRunning(true); setResults([]);
    const stages = [
      { subject: "수집 에이전트", text: "활동 키워드와 관찰 내용을 핵심 역량 중심으로 정리함.", status: "입력 분석 완료" },
      { subject: "작성 에이전트", text: makeDraft(active, keyword, grade), status: "초안 작성 완료" },
      { subject: "검토 에이전트", text: "단정적 서술과 순위 표현을 점검하고, 관찰 가능한 행동 중심의 문장으로 다듬음.", status: "표현 검토 완료" },
    ];
    stages.forEach((stage, i) => setTimeout(() => { setResults((prev) => [...prev, stage]); if (i === 2) setRunning(false); }, 550 * (i + 1)));
  };

  const save = () => {
    if (!results.length) return;
    const item: Saved = { id: crypto.randomUUID(), student, grade, subject: active, createdAt: new Date().toLocaleString("ko-KR"), results };
    const next = [item, ...saved]; setSaved(next); localStorage.setItem("setukit-saved", JSON.stringify(next));
    void supabaseFetch("setuk_records", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ student_identifier: student, grade, subject: active, input_keywords: keyword, agent_results: results }) });
  };

  const download = () => {
    const text = results.map((r) => `[${r.subject}]\n${r.text}`).join("\n\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" })); a.download = `${student}_${active}_세특초안.txt`; a.click(); URL.revokeObjectURL(a.href);
  };

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">S</span><span>세특킷</span><small>학생부 기록 도우미</small></div>
      <div className="side-label">WORKSPACE</div>
      <button className={tab === "new" ? "nav active" : "nav"} onClick={() => setTab("new")}><span>✦</span> 새 초안 만들기</button>
      <button className={tab === "saved" ? "nav active" : "nav"} onClick={() => setTab("saved")}><span>▣</span> 저장 내역 <b>{saved.length}</b></button>
      <div className="side-bottom"><button className="nav settings" onClick={() => setShowSettings(true)}><span>⚙</span> 개인 설정</button><div className="profile"><div className="avatar">김</div><div><strong>김선생님</strong><small>교사 계정</small></div><span>⋮</span></div></div>
    </aside>
    <section className="content">
      <header className="topbar"><div><div className="eyebrow">2026학년도 · 세특 기록실</div><h1>{tab === "new" ? "새 초안 만들기" : "저장 내역"}</h1></div><div className="top-actions"><span className="connection"><i /> {supabaseState === "connected" ? "Supabase 연결됨" : supabaseState === "checking" ? "Supabase 확인 중" : "Supabase 테이블 설정 필요"}</span><button className="icon-btn" onClick={() => setShowSettings(true)}>⚙</button></div></header>
      {tab === "saved" ? <SavedView saved={saved} onOpen={(item) => { setActive(item.subject); setGrade(item.grade); setStudent(item.student); setResults(item.results); setTab("new"); }} /> : <>
        <div className="stepper"><div className="step current"><span>01</span><div><strong>활동 입력</strong><small>키워드와 관찰 내용</small></div></div><div className="line" /><div className={results.length ? "step current" : "step"}><span>02</span><div><strong>초안 생성</strong><small>3개 에이전트 협업</small></div></div><div className="line" /><div className={results.length === 3 ? "step current" : "step"}><span>03</span><div><strong>확인 및 저장</strong><small>검토 후 보관</small></div></div></div>
        <div className="workspace-grid"><div className="panel input-panel"><div className="panel-head"><div><span className="kicker">INPUT</span><h2>학생 활동 입력</h2></div><span className="required">* 필수 항목</span></div><label>학생 식별값 <input value={student} onChange={(e) => setStudent(e.target.value)} placeholder="예: 2026-014" /></label><label>학년 <select value={grade} onChange={(e) => setGrade(e.target.value)}><option>중학교 1학년</option><option>고등학교 1학년</option><option>고등학교 2학년</option><option>고등학교 3학년</option></select></label><label>과목 <div className="subject-list">{subjects.map((s) => <button key={s.name} className={active === s.name ? "subject selected" : "subject"} style={{ "--accent": s.color, "--tint": s.tint } as React.CSSProperties} onClick={() => { setActive(s.name); setKeyword(""); }}><span>{s.icon}</span>{s.name}</button>)}</div></label><label>학생 활동 키워드 / 관찰 내용 <textarea value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={`관찰한 학생의 활동을 자유롭게 입력해 주세요\n예: ${examples[active]}`} /><div className="field-foot"><span>{keyword.length} / 1,000</span><button onClick={() => setKeyword(examples[active])}>예시 불러오기 ↗</button></div></label><button className="primary" onClick={generate} disabled={running}><span>{running ? "생성 중..." : "세특 초안 생성하기"}</span><span>→</span></button><p className="privacy">✧ 입력 내용은 초안 생성에만 사용되며 자동 저장되지 않습니다.</p></div>
          <div className="panel result-panel"><div className="panel-head"><div><span className="kicker">OUTPUT</span><h2>에이전트 결과</h2></div><span className="status-pill"><i /> {progress}</span></div><div className="agent-row"><Agent label="수집" color="#f07857" done={results.length > 0} /><Agent label="작성" color="#4f70e8" done={results.length > 1} /><Agent label="검토" color="#19a68a" done={results.length > 2} /></div>{results.length === 0 ? <div className="empty"><div className="empty-icon">✦</div><h3>아직 생성된 초안이 없어요</h3><p>왼쪽에 활동 내용을 입력하고<br />초안 생성 버튼을 눌러 주세요.</p></div> : <div className="result-list">{results.map((r, i) => <article className={`result-card r${i}`} key={r.subject}><div className="result-title"><span className="number">0{i + 1}</span><div><strong>{r.subject}</strong><small>{r.status}</small></div></div><p>{r.text}</p></article>)}<div className="result-actions"><button className="secondary" onClick={download}>↓ 텍스트 다운로드</button><button className="primary small" onClick={save}>▣ Supabase에 저장</button></div></div>}</div></div>
        <div className="note"><span>◎</span><div><strong>세특 작성 가이드</strong><p>관찰 가능한 행동과 구체적인 맥락을 입력할수록 학생의 성장 과정이 잘 드러나는 초안이 만들어집니다.</p></div><button>가이드 보기 ↗</button></div>
      </>}
      {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><div className="modal" onClick={(e) => e.stopPropagation()}><div className="modal-head"><div><span className="kicker">PERSONAL SETTINGS</span><h2>개인 설정</h2></div><button onClick={() => setShowSettings(false)}>×</button></div><label>Gemini API Key<input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="개인 API 키를 입력하세요" /></label><label>선호 모델<select value={model} onChange={(e) => setModel(e.target.value)}><option>Gemini 3.5 Flash-Lite</option><option>Gemini 3.5 Flash</option><option>Gemini 3.5 Pro</option></select></label><p className="modal-hint">키는 이 브라우저에만 저장되는 데모 설정입니다. 운영 환경에서는 서버 환경변수 사용을 권장합니다.</p><button className="primary" onClick={() => setShowSettings(false)}>설정 저장</button></div></div>}
    </section>
  </main>;
}

function Agent({ label, color, done }: { label: string; color: string; done: boolean }) { return <div className="agent"><span style={{ background: done ? color : "#e6e8ed" }}>{done ? "✓" : "·"}</span><small>{label} 에이전트</small></div>; }
function SavedView({ saved, onOpen }: { saved: Saved[]; onOpen: (item: Saved) => void }) { return <div className="saved-wrap"><div className="saved-intro"><div><span className="kicker">ARCHIVE</span><h2>저장된 세특 초안</h2><p>생성일시와 학생 식별값으로 기록을 찾아 다시 확인할 수 있습니다.</p></div><div className="search">⌕ <input placeholder="학생 식별값 검색" /></div></div>{saved.length === 0 ? <div className="empty saved-empty"><div className="empty-icon">▣</div><h3>저장된 기록이 없습니다</h3><p>초안을 생성한 뒤 Supabase에 저장해 보세요.</p></div> : <div className="saved-table"><div className="table-row table-head"><span>학생 식별값</span><span>학년</span><span>과목</span><span>생성일시</span><span /></div>{saved.map((item) => <button className="table-row" key={item.id} onClick={() => onOpen(item)}><span><strong>{item.student}</strong></span><span>{item.grade}</span><span><em>{item.subject}</em></span><span>{item.createdAt}</span><span>→</span></button>)}</div>}</div>; }
