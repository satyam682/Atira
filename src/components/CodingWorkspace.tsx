import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Check, Plus, Clock, Trash2, ChevronDown, ChevronUp, 
  Search, PanelLeftClose, PanelLeft, FileText, Sliders, 
  HelpCircle, MessageSquare, ArrowRight, Mic, Sparkles, LogOut,
  Settings, Key, BarChart3, Plug, Shield, Terminal, Loader2,
  Download, Clipboard, Folder, FileCode, Copy, Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import SpikeMark from './SpikeMark';
import { Message, ModelOption, HistoryItem } from '../types';

interface CodingWorkspaceProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onClearChat: () => void;
  selectedModel: ModelOption;
  setSelectedModel: (model: ModelOption) => void;
  workspaceMode: 'chat' | 'coding' | 'cowork';
  setWorkspaceMode: (mode: 'chat' | 'coding' | 'cowork') => void;
  historyItems: any[];
  onSelectHistoryItem: (item: any) => void;
  onDeleteHistoryItem: (id: string) => void;
  currentUser: any;
  credits: number;
  showToast: (msg: string, type?: 'info' | 'success') => void;
}

interface AiraSession {
  id: string;
  user_email: string;
  title: string;
  active_repo: string;
  selected_model: string;
  created_at: string;
  updated_at: string;
}

interface AiraMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model_used?: string;
  metadata?: any;
  created_at: string;
}

interface AiraArtifact {
  id: string;
  session_id: string;
  file_path: string;
  content: string;
  status: 'CREATED' | 'MODIFIED' | 'PENDING';
  created_at: string;
  updated_at: string;
}

interface AiraMemory {
  id: string;
  user_email: string;
  repo_name: string;
  memory_key: string;
  memory_value: string;
  created_at: string;
  updated_at: string;
}

interface AiraTask {
  id: string;
  session_id: string;
  task_name: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  logs: string;
  created_at: string;
  updated_at: string;
}

export default function CodingWorkspace({
  messages: initialMessages,
  isLoading: initialIsLoading,
  onSendMessage,
  onClearChat,
  selectedModel,
  setSelectedModel,
  workspaceMode,
  setWorkspaceMode,
  historyItems,
  onSelectHistoryItem,
  onDeleteHistoryItem,
  currentUser,
  credits,
  showToast
}: CodingWorkspaceProps) {
  const [inputText, setInputText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showArtifactsPanel, setShowArtifactsPanel] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showMemoryModal, setShowMemoryModal] = useState(false);

  // AIRA Cognitive states loaded from Supabase DB tables
  const [sessions, setSessions] = useState<AiraSession[]>([]);
  const [activeSession, setActiveSession] = useState<AiraSession | null>(null);
  const [messages, setMessages] = useState<AiraMessage[]>([]);
  const [artifacts, setArtifacts] = useState<AiraArtifact[]>([]);
  const [tasks, setTasks] = useState<AiraTask[]>([]);
  const [memories, setMemories] = useState<AiraMemory[]>([]);
  const [isCognitiveLoading, setIsCognitiveLoading] = useState(false);

  // New Memory Rule inputs
  const [newRuleKey, setNewRuleKey] = useState('');
  const [newRuleVal, setNewRuleVal] = useState('');

  // Terminal run log steps simulation
  const [activeSteps, setActiveSteps] = useState<Array<{ name: string; log: string }>>([]);

  // Session inline editing states
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState<string>('');

  // Plan-first and Code Preview Panel states
  const [lastPlan, setLastPlan] = useState<any | null>(null);
  const [activePreview, setActivePreview] = useState<any | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string>('');
  const [copiedFilePath, setCopiedFilePath] = useState<string | null>(null);
  const [copiedRunInstructions, setCopiedRunInstructions] = useState<boolean>(false);

  // ==========================================
  // "TEST CODE" SUB-SECTION STATES & HELPERS
  // ==========================================
  const [codingSubTab, setCodingSubTab] = useState<'generator' | 'testcode'>('generator');
  const [testCodeMode, setTestCodeMode] = useState<'paste' | 'github'>('paste');
  const [pastedCode, setPastedCode] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [githubBranch, setGithubBranch] = useState('');
  const [githubToken, setGithubToken] = useState(() => {
    return localStorage.getItem('nx_github_token') || '';
  });
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [githubFiles, setGithubFiles] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isFetchingFiles, setIsFetchingFiles] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisProgressMsg, setAnalysisProgressMsg] = useState('');
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  
  // Tabs within report result preview panel
  const [reportSubTab, setReportSubTab] = useState<'summary' | 'issues' | 'cross_file' | 'test_cases'>('summary');
  const [activeIssueIndex, setActiveIssueIndex] = useState<number>(0);

  // Helper to securely persist and sync github token
  const handleSaveGithubToken = (val: string) => {
    setGithubToken(val);
    localStorage.setItem('nx_github_token', val);
  };

  // Helper to find the last test_report in messages
  const findLastTestReport = (msgsList: AiraMessage[]) => {
    for (let i = msgsList.length - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse(msgsList[i].content);
        if (parsed && parsed.type === 'test_report') {
          return parsed;
        }
      } catch (e) {
        if (msgsList[i].metadata?.parsedResponse?.type === 'test_report') {
          return msgsList[i].metadata.parsedResponse;
        }
      }
    }
    return null;
  };

  const handleFetchGithubFiles = async () => {
    if (!githubRepo.trim()) {
      showToast('Please enter a repository (owner/repo).', 'info');
      return;
    }
    if (githubRepo.split('/').length !== 2) {
      showToast('Repository must be formatted as "owner/repo".', 'info');
      return;
    }

    setIsFetchingFiles(true);
    setGithubFiles([]);
    setSelectedFiles([]);

    try {
      const res = await fetch('/api/testcode/github-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: githubRepo,
          branch: githubBranch,
          token: githubToken
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch repository details.');
      }

      const data = await res.json();
      if (data.branch) {
        setGithubBranch(data.branch);
      }
      setGithubFiles(data.files || []);
      // Check all files by default
      setSelectedFiles((data.files || []).map((f: any) => f.path));
      showToast(`Found ${data.files?.length || 0} matching source files!`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error loading repository files.', 'info');
    } finally {
      setIsFetchingFiles(false);
    }
  };

  const handleRunCodeAnalysis = async () => {
    if (testCodeMode === 'paste' && !pastedCode.trim()) {
      showToast('Please paste some code to analyze.', 'info');
      return;
    }
    if (testCodeMode === 'github') {
      if (!githubRepo.trim()) {
        showToast('Please enter a GitHub repository path.', 'info');
        return;
      }
      if (selectedFiles.length === 0) {
        showToast('Please select at least one file to analyze.', 'info');
        return;
      }
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisProgressMsg('Initializing analysis pipeline...');
    setAnalysisResult(null);

    try {
      const response = await fetch('/api/testcode/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: testCodeMode,
          code: pastedCode,
          repo: githubRepo,
          branch: githubBranch,
          token: githubToken,
          files: selectedFiles,
          user_email: currentUser?.email
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pipeline error: ${errorText || response.statusText}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported by response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(trimmedLine.substring(6));
              
              if (eventData.status === 'progress') {
                setAnalysisProgress(eventData.progress);
                setAnalysisProgressMsg(eventData.message);
              } else if (eventData.status === 'completed') {
                setAnalysisProgress(100);
                setAnalysisProgressMsg('Report ready! Opening Preview...');
                setAnalysisResult(eventData.report);
                handleOpenPreviewPanel(eventData.report);
                showToast('Code analysis report generated!', 'success');

                // Save report to active session history
                if (activeSession) {
                  const title = `[Test Code] ${githubRepo || 'Pasted Code'} Report`;
                  try {
                    await fetch(`/api/aira/sessions/${activeSession.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ title })
                    });
                    setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, title } : s));
                  } catch (e) {}

                  const userMsgId = crypto.randomUUID();
                  const userMsgObj = {
                    id: userMsgId,
                    session_id: activeSession.id,
                    role: 'user' as const,
                    content: testCodeMode === 'paste' ? 'Pasted code analysis.' : `GitHub analysis on ${githubRepo}`,
                    created_at: new Date().toISOString()
                  };

                  const asstMsgId = crypto.randomUUID();
                  const asstMsgObj = {
                    id: asstMsgId,
                    session_id: activeSession.id,
                    role: 'assistant' as const,
                    content: JSON.stringify(eventData.report),
                    model_used: 'gemini-2.5-flash',
                    created_at: new Date().toISOString()
                  };

                  try {
                    await fetch(`/api/aira/sessions/${activeSession.id}/messages`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(userMsgObj)
                    });
                    await fetch(`/api/aira/sessions/${activeSession.id}/messages`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(asstMsgObj)
                    });
                    setMessages(prev => [...prev, userMsgObj, asstMsgObj]);
                  } catch (e) {
                    console.error('Failed saving message history:', e);
                  }
                }
              } else if (eventData.status === 'error') {
                throw new Error(eventData.message);
              }
            } catch (err) {
              console.error('Error parsing SSE line:', err);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setAnalysisProgressMsg(`Analysis failed: ${err.message || err}`);
      showToast(err.message || 'Analysis failed. Please try again.', 'info');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadReportMD = (report: any) => {
    if (!report) return;
    try {
      const issuesMarkdown = Array.isArray(report.issues)
        ? report.issues.map((issue: any, idx: number) => `
### Issue ${idx + 1}: ${issue.title} [Severity: ${issue.severity.toUpperCase()} | Category: ${issue.category.toUpperCase()}]
- **File**: \`${issue.file_path}\` (Line ${issue.line_number})
- **Description**: ${issue.description}
- **Remediation**: ${issue.remediation}
${issue.original_code ? `
#### Original Code
\`\`\`
${issue.original_code}
\`\`\`
` : ''}
${issue.fixed_code ? `
#### Fixed Code Recommendation
\`\`\`
${issue.fixed_code}
\`\`\`
` : ''}
`).join('\n')
        : 'No specific issues listed.';

      const crossFileMarkdown = Array.isArray(report.cross_file_issues)
        ? report.cross_file_issues.map((cf: any) => `
- **${cf.title}**
  - *Impact*: ${cf.impact}
  - *Description*: ${cf.description}
  - *Remediation*: ${cf.remediation}
`).join('\n')
        : 'No cross-file architectural issues detected.';

      const testCasesMarkdown = Array.isArray(report.test_cases)
        ? report.test_cases.map((tc: any) => `
### Test Case: ${tc.name}
- **Type**: ${tc.type.toUpperCase()}
- **File Target**: \`${tc.file_path}\`
- **Description**: ${tc.description}
- **Code Template**:
\`\`\`
${tc.code_template}
\`\`\`
`).join('\n')
        : 'No test cases generated.';

      const mdText = `# ${report.title || 'Code Analysis Report'}
Rating: **${report.overall_rating || 'N/A'}**

## Summary
${report.summary || 'No summary available.'}

## Metrics
- Total Analyzed Files: ${report.metrics?.total_files || 0}
- Total Line Count: ${report.metrics?.total_lines || 0}
- Detected Issues: ${report.metrics?.total_issues || 0} (Critical: ${report.metrics?.critical_count || 0}, Warning: ${report.metrics?.warning_count || 0}, Info: ${report.metrics?.info_count || 0})

## Code Issues Detected
${issuesMarkdown}

## Cross-File Architectural Patterns
${crossFileMarkdown}

## Test Cases Generated
${testCasesMarkdown}

---
Generated by AIRA.AI "Test Code" Suite.
`;

      const blob = new Blob([mdText], { type: 'text/markdown;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `code-analysis-report.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Report downloaded as Markdown!', 'success');
    } catch (e: any) {
      console.error(e);
      showToast('Download failed.', 'info');
    }
  };

  const handleDownloadTestCasesZip = async (report: any) => {
    if (!report || !Array.isArray(report.test_cases) || report.test_cases.length === 0) {
      showToast('No test cases to download.', 'info');
      return;
    }
    try {
      showToast('Building test-suite ZIP...', 'info');
      const zip = new JSZip();
      report.test_cases.forEach((tc: any) => {
        const ext = tc.file_path ? (tc.file_path.split('.').length > 1 ? '.' + tc.file_path.split('.').pop() : '.ts') : '.ts';
        const baseName = tc.name.toLowerCase().replace(/\s+/g, '_');
        const testFileName = `tests/${baseName}.test${ext}`;
        zip.file(testFileName, tc.code_template || `// ${tc.description}`);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test-suite-templates.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Test cases downloaded as ZIP!', 'success');
    } catch (e: any) {
      console.error(e);
      showToast('Failed to build test suite ZIP.', 'info');
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper to find the last plan in messages
  const findLastPlan = (msgsList: AiraMessage[]) => {
    for (let i = msgsList.length - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse(msgsList[i].content);
        if (parsed && parsed.type === 'plan') {
          return parsed;
        }
      } catch (e) {
        if (msgsList[i].metadata?.parsedResponse?.type === 'plan') {
          return msgsList[i].metadata.parsedResponse;
        }
      }
    }
    return null;
  };

  // Helper to copy code file content
  const handleCopyCode = (text: string, path: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFilePath(path);
    setTimeout(() => setCopiedFilePath(null), 2000);
    showToast('Copied code to clipboard!', 'success');
  };

  // Helper to copy run instructions
  const handleCopyRunInstructions = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRunInstructions(true);
    setTimeout(() => setCopiedRunInstructions(false), 2000);
    showToast('Copied run instructions!', 'success');
  };

  // Helper to open preview panel
  const handleOpenPreviewPanel = (parsedObj: any) => {
    setActivePreview(parsedObj);
    if (parsedObj.type === 'code' && Array.isArray(parsedObj.files) && parsedObj.files.length > 0) {
      setSelectedFilePath(parsedObj.files[0].path);
    }
  };

  // Helper to generate & download ZIP client-side
  const handleDownloadZip = async (codeProject: any) => {
    if (!codeProject || !Array.isArray(codeProject.files)) {
      showToast('No files to bundle.', 'info');
      return;
    }

    try {
      showToast('Generating ZIP file in browser...', 'info');
      const zip = new JSZip();

      for (const f of codeProject.files) {
        if (f.path && f.content) {
          zip.file(f.path, f.content);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${codeProject.project_name || 'project'}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('ZIP downloaded successfully!', 'success');
    } catch (err: any) {
      console.error('Failed to generate ZIP:', err);
      showToast('Failed to generate ZIP.', 'info');
    }
  };

  // Helper to convert plan to markdown and download
  const handleDownloadPlanMD = (planProject: any) => {
    if (!planProject) return;
    
    try {
      const mdContent = `# ${planProject.title || 'Build Plan'}

## Summary
${planProject.summary || ''}

## How It Works
${planProject.how_it_works || ''}

## Features Included
${Array.isArray(planProject.features) ? planProject.features.map(f => `- ${f}`).join('\n') : ''}

## Inputs Required
${Array.isArray(planProject.inputs) ? planProject.inputs.map(i => `- ${i}`).join('\n') : ''}

## Outputs Produced
${Array.isArray(planProject.outputs) ? planProject.outputs.map(o => `- ${o}`).join('\n') : ''}

## Tech Stack
${Array.isArray(planProject.tech_stack) ? planProject.tech_stack.map(t => `- ${t}`).join('\n') : ''}

## File Structure
${Array.isArray(planProject.file_structure) ? planProject.file_structure.map(fs => `- **${fs.path}**: ${fs.purpose}`).join('\n') : ''}

## Build Steps
${Array.isArray(planProject.build_steps) ? planProject.build_steps.map((bs, i) => `${i + 1}. ${bs}`).join('\n') : ''}

---
Generated by AIRA.AI Build-Plan Engine.
`;

      const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(planProject.title || 'build-plan').toLowerCase().replace(/\s+/g, '-')}-plan.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Markdown plan downloaded successfully!', 'success');
    } catch (err: any) {
      console.error('Failed to download plan MD:', err);
      showToast('Failed to download plan MD.', 'info');
    }
  };
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser?.email && 
    ['satyamkadavla79@gmail.com', 'satyamkadavla19@gmail.com', 'aryansomani9@gmail.com'].includes(currentUser.email.toLowerCase());

  // Get user name from email
  const getUserName = () => {
    if (currentUser?.email) {
      const parts = currentUser.email.split('@')[0];
      // Clean numbers/special characters for display name
      const cleanName = parts.replace(/[0-9_.-]+/g, ' ');
      return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    }
    return 'aryan';
  };

  // Get initials for profile avatar
  const getInitials = () => {
    const name = getUserName();
    return name.substring(0, 2).toUpperCase();
  };

  // Load coding sessions on mount and user email changes
  const fetchSessions = async () => {
    if (!currentUser?.email) return;
    try {
      const res = await fetch(`/api/aira/sessions?email=${encodeURIComponent(currentUser.email)}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        if (data.length > 0 && !activeSession) {
          handleSelectSession(data[0]);
        } else if (data.length === 0) {
          // Trigger automatic creation of a default session
          handleCreateNewSession();
        }
      }
    } catch (err) {
      console.error('Failed to fetch coding sessions:', err);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [currentUser?.email]);

  // Load details for the selected active session (messages, artifacts, tasks)
  const fetchSessionDetails = async (sessionId: string) => {
    try {
      // 1. Messages
      const resMsgs = await fetch(`/api/aira/sessions/${sessionId}/messages`);
      if (resMsgs.ok) {
        const msgs = await resMsgs.json();
        setMessages(msgs);
        const lPlan = findLastPlan(msgs);
        setLastPlan(lPlan);

        const lReport = findLastTestReport(msgs);
        if (lReport) {
          setAnalysisResult(lReport);
          setCodingSubTab('testcode');
        } else {
          setAnalysisResult(null);
        }
      }

      // 2. Artifacts
      const resArts = await fetch(`/api/aira/sessions/${sessionId}/artifacts`);
      if (resArts.ok) {
        const arts = await resArts.json();
        setArtifacts(arts);
      }

      // 3. Tasks
      const resTasks = await fetch(`/api/aira/sessions/${sessionId}/tasks`);
      if (resTasks.ok) {
        const t = await resTasks.json();
        setTasks(t);
      }
    } catch (err) {
      console.error('Failed fetching session details:', err);
    }
  };

  // Load agent memories (CLAUDE.md project rules)
  const fetchMemories = async () => {
    if (!currentUser?.email) return;
    try {
      const res = await fetch(`/api/aira/memory?email=${encodeURIComponent(currentUser.email)}`);
      if (res.ok) {
        const data = await res.json();
        setMemories(data);
      }
    } catch (err) {
      console.error('Failed loading memory records:', err);
    }
  };

  useEffect(() => {
    if (showMemoryModal) {
      fetchMemories();
    }
  }, [showMemoryModal, currentUser?.email]);

  // Handle switching active coding session
  const handleSelectSession = (session: AiraSession) => {
    setActiveSession(session);
    fetchSessionDetails(session.id);
    showToast(`Loaded coding session: ${session.title}`, 'info');
  };

  // Handle creating a brand new session
  const handleCreateNewSession = async () => {
    if (!currentUser?.email) return;
    try {
      const res = await fetch('/api/aira/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: currentUser.email,
          title: `Coding Session ${new Date().toLocaleDateString()}`,
          selected_model: selectedModel.id
        })
      });
      if (res.ok) {
        const newSess = await res.json();
        setSessions(prev => [newSess, ...prev]);
        setActiveSession(newSess);
        setMessages([]);
        setArtifacts([]);
        setTasks([]);
        showToast('Created new coding session!', 'success');
      }
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  // Handle deleting a session
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/aira/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        if (activeSession?.id === sessionId) {
          setActiveSession(null);
          setMessages([]);
          setArtifacts([]);
          setTasks([]);
        }
        showToast('Deleted coding session.', 'info');
      }
    } catch (err) {
      console.error('Failed deleting session:', err);
    }
  };

  // Handle renaming a session
  const handleRenameSession = async (sessionId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      setEditingSessionId(null);
      return;
    }
    try {
      const res = await fetch(`/api/aira/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() })
      });
      if (res.ok) {
        const updatedSess = await res.json();
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: updatedSess.title } : s));
        if (activeSession?.id === sessionId) {
          setActiveSession(prev => prev ? { ...prev, title: updatedSess.title } : null);
        }
        showToast('Renamed coding session successfully!', 'success');
      } else {
        showToast('Failed to rename session.', 'info');
      }
    } catch (err) {
      console.error('Failed renaming session:', err);
    } finally {
      setEditingSessionId(null);
    }
  };

  // Save new memory rule to agent memory table
  const handleSaveMemoryRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleKey.trim() || !newRuleVal.trim() || !currentUser?.email) return;

    try {
      const res = await fetch('/api/aira/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: currentUser.email,
          memory_key: newRuleKey.trim(),
          memory_value: newRuleVal.trim()
        })
      });
      if (res.ok) {
        const saved = await res.json();
        setMemories(prev => {
          const idx = prev.findIndex(m => m.memory_key === saved.memory_key);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = saved;
            return copy;
          }
          return [...prev, saved];
        });
        setNewRuleKey('');
        setNewRuleVal('');
        showToast('Successfully added project rule to memory!', 'success');
      }
    } catch (err) {
      console.error('Failed to save memory rule:', err);
    }
  };

  // Dispatch message execution to the AIRA cognitive router
  const handleSendCognitiveMessage = async (customText?: string) => {
    const userText = (customText || inputText).trim();
    if (!userText || !activeSession || !currentUser?.email || isCognitiveLoading) return;

    if (!customText) {
      setInputText('');
    }
    setIsCognitiveLoading(true);

    // Append user message locally instantly
    const optimisticUserMsg: AiraMessage = {
      id: `opt-u-${Date.now()}`,
      session_id: activeSession.id,
      role: 'user',
      content: userText,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticUserMsg]);

    // Simulate terminal-style loading steps to match Claude Code
    setActiveSteps([
      { name: 'Workspace Analysis', log: 'Analyzing code structure & reading repository context...' }
    ]);

    setTimeout(() => {
      setActiveSteps(prev => [
        ...prev,
        { name: 'Memory Syncer', log: 'Synthesizing Aira memory logs and applying custom rules...' }
      ]);
    }, 1000);

    setTimeout(() => {
      setActiveSteps(prev => [
        ...prev,
        { name: 'Cognitive Engine Dispatch', log: 'Routing request to backend reasoning gateway...' }
      ]);
    }, 2200);

    try {
      const res = await fetch('/api/aira/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: activeSession.id,
          user_email: currentUser.email,
          content: userText,
          model: selectedModel.id,
          last_plan: lastPlan
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Replace optimistic messages and add both user message and assistant response
        setMessages(prev => {
          const filtered = prev.filter(m => !m.id.startsWith('opt-'));
          const finalMsgs = [...filtered];
          if (data.userMessage) {
            finalMsgs.push(data.userMessage);
          } else {
            // Fallback: keep a copy of the user message if not sent back by server
            finalMsgs.push(optimisticUserMsg);
          }
          if (data.message) {
            finalMsgs.push(data.message);
          }
          return finalMsgs;
        });

        // Resolve lastPlan from the message
        try {
          if (data.message) {
            const parsed = JSON.parse(data.message.content);
            if (parsed && parsed.type === 'plan') {
              setLastPlan(parsed);
            }
          }
        } catch (e) {
          if (data.message?.metadata?.parsedResponse?.type === 'plan') {
            setLastPlan(data.message.metadata.parsedResponse);
          }
        }

        // Add newly generated/modified artifacts
        if (data.artifacts && data.artifacts.length > 0) {
          setArtifacts(prev => {
            const copy = [...prev];
            data.artifacts.forEach((newArt: any) => {
              const existingIdx = copy.findIndex(a => a.file_path === newArt.file_path);
              if (existingIdx >= 0) {
                copy[existingIdx] = { ...copy[existingIdx], ...newArt };
              } else {
                copy.unshift(newArt);
              }
            });
            return copy;
          });
          showToast(`Generated ${data.artifacts.length} new code artifact(s)!`, 'success');
        }

        // Add background subagent tasks
        if (data.tasks && data.tasks.length > 0) {
          setTasks(prev => [...data.tasks, ...prev]);
        }

        showToast('Cognitive response synchronized successfully!', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Server error');
      }
    } catch (err: any) {
      console.error('Failed to run cognitive dispatcher:', err);
      // Append fallback error message
      const errorMsg: AiraMessage = {
        id: `err-${Date.now()}`,
        session_id: activeSession.id,
        role: 'assistant',
        content: `⚠️ **Aira.Ai Error**: Failed to dispatch cognitive request.\n\n*Details: ${err.message || err}*`,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsCognitiveLoading(false);
      setActiveSteps([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendCognitiveMessage();
    }
  };

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeSteps]);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close sidebar by default on mobile
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  return (
    <div className="flex h-screen w-screen bg-[#FBFBFA] font-sans antialiased text-gray-800 overflow-hidden relative">
      
      {/* Sidebar - styled exactly like Claude Code sidebar */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <>
            {/* Backdrop for mobile devices */}
            <div 
              className="md:hidden fixed inset-0 bg-black/40 z-20"
              onClick={() => setIsSidebarOpen(false)}
            />
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="fixed md:relative inset-y-0 left-0 h-full border-r border-[#E5E4E0] bg-[#FAF9F6] flex flex-col shrink-0 overflow-hidden z-30 shadow-xl md:shadow-none"
            >
            {/* Header: Brand and Toolbar */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-[#E5E4E0]/60">
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg font-bold text-primary tracking-tight">AIRA.AI</span>
                <span className="bg-[#EAE6E1] text-gray-600 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#DCD8D2]">
                  Workspace
                </span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 hover:bg-[#EAE8E3] rounded-lg text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="w-4.5 h-4.5" />
                </button>
                <button 
                  onClick={() => showToast('Search active sessions...', 'info')}
                  className="p-1.5 hover:bg-[#EAE8E3] rounded-lg text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                  title="Search sessions"
                >
                  <Search className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Navigation links */}
            <div className="p-3 space-y-1.5 border-b border-[#E5E4E0]/50">
              <button
                onClick={() => {
                  setWorkspaceMode('chat');
                  showToast('Returned to Dashboard', 'info');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 bg-primary/10 hover:bg-primary/15 border border-primary/20 rounded-xl text-xs font-bold text-primary transition-all text-left cursor-pointer animate-pulse"
              >
                <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Dashboard</span>
              </button>

              <button
                onClick={handleCreateNewSession}
                className="w-full flex items-center gap-2.5 px-3 py-2 bg-white hover:bg-white/85 border border-[#E5E4E0] rounded-xl text-xs font-semibold text-gray-800 shadow-sm transition-all text-left cursor-pointer hover:border-gray-300"
              >
                <Plus className="w-4 h-4 text-gray-600" />
                <span>New coding session</span>
              </button>

              <button
                onClick={() => setShowArtifactsPanel(!showArtifactsPanel)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                  showArtifactsPanel ? 'bg-[#EAE8E3] text-gray-900' : 'text-gray-600 hover:bg-[#EAE8E3]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4" />
                  <span>Code Artifacts</span>
                </div>
                {artifacts.length > 0 && (
                  <span className="bg-slate-900 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                    {artifacts.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setShowMemoryModal(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-600 hover:bg-[#EAE8E3] rounded-xl text-xs font-medium transition-colors text-left cursor-pointer"
              >
                <Sliders className="w-4 h-4" />
                <span>Customize memory</span>
              </button>
            </div>

            {/* Sessions Lists / Workspace Mode Specific history */}
            <div className="flex-1 overflow-y-auto px-2 py-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">Recent Coding Sessions</p>
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <div className="w-16 h-16 flex items-center justify-center mb-3 text-[#CEC9C0]">
                    <svg className="w-12 h-12" viewBox="0 0 40 40" fill="currentColor">
                      <rect x="18" y="18" width="4" height="4" />
                      <rect x="12" y="12" width="4" height="4" />
                      <rect x="24" y="12" width="4" height="4" />
                      <rect x="12" y="24" width="4" height="4" />
                      <rect x="24" y="24" width="4" height="4" />
                      <rect x="18" y="6" width="4" height="4" />
                      <rect x="6" y="18" width="4" height="4" />
                      <rect x="30" y="18" width="4" height="4" />
                      <rect x="18" y="30" width="4" height="4" />
                    </svg>
                  </div>
                  <p className="text-[11px] text-gray-400 font-medium leading-normal max-w-[170px]">
                    No sessions found. Create a new session to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {sessions.map((sess) => {
                    const isActive = activeSession?.id === sess.id;
                    const isEditing = editingSessionId === sess.id;
                    return (
                      <div 
                        key={sess.id} 
                        className={`group flex items-center justify-between rounded-xl px-2.5 py-2 transition-colors cursor-pointer ${
                          isActive ? 'bg-[#EAE8E3] text-gray-900 font-bold' : 'hover:bg-[#EAE8E3] text-gray-600'
                        }`}
                        onClick={() => {
                          if (!isEditing) {
                            handleSelectSession(sess);
                          }
                        }}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                            <Terminal className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                            <input
                              type="text"
                              value={editingTitleText}
                              onChange={(e) => setEditingTitleText(e.target.value)}
                              onBlur={() => handleRenameSession(sess.id, editingTitleText)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleRenameSession(sess.id, editingTitleText);
                                } else if (e.key === 'Escape') {
                                  setEditingSessionId(null);
                                }
                              }}
                              autoFocus
                              className="text-xs bg-white text-gray-900 border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-primary flex-1 font-sans min-w-0"
                            />
                            <button
                              onClick={() => handleRenameSession(sess.id, editingTitleText)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded shrink-0 cursor-pointer"
                              title="Save title"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingSessionId(null)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded shrink-0 cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Terminal className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                              <span className="text-xs font-medium truncate font-sans">
                                {sess.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSessionId(sess.id);
                                  setEditingTitleText(sess.title);
                                }}
                                className="p-1 hover:bg-gray-200/50 rounded-lg text-gray-400 hover:text-primary transition-all cursor-pointer"
                                title="Rename session"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => handleDeleteSession(sess.id, e)}
                                className="p-1 hover:bg-gray-200/50 rounded-lg text-gray-400 hover:text-red-500 transition-all cursor-pointer"
                                title="Delete session"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Section with User profile */}
            <div className="p-3 bg-[#FAF9F6] border-t border-[#E5E4E0]/60 space-y-3 shrink-0">
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-full flex items-center justify-between p-2 hover:bg-[#EAE8E3] rounded-xl transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#E5DCD0] border border-[#D0C4B4] text-gray-800 font-semibold text-xs flex items-center justify-center shrink-0">
                      {getInitials()}
                    </div>
                    <div className="min-w-0 leading-tight">
                      <p className="text-xs font-bold text-gray-900 truncate">{getUserName()}</p>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${isAdmin ? 'text-amber-600' : 'text-gray-500'}`}>
                        {isAdmin ? '🛡️ Admin' : '⭐ Pro Account'}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {showProfileMenu && (
                  <div className="absolute bottom-12 left-0 right-0 bg-white border border-[#E5E4E0] rounded-xl py-1.5 shadow-xl z-30 text-xs text-gray-700 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <div className="px-3.5 py-2 border-b border-[#E5E4E0]/50 mb-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-gray-900 truncate max-w-[150px]">{currentUser?.email}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${isAdmin ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-gray-100 text-gray-600'}`}>
                          {isAdmin ? 'Admin' : 'Pro'}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#D97706] font-semibold mt-0.5">Credits: ${credits.toFixed(4)}</p>
                    </div>
                    
                    <button
                      onClick={() => {
                        setWorkspaceMode('chat');
                        setShowProfileMenu(false);
                        showToast('Returned to General Chat Mode', 'info');
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                    >
                      <MessageSquare className="w-4 h-4 text-gray-500" />
                      Exit Coding Workspace
                    </button>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        showToast('Topping up credits...', 'success');
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                    >
                      <Plus className="w-4 h-4 text-gray-500" />
                      Add Credits
                    </button>

                    <div className="border-t border-[#E5E4E0]/50 my-1"></div>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        localStorage.removeItem('conduit_current_user');
                        window.location.reload();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-gray-50 flex items-center gap-2 text-red-600 font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Top Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-[#E5E4E0]/60 bg-white shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger sidebar toggle for mobile & desktop */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition-colors cursor-pointer mr-1 ${
                isSidebarOpen ? 'md:hidden' : 'block'
              }`}
              title="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-serif text-base font-bold text-primary tracking-tight">AIRA.AI</span>
              <span className="hidden md:inline bg-[#EAE6E1]/80 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#DCD8D2]">
                Coding Engine
              </span>
            </div>
          </div>

          {/* Sub-navigation Tabs */}
          <div className="flex items-center bg-[#FAF9F6] border border-[#E5E4E0]/80 rounded-xl p-1 gap-1">
            <button
              onClick={() => setCodingSubTab('generator')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                codingSubTab === 'generator'
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Code Generator</span>
            </button>
            <button
              onClick={() => setCodingSubTab('testcode')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                codingSubTab === 'testcode'
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Test Code</span>
            </button>
          </div>

          <button
            onClick={() => {
              setWorkspaceMode('chat');
              showToast('Returned to Dashboard', 'info');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF9F6] hover:bg-[#EAE8E3] border border-[#E5E4E0] rounded-xl text-xs font-bold text-gray-800 shadow-sm transition-all cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden xs:inline">Back to Dashboard</span>
          </button>
        </div>

        {codingSubTab === 'generator' && (
          <>
            {/* Messaging Area / Shell output */}
            <div className="flex-1 overflow-y-auto px-4 py-8 flex flex-col">
          {messages.length === 0 ? (
            /* Immersive empty state centered beautifully with Serif display */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 max-w-2xl mx-auto -mt-10">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-3.5 mb-4"
              >
                <SpikeMark className="w-10 h-10 text-[#E27E4B] shrink-0" />
                <h1 className="font-serif text-3xl font-normal text-gray-950 tracking-tight">
                  What's up next, {getUserName()}?
                </h1>
              </motion.div>
              <p className="text-gray-500 text-sm max-w-md font-sans mb-8">
                Type a natural language instruction to generate code, run checks, commit repositories, or manage your Cloud architecture in real-time.
              </p>
            </div>
          ) : (
            /* Conversation messages */
            <div className="max-w-2xl w-full mx-auto space-y-6 pb-24">
              {messages.map((m, idx) => (
                <div key={m.id || idx} className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold tracking-widest text-gray-400 uppercase font-mono">
                      {m.role === 'user' ? 'USER_PROMPT' : 'AIRA_LOG_OUTPUT'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div className={`p-4 rounded-2xl ${
                    m.role === 'user' 
                      ? 'bg-[#F4F3EF] border border-[#E1DFD9] text-gray-900 font-sans text-sm'
                      : 'bg-[#1E1E1E] border border-slate-800 text-slate-100 font-sans text-sm shadow-lg'
                  }`}>
                    {m.role === 'assistant' ? (
                      <div>
                        {(() => {
                          let parsed: any = null;
                          try {
                            parsed = JSON.parse(m.content);
                          } catch (e) {
                            if (m.metadata?.parsedResponse) {
                              parsed = m.metadata.parsedResponse;
                            }
                          }

                          if (parsed && parsed.type) {
                            if (parsed.type === 'clarify') {
                              return (
                                <div className="space-y-4 font-sans text-sm">
                                  <p className="text-gray-200 leading-relaxed font-sans text-sm">{parsed.message}</p>
                                  <div className="flex flex-wrap gap-2 pt-2">
                                    {Array.isArray(parsed.options) && parsed.options.map((opt: string, oIdx: number) => (
                                      <button
                                        key={oIdx}
                                        onClick={() => handleSendCognitiveMessage(opt)}
                                        className="px-4 py-2 bg-[#E27E4B] hover:bg-[#d06d3a] text-white rounded-xl text-xs font-semibold shadow-md transition-all duration-200 cursor-pointer"
                                      >
                                        {opt}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            }

                            if (parsed.type === 'plan') {
                              return (
                                <div className="space-y-3 font-sans">
                                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider font-mono">
                                    <Clipboard className="w-4 h-4 text-amber-400" />
                                    <span>[BUILD PLAN]</span>
                                  </div>
                                  <h3 className="text-white text-base font-bold tracking-tight">{parsed.title}</h3>
                                  <p className="text-gray-300 text-xs leading-relaxed">{parsed.summary}</p>
                                  
                                  <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80">
                                    <button
                                      onClick={() => handleOpenPreviewPanel(parsed)}
                                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-[11px] font-bold border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
                                    >
                                      <span>View Plan Details</span>
                                    </button>
                                    <button
                                      onClick={() => handleSendCognitiveMessage('Implement this plan')}
                                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold border border-emerald-500 transition-colors cursor-pointer flex items-center gap-1.5"
                                    >
                                      <span>Implement This Plan</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            if (parsed.type === 'code') {
                              return (
                                <div className="space-y-3 font-sans">
                                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider font-mono">
                                    <Terminal className="w-4 h-4 text-emerald-400" />
                                    <span>[CODE REPOSITORY]</span>
                                  </div>
                                  <h3 className="text-white text-base font-bold tracking-tight">{parsed.project_name}</h3>
                                  <p className="text-gray-300 text-xs leading-relaxed">{parsed.description}</p>
                                  
                                  <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80">
                                    <button
                                      onClick={() => handleOpenPreviewPanel(parsed)}
                                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-[11px] font-bold border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
                                    >
                                      <span>Open Code Project</span>
                                    </button>
                                    <button
                                      onClick={() => handleDownloadZip(parsed)}
                                      className="px-3.5 py-1.5 bg-[#E27E4B] hover:bg-[#d06d3a] text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      <span>Download ZIP</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            }
                          }

                          // Fallback plain content
                          return (
                            <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-emerald-400">
                              {m.content}
                            </div>
                          );
                        })()}
                        
                        {m.model_used && (
                          <div className="mt-4 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-sans">
                            <span className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[9px] font-semibold text-emerald-500 uppercase">
                              {m.model_used}
                            </span>
                            <span>Aira.AI Autonomous Thread</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              ))}

              {/* Steps Loader for current running execution */}
              {isCognitiveLoading && activeSteps.length > 0 && (
                <div className="space-y-4 animate-pulse">
                  <span className="text-[11px] font-bold tracking-widest text-orange-500 uppercase font-mono">
                    🤖 EXECUTING SUB-AGENTS...
                  </span>
                  <div className="bg-[#1E1E1E] border border-orange-500/30 p-4 rounded-2xl space-y-2.5 font-mono text-xs text-gray-300 shadow-xl">
                    {activeSteps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2 animate-in fade-in duration-200">
                        <span className="text-orange-400">⚡ [{step.name}]:</span>
                        <span>{step.log}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 text-orange-400 pt-2 border-t border-slate-800">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>AIRA.AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Bottom input area - centered perfectly */}
        <div className="w-full max-w-2xl mx-auto px-4 pb-8 shrink-0 relative z-10 bg-gradient-to-t from-[#FBFBFA] via-[#FBFBFA] to-transparent pt-4">
          
          {/* Top pills selection + Mascot SHERLOCK */}
          <div className="flex items-end justify-between px-2 mb-2">
            <div className="flex items-center gap-2.5">
              <button 
                onClick={() => showToast('Supabase cluster persistence synced.', 'success')}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#FAF9F6] border border-[#E5E4E0] rounded-full text-[11px] font-bold text-gray-700 shadow-sm cursor-pointer"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <span>Supabase: Persistent</span>
              </button>

              <button 
                onClick={() => setShowMemoryModal(true)}
                className="flex items-center gap-1 px-3 py-1 bg-[#FAF9F6] border border-[#E5E4E0] rounded-full text-[11px] font-bold text-gray-700 shadow-sm cursor-pointer"
              >
                <Sliders className="w-3 h-3 text-gray-500" />
                <span>Memory Rules</span>
              </button>
            </div>

            {/* Sherlock - Cute mascot crab */}
            <div className="relative group mr-4">
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-36 bg-gray-900 text-white text-[10px] font-medium py-1 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity text-center pointer-events-none z-30">
                Aira.AI Cognitive Sync Active! 🦀
                <div className="w-2 h-2 bg-gray-900 rotate-45 absolute top-full left-1/2 -translate-x-1/2 -mt-1"></div>
              </div>
              
              <div className="w-10 h-8 cursor-pointer transform hover:-translate-y-0.5 transition-transform">
                <svg width="40" height="32" viewBox="0 0 40 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="8" y="8" width="24" height="16" fill="#E27E4B" />
                  <rect x="12" y="4" width="4" height="4" fill="#E27E4B" />
                  <rect x="24" y="4" width="4" height="4" fill="#E27E4B" />
                  <rect x="10" y="0" width="8" height="4" fill="#FFFFFF" />
                  <rect x="22" y="0" width="8" height="4" fill="#FFFFFF" />
                  <rect x="14" y="0" width="4" height="4" fill="#1A1A1A" />
                  <rect x="26" y="0" width="4" height="4" fill="#1A1A1A" />
                  <rect x="4" y="8" width="4" height="8" fill="#D97706" />
                  <rect x="0" y="4" width="4" height="8" fill="#D97706" />
                  <rect x="32" y="8" width="4" height="8" fill="#D97706" />
                  <rect x="36" y="4" width="4" height="8" fill="#D97706" />
                  <rect x="8" y="24" width="4" height="4" fill="#E27E4B" />
                  <rect x="6" y="28" width="4" height="4" fill="#E27E4B" />
                  <rect x="14" y="24" width="4" height="4" fill="#E27E4B" />
                  <rect x="14" y="28" width="4" height="4" fill="#E27E4B" />
                  <rect x="22" y="24" width="4" height="4" fill="#E27E4B" />
                  <rect x="22" y="28" width="4" height="4" fill="#E27E4B" />
                  <rect x="28" y="24" width="4" height="4" fill="#E27E4B" />
                  <rect x="30" y="28" width="4" height="4" fill="#E27E4B" />
                </svg>
              </div>
            </div>
          </div>

          {/* Main Input Text Box */}
          <div className="bg-white border border-[#E5E4E0] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.03)] focus-within:border-gray-400 focus-within:ring-[3px] focus-within:ring-[#E27E4B]/10 transition-all overflow-hidden flex flex-col p-3.5">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AIRA.AI to code, fix a bug, or write a release file..."
              className="w-full resize-none bg-transparent outline-none border-none text-sm text-gray-950 font-sans placeholder-gray-400/90 leading-relaxed min-h-[24px]"
            />
            
            <div className="flex items-center justify-end mt-2 pt-1 border-t border-[#FAF9F6]/10">
              <button
                onClick={handleSendCognitiveMessage}
                disabled={!inputText.trim() || isCognitiveLoading}
                className={`p-1.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  inputText.trim() && !isCognitiveLoading
                    ? 'bg-gray-900 text-white hover:bg-black shadow-sm'
                    : 'text-gray-300 bg-gray-50'
                }`}
                title="Send instruction"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bottom accessory bar */}
          <div className="flex items-center justify-between mt-3 px-2 text-[10.5px] text-gray-400 font-semibold select-none">
            <div className="flex items-center gap-3.5">
              <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                <Check className="w-3.5 h-3.5" />
                <span>Auto-syncing to Supabase DB</span>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono">
              <span className="text-gray-400">{selectedModel.name}</span>
              <span className="text-gray-300">|</span>
              <span className="text-orange-500 font-bold uppercase tracking-wider">REASONING ACTIVE</span>
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></div>
            </div>
          </div>

        </div>
      </>
    )}

    {codingSubTab === 'testcode' && (
      /* =======================================================
         "TEST CODE" TAB PANEL (Paste / GitHub Selector)
         ======================================================= */
      <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col w-full max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="font-serif text-3xl font-normal text-gray-950 tracking-tight">
            Analyze Code & Generate Tests
          </h1>
          <p className="text-gray-500 text-sm max-w-xl font-sans">
            Paste raw source files or connect your GitHub repository. The principal AI engineer will audit bugs, trace logical gaps, detect vulnerabilities, and compose production-ready test templates.
          </p>
        </div>

        {/* Mode Selector Pill Tab */}
        <div className="flex items-center bg-white border border-[#E5E4E0] p-1 rounded-2xl w-fit gap-1 shadow-sm shrink-0">
          <button
            onClick={() => setTestCodeMode('paste')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              testCodeMode === 'paste'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Clipboard className="w-4 h-4" />
            <span>Paste Code</span>
          </button>
          <button
            onClick={() => setTestCodeMode('github')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              testCodeMode === 'github'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            <span>Analyze GitHub Repo</span>
          </button>
        </div>

        {/* Inputs Panel Container */}
        <div className="bg-white border border-[#E5E4E0]/60 rounded-2xl p-6 shadow-sm space-y-4">
          {testCodeMode === 'paste' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-mono">Source Code Input</label>
                <span className="text-[10px] text-gray-400 font-mono">Supports TS, JS, Py, Go, etc.</span>
              </div>
              <textarea
                value={pastedCode}
                onChange={(e) => setPastedCode(e.target.value)}
                placeholder="// Paste your code here for deep security audits, error tracing, and test generation..."
                className="w-full h-80 p-4 font-mono text-xs bg-[#FAF9F6] border border-[#E5E4E0]/80 rounded-xl outline-none focus:border-gray-400 leading-relaxed resize-none shadow-inner"
                disabled={isAnalyzing}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* GitHub Config Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-mono">Repository Path *</label>
                  <input
                    type="text"
                    placeholder="e.g. facebook/react"
                    value={githubRepo}
                    onChange={(e) => setGithubRepo(e.target.value)}
                    className="w-full p-3 text-xs bg-[#FAF9F6] border border-[#E5E4E0]/80 rounded-xl outline-none focus:border-gray-400"
                    disabled={isAnalyzing}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-mono">Branch Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="Defaults to main/master"
                    value={githubBranch}
                    onChange={(e) => setGithubBranch(e.target.value)}
                    className="w-full p-3 text-xs bg-[#FAF9F6] border border-[#E5E4E0]/80 rounded-xl outline-none focus:border-gray-400"
                    disabled={isAnalyzing}
                  />
                </div>
              </div>

              {/* GitHub Token Config with Mask Toggle */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-mono flex items-center gap-1">
                    <Key className="w-3 h-3 text-gray-400" />
                    <span>GitHub Personal Access Token (PAT)</span>
                  </label>
                  <span className="text-[10px] text-gray-400 italic">Saved local & never shared in logs</span>
                </div>
                <div className="relative">
                  <input
                    type={showGithubToken ? "text" : "password"}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={githubToken}
                    onChange={(e) => handleSaveGithubToken(e.target.value)}
                    className="w-full p-3 pr-12 text-xs font-mono bg-[#FAF9F6] border border-[#E5E4E0]/80 rounded-xl outline-none focus:border-gray-400"
                    disabled={isAnalyzing}
                  />
                  <button
                    type="button"
                    onClick={() => setShowGithubToken(!showGithubToken)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer text-xs font-bold"
                  >
                    {showGithubToken ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Fetch & Interactive File List Selection */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleFetchGithubFiles}
                  disabled={isFetchingFiles || isAnalyzing || !githubRepo.trim()}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer flex items-center gap-2 disabled:bg-slate-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {isFetchingFiles ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Connecting & Reading Tree...</span>
                    </>
                  ) : (
                    <>
                      <Folder className="w-3.5 h-3.5" />
                      <span>Load Source Files</span>
                    </>
                  )}
                </button>

                {githubFiles.length > 0 && (
                  <div className="space-y-2 border border-[#E5E4E0]/60 rounded-xl bg-[#FAF9F6] p-4 max-h-56 overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-[#E5E4E0]/40 pb-2 mb-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
                        Select Files to Analyze ({selectedFiles.length}/{githubFiles.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedFiles.length === githubFiles.length) {
                            setSelectedFiles([]);
                          } else {
                            setSelectedFiles(githubFiles.map(f => f.path));
                          }
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        {selectedFiles.length === githubFiles.length ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {githubFiles.map((file) => {
                        const isChecked = selectedFiles.includes(file.path);
                        return (
                          <label
                            key={file.path}
                            className="flex items-center gap-2.5 p-2 bg-white border border-[#E5E4E0]/40 rounded-lg text-xs font-mono truncate cursor-pointer hover:border-slate-300"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedFiles(prev => prev.filter(p => p !== file.path));
                                } else {
                                  setSelectedFiles(prev => [...prev, file.path]);
                                }
                              }}
                              className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                            />
                            <span className="truncate text-gray-700" title={file.path}>{file.path}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Run Analysis Action Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#F5F4F0] border border-[#E5E4E0]/60 p-5 rounded-2xl shrink-0">
          <div className="text-left space-y-1">
            <p className="text-xs font-bold text-gray-800">Ready to audit code?</p>
            <p className="text-[11px] text-gray-500">Deducts credits proportionally based on token volume analyzed.</p>
          </div>

          <button
            type="button"
            onClick={handleRunCodeAnalysis}
            disabled={isAnalyzing || isFetchingFiles || (testCodeMode === 'paste' && !pastedCode.trim()) || (testCodeMode === 'github' && selectedFiles.length === 0)}
            className="w-full sm:w-auto px-6 py-3 bg-[#E27E4B] hover:bg-[#d06d3a] disabled:bg-slate-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing Pipeline...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Analyze & Generate Report</span>
              </>
            )}
          </button>
        </div>

        {/* SSE Progress Box */}
        {isAnalyzing && (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-slate-200 font-mono text-xs space-y-3.5 shadow-xl animate-pulse">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-bold tracking-wider uppercase text-[10px] flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 animate-spin" />
                <span>{analysisProgressMsg}</span>
              </span>
              <span className="text-gray-400 font-bold">{analysisProgress}%</span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Saved Report Reload Prompt */}
        {!isAnalyzing && analysisResult && (
          <div className="p-4 bg-emerald-50 border border-emerald-200/60 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5 text-xs text-emerald-800">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>Previous Report loaded from history session: <strong>{analysisResult.title || 'Code Analysis Report'}</strong></span>
            </div>
            <button
              onClick={() => handleOpenPreviewPanel(analysisResult)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              View Report Panel
            </button>
          </div>
        )}
      </div>
    )}

      </div>

      {/* Artifacts side slide-out drawer (matching Claude Code's actual workspace feel) */}
      <AnimatePresence>
        {showArtifactsPanel && (
          <motion.div
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className="absolute top-0 right-0 h-full w-[300px] border-l border-[#E5E4E0] bg-[#FAF9F6] shadow-2xl z-40 flex flex-col overflow-hidden"
          >
            <div className="h-14 px-4 flex items-center justify-between border-b border-[#E5E4E0]/60 bg-white">
              <span className="font-bold text-xs text-gray-800 uppercase tracking-widest font-mono">Code Artifacts</span>
              <button 
                onClick={() => setShowArtifactsPanel(false)}
                className="p-1 hover:bg-[#EAE8E3] rounded text-gray-500 hover:text-gray-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {artifacts.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-xs italic">
                  No artifacts generated in this session yet. Ask Aira to write some code blocks!
                </div>
              ) : (
                artifacts.map((art) => (
                  <div key={art.id} className="p-4 border border-[#E5E4E0] bg-white rounded-xl text-xs space-y-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-slate-800 font-bold truncate max-w-[150px]" title={art.file_path}>
                        {art.file_path.split('/').pop()}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                        art.status === 'CREATED' 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {art.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-mono truncate">{art.file_path}</p>
                    <pre className="p-2 bg-slate-950 text-slate-300 rounded font-mono text-[9px] max-h-24 overflow-hidden truncate">
                      {art.content}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customize Memory Rules Modal */}
      {showMemoryModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E5E4E0] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-slate-700" />
                <span className="font-bold text-sm text-slate-900">Configure CLAUDE.md Memory Rules</span>
              </div>
              <button 
                onClick={() => setShowMemoryModal(false)}
                className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                Add persistent guidelines, styling choices, or framework constraints. These guidelines will automatically append to AIRA's system prompt to enforce codebase standards.
              </p>

              <form onSubmit={handleSaveMemoryRule} className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <input 
                    type="text" 
                    placeholder="Rule Name (e.g. framework)" 
                    value={newRuleKey}
                    onChange={(e) => setNewRuleKey(e.target.value)}
                    className="col-span-1 p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-slate-400"
                    required
                  />
                  <input 
                    type="text" 
                    placeholder="Rule instructions..." 
                    value={newRuleVal}
                    onChange={(e) => setNewRuleVal(e.target.value)}
                    className="col-span-2 p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-slate-400"
                    required
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-colors cursor-pointer"
                >
                  Save to Agent Memory Table
                </button>
              </form>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Current Rules (Supabase Sync)</p>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {memories.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No rules defined. Add one above to instruct the AI!</p>
                  ) : (
                    memories.map((mem) => (
                      <div key={mem.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs flex flex-col gap-0.5">
                        <span className="font-bold text-slate-800 font-mono text-[10px] uppercase">
                          ⚙️ {mem.memory_key}
                        </span>
                        <span className="text-gray-600">{mem.memory_value}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full-fledged Plan-First Code Preview Panel */}
      <AnimatePresence>
        {activePreview && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed inset-y-0 right-0 w-full md:w-[650px] lg:w-[850px] bg-[#FAF9F6] border-l border-[#E5E4E0] shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="h-16 px-6 bg-white border-b border-[#E5E4E0]/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  activePreview.type === 'plan' 
                    ? 'bg-amber-50 text-amber-700' 
                    : activePreview.type === 'test_report'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {activePreview.type === 'plan' ? (
                    <Clipboard className="w-5 h-5" />
                  ) : activePreview.type === 'test_report' ? (
                    <Shield className="w-5 h-5" />
                  ) : (
                    <Terminal className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    {activePreview.type === 'plan' 
                      ? 'Interactive Build Plan' 
                      : activePreview.type === 'test_report'
                      ? 'Bug & Test Cases Report'
                      : 'Runnable Code Project'}
                  </span>
                  <h2 className="text-sm font-bold text-gray-900 leading-tight">
                    {activePreview.type === 'plan' 
                      ? activePreview.title 
                      : activePreview.type === 'test_report'
                      ? (activePreview.title || 'Code Analysis Audit')
                      : activePreview.project_name}
                  </h2>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {activePreview.type === 'plan' ? (
                  <>
                    <button
                      onClick={() => handleDownloadPlanMD(activePreview)}
                      className="px-3.5 py-2 bg-[#FAF9F6] hover:bg-[#EAE8E3] border border-[#E5E4E0] rounded-xl text-xs font-bold text-gray-800 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-gray-500" />
                      <span>Download .md</span>
                    </button>
                    <button
                      onClick={() => {
                        setActivePreview(null);
                        handleSendCognitiveMessage('Implement this plan');
                      }}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                    >
                      <span>Implement Plan</span>
                    </button>
                  </>
                ) : activePreview.type === 'test_report' ? (
                  <>
                    <button
                      onClick={handleDownloadReportMD}
                      className="px-3.5 py-2 bg-[#FAF9F6] hover:bg-[#EAE8E3] border border-[#E5E4E0] rounded-xl text-xs font-bold text-gray-800 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-gray-500" />
                      <span>Download Report (.md)</span>
                    </button>
                    <button
                      onClick={handleDownloadTestCasesZip}
                      className="px-3.5 py-2 bg-[#E27E4B] hover:bg-[#d06d3a] text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Tests (ZIP)</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleDownloadZip(activePreview)}
                    className="px-3.5 py-2 bg-[#E27E4B] hover:bg-[#d06d3a] text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download ZIP</span>
                  </button>
                )}
                <button
                  onClick={() => setActivePreview(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
                  title="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content body */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {activePreview.type === 'plan' ? (
                /* Plan Layout */
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                  {/* Summary & How it works */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-5 border border-[#E5E4E0]/60 rounded-2xl shadow-sm space-y-2">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Summary</h4>
                      <p className="text-gray-700 text-sm leading-relaxed">{activePreview.summary}</p>
                    </div>
                    <div className="bg-white p-5 border border-[#E5E4E0]/60 rounded-2xl shadow-sm space-y-2">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Architecture & Flow</h4>
                      <p className="text-gray-700 text-sm leading-relaxed">{activePreview.how_it_works}</p>
                    </div>
                  </div>

                  {/* Features List */}
                  {Array.isArray(activePreview.features) && activePreview.features.length > 0 && (
                    <div className="bg-white p-5 border border-[#E5E4E0]/60 rounded-2xl shadow-sm space-y-3">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Key Features Included</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {activePreview.features.map((feat: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inputs & Outputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-5 border border-[#E5E4E0]/60 rounded-2xl shadow-sm space-y-3">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Inputs / User Entries</h4>
                      <ul className="space-y-2 text-sm text-gray-700 list-disc pl-4 leading-relaxed">
                        {Array.isArray(activePreview.inputs) && activePreview.inputs.map((inp: string, idx: number) => (
                          <li key={idx}>{inp}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-white p-5 border border-[#E5E4E0]/60 rounded-2xl shadow-sm space-y-3">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Outputs / Dashboards</h4>
                      <ul className="space-y-2 text-sm text-gray-700 list-disc pl-4 leading-relaxed">
                        {Array.isArray(activePreview.outputs) && activePreview.outputs.map((out: string, idx: number) => (
                          <li key={idx}>{out}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Tech stack */}
                  {Array.isArray(activePreview.tech_stack) && activePreview.tech_stack.length > 0 && (
                    <div className="bg-white p-5 border border-[#E5E4E0]/60 rounded-2xl shadow-sm space-y-3">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Tech Stack Selection</h4>
                      <div className="flex flex-wrap gap-2">
                        {activePreview.tech_stack.map((tech: string, idx: number) => (
                          <span key={idx} className="bg-slate-100 border border-slate-200/60 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* File Structure */}
                  {Array.isArray(activePreview.file_structure) && activePreview.file_structure.length > 0 && (
                    <div className="bg-white p-5 border border-[#E5E4E0]/60 rounded-2xl shadow-sm space-y-3">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Proposed File Structure</h4>
                      <div className="space-y-2.5">
                        {activePreview.file_structure.map((file: any, idx: number) => (
                          <div key={idx} className="p-3 bg-[#FAF9F6] border border-[#E5E4E0]/40 rounded-xl flex items-start gap-3">
                            <Folder className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                            <div className="text-xs">
                              <p className="font-mono font-bold text-gray-800">{file.path}</p>
                              <p className="text-gray-500 mt-0.5">{file.purpose}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Build Steps */}
                  {Array.isArray(activePreview.build_steps) && activePreview.build_steps.length > 0 && (
                    <div className="bg-white p-5 border border-[#E5E4E0]/60 rounded-2xl shadow-sm space-y-3">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Detailed Build Steps</h4>
                      <div className="space-y-3">
                        {activePreview.build_steps.map((step: string, idx: number) => (
                          <div key={idx} className="flex gap-3">
                            <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold flex items-center justify-center text-slate-700 shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-sm text-gray-700 pt-0.5 leading-relaxed">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Next Action Hint */}
                  <div className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-xl text-center text-xs text-amber-800">
                    💡 <strong>Next Action Hint:</strong> {activePreview.next_action_hint || "Type 'implement this plan' to build the complete repository."}
                  </div>
                </div>
              ) : activePreview.type === 'test_report' ? (
                /* Interactive Bug & Test Cases Report Layout */
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                  {/* Aggregated Overview Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-5 border border-[#E5E4E0]/60 rounded-2xl shadow-sm text-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Bug Count</span>
                      <p className="text-3xl font-serif font-bold text-red-600 mt-1">{activePreview.aggregated_report?.bug_count || 0}</p>
                    </div>
                    <div className="bg-white p-5 border border-[#E5E4E0]/60 rounded-2xl shadow-sm text-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Test Cases Generated</span>
                      <p className="text-3xl font-serif font-bold text-emerald-600 mt-1">{activePreview.aggregated_report?.test_cases_count || 0}</p>
                    </div>
                    <div className="bg-white p-5 border border-[#E5E4E0]/60 rounded-2xl shadow-sm text-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Security Vulnerabilities</span>
                      <p className="text-3xl font-serif font-bold text-orange-500 mt-1">{activePreview.aggregated_report?.vulnerabilities_count || 0}</p>
                    </div>
                  </div>

                  {/* Summary Narrative */}
                  <div className="bg-white p-5 border border-[#E5E4E0]/60 rounded-2xl shadow-sm space-y-2">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">System Audit Executive Summary</h4>
                    <p className="text-gray-700 text-sm leading-relaxed">{activePreview.aggregated_report?.summary}</p>
                  </div>

                  {/* High Priority Critical Issues */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Critical Audited Findings & Bug Details</h4>
                    {Array.isArray(activePreview.per_file_reports) && activePreview.per_file_reports.length > 0 ? (
                      <div className="space-y-4">
                        {activePreview.per_file_reports.map((fileReport: any, fileIdx: number) => (
                          <div key={fileIdx} className="bg-white border border-[#E5E4E0]/60 rounded-2xl p-5 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-[#E5E4E0]/40 pb-2">
                              <span className="font-mono text-xs font-bold text-indigo-950 truncate flex items-center gap-2">
                                <FileCode className="w-4 h-4 text-gray-400" />
                                <span>{fileReport.file_path}</span>
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                {fileReport.bugs?.length || 0} issues
                              </span>
                            </div>

                            {/* Bugs List */}
                            {Array.isArray(fileReport.bugs) && fileReport.bugs.length > 0 && (
                              <div className="space-y-3.5">
                                {fileReport.bugs.map((bug: any, bugIdx: number) => (
                                  <div key={bugIdx} className="p-4 bg-red-50/50 border border-red-100 rounded-xl space-y-2 text-xs">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                        bug.severity === 'CRITICAL' ? 'bg-red-600 text-white' :
                                        bug.severity === 'HIGH' ? 'bg-orange-500 text-white' :
                                        'bg-amber-400 text-slate-900'
                                      }`}>
                                        {bug.severity}
                                      </span>
                                      <span className="font-bold text-slate-900">{bug.description}</span>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed"><strong className="text-gray-700">Detailed fix recommendation:</strong> {bug.recommendation}</p>
                                    
                                    {/* Code Snippets Difference Viewer */}
                                    {bug.original_code && bug.fixed_code && (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-red-200/40">
                                        <div>
                                          <span className="text-[9px] font-bold text-red-700 uppercase tracking-wider font-mono block mb-1">Before: Original Snippet</span>
                                          <pre className="p-2.5 bg-red-100/40 border border-red-200 text-[10px] rounded-lg font-mono text-red-900 overflow-x-auto whitespace-pre">
                                            {bug.original_code}
                                          </pre>
                                        </div>
                                        <div>
                                          <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider font-mono block mb-1">After: Fixed Snippet</span>
                                          <pre className="p-2.5 bg-emerald-50 border border-emerald-200 text-[10px] rounded-lg font-mono text-emerald-900 overflow-x-auto whitespace-pre">
                                            {bug.fixed_code}
                                          </pre>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Test Cases Header */}
                            {Array.isArray(fileReport.test_cases) && fileReport.test_cases.length > 0 && (
                              <div className="space-y-2.5 pt-2">
                                <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Suggested Integration Test Suite</h5>
                                <div className="space-y-2">
                                  {fileReport.test_cases.map((tc: any, tcIdx: number) => (
                                    <div key={tcIdx} className="p-3.5 bg-[#FAF9F6] border border-[#E5E4E0]/40 rounded-xl space-y-1 text-xs">
                                      <div className="flex items-center gap-1.5">
                                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                        <span className="font-bold text-slate-800">{tc.name}</span>
                                      </div>
                                      <p className="text-gray-500 text-[11px] leading-relaxed pl-5">{tc.description}</p>
                                      {tc.test_code && (
                                        <div className="mt-2 pl-5">
                                          <div className="flex items-center justify-between text-[9px] font-mono text-gray-400 mb-1">
                                            <span>Test Code Template</span>
                                            <button
                                              onClick={() => {
                                                navigator.clipboard.writeText(tc.test_code);
                                                showToast('Test code copied!', 'success');
                                              }}
                                              className="text-indigo-600 hover:text-indigo-800 font-bold"
                                            >
                                              Copy Code
                                            </button>
                                          </div>
                                          <pre className="p-3 bg-slate-950 text-slate-300 rounded-lg font-mono text-[10px] overflow-x-auto leading-relaxed max-h-56">
                                            {tc.test_code}
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No per-file bug logs reported.</p>
                    )}
                  </div>
                </div>
              ) : (
                /* Code Layout with Interactive File Tree and Code Viewer */
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                  {/* File Tree Left Column */}
                  <div className="w-full md:w-64 h-40 md:h-full border-b md:border-b-0 md:border-r border-[#E5E4E0]/60 bg-[#FAF9F6] flex flex-col shrink-0 overflow-y-auto">
                    <div className="p-3.5 border-b border-[#E5E4E0]/40 bg-white">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Project Files</span>
                    </div>
                    <div className="p-2 space-y-0.5">
                      {Array.isArray(activePreview.files) && activePreview.files.map((file: any) => {
                        const isSelected = file.path === selectedFilePath;
                        return (
                          <button
                            key={file.path}
                            onClick={() => setSelectedFilePath(file.path)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono truncate transition-all cursor-pointer flex items-center gap-2 ${
                              isSelected
                                ? 'bg-slate-900 text-white font-bold'
                                : 'text-slate-600 hover:bg-[#EAE8E3]/60'
                            }`}
                          >
                            <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                            <span className="truncate">{file.path}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Code Viewer Right Column */}
                  <div className="flex-1 flex flex-col overflow-hidden bg-[#1E1E1E] text-slate-200 font-mono text-xs">
                    {/* File Path Bar */}
                    <div className="h-11 px-4 bg-[#141414] border-b border-slate-800/80 flex items-center justify-between shrink-0">
                      <span className="text-emerald-400 font-bold tracking-tight truncate max-w-[400px]">
                        {selectedFilePath}
                      </span>
                      {selectedFilePath && (
                        <button
                          onClick={() => {
                            const fileObj = activePreview.files.find((f: any) => f.path === selectedFilePath);
                            if (fileObj) {
                              handleCopyCode(fileObj.content, selectedFilePath);
                            }
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] text-slate-300 font-bold transition-all cursor-pointer flex items-center gap-1 border border-slate-700"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedFilePath === selectedFilePath ? 'Copied!' : 'Copy Code'}</span>
                        </button>
                      )}
                    </div>

                    {/* Run instructions */}
                    {activePreview.run_instructions && (
                      <div className="px-4 py-2.5 bg-[#1a1a1a] border-b border-slate-800/50 flex items-center justify-between text-[11px] font-sans text-slate-400 gap-4 shrink-0">
                        <span className="truncate">
                          Run: <code className="bg-black/40 text-emerald-400 px-1.5 py-0.5 rounded font-mono text-[10px]">{activePreview.run_instructions}</code>
                        </span>
                        <button
                          onClick={() => handleCopyRunInstructions(activePreview.run_instructions)}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px] font-bold border border-slate-700 shrink-0 cursor-pointer"
                        >
                          {copiedRunInstructions ? 'Copied!' : 'Copy CMD'}
                        </button>
                      </div>
                    )}

                    {/* Code pre box */}
                    <div className="flex-1 overflow-auto p-4 leading-relaxed font-mono select-text">
                      <pre className="whitespace-pre overflow-x-auto">
                        {activePreview.files?.find((f: any) => f.path === selectedFilePath)?.content || '// File content not loaded.'}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
