'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Sliders, ArrowUpCircle, Bell, Laptop,
  Cpu, Database, MessageSquare, Zap, MemoryStick, Activity,
  Send, Trash2, RefreshCw, CheckCircle2, XCircle, Loader2,
  BrainCircuit, Monitor, Server, HardDrive, ChevronRight, ChevronDown, Download,
  Settings, Edit2, Plus, Save, UserX, Code2, FileCode, Play, MessageCircle,
  Terminal, Folder, FolderPlus, FilePlus, FileText, Wrench, X, Check, Shield, Layers,
  Cloud, ShieldCheck, Key, Sparkles, BarChart3, Coins, TrendingUp, PieChart, AlertTriangle,
  Package, ExternalLink, Smartphone, QrCode, Share2, MoreHorizontal, Copy
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import ReactFlow, { Background, Edge, Node } from 'reactflow';
import 'reactflow/dist/style.css';
import { translations, Language } from '../lib/translations';
import QRCode from 'qrcode';

const getApiBase = () => {
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `http://${window.location.hostname}:8000`;
  }
  return 'http://localhost:8000';
};
const API = {
  toString: () => getApiBase(),
  valueOf: () => getApiBase(),
};
const CURRENT_APP_VERSION = '2.3.0';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MobileConnectInfo {
  status: string;
  lan_ip: string;
  port: number;
  url: string;
  qr_data_url: string;
  interfaces?: { interface: string; ip: string; is_wifi: boolean; label: string }[];
  instructions: {
    ro: string[];
    en: string[];
  };
}

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
  category?: string;
  badge?: string;
  is_enabled?: boolean;
}

interface AgentTemplate {
  id: string;
  name: string;
  tag: string;
  badge_color: string;
  description: string;
  agents: {
    name: string;
    role: string;
    goal: string;
    backstory: string;
    model: string;
    temperature: number;
    tools: string[];
  }[];
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
  const [lang, setLang] = useState<Language>('ro');
  const t = useMemo(() => translations[lang] || translations.ro, [lang]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('coreforge_lang') as Language;
      if (saved && (saved === 'ro' || saved === 'en')) {
        setLang(saved);
      }
    }
  }, []);

  const switchLanguage = (newLang: Language) => {
    setLang(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('coreforge_lang', newLang);
    }
    addToast(newLang === 'ro' ? 'Limbă Schimbată' : 'Language Changed', newLang === 'ro' ? 'Interfața este acum în Română' : 'Interface is now in English', 'info');
  };
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
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [agentTemplates, setAgentTemplates] = useState<AgentTemplate[]>([]);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState<string | null>(null);
  const [agentHubSubTab, setAgentHubSubTab] = useState<'squad' | 'skills'>('squad');

  const fetchAgentTemplates = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/agents/templates`);
      if (res.ok) {
        const data = await res.json();
        setAgentTemplates(data.templates || []);
      }
    } catch (e) {
      console.error('Fetch templates error', e);
    }
  }, []);

  const handleApplyTemplate = async (templateId: string) => {
    setIsApplyingTemplate(templateId);
    try {
      const res = await fetch(`${API}/api/agents/templates/${templateId}/apply`, {
        method: 'POST'
      });
      if (res.ok) {
        await fetchAgentsAndModels();
        addToast('Echipă Aplicată', 'Noua echipă de agenți a fost configurată cu succes!', 'success');
        setShowTemplatesModal(false);
      }
    } catch (e) {
      addToast('Eroare', 'Nu s-a putut aplica șablonul.', 'error');
    } finally {
      setIsApplyingTemplate(null);
    }
  };

  const handleToggleTool = async (toolId: string) => {
    try {
      const res = await fetch(`${API}/api/tools/${toolId}/toggle`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAvailableTools(prev => prev.map(t => t.id === toolId ? { ...t, is_enabled: data.is_enabled } : t));
        addToast('Skill Actualizat', `${toolId} este acum ${data.is_enabled ? 'activat' : 'dezactivat'}`, 'info');
      }
    } catch {
      addToast('Eroare', 'Nu s-a putut schimba starea uneltei.', 'error');
    }
  };
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
    moe_routing_enabled?: boolean;
  }>({
    manager_provider: 'local',
    local_manager_model: 'qwen2.5-coder:latest',
    has_gemini_key: false,
    gemini_api_key_masked: '',
    moe_routing_enabled: true
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
  const [settingsSubTab, setSettingsSubTab] = useState<'update' | 'general' | 'mobile' | 'ai' | 'models' | 'sandbox'>('update');
  const [mobileConnect, setMobileConnect] = useState<MobileConnectInfo | null>(null);
  const [isCopiedMobileUrl, setIsCopiedMobileUrl] = useState(false);
  const [showMobileMoreSheet, setShowMobileMoreSheet] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{
    status: string;
    percent: number;
    downloaded_mb: number;
    total_mb: number;
    speed_mbps: number;
    target_file: string | null;
    error: string | null;
  }>({
    status: 'idle',
    percent: 0,
    downloaded_mb: 0,
    total_mb: 0,
    speed_mbps: 0,
    target_file: null,
    error: null
  });
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [updateActionMsg, setUpdateActionMsg] = useState<string | null>(null);
  const [desktopNotifsEnabled, setDesktopNotifsEnabled] = useState(true);
  const [aiTemperature, setAiTemperature] = useState(0.5);
  const [sandboxTimeoutSec, setSandboxTimeoutSec] = useState('15');
  const [activeTheme, setActiveTheme] = useState('cyberpunk');
  const [autoCheckUpdates, setAutoCheckUpdates] = useState(true);

  // ── 7 Advanced Features State ──
  const [editorMode, setEditorMode] = useState<'code' | 'preview'>('code');
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [copilotEnabled, setCopilotEnabled] = useState(true);
  const [ragQuery, setRagQuery] = useState('');
  const [ragResults, setRagResults] = useState<any[]>([]);
  const [isRagSearching, setIsRagSearching] = useState(false);
  const [isRagIndexing, setIsRagIndexing] = useState(false);
  const [ragToast, setRagToast] = useState<string | null>(null);
  const [isAutoFixing, setIsAutoFixing] = useState(false);

  // ── Models Manager State ──
  const [installedModelsDetail, setInstalledModelsDetail] = useState<any[]>([]);
  const [modelsCatalog, setModelsCatalog] = useState<any[]>([]);
  const [ollamaRunning, setOllamaRunning] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeletingModel, setIsDeletingModel] = useState(false);
  const [customModelName, setCustomModelName] = useState('');
  const [ggufModelName, setGgufModelName] = useState('');
  const [ggufFilePath, setGgufFilePath] = useState('');
  const [isImportingGguf, setIsImportingGguf] = useState(false);

  const handleImportGguf = async () => {
    if (!ggufModelName.trim() || !ggufFilePath.trim() || isImportingGguf) return;
    setIsImportingGguf(true);
    try {
      const res = await fetch(`${API}/api/models/import-gguf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_name: ggufModelName.trim(),
          file_path: ggufFilePath.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        addToast('Model GGUF Importat', `Modelul ${data.model_name} este acum gata în Ollama!`, 'success');
        setGgufModelName('');
        setGgufFilePath('');
        await fetchModelsDetail();
      } else {
        addToast('Eroare Import', data.detail || 'Nu s-a putut importa fișierul GGUF.', 'error');
      }
    } catch (e: any) {
      addToast('Eroare Conexiune', e.message || 'Eroare la importul GGUF', 'error');
    } finally {
      setIsImportingGguf(false);
    }
  };
  const [modelsLoading, setModelsLoading] = useState(false);
  const [autoFixResult, setAutoFixResult] = useState<any | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const notifyUser = useCallback((title: string, body: string) => {
    if (typeof window !== 'undefined' && (window as any).nexusDesktop?.showNotification) {
      (window as any).nexusDesktop.showNotification(title, body);
      return;
    }
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(title, { body, icon: '/favicon.ico' });
          }
        });
      }
    }
  }, []);

  // ── In-App Floating Toasts System ──
  const [toasts, setToasts] = useState<{ id: string; title: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }[]>([]);

  const toastIdRef = useRef(0);
  const addToast = useCallback((title: string, message: string, type?: 'success' | 'error' | 'info' | 'warning') => {
    toastIdRef.current += 1;
    const id = `toast-${toastIdRef.current}-${Date.now()}`;
    const toastType = type || 'info';
    setToasts(prev => [...prev, { id, title, message, type: toastType }]);
    notifyUser(title, message);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, [notifyUser, setToasts]);


  const handleAutoFix = async () => {
    if (!activeProject || isAutoFixing) return;
    setIsAutoFixing(true);
    setAutoFixResult(null);
    try {
      const res = await fetch(`${API}/api/sandbox/auto-fix/${activeProject}`, { method: 'POST' });
      const data = await res.json();
      setAutoFixResult(data);
      if (data.modified_files && data.modified_files.length > 0) {
        await reloadProjectFiles(activeProject);
      }
      setSandboxLogs(`[Auto-Fix Status]: ${data.status}\n${data.message || ''}\nFișiere modificate: ${(data.modified_files || []).join(', ') || 'niciunul'}\n\nDiagnostic:\n${data.diagnostics || ''}`);
      setIsTerminalOpen(true);
      notifyUser('CoreForge Auto-Fix', `Diagnostic finalizat: ${data.status}`);
    } catch (e: any) {
      setSandboxLogs(`[Auto-Fix Error]: ${e.message}`);
      setIsTerminalOpen(true);
    } finally {
      setIsAutoFixing(false);
    }
  };

  const handleRagSearch = async (query: string) => {
    setRagQuery(query);
    if (!query.trim() || !activeProject) {
      setRagResults([]);
      return;
    }
    setIsRagSearching(true);
    try {
      const res = await fetch(`${API}/api/rag/search?project=${encodeURIComponent(activeProject)}&q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setRagResults(data.results || []);
      }
    } catch {
      setRagResults([]);
    } finally {
      setIsRagSearching(false);
    }
  };

  const handleRagIndex = async () => {
    if (!activeProject || isRagIndexing) return;
    setIsRagIndexing(true);
    setRagToast(null);
    try {
      const res = await fetch(`${API}/api/rag/index/${activeProject}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setRagToast(`Indexate ${data.total_chunks} fragmente cod în ${data.files_indexed} fișiere!`);
        setTimeout(() => setRagToast(null), 4000);
      }
    } catch (e: any) {
      setRagToast(`Eroare indexare: ${e.message}`);
      setTimeout(() => setRagToast(null), 4000);
    } finally {
      setIsRagIndexing(false);
    }
  };

  const fetchPreviewStatus = useCallback(async (projectName: string) => {
    try {
      const res = await fetch(`${API}/api/sandbox/preview-status/${projectName}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewData(data);
      }
    } catch {
      setPreviewData(null);
    }
  }, []);

  useEffect(() => {
    if (activeProject) {
      fetchPreviewStatus(activeProject);
    }
  }, [activeProject, fetchPreviewStatus]);

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

  // ── Fetch Models Detail & Catalog ──
  const fetchModelsDetail = useCallback(async () => {
    setModelsLoading(true);
    try {
      const [modelsRes, catalogRes] = await Promise.all([
        fetch(`${API}/api/models`),
        fetch(`${API}/api/models/library`)
      ]);
      if (modelsRes.ok) {
        const data = await modelsRes.json();
        setInstalledModelsDetail(data.models_detail || data.models || []);
        setOllamaRunning(data.ollama_running ?? false);
      }
      if (catalogRes.ok) {
        const data = await catalogRes.json();
        setModelsCatalog(data.catalog || []);
      }
    } catch (e) {
      console.error('Failed to fetch models:', e);
    } finally {
      setModelsLoading(false);
    }
  }, []);

  useEffect(() => { if (settingsSubTab === 'models') fetchModelsDetail(); }, [settingsSubTab, fetchModelsDetail]);

  // Instant client-side QR generator
  const generateClientQr = useCallback(async (targetUrl: string) => {
    try {
      const dataUrl = await QRCode.toDataURL(targetUrl, {
        margin: 2,
        width: 280,
        color: { dark: '#080D1A', light: '#FFFFFF' }
      });
      return dataUrl;
    } catch {
      return '';
    }
  }, []);

  const fetchMobileConnect = useCallback(async () => {
    // 1. Try fetching official LAN IP and instructions from backend
    try {
      const res = await fetch(`${API}/api/system/mobile-connect`);
      if (res.ok) {
        const data = await res.json();
        if (!data.qr_data_url && data.url) {
          data.qr_data_url = await generateClientQr(data.url);
        }
        setMobileConnect(data);
        return;
      }
    } catch { /* fallback below */ }

    // 2. Instant client-side fallback if backend is slow or offline
    const fallbackHost = typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost'
      ? window.location.hostname
      : '192.168.1.188';
    const fallbackUrl = `http://${fallbackHost}:3000`;
    const fallbackQr = await generateClientQr(fallbackUrl);
    setMobileConnect({
      status: 'online',
      lan_ip: fallbackHost,
      port: 3000,
      url: fallbackUrl,
      qr_data_url: fallbackQr,
      instructions: {
        ro: [
          "Conectează iPhone-ul sau iPad-ul la aceeași rețea Wi-Fi cu acest calculator.",
          "Deschide Camera foto de pe iPhone/iPad și scanează codul QR de mai sus (sau introdu link-ul în Safari).",
          "Apasă pe butonul de Partajare (Share - iconița cu pătrat și săgeată sus din Safari).",
          "Alege opțiunea 'Adaugă la ecranul principal' (Add to Home Screen).",
          "CoreForge se va deschide ca o aplicație nativă fără bara de adrese Safari, cu bară de navigare tactilă dedicată."
        ],
        en: [
          "Connect your iPhone or iPad to the same Wi-Fi network as this PC.",
          "Open your iPhone/iPad Camera and scan the QR code above (or type the link into Safari).",
          "Tap the Share icon (square with arrow pointing up) at the bottom of Safari.",
          "Select 'Add to Home Screen'.",
          "CoreForge will launch full-screen like a native iOS app without Safari navigation bars, equipped with a bottom touch tab bar."
        ]
      }
    });
  }, [generateClientQr]);

  useEffect(() => {
    fetchMobileConnect();
  }, [fetchMobileConnect]);

  useEffect(() => {
    if (tab === 'settings' || settingsSubTab === 'mobile') {
      fetchMobileConnect();
    }
  }, [tab, settingsSubTab, fetchMobileConnect]);

  const handleSelectInterface = async (ip: string) => {
    const newUrl = `http://${ip}:3000`;
    const newQr = await generateClientQr(newUrl);
    setMobileConnect(prev => prev ? { ...prev, lan_ip: ip, url: newUrl, qr_data_url: newQr } : null);
  };

  const handleCopyMobileUrl = () => {
    if (!mobileConnect?.url) return;
    navigator.clipboard.writeText(mobileConnect.url);
    setIsCopiedMobileUrl(true);
    addToast(
      lang === 'ro' ? 'Link Copiat' : 'Link Copied',
      mobileConnect.url,
      'info'
    );
    setTimeout(() => setIsCopiedMobileUrl(false), 2000);
  };

  const handleDeleteModel = async (modelName: string) => {
    setIsDeletingModel(true);
    try {
      const res = await fetch(`${API}/api/models/${encodeURIComponent(modelName)}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteConfirm(null);
        await fetchModelsDetail();
        await fetchAgentsAndModels();
      }
    } catch (e) {
      console.error('Delete model failed:', e);
    } finally {
      setIsDeletingModel(false);
    }
  };

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

  const handleUpdateSettings = async (updates: Partial<{ manager_provider: string; local_manager_model: string; gemini_api_key: string; moe_routing_enabled: boolean }>) => {
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

  const handleStartUpdateDownload = async () => {
    if (!updateInfo) return;
    setIsDownloadingUpdate(true);
    setUpdateActionMsg('Se inițiază descărcarea pachetului...');
    try {
      const res = await fetch(`${API}/api/system/update/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: updateInfo.latest_version })
      });
      if (res.ok) {
        const pollTimer = setInterval(async () => {
          try {
            const sRes = await fetch(`${API}/api/system/update/download-status`);
            if (sRes.ok) {
              const statusData = await sRes.json();
              setDownloadProgress(statusData);
              if (statusData.status === 'completed') {
                clearInterval(pollTimer);
                setIsDownloadingUpdate(false);
                setUpdateActionMsg('Pachet descărcat cu succes! Gata de instalare.');
              } else if (statusData.status === 'error') {
                clearInterval(pollTimer);
                setIsDownloadingUpdate(false);
                setUpdateActionMsg(`Eroare la descărcare: ${statusData.error}`);
              }
            }
          } catch {
            clearInterval(pollTimer);
            setIsDownloadingUpdate(false);
          }
        }, 500);
      } else {
        setIsDownloadingUpdate(false);
        setUpdateActionMsg('Nu s-a putut porni descărcarea.');
      }
    } catch (e: any) {
      setIsDownloadingUpdate(false);
      setUpdateActionMsg(`Eroare: ${e?.message || 'Eroare de conexiune'}`);
    }
  };

  const handleApplyUpdate = async () => {
    setIsApplyingUpdate(true);
    setUpdateActionMsg('Se lansează programul de instalare...');
    try {
      const res = await fetch(`${API}/api/system/update/install`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        if (typeof window !== 'undefined' && (window as any).nexusDesktop?.applyUpdate && downloadProgress.target_file) {
          (window as any).nexusDesktop.applyUpdate(downloadProgress.target_file);
        }
        setUpdateActionMsg('Instalatorul a fost lansat cu succes! Aplicația se va reporni.');
      } else {
        setUpdateActionMsg(`Eroare: ${data.detail || 'Nu s-a putut lansa instalatorul'}`);
        setIsApplyingUpdate(false);
      }
    } catch (e: any) {
      setUpdateActionMsg(`Eroare: ${e?.message || 'Eroare sistem'}`);
      setIsApplyingUpdate(false);
    }
  };

  const handleExportTokensCsv = () => {
    if (!tokenAnalytics?.recent_events || tokenAnalytics.recent_events.length === 0) {
      addToast('Analitice', 'Nu există evenimente de exportat.', 'info');
      return;
    }
    const headers = ['ID', 'Sursa', 'Sesiune/Job', 'Model', 'Prompt Tokens', 'Completion Tokens', 'Total Tokens', 'Durata (ms)', 'Data'];
    const rows = tokenAnalytics.recent_events.map((e: any) => [
      e.id,
      e.source,
      e.session_or_job_id,
      e.model,
      e.prompt_tokens,
      e.completion_tokens,
      e.total_tokens,
      e.duration_ms,
      e.timestamp
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coreforge_tokens_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    addToast('Raport CSV', 'Fișierul CSV a fost descărcat cu succes.', 'success');
  };

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
        setSaveStatus('saved'); addToast('Fișier Salvat', `Modificările au fost salvate pe disc`, 'success');
        setTimeout(() => setSaveStatus(null), 2500);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    }
  }, [activeProject, activeFile, files]);


  // ── Project Export & VS Code Launcher ──
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [isOpeningVsCode, setIsOpeningVsCode] = useState(false);
  const [vsCodeFeedback, setVsCodeFeedback] = useState<string | null>(null);

  const handleExportZip = async () => {
    if (!activeProject || isExportingZip) return;
    setIsExportingZip(true);
    try {
      const res = await fetch(`${API}/api/projects/${encodeURIComponent(activeProject)}/export-zip`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeProject}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url); addToast('Export Proiect', 'Arhiva ZIP a fost descărcată cu succes', 'success');
      }
    } catch (e) {
      console.error('Export zip failed', e);
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleOpenVsCode = async () => {
    if (!activeProject || isOpeningVsCode) return;
    setIsOpeningVsCode(true);
    try {
      const res = await fetch(`${API}/api/projects/${encodeURIComponent(activeProject)}/open-vscode`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setVsCodeFeedback(data.launcher === 'vscode' ? 'Deschis în VS Code' : 'Deschis în Explorer');
        setTimeout(() => setVsCodeFeedback(null), 3000);
      }
    } catch (e) {
      console.error('Open VS Code failed', e);
    } finally {
      setIsOpeningVsCode(false);
    }
  };

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
            addToast('CoreForge Swarm', 'Sarcina de generare a fost finalizată cu succes!', 'success');
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
            addToast('CoreForge Alert', `Execuția a eșuat: ${data.error || 'Necunoscut'}`, 'error');
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

  // ── Tabs Config (Bilingual) ──
  const tabs = useMemo(() => [
    { id: 'system', label: t.nav_system, icon: HardDrive },
    { id: 'chat', label: t.nav_command, icon: MessageSquare },
    { id: 'direct', label: t.nav_chat, icon: MessageCircle },
    { id: 'ide', label: t.nav_ide, icon: Code2 },
    { id: 'tokens', label: t.nav_analytics, icon: BarChart3 },
    { id: 'agents', label: t.nav_agents, icon: Layers },
    { id: 'dashboard', label: t.nav_telemetry, icon: Cpu },
    { id: 'database', label: t.nav_memory, icon: Database },
    { id: 'settings', label: t.nav_settings, icon: Sliders },
  ], [t]);

  // ── Local Chat Function with SSE Real-Time Streaming ──
  const handleLocalChat = async () => {
    if (!localPrompt.trim() || isLocalChatting || !selectedLocalModel || !activeSessionId) return;
    const userPrompt = localPrompt;
    const newMessages = [...localMessages, { role: 'user', content: userPrompt } as LocalMessage];
    setLocalMessages(newMessages);
    setLocalPrompt('');
    setIsLocalChatting(true);

    // Initial placeholder for assistant message
    const assistantIndex = newMessages.length;
    setLocalMessages([...newMessages, {
      role: 'assistant',
      content: '',
      model: selectedLocalModel
    }]);

    try {
      const response = await fetch(`${API}/api/chat/local/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: activeSessionId, prompt: userPrompt, model: selectedLocalModel })
      });

      if (!response.ok || !response.body) {
        throw new Error('Streaming failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.chunk) {
                streamedContent += data.chunk;
                setLocalMessages(prev => {
                  const updated = [...prev];
                  if (updated[assistantIndex]) {
                    updated[assistantIndex] = {
                      ...updated[assistantIndex],
                      content: streamedContent
                    };
                  }
                  return updated;
                });
                chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
              }
              if (data.done && data.tokens) {
                setLocalMessages(prev => {
                  const updated = [...prev];
                  if (updated[assistantIndex]) {
                    updated[assistantIndex] = {
                      ...updated[assistantIndex],
                      content: streamedContent,
                      prompt_tokens: data.tokens.prompt_tokens,
                      completion_tokens: data.tokens.completion_tokens,
                      total_tokens: data.tokens.total_tokens,
                      tok_per_sec: data.tokens.tok_per_sec,
                      duration_ms: data.tokens.duration_ms
                    };
                  }
                  return updated;
                });
                chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
              }
            } catch {
              // Ignore SSE json parse hiccups
            }
          }
        }
      }
      fetchLocalSessions();
    } catch (err) {
      console.error('Chat stream error:', err);
      setLocalMessages(prev => {
        const updated = [...prev];
        if (updated[assistantIndex] && !updated[assistantIndex].content) {
          updated[assistantIndex] = {
            ...updated[assistantIndex],
            content: `[Eroare conexiune la modelul ${selectedLocalModel}. Verificați că Ollama rulează local.]`
          };
        }
        return updated;
      });
    } finally {
      setIsLocalChatting(false);
    }
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
      <aside className="hidden md:flex w-64 border-r border-slate-800/80 bg-[#0B0F17]/70 backdrop-blur-xl flex-col shrink-0">
        <div className="p-5">
          <div className="flex items-center justify-between gap-2 mb-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center animate-breathing shrink-0">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold tracking-wider text-sm text-white">COREFORGE</h1>
                <p className="text-[10px] text-cyan-400 font-mono tracking-[0.25em]">LOCAL AI 2026</p>
              </div>
            </div>
            {/* Bilingual Switcher */}
            <div className="flex items-center gap-0.5 bg-[#05070B] p-1 rounded-lg border border-slate-800 shrink-0">
              <button
                onClick={() => switchLanguage('ro')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  lang === 'ro' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Română"
              >
                RO
              </button>
              <button
                onClick={() => switchLanguage('en')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  lang === 'en' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                }`}
                title="English"
              >
                EN
              </button>
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
        {/* ── Mobile Top Header Bar (< 768px) ── */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0B0F17]/90 backdrop-blur-xl border-b border-slate-800/80 shrink-0 z-30">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center animate-breathing shrink-0">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="font-bold tracking-wider text-xs text-white">COREFORGE</span>
              <span className="ml-1.5 text-[9px] text-cyan-400 font-mono px-1.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-800/50">v2.3</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bilingual Switcher */}
            <div className="flex items-center bg-[#05070B] p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => switchLanguage('ro')}
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition ${
                  lang === 'ro' ? 'bg-indigo-600 text-white' : 'text-slate-500'
                }`}
              >
                RO
              </button>
              <button
                onClick={() => switchLanguage('en')}
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition ${
                  lang === 'en' ? 'bg-indigo-600 text-white' : 'text-slate-500'
                }`}
              >
                EN
              </button>
            </div>

            {/* Live Status indicator */}
            <div className="flex items-center gap-1 text-[10px] text-slate-400 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800">
              <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: statusColors[sysStatus] }} />
              <span className="capitalize">{sysStatus}</span>
            </div>
          </div>
        </div>
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

                {/* Auto-Fix & Heal Code */}
                <button
                  onClick={handleAutoFix}
                  disabled={!activeProject || isAutoFixing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-600 hover:text-white transition text-xs font-medium border border-amber-500/30 disabled:opacity-50 cursor-pointer shadow-sm"
                  title="Auto-Fix & Heal: Repară erorile de sintaxă sau execuție în mod autonom cu LLM"
                >
                  {isAutoFixing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
                  <span>Auto-Fix & Heal</span>
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

                
                {/* Export ZIP */}
                <button
                  onClick={handleExportZip}
                  disabled={!activeProject || isExportingZip}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white transition text-xs font-medium border border-indigo-500/30 disabled:opacity-50 cursor-pointer shadow-sm"
                  title="Descarcă întregul proiect ca arhivă .ZIP"
                >
                  {isExportingZip ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  <span>Export .ZIP</span>
                </button>

                {/* Open in VS Code */}
                <button
                  onClick={handleOpenVsCode}
                  disabled={!activeProject || isOpeningVsCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/20 text-sky-300 hover:bg-sky-600 hover:text-white transition text-xs font-medium border border-sky-500/30 disabled:opacity-50 cursor-pointer shadow-sm"
                  title="Deschide folderul proiectului în Visual Studio Code"
                >
                  {isOpeningVsCode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Code2 className="h-3.5 w-3.5" />}
                  <span>{vsCodeFeedback || 'VS Code'}</span>
                </button>

                {/* Live Preview Mode Toggle */}
                <button
                  onClick={() => setEditorMode(editorMode === 'code' ? 'preview' : 'code')}
                  disabled={!activeProject}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                    editorMode === 'preview'
                      ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                      : 'bg-[#05070B] border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                  title="Comută între Editorul de Cod și Live Web App Preview"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>{editorMode === 'preview' ? 'Mod Cod' : 'Live Preview'}</span>
                </button>

                {/* Copilot FIM Toggle */}
                <button
                  onClick={() => setCopilotEnabled(!copilotEnabled)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                    copilotEnabled
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                      : 'bg-slate-800/40 text-slate-500 border-slate-700'
                  }`}
                  title="Copilot Local FIM: Tab-to-Complete în editor"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Copilot: {copilotEnabled ? 'ON' : 'OFF'}</span>
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

                  {/* RAG Semantic Code Search */}
                  {activeProject && (
                    <div className="mt-2 pt-2 border-t border-slate-800/60">
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={ragQuery}
                            onChange={e => handleRagSearch(e.target.value)}
                            placeholder="Caută semantic (RAG)..."
                            className="w-full bg-[#05070B] border border-slate-800 rounded-lg pl-7 pr-2 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
                          />
                          <Sparkles className="h-3.5 w-3.5 text-purple-400 absolute left-2 top-2" />
                          {isRagSearching && <Loader2 className="h-3 w-3 animate-spin text-purple-400 absolute right-2 top-2" />}
                        </div>
                        <button
                          onClick={handleRagIndex}
                          disabled={isRagIndexing || !activeProject}
                          title="Re-indexează fișierele în baza SQLite RAG"
                          className="p-1.5 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600 hover:text-white border border-purple-500/30 text-xs transition cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          {isRagIndexing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                        </button>
                      </div>

                      {ragToast && (
                        <div className="text-[10px] text-emerald-400 font-medium px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 mt-1.5">
                          {ragToast}
                        </div>
                      )}

                      {/* RAG Results dropdown */}
                      {ragResults.length > 0 && (
                        <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar border-t border-slate-800/60 mt-2 pt-1.5">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold px-1">
                            <span>Fragmente găsite ({ragResults.length})</span>
                            <button onClick={() => { setRagQuery(''); setRagResults([]); }} className="hover:text-slate-200">Închide</button>
                          </div>
                          {ragResults.map((r, idx) => (
                            <div
                              key={idx}
                              onClick={() => {
                                if (files[r.file_path] !== undefined) {
                                  handleSelectFile(r.file_path);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-[#05070B] hover:bg-purple-950/30 border border-slate-800 hover:border-purple-500/40 cursor-pointer transition text-left"
                            >
                              <div className="flex items-center justify-between text-[11px] font-mono text-purple-300">
                                <span className="truncate">{r.file_path}</span>
                                <span className="text-[9px] text-slate-500">L{r.line_start}-{r.line_end}</span>
                              </div>
                              {r.symbol_name && (
                                <div className="text-[10px] font-semibold text-emerald-400 truncate">
                                  ƒ {r.symbol_name}
                                </div>
                              )}
                              <pre className="text-[9px] text-slate-400 font-mono line-clamp-2 mt-0.5 whitespace-pre-wrap">
                                {r.snippet}
                              </pre>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
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

                {/* Monaco Editor OR Live Preview */}
                {editorMode === 'preview' ? (
                  <div className="flex-1 flex flex-col bg-[#07090E] overflow-hidden">
                    {/* Preview Top Control Bar */}
                    <div className="h-11 bg-[#0B0F17] border-b border-slate-800 px-4 flex items-center justify-between gap-4 shrink-0">
                      {/* Viewport switcher */}
                      <div className="flex items-center gap-1 bg-[#05070B] p-1 rounded-lg border border-slate-800">
                        <button
                          onClick={() => setPreviewViewport('desktop')}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                            previewViewport === 'desktop'
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                          title="Desktop Viewport (100%)"
                        >
                          <Monitor className="h-3.5 w-3.5" />
                          <span>Desktop</span>
                        </button>
                        <button
                          onClick={() => setPreviewViewport('tablet')}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                            previewViewport === 'tablet'
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                          title="Tablet Viewport (768px)"
                        >
                          <Server className="h-3.5 w-3.5" />
                          <span>Tablet</span>
                        </button>
                        <button
                          onClick={() => setPreviewViewport('mobile')}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                            previewViewport === 'mobile'
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                          title="Mobile Viewport (375px)"
                        >
                          <Zap className="h-3.5 w-3.5" />
                          <span>Mobile</span>
                        </button>
                      </div>

                      {/* URL / Framework Address Bar */}
                      <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#05070B] border border-slate-800 text-xs font-mono text-slate-300 overflow-hidden">
                        <span className="text-emerald-400 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 shrink-0">
                          {previewData?.framework || 'Web App'}
                        </span>
                        <span className="truncate text-slate-400">
                          {previewData?.preview_url ? `${API}${previewData.preview_url}` : 'Niciun preview activ'}
                        </span>
                      </div>

                      {/* Action Controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setPreviewKey(k => k + 1)}
                          title="Reîncarcă Preview"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                        {previewData?.preview_url && (
                          <a
                            href={`${API}${previewData.preview_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Deschide în tab nou"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Responsive Iframe Container */}
                    <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#05070B]/90">
                      <div
                        className={`h-full transition-all duration-300 rounded-xl overflow-hidden border border-slate-800 shadow-[0_10px_35px_rgba(0,0,0,0.8)] bg-white ${
                          previewViewport === 'mobile'
                            ? 'w-[375px] max-h-[720px]'
                            : previewViewport === 'tablet'
                            ? 'w-[768px] max-h-[900px]'
                            : 'w-full'
                        }`}
                      >
                        {previewData?.preview_url ? (
                          <iframe
                            key={previewKey}
                            src={`${API}${previewData.preview_url}`}
                            className="w-full h-full border-0 bg-white"
                            title="Live App Preview"
                            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-[#0A0E17] text-slate-400 p-6 text-center">
                            <Monitor className="h-12 w-12 text-slate-600 mb-3" />
                            <h3 className="text-sm font-semibold text-slate-200">Nu a fost detectat un fișier HTML principal sau server pornit</h3>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm">
                              Generați o aplicație web din Agent Command sau rulați containerul pentru a previzualiza interfața live.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 relative min-h-0">
                    {activeFile && files[activeFile] !== undefined ? (
                      <Editor
                        height="100%"
                        theme="vs-dark"
                        language={getLanguage(activeFile)}
                        value={files[activeFile]}
                        onMount={(editor, monaco) => {
                          if ((window as any).__coreforge_copilot_registered) return;
                          (window as any).__coreforge_copilot_registered = true;

                          const supportedLanguages = ['python', 'javascript', 'typescript', 'html', 'css', 'json', 'shell', 'sql'];
                          supportedLanguages.forEach(lang => {
                            monaco.languages.registerInlineCompletionsProvider(lang, {
                              provideInlineCompletions: async (model: any, position: any) => {
                                if (!copilotEnabled) return { items: [] };

                                const textBefore = model.getValueInRange({
                                  startLineNumber: Math.max(1, position.lineNumber - 50),
                                  startColumn: 1,
                                  endLineNumber: position.lineNumber,
                                  endColumn: position.column
                                });
                                const textAfter = model.getValueInRange({
                                  startLineNumber: position.lineNumber,
                                  startColumn: position.column,
                                  endLineNumber: Math.min(model.getLineCount(), position.lineNumber + 20),
                                  endColumn: 1000
                                });

                                if (!textBefore.trim()) return { items: [] };

                                try {
                                  const res = await fetch(`${API}/api/editor/autocomplete`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      code_prefix: textBefore,
                                      code_suffix: textAfter,
                                      file_path: activeFile || '',
                                      language: lang
                                    })
                                  });
                                  if (!res.ok) return { items: [] };
                                  const data = await res.json();
                                  if (!data.completion || !data.completion.trim()) return { items: [] };

                                  return {
                                    items: [{
                                      insertText: data.completion,
                                      range: new monaco.Range(
                                        position.lineNumber,
                                        position.column,
                                        position.lineNumber,
                                        position.column
                                      )
                                    }]
                                  };
                                } catch {
                                  return { items: [] };
                                }
                              },
                              freeInlineCompletions: () => {}
                            });
                          });
                        }}
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
                          inlineSuggest: { enabled: true }
                        }}
                      />
                    ) : (
                      <div className="flex-1 h-full flex flex-col items-center justify-center text-slate-600 select-none">
                        <FileCode className="h-16 w-16 text-slate-800 mb-3" />
                        <p className="text-sm font-medium text-slate-400">Select a file from the explorer to view and edit</p>
                        <p className="text-xs text-slate-600 mt-1">Files save directly to disk with Ctrl+S • Press Tab to accept Copilot completions</p>
                      </div>
                    )}
                  </div>
                )}

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
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pb-24 md:pb-8">

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

                    {/* MoE Dynamic Local Routing Toggle Card */}
                    <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-start justify-between flex-wrap gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 mt-0.5">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-purple-300">Rutare Dinamică Multi-Model MoE Locală</span>
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-mono">
                              {appSettings.moe_routing_enabled !== false ? 'Activ (Auto-Tier)' : 'Dezactivat'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                            Alocă modele optime per rol: Arhitectură/Planificare (<b>llama3.1 8B</b>), Codare/Sinteză (<b>qwen2.5-coder 7.6B</b>), QA/Validare (<b>mistral 7.2B</b>).
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleUpdateSettings({ moe_routing_enabled: !(appSettings.moe_routing_enabled !== false) })}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-2 border ${
                          appSettings.moe_routing_enabled !== false
                            ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        }`}
                      >
                        <Zap className="h-3.5 w-3.5" />
                        <span>{appSettings.moe_routing_enabled !== false ? 'MoE Activ (Recomandat)' : 'Activează MoE'}</span>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2.5 mb-1">
                    <BrainCircuit className="h-5 w-5 text-indigo-400" />
                    Agent Customization Hub
                  </h2>
                  <p className="text-sm text-slate-500">Configurează echipa autonomă de agenți și abilitățile active</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => { setShowTemplatesModal(true); fetchAgentTemplates(); }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 text-indigo-300 rounded-lg text-xs font-semibold transition border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)] cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    <span>Șabloane Echipe (1-Click)</span>
                  </button>
                  <button onClick={() => setEditingAgent({ name: '', role: '', goal: '', backstory: '', model: models[0] || 'llama3', temperature: 0.6, is_active: 1, tools: [] })}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-lg text-xs font-semibold transition border border-indigo-500/20 cursor-pointer">
                    <Plus className="h-3.5 w-3.5" />
                    <span>Agent Nou</span>
                  </button>
                </div>
              </div>

              {/* Sub-tab Switcher: Squad vs Skills Marketplace */}
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
                <button
                  onClick={() => setAgentHubSubTab('squad')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    agentHubSubTab === 'squad'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <UserX className="h-3.5 w-3.5" />
                  <span>Echipa Activă ({agents.length})</span>
                </button>
                <button
                  onClick={() => setAgentHubSubTab('skills')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    agentHubSubTab === 'skills'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Wrench className="h-3.5 w-3.5" />
                  <span>Skills & Tools Marketplace ({availableTools.length})</span>
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

              {agentHubSubTab === 'skills' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-cyan-400" />
                      Abilitățile activate sunt injectate automat în agenții care au nevoie de ele în timpul execuției CrewAI.
                    </span>
                    <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      {availableTools.filter(t => t.is_enabled !== false).length} Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableTools.map(t => {
                      const active = t.is_enabled !== false;
                      return (
                        <div
                          key={t.id}
                          className={`p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 ${
                            active
                              ? 'bg-slate-900/80 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.06)]'
                              : 'bg-slate-950/40 border-slate-800/80 opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-2 rounded-lg ${active ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-slate-800 text-slate-500'}`}>
                                <Wrench className="h-4 w-4" />
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-white flex items-center gap-2">
                                  {t.name}
                                  {t.badge && (
                                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                      {t.badge}
                                    </span>
                                  )}
                                </h4>
                                <span className="text-[10px] font-mono text-slate-400">{t.category || 'General'}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleToggleTool(t.id)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                active ? 'bg-cyan-500' : 'bg-slate-800'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                  active ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed pl-10">{t.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {agentHubSubTab === 'squad' && (
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
              )}
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
                        {msg.content ? (
                          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                            {msg.content}
                            {isLocalChatting && i === localMessages.length - 1 && (
                              <span className="inline-block w-2 h-4 bg-fuchsia-400 animate-pulse ml-1 align-middle rounded-sm shadow-[0_0_8px_#e879f9]" />
                            )}
                          </pre>
                        ) : isLocalChatting && i === localMessages.length - 1 ? (
                          <div className="flex items-center gap-2 text-xs text-fuchsia-300 animate-pulse py-1">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-fuchsia-400" />
                            <span>Conectare la flux SSE & calcul tokeni în timp real...</span>
                          </div>
                        ) : null}

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
                <div ref={chatBottomRef} />
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
                    onClick={handleExportTokensCsv}
                    title="Exportă raport detaliat în format CSV"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-400 text-xs font-medium rounded-xl border border-emerald-500/30 transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export CSV</span>
                  </button>

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

          {/* ═══ TAB: SETTINGS & UPDATES (iOS / macOS Inspired) ═══ */}
          {tab === 'settings' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up pb-10">
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-6 border border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10">
                    <Sliders className="h-6 w-6 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                      Panou Configurare & Setări
                      <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        v{CURRENT_APP_VERSION}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Personalizează mediul de lucru, parametrii AI și gestionează actualizările sistemului
                    </p>
                  </div>
                </div>

                {/* Sub-tabs Navigation */}
                <div className="flex bg-[#05070B] p-1 rounded-xl border border-slate-800/80 gap-1 self-start sm:self-auto overflow-x-auto">
                  <button
                    onClick={() => setSettingsSubTab('update')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      settingsSubTab === 'update'
                        ? 'bg-cyan-500 text-black font-semibold shadow-md shadow-cyan-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ArrowUpCircle className="h-3.5 w-3.5" />
                    Actualizare Software
                  </button>
                  <button
                    onClick={() => setSettingsSubTab('general')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      settingsSubTab === 'general'
                        ? 'bg-cyan-500 text-black font-semibold shadow-md shadow-cyan-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    General & Rețea
                  </button>
                  <button
                    onClick={() => setSettingsSubTab('mobile')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      settingsSubTab === 'mobile'
                        ? 'bg-cyan-500 text-black font-semibold shadow-md shadow-cyan-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    {t.settings_sub_mobile}
                  </button>
                  <button
                    onClick={() => setSettingsSubTab('ai')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      settingsSubTab === 'ai'
                        ? 'bg-cyan-500 text-black font-semibold shadow-md shadow-cyan-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <BrainCircuit className="h-3.5 w-3.5" />
                    Inteligență AI & Modele
                  </button>
                  <button
                    onClick={() => setSettingsSubTab('models')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      settingsSubTab === 'models'
                        ? 'bg-cyan-500 text-black font-semibold shadow-md shadow-cyan-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Package className="h-3.5 w-3.5" />
                    Modele AI
                  </button>
                  <button
                    onClick={() => setSettingsSubTab('sandbox')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      settingsSubTab === 'sandbox'
                        ? 'bg-cyan-500 text-black font-semibold shadow-md shadow-cyan-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Sandbox & Securitate
                  </button>
                </div>
              </div>

              {/* ════ SUB-TAB 1: ACTUALIZARE SOFTWARE (Stil iPhone / iOS) ════ */}
              {settingsSubTab === 'update' && (
                <div className="space-y-6">
                  {/* Central Apple-Style Update Showcase Card */}
                  <div className="glass-panel-elevated rounded-3xl p-8 border border-slate-800 text-center relative overflow-hidden">
                    {/* Background Radial Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

                    {/* App Icon Container */}
                    <div className="relative inline-block mb-4">
                      <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-[#0B0F17] via-[#131B2A] to-[#1E293B] border border-cyan-500/30 flex items-center justify-center shadow-2xl shadow-cyan-500/20 mx-auto">
                        <Zap className="h-12 w-12 text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]" />
                      </div>
                      <div className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-300 font-bold">
                        v{CURRENT_APP_VERSION}
                      </div>
                    </div>

                    <h3 className="text-2xl font-bold text-white tracking-tight mb-1">
                      CoreForge 2026
                    </h3>
                    <p className="text-xs text-slate-400 mb-6 font-mono">
                      Build Oficial • 100% Local Multi-Agent Orchestrator
                    </p>

                    {/* Status Display */}
                    {updateInfo?.update_available ? (
                      /* Actualizare Nouă Disponibilă (iOS Style) */
                      <div className="max-w-xl mx-auto space-y-5 text-left bg-slate-900/80 border border-amber-500/30 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
                            <div>
                              <h4 className="text-sm font-semibold text-white">
                                CoreForge v{updateInfo.latest_version}
                              </h4>
                              <p className="text-xs text-slate-400">
                                {updateInfo.release_name || 'Actualizare nouă de sistem'}
                              </p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-semibold">
                            Disponibil acum
                          </span>
                        </div>

                        {/* Release Notes Preview */}
                        {updateInfo.release_notes && (
                          <div className="bg-[#05070B] rounded-xl p-4 border border-slate-800 text-xs text-slate-300 max-h-48 overflow-y-auto leading-relaxed whitespace-pre-wrap font-sans">
                            {updateInfo.release_notes}
                          </div>
                        )}

                        {/* Download Progress Bar (When Downloading) */}
                        {downloadProgress.status === 'downloading' && (
                          <div className="space-y-2 bg-[#05070B] p-4 rounded-xl border border-cyan-500/30">
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Se descarcă pachetul...
                              </span>
                              <span className="text-white font-bold">{downloadProgress.percent}%</span>
                            </div>
                            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5">
                              <div
                                className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-300 shadow-lg shadow-cyan-500/50"
                                style={{ width: `${downloadProgress.percent}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[11px] text-slate-400">
                              <span>{downloadProgress.downloaded_mb} MB / {downloadProgress.total_mb} MB</span>
                              <span className="text-cyan-300 font-mono">{downloadProgress.speed_mbps} MB/s</span>
                            </div>
                          </div>
                        )}

                        {/* Status / Error feedback */}
                        {updateActionMsg && (
                          <p className="text-xs text-center text-cyan-300 font-medium">
                            {updateActionMsg}
                          </p>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          {downloadProgress.status !== 'completed' ? (
                            <button
                              onClick={handleStartUpdateDownload}
                              disabled={isDownloadingUpdate}
                              className="flex-1 py-3 px-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-semibold rounded-xl text-xs transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                              {isDownloadingUpdate ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin text-black" />
                                  Se descarcă...
                                </>
                              ) : (
                                <>
                                  <Download className="h-4 w-4 text-black" />
                                  Descarcă și Instalează (1-Click)
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={handleApplyUpdate}
                              disabled={isApplyingUpdate}
                              className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 animate-pulse"
                            >
                              <CheckCircle2 className="h-4 w-4 text-black" />
                              {isApplyingUpdate ? 'Se lansează...' : 'Instalează și Repornește Acum'}
                            </button>
                          )}

                          <a
                            href={updateInfo.releases_url || 'https://github.com/andrei-morar/CoreForge/releases'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-xs border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>GitHub Releases</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    ) : (
                      /* Sistem la zi (Apple Green Check) */
                      <div className="max-w-md mx-auto space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          CoreForge este actualizat la zi
                        </div>
                        <p className="text-xs text-slate-400">
                          Versiunea v{CURRENT_APP_VERSION} este cea mai nouă versiune oficială disponibilă pe canalul stabil.
                        </p>
                        <div className="pt-2">
                          <button
                            onClick={handleCheckUpdates}
                            disabled={isCheckingUpdate}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${isCheckingUpdate ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
                            {isCheckingUpdate ? 'Se verifică GitHub...' : 'Caută Actualizări'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* iOS Settings Options Cards */}
                    <div className="mt-8 pt-6 border-t border-slate-800/80 max-w-xl mx-auto text-left space-y-3">
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
                        <div>
                          <div className="text-xs font-semibold text-white">Actualizări Automate</div>
                          <div className="text-[11px] text-slate-500">Verifică periodic versiuni noi în fundal</div>
                        </div>
                        <button
                          onClick={() => setAutoCheckUpdates(!autoCheckUpdates)}
                          className={`w-11 h-6 rounded-full p-1 transition cursor-pointer flex items-center ${
                            autoCheckUpdates ? 'bg-cyan-500 justify-end' : 'bg-slate-800 justify-start'
                          }`}
                        >
                          <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
                        <div>
                          <div className="text-xs font-semibold text-white">Canal de Lansare</div>
                          <div className="text-[11px] text-slate-500">Alege tipul de build-uri descărcate</div>
                        </div>
                        <select className="bg-[#05070B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-cyan-400 font-medium focus:outline-none">
                          <option value="stable">Stabil (Recomandat)</option>
                          <option value="beta">Beta / Canary</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

                            {/* ════ SUB-TAB: CONECTARE IPHONE & IPAD (PWA QR) ════ */}
              {settingsSubTab === 'mobile' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="glass-panel-elevated rounded-2xl p-6 border border-slate-800 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {t.mobile_pwa_badge}
                          </span>
                          <span className="text-xs font-mono text-slate-500">Wi-Fi LAN Connect</span>
                        </div>
                        <h3 className="text-lg font-bold text-white mt-1.5 flex items-center gap-2">
                          <Smartphone className="h-5 w-5 text-cyan-400" />
                          {t.mobile_card_title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                          {t.mobile_card_subtitle}
                        </p>
                      </div>
                      <button
                        onClick={fetchMobileConnect}
                        className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition border border-slate-700 cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Re-scan LAN IP
                      </button>
                    </div>

                    {/* QR Code and Quick Connect Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                      {/* Left: QR Display */}
                      <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-900/60 rounded-2xl border border-slate-800/90 text-center">
                        <div className="text-xs font-semibold text-slate-300 mb-4 flex items-center gap-2">
                          <QrCode className="h-4 w-4 text-cyan-400" />
                          {t.mobile_qr_label}
                        </div>

                        {mobileConnect?.qr_data_url ? (
                          <div className="p-3 bg-white rounded-2xl shadow-xl shadow-cyan-500/10 border-2 border-cyan-400/40 inline-block transition hover:scale-105 duration-300">
                            <img
                              src={mobileConnect.qr_data_url}
                              alt="CoreForge QR Code"
                              className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-52 h-52 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-slate-500">
                            <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-2" />
                            <span className="text-xs font-mono">Generare QR Code...</span>
                          </div>
                        )}

                        {/* Network Adapter Switcher (Wi-Fi vs LAN vs USB) */}
                        {mobileConnect?.interfaces && mobileConnect.interfaces.length > 1 && (
                          <div className="w-full mt-4 space-y-1.5 text-left">
                            <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                              <span>Adaptor de Rețea Activ:</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {mobileConnect.interfaces.map(iface => (
                                <button
                                  key={iface.interface}
                                  type="button"
                                  onClick={() => handleSelectInterface(iface.ip)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition flex items-center gap-1 cursor-pointer border ${
                                    mobileConnect.lan_ip === iface.ip
                                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                                  }`}
                                >
                                  <span>{iface.is_wifi ? '📶' : '🔌'}</span>
                                  <span>{iface.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Direct URL & Copy Button */}
                        <div className="w-full mt-5 space-y-2">
                          <div className="text-[11px] text-slate-400 font-medium text-left flex items-center justify-between">
                            <span>{t.mobile_lan_url}:</span>
                            <span className="text-[10px] font-mono text-cyan-400">LAN IP: {mobileConnect?.lan_ip || 'Detectare...'}</span>
                          </div>
                          <div className="flex items-center gap-2 bg-[#05070B] p-2 rounded-xl border border-slate-800">
                            <input
                              type="text"
                              readOnly
                              value={mobileConnect?.url || (typeof window !== 'undefined' ? `http://${window.location.hostname}:3000` : 'http://192.168.1.77:3000')}
                              className="flex-1 bg-transparent text-xs font-mono text-cyan-300 focus:outline-none px-2 select-all"
                            />
                            <button
                              onClick={handleCopyMobileUrl}
                              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold flex items-center gap-1 transition cursor-pointer shrink-0"
                            >
                              {isCopiedMobileUrl ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                              <span>{isCopiedMobileUrl ? t.mobile_copied : t.mobile_copy_url}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right: Step-by-Step Safari PWA Guide */}
                      <div className="lg:col-span-7 space-y-4">
                        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                          <Share2 className="h-4 w-4 text-indigo-400" />
                          Ghid de Instalare pe iPhone & iPad (Fără App Store)
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
                            <div className="h-7 w-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center shrink-0">
                              1
                            </div>
                            <div className="text-xs text-slate-300 leading-relaxed">
                              <span className="font-semibold text-white block mb-0.5">Rețea Wi-Fi Comună</span>
                              {t.mobile_step1}
                            </div>
                          </div>

                          <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
                            <div className="h-7 w-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center shrink-0">
                              2
                            </div>
                            <div className="text-xs text-slate-300 leading-relaxed">
                              <span className="font-semibold text-white block mb-0.5">Scanare Cameră Foto</span>
                              {t.mobile_step2}
                            </div>
                          </div>

                          <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                              3
                            </div>
                            <div className="text-xs text-slate-300 leading-relaxed">
                              <span className="font-semibold text-white block mb-0.5">Butonul Partajare (Share)</span>
                              {t.mobile_step3}
                            </div>
                          </div>

                          <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                              4
                            </div>
                            <div className="text-xs text-slate-300 leading-relaxed">
                              <span className="font-semibold text-emerald-300 block mb-0.5">Adaugă la ecranul principal</span>
                              {t.mobile_step4}
                            </div>
                          </div>
                        </div>

                        {/* Feature Badges */}
                        <div className="pt-2 grid grid-cols-3 gap-2 text-center">
                          <div className="p-2.5 rounded-xl bg-[#05070B] border border-slate-800">
                            <div className="text-xs font-semibold text-white">Full Screen</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">Fără bare Safari</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[#05070B] border border-slate-800">
                            <div className="text-xs font-semibold text-white">Bottom Tab Bar</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">Navigare tactilă iOS</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[#05070B] border border-slate-800">
                            <div className="text-xs font-semibold text-white">0 Setup / Cablu</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">Direct prin Wi-Fi</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
              )}

              {/* ════ SUB-TAB 2: GENERAL & REȚEA ════ */}
              {settingsSubTab === 'general' && (
                <div className="glass-panel-elevated rounded-2xl p-6 border border-slate-800 space-y-6">
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-cyan-400" />
                    Preferințe Generale & Interfață
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Temă Vizuală */}
                                        {/* Conectare iPhone / iPad shortcut */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/30 to-indigo-950/30 border border-cyan-500/20 flex items-center justify-between col-span-1 md:col-span-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                          <Smartphone className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white">Conectare iPhone & iPad (Safari PWA)</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Scanează codul QR pentru acces instantaneu de pe telefon sau tabletă prin Wi-Fi.
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSettingsSubTab('mobile')}
                        className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span>Afișează QR Code</span>
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                      <div className="text-xs font-semibold text-slate-200">Temă Grafică Aplicație</div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'cyberpunk', name: 'Cyberpunk Neon' },
                          { id: 'slate', name: 'Obsidian Slate' },
                          { id: 'midnight', name: 'Midnight Blue' }
                        ].map(t => (
                          <button
                            key={t.id}
                            onClick={() => setActiveTheme(t.id)}
                            className={`p-2.5 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
                              activeTheme === t.id
                                ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
                                : 'bg-[#05070B] border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Notificări Desktop */}
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-200">Notificări Native Desktop</div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Alertează când un roi de agenți termină codul
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setDesktopNotifsEnabled(!desktopNotifsEnabled);
                          notifyUser('CoreForge 2026', 'Notificările native sunt acum active!');
                        }}
                        className={`w-11 h-6 rounded-full p-1 transition cursor-pointer flex items-center ${
                          desktopNotifsEnabled ? 'bg-cyan-500 justify-end' : 'bg-slate-800 justify-start'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                      </button>
                    </div>
                  </div>

                  {/* Porturi Rețea */}
                                      {/* Conectare iPhone / iPad shortcut */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/30 to-indigo-950/30 border border-cyan-500/20 flex items-center justify-between col-span-1 md:col-span-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                          <Smartphone className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white">Conectare iPhone & iPad (Safari PWA)</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Scanează codul QR pentru acces instantaneu de pe telefon sau tabletă prin Wi-Fi.
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSettingsSubTab('mobile')}
                        className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span>Afișează QR Code</span>
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                    <div className="text-xs font-semibold text-slate-200">Diagnosticare Porturi & Servicii Active</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-lg bg-[#05070B] border border-slate-800 flex items-center justify-between">
                        <span className="text-slate-400">FastAPI Backend</span>
                        <span className="text-cyan-400 font-bold">:8000</span>
                      </div>
                      <div className="p-3 rounded-lg bg-[#05070B] border border-slate-800 flex items-center justify-between">
                        <span className="text-slate-400">Web Dashboard</span>
                        <span className="text-indigo-400 font-bold">:3000</span>
                      </div>
                      <div className="p-3 rounded-lg bg-[#05070B] border border-slate-800 flex items-center justify-between">
                        <span className="text-slate-400">Ollama Local</span>
                        <span className="text-emerald-400 font-bold">:11434</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ════ SUB-TAB 3: INTELIGENȚĂ AI & MODELE ════ */}
              {settingsSubTab === 'ai' && (
                <div className="glass-panel-elevated rounded-2xl p-6 border border-slate-800 space-y-6">
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4 text-cyan-400" />
                    Configurare Modele & Parametri de Inferență
                  </h3>

                  <div className="space-y-4">
                    {/* Model Local Implicit */}
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <label className="text-xs font-semibold text-slate-200 block">
                        Model Local Implicit (Manager Swarm & Direct Chat)
                      </label>
                      <select
                        value={appSettings.local_manager_model}
                        onChange={(e) => handleUpdateSettings({ local_manager_model: e.target.value })}
                        className="w-full bg-[#05070B] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                      >
                        {models.length > 0 ? (
                          models.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))
                        ) : (
                          <option value="qwen2.5-coder:latest">qwen2.5-coder:latest (Recomandat)</option>
                        )}
                      </select>
                      <p className="text-[11px] text-slate-500">
                        Modelele instalate sunt preluate direct din instanța ta locală de Ollama.
                      </p>
                    </div>

                    {/* Temperatură Generare Cod */}
                                        {/* Conectare iPhone / iPad shortcut */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/30 to-indigo-950/30 border border-cyan-500/20 flex items-center justify-between col-span-1 md:col-span-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                          <Smartphone className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white">Conectare iPhone & iPad (Safari PWA)</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Scanează codul QR pentru acces instantaneu de pe telefon sau tabletă prin Wi-Fi.
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSettingsSubTab('mobile')}
                        className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span>Afișează QR Code</span>
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-slate-200">
                          Temperatură Cod (Creativitate vs Determinism)
                        </label>
                        <span className="text-xs font-mono text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                          {aiTemperature.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={aiTemperature}
                        onChange={(e) => setAiTemperature(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>0.0 (Strict & Riguros)</span>
                        <span>0.5 (Echilibrat)</span>
                        <span>1.0 (Creativ)</span>
                      </div>
                    </div>

                    {/* Comutator Rutare MoE */}
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-200">Rutare Ierarhică MoE (Mixture of Experts)</div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Deleagă sarcinile atomice către specialiști efemeri în funcție de complexitate
                        </div>
                      </div>
                      <button
                        onClick={() => handleUpdateSettings({ moe_routing_enabled: !(appSettings.moe_routing_enabled !== false) })}
                        className={`w-11 h-6 rounded-full p-1 transition cursor-pointer flex items-center ${
                          appSettings.moe_routing_enabled ? 'bg-cyan-500 justify-end' : 'bg-slate-800 justify-start'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ════ SUB-TAB: MANAGER MODELE AI ════ */}
              {settingsSubTab === 'models' && (
                <div className="space-y-6">
                  {/* Ollama Status Card */}
                  <div className="glass-panel-elevated rounded-2xl p-5 border border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-white flex items-center gap-2">
                        <Package className="h-4 w-4 text-cyan-400" />
                        Manager Modele AI Locale
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                          ollamaRunning
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${ollamaRunning ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                          {ollamaRunning ? 'Ollama Activ' : 'Ollama Oprit'}
                        </div>
                        <button
                          onClick={fetchModelsDetail}
                          className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-white transition cursor-pointer"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${modelsLoading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-center">
                        <div className="text-2xl font-bold text-cyan-400 tabular-nums">{installedModelsDetail.length}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Modele Instalate</div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-center">
                        <div className="text-2xl font-bold text-purple-400 tabular-nums">
                          {installedModelsDetail.reduce((acc, m) => acc + (m.size_gb || 0), 0).toFixed(1)} GB
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Spațiu Total Ocupat</div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-center">
                        <div className="text-2xl font-bold text-amber-400 tabular-nums">
                          {modelsCatalog.filter(c => !c.is_installed).length}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Disponibile pt Download</div>
                      </div>
                    </div>
                  </div>

                  {/* Installed Models List */}
                  <div className="glass-panel-elevated rounded-2xl p-5 border border-slate-800">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                      <HardDrive className="h-4 w-4 text-cyan-400" />
                      Modele Instalate Local
                    </h3>
                    {installedModelsDetail.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-sm">
                        {ollamaRunning ? 'Niciun model instalat. Descarcă unul din catalogul de mai jos.' : 'Ollama nu rulează. Pornește Ollama pentru a vedea modelele.'}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {installedModelsDetail.map((m) => (
                          <div key={m.name} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/60 hover:border-slate-700/80 transition group">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                                <BrainCircuit className="h-4 w-4 text-cyan-400" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-white truncate flex items-center gap-2">
                                  {m.name}
                                  {appSettings.local_manager_model === m.name && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">ACTIV</span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                  <span>{m.family}</span>
                                  {m.parameter_size && <><span className="text-slate-700">•</span><span>{m.parameter_size}</span></>}
                                  {m.quantization && <><span className="text-slate-700">•</span><span>{m.quantization}</span></>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5 flex-shrink-0">
                              <span className="text-xs font-mono text-slate-400 px-2 py-1 rounded bg-slate-800/80">{m.size_gb} GB</span>
                              {deleteConfirm === m.name ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleDeleteModel(m.name)}
                                    disabled={isDeletingModel}
                                    className="px-2.5 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold hover:bg-red-500/30 transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                  >
                                    {isDeletingModel ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                    Confirmă
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(m.name)}
                                  className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer opacity-0 group-hover:opacity-100"
                                  title="Șterge modelul"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Install Custom Model */}
                  <div className="glass-panel-elevated rounded-2xl p-5 border border-slate-800">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                      <Download className="h-4 w-4 text-cyan-400" />
                      Instalare Model Custom
                    </h3>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Introdu numele oricărui model din registrul Ollama (ex: <code className="text-cyan-400">llama3.2:1b</code>, <code className="text-cyan-400">codellama:13b</code>, <code className="text-cyan-400">wizardcoder:7b</code>).
                      Lista completă: <a href="https://ollama.com/library" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">ollama.com/library</a>
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customModelName}
                        onChange={(e) => setCustomModelName(e.target.value)}
                        placeholder="ex: gemma2:2b"
                        className="flex-1 bg-[#05070B] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && customModelName.trim()) {
                            handlePullModel(customModelName.trim());
                            setCustomModelName('');
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (customModelName.trim()) {
                            handlePullModel(customModelName.trim());
                            setCustomModelName('');
                          }
                        }}
                        disabled={!customModelName.trim() || pullStatus.status === 'pulling'}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-white text-xs font-bold disabled:opacity-40 cursor-pointer hover:opacity-90 transition flex items-center gap-1.5"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Descarcă
                      </button>
                    </div>

                    {/* Active Pull Progress */}
                    {pullStatus.status !== 'idle' && pullStatus.status !== 'completed' && pullStatus.status !== 'failed' && (
                      <div className="mt-4 p-3.5 rounded-xl bg-slate-900/70 border border-cyan-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-white font-semibold flex items-center gap-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                            Se descarcă: {pullStatus.model}
                          </span>
                          <span className="text-xs text-cyan-400 font-mono font-bold">{pullStatus.percent}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-300"
                            style={{ width: `${pullStatus.percent}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1.5">{pullStatus.status}</div>
                      </div>
                    )}
                    {pullStatus.status === 'completed' && (
                      <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Model descărcat cu succes! Lista de modele a fost actualizată.
                      </div>
                    )}
                    {pullStatus.status === 'failed' && (
                      <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        Eroare la descărcare: {pullStatus.error}
                      </div>
                    )}
                  </div>

                  {/* GGUF Import Section */}
                  <div className="glass-panel-elevated rounded-2xl p-5 border border-purple-500/25 bg-gradient-to-b from-purple-950/15 via-slate-900/40 to-slate-950/60 shadow-lg space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                        <HardDrive className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">Import Direct Fișiere GGUF (HuggingFace / Local)</h3>
                        <p className="text-xs text-slate-400">Transformă orice fișier .gguf descărcat într-un model Ollama nativ fără linii de comandă</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Nume Model în CoreForge</label>
                        <input
                          type="text"
                          placeholder="ex: deepseek-custom-8b"
                          value={ggufModelName}
                          onChange={e => setGgufModelName(e.target.value)}
                          className="w-full bg-[#05070B] border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Calea către fișierul .gguf</label>
                        <input
                          type="text"
                          placeholder="ex: /home/user/Downloads/model.gguf"
                          value={ggufFilePath}
                          onChange={e => setGgufFilePath(e.target.value)}
                          className="w-full bg-[#05070B] border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleImportGguf}
                      disabled={!ggufModelName.trim() || !ggufFilePath.trim() || isImportingGguf}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold disabled:opacity-40 cursor-pointer transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      {isImportingGguf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-amber-300" />}
                      <span>{isImportingGguf ? 'Se configurează modelul în Ollama...' : 'Creează Model în Ollama (1-Click)'}</span>
                    </button>
                  </div>

                  {/* Catalog of Available Models */}
                  <div className="glass-panel-elevated rounded-2xl p-5 border border-slate-800">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                      <Sparkles className="h-4 w-4 text-cyan-400" />
                      Catalog Modele Recomandate
                    </h3>
                    <div className="grid gap-3">
                      {modelsCatalog.map((m) => (
                        <div key={m.id} className={`p-4 rounded-xl border transition ${
                          m.is_installed
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'bg-slate-900/50 border-slate-800/60 hover:border-slate-700/80'
                        }`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-white">{m.name}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">{m.tag}</span>
                                {m.is_installed && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-bold">✓ Instalat</span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mb-2">{m.description}</p>
                              <div className="flex items-center gap-3 text-[11px]">
                                <span className="text-slate-400">{m.size_gb} GB</span>
                                <span className="text-slate-700">•</span>
                                <span className="text-slate-400">{m.recommended_for}</span>
                                <span className="text-slate-700">•</span>
                                <span className={`font-bold ${
                                  m.badge_color === 'emerald' ? 'text-emerald-400' :
                                  m.badge_color === 'amber' ? 'text-amber-400' :
                                  m.badge_color === 'blue' ? 'text-blue-400' : 'text-rose-400'
                                }`}>
                                  {m.compatibility_percent}% OK
                                </span>
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              {m.is_installed ? (
                                <button
                                  onClick={() => handleUpdateSettings({ local_manager_model: m.id })}
                                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                    appSettings.local_manager_model === m.id
                                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                      : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700'
                                  }`}
                                >
                                  {appSettings.local_manager_model === m.id ? '✓ Activ' : 'Setează Activ'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handlePullModel(m.id)}
                                  disabled={pullStatus.status === 'pulling'}
                                  className="px-3 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 text-white text-xs font-bold disabled:opacity-40 cursor-pointer hover:opacity-90 transition flex items-center gap-1.5"
                                >
                                  <Download className="h-3 w-3" />
                                  Descarcă
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ════ SUB-TAB 4: SANDBOX & SECURITATE ════ */}
              {settingsSubTab === 'sandbox' && (
                <div className="glass-panel-elevated rounded-2xl p-6 border border-slate-800 space-y-6">
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Shield className="h-4 w-4 text-cyan-400" />
                    Izolare Docker & Politici de Securitate
                  </h3>

                  <div className="space-y-4">
                    {/* Timeout Containere */}
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <label className="text-xs font-semibold text-slate-200 block">
                        Timp Maxim de Așteptare Inițializare Sandbox (secunde)
                      </label>
                      <select
                        value={sandboxTimeoutSec}
                        onChange={(e) => setSandboxTimeoutSec(e.target.value)}
                        className="w-full bg-[#05070B] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                      >
                        <option value="10">10 secunde (Rapid)</option>
                        <option value="15">15 secunde (Recomandat)</option>
                        <option value="30">30 secunde (Aplicații mari)</option>
                        <option value="60">60 secunde (Build complex)</option>
                      </select>
                      <p className="text-[11px] text-slate-500">
                        Dacă aplicația lansată este un server web continuu, CoreForge îl va lăsa să ruleze în fundal pentru Live Preview.
                      </p>
                    </div>

                    {/* Politică Auto-Fix */}
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-200">Auto-Fix Inteligent Activ</div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Corectează automat fișierele dacă containerul Docker detectează erori de sintaxă sau dependențe
                        </div>
                      </div>
                      <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                        Activat
                      </div>
                    </div>
                  </div>
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
            {/* ── Mobile iOS Bottom Tab Bar (< 768px) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B0F17]/95 backdrop-blur-2xl border-t border-slate-800/80 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] flex items-center justify-around shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
        {/* Tab 1: System */}
        <button
          onClick={() => { setTab('system'); setShowMobileMoreSheet(false); }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            tab === 'system' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <HardDrive className={`h-5 w-5 ${tab === 'system' ? 'stroke-[2.5px] scale-110 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'stroke-[1.75px]'}`} />
          <span className="text-[10px] font-medium">{t.nav_system}</span>
        </button>

        {/* Tab 2: Direct Chat */}
        <button
          onClick={() => { setTab('direct'); setShowMobileMoreSheet(false); }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            tab === 'direct' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageCircle className={`h-5 w-5 ${tab === 'direct' ? 'stroke-[2.5px] scale-110 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'stroke-[1.75px]'}`} />
          <span className="text-[10px] font-medium">{t.nav_chat}</span>
        </button>

        {/* Tab 3: Agents */}
        <button
          onClick={() => { setTab('agents'); setShowMobileMoreSheet(false); }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            tab === 'agents' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className={`h-5 w-5 ${tab === 'agents' ? 'stroke-[2.5px] scale-110 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'stroke-[1.75px]'}`} />
          <span className="text-[10px] font-medium">{t.nav_agents}</span>
        </button>

        {/* Tab 4: Settings */}
        <button
          onClick={() => { setTab('settings'); setShowMobileMoreSheet(false); }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            tab === 'settings' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className={`h-5 w-5 ${tab === 'settings' ? 'stroke-[2.5px] scale-110 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'stroke-[1.75px]'}`} />
          <span className="text-[10px] font-medium">{t.nav_settings}</span>
        </button>

        {/* Tab 5: More / Meniu */}
        <button
          onClick={() => setShowMobileMoreSheet(!showMobileMoreSheet)}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            showMobileMoreSheet || ['chat', 'ide', 'tokens', 'dashboard', 'database'].includes(tab)
              ? 'text-cyan-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MoreHorizontal className={`h-5 w-5 ${showMobileMoreSheet ? 'scale-110 stroke-[2.5px]' : 'stroke-[1.75px]'}`} />
          <span className="text-[10px] font-medium">{lang === 'ro' ? 'Meniu' : 'More'}</span>
        </button>
      </nav>

      {/* ── Mobile 'More' Drawer / Sheet ── */}
      {showMobileMoreSheet && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0D121F] border-t border-slate-700/80 rounded-t-3xl p-5 shadow-2xl space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-sm font-semibold text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-cyan-400" />
                {lang === 'ro' ? 'Navigare Toate Secțiunile' : 'All Sections Navigation'}
              </span>
              <button
                onClick={() => setShowMobileMoreSheet(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {tabs.map((tItem) => {
                const isSelected = tab === tItem.id;
                const IconComponent = tItem.icon;
                return (
                  <button
                    key={tItem.id}
                    onClick={() => {
                      setTab(tItem.id);
                      setShowMobileMoreSheet(false);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                        : 'bg-slate-900/80 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <IconComponent className="h-5 w-5 mb-1.5" />
                    <span className="text-[11px] font-medium leading-tight line-clamp-1">{tItem.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      </main>

      {/* ── Squad Templates Modal ── */}
      {showTemplatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-3xl rounded-2xl bg-[#080D1A] border border-indigo-500/40 p-6 shadow-[0_0_50px_rgba(99,102,241,0.2)] max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Șabloane Profesionale de Echipe AI</h3>
                  <p className="text-xs text-slate-400">Configurează instantaneu rolurile, uneltele și modelele pentru un anumit domeniu</p>
                </div>
              </div>
              <button
                onClick={() => setShowTemplatesModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 mt-5">
              {agentTemplates.map(tmpl => (
                <div
                  key={tmpl.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-white">{tmpl.name}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {tmpl.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{tmpl.description}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {tmpl.agents.map(a => (
                        <span key={a.name} className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60">
                          {a.role}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleApplyTemplate(tmpl.id)}
                    disabled={isApplyingTemplate === tmpl.id}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isApplyingTemplate === tmpl.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                    <span>Aplică Echipa (1-Click)</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Global Floating Toasts Container ── */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 left-4 md:left-auto z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-auto md:w-full">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
              t.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200 shadow-emerald-950/50'
                : t.type === 'error'
                ? 'bg-red-950/90 border-red-500/40 text-red-200 shadow-red-950/50'
                : t.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/40 text-amber-200 shadow-amber-950/50'
                : 'bg-slate-900/90 border-cyan-500/40 text-cyan-200 shadow-cyan-950/50'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {t.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
              {t.type === 'error' && <XCircle className="h-5 w-5 text-red-400" />}
              {t.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-400" />}
              {t.type === 'info' && <Sparkles className="h-5 w-5 text-cyan-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white tracking-wide">{t.title}</div>
              <div className="text-[11px] opacity-80 mt-0.5 leading-relaxed">{t.message}</div>
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              className="text-slate-400 hover:text-white transition shrink-0 p-0.5 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
