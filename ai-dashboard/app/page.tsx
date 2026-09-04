'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Cpu, Database, MessageSquare, Zap, MemoryStick, Activity,
  Send, Trash2, RefreshCw, CheckCircle2, XCircle, Loader2,
  BrainCircuit, Monitor, Server, HardDrive, ChevronRight, ChevronDown, Download,
  Settings, Edit2, Plus, Save, UserX, Code2, FileCode, Play, MessageCircle,
  Terminal, Folder, FolderPlus, FilePlus, FileText, Wrench, X, Check, Shield, Layers,
  Cloud, ShieldCheck, Key, Sparkles, BarChart3, Coins, TrendingUp, PieChart,
  Package, ExternalLink
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import ReactFlow, { Background, Edge, Node } from 'reactflow';
import 'reactflow/dist/style.css';

const API = 'http://localhost:8000';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Telemetry {
  cpu_percent: number;
  ram_percent: number;
  ram_used_gb: number;
  ram_total_gb: number;
}

interface HistoryItem {
  id: number;
  role: string;
  content: string;
  time: string;
}

interface EphemeralAgentDetail {
  role: string;
  stage: 'architecture' | 'engineering' | 'database' | 'validation';
  model: string;
  goal?: string;
  tools?: string[];
}

interface Job {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result: string | null;
  error: string | null;
  download_url?: string;
  active_agent?: string;
  logs?: any[];
  ephemeral_agents?: string[];
  ephemeral_agents_details?: EphemeralAgentDetail[];
  token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    duration_ms?: number;
    duration_seconds?: number;
    cost_saved_usd?: number;
  };
}

interface ToolItem {
  id: string;
  name: string;
  description: string;
}

interface Agent {
  id: number;
  name: string;
  role: string;
  goal: string;
  backstory: string;
  model: string;
  temperature: number;
  is_active: number;
  tools?: string[];
}

interface LocalMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  tok_per_sec?: number;
  duration_ms?: number;
  timestamp?: string;
}

interface TokenAnalytics {
  summary: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    direct_chat_tokens: number;
    agent_command_tokens: number;
    total_requests: number;
    avg_tok_sec: number;
    money_saved_usd: number;
    money_saved_ron: number;
    savings_comparison: {
      gpt4o_cost: number;
      claude_cost: number;
      gemini_cost: number;
      local_cost: number;
    };
  };
  by_model: Array<{
    model: string;
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    requests: number;
    avg_duration_ms: number;
  }>;
  by_source: {
    direct_chat?: { tokens: number; count: number };
    agent_command?: { tokens: number; count: number };
  };
  timeline: Array<{
    date: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    requests: number;
  }>;
  recent_events: Array<{
    id: number;
    source: string;
    session_or_job_id: string;
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    duration_ms: number;
    timestamp: string;
  }>;
}

interface LocalSession {
  id: number;
  title: string;
  created_at: string;
}

interface Project {
  name: string;
  created_at: number;
}

interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileTreeNode[];
}

// ─── Language & Icon Helpers ──────────────────────────────────────────────────

function getLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'py': return 'python';
    case 'js':
    case 'jsx': return 'javascript';
    case 'ts':
    case 'tsx': return 'typescript';
    case 'html': return 'html';
    case 'css':
    case 'scss': return 'css';
    case 'json': return 'json';
    case 'sql': return 'sql';
    case 'md': return 'markdown';
    case 'sh':
    case 'bash': return 'shell';
    case 'dockerfile': return 'dockerfile';
    default: return 'plaintext';
  }
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'py':
      return <span className="text-amber-400 font-mono text-[9px] font-bold px-1 py-0.5 rounded bg-amber-500/10 border border-amber-500/25">PY</span>;
    case 'js':
    case 'jsx':
      return <span className="text-yellow-400 font-mono text-[9px] font-bold px-1 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/25">JS</span>;
    case 'ts':
    case 'tsx':
      return <span className="text-sky-400 font-mono text-[9px] font-bold px-1 py-0.5 rounded bg-sky-500/10 border border-sky-500/25">TS</span>;
    case 'html':
      return <span className="text-orange-400 font-mono text-[9px] font-bold px-1 py-0.5 rounded bg-orange-500/10 border border-orange-500/25">HTML</span>;
    case 'css':
    case 'scss':
      return <span className="text-blue-400 font-mono text-[9px] font-bold px-1 py-0.5 rounded bg-blue-500/10 border border-blue-500/25">CSS</span>;
    case 'json':
      return <span className="text-emerald-400 font-mono text-[9px] font-bold px-1 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25">JSON</span>;
    case 'md':
      return <span className="text-slate-400 font-mono text-[9px] font-bold px-1 py-0.5 rounded bg-slate-500/10 border border-slate-500/25">MD</span>;
    case 'sql':
      return <span className="text-cyan-400 font-mono text-[9px] font-bold px-1 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/25">SQL</span>;
    default:
      return <FileCode className="h-3.5 w-3.5 text-slate-400 shrink-0" />;
  }
}

// ─── File Tree Item Component (VS Code Style) ────────────────────────────────

function FileTreeItem({
  node,
  depth = 0,
  activeFile,
  expandedFolders,
  toggleFolder,
  onSelectFile,
  onDelete,
  onCreateInFolder,
  unsavedFiles,
}: {
  node: FileTreeNode;
  depth?: number;
  activeFile: string | null;
  expandedFolders: Record<string, boolean>;
  toggleFolder: (path: string) => void;
  onSelectFile: (path: string) => void;
  onDelete: (path: string, e: React.MouseEvent) => void;
  onCreateInFolder: (dirPath: string, type: 'file' | 'folder', e: React.MouseEvent) => void;
  unsavedFiles: Record<string, boolean>;
}) {
  const isDir = node.type === 'directory';
  const isExpanded = !!expandedFolders[node.path];
  const isSelected = activeFile === node.path;
  const isDirty = !isDir && !!unsavedFiles[node.path];

  return (
    <div>
      <div
        onClick={() => {
          if (isDir) toggleFolder(node.path);
          else onSelectFile(node.path);
        }}
        style={{ paddingLeft: `${depth * 14 + 10}px` }}
        className={`group flex items-center justify-between py-1.5 pr-2 rounded cursor-pointer transition-colors text-xs select-none ${
          isSelected
            ? 'bg-sky-500/15 text-sky-400 font-medium border-l-2 border-sky-400'
            : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          {isDir ? (
            <>
              <ChevronRight
                className={`h-3 w-3 text-slate-500 transition-transform duration-150 shrink-0 ${
                  isExpanded ? 'rotate-90 text-slate-300' : ''
                }`}
              />
              <Folder className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="truncate font-medium">{node.name}</span>
            </>
          ) : (
            <>
              <span className="shrink-0">{getFileIcon(node.name)}</span>
              <span className="truncate">{node.name}</span>
              {isDirty && (
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0 animate-pulse" title="Unsaved modifications" />
              )}
            </>
          )}
        </div>

        {/* Action icons on hover */}
        <div className="hidden group-hover:flex items-center gap-1 shrink-0 ml-1">
          {isDir ? (
            <>
              <button
                onClick={(e) => onCreateInFolder(node.path, 'file', e)}
                title="New file in folder"
                className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-700/60 rounded"
              >
                <FilePlus className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => onCreateInFolder(node.path, 'folder', e)}
                title="New subfolder"
                className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-700/60 rounded"
              >
                <FolderPlus className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => onDelete(node.path, e)}
                title="Delete folder"
                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          ) : (
            <button
              onClick={(e) => onDelete(node.path, e)}
              title="Delete file"
              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {isDir && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              activeFile={activeFile}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              onSelectFile={onSelectFile}
              onDelete={onDelete}
              onCreateInFolder={onCreateInFolder}
              unsavedFiles={unsavedFiles}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Circular Gauge Component ────────────────────────────────────────────────

function Gauge({ value, max, label, sub, color, icon: Icon }: {
  value: number; max: number; label: string; sub?: string;
  color: string; icon: React.ElementType;
}) {
  const pct = Math.min((value / max) * 100, 100);
  const r = 54, c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const statusColor = pct > 85 ? '#f43f5e' : pct > 60 ? '#f59e0b' : color;

  return (
    <div className="glass-panel-elevated rounded-2xl p-6 flex flex-col items-center gap-3 animate-fade-in-up hover:scale-[1.02] transition-transform duration-300">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth="8" />
          <circle cx="60" cy="60" r={r} fill="none" stroke={statusColor} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
            className="gauge-ring drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white tabular-nums">
            {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}
          </span>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">{sub || '%'}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <Icon className="h-4 w-4" style={{ color: statusColor }} />
        <span>{label}</span>
      </div>
      <div className="h-1 w-16 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: statusColor }} />
      </div>
    </div>
  );
}

// ─── Role Badge ──────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const r = role.toLowerCase();
  let bg = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  let icon = <MessageSquare className="h-3 w-3" />;
  if (r.includes('manager') || r.includes('gemini')) {
    bg = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    icon = <BrainCircuit className="h-3 w-3" />;
  } else if (r.includes('error') || r.includes('system')) {
    bg = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    icon = <XCircle className="h-3 w-3" />;
  } else if (r !== 'user') {
    bg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    icon = <Server className="h-3 w-3" />;
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${bg}`}>
      {icon}{role}
    </span>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const [tab, setTab] = useState('system');
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [prompt, setPrompt] = useState('');
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [sending, setSending] = useState(false);
  const [agentResponse, setAgentResponse] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [availableTools, setAvailableTools] = useState<ToolItem[]>([]);
  const [editingAgent, setEditingAgent] = useState<Agent | Partial<Agent> | null>(null);

  const [files, setFiles] = useState<Record<string, string>>({});
  const [savedFiles, setSavedFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [createDialog, setCreateDialog] = useState<{ isOpen: boolean; type: 'file' | 'folder'; targetDir: string }>({
    isOpen: false,
    type: 'file',
    targetDir: ''
  });
  const [newEntityName, setNewEntityName] = useState('');

  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [localPrompt, setLocalPrompt] = useState('');
  const [selectedLocalModel, setSelectedLocalModel] = useState<string>('');
  const [isLocalChatting, setIsLocalChatting] = useState(false);
  
  const [localSessions, setLocalSessions] = useState<LocalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<string | null>(null);

  const [sandboxLogs, setSandboxLogs] = useState<string | null>(null);
  const [isSandboxRunning, setIsSandboxRunning] = useState(false);

  // ── Hardware & Models State ──
  const [systemSpecs, setSystemSpecs] = useState<any>(null);
  const [tokenAnalytics, setTokenAnalytics] = useState<TokenAnalytics | null>(null);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [appSettings, setAppSettings] = useState<{
    manager_provider: string;
    local_manager_model: string;
    has_gemini_key: boolean;
    gemini_api_key_masked?: string;
  }>({
    manager_provider: 'local',
    local_manager_model: 'qwen2.5-coder:latest',
    has_gemini_key: false,
    gemini_api_key_masked: ''
  });
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [managerTestStatus, setManagerTestStatus] = useState<{
    testing: boolean;
    result: any | null;
  }>({ testing: false, result: null });
  const [pullStatus, setPullStatus] = useState<{ model: string | null; status: string; percent: number; completed: number; total: number; error: string | null }>({
    model: null,
    status: 'idle',
    percent: 0,
    completed: 0,
    total: 0,
    error: null
  });
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // ── Telemetry Polling (1s) ──
  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`${API}/api/telemetry`);
        if (active && res.ok) setTelemetry(await res.json());
      } catch { /* backend offline */ }
    };
    poll();
    const id = setInterval(poll, 1000);
    return () => { active = false; clearInterval(id); };
  }, []);

  // ── History Fetch ──
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/history`);
      if (res.ok) setHistory(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (tab === 'database') fetchHistory(); }, [tab, fetchHistory]);

  // ── Agents Fetch ──
  const fetchAgentsAndModels = useCallback(async () => {
    try {
      const [resAgents, resModels, resTools] = await Promise.all([
        fetch(`${API}/api/agents`),
        fetch(`${API}/api/models`),
        fetch(`${API}/api/tools`)
      ]);
      if (resAgents.ok) setAgents(await resAgents.json());
      if (resModels.ok) {
        const ms = (await resModels.json()).models;
        setModels(ms);
        if (ms.length > 0 && !selectedLocalModel) setSelectedLocalModel(ms[0]);
      }
      if (resTools.ok) {
        setAvailableTools(await resTools.json());
      }
    } catch { /* ignore */ }
  }, [selectedLocalModel]);

  useEffect(() => { fetchAgentsAndModels(); }, [fetchAgentsAndModels]);

  // ── Local Sessions Fetch ──
  const handleNewSession = async () => {
    try {
      const res = await fetch(`${API}/api/chat/local/sessions`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLocalSessions(prev => [data, ...prev]);
        setActiveSessionId(data.id);
        setLocalMessages([]);
      }
    } catch { /* ignore */ }
  };

  const fetchLocalSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/chat/local/sessions`);
      if (res.ok) {
        const data = await res.json();
        setLocalSessions(data);
        if (data.length === 0) handleNewSession();
        else if (!activeSessionId) setActiveSessionId(data[0].id);
      }
    } catch { /* ignore */ }
  }, [activeSessionId]);

  useEffect(() => { if (tab === 'direct') fetchLocalSessions(); }, [tab, fetchLocalSessions]);

  // ── Projects Fetch ──
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/projects`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
        if (data.projects.length > 0 && !activeProject) setActiveProject(data.projects[0].name);
      }
    } catch { /* ignore */ }
  }, [activeProject]);

  useEffect(() => { if (tab === 'ide') fetchProjects(); }, [tab, fetchProjects]);

  // ── System Specs & Settings ──
  const fetchSystemSpecs = useCallback(async () => {
    try {
      const [specsRes, settingsRes] = await Promise.all([
        fetch(`${API}/api/system/specs`),
        fetch(`${API}/api/settings`)
      ]);
      if (specsRes.ok) setSystemSpecs(await specsRes.json());
      if (settingsRes.ok) setAppSettings(await settingsRes.json());
    } catch { /* ignore */ }
  }, []);

  const handleUpdateSettings = async (updates: Partial<{ manager_provider: string; local_manager_model: string; gemini_api_key: string }>) => {
    try {
      const res = await fetch(`${API}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const data = await res.json();
        setAppSettings(data.settings);
        setManagerTestStatus({ testing: false, result: null });
      }
    } catch { /* ignore */ }
  };

  const handleTestManager = async () => {
    setManagerTestStatus({ testing: true, result: null });
    try {
      const res = await fetch(`${API}/api/settings/test-manager`);
      if (res.ok) {
        const data = await res.json();
        setManagerTestStatus({ testing: false, result: data });
      } else {
        setManagerTestStatus({
          testing: false,
          result: { status: 'error', message: 'Eroare la contactarea serverului API.' }
        });
      }
    } catch (e: any) {
      setManagerTestStatus({
        testing: false,
        result: { status: 'error', message: e.message || 'Server offline' }
      });
    }
  };

  const handlePullModel = async (modelId: string) => {
    try {
      await fetch(`${API}/api/models/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId })
      });
      setPullStatus({ model: modelId, status: 'pulling', percent: 0, completed: 0, total: 0, error: null });
    } catch { /* ignore */ }
  };

  const handleCheckUpdates = useCallback(async () => {
    setIsCheckingUpdate(true);
    try {
      const res = await fetch(`${API}/api/system/check-updates`);
      if (res.ok) {
        const data = await res.json();
        setUpdateInfo(data);
      }
    } catch (e) {
      console.error('Failed to check updates', e);
    } finally {
      setIsCheckingUpdate(false);
    }
  }, []);

  useEffect(() => {
    fetchSystemSpecs();
    handleCheckUpdates();
  }, [fetchSystemSpecs, handleCheckUpdates]);

  useEffect(() => {
    if (tab === 'system') {
      fetchSystemSpecs();
      handleCheckUpdates();
    }
  }, [tab, fetchSystemSpecs, handleCheckUpdates]);

  // ── Token Analytics Fetch ──
  const fetchTokenAnalytics = useCallback(async () => {
    setIsLoadingTokens(true);
    try {
      const res = await fetch(`${API}/api/tokens/analytics`);
      if (res.ok) setTokenAnalytics(await res.json());
    } catch { /* ignore */ }
    setIsLoadingTokens(false);
  }, []);

  useEffect(() => {
    if (tab === 'tokens') fetchTokenAnalytics();
  }, [tab, fetchTokenAnalytics]);

  const handleClearTokens = async () => {
    if (!confirm('Ești sigur că vrei să resetezi toate statisticile locale de tokeni?')) return;
    try {
      await fetch(`${API}/api/tokens/clear`, { method: 'POST' });
      fetchTokenAnalytics();
    } catch { /* ignore */ }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (pullStatus.status === 'pulling') {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${API}/api/models/pull/status`);
          if (res.ok) {
            const data = await res.json();
            setPullStatus(data);
            if (data.status === 'completed' || data.status === 'failed') {
              fetchSystemSpecs();
              fetchAgentsAndModels();
            }
          }
        } catch { /* ignore */ }
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [pullStatus.status, fetchSystemSpecs, fetchAgentsAndModels]);

  // ── Project Files & Tree Loader ──
  const reloadProjectFiles = useCallback(async (projectName: string) => {
    if (!projectName) return;
    try {
      const [resFiles, resTree] = await Promise.all([
        fetch(`${API}/api/projects/${projectName}/files`),
        fetch(`${API}/api/projects/${projectName}/tree`)
      ]);
      if (resFiles.ok) {
        const data = await resFiles.json();
        setFiles(data.files);
        setSavedFiles(data.files);
        const keys = Object.keys(data.files);
        if (keys.length > 0) {
          setActiveFile(prev => (prev && data.files[prev] !== undefined) ? prev : keys[0]);
          setOpenTabs(prev => {
            const valid = prev.filter(t => data.files[t] !== undefined);
            return valid.length > 0 ? valid : [keys[0]];
          });
        } else {
          setActiveFile(null);
          setOpenTabs([]);
        }
      }
      if (resTree.ok) {
        const data = await resTree.json();
        setFileTree(data.tree);
        // Expand root level directories automatically
        const expandMap: Record<string, boolean> = {};
        (data.tree || []).forEach((item: FileTreeNode) => {
          if (item.type === 'directory') expandMap[item.path] = true;
        });
        setExpandedFolders(prev => ({ ...expandMap, ...prev }));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (activeProject) reloadProjectFiles(activeProject);
  }, [activeProject, reloadProjectFiles]);

  // ── VS Code File Handlers ──
  const handleSelectFile = useCallback((filePath: string) => {
    setActiveFile(filePath);
    setOpenTabs(prev => prev.includes(filePath) ? prev : [...prev, filePath]);
  }, []);

  const handleCloseTab = useCallback((tabPath: string) => {
    setOpenTabs(prev => {
      const next = prev.filter(t => t !== tabPath);
      if (activeFile === tabPath) {
        setActiveFile(next.length > 0 ? next[next.length - 1] : null);
      }
      return next;
    });
  }, [activeFile]);

  const handleSaveFile = useCallback(async (filePathToSave?: string) => {
    const target = filePathToSave || activeFile;
    if (!activeProject || !target || files[target] === undefined) return;
    setSaveStatus('saving');
    try {
      const res = await fetch(`${API}/api/projects/${activeProject}/files/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: target,
          content: files[target]
        })
      });
      if (res.ok) {
        setSavedFiles(prev => ({ ...prev, [target]: files[target] }));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 2500);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    }
  }, [activeProject, activeFile, files]);

  // Ctrl+S / Cmd+S Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        if (tab === 'ide' && activeFile) {
          e.preventDefault();
          handleSaveFile();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tab, activeFile, handleSaveFile]);

  const handleCreateEntity = async () => {
    if (!activeProject || !newEntityName.trim()) return;
    const relPath = createDialog.targetDir
      ? `${createDialog.targetDir}/${newEntityName.trim()}`
      : newEntityName.trim();
    try {
      const res = await fetch(`${API}/api/projects/${activeProject}/files/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: relPath,
          is_directory: createDialog.type === 'folder',
          content: ''
        })
      });
      if (res.ok) {
        setCreateDialog({ isOpen: false, type: 'file', targetDir: '' });
        setNewEntityName('');
        await reloadProjectFiles(activeProject);
        if (createDialog.type === 'file') {
          handleSelectFile(relPath);
        }
      }
    } catch { /* ignore */ }
  };

  const handleDeleteEntity = async (path: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activeProject) return;
    if (!confirm(`Sigur dorești să ștergi "${path}"?`)) return;
    try {
      const res = await fetch(`${API}/api/projects/${activeProject}/files`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: path })
      });
      if (res.ok) {
        setOpenTabs(prev => prev.filter(t => t !== path && !t.startsWith(`${path}/`)));
        if (activeFile === path || activeFile?.startsWith(`${path}/`)) {
          const remaining = openTabs.filter(t => t !== path && !t.startsWith(`${path}/`));
          setActiveFile(remaining.length > 0 ? remaining[0] : null);
        }
        await reloadProjectFiles(activeProject);
      }
    } catch { /* ignore */ }
  };

  // ── Sandbox Runner ──
  const handleRunSandbox = async () => {
    if (!activeProject || isSandboxRunning) return;
    setIsSandboxRunning(true);
    setIsTerminalOpen(true);
    setSandboxLogs(`[Sandbox Engine] Booting isolated container for ${activeProject}...\n[Sandbox Engine] Mounting project filesystem in read/write mode...`);
    try {
      const res = await fetch(`${API}/api/sandbox/run/${activeProject}`, { method: 'POST' });
      const data = await res.json();
      setSandboxLogs(data.logs || "Execution finished with no output.");
    } catch {
      setSandboxLogs("Error: Failed to connect to Sandbox execution engine.");
    }
    setIsSandboxRunning(false);
  };

  // ── Swarm Multi-Tier Graph Calculation ──
  const swarmData = useMemo(() => {
    const rawAgents: EphemeralAgentDetail[] = (activeJob?.ephemeral_agents_details && activeJob.ephemeral_agents_details.length > 0)
      ? activeJob.ephemeral_agents_details
      : (activeJob?.ephemeral_agents && activeJob.ephemeral_agents.length > 0)
        ? activeJob.ephemeral_agents.map(role => {
            const roleLower = role.toLowerCase();
            const stage = (roleLower.includes('architect') || roleLower.includes('lead') || roleLower.includes('planner') || roleLower.includes('designer')) ? 'architecture'
              : (roleLower.includes('qa') || roleLower.includes('test') || roleLower.includes('security') || roleLower.includes('auditor') || roleLower.includes('review')) ? 'validation'
              : (roleLower.includes('db') || roleLower.includes('database') || roleLower.includes('sql')) ? 'database'
              : 'engineering';
            return { role, stage: stage as any, model: 'llama3.1:latest' };
          })
        : agents.filter(a => a.is_active).map(a => {
            const roleLower = a.role.toLowerCase();
            const stage = roleLower.includes('architect') ? 'architecture' 
              : (roleLower.includes('qa') || roleLower.includes('test')) ? 'validation'
              : (roleLower.includes('db') || roleLower.includes('database')) ? 'database'
              : 'engineering';
            return { role: a.role, stage: stage as any, model: a.model };
          });

    const managerModel = appSettings.manager_provider === 'local' 
      ? (appSettings.local_manager_model || 'Ollama (Local)') 
      : 'Gemini 2.5 Flash';
    const isManagerActive = !activeJob?.active_agent || activeJob?.active_agent?.toLowerCase().includes('manager');

    const nodes: Node[] = [
      {
        id: 'manager',
        position: { x: 390, y: 20 },
        data: {
          label: (
            <div className="p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-purple-300">
                <BrainCircuit className="h-4 w-4 text-purple-400" />
                <span>Manager Orchestrator</span>
              </div>
              <div className="text-[10px] text-purple-400/90 font-mono mt-0.5">
                {managerModel}
              </div>
              {isManagerActive && sending && (
                <div className="mt-1.5 flex items-center justify-center gap-1 text-[10px] text-purple-200 font-medium animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" /> Orchestrating Swarm
                </div>
              )}
            </div>
          )
        },
        style: {
          background: isManagerActive && sending ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.1)',
          border: isManagerActive && sending ? '2px solid #a78bfa' : '1px solid rgba(139,92,246,0.4)',
          borderRadius: '12px',
          width: 220,
          boxShadow: isManagerActive && sending ? '0 0 25px rgba(139,92,246,0.6)' : '0 4px 12px rgba(0,0,0,0.4)',
        }
      }
    ];

    const edges: Edge[] = [];

    const arch = rawAgents.filter(a => a.stage === 'architecture');
    const eng = rawAgents.filter(a => a.stage === 'engineering');
    const qa = rawAgents.filter(a => a.stage === 'validation' || a.stage === 'database');

    const placeTier = (tierAgents: EphemeralAgentDetail[], y: number, tierKey: string) => {
      const K = tierAgents.length;
      const spacing = 220;
      const centerX = 500;
      return tierAgents.map((ag, idx) => {
        const x = K === 1 ? centerX - 100 : centerX - ((K - 1) * spacing) / 2 + (idx * spacing) - 100;
        const id = `${tierKey}-${idx}`;
        const isActive = activeJob?.active_agent === ag.role;

        let stageColor = '#38bdf8';
        let stageBg = 'rgba(56,189,248,0.1)';
        let stageBorder = 'rgba(56,189,248,0.4)';
        let stageIcon = <BrainCircuit className="h-3.5 w-3.5 text-sky-400" />;

        if (ag.stage === 'engineering') {
          stageColor = '#34d399';
          stageBg = 'rgba(52,211,153,0.1)';
          stageBorder = 'rgba(52,211,153,0.4)';
          stageIcon = <Code2 className="h-3.5 w-3.5 text-emerald-400" />;
        } else if (ag.stage === 'database') {
          stageColor = '#fbbf24';
          stageBg = 'rgba(251,191,36,0.1)';
          stageBorder = 'rgba(251,191,36,0.4)';
          stageIcon = <Database className="h-3.5 w-3.5 text-amber-400" />;
        } else if (ag.stage === 'validation') {
          stageColor = '#f43f5e';
          stageBg = 'rgba(244,63,94,0.1)';
          stageBorder = 'rgba(244,63,94,0.4)';
          stageIcon = <CheckCircle2 className="h-3.5 w-3.5 text-rose-400" />;
        }

        const node: Node = {
          id,
          position: { x, y },
          data: {
            label: (
              <div className="p-2.5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-white truncate">
                  {stageIcon}
                  <span className="truncate">{ag.role}</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-medium border"
                    style={{ color: stageColor, borderColor: stageBorder, background: stageBg }}>
                    {ag.stage}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono truncate max-w-[85px]">
                    {ag.model || 'local'}
                  </span>
                </div>
                {isActive && (
                  <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-emerald-300 font-medium animate-pulse">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" /> Working...
                  </div>
                )}
              </div>
            )
          },
          style: {
            background: isActive ? 'rgba(16,185,129,0.25)' : stageBg,
            border: isActive ? '2px solid #10b981' : `1px solid ${stageBorder}`,
            borderRadius: '10px',
            width: 200,
            boxShadow: isActive ? '0 0 22px rgba(16,185,129,0.6)' : '0 2px 8px rgba(0,0,0,0.3)',
          }
        };
        return { node, id, agent: ag, isActive };
      });
    };

    const archPlaced = placeTier(arch, 135, 'arch');
    const engPlaced = placeTier(eng, 245, 'eng');
    const qaPlaced = placeTier(qa, 355, 'qa');

    archPlaced.forEach(p => nodes.push(p.node));
    engPlaced.forEach(p => nodes.push(p.node));
    qaPlaced.forEach(p => nodes.push(p.node));

    if (archPlaced.length > 0) {
      archPlaced.forEach(ap => {
        edges.push({
          id: `e-mgr-${ap.id}`,
          source: 'manager',
          target: ap.id,
          animated: ap.isActive,
          style: { stroke: ap.isActive ? '#10b981' : '#334155', strokeWidth: ap.isActive ? 2.5 : 1.5 }
        });
        engPlaced.forEach(ep => {
          edges.push({
            id: `e-${ap.id}-${ep.id}`,
            source: ap.id,
            target: ep.id,
            animated: ep.isActive,
            style: { stroke: ep.isActive ? '#10b981' : '#334155', strokeWidth: ep.isActive ? 2.5 : 1.5 }
          });
        });
      });
    } else {
      engPlaced.forEach(ep => {
        edges.push({
          id: `e-mgr-${ep.id}`,
          source: 'manager',
          target: ep.id,
          animated: ep.isActive,
          style: { stroke: ep.isActive ? '#10b981' : '#334155', strokeWidth: ep.isActive ? 2.5 : 1.5 }
        });
      });
    }

    engPlaced.forEach(ep => {
      qaPlaced.forEach(qp => {
        edges.push({
          id: `e-${ep.id}-${qp.id}`,
          source: ep.id,
          target: qp.id,
          animated: qp.isActive,
          style: { stroke: qp.isActive ? '#10b981' : '#334155', strokeWidth: qp.isActive ? 2.5 : 1.5 }
        });
      });
    });

    if (engPlaced.length === 0 && archPlaced.length === 0) {
      qaPlaced.forEach(qp => {
        edges.push({
          id: `e-mgr-${qp.id}`,
          source: 'manager',
          target: qp.id,
          animated: qp.isActive,
          style: { stroke: qp.isActive ? '#10b981' : '#334155', strokeWidth: qp.isActive ? 2.5 : 1.5 }
        });
      });
    }

    return { nodes, edges };
  }, [activeJob, agents, appSettings, sending]);

  useEffect(() => {
    if (!activeSessionId) return;
    const fetchMsgs = async () => {
      try {
        const res = await fetch(`${API}/api/chat/local/sessions/${activeSessionId}/messages`);
        if (res.ok) setLocalMessages(await res.json());
      } catch { /* ignore */ }
    };
    fetchMsgs();
  }, [activeSessionId]);

  // ── Job Polling ──
  useEffect(() => {
    if (!activeJob || activeJob.status === 'completed' || activeJob.status === 'failed') {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/job/${activeJob.job_id}`);
        if (res.ok) {
          const data: Job = await res.json();
          setActiveJob(data);
          if (data.status === 'completed') {
            setAgentResponse(data.result);
            setSending(false);
            if (data.download_url) {
              fetch(`${API}/api/job/${data.job_id}/files`)
                .then(r => r.json())
                .then(fData => {
                  if (fData.files) {
                    setFiles(fData.files);
                    setActiveFile(Object.keys(fData.files)[0] || null);
                  }
                }).catch(() => {});
            }
          } else if (data.status === 'failed') {
            setAgentResponse(`Error: ${data.error}`);
            setSending(false);
          }
        }
      } catch { /* ignore */ }
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeJob]);

  // ── Run Agent ──
  const handleRun = async () => {
    if (!prompt.trim() || sending) return;
    setSending(true);
    setAgentResponse(null);
    setActiveJob(null);
    try {
      const res = await fetch(`${API}/api/run-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveJob({ job_id: data.job_id, status: 'pending', result: null, error: null });
        setPrompt('');
      } else { setSending(false); }
    } catch { setSending(false); }
  };

  // ── Clear History ──
  const handleClear = async () => {
    if (!confirm('Clear all memory records?')) return;
    try {
      await fetch(`${API}/api/history/clear`, { method: 'POST' });
      setHistory([]);
      setLocalMessages([]);
    } catch { /* ignore */ }
  };

  // ── Agent CRUD ──
  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;
    try {
      const isNew = !('id' in editingAgent);
      const url = isNew ? `${API}/api/agents` : `${API}/api/agents/${editingAgent.id}`;
      const method = isNew ? 'POST' : 'PUT';
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingAgent)
      });
      setEditingAgent(null);
      fetchAgentsAndModels();
    } catch { /* ignore */ }
  };

  const handleDeleteAgent = async (id: number) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    try {
      await fetch(`${API}/api/agents/${id}`, { method: 'DELETE' });
      fetchAgentsAndModels();
    } catch { /* ignore */ }
  };

  const handleToggleAgent = async (agent: Agent) => {
    try {
      await fetch(`${API}/api/agents/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: agent.is_active ? 0 : 1 })
      });
      fetchAgentsAndModels();
    } catch { /* ignore */ }
  };

  // ── Tabs Config ──
  const tabs = [
    { id: 'system', label: 'Local AI & Hardware', icon: HardDrive },
    { id: 'chat', label: 'Agent Command', icon: MessageSquare },
    { id: 'direct', label: 'Direct Chat', icon: MessageCircle },
    { id: 'ide', label: 'Code Editor', icon: Code2 },
    { id: 'tokens', label: 'Token Analytics', icon: BarChart3 },
    { id: 'agents', label: 'Agent Hub', icon: Settings },
    { id: 'dashboard', label: 'Live Telemetry', icon: Cpu },
    { id: 'database', label: 'Memory Archive', icon: Database },
  ];

  // ── Local Chat Function ──
  const handleLocalChat = async () => {
    if (!localPrompt.trim() || isLocalChatting || !selectedLocalModel || !activeSessionId) return;
    const newMessages = [...localMessages, { role: 'user', content: localPrompt } as LocalMessage];
    setLocalMessages(newMessages);
    setLocalPrompt('');
    setIsLocalChatting(true);
    try {
      const res = await fetch(`${API}/api/chat/local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: activeSessionId, prompt: localPrompt, model: selectedLocalModel })
      });
      if (res.ok) {
        const data = await res.json();
        setLocalMessages([...newMessages, { 
          role: 'assistant', 
          content: data.reply, 
          model: selectedLocalModel,
          prompt_tokens: data.tokens?.prompt_tokens,
          completion_tokens: data.tokens?.completion_tokens,
          total_tokens: data.tokens?.total_tokens,
          tok_per_sec: data.tokens?.tok_per_sec,
          duration_ms: data.tokens?.duration_ms
        }]);
        fetchLocalSessions(); // Refresh sidebar titles in case it renamed
      }
    } catch { /* ignore */ }
    setIsLocalChatting(false);
  };

  // ── System Status ──
  const sysStatus = !telemetry ? 'offline'
    : (telemetry.cpu_percent > 85 || telemetry.ram_percent > 90) ? 'critical'
    : (telemetry.cpu_percent > 60 || telemetry.ram_percent > 70) ? 'elevated'
    : 'nominal';

  const statusColors: Record<string, string> = {
    nominal: '#10b981', elevated: '#f59e0b', critical: '#f43f5e', offline: '#64748b',
  };

  return (
    <div className="flex h-screen bg-[#07090E] text-slate-100 font-sans overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-64 border-r border-slate-800/80 bg-[#0B0F17]/70 backdrop-blur-xl flex flex-col">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center animate-breathing">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold tracking-wider text-sm text-white">NEXUS AI</h1>
              <p className="text-[10px] text-cyan-400 font-mono tracking-[0.25em]">STUDIO 2026</p>
            </div>
          </div>
          <nav className="space-y-1.5">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${
                  tab === t.id
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.1)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}>
                <t.icon className="h-4 w-4" />
                {t.label}
                {tab === t.id && <ChevronRight className="h-3 w-3 ml-auto" />}
              </button>
            ))}
          </nav>

          {/* Active Provider Mode Pill */}
          <div className="mt-4 px-3 py-2 rounded-xl bg-[#070A11] border border-slate-800/90 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full animate-pulse ${
                appSettings.manager_provider === 'local' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-indigo-400 shadow-[0_0_8px_#818cf8]'
              }`} />
              <span className="text-[11px] font-medium text-slate-300">
                {appSettings.manager_provider === 'local' ? '100% Local (Offline)' : 'Cloud Hybrid'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              {appSettings.manager_provider === 'local' ? 'Ollama' : 'Gemini'}
            </span>
          </div>
        </div>

        {/* System Status Footer */}
        <div className="mt-auto p-5 border-t border-slate-800/50">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: statusColors[sysStatus] }} />
            <span className="uppercase tracking-wider">System {sysStatus}</span>
          </div>
          {telemetry && (
            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-600 font-mono">
              <span>CPU {telemetry.cpu_percent.toFixed(0)}%</span>
              <span>RAM {telemetry.ram_percent.toFixed(0)}%</span>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Area ── */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(6,182,212,0.06),transparent)]">
        {tab === 'ide' ? (
          /* ═══ TAB: IDE / VS CODE STUDIO ═══ */
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#07090E]">
            {/* Top Toolbar / Breadcrumbs / Actions */}
            <div className="h-12 bg-[#090D15] border-b border-slate-800/90 flex items-center justify-between px-4 shrink-0 select-none">
              <div className="flex items-center gap-2 min-w-0">
                <Code2 className="h-4 w-4 text-sky-400 shrink-0" />
                <span className="text-xs font-semibold text-white tracking-wide uppercase hidden sm:inline">Nexus VS Studio</span>
                <span className="text-slate-600 hidden sm:inline">/</span>
                <span className="text-xs text-sky-300 font-mono flex items-center gap-1.5 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 truncate">
                  <Folder className="h-3 w-3 text-amber-400 shrink-0" />
                  <span className="truncate">{activeProject || 'No Project'}</span>
                </span>
                {activeFile && (
                  <>
                    <span className="text-slate-600">/</span>
                    <span className="text-xs text-slate-300 font-mono truncate max-w-[180px] md:max-w-md">{activeFile}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {saveStatus === 'saved' && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded animate-fade-in-up">
                    <Check className="h-3 w-3" /> Saved
                  </span>
                )}
                {saveStatus === 'saving' && (
                  <span className="flex items-center gap-1 text-[11px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded">
                    <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                  </span>
                )}

                {/* Save Button */}
                <button
                  onClick={() => handleSaveFile()}
                  disabled={!activeProject || !activeFile}
                  title="Save to Disk (Ctrl+S)"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
                    activeFile && files[activeFile] !== savedFiles[activeFile]
                      ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)] animate-pulse'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save (Ctrl+S)</span>
                </button>

                {/* Run Sandbox */}
                <button
                  onClick={handleRunSandbox}
                  disabled={!activeProject || isSandboxRunning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition text-xs font-medium border border-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSandboxRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  <span>Run Sandbox</span>
                </button>

                {/* Download Project ZIP */}
                {activeProject && (
                  <a
                    href={`${API}/api/download/${activeProject}`}
                    download
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#05070B] border border-slate-700 text-slate-300 hover:bg-slate-800 transition text-xs font-medium cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Download ZIP</span>
                  </a>
                )}

                {/* Toggle Sandbox Terminal */}
                <button
                  onClick={() => setIsTerminalOpen(!isTerminalOpen)}
                  title="Toggle Sandbox Terminal Drawer"
                  className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                    isTerminalOpen || sandboxLogs !== null
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                      : 'bg-slate-800/60 text-slate-400 hover:text-white border-slate-700'
                  }`}
                >
                  <Terminal className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Middle Workspace: Single VS Code Explorer + Editor */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
              {/* Explorer Sidebar */}
              <div className="w-72 bg-[#080B12] border-r border-slate-800/90 flex flex-col shrink-0 select-none">
                {/* Explorer Header */}
                <div className="p-3 border-b border-slate-800/80 bg-[#0A0E17]/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                      <Folder className="h-3.5 w-3.5 text-slate-400" /> Explorer
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCreateDialog({ isOpen: true, type: 'file', targetDir: '' })}
                        title="New File at Root"
                        className="p-1 hover:bg-slate-700/60 rounded text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        <FilePlus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setCreateDialog({ isOpen: true, type: 'folder', targetDir: '' })}
                        title="New Folder at Root"
                        className="p-1 hover:bg-slate-700/60 rounded text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        <FolderPlus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => activeProject && reloadProjectFiles(activeProject)}
                        title="Refresh Explorer"
                        className="p-1 hover:bg-slate-700/60 rounded text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Project Selector Dropdown */}
                  <div>
                    <select
                      value={activeProject || ''}
                      onChange={(e) => setActiveProject(e.target.value)}
                      className="w-full bg-[#05070B] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/40 cursor-pointer"
                    >
                      {projects.length === 0 ? (
                        <option value="">No projects generated yet</option>
                      ) : (
                        projects.map(p => (
                          <option key={p.name} value={p.name}>
                            📁 {p.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Recursive File Tree */}
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
                  {projects.length === 0 ? (
                    <div className="text-center py-10 px-4">
                      <FileCode className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                      <p className="text-xs text-slate-400 font-medium">No Projects Yet</p>
                      <p className="text-[11px] text-slate-600 mt-1">Deploy an agent swarm from the Command Center to generate an app.</p>
                    </div>
                  ) : fileTree.length === 0 ? (
                    <div className="text-center py-10 px-4">
                      <FileCode className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">No files in this project.</p>
                      <button
                        onClick={() => setCreateDialog({ isOpen: true, type: 'file', targetDir: '' })}
                        className="mt-3 text-xs text-sky-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <FilePlus className="h-3 w-3" /> Create new file
                      </button>
                    </div>
                  ) : (
                    fileTree.map(node => (
                      <FileTreeItem
                        key={node.path}
                        node={node}
                        depth={0}
                        activeFile={activeFile}
                        expandedFolders={expandedFolders}
                        toggleFolder={(path) => setExpandedFolders(prev => ({ ...prev, [path]: !prev[path] }))}
                        onSelectFile={handleSelectFile}
                        onDelete={handleDeleteEntity}
                        onCreateInFolder={(dir, type, e) => {
                          e.stopPropagation();
                          setCreateDialog({ isOpen: true, type, targetDir: dir });
                        }}
                        unsavedFiles={
                          Object.keys(files).reduce((acc, f) => {
                            if (files[f] !== savedFiles[f]) acc[f] = true;
                            return acc;
                          }, {} as Record<string, boolean>)
                        }
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Editor Area */}
              <div className="flex-1 flex flex-col min-w-0 bg-[#05070B] overflow-hidden">
                {/* Tabs Bar */}
                <div className="h-9 bg-[#070A11] border-b border-slate-800/80 flex items-center overflow-x-auto custom-scrollbar shrink-0 select-none">
                  {openTabs.length === 0 ? (
                    <div className="px-4 text-xs text-slate-600 italic">No files open</div>
                  ) : (
                    openTabs.map(tabPath => {
                      const isTabActive = activeFile === tabPath;
                      const filename = tabPath.split('/').pop() || tabPath;
                      const isDirty = files[tabPath] !== savedFiles[tabPath];
                      return (
                        <div
                          key={tabPath}
                          onClick={() => setActiveFile(tabPath)}
                          className={`group flex items-center gap-2 px-3 h-full border-r border-slate-800 text-xs cursor-pointer transition-colors shrink-0 ${
                            isTabActive
                              ? 'bg-[#0B0F19] text-sky-400 border-t-2 border-t-sky-400 font-medium'
                              : 'bg-[#07090F] text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 border-t-2 border-t-transparent'
                          }`}
                        >
                          <span className="shrink-0">{getFileIcon(filename)}</span>
                          <span className="truncate max-w-[130px]">{filename}</span>
                          {isDirty ? (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCloseTab(tabPath);
                              }}
                              className="h-2 w-2 rounded-full bg-cyan-400 group-hover:hidden"
                              title="Unsaved changes"
                            />
                          ) : null}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCloseTab(tabPath);
                            }}
                            className={`p-0.5 rounded-sm hover:bg-slate-700/60 text-slate-500 hover:text-white transition-colors ${
                              isDirty ? 'hidden group-hover:block' : ''
                            }`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Monaco Editor */}
                <div className="flex-1 relative min-h-0">
                  {activeFile && files[activeFile] !== undefined ? (
                    <Editor
                      height="100%"
                      theme="vs-dark"
                      language={getLanguage(activeFile)}
                      value={files[activeFile]}
                      onChange={(val) => {
                        if (val !== undefined) {
                          setFiles(prev => ({ ...prev, [activeFile]: val }));
                        }
                      }}
                      options={{
                        minimap: { enabled: true },
                        fontSize: 13,
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        lineHeight: 22,
                        padding: { top: 12, bottom: 12 },
                        scrollBeyondLastLine: false,
                        smoothScrolling: true,
                        bracketPairColorization: { enabled: true },
                        formatOnPaste: true,
                      }}
                    />
                  ) : (
                    <div className="flex-1 h-full flex flex-col items-center justify-center text-slate-600 select-none">
                      <FileCode className="h-16 w-16 text-slate-800 mb-3" />
                      <p className="text-sm font-medium text-slate-400">Select a file from the explorer to view and edit</p>
                      <p className="text-xs text-slate-600 mt-1">Files save directly to disk with Ctrl+S</p>
                    </div>
                  )}
                </div>

                {/* Sandbox Terminal Drawer */}
                {(isTerminalOpen || sandboxLogs !== null) && (
                  <div className="h-60 border-t border-slate-800 bg-[#080B12] flex flex-col shrink-0 relative z-20 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800 bg-[#0B0F17]">
                      <span className="text-xs font-mono text-emerald-400 flex items-center gap-2">
                        <Terminal className="h-3.5 w-3.5" /> Docker Sandbox Runner ({activeProject})
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSandboxLogs(null)}
                          title="Clear Output"
                          className="p-1 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setIsTerminalOpen(false);
                            setSandboxLogs(null);
                          }}
                          className="p-1 text-slate-500 hover:text-white transition cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 p-3 overflow-y-auto font-mono text-xs text-emerald-300/90 whitespace-pre-wrap custom-scrollbar bg-[#04060A]">
                      {sandboxLogs || "[Sandbox Engine Ready] Click 'Run Sandbox' to execute this project inside an isolated container."}
                    </div>
                  </div>
                )}

                {/* VS Code Bottom Status Bar */}
                <div className="h-6 bg-[#080B12] border-t border-slate-800/80 flex items-center justify-between px-3 text-[11px] text-slate-500 shrink-0 select-none font-mono">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      {activeFile ? `${activeFile}` : 'Ready'}
                    </span>
                    {activeFile && (
                      <>
                        <span className="text-slate-700">|</span>
                        <span>Lines: {(files[activeFile] || '').split('\n').length}</span>
                        <span>Chars: {(files[activeFile] || '').length}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-400">UTF-8</span>
                    <span className="text-slate-400">{activeFile ? getLanguage(activeFile).toUpperCase() : 'TEXT'}</span>
                    <span className="text-cyan-400 flex items-center gap-1">
                      <Zap className="h-3 w-3" /> RTX 4060 GPU
                    </span>
                    <span className={`flex items-center gap-1 ${appSettings.manager_provider === 'local' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                      <Check className="h-3 w-3" /> {appSettings.manager_provider === 'local' ? '100% Local' : 'Cloud Hybrid'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8">

          {/* ═══ TAB: SYSTEM / LOCAL AI & HARDWARE ═══ */}
          {tab === 'system' && (
            <div className="max-w-5xl mx-auto space-y-6 animate-fade-in-up">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2.5 mb-1">
                    <HardDrive className="h-5 w-5 text-cyan-400" />
                    Local AI Engine & Hardware Diagnostics
                  </h2>
                  <p className="text-sm text-slate-400">
                    Rulează 100% offline pe laptopul tău. Fără costuri, fără cloud și fără chei API.
                  </p>
                </div>
                <button 
                  onClick={fetchSystemSpecs} 
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition border border-slate-700 cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Re-scan Hardware
                </button>
              </div>

              {/* Section 1: Hardware Specs Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* GPU Card */}
                <div className="glass-panel p-5 rounded-2xl border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.05)]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-cyan-400" /> Dedicated GPU
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      NVIDIA CUDA
                    </span>
                  </div>
                  <h3 className="text-base font-medium text-white truncate">
                    {systemSpecs?.hardware?.gpu?.name || 'Detecting GPU...'}
                  </h3>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>VRAM Utilizabil</span>
                      <span className="font-mono text-cyan-300">
                        {systemSpecs?.hardware?.gpu?.vram_free_mb 
                          ? `${Math.round(systemSpecs.hardware.gpu.vram_free_mb / 1024 * 10) / 10} GB liber / ${Math.round(systemSpecs.hardware.gpu.vram_total_mb / 1024)} GB`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-cyan-500 h-2 rounded-full transition-all duration-500" 
                        style={{
                          width: `${systemSpecs?.hardware?.gpu?.vram_total_mb 
                            ? Math.min(100, Math.round(((systemSpecs.hardware.gpu.vram_total_mb - systemSpecs.hardware.gpu.vram_free_mb) / systemSpecs.hardware.gpu.vram_total_mb) * 100)) 
                            : 0}%`
                        }} 
                      />
                    </div>
                  </div>
                </div>

                {/* RAM Card */}
                <div className="glass-panel p-5 rounded-2xl border border-indigo-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-2">
                      <MemoryStick className="h-4 w-4 text-indigo-400" /> System Memory
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      DDR RAM
                    </span>
                  </div>
                  <h3 className="text-base font-medium text-white">
                    {systemSpecs?.hardware?.total_ram_gb ? `${systemSpecs.hardware.total_ram_gb} GB RAM` : '...'}
                  </h3>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>RAM Disponibil</span>
                      <span className="font-mono text-indigo-300">
                        {systemSpecs?.hardware?.free_ram_gb ? `${systemSpecs.hardware.free_ram_gb} GB liber` : '...'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-2 rounded-full transition-all duration-500" 
                        style={{
                          width: `${systemSpecs?.hardware?.total_ram_gb 
                            ? Math.round(((systemSpecs.hardware.total_ram_gb - systemSpecs.hardware.free_ram_gb) / systemSpecs.hardware.total_ram_gb) * 100) 
                            : 0}%`
                        }} 
                      />
                    </div>
                  </div>
                </div>

                {/* CPU Cores & Engine status */}
                <div className="glass-panel p-5 rounded-2xl border border-purple-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-purple-400" /> Processor & Engine
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Ollama Ready
                    </span>
                  </div>
                  <h3 className="text-base font-medium text-white">
                    {systemSpecs?.hardware?.cpu_cores ? `${systemSpecs.hardware.cpu_cores} Nuclee CPU` : '...'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2">
                    Suport nativ pentru execuție multi-thread și accelerare hardware NVIDIA GPU passthrough.
                  </p>
                </div>
              </div>

              {/* Section 2: Zero-Cloud / Manager Mode Toggle */}
              <div className="glass-panel-elevated p-6 rounded-2xl border border-indigo-500/30">
                <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                      <Server className="h-4 w-4 text-indigo-400" />
                      Configurare Team Manager: Mod 100% Local vs Cloud
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Alege dacă dorești ca Team Manager-ul (creierul de planificare CrewAI) să ruleze complet pe laptopul tău sau prin Google Gemini.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-[#05070B] p-1 rounded-xl border border-slate-700">
                    <button
                      onClick={() => handleUpdateSettings({ manager_provider: 'local' })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                        appSettings.manager_provider === 'local' 
                          ? 'bg-emerald-600 text-white shadow-sm' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🏠 100% Local (Fără Costuri)
                    </button>
                    <button
                      onClick={() => handleUpdateSettings({ manager_provider: 'gemini' })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                        appSettings.manager_provider === 'gemini' 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ☁️ Cloud (Gemini API)
                    </button>
                  </div>
                </div>

                {appSettings.manager_provider === 'local' ? (
                  <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4">
                    <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-start justify-between flex-wrap gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-0.5">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-emerald-300">Mod 100% Local Activ (Offline pe GPU RTX 4060)</span>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">0$ Cloud Cost</span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                            Team Managerul și toți agenții rulează local prin Ollama. Niciun prompt sau cod nu părăsește laptopul tău. Confidențialitate 100% garantată.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleTestManager}
                        disabled={managerTestStatus.testing}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50"
                      >
                        {managerTestStatus.testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                        <span>{managerTestStatus.testing ? 'Testare în curs...' : 'Testează Răspuns Local'}</span>
                      </button>
                    </div>

                    {/* Test result banner if available */}
                    {managerTestStatus.result && (
                      <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                        managerTestStatus.result.status === 'ok'
                          ? 'bg-emerald-900/30 border-emerald-500/40 text-emerald-200'
                          : 'bg-rose-900/30 border-rose-500/40 text-rose-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          {managerTestStatus.result.status === 'ok' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-rose-400" />}
                          <span>{managerTestStatus.result.message}</span>
                        </div>
                        {managerTestStatus.result.latency_ms && (
                          <span className="font-mono text-[11px] bg-black/40 px-2 py-0.5 rounded text-emerald-300">
                            {managerTestStatus.result.latency_ms} ms
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between flex-wrap gap-4 bg-[#05070B] p-3.5 rounded-xl border border-slate-800">
                      <div>
                        <label className="block text-xs text-slate-200 font-medium mb-0.5">
                          Model Local Desemnat ca Manager (Creier Orchestare)
                        </label>
                        <p className="text-[11px] text-slate-400">
                          Recomandat: <span className="text-cyan-300 font-mono">qwen2.5-coder:latest</span> sau <span className="text-indigo-300 font-mono">llama3.1:latest</span>
                        </p>
                      </div>
                      <select
                        value={appSettings.local_manager_model || 'qwen2.5-coder:latest'}
                        onChange={e => handleUpdateSettings({ local_manager_model: e.target.value })}
                        className="bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 min-w-[240px] font-mono cursor-pointer"
                      >
                        {models.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4">
                    <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 flex items-start justify-between flex-wrap gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mt-0.5">
                          <Cloud className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-indigo-300">Mod Cloud Activ (Google Gemini 2.5 Flash)</span>
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono">Google Cloud API</span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                            Gemini 2.5 Flash acționează ca arhitect șef, creând planul și delegând sarcini către lucrătorii locali Ollama.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleTestManager}
                        disabled={managerTestStatus.testing || !appSettings.has_gemini_key}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium transition cursor-pointer flex items-center gap-2 shadow-sm"
                      >
                        {managerTestStatus.testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        <span>{managerTestStatus.testing ? 'Testare în curs...' : 'Testează Conexiune Gemini'}</span>
                      </button>
                    </div>

                    {/* Test result banner if available */}
                    {managerTestStatus.result && (
                      <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                        managerTestStatus.result.status === 'ok'
                          ? 'bg-indigo-900/30 border-indigo-500/40 text-indigo-200'
                          : 'bg-rose-900/30 border-rose-500/40 text-rose-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          {managerTestStatus.result.status === 'ok' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-rose-400" />}
                          <span>{managerTestStatus.result.message}</span>
                        </div>
                        {managerTestStatus.result.latency_ms && (
                          <span className="font-mono text-[11px] bg-black/40 px-2 py-0.5 rounded text-indigo-300">
                            {managerTestStatus.result.latency_ms} ms
                          </span>
                        )}
                      </div>
                    )}

                    {/* Gemini API Key Configuration Box */}
                    <div className="bg-[#05070B] p-4 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Key className="h-4 w-4 text-indigo-400" />
                          <span className="text-xs font-medium text-slate-200">Google Gemini API Key</span>
                        </div>
                        {appSettings.has_gemini_key ? (
                          <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Cheie Activă ({appSettings.gemini_api_key_masked || 'Configurată'})
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                            ⚠️ Cheie lipsă (necesară pentru Cloud)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          value={geminiKeyInput}
                          onChange={e => setGeminiKeyInput(e.target.value)}
                          placeholder={appSettings.has_gemini_key ? "Introdu o nouă cheie pentru înlocuire (AIzaSy...)" : "Introdu cheia API Gemini (AIzaSy...)"}
                          className="flex-1 bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                        />
                        <button
                          onClick={() => {
                            if (geminiKeyInput.trim()) {
                              handleUpdateSettings({ gemini_api_key: geminiKeyInput.trim() });
                              setGeminiKeyInput('');
                            }
                          }}
                          disabled={!geminiKeyInput.trim()}
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition cursor-pointer shrink-0"
                        >
                          Salvează Cheie
                        </button>
                        {appSettings.has_gemini_key && (
                          <button
                            onClick={() => handleUpdateSettings({ gemini_api_key: '' })}
                            title="Șterge cheia salvată"
                            className="p-2 text-slate-400 hover:text-rose-400 bg-[#0B0F17] border border-slate-700 rounded-lg text-xs transition cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Poți obține o cheie gratuită de pe Google AI Studio (<code className="text-indigo-300">aistudio.google.com</code>). Cheia este stocată local în baza ta de date securizată.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Model Catalog & In-App Downloader */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Download className="h-4 w-4 text-cyan-400" />
                    Catalog Modele AI & Evaluare Compatibilitate Hardware
                  </h3>
                  {pullStatus.status === 'pulling' && (
                    <div className="flex items-center gap-2 text-xs text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20 animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Se descarcă {pullStatus.model}... {pullStatus.percent}%</span>
                    </div>
                  )}
                </div>

                {/* Live Pull Progress Box if active */}
                {pullStatus.status === 'pulling' && (
                  <div className="glass-panel p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/10">
                    <div className="flex justify-between items-center mb-2 text-xs">
                      <span className="font-medium text-white flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 text-cyan-400 animate-spin" />
                        Descărcare în curs: <code className="text-cyan-300">{pullStatus.model}</code>
                      </span>
                      <span className="font-mono text-cyan-400 font-bold">{pullStatus.percent}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${pullStatus.percent}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">
                      Status: {pullStatus.status} • {pullStatus.total > 0 ? `${Math.round(pullStatus.completed / (1024**2))} MB / ${Math.round(pullStatus.total / (1024**2))} MB` : 'Inițializare stream...'}
                    </p>
                  </div>
                )}

                {/* Model Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {systemSpecs?.models?.map((m: any) => (
                    <div 
                      key={m.id} 
                      className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h4 className="text-white font-medium text-base flex items-center gap-2">
                              {m.name}
                            </h4>
                            <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 inline-block mt-1">
                              {m.tag}
                            </span>
                          </div>
                          
                          <div className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${
                            m.compatibility_percent >= 90
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : m.compatibility_percent >= 70
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}>
                            {m.compatibility_percent}% OK
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                          {m.description}
                        </p>

                        <div className="bg-[#05070B] p-2.5 rounded-xl border border-slate-800/80 mb-4 space-y-1">
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span>Recomandat pentru:</span>
                            <span className="text-slate-200">{m.recommended_for}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span>Dimensiune pe disc:</span>
                            <span className="font-mono text-slate-300">~{m.size_gb} GB</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span>Compatibilitate sistem:</span>
                            <span className="text-emerald-300 text-[10px]">{m.compatibility_status}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                        {m.is_installed ? (
                          <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                            <CheckCircle2 className="h-4 w-4" /> Instalat & Gata
                          </span>
                        ) : (
                          <button
                            onClick={() => handlePullModel(m.id)}
                            disabled={pullStatus.status === 'pulling'}
                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5" /> Descarcă Model (1-Click)
                          </button>
                        )}

                        {m.is_installed && appSettings.manager_provider === 'local' && (
                          <button
                            onClick={() => handleUpdateSettings({ local_manager_model: m.id })}
                            className={`text-xs px-2.5 py-1 rounded transition cursor-pointer ${
                              appSettings.local_manager_model === m.id
                                ? 'bg-indigo-600 text-white font-medium'
                                : 'text-slate-400 hover:text-white bg-slate-800'
                            }`}
                          >
                            {appSettings.local_manager_model === m.id ? '★ Manager Activ' : 'Setează ca Manager'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Desktop Application & GitHub Releases */}
              <div className="glass-panel p-6 rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-indigo-950/20 via-slate-900/40 to-slate-950/60 shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold">
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white flex items-center gap-2">
                        CoreForge Desktop & GitHub Releases
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                          v{updateInfo?.current_version || '2.0.0'}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Rulează ca aplicație nativă pe Windows (.exe) și Ubuntu (.deb) cu 0 costuri de cloud.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCheckUpdates}
                      disabled={isCheckingUpdate}
                      className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition cursor-pointer"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isCheckingUpdate ? 'animate-spin text-indigo-400' : ''}`} />
                      {isCheckingUpdate ? 'Se verifică...' : 'Verifică Actualizări'}
                    </button>
                    <a
                      href={updateInfo?.repo_url || 'https://github.com/andrei-morar/CoreForge'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg text-xs font-medium border border-indigo-500/30 transition cursor-pointer"
                    >
                      <span>GitHub Repo</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                {/* Status Alert */}
                {updateInfo?.update_available ? (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
                      <div>
                        <div className="text-xs font-semibold text-amber-300">
                          Versiune nouă disponibilă: v{updateInfo.latest_version}!
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {updateInfo.release_name} — Descarcă direct pachetul de instalare actualizat mai jos.
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <div className="text-xs text-slate-300">
                      <span className="text-emerald-400 font-medium">Aplicație la zi: </span>
                      {updateInfo?.message || 'CoreForge rulează pe cea mai recentă versiune stabilă.'}
                    </div>
                  </div>
                )}

                {/* 3 Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* Card 1: Windows */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                          🪟 Windows (.exe)
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          x64 Setup & Portable
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-4">
                        Pachet de instalare NSIS sau executabil portabil direct pentru Windows 10 & 11.
                      </p>
                    </div>
                    <a
                      href={updateInfo?.assets?.windows_exe || 'https://github.com/andrei-morar/CoreForge/releases'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition shadow-sm cursor-pointer text-center"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Descarcă .exe (Windows)
                    </a>
                  </div>

                  {/* Card 2: Ubuntu Linux */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                          🐧 Ubuntu / Debian (.deb)
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                          .deb / AppImage
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-4">
                        Pachet nativ cu integrare în meniul aplicațiilor Ubuntu sau container portabil AppImage.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={updateInfo?.assets?.linux_deb || 'https://github.com/andrei-morar/CoreForge/releases'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium transition cursor-pointer text-center"
                      >
                        <Download className="h-3 w-3" />
                        .deb
                      </a>
                      <a
                        href={updateInfo?.assets?.linux_appimage || 'https://github.com/andrei-morar/CoreForge/releases'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition cursor-pointer text-center"
                      >
                        <Download className="h-3 w-3" />
                        AppImage
                      </a>
                    </div>
                  </div>

                  {/* Card 3: GitHub CI/CD & Modification */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                          ⚡ GitHub Releases & CI
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          Automated
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-4">
                        Compilare automată la fiecare tag de release prin GitHub Actions pe mașini Windows și Linux.
                      </p>
                    </div>
                    <a
                      href={updateInfo?.releases_url || 'https://github.com/andrei-morar/CoreForge/releases'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition shadow-sm cursor-pointer text-center"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Vezi Toate Release-urile
                    </a>
                  </div>
                </div>

                {/* Workflow Tip */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs flex items-start gap-2.5">
                  <span className="text-indigo-400 text-sm font-bold mt-0.5">💡</span>
                  <div>
                    <strong className="text-slate-300">Cum modifici și actualizezi aplicația:</strong> Poți modifica codul oricând local în <code className="text-indigo-300">main.py</code> sau componentele React (cu hot-reload instant). Când vrei să publici o versiune nouă pe GitHub, rulezi doar <code className="text-indigo-300">git tag v2.1.0 && git push origin v2.1.0</code>, iar GitHub Actions va genera noile instalatoare .exe și .deb în secțiunea Releases!
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ TAB: AGENT HUB ═══ */}
          {tab === 'agents' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2.5 mb-1">
                    <Settings className="h-5 w-5 text-indigo-400" />
                    Agent Customization Hub
                  </h2>
                  <p className="text-sm text-slate-500">Configure your local worker swarm</p>
                </div>
                <button onClick={() => setEditingAgent({ name: '', role: '', goal: '', backstory: '', model: models[0] || 'llama3', temperature: 0.6, is_active: 1, tools: [] })}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-sm transition border border-indigo-500/20">
                  <Plus className="h-4 w-4" /> New Agent
                </button>
              </div>

              {editingAgent && (
                <div className="glass-panel-elevated p-6 rounded-2xl animate-fade-in-up border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.1)]">
                  <h3 className="text-lg font-medium text-white mb-4">
                    {'id' in editingAgent ? 'Edit Agent' : 'Create Agent'}
                  </h3>
                  <form onSubmit={handleSaveAgent} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Name</label>
                        <input type="text" required value={editingAgent.name || ''} onChange={e => setEditingAgent({ ...editingAgent, name: e.target.value })}
                          className="w-full bg-[#05070B] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Role</label>
                        <input type="text" required value={editingAgent.role || ''} onChange={e => setEditingAgent({ ...editingAgent, role: e.target.value })}
                          className="w-full bg-[#05070B] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-slate-400 mb-1">Goal</label>
                        <textarea required value={editingAgent.goal || ''} onChange={e => setEditingAgent({ ...editingAgent, goal: e.target.value })} rows={2}
                          className="w-full bg-[#05070B] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-slate-400 mb-1">Backstory</label>
                        <textarea required value={editingAgent.backstory || ''} onChange={e => setEditingAgent({ ...editingAgent, backstory: e.target.value })} rows={3}
                          className="w-full bg-[#05070B] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Local Model (Ollama)</label>
                        <select required value={editingAgent.model || ''} onChange={e => setEditingAgent({ ...editingAgent, model: e.target.value })}
                          className="w-full bg-[#05070B] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500">
                          {models.map(m => <option key={m} value={m}>{m}</option>)}
                          {!models.includes(editingAgent.model as string) && editingAgent.model && (
                            <option value={editingAgent.model}>{editingAgent.model} (Not Downloaded)</option>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Temperature ({editingAgent.temperature})</label>
                        <input type="range" min="0" max="1" step="0.1" value={editingAgent.temperature || 0.6} onChange={e => setEditingAgent({ ...editingAgent, temperature: parseFloat(e.target.value) })}
                          className="w-full mt-2 accent-indigo-500" />
                      </div>
                      <div className="col-span-2 pt-3 border-t border-slate-800">
                        <label className="block text-xs text-slate-400 mb-2 font-medium flex items-center gap-1.5">
                          <Wrench className="h-3.5 w-3.5 text-indigo-400" />
                          CrewAI Agent Tools (Capabilities)
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {availableTools.map(tool => {
                            const isSelected = (editingAgent.tools || []).includes(tool.id);
                            return (
                              <button
                                key={tool.id}
                                type="button"
                                onClick={() => {
                                  const current = editingAgent.tools || [];
                                  const next = isSelected 
                                    ? current.filter(id => id !== tool.id) 
                                    : [...current, tool.id];
                                  setEditingAgent({ ...editingAgent, tools: next });
                                }}
                                className={`flex flex-col text-left p-2.5 rounded-lg border transition cursor-pointer ${
                                  isSelected 
                                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.25)]' 
                                    : 'bg-[#05070B] border-slate-700 text-slate-400 hover:border-slate-600'
                                }`}
                              >
                                <span className="text-xs font-medium flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-400' : 'bg-slate-600'}`} />
                                  {tool.name}
                                </span>
                                <span className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                  {tool.description}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                      <button type="button" onClick={() => setEditingAgent(null)}
                        className="px-4 py-2 text-slate-400 hover:text-white text-sm transition cursor-pointer">Cancel</button>
                      <button type="submit"
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition cursor-pointer">
                        <Save className="h-4 w-4" /> Save Agent
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agents.map(agent => (
                  <div key={agent.id} className={`glass-panel p-5 rounded-2xl transition-all ${agent.is_active ? 'border-cyan-500/20' : 'opacity-60 border-slate-800'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-white font-medium flex items-center gap-2">
                          <UserX className={`h-4 w-4 ${agent.is_active ? 'text-cyan-400' : 'text-slate-500'}`} />
                          {agent.name}
                        </h4>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">{agent.role}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingAgent(agent)} className="p-1.5 text-slate-400 hover:text-white bg-slate-800/50 rounded-md transition cursor-pointer">
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button onClick={() => handleDeleteAgent(agent.id)} className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 rounded-md transition cursor-pointer">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">{agent.goal}</p>
                    
                    {agent.tools && agent.tools.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {agent.tools.map(t => (
                          <span key={t} className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                            <Wrench className="h-2.5 w-2.5" />
                            {availableTools.find(tool => tool.id === t)?.name || t}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          {agent.model}
                        </span>
                        <span className="text-[10px] text-slate-500">T: {agent.temperature}</span>
                      </div>
                      <button onClick={() => handleToggleAgent(agent)}
                        className={`text-xs px-2 py-1 rounded cursor-pointer transition ${agent.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                        {agent.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ TAB: TELEMETRY ═══ */}
          {tab === 'dashboard' && (
            <div className="max-w-5xl mx-auto space-y-8">
              <div>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2.5 mb-1">
                  <Activity className="h-5 w-5 text-cyan-400" />
                  Live System Telemetry
                </h2>
                <p className="text-sm text-slate-500">Real-time hardware monitoring • Updated every second</p>
              </div>

              {!telemetry ? (
                <div className="glass-panel rounded-2xl p-12 text-center">
                  <Loader2 className="h-8 w-8 text-slate-600 mx-auto animate-spin mb-3" />
                  <p className="text-sm text-slate-500">Connecting to backend...</p>
                  <p className="text-xs text-slate-600 mt-1">Make sure the FastAPI server is running on port 8000</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
                  <Gauge value={telemetry.cpu_percent} max={100} label="CPU Usage" color="#06b6d4" icon={Cpu} />
                  <Gauge value={telemetry.ram_percent} max={100} label="RAM Usage" color="#3b82f6" icon={MemoryStick} />
                  <Gauge value={telemetry.ram_used_gb} max={telemetry.ram_total_gb} label="RAM Consumed"
                    sub={`/ ${telemetry.ram_total_gb} GB`} color="#8b5cf6" icon={HardDrive} />
                </div>
              )}

              {/* Architecture Overview Card */}
              <div className="glass-panel rounded-2xl p-6 animate-fade-in-up">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-purple-400" />
                  Arhitectură Agenți & Orchestare
                </h3>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${
                    appSettings.manager_provider === 'local'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                  }`}>
                    {appSettings.manager_provider === 'local' 
                      ? `🏠 Manager Local (${appSettings.local_manager_model || 'qwen2.5-coder'})`
                      : '🧠 Gemini Manager (Google Cloud)'}
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                  {['Frontend Dev', 'Backend Dev', 'DB Architect'].map(name => (
                    <div key={name} className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-medium">
                      ⚡ {name}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-3">
                  {appSettings.manager_provider === 'local'
                    ? `Proces Ierarhic • Managerul rulează 100% offline pe laptop (GPU RTX 4060) • Lucrători locali Ollama`
                    : 'Proces Ierarhic • Gemini orchestrează via Google Cloud API • Lucrători locali pe Ollama'}
                </p>
              </div>
            </div>
          )}

          {/* ═══ TAB: DIRECT CHAT (LOCAL LLM) ═══ */}
          {tab === 'direct' && (
            <div className="max-w-6xl mx-auto flex gap-6 h-[calc(100vh-8rem)] w-full">
              {/* Sidebar */}
              <div className="w-64 shrink-0 flex flex-col gap-3">
                <button 
                  onClick={handleNewSession}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-fuchsia-600/10 hover:bg-fuchsia-600/20 text-fuchsia-400 font-medium transition-colors border border-fuchsia-500/20 shadow-lg shadow-fuchsia-500/10"
                >
                  <Plus className="h-4 w-4" /> New Chat
                </button>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {localSessions.map(s => (
                    <div key={s.id} className={`w-full rounded-xl transition-all flex items-center group ${
                        activeSessionId === s.id 
                          ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/20' 
                          : 'bg-[#05070B] border border-slate-800 text-slate-400 hover:border-slate-600'
                      }`}>
                      <button
                        onClick={() => setActiveSessionId(s.id)}
                        className="flex-1 text-left px-3 py-3 text-sm truncate flex items-center justify-between"
                      >
                        <span className="truncate pr-2">{s.title}</span>
                        <MessageCircle className={`h-4 w-4 shrink-0 ${activeSessionId === s.id ? 'opacity-50' : 'opacity-0 group-hover:opacity-30'}`} />
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm('Delete this chat session?')) {
                            try {
                              await fetch(`${API}/api/chat/local/sessions/${s.id}`, { method: 'DELETE' });
                              setLocalSessions(prev => prev.filter(x => x.id !== s.id));
                              if (activeSessionId === s.id) {
                                setActiveSessionId(null);
                                setLocalMessages([]);
                              }
                            } catch { /* ignore */ }
                          }
                        }}
                        className={`p-3 text-slate-400 hover:text-rose-400 transition-colors ${activeSessionId === s.id ? 'text-fuchsia-200 hover:text-white' : 'opacity-0 group-hover:opacity-100'}`}
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-between mb-4 shrink-0 flex-wrap gap-2">
                  <div>
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2.5 mb-1">
                      <MessageCircle className="h-5 w-5 text-fuchsia-400" />
                      Direct Chat
                    </h2>
                    <p className="text-sm text-slate-500">1-on-1 private chat with local AI models (No Swarm)</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs font-mono bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-xl text-cyan-300">
                      <Coins className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Sesiune: <strong>{localMessages.reduce((a, b) => a + (b.total_tokens || 0), 0).toLocaleString()}</strong> tokeni</span>
                    </div>
                    <select 
                      value={selectedLocalModel} 
                      onChange={(e) => setSelectedLocalModel(e.target.value)}
                      className="bg-[#05070B] border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-fuchsia-500 transition-colors"
                    >
                      {models.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

              {/* Chat History */}
              <div className="flex-1 glass-panel rounded-2xl p-4 overflow-y-auto mb-4 space-y-4">
                {localMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500">
                    <MessageCircle className="h-12 w-12 mb-4 opacity-30" />
                    <p>Start a conversation with {selectedLocalModel}</p>
                    <p className="text-xs mt-2">100% private and runs locally on your machine.</p>
                  </div>
                ) : (
                  localMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl p-4 ${
                        msg.role === 'user' 
                          ? 'bg-fuchsia-600 text-white' 
                          : 'bg-[#05070B] border border-slate-800 text-slate-300'
                      }`}>
                        <div className="text-xs font-semibold mb-1 opacity-70 uppercase tracking-wider">
                          {msg.role === 'user' ? 'You' : (msg.model || selectedLocalModel)}
                        </div>
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                          {msg.content}
                        </pre>

                        {/* Token metrics badge for assistant messages */}
                        {msg.role === 'assistant' && ((msg.total_tokens || 0) > 0 || (msg.prompt_tokens || 0) > 0) && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-cyan-400 select-none flex-wrap">
                            <span className="flex items-center gap-1 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                              <Zap className="h-3 w-3 text-cyan-400" />
                              <span><strong>{(msg.total_tokens || 0).toLocaleString()}</strong> tokeni ({(msg.prompt_tokens || 0)} in • {(msg.completion_tokens || 0)} out)</span>
                            </span>
                            {msg.tok_per_sec ? (
                              <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
                                ⚡ {msg.tok_per_sec} tok/s
                              </span>
                            ) : null}
                            {msg.duration_ms ? (
                              <span className="text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded">
                                ⏱️ {(msg.duration_ms / 1000).toFixed(1)}s
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isLocalChatting && (
                  <div className="flex justify-start">
                    <div className="bg-[#05070B] border border-slate-800 text-slate-300 rounded-2xl p-4 flex items-center gap-3">
                      <Loader2 className="h-4 w-4 animate-spin text-fuchsia-400" />
                      <span className="text-sm">{selectedLocalModel} is typing...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="relative shrink-0">
                <textarea
                  value={localPrompt}
                  onChange={e => setLocalPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleLocalChat(); } }}
                  placeholder="Message local AI..."
                  disabled={isLocalChatting || !selectedLocalModel}
                  className="w-full pl-4 pr-14 py-3 rounded-xl bg-[#05070B] border border-slate-700 text-sm text-slate-200 placeholder:text-slate-600 focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/30 resize-none disabled:opacity-50"
                  rows={2}
                />
                <button
                  onClick={handleLocalChat}
                  disabled={!localPrompt.trim() || isLocalChatting || !selectedLocalModel}
                  className="absolute right-3 top-3 p-2 rounded-lg bg-fuchsia-600/20 text-fuchsia-400 hover:bg-fuchsia-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
            </div>
          )}

          {/* ═══ TAB: AGENT COMMAND ═══ */}
          {tab === 'chat' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2.5 mb-1">
                  <BrainCircuit className="h-5 w-5 text-purple-400" />
                  Agent Command Center
                </h2>
                <p className="text-sm text-slate-500">Deploy the hierarchical AI swarm to execute complex tasks</p>
              </div>

              {/* Input Area */}
              <div className="glass-panel-elevated rounded-2xl p-5 space-y-4">
                <textarea
                  id="agent-prompt-input"
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleRun(); }}
                  placeholder="Describe a task for the AI swarm... (⌘+Enter to send)"
                  disabled={sending}
                  className="w-full h-36 p-4 rounded-xl bg-[#07090E] border border-slate-800 text-sm text-slate-200 placeholder:text-slate-600 focus:border-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 resize-none transition-all disabled:opacity-50"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    {appSettings.manager_provider === 'local' ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Manager 100% Local: <strong className="text-emerald-300 font-semibold">{appSettings.local_manager_model || 'qwen2.5-coder'}</strong> → Lucrători Ollama</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                        <Cloud className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Manager Cloud: <strong className="text-indigo-300 font-semibold">Gemini 2.5 Flash</strong> → Lucrători Ollama</span>
                      </span>
                    )}
                  </div>
                  <button
                    id="deploy-swarm-btn"
                    onClick={handleRun}
                    disabled={!prompt.trim() || sending}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {sending ? 'Swarm Active...' : 'Deploy Swarm'}
                  </button>
                </div>
              </div>

              {/* Job Status / Response */}
              {(sending || agentResponse) && (
                <div className="glass-panel rounded-2xl p-5 animate-fade-in-up">
                  {sending && !agentResponse && (
                    <div className="flex flex-col items-center py-4 gap-4">
                      <div className="text-center mb-1">
                        <p className="text-sm font-medium text-slate-200 flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                          <span>Swarm Orchestration Active</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {activeJob?.active_agent 
                            ? `Currently Executing: ${activeJob.active_agent}` 
                            : 'Manager is decomposing task and delegating to specialist tiers...'}
                        </p>
                      </div>
                      
                      <div style={{ height: 420, width: '100%' }} className="bg-[#05070B] rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
                        <ReactFlow 
                          fitView
                          nodes={swarmData.nodes} 
                          edges={swarmData.edges}
                        >
                          <Background color="#1e293b" gap={18} />
                        </ReactFlow>
                      </div>
                    </div>
                  )}

                  {agentResponse && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {activeJob?.status === 'completed'
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            : <XCircle className="h-4 w-4 text-rose-400" />
                          }
                          <span className={`text-xs font-semibold uppercase tracking-wider ${
                            activeJob?.status === 'completed' ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {activeJob?.status === 'completed' ? 'Swarm Complete' : 'Execution Failed'}
                          </span>
                        </div>
                        {activeJob?.download_url && (
                          <a href={`${API}${activeJob.download_url}`} download
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium transition-all border border-emerald-500/20">
                            <Download className="h-3.5 w-3.5" /> Download App Archive (.zip)
                          </a>
                        )}
                      </div>

                      {/* Swarm Token Usage Summary Banner */}
                      {activeJob?.token_usage && (
                        <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-purple-950/40 border border-cyan-500/30 flex items-center justify-between flex-wrap gap-3 text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400">
                              <Coins className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">Consum Swarm:</span>
                                <span className="text-cyan-300 font-mono font-bold">{activeJob.token_usage.total_tokens.toLocaleString()} tokeni</span>
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                {activeJob.token_usage.prompt_tokens.toLocaleString()} prompt • {activeJob.token_usage.completion_tokens.toLocaleString()} generați
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {activeJob.token_usage.duration_seconds && (
                              <span className="text-slate-300 bg-[#05070B] px-2.5 py-1 rounded-lg border border-slate-800 font-mono text-[11px]">
                                ⏱️ {activeJob.token_usage.duration_seconds}s
                              </span>
                            )}
                            <span className="text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 font-mono text-[11px] font-semibold flex items-center gap-1">
                              <TrendingUp className="h-3.5 w-3.5" /> Economie: ~${activeJob.token_usage.cost_saved_usd}
                            </span>
                          </div>
                        </div>
                      )}

                      <pre className="p-4 rounded-xl bg-[#05070B] border border-slate-800 font-mono text-xs text-cyan-300/90 whitespace-pre-wrap overflow-x-auto max-h-[500px] overflow-y-auto leading-relaxed">
                        {agentResponse}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══ TAB: TOKEN ANALYTICS ═══ */}
          {tab === 'tokens' && (
            <div className="max-w-5xl mx-auto space-y-6 animate-fade-in-up">
              {/* Header */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2.5 mb-1">
                    <BarChart3 className="h-5 w-5 text-amber-400" />
                    Statistici Consum Tokeni & Inteligență Costuri
                  </h2>
                  <p className="text-xs text-slate-400">
                    Monitorizare locală privată a tokenilor consumați, randament GPU RTX 4060 și economie realizată față de API-urile Cloud.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchTokenAnalytics}
                    disabled={isLoadingTokens}
                    title="Reîmprospătează datele"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoadingTokens ? 'animate-spin text-amber-400' : ''}`} />
                    <span>Reîmprospătează</span>
                  </button>

                  <button
                    onClick={handleClearTokens}
                    title="Resetează istoricul de tokeni"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 text-xs font-medium rounded-xl border border-rose-500/30 transition cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Resetează</span>
                  </button>
                </div>
              </div>

              {/* Top 4 KPI Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KPI 1: Total Tokens */}
                <div className="glass-panel p-4 rounded-2xl border border-amber-500/30 bg-amber-950/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Tokeni</span>
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Coins className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold font-mono text-white tracking-tight">
                      {tokenAnalytics?.summary?.total_tokens?.toLocaleString() || '0'}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-1">
                      <span className="text-cyan-400">In: {tokenAnalytics?.summary?.prompt_tokens?.toLocaleString() || '0'}</span>
                      <span>•</span>
                      <span className="text-purple-400">Out: {tokenAnalytics?.summary?.completion_tokens?.toLocaleString() || '0'}</span>
                    </div>
                  </div>
                </div>

                {/* KPI 2: Money Saved */}
                <div className="glass-panel p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Economie vs Cloud</span>
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold font-mono text-emerald-400 tracking-tight flex items-baseline gap-1.5">
                      ${tokenAnalytics?.summary?.money_saved_usd?.toFixed(2) || '0.00'}
                      <span className="text-xs font-normal text-slate-400 font-sans">
                        (~{tokenAnalytics?.summary?.money_saved_ron?.toFixed(2) || '0.00'} Lei)
                      </span>
                    </div>
                    <div className="text-[10px] text-emerald-300/80 mt-1 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="h-3 w-3" /> 100% Gratuit pe Laptopul tău
                    </div>
                  </div>
                </div>

                {/* KPI 3: Source Distribution */}
                <div className="glass-panel p-4 rounded-2xl border border-indigo-500/30 bg-indigo-950/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Direct vs Swarm</span>
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <Cpu className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono text-slate-300 mb-1">
                      <span>Swarm: {tokenAnalytics?.summary?.agent_command_tokens?.toLocaleString() || 0}</span>
                      <span>Chat: {tokenAnalytics?.summary?.direct_chat_tokens?.toLocaleString() || 0}</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
                      <div 
                        className="bg-purple-500 h-2 transition-all duration-500" 
                        style={{ width: `${Math.round(((tokenAnalytics?.summary?.agent_command_tokens || 0) / Math.max(tokenAnalytics?.summary?.total_tokens || 1, 1)) * 100)}%` }} 
                        title="Swarm Tokens"
                      />
                      <div 
                        className="bg-cyan-500 h-2 transition-all duration-500" 
                        style={{ width: `${Math.round(((tokenAnalytics?.summary?.direct_chat_tokens || 0) / Math.max(tokenAnalytics?.summary?.total_tokens || 1, 1)) * 100)}%` }} 
                        title="Direct Chat Tokens"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-mono">
                      <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-purple-400" /> Swarm ({Math.round(((tokenAnalytics?.summary?.agent_command_tokens || 0) / Math.max(tokenAnalytics?.summary?.total_tokens || 1, 1)) * 100)}%)</span>
                      <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> Chat ({Math.round(((tokenAnalytics?.summary?.direct_chat_tokens || 0) / Math.max(tokenAnalytics?.summary?.total_tokens || 1, 1)) * 100)}%)</span>
                    </div>
                  </div>
                </div>

                {/* KPI 4: Speed / Throughput */}
                <div className="glass-panel p-4 rounded-2xl border border-cyan-500/30 bg-cyan-950/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Viteză Medie GPU</span>
                    <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <Zap className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold font-mono text-cyan-300 tracking-tight">
                      ~{tokenAnalytics?.summary?.avg_tok_sec || 46.5} <span className="text-xs text-slate-400 font-sans">tok/s</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      Hardware: RTX 4060 Laptop (8GB VRAM)
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Timeline Graph & Model Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Timeline Chart (2 cols) */}
                <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-cyan-400" />
                        Consum Istoric de Tokeni (Timeline)
                      </h3>
                      <p className="text-[11px] text-slate-400">Volumul de tokeni procesați grupat pe zile</p>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      <span className="flex items-center gap-1.5 text-cyan-400">
                        <span className="h-2 w-2 rounded-full bg-cyan-400" /> Prompt (In)
                      </span>
                      <span className="flex items-center gap-1.5 text-purple-400">
                        <span className="h-2 w-2 rounded-full bg-purple-400" /> Generați (Out)
                      </span>
                    </div>
                  </div>

                  {/* Visual Bar Chart */}
                  <div className="h-52 w-full flex items-end gap-3 pt-6 pb-2 border-b border-slate-800">
                    {(!tokenAnalytics?.timeline || tokenAnalytics.timeline.length === 0) ? (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                        Nicio sesiune de tokeni înregistrată încă
                      </div>
                    ) : (
                      (() => {
                        const maxTokens = Math.max(...tokenAnalytics.timeline.map(t => t.total_tokens), 100);
                        return tokenAnalytics.timeline.map((item, idx) => {
                          const heightPercent = Math.max(Math.round((item.total_tokens / maxTokens) * 100), 8);
                          const promptRatio = item.total_tokens > 0 ? (item.prompt_tokens / item.total_tokens) : 0.3;
                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer">
                              {/* Hover Tooltip */}
                              <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-20 bg-[#05070B] border border-slate-700 text-white p-2 rounded-xl text-[10px] font-mono shadow-xl whitespace-nowrap">
                                <div className="font-bold text-slate-300">{item.date}</div>
                                <div className="text-cyan-400">In: {item.prompt_tokens.toLocaleString()} tok</div>
                                <div className="text-purple-400">Out: {item.completion_tokens.toLocaleString()} tok</div>
                                <div className="text-slate-400">{item.requests} cereri</div>
                              </div>

                              {/* Stacked Bar */}
                              <div 
                                className="w-full max-w-[42px] rounded-t-lg overflow-hidden flex flex-col justify-end transition-all duration-300 group-hover:brightness-125"
                                style={{ height: `${heightPercent}%` }}
                              >
                                <div 
                                  className="bg-gradient-to-t from-purple-600 to-indigo-500 w-full"
                                  style={{ height: `${(1 - promptRatio) * 100}%` }}
                                />
                                <div 
                                  className="bg-gradient-to-t from-cyan-600 to-cyan-400 w-full"
                                  style={{ height: `${promptRatio * 100}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 mt-2 truncate max-w-[60px]">
                                {item.date.slice(5)}
                              </span>
                            </div>
                          );
                        });
                      })()
                    )}
                  </div>
                </div>

                {/* Model Breakdown (1 col) */}
                <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
                      <PieChart className="h-4 w-4 text-purple-400" />
                      Distribuție per Model AI
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-4">Ponderea consumului pe fiecare model local</p>

                    <div className="space-y-4">
                      {(!tokenAnalytics?.by_model || tokenAnalytics.by_model.length === 0) ? (
                        <div className="text-xs text-slate-500 py-6 text-center">Niciun model utilizat încă</div>
                      ) : (
                        tokenAnalytics.by_model.map((m, idx) => {
                          const total = tokenAnalytics?.summary?.total_tokens || 1;
                          const percent = Math.round((m.total_tokens / total) * 100);
                          return (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-mono text-slate-200 font-medium truncate max-w-[150px]">{m.model}</span>
                                <span className="font-mono text-cyan-300 font-semibold">{percent}%</span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div 
                                  className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                                <span>{m.total_tokens.toLocaleString()} tokeni</span>
                                <span>{m.requests} cereri</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Modele Active</span>
                    <span className="text-cyan-400 font-mono">{tokenAnalytics?.by_model?.length || 0} Modele</span>
                  </div>
                </div>
              </div>

              {/* Cloud API Cost Savings Comparison Card */}
              <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-[#070B14] via-[#09101E] to-[#070B14]">
                <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                      Comparație Costuri: Laptop Local vs API-uri Cloud Pay-Per-Token
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Dacă acești {tokenAnalytics?.summary?.total_tokens?.toLocaleString() || 0} tokeni ar fi fost rulați prin API-uri Cloud comerciale:
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold">
                    ✓ Cost Local Real: 0.00 $
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {/* CoreForge Local */}
                  <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                    <div className="text-[11px] text-emerald-400 font-medium">CoreForge Local (RTX 4060)</div>
                    <div className="text-xl font-bold text-white font-mono mt-1">0.00 $</div>
                    <div className="text-[10px] text-emerald-300 mt-0.5 font-medium">100% Nelimitat Gratuit</div>
                  </div>

                  {/* OpenAI GPT-4o */}
                  <div className="p-3.5 rounded-xl bg-[#05070B] border border-slate-800">
                    <div className="text-[11px] text-slate-400 font-medium">OpenAI GPT-4o</div>
                    <div className="text-xl font-bold text-slate-200 font-mono mt-1">
                      ${tokenAnalytics?.summary?.savings_comparison?.gpt4o_cost?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Tarif $2.50/$10 per 1M</div>
                  </div>

                  {/* Anthropic Claude 3.5 Sonnet */}
                  <div className="p-3.5 rounded-xl bg-[#05070B] border border-slate-800">
                    <div className="text-[11px] text-slate-400 font-medium">Claude 3.5 Sonnet</div>
                    <div className="text-xl font-bold text-slate-200 font-mono mt-1">
                      ${tokenAnalytics?.summary?.savings_comparison?.claude_cost?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Tarif $3.00/$15 per 1M</div>
                  </div>

                  {/* Google Gemini 1.5 Pro */}
                  <div className="p-3.5 rounded-xl bg-[#05070B] border border-slate-800">
                    <div className="text-[11px] text-slate-400 font-medium">Google Gemini 1.5 Pro</div>
                    <div className="text-xl font-bold text-slate-200 font-mono mt-1">
                      ${tokenAnalytics?.summary?.savings_comparison?.gemini_cost?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Tarif $3.50/$10.50 per 1M</div>
                  </div>
                </div>
              </div>

              {/* Jurnal Detaliat Evenimente Tokeni (Table) */}
              <div className="glass-panel rounded-2xl p-5 border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Coins className="h-4 w-4 text-cyan-400" />
                      Jurnal Detaliat de Tokeni (Ultimele Activități)
                    </h3>
                    <p className="text-[11px] text-slate-400">Fiecare interacțiune din Direct Chat și Agent Swarm</p>
                  </div>
                  <span className="text-xs font-mono text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-lg">
                    {tokenAnalytics?.recent_events?.length || 0} înregistrări
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Dată / Oră</th>
                        <th className="pb-3 font-semibold">Sursă</th>
                        <th className="pb-3 font-semibold">Model AI</th>
                        <th className="pb-3 font-semibold text-right">In (Prompt)</th>
                        <th className="pb-3 font-semibold text-right">Out (Gen)</th>
                        <th className="pb-3 font-semibold text-right">Total Tokeni</th>
                        <th className="pb-3 font-semibold text-right">Durată</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {(!tokenAnalytics?.recent_events || tokenAnalytics.recent_events.length === 0) ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-500">
                            Nicio activitate înregistrată încă.
                          </td>
                        </tr>
                      ) : (
                        tokenAnalytics.recent_events.map((ev) => (
                          <tr key={ev.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 text-slate-400 text-[11px]">
                              {ev.timestamp.replace('T', ' ').slice(0, 19)}
                            </td>
                            <td className="py-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-medium border ${
                                ev.source === 'agent_command' 
                                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' 
                                  : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                              }`}>
                                {ev.source === 'agent_command' ? '🤖 Swarm' : '💬 Direct'}
                              </span>
                            </td>
                            <td className="py-2.5 text-slate-200">
                              {ev.model}
                            </td>
                            <td className="py-2.5 text-right text-cyan-400/90">
                              {ev.prompt_tokens.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right text-purple-400/90">
                              {ev.completion_tokens.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right font-bold text-white">
                              {ev.total_tokens.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right text-slate-400 text-[11px]">
                              {ev.duration_ms ? `${(ev.duration_ms / 1000).toFixed(1)}s` : '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══ TAB: MEMORY ARCHIVE ═══ */}
          {tab === 'database' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2.5 mb-1">
                    <Database className="h-5 w-5 text-cyan-400" />
                    System Memory Archive
                  </h2>
                  <p className="text-sm text-slate-500">
                    Persistent SQLite storage • {history.length} record{history.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={fetchHistory}
                    className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                    title="Refresh">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  {history.length > 0 && (
                    <button id="clear-memory-btn" onClick={handleClear}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium transition-all cursor-pointer border border-rose-500/20">
                      <Trash2 className="h-3.5 w-3.5" /> Clear
                    </button>
                  )}
                </div>
              </div>

              {history.length === 0 ? (
                <div className="glass-panel rounded-2xl p-12 text-center">
                  <Database className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No records in memory</p>
                  <p className="text-xs text-slate-600 mt-1">Agent conversations will appear here automatically</p>
                </div>
              ) : (
                <div className="space-y-3 stagger-children">
                  {history.map(log => (
                    <div key={log.id} className="glass-panel-elevated rounded-xl p-4 hover:border-slate-700/50 transition-all duration-200">
                      <div className="flex items-center justify-between mb-2.5">
                        <RoleBadge role={log.role} />
                        <span className="text-[10px] text-slate-600 font-mono tabular-nums">{log.time}</span>
                      </div>
                      {log.role === 'User' ? (
                        <p className="text-sm text-slate-300 leading-relaxed">{log.content}</p>
                      ) : (
                        <pre className="mt-1 p-3 rounded-lg bg-[#05070B] border border-slate-800/80 font-mono text-[11px] text-cyan-300/80 whitespace-pre-wrap overflow-x-auto max-h-80 overflow-y-auto leading-relaxed">
                          {log.content}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* Create File / Folder Modal */}
        {createDialog.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-[#0B0F17] border border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-fade-in-up">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  {createDialog.type === 'file' ? <FilePlus className="h-4 w-4 text-sky-400" /> : <FolderPlus className="h-4 w-4 text-amber-400" />}
                  Create New {createDialog.type === 'file' ? 'File' : 'Folder'}
                </h3>
                <button onClick={() => setCreateDialog({ isOpen: false, type: 'file', targetDir: '' })} className="text-slate-500 hover:text-white cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="text-xs text-slate-400">
                Target location: <code className="text-cyan-400 font-mono">{createDialog.targetDir ? `${createDialog.targetDir}/` : '(project root)'}</code>
              </div>
              <input
                type="text"
                value={newEntityName}
                onChange={(e) => setNewEntityName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateEntity();
                  if (e.key === 'Escape') setCreateDialog({ isOpen: false, type: 'file', targetDir: '' });
                }}
                autoFocus
                placeholder={createDialog.type === 'file' ? 'e.g. services.py or api/router.py' : 'e.g. components or utils'}
                className="w-full bg-[#05070B] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setCreateDialog({ isOpen: false, type: 'file', targetDir: '' })}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEntity}
                  disabled={!newEntityName.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white disabled:opacity-50 transition cursor-pointer"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
