import React, { useState, useEffect } from 'react';
import {
  Key,
  Plus,
  Copy,
  Trash2,
  BarChart3,
  TrendingUp,
  Cpu,
  Zap,
  Layers,
  Plug,
  Settings as GearIcon,
  Shield,
  Check,
  Eye,
  EyeOff,
  Sliders,
  RefreshCw,
  Database,
  Lock,
  Globe,
  Bell,
  Search,
  Mail,
  Calendar,
  FileText,
  FileSpreadsheet,
  HardDrive,
  Github,
  Play,
  Terminal,
  ExternalLink,
  Users,
  Hourglass,
  Activity,
  UserPlus,
  Clock,
  AlertCircle,
  Pencil,
  X,
  CreditCard
} from 'lucide-react';
import SpikeMark from './SpikeMark';

interface ViewProps {
  showToast: (msg: string, type?: 'success' | 'info') => void;
  credits: number;
  currentUser?: any;
}

interface ApiKeysViewProps extends ViewProps {
  onUpdateKeysCount?: (count: number) => void;
}

export function ApiKeysView({ showToast, credits, currentUser }: ApiKeysViewProps) {
  const [keys, setKeys] = useState<any[]>([]);
  const [visibleKeyId, setVisibleKeyId] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [restrictedModel, setRestrictedModel] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [generatedKeyToDisplay, setGeneratedKeyToDisplay] = useState<string | null>(null);

  // Playground States
  const [selectedKeyForPlayground, setSelectedKeyForPlayground] = useState<string>('');
  const [playgroundPrompt, setPlaygroundPrompt] = useState('Write a 1-sentence welcome message for Aira.Ai.');
  const [playgroundResponse, setPlaygroundResponse] = useState<any>(null);
  const [isPlaygroundLoading, setIsPlaygroundLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'playground'>('list');

  const userEmail = currentUser?.email || '';

  // Fetch keys from backend on mount
  const fetchKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const res = await fetch(`/api/keys?email=${encodeURIComponent(userEmail)}`);
      if (res.ok) {
        const data = await res.json();
        setKeys(data);
        if (data.length > 0 && !selectedKeyForPlayground) {
          // Default to the first key or active key
          const activeKey = data.find((k: any) => k.active);
          if (activeKey) {
            setSelectedKeyForPlayground(activeKey.fullKey);
          } else {
            setSelectedKeyForPlayground(data[0].fullKey);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch keys:', err);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, [userEmail]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      const res = await fetch('/api/keys/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName, email: userEmail, restrictedModel })
      });
      if (res.ok) {
        const newKey = await res.json();
        setKeys([...keys, newKey]);
        setNewKeyName('');
        setRestrictedModel('');
        setShowGenerateModal(false);
        setGeneratedKeyToDisplay(newKey.fullKey); // set the generated full key to show success copy-once screen
        setSelectedKeyForPlayground(newKey.fullKey);
        showToast('Created new API key!', 'success');
      }
    } catch (err) {
      showToast('Failed to generate key', 'info');
    }
  };

  const handleDeleteKey = async (fullKey: string, name: string) => {
    const confirmed = window.confirm(`Are you sure you want to permanently delete API Key: "${name}"?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/keys/${encodeURIComponent(fullKey)}?email=${encodeURIComponent(userEmail)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setKeys(keys.filter(k => k.fullKey !== fullKey));
        showToast(`Deleted key "${name}"`, 'success');
      }
    } catch (err) {
      showToast('Failed to delete key', 'info');
    }
  };

  const handleToggleActive = async (fullKey: string) => {
    try {
      const res = await fetch(`/api/keys/${encodeURIComponent(fullKey)}/toggle?email=${encodeURIComponent(userEmail)}`, {
        method: 'PATCH'
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(keys.map(k => k.fullKey === fullKey ? { ...k, active: data.active } : k));
        showToast(data.active ? 'API key active' : 'API key paused', 'success');
      }
    } catch (err) {
      showToast('Failed to toggle status', 'info');
    }
  };

  const handleRunPlayground = async () => {
    if (!selectedKeyForPlayground) {
      showToast('Please generate and select an active key first.', 'info');
      return;
    }
    setIsPlaygroundLoading(true);
    setPlaygroundResponse(null);

    try {
      const startTime = Date.now();
      const res = await fetch('/api/gateway/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${selectedKeyForPlayground}`
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: playgroundPrompt }]
        })
      });

      const latency = Date.now() - startTime;
      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { error: text ? (text.length > 200 ? text.substring(0, 200) + '...' : text) : `HTTP ${res.status}` };
      }

      setPlaygroundResponse({
        status: res.status,
        statusText: res.statusText,
        latency: `${latency}ms`,
        payload: data
      });

      if (res.ok) {
        showToast('Gateway execution successful!', 'success');
      } else {
        showToast('Gateway returned an error response', 'info');
      }
    } catch (err: any) {
      setPlaygroundResponse({
        error: err.message
      });
      showToast('Playground request failed', 'info');
    } finally {
      setIsPlaygroundLoading(false);
    }
  };

  const dynamicEndpointUrl = `${window.location.origin}/api/gateway/chat`;

  return (
    <div className="px-4 py-6 md:p-8 space-y-6 max-w-4xl mx-auto font-sans bg-canvas text-body w-full overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-normal text-ink font-serif tracking-tight">API Management</h2>
          <p className="text-xs text-muted-soft mt-1 leading-relaxed">Generate secure bearer tokens to authenticate your external service pipelines with our dynamic Aira.Ai gateway.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border transition-all ${
              activeTab === 'list' ? 'bg-surface-card text-ink border-hairline' : 'bg-canvas hover:bg-surface-soft border-transparent text-muted'
            }`}
          >
            Keys List
          </button>
          <button
            onClick={() => setActiveTab('playground')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border transition-all ${
              activeTab === 'playground' ? 'bg-surface-card text-ink border-hairline' : 'bg-canvas hover:bg-surface-soft border-transparent text-muted'
            }`}
          >
            Gateway Playground
          </button>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="bg-primary hover:bg-primary-active text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-none"
          >
            <Plus className="w-4 h-4" /> Create Key
          </button>
        </div>
      </div>

      {/* Dynamic Endpoint display panel */}
      <div className="bg-surface-card border border-hairline p-5 rounded-xl shadow-none space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted uppercase tracking-wider">
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span>DYNAMIC GATEWAY ENDPOINT</span>
          </div>
          <span className="text-[10px] bg-canvas border border-hairline text-primary px-2 py-0.5 rounded-full font-mono font-medium">
            {window.location.hostname === 'localhost' ? 'LOCAL RUNTIME' : 'PRODUCTION DOMAIN'}
          </span>
        </div>
        <div className="flex items-center gap-2 bg-canvas p-3 rounded-lg border border-hairline-soft">
          <code className="text-xs font-mono text-body break-all select-all flex-1">{dynamicEndpointUrl}</code>
          <button
            onClick={() => { navigator.clipboard.writeText(dynamicEndpointUrl); showToast('Gateway URL copied!', 'success'); }}
            className="p-1.5 hover:bg-surface-soft rounded text-muted-soft hover:text-primary shrink-0 transition-colors"
            title="Copy Endpoint"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] text-muted-soft">
          Route your requests to this dynamic server endpoint to automatically proxy queries through your custom Cohere account.
        </p>
      </div>

      {activeTab === 'list' ? (
        <div className="bg-surface-card border border-hairline rounded-xl overflow-hidden shadow-none overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[700px]">
            <thead>
              <tr className="bg-surface-soft border-b border-hairline text-[10px] text-muted font-medium tracking-wider">
                <th className="p-4 pl-6">NAME</th>
                <th className="p-4">TOKEN PREFIX</th>
                <th className="p-4">SECRET VALUE</th>
                <th className="p-4">TOKEN USAGE</th>
                <th className="p-4">CREATED AT</th>
                <th className="p-4">RESTRICTED TO</th>
                <th className="p-4">STATUS</th>
                <th className="p-4 pr-6 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline-soft">
              {isLoadingKeys ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-soft">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-primary" />
                    Fetching secure key nodes...
                  </td>
                </tr>
              ) : keys.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-soft italic">
                    No active API keys generated yet. Click "Create Key" to get started.
                  </td>
                </tr>
              ) : (
                keys.map((key) => (
                  <tr key={key.fullKey} className="hover:bg-surface-soft/40 transition-colors">
                    <td className="p-4 pl-6 font-medium text-ink">{key.name}</td>
                    <td className="p-4 font-mono text-[11px] text-primary">{key.prefix}</td>
                    <td className="p-4 font-mono text-[11px] text-muted-soft flex items-center gap-2">
                      <span className="truncate max-w-[120px]">
                        {visibleKeyId === key.fullKey ? key.fullKey : key.value}
                      </span>
                      <button
                        onClick={() => setVisibleKeyId(visibleKeyId === key.fullKey ? null : key.fullKey)}
                        className="text-muted-soft hover:text-muted p-0.5 rounded transition-colors"
                      >
                        {visibleKeyId === key.fullKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-[11px] font-medium text-body">
                          {(key.totalTokens || 0).toLocaleString()} <span className="text-[10px] text-muted-soft font-normal font-sans">total</span>
                        </span>
                        <span className="text-[10px] text-muted-soft font-mono">
                          {(key.inputTokens || 0).toLocaleString()} in / {(key.outputTokens || 0).toLocaleString()} out
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-muted">{key.created}</td>
                    <td className="p-4">
                      {key.restrictedModel ? (
                        <span className="bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded text-[10px] font-mono font-medium">
                          {key.restrictedModel}
                        </span>
                      ) : (
                        <span className="bg-surface-soft border border-hairline text-muted-soft px-2 py-0.5 rounded text-[10px] font-mono font-medium">
                          All Models
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleActive(key.fullKey)}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-semibold cursor-pointer transition-colors border ${
                          key.active 
                            ? 'bg-canvas border-hairline text-primary hover:bg-surface-soft' 
                            : 'bg-surface-soft border-transparent text-muted-soft hover:bg-surface-cream-strong'
                        }`}
                      >
                        {key.active ? 'ACTIVE' : 'PAUSED'}
                      </button>
                    </td>
                    <td className="p-4 pr-6 text-right space-x-2">
                      <button
                        onClick={() => { navigator.clipboard.writeText(key.fullKey); showToast('API key copied!', 'success'); }}
                        className="p-1.5 hover:bg-surface-soft rounded text-muted-soft hover:text-primary transition-colors inline-block"
                        title="Copy Key"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteKey(key.fullKey, key.name)}
                        className="p-1.5 hover:bg-surface-cream-strong rounded text-muted-soft hover:text-primary transition-colors inline-block"
                        title="Delete Key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Playground View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface-card border border-hairline p-5 rounded-xl shadow-none space-y-4">
            <h3 className="font-medium text-ink flex items-center gap-2 font-serif">
              <Play className="w-4 h-4 text-primary" /> Live Query Console
            </h3>

            <div>
              <label className="text-[10px] font-medium text-muted uppercase tracking-wider block mb-1">Select Target Key</label>
              <select
                value={selectedKeyForPlayground}
                onChange={(e) => setSelectedKeyForPlayground(e.target.value)}
                className="w-full px-3 py-2 bg-canvas border border-hairline rounded-lg text-xs font-mono text-body focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary"
              >
                {keys.map(k => (
                  <option key={k.fullKey} value={k.fullKey}>{k.name} ({k.prefix})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-medium text-muted uppercase tracking-wider block mb-1">Prompt Payload</label>
              <textarea
                rows={4}
                value={playgroundPrompt}
                onChange={(e) => setPlaygroundPrompt(e.target.value)}
                className="w-full px-3 py-2 bg-canvas border border-hairline rounded-lg text-xs font-sans text-body focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary"
              />
            </div>

            <button
              onClick={handleRunPlayground}
              disabled={isPlaygroundLoading || keys.length === 0}
              className="w-full bg-primary hover:bg-primary-active disabled:bg-primary-disabled disabled:text-muted-soft text-white py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-none"
            >
              {isPlaygroundLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" /> Querying Gateway...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-white" /> Send API Request
                </>
              )}
            </button>
          </div>

          {/* Playground Response Node */}
          <div className="bg-surface-dark border border-hairline/10 p-5 rounded-xl shadow-none flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono text-primary font-medium uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-4 h-4" /> GATEWAY LOG RESPONSE
                </span>
                {playgroundResponse?.latency && (
                  <span className="text-[10px] font-mono text-on-dark-soft">{playgroundResponse.latency}</span>
                )}
              </div>

              <div className="bg-surface-dark-soft p-3.5 rounded-lg border border-hairline/5 max-h-72 overflow-y-auto font-mono text-xs leading-relaxed text-on-dark">
                {playgroundResponse ? (
                  <pre className="whitespace-pre-wrap">{JSON.stringify(playgroundResponse, null, 2)}</pre>
                ) : (
                  <p className="text-on-dark-soft italic text-[11px] font-sans">No request sent yet. Formulate your prompt on the left and run "Send API Request" to test the dynamic proxy endpoint.</p>
                )}
              </div>
            </div>

            <div className="text-[10px] text-on-dark-soft border-t border-hairline/10 pt-3 mt-4 flex justify-between font-mono">
              <span>Authentication: Bearer Token</span>
              <span>Proxy Target: Cohere Model</span>
            </div>
          </div>
        </div>
      )}

      {/* Security note card */}
      <div className="p-4 bg-surface-card border border-hairline rounded-xl flex items-start gap-3">
        <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-body leading-relaxed">
          <p className="font-semibold text-ink">Security Best Practices</p>
          <p className="mt-1 text-muted-soft">
            Aira.Ai API keys are powerful credentials. Never commit them to version control, client-side browser files, or public repositories. Integrate keys through server-side environment variables or secret vaults.
          </p>
        </div>
      </div>

      {/* Key generation Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-surface-dark/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <form onSubmit={handleCreateKey} className="bg-canvas border border-hairline rounded-xl p-6 max-w-sm w-full space-y-4 shadow-none">
            <h3 className="text-lg font-normal text-ink font-serif tracking-tight">Generate New Key</h3>
            <p className="text-xs text-muted-soft">Provide an identifier for this API key to track cost allocations.</p>
             <div className="space-y-1">
               <label className="text-[10px] font-medium text-muted uppercase tracking-wider block">Key Name</label>
               <input
                 type="text"
                 required
                 placeholder="e.g. Production Microservice"
                 value={newKeyName}
                 onChange={(e) => setNewKeyName(e.target.value)}
                 className="w-full px-3 py-2 bg-canvas border border-hairline rounded-lg text-xs text-body focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary"
               />
             </div>
             
             <div className="space-y-1">
               <label className="text-[10px] font-medium text-muted uppercase tracking-wider block">Restricted Model Access</label>
               <select
                 value={restrictedModel}
                 onChange={(e) => setRestrictedModel(e.target.value)}
                 className="w-full px-3 py-2 bg-canvas border border-hairline rounded-lg text-xs text-body focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary"
               >
                 <option value="">All Models (Unrestricted)</option>
                 <option value="claude-opus-4.8">Claude Opus 4.8 Only</option>
                 <option value="claude-opus-4.7">Claude Opus 4.7 Only</option>
                 <option value="claude-opus-4.6">Claude Opus 4.6 Only</option>
               </select>
               <p className="text-[10px] text-muted-soft leading-tight">If restricted, clients using this API key can only call the selected model.</p>
             </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setShowGenerateModal(false); setNewKeyName(''); }}
                className="px-3.5 py-1.5 hover:bg-surface-soft border border-hairline text-body rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-primary hover:bg-primary-active text-white rounded-lg text-xs font-semibold shadow-none"
              >
                Generate Key
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Key success Display Modal (Copy-Once) */}
      {generatedKeyToDisplay && (
        <div className="fixed inset-0 bg-surface-dark/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-canvas border border-hairline rounded-xl p-6 max-w-md w-full space-y-4 shadow-none">
            <div className="flex items-center gap-2 text-primary">
              <Check className="w-5 h-5 bg-surface-soft p-1 rounded-full border border-hairline" />
              <h3 className="text-lg font-normal text-ink font-serif tracking-tight">API Key Generated</h3>
            </div>
            <p className="text-xs text-muted-soft leading-relaxed">
              This is your unique API key with a premium <strong className="font-mono text-[11px]">nx_live_xxxxxxxxxx</strong> prefix. Please copy and save it in a secure place. For your security, <strong className="text-ink">you will not be able to view this key again</strong> once you close this dialog.
            </p>
            <div className="flex items-center gap-2 bg-surface-soft p-3 rounded-lg border border-hairline font-mono text-xs text-body break-all select-all">
              <code className="flex-1 text-left">{generatedKeyToDisplay}</code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generatedKeyToDisplay);
                  showToast('API key copied!', 'success');
                }}
                className="p-1.5 hover:bg-surface-cream-strong rounded text-muted-soft hover:text-primary shrink-0 transition-colors"
                title="Copy Key"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setGeneratedKeyToDisplay(null)}
                className="px-4 py-2 bg-primary hover:bg-primary-active text-white rounded-lg text-xs font-semibold shadow-none transition-all cursor-pointer"
              >
                I have copied the key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function UsageView({ showToast, credits, currentUser }: ViewProps) {
  const userEmail = currentUser?.email || 'satyamkadavla19@gmail.com';
  const [selectedEmail, setSelectedEmail] = useState<string>(userEmail);
  const [stats, setStats] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const ADMIN_EMAILS = ['satyamkadavla79@gmail.com', 'satyamkadavla19@gmail.com', 'aryansomani9@gmail.com'];
  const userIsAdmin = ADMIN_EMAILS.includes(userEmail.toLowerCase().trim());

  // Fetch the dynamic usages from our backend
  const fetchUsages = async (emailToFetch: string, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch(`/api/usages?email=${encodeURIComponent(userEmail)}&targetEmail=${encodeURIComponent(emailToFetch)}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        showToast('Failed to retrieve real-time usage stats', 'info');
      }
    } catch (err) {
      console.error('Failed to fetch usages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch approved users list for admin selector dropdown
  const fetchRegisteredUsers = async () => {
    if (!userIsAdmin) return;
    try {
      const res = await fetch(`/api/admin/registered-users?email=${encodeURIComponent(userEmail)}`);
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch registered users:', err);
    }
  };

  useEffect(() => {
    fetchUsages(selectedEmail);
  }, [selectedEmail, userEmail]);

  useEffect(() => {
    fetchRegisteredUsers();
  }, [userEmail]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchUsages(selectedEmail, true);
    if (userIsAdmin) {
      await fetchRegisteredUsers();
    }
    setTimeout(() => setIsRefreshing(false), 600);
    showToast('Usage statistics synchronized', 'success');
  };

  // Calculate stats to display
  const totalRequestsCount = stats?.totalRequests ?? 0;
  const creditsUsedCount = stats?.creditsUsed ?? 0;
  const remainingCredits = stats?.creditsRemaining ?? credits;
  const inputTokensCount = stats?.tokensInput ?? 0;
  const outputTokensCount = stats?.tokensOutput ?? 0;
  const totalTokensCount = inputTokensCount + outputTokensCount;

  const chatRequestsCount = stats?.chatRequests ?? 0;
  const codeRequestsCount = stats?.codeRequests ?? 0;
  const coworkRequestsCount = stats?.coworkRequests ?? 0;

  // Group logs into last 7 days for the traffic bar chart dynamically
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const barChartData = [0, 0, 0, 0, 0, 0, 0].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return {
      label: days[d.getDay()],
      dateStr: d.toDateString(),
      value: 0,
      spent: 0
    };
  }).reverse();

  if (stats?.logs) {
    stats.logs.forEach((log: any) => {
      const logDate = new Date(log.created_at).toDateString();
      const match = barChartData.find(b => b.dateStr === logDate);
      if (match) {
        match.value += 1;
        match.spent += parseFloat(log.credits_used || 0);
      }
    });
  }

  // Group by model for cost breakdown
  const modelCostMap: Record<string, { tokens: number, spent: number }> = {};
  if (stats?.logs) {
    stats.logs.forEach((log: any) => {
      const model = log.model_used || 'command-a-03-2025';
      const tokens = (log.tokens_input || 0) + (log.tokens_output || 0);
      const spent = parseFloat(log.credits_used || 0);
      if (!modelCostMap[model]) {
        modelCostMap[model] = { tokens: 0, spent: 0 };
      }
      modelCostMap[model].tokens += tokens;
      modelCostMap[model].spent += spent;
    });
  }

  const modelCosts = Object.entries(modelCostMap).map(([model, info]) => ({
    name: model,
    tokens: info.tokens,
    spent: info.spent
  }));

  // Render stats metrics layout
  const cards = [
    { title: 'Total API Requests', value: totalRequestsCount.toLocaleString(), subtitle: 'All Workspace Activities', icon: Activity },
    { title: 'Prepaid Balance', value: `$${remainingCredits.toFixed(4)}`, subtitle: 'Available Credits Pool', icon: Zap, highlight: true },
    { title: 'Total Credits Spent', value: `$${creditsUsedCount.toFixed(4)}`, subtitle: 'Cumulative Usage Cost', icon: TrendingUp },
    { title: 'Tokens Handled', value: totalTokensCount.toLocaleString(), subtitle: `${inputTokensCount.toLocaleString()} In / ${outputTokensCount.toLocaleString()} Out`, icon: Cpu },
  ];

  return (
    <div className="px-4 py-6 md:p-8 space-y-6 max-w-4xl mx-auto bg-canvas text-body font-sans w-full overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-normal text-ink font-serif tracking-tight">Usage Analytics</h2>
          <p className="text-xs text-muted-soft mt-1 leading-relaxed">
            Real-time gateway statistics, token computations, and active prepaid balance tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {userIsAdmin && (
            <div className="flex items-center gap-1.5 border border-hairline rounded-lg px-2.5 py-1.5 bg-surface shadow-none text-xs">
              <span className="text-[10px] uppercase font-bold text-muted tracking-wider">User:</span>
              <select
                value={selectedEmail}
                onChange={(e) => setSelectedEmail(e.target.value)}
                className="bg-transparent border-none text-ink font-medium focus:ring-0 cursor-pointer outline-none max-w-[200px]"
              >
                <option value={userEmail}>Me ({userEmail})</option>
                {allUsers
                  .filter((u) => u.email.toLowerCase() !== userEmail.toLowerCase())
                  .map((u) => (
                    <option key={u.email} value={u.email}>
                      {u.name ? `${u.name} (${u.email})` : u.email}
                    </option>
                  ))}
              </select>
            </div>
          )}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="flex items-center justify-center p-2 border border-hairline hover:bg-surface-cream rounded-lg text-muted transition-all active:scale-95 disabled:opacity-50"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 text-center text-muted-soft text-xs font-medium space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted" />
          <p>Compiling real-time gateway statistics...</p>
        </div>
      ) : (
        <>
          {/* Main Stats Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {cards.map((card, idx) => {
              const IconComp = card.icon;
              return (
                <div
                  key={idx}
                  className={`border border-hairline p-5 rounded-xl transition-all shadow-none ${
                    card.highlight
                      ? 'bg-gradient-to-br from-surface to-emerald-50/20 border-emerald-200/50'
                      : 'bg-surface-card'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-wider">{card.title}</p>
                    <IconComp className={`w-3.5 h-3.5 ${card.highlight ? 'text-primary' : 'text-muted-soft'}`} />
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-normal text-ink font-serif tracking-tight">{card.value}</span>
                  </div>
                  <p className="text-[10px] text-muted-soft mt-1">{card.subtitle}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Traffic Distribution Chart */}
            <div className="md:col-span-2 bg-surface-card border border-hairline p-6 rounded-xl shadow-none">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-medium text-ink font-serif">Daily Traffic Volume</h3>
                  <p className="text-[11px] text-muted-soft">Gateway requests routed in the last 7 days.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-[10px] font-bold uppercase text-muted tracking-wider">Gateway Requests</span>
                </div>
              </div>

              <div className="h-48 flex items-end justify-between gap-3 pt-2 px-1 select-none">
                {barChartData.map((bar, idx) => {
                  const maxVal = Math.max(...barChartData.map((b) => b.value), 5);
                  const barHeightPct = (bar.value / maxVal) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group cursor-pointer">
                      <div className="w-full relative bg-surface rounded-lg hover:bg-surface-cream-strong transition-colors flex items-end h-36 overflow-hidden border border-hairline-soft">
                        <div
                          className="w-full bg-primary rounded-b-md transition-all duration-500"
                          style={{ height: `${barHeightPct}%` }}
                        />
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-surface-dark text-on-dark text-[9px] py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-none font-mono">
                          {bar.value} reqs
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-soft font-medium">{bar.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Model Cost & Category Breakdown */}
            <div className="bg-surface-card border border-hairline p-6 rounded-xl shadow-none flex flex-col justify-between">
              <div>
                <h3 className="font-medium text-ink font-serif mb-1">Workspace Breakdown</h3>
                <p className="text-[11px] text-muted-soft mb-4">Volume grouped by prompt category.</p>

                <div className="space-y-3.5">
                  {[
                    { label: 'General Chat', count: chatRequestsCount, color: 'bg-emerald-500' },
                    { label: 'Coding Assistant', count: codeRequestsCount, color: 'bg-blue-500' },
                    { label: 'Workspace Coworker', count: coworkRequestsCount, color: 'bg-purple-500' },
                  ].map((category, idx) => {
                    const total = Math.max(totalRequestsCount, 1);
                    const pct = ((category.count / total) * 100).toFixed(0);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs text-body font-medium">
                          <span className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${category.color}`} />
                            {category.label}
                          </span>
                          <span className="font-mono text-[11px] text-muted-soft">
                            {category.count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-surface rounded-full h-1.5 border border-hairline-soft overflow-hidden">
                          <div
                            className={`h-full ${category.color} rounded-full transition-all`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-hairline-soft">
                <div className="flex justify-between text-[10px] text-muted uppercase tracking-wider font-bold mb-2">
                  <span>Model Costs</span>
                  <span>Credits</span>
                </div>
                {modelCosts.length > 0 ? (
                  <div className="space-y-2 max-h-[80px] overflow-y-auto">
                    {modelCosts.map((model, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-body">
                        <span className="font-mono text-muted-soft truncate max-w-[120px]" title={model.name}>
                          {model.name}
                        </span>
                        <span className="font-mono text-primary font-semibold">
                          {model.spent.toFixed(4)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-soft italic">No costs logged yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Activity Logs Table */}
          <div className="bg-surface-card border border-hairline p-6 rounded-xl shadow-none">
            <h3 className="font-medium text-ink font-serif mb-1">Recent Activity Logs</h3>
            <p className="text-[11px] text-muted-soft mb-4">Complete trace of recent API executions and credit impact.</p>
            {stats?.logs && stats.logs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[650px]">
                  <thead>
                    <tr className="border-b border-hairline-soft text-muted font-medium uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 pb-2">Timestamp</th>
                      <th className="py-2.5 pb-2">Workspace Type</th>
                      <th className="py-2.5 pb-2">Selected Model</th>
                      <th className="py-2.5 pb-2">Tokens (In / Out)</th>
                      <th className="py-2.5 pb-2 text-right">Credits Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline-soft text-body">
                    {stats.logs.map((log: any, idx: number) => (
                      <tr key={log.id || idx} className="hover:bg-surface-cream/40 transition-colors">
                        <td className="py-3 font-mono text-muted-soft">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                              log.request_type === 'code'
                                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                : log.request_type === 'cowork'
                                ? 'bg-purple-50 text-purple-700 border border-purple-100'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            }`}
                          >
                            {log.request_type || 'chat'}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-ink">
                          {log.model_used || 'cohere-default'}
                        </td>
                        <td className="py-3 font-mono text-muted-soft">
                          {log.tokens_input?.toLocaleString()} / {log.tokens_output?.toLocaleString()}
                        </td>
                        <td className="py-3 font-mono text-right text-primary font-medium">
                          -${parseFloat(log.credits_used || 0).toFixed(6)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-soft border border-dashed border-hairline rounded-lg">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-muted" />
                <p className="text-xs font-medium text-ink">No recent usage activity has been logged for this user.</p>
                <p className="text-[10px] mt-1 opacity-70">Trigger a chat interaction, code assistant, or cowork prompt to generate real-time metrics.</p>
              </div>
            )}
          </div>

          {/* Supabase SQL Blueprint Helper for Admin */}
          {userIsAdmin && (
            <div className="bg-surface-card border border-hairline p-6 rounded-xl shadow-none space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  <h3 className="font-medium text-ink font-serif text-sm">Supabase DB Schema Setup</h3>
                </div>
                <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">Admin Only</span>
              </div>
              <p className="text-[11px] text-muted-soft leading-relaxed">
                Run this SQL query in your Supabase SQL Editor to successfully provision all the database tables with exact matching columns and real-time triggers. This prevents any storage failures.
              </p>
              <div className="relative">
                <pre className="text-[10px] font-mono bg-surface p-4 rounded-lg overflow-x-auto text-muted-soft border border-hairline max-h-48 leading-relaxed">
{`-- 1. Create access_requests table
CREATE TABLE IF NOT EXISTS access_requests (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  credits NUMERIC DEFAULT 10.00,
  rpm_limit INTEGER DEFAULT 60,
  credits_expiry TIMESTAMPTZ,
  approved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

-- 2. Create user_usage table
CREATE TABLE IF NOT EXISTS public.user_usage (
    id uuid default gen_random_uuid() primary key,
    user_email text not null unique,
    total_requests integer default 0 not null,
    chat_requests integer default 0 not null,
    coding_requests integer default 0 not null,
    cowork_requests integer default 0 not null,
    credits_spent numeric(12, 6) default 0.000000 not null,
    input_tokens integer default 0 not null,
    output_tokens integer default 0 not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for instant lookups by user email
CREATE INDEX IF NOT EXISTS user_usage_user_email_idx on public.user_usage(user_email);

-- 3. Create google_credentials table
CREATE TABLE IF NOT EXISTS google_credentials (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  client_secret TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create platform_api_keys table
CREATE TABLE IF NOT EXISTS platform_api_keys (
  key TEXT PRIMARY KEY,
  name TEXT,
  created TEXT,
  active BOOLEAN DEFAULT TRUE,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  user_email TEXT,
  restricted_model TEXT
);

-- Migration for existing databases (Run this if you already have the tables):
-- ALTER TABLE platform_api_keys ADD COLUMN IF NOT EXISTS user_email TEXT;
-- ALTER TABLE platform_api_keys ADD COLUMN IF NOT EXISTS restricted_model TEXT;

-- 5. Create user_history table
CREATE TABLE IF NOT EXISTS user_history (
  id UUID PRIMARY KEY,
  user_email TEXT NOT NULL,
  title TEXT DEFAULT 'New Chat',
  category TEXT DEFAULT 'chat',
  messages JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`}
                </pre>
                <button
                  onClick={() => {
                    const sql = `-- 1. Create access_requests table\nCREATE TABLE IF NOT EXISTS access_requests (\n  id TEXT PRIMARY KEY,\n  name TEXT,\n  email TEXT UNIQUE NOT NULL,\n  status TEXT DEFAULT 'pending',\n  credits NUMERIC DEFAULT 10.00,\n  rpm_limit INTEGER DEFAULT 60,\n  credits_expiry TIMESTAMPTZ,\n  approved_by TEXT,\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  approved_at TIMESTAMPTZ\n);\n\n-- 2. Create user_usage table\nCREATE TABLE IF NOT EXISTS public.user_usage (\n    id uuid default gen_random_uuid() primary key,\n    user_email text not null unique,\n    total_requests integer default 0 not null,\n    chat_requests integer default 0 not null,\n    coding_requests integer default 0 not null,\n    cowork_requests integer default 0 not null,\n    credits_spent numeric(12, 6) default 0.000000 not null,\n    input_tokens integer default 0 not null,\n    output_tokens integer default 0 not null,\n    created_at timestamp with time zone default timezone('utc'::text, now()) not null,\n    updated_at timestamp with time zone default timezone('utc'::text, now()) not null\n);\n\nCREATE INDEX IF NOT EXISTS user_usage_user_email_idx on public.user_usage(user_email);\n\n-- 3. Create google_credentials table\nCREATE TABLE IF NOT EXISTS google_credentials (\n  id TEXT PRIMARY KEY,\n  client_id TEXT,\n  client_secret TEXT,\n  updated_at TIMESTAMPTZ DEFAULT NOW()\n);\n\n-- 4. Create platform_api_keys table\nCREATE TABLE IF NOT EXISTS platform_api_keys (\n  key TEXT PRIMARY KEY,\n  name TEXT,\n  created TEXT,\n  active BOOLEAN DEFAULT TRUE,\n  input_tokens INTEGER DEFAULT 0,\n  output_tokens INTEGER DEFAULT 0,\n  total_tokens INTEGER DEFAULT 0,\n  user_email TEXT,\n  restricted_model TEXT\n);\n\n-- Migration for existing databases:\n-- ALTER TABLE platform_api_keys ADD COLUMN IF NOT EXISTS user_email TEXT;\n-- ALTER TABLE platform_api_keys ADD COLUMN IF NOT EXISTS restricted_model TEXT;\n\n-- 5. Create user_history table\nCREATE TABLE IF NOT EXISTS user_history (\n  id UUID PRIMARY KEY,\n  user_email TEXT NOT NULL,\n  title TEXT DEFAULT 'New Chat',\n  category TEXT DEFAULT 'chat',\n  messages JSONB DEFAULT '[]'::jsonb,\n  updated_at TIMESTAMPTZ DEFAULT NOW()\n);`;
                    navigator.clipboard.writeText(sql);
                    showToast('Supabase SQL Schema copied to clipboard!', 'success');
                  }}
                  className="absolute top-3 right-3 p-1.5 bg-surface hover:bg-surface-cream border border-hairline rounded-md text-muted transition-all active:scale-95"
                  title="Copy Schema SQL"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Props interface to link with google access token state
interface IntegrationsProps {
  currentUser?: any;
  showToast: (msg: string, type?: 'success' | 'info') => void;
  googleAccessToken: string | null;
  googleUser: any;
  onGoogleConnect: () => Promise<void>;
  onGoogleDisconnect: () => void;
  githubToken: string | null;
  onGithubConnect: (token: string) => void;
  onGithubDisconnect: () => void;
}

export function IntegrationsView({
  currentUser,
  showToast,
  googleAccessToken,
  googleUser,
  onGoogleConnect,
  onGoogleDisconnect,
  githubToken,
  onGithubConnect,
  onGithubDisconnect
}: IntegrationsProps) {
  const [githubInput, setGithubInput] = useState('');
  const [showGithubModal, setShowGithubModal] = useState(false);

  // Custom credentials management state
  const [googleCreds, setGoogleCreds] = useState({ clientId: '', clientSecret: '', isCustom: false });
  const [editingCreds, setEditingCreds] = useState(false);
  const [newClientId, setNewClientId] = useState('');
  const [newClientSecret, setNewClientSecret] = useState('');
  const [savingCreds, setSavingCreds] = useState(false);

  // Load user credentials on component mount
  useEffect(() => {
    fetch('/api/auth/google/credentials')
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new TypeError("Did not receive JSON payload");
        }
        return res.json();
      })
      .then(data => {
        setGoogleCreds(data);
        setNewClientId(data.clientId || '');
        setNewClientSecret(data.clientSecret || '');
      })
      .catch(err => {
        console.error('Error loading custom Google Credentials:', err);
      });
  }, []);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientId.trim() || !newClientSecret.trim()) {
      showToast('Please provide both a valid Client ID and Client Secret.', 'info');
      return;
    }
    setSavingCreds(true);
    try {
      const res = await fetch('/api/auth/google/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: newClientId, clientSecret: newClientSecret })
      });
      if (res.ok) {
        showToast('Google credentials saved to backend successfully!', 'success');
        setEditingCreds(false);
        setGoogleCreds({
          clientId: newClientId,
          clientSecret: newClientSecret.length > 8 ? newClientSecret.substring(0, 8) + '••••••••' : '••••••••••••',
          isCustom: true
        });
      } else {
        showToast('Failed to save credentials to backend server.', 'info');
      }
    } catch (err) {
      console.error('Error saving credentials:', err);
      showToast('An unexpected error occurred while saving credentials.', 'info');
    } finally {
      setSavingCreds(false);
    }
  };

  // Define the 6 Specific Workspace Connectors requested by the user
  const connectors = [
    {
      id: 'gmail',
      name: 'Gmail Service',
      desc: 'Allows reading, analyzing unread emails, and drafting secure email communications directly from the chat session.',
      icon: Mail,
      color: 'bg-canvas text-primary border-hairline',
      connected: !!googleAccessToken,
      isGoogle: true,
      features: ['List unread emails', 'Read mail body details', 'Send emails after explicit confirmation']
    },
    {
      id: 'calendar',
      name: 'Google Calendar',
      desc: 'Inject, inspect, and add upcoming events, scheduling meetings and managing calendar details via standard dialogue.',
      icon: Calendar,
      color: 'bg-canvas text-primary border-hairline',
      connected: !!googleAccessToken,
      isGoogle: true,
      features: ['List upcoming primary events', 'Schedule new calendar events', 'Configure durations and timezone blocks']
    },
    {
      id: 'docs',
      name: 'Google Docs',
      desc: 'Direct integration with Google Docs to create, append content, and manage document drafts within chat pipelines.',
      icon: FileText,
      color: 'bg-canvas text-primary border-hairline',
      connected: !!googleAccessToken,
      isGoogle: true,
      features: ['Create fresh word documents', 'Append content dynamically', 'Formulate documents and project specs']
    },
    {
      id: 'sheets',
      name: 'Google Sheets',
      desc: 'Synchronize spreadsheet datasets, read tables, append row entries, and perform cell computations programmatically.',
      icon: FileSpreadsheet,
      color: 'bg-canvas text-primary border-hairline',
      connected: !!googleAccessToken,
      isGoogle: true,
      features: ['Initialize secure spreadsheets', 'Query cell value ranges', 'Append ledger or record lines']
    },
    {
      id: 'drive',
      name: 'Google Drive',
      desc: 'Browse, find, and access file nodes in your Drive account. Provide references to the AI context to parse directories.',
      icon: HardDrive,
      color: 'bg-canvas text-primary border-hairline',
      connected: !!googleAccessToken,
      isGoogle: true,
      features: ['List folder directories', 'Browse file nodes and metadata', 'Link Drive links with prompt chains']
    },
    {
      id: 'github',
      name: 'GitHub Connector',
      desc: 'Track and sync repo revisions, manage active issues, list commits, and align dev pipelines directly from chat.',
      icon: Github,
      color: 'bg-canvas text-primary border-hairline',
      connected: !!githubToken,
      isGoogle: false,
      features: ['List user repositories', 'Inspect repository issues', 'Verify commit timelines']
    }
  ];

  const handleGoogleAction = async () => {
    if (googleAccessToken) {
      onGoogleDisconnect();
      showToast('Disconnected Google Workspace account', 'info');
    } else {
      try {
        await onGoogleConnect();
        showToast('Successfully authenticated Google Workspace!', 'success');
      } catch (err) {
        showToast('Authentication was cancelled', 'info');
      }
    }
  };

  const handleGithubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubInput.trim()) return;
    onGithubConnect(githubInput);
    setGithubInput('');
    setShowGithubModal(false);
    showToast('Connected GitHub integration!', 'success');
  };

  const handleGithubDisconnect = () => {
    onGithubDisconnect();
    showToast('GitHub disconnected', 'info');
  };

  return (
    <div className="px-4 py-6 md:p-8 space-y-6 max-w-4xl mx-auto font-sans bg-canvas text-body w-full overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-normal text-ink font-serif tracking-tight">Workspace Integrations</h2>
          <p className="text-xs text-muted-soft mt-1 leading-relaxed">Securely connect Aira.Ai to Google Cloud Services and continuous integration providers to power real-time workflows.</p>
        </div>
        {googleAccessToken && (
          <div className="flex items-center gap-1.5 bg-surface-card border border-hairline px-3 py-1.5 rounded-lg select-none">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-[11px] font-medium text-ink truncate max-w-[200px]">
              Active: {googleUser?.email || 'Connected Account'}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {connectors.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="bg-surface-card border border-hairline p-5 rounded-xl shadow-none flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-3.5">
                  <div className={`p-2 rounded-lg border ${item.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${
                      item.connected 
                        ? 'bg-canvas border-hairline text-primary' 
                        : 'bg-surface-soft border-transparent text-muted-soft'
                    }`}>
                      {item.connected ? 'CONNECTED' : 'DISCONNECTED'}
                    </span>
                  </div>
                </div>

                <h3 className="font-medium text-ink text-base font-serif">{item.name}</h3>
                <p className="text-xs text-muted-soft mt-1.5 leading-relaxed">{item.desc}</p>

                {/* Capabilities list */}
                <div className="mt-4 pt-3 border-t border-hairline-soft space-y-1.5">
                  <span className="text-[10px] font-medium text-muted uppercase tracking-wider block">SUPPORTED IN CHAT:</span>
                  {item.features.map((feat, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-body">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-hairline-soft flex items-center justify-between">
                <span className="text-[10px] text-muted-soft font-mono">OAuth 2.0 SSL Gateway</span>
                {item.isGoogle ? (
                  <button
                    onClick={handleGoogleAction}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-none transition-all cursor-pointer ${
                      item.connected
                        ? 'bg-canvas border border-hairline text-body hover:bg-surface-soft'
                        : 'bg-primary hover:bg-primary-active text-white'
                    }`}
                  >
                    {item.connected ? 'Disconnect' : 'Connect Account'}
                  </button>
                ) : (
                  <button
                    onClick={item.connected ? handleGithubDisconnect : () => setShowGithubModal(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-none transition-all cursor-pointer ${
                      item.connected
                        ? 'bg-canvas border border-hairline text-body hover:bg-surface-soft'
                        : 'bg-primary hover:bg-primary-active text-white'
                    }`}
                  >
                    {item.connected ? 'Disconnect' : 'Connect Repo'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic Google OAuth Setup Guide & Custom Credentials Configurator */}
      {currentUser?.role === 'admin' && (
        <div className="bg-surface-dark text-on-dark rounded-xl border border-hairline/10 p-6 shadow-none space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/5 text-primary rounded-lg border border-white/10">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-white font-serif text-base">Configure Google Cloud Credentials</h3>
              <p className="text-[11px] text-on-dark-soft">Save your custom client credentials locally on the server to prevent Google authorization errors.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingCreds(!editingCreds);
              if (!editingCreds) {
                setNewClientId(googleCreds.clientId);
                setNewClientSecret('');
              }
            }}
            className="px-3 py-1.5 bg-surface-dark-elevated hover:bg-white/10 text-on-dark border border-white/10 rounded-lg text-xs font-medium shrink-0 cursor-pointer transition-all active:scale-95"
          >
            {editingCreds ? 'Cancel Editing' : 'Edit Credentials'}
          </button>
        </div>

        {/* Credentials Form or Status Banner */}
        {editingCreds ? (
          <form onSubmit={handleSaveCredentials} className="bg-surface-dark-soft p-4 rounded-lg border border-white/5 space-y-4">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">Update Google OAuth Credentials</span>
            <div className="grid grid-cols-1 gap-3.5">
              <div className="space-y-1">
                <label className="text-[11px] text-on-dark-soft font-medium">Google Client ID</label>
                <input
                  type="text"
                  value={newClientId}
                  onChange={(e) => setNewClientId(e.target.value)}
                  placeholder="e.g. 123456789-abc123xyz.apps.googleusercontent.com"
                  className="w-full px-3 py-2 bg-surface-dark border border-white/10 rounded-lg text-xs font-mono text-on-dark focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-on-dark-soft font-medium">Google Client Secret</label>
                <input
                  type="password"
                  value={newClientSecret}
                  onChange={(e) => setNewClientSecret(e.target.value)}
                  placeholder="Paste your client secret (masked for safety)"
                  className="w-full px-3 py-2 bg-surface-dark border border-white/10 rounded-lg text-xs font-mono text-on-dark focus:outline-none focus:border-primary"
                  required
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-[10px] text-on-dark-soft">
                💾 Saved in <code className="font-mono text-primary">google_credentials.json</code>
              </span>
              <button
                type="submit"
                disabled={savingCreds}
                className="px-4 py-1.5 bg-primary hover:bg-primary-active disabled:opacity-50 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5"
              >
                {savingCreds ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" /> Saving...
                  </>
                ) : 'Save Credentials'}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-dark-soft p-3.5 rounded-lg border border-white/5 space-y-1">
              <span className="text-[9px] font-bold text-on-dark-soft uppercase tracking-wider block">CURRENT CLIENT ID</span>
              <span className="font-mono text-xs text-on-dark break-all block truncate" title={googleCreds.clientId}>
                {googleCreds.clientId || 'None configured (Using default client)'}
              </span>
            </div>
            <div className="bg-surface-dark-soft p-3.5 rounded-lg border border-white/5 space-y-1">
              <span className="text-[9px] font-bold text-on-dark-soft uppercase tracking-wider block">CURRENT CLIENT SECRET</span>
              <span className="font-mono text-xs text-on-dark block">
                {googleCreds.clientSecret || 'None configured (Using default client)'}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 border-t border-white/10">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-on-dark-soft uppercase tracking-wider block">1. Authorized Redirect URI (Development)</span>
            <div className="flex items-center gap-2 bg-surface-dark-soft px-3 py-2 rounded-lg border border-white/5 font-mono text-xs text-primary">
              <span className="flex-1 truncate">{window.location.origin}/api/auth/google/callback</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/api/auth/google/callback`);
                  showToast('Copied development redirect URI!', 'success');
                }}
                className="text-on-dark-soft hover:text-white transition-colors cursor-pointer"
                title="Copy Link"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-on-dark-soft uppercase tracking-wider block">2. Authorized Redirect URI (Shared/Deployed)</span>
            <div className="flex items-center gap-2 bg-surface-dark-soft px-3 py-2 rounded-lg border border-white/5 font-mono text-xs text-primary">
              <span className="flex-1 truncate">https://ais-pre-7pz3fku4hnmtzcbxjbhhzg-335762143281.asia-east1.run.app/api/auth/google/callback</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://ais-pre-7pz3fku4hnmtzcbxjbhhzg-335762143281.asia-east1.run.app/api/auth/google/callback`);
                  showToast('Copied shared redirect URI!', 'success');
                }}
                className="text-on-dark-soft hover:text-white transition-colors cursor-pointer"
                title="Copy Link"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="text-xs text-on-dark-soft leading-relaxed pt-2 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <strong className="text-primary font-medium">Where is this data saved?</strong>
            <p className="text-on-dark-soft mt-1">
              Your Google Cloud Client ID & Secret are written directly to <code className="font-mono text-primary text-[11px] bg-surface-dark-soft px-1.5 py-0.5 rounded">google_credentials.json</code> on the server's workspace folder. They are completely secure, private to your account, and persistent across page reloads.
            </p>
          </div>
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-white font-semibold shrink-0 cursor-pointer"
          >
            Google Cloud Console <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
      )}

      {/* GitHub connection modal */}
      {showGithubModal && (
        <div className="fixed inset-0 bg-surface-dark/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <form onSubmit={handleGithubSubmit} className="bg-canvas border border-hairline rounded-xl p-6 max-w-sm w-full space-y-4 shadow-none">
            <h3 className="text-lg font-normal text-ink font-serif tracking-tight flex items-center gap-2">
              <Github className="w-5 h-5 text-ink" /> Connect GitHub
            </h3>
            <p className="text-xs text-muted-soft">Provide a GitHub Personal Access Token (PAT) with repository scopes to sync workspaces.</p>
            <input
              type="password"
              required
              placeholder="ghp_xxxxxxxxxxxx"
              value={githubInput}
              onChange={(e) => setGithubInput(e.target.value)}
              className="w-full px-3 py-2 bg-canvas border border-hairline rounded-lg text-xs focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setShowGithubModal(false); setGithubInput(''); }}
                className="px-3.5 py-1.5 hover:bg-surface-soft border border-hairline text-body rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-primary hover:bg-primary-active text-white rounded-lg text-xs font-semibold shadow-none"
              >
                Link Token
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export function SettingsView({ showToast }: ViewProps) {
  const [prefState, setPrefState] = useState({
    theme: 'light',
    systemInference: 'auto',
    safetyFilter: 'moderate',
    temperature: 0.7,
    maxTokens: 4096,
  });

  const saveSettings = () => {
    showToast('Preferences updated successfully!');
  };

  return (
    <div className="px-4 py-6 md:p-8 space-y-6 max-w-3xl mx-auto bg-canvas text-body font-sans w-full overflow-x-hidden">
      <div>
        <h2 className="text-2xl font-normal text-ink font-serif tracking-tight">System Preferences</h2>
        <p className="text-xs text-muted-soft mt-1 leading-relaxed">Fine-tune the model parameters, latency controls, and defaults for your Aira.Ai session.</p>
      </div>

      <div className="bg-surface-card border border-hairline rounded-xl p-6 space-y-6 shadow-none">
        <h3 className="font-medium text-ink pb-3 border-b border-hairline-soft flex items-center gap-2 font-serif">
          <Sliders className="w-4 h-4 text-primary" /> Default Model Parameters
        </h3>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm font-medium text-body">
            <label className="flex items-center gap-1.5 text-ink">
              Temperature
              <span className="text-xs font-normal text-muted-soft">(controls random creativity)</span>
            </label>
            <span className="font-mono bg-canvas border border-hairline px-2 py-0.5 rounded text-xs font-semibold text-primary">
              {prefState.temperature}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.1"
            value={prefState.temperature}
            onChange={(e) => setPrefState({ ...prefState, temperature: parseFloat(e.target.value) })}
            className="w-full accent-primary cursor-pointer"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm font-medium text-body">
            <label className="flex items-center gap-1.5 text-ink">
              Max Response Tokens
              <span className="text-xs font-normal text-muted-soft">(bounds computation safety)</span>
            </label>
            <span className="font-mono bg-canvas border border-hairline px-2 py-0.5 rounded text-xs font-semibold text-primary">
              {prefState.maxTokens}
            </span>
          </div>
          <input
            type="range"
            min="512"
            max="16384"
            step="512"
            value={prefState.maxTokens}
            onChange={(e) => setPrefState({ ...prefState, maxTokens: parseInt(e.target.value) })}
            className="w-full accent-primary cursor-pointer"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-ink">Safety Guard Mode</label>
          <div className="grid grid-cols-3 gap-2 bg-canvas p-1 rounded-lg border border-hairline">
            {['strict', 'moderate', 'relaxed'].map((safety) => (
              <button
                key={safety}
                onClick={() => setPrefState({ ...prefState, safetyFilter: safety })}
                className={`py-1 rounded-md text-xs font-medium capitalize transition-all cursor-pointer ${
                  prefState.safetyFilter === safety
                    ? 'bg-surface-card text-primary border border-hairline-soft shadow-none'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {safety}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-ink block">Routing Strategy</label>
          <select
            value={prefState.systemInference}
            onChange={(e) => setPrefState({ ...prefState, systemInference: e.target.value })}
            className="w-full px-3 py-2 bg-canvas border border-hairline rounded-lg text-xs font-medium text-body focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary"
          >
            <option value="auto">Auto-Inference (Fastest routing path)</option>
            <option value="cost">Cost Optimization (Prefers cheaper nodes)</option>
            <option value="quality">Quality Optimization (Always routes to high-reasoning models)</option>
          </select>
        </div>

        <div className="pt-4 border-t border-hairline-soft flex justify-end gap-3">
          <button
            onClick={() => showToast('Changes reverted')}
            className="px-3.5 py-1.5 hover:bg-surface-soft border border-hairline text-body rounded-lg text-xs font-medium"
          >
            Revert Defaults
          </button>
          <button
            onClick={saveSettings}
            className="px-3.5 py-1.5 bg-primary hover:bg-primary-active text-white rounded-lg text-xs font-semibold"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminPanelView({ showToast }: ViewProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'invitations' | 'add-user' | 'pricing' | 'billing'>('invitations');
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingInvitations: 0,
    totalRequests: 0,
    totalTokens: 0,
    activeModelsCount: 5,
    activeKeysCount: 0,
    totalCreditsProvided: 0,
    totalCreditsUsed: 0
  });
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Billing tab states
  const [billingStats, setBillingStats] = useState<any[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [selectedUserBilling, setSelectedUserBilling] = useState<any>(null);

  // Upstream API configurations state
  const [configs, setConfigs] = useState<any[]>([]);
  const [configsLoading, setConfigsLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Form state
  const [formConfig, setFormConfig] = useState({
    id: '',
    label: '',
    provider: 'cohere',
    api_key: '',
    endpoint_url: 'https://api.cohere.com/v2/chat',
    model_name: 'command-r-plus',
    rpm_limit: '',
    tpm_limit: '',
    status: 'active',
    priority: '1'
  });

  // Testing states
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [formTesting, setFormTesting] = useState(false);
  const [formTestResult, setFormTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const currentUserObj = (() => {
    try {
      const stored = localStorage.getItem('conduit_current_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();
  const adminEmail = currentUserObj?.email || 'satyamkadavla19@gmail.com';

  const fetchConfigs = async () => {
    setConfigsLoading(true);
    try {
      const res = await fetch(`/api/admin/upstream-configs?email=${encodeURIComponent(adminEmail)}`);
      if (res.ok) {
        const data = await res.json();
        setConfigs(data);
      }
    } catch (err) {
      console.error('Failed to fetch configs:', err);
    } finally {
      setConfigsLoading(false);
    }
  };

  const fetchBillingStats = async () => {
    setBillingLoading(true);
    try {
      const res = await fetch(`/api/admin/billing-stats?email=${encodeURIComponent(adminEmail)}`);
      if (res.ok) {
        const data = await res.json();
        setBillingStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch billing stats:', err);
    } finally {
      setBillingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'billing') {
      fetchBillingStats();
    }
  }, [activeTab]);

  const fetchAuditLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/admin/audit-logs?email=${encodeURIComponent(adminEmail)}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formConfig.label || !formConfig.api_key || !formConfig.endpoint_url || !formConfig.model_name) {
      showToast('Please fill out all required fields.', 'info');
      return;
    }

    try {
      const res = await fetch('/api/admin/upstream-configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': adminEmail
        },
        body: JSON.stringify({
          ...formConfig,
          adminEmail
        })
      });

      if (res.ok) {
        showToast(formConfig.id ? 'Upstream configuration updated!' : 'New upstream configuration created!', 'success');
        setFormConfig({
          id: '',
          label: '',
          provider: 'cohere',
          api_key: '',
          endpoint_url: 'https://api.cohere.com/v2/chat',
          model_name: 'command-r-plus',
          rpm_limit: '',
          tpm_limit: '',
          status: 'active',
          priority: '1'
        });
        setFormTestResult(null);
        fetchConfigs();
        fetchAuditLogs();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to save configuration.', 'info');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while saving.', 'info');
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;
    try {
      const res = await fetch(`/api/admin/upstream-configs/${id}?email=${encodeURIComponent(adminEmail)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Upstream configuration deleted.', 'success');
        fetchConfigs();
        fetchAuditLogs();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to delete configuration.', 'info');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while deleting.', 'info');
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/upstream-configs/set-active/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': adminEmail
        },
        body: JSON.stringify({ adminEmail })
      });
      if (res.ok) {
        showToast('Upstream configuration set as active.', 'success');
        fetchConfigs();
        fetchAuditLogs();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to set active.', 'info');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error.', 'info');
    }
  };

  const handleTestConfigInline = async (config: any) => {
    setTestingId(config.id);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/upstream-configs/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': adminEmail
        },
        body: JSON.stringify({
          id: config.id,
          api_key: config.api_key,
          endpoint_url: config.endpoint_url,
          model_name: config.model_name,
          adminEmail
        })
      });
      const data = await res.json();
      setTestResult({
        id: config.id,
        success: data.success,
        message: data.success ? data.message : (data.error || 'Validation failed.')
      });
    } catch (err: any) {
      setTestResult({
        id: config.id,
        success: false,
        message: err.message || 'Connection failure.'
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleTestFormConfig = async () => {
    if (!formConfig.api_key || !formConfig.endpoint_url || !formConfig.model_name) {
      showToast('API Key, Endpoint, and Model Name are required to run test.', 'info');
      return;
    }
    setFormTesting(true);
    setFormTestResult(null);
    try {
      const res = await fetch('/api/admin/upstream-configs/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': adminEmail
        },
        body: JSON.stringify({
          id: formConfig.id,
          api_key: formConfig.api_key,
          endpoint_url: formConfig.endpoint_url,
          model_name: formConfig.model_name,
          adminEmail
        })
      });
      const data = await res.json();
      setFormTestResult({
        success: data.success,
        message: data.success ? data.message : (data.error || 'Validation failed.')
      });
    } catch (err: any) {
      setFormTestResult({
        success: false,
        message: err.message || 'Connection failure.'
      });
    } finally {
      setFormTesting(false);
    }
  };


  // Read Notifications state from localStorage for access request tracking
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('read_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const markNotificationAsRead = (id: string) => {
    const updated = [...readNotificationIds, id];
    setReadNotificationIds(updated);
    localStorage.setItem('read_notifications', JSON.stringify(updated));
    showToast('Notification marked as read.', 'info');
  };

  const markAllNotificationsAsRead = () => {
    const pendingIds = requests.filter(r => r.status === 'pending').map(r => r.id);
    const updated = Array.from(new Set([...readNotificationIds, ...pendingIds]));
    setReadNotificationIds(updated);
    localStorage.setItem('read_notifications', JSON.stringify(updated));
    showToast('All notifications marked as read.', 'success');
  };

  const unreadPendingRequests = requests.filter(
    (r: any) => r.status === 'pending' && !readNotificationIds.includes(r.id)
  );

  // Approval Modal state
  const [approvalModalReq, setApprovalModalReq] = useState<any | null>(null);
  const [modalCredits, setModalCredits] = useState('150.00');
  const [modalRpm, setModalRpm] = useState('60');
  const [modalTpm, setModalTpm] = useState('50000');
  const [modalExpiry, setModalExpiry] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30); // 30 days default
    return d.toISOString().split('T')[0];
  });

  // Edit whitelisted user Modal state
  const [editModalReq, setEditModalReq] = useState<any | null>(null);
  const [editCredits, setEditCredits] = useState('150.00');
  const [editRpm, setEditRpm] = useState('60');
  const [editTpm, setEditTpm] = useState('50000');
  const [editExpiry, setEditExpiry] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  // Add User manual form state
  const [addUserForm, setAddUserForm] = useState({
    name: '',
    email: '',
    credits: '100.00',
    rpmLimit: '60',
    tpmLimit: '50000',
    creditsExpiry: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toISOString().split('T')[0];
    })()
  });

  const [pricing, setPricing] = useState({
    cohereIn: 0.0015,
    cohereOut: 0.0020,
    sonnetIn: 0.003,
    sonnetOut: 0.015,
  });

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/admin/access-requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchRequests();
    const interval = setInterval(() => {
      fetchStats();
      fetchRequests();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleApproveClick = (req: any) => {
    setApprovalModalReq(req);
  };

  const submitApproval = async () => {
    if (!approvalModalReq) return;
    try {
      const res = await fetch(`/api/access-requests/${approvalModalReq.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          credits: parseFloat(modalCredits),
          rpmLimit: parseInt(modalRpm),
          tpmLimit: parseInt(modalTpm),
          creditsExpiry: new Date(modalExpiry).toISOString(),
          approvedBy: 'satyamkadavla79@gmail.com'
        })
      });

      if (res.ok) {
        showToast(`Approved ${approvalModalReq.name} successfully!`, 'success');
        setApprovalModalReq(null);
        fetchStats();
        fetchRequests();
      } else {
        const err = res.headers.get('content-type')?.includes('application/json') ? await res.json() : { error: 'Internal Server Error' };
        showToast(`Failed to approve: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      showToast('Error sending approval request.');
    }
  };

  const handleRejectClick = async (reqId: string, reqName: string) => {
    if (!confirm(`Are you sure you want to decline authorization request from ${reqName}?`)) return;
    try {
      const res = await fetch(`/api/access-requests/${reqId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      });

      if (res.ok) {
        showToast(`Rejected request from ${reqName}.`, 'info');
        fetchStats();
        fetchRequests();
      }
    } catch (err) {
      showToast('Error rejecting user request.');
    }
  };

  const handleEditClick = (req: any) => {
    setEditModalReq(req);
    setEditCredits((req.credits ?? 0).toString());
    setEditRpm((req.rpmLimit ?? 60).toString());
    setEditTpm((req.tpmLimit ?? 50000).toString());
    if (req.creditsExpiry) {
      setEditExpiry(new Date(req.creditsExpiry).toISOString().split('T')[0]);
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setEditExpiry(d.toISOString().split('T')[0]);
    }
  };

  const submitEdit = async () => {
    if (!editModalReq) return;
    try {
      const res = await fetch(`/api/access-requests/${editModalReq.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          credits: parseFloat(editCredits),
          rpmLimit: parseInt(editRpm),
          tpmLimit: parseInt(editTpm),
          creditsExpiry: new Date(editExpiry).toISOString(),
          approvedBy: 'satyamkadavla79@gmail.com'
        })
      });

      if (res.ok) {
        showToast(`Updated whitelisted user ${editModalReq.name} successfully!`, 'success');
        setEditModalReq(null);
        fetchStats();
        fetchRequests();
      } else {
        const err = res.headers.get('content-type')?.includes('application/json') ? await res.json() : { error: 'Internal Server Error' };
        showToast(`Failed to update: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      showToast('Error sending update request.');
    }
  };

  const handleDeleteClick = async (reqId: string, reqName: string) => {
    try {
      const res = await fetch(`/api/access-requests/${reqId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        showToast(`Deleted whitelisted user ${reqName}.`, 'info');
        fetchStats();
        fetchRequests();
      } else {
        showToast('Failed to delete user.');
      }
    } catch (err) {
      showToast('Error deleting user.');
    }
  };

  const handleManualAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/add-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addUserForm.name,
          email: addUserForm.email,
          credits: parseFloat(addUserForm.credits),
          rpmLimit: parseInt(addUserForm.rpmLimit),
          tpmLimit: parseInt(addUserForm.tpmLimit),
          creditsExpiry: new Date(addUserForm.creditsExpiry).toISOString(),
          approvedBy: 'satyamkadavla79@gmail.com'
        })
      });

      if (res.ok) {
        showToast(`User ${addUserForm.name} added and approved directly!`, 'success');
        setAddUserForm({
          name: '',
          email: '',
          credits: '100.00',
          rpmLimit: '60',
          tpmLimit: '50000',
          creditsExpiry: new Date(Date.now() + 30 * 24 * 3600000).toISOString().split('T')[0]
        });
        setActiveTab('users');
        fetchStats();
        fetchRequests();
      } else {
        const err = res.headers.get('content-type')?.includes('application/json') ? await res.json() : { error: 'Internal Server Error' };
        showToast(err.error || 'Server error occurred');
      }
    } catch (err) {
      showToast('Error adding manual user.');
    }
  };

  const approvedUsers = requests.filter(r => r.status === 'approved');
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  return (
    <div className="px-4 py-6 md:p-8 space-y-8 max-w-6xl mx-auto font-sans bg-canvas text-body animate-in fade-in duration-300 w-full overflow-x-hidden">
      
      {/* Dynamic Upper Hero Area */}
      <div className="bg-surface-dark text-on-dark p-7 rounded-xl shadow-none relative overflow-hidden border border-hairline/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-white/5 px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider text-primary border border-white/10">
                Gate Controller Enabled
              </span>
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
              </span>
            </div>
            <h2 className="text-2xl font-normal tracking-tight font-serif text-white">Aira.AI Management Console</h2>
            <p className="text-xs text-on-dark-soft max-w-xl leading-relaxed">
              Provision credit allocations, configure API throughput (RPM) limits, approve access-gate registration flows, and manipulate active routing nodes.
            </p>
          </div>
          
          <button
            onClick={() => { fetchStats(); fetchRequests(); showToast('Syncing with database...'); }}
            className="px-3.5 py-1.5 bg-surface-dark-elevated hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all self-start md:self-auto text-on-dark"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin-slow text-primary" /> Refresh Database
          </button>
        </div>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-card border border-hairline p-4 rounded-xl shadow-none flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-canvas text-primary border border-hairline flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted tracking-wider">TOTAL USERS</p>
            <p className="text-lg font-normal text-ink font-serif mt-0.5">{stats.totalUsers}</p>
          </div>
        </div>

        <div className="bg-surface-card border border-hairline p-4 rounded-xl shadow-none flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-canvas text-primary border border-hairline flex items-center justify-center shrink-0">
            <Hourglass className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted tracking-wider">PENDING REQS</p>
            <p className="text-lg font-normal text-ink font-serif mt-0.5">{stats.pendingInvitations}</p>
          </div>
        </div>

        <div className="bg-surface-card border border-hairline p-4 rounded-xl shadow-none flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-canvas text-primary border border-hairline flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted tracking-wider">MONTHLY CALLS</p>
            <p className="text-lg font-normal text-ink font-serif mt-0.5">{stats.totalRequests}</p>
          </div>
        </div>

        <div className="bg-surface-card border border-hairline p-4 rounded-xl shadow-none flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-canvas text-primary border border-hairline flex items-center justify-center shrink-0">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted tracking-wider">ACTIVE API KEYS</p>
            <p className="text-lg font-normal text-ink font-serif mt-0.5">{stats.activeKeysCount}</p>
          </div>
        </div>
      </div>

      {/* Live Access Notifications */}
      {unreadPendingRequests.length > 0 && (
        <div className="bg-[#FFFDF5] border border-amber-200/60 rounded-xl p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Bell className="w-4 h-4 text-amber-600" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-amber-900 text-xs uppercase tracking-wider font-sans">
                  New Access Request Notifications ({unreadPendingRequests.length})
                </h3>
                <p className="text-[11px] text-amber-800/80 mt-0.5">
                  The following users have filled out the access registration form and are waiting for your approval:
                </p>
              </div>
            </div>
            <button
              onClick={markAllNotificationsAsRead}
              className="text-xs text-amber-700 hover:text-amber-900 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Mark all as read
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
            {unreadPendingRequests.map((req: any) => (
              <div 
                key={req.id} 
                className="bg-white border border-amber-100/70 p-3.5 rounded-lg flex items-center justify-between gap-4 shadow-sm hover:border-amber-200 transition-all group"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-xs truncate">{req.name}</p>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5 font-mono">{req.email}</p>
                  <p className="text-[9px] text-gray-400 mt-1 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {req.createdAt || req.created_at ? new Date(req.createdAt || req.created_at).toLocaleString() : 'Just now'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 opacity-100 md:opacity-80 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => {
                      setActiveTab('invitations');
                      handleApproveClick(req);
                    }}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold shadow-sm cursor-pointer transition-all"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => markNotificationAsRead(req.id)}
                    className="p-1 border border-amber-200 hover:bg-amber-50 rounded text-amber-700 hover:text-amber-900 cursor-pointer transition-all"
                    title="Mark as Read"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs Switcher Layout */}
      <div className="border-b border-hairline flex items-center gap-2 overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveTab('invitations')}
          className={`pb-3 px-4 text-xs font-semibold tracking-tight transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'invitations'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Access Requests ({pendingRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-4 text-xs font-semibold tracking-tight transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Active Approved Users ({approvedUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('add-user')}
          className={`pb-3 px-4 text-xs font-semibold tracking-tight transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'add-user'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" /> Add User Directly
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          className={`pb-3 px-4 text-xs font-semibold tracking-tight transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'pricing'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Pricing & Token Nodes
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`pb-3 px-4 text-xs font-semibold tracking-tight transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'billing'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" /> Billing & Usage
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'invitations' && (
        <div className="bg-surface-card border border-hairline rounded-xl shadow-none overflow-hidden">
          <div className="p-5 border-b border-hairline-soft flex items-center justify-between">
            <div>
              <h3 className="font-medium text-ink text-sm font-serif">Pending Authorization Queue</h3>
              <p className="text-xs text-muted-soft mt-0.5">Approve requests to seed credit ledgers, or reject to block email OTP requests.</p>
            </div>
            <span className="text-xs bg-canvas text-primary font-medium px-2.5 py-0.5 rounded-full border border-hairline">
              {pendingRequests.length} pending
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-muted-soft">Loading request queue...</div>
          ) : pendingRequests.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-soft italic">
              No pending registrations currently in the queue.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-soft text-muted uppercase tracking-wider text-[10px] font-medium border-b border-hairline-soft">
                    <th className="p-4">Full Name</th>
                    <th className="p-4">Email Address</th>
                    <th className="p-4">Submission Date</th>
                    <th className="p-4">Status Gate</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-soft font-sans">
                  {pendingRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-surface-soft/40 transition-colors">
                      <td className="p-4 font-medium text-ink">{req.name}</td>
                      <td className="p-4 text-body">{req.email}</td>
                      <td className="p-4 text-muted-soft">
                        {new Date(req.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4">
                        <span className="text-[10px] bg-canvas text-primary border border-hairline px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">
                          Pending Approval
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleApproveClick(req)}
                          className="px-3 py-1.5 bg-primary hover:bg-primary-active text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectClick(req.id, req.name)}
                          className="px-3 py-1.5 border border-hairline text-muted hover:bg-surface-soft rounded-lg text-xs font-semibold transition-all cursor-pointer"
                        >
                          Decline
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-surface-card border border-hairline rounded-xl shadow-none overflow-hidden">
          <div className="p-5 border-b border-hairline-soft flex items-center justify-between">
            <div>
              <h3 className="font-medium text-ink text-sm font-serif">Approved Aira.AI Users</h3>
              <p className="text-xs text-muted-soft mt-0.5">Manage credit balances, expiration countdowns, and gateway throughput limits.</p>
            </div>
            <span className="text-xs bg-canvas text-primary font-medium px-2.5 py-0.5 rounded-full border border-hairline">
              {approvedUsers.length} active
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-muted-soft">Loading user database...</div>
          ) : approvedUsers.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-soft italic">
              No authorized users found. Approve a request to see them here!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-soft text-muted uppercase tracking-wider text-[10px] font-medium border-b border-hairline-soft">
                    <th className="p-4">User</th>
                    <th className="p-4">Remaining Credits</th>
                    <th className="p-4">RPM / TPM Limits</th>
                    <th className="p-4">Credit Validity</th>
                    <th className="p-4">Approved By</th>
                    <th className="p-4">Created Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-soft font-sans">
                  {approvedUsers.map((req) => {
                    const isExpired = req.creditsExpiry && new Date(req.creditsExpiry) < new Date();
                    return (
                      <tr key={req.id} className="hover:bg-surface-soft/40 transition-colors">
                        <td className="p-4">
                          <p className="font-medium text-ink">{req.name}</p>
                          <p className="text-[11px] text-muted-soft font-sans">{req.email}</p>
                        </td>
                        <td className="p-4 font-mono font-medium text-primary">
                          ${(req.credits ?? 0).toFixed(4)}
                        </td>
                        <td className="p-4 font-mono text-body">
                          <div>{req.rpmLimit ?? 60} RPM</div>
                          <div className="text-[10px] text-muted-soft">{req.tpmLimit ?? 50000} TPM</div>
                        </td>
                        <td className="p-4">
                          {req.creditsExpiry ? (
                            <span className={`font-mono text-[11px] font-semibold ${isExpired ? 'text-primary' : 'text-body'}`}>
                              {new Date(req.creditsExpiry).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                              {isExpired && <span className="ml-1.5 bg-canvas text-primary px-1.5 py-0.5 rounded border border-hairline font-bold text-[9px] uppercase">Expired</span>}
                            </span>
                          ) : (
                            <span className="text-muted-soft font-mono">Lifetime Access</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="text-body text-[11px] bg-canvas border border-hairline px-2 py-0.5 rounded">
                            {req.approvedBy || 'Admin'}
                          </span>
                        </td>
                        <td className="p-4 text-muted-soft">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => handleEditClick(req)}
                            className="p-1.5 text-muted hover:text-primary hover:bg-surface-soft rounded-lg transition-all cursor-pointer inline-flex items-center"
                            title="Edit User"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(req.id, req.name)}
                            className="p-1.5 text-muted hover:text-primary hover:bg-surface-soft rounded-lg transition-all cursor-pointer inline-flex items-center"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'add-user' && (
        <div className="bg-surface-card border border-hairline rounded-xl shadow-none max-w-xl p-6">
          <div className="space-y-1 mb-6">
            <h3 className="font-medium text-ink text-sm font-serif">Direct Approved Registration</h3>
            <p className="text-xs text-muted-soft leading-relaxed">
              Manually add a user to the whitelist. This bypasses the registration queue, auto-authorizes the email address, and seeds their credit ledger immediately.
            </p>
          </div>

          <form onSubmit={handleManualAddUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted uppercase block">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="E.g., Jane Doe"
                  value={addUserForm.name}
                  onChange={(e) => setAddUserForm({ ...addUserForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-canvas border border-hairline rounded-lg text-xs focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted uppercase block">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="jane.doe@company.com"
                  value={addUserForm.email}
                  onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-canvas border border-hairline rounded-lg text-xs focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted uppercase block">Initial Credits ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={addUserForm.credits}
                  onChange={(e) => setAddUserForm({ ...addUserForm, credits: e.target.value })}
                  className="w-full px-3 py-2 bg-canvas border border-hairline rounded-lg text-xs font-mono focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted uppercase block">RPM Throttle</label>
                <input
                  type="number"
                  required
                  value={addUserForm.rpmLimit}
                  onChange={(e) => setAddUserForm({ ...addUserForm, rpmLimit: e.target.value })}
                  className="w-full px-3 py-2 bg-canvas border border-hairline rounded-lg text-xs font-mono focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted uppercase block">TPM Throttle</label>
                <input
                  type="number"
                  required
                  value={addUserForm.tpmLimit}
                  onChange={(e) => setAddUserForm({ ...addUserForm, tpmLimit: e.target.value })}
                  className="w-full px-3 py-2 bg-canvas border border-hairline rounded-lg text-xs font-mono focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted uppercase block">Expiration</label>
                <input
                  type="date"
                  required
                  value={addUserForm.creditsExpiry}
                  onChange={(e) => setAddUserForm({ ...addUserForm, creditsExpiry: e.target.value })}
                  className="w-full px-3 py-2 bg-canvas border border-hairline rounded-lg text-xs font-mono focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-primary hover:bg-primary-active text-white rounded-lg text-xs font-semibold shadow-none transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-4"
            >
              <UserPlus className="w-4 h-4" /> Add & Provision Whitelist User
            </button>
          </form>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Billing Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface-card border border-hairline p-5 rounded-xl flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 border border-primary/20 text-primary rounded-full flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted uppercase tracking-wider">Total Aggregated Invoice</p>
                <p className="text-xl font-normal text-ink font-serif tracking-tight mt-0.5">
                  ${billingStats.reduce((acc, u) => acc + (u.bill || 0), 0).toFixed(4)}
                </p>
              </div>
            </div>

            <div className="bg-surface-card border border-hairline p-5 rounded-xl flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 border border-primary/20 text-primary rounded-full flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted uppercase tracking-wider">Invoiced Client Profiles</p>
                <p className="text-xl font-normal text-ink font-serif tracking-tight mt-0.5">
                  {billingStats.length} active users
                </p>
              </div>
            </div>

            <div className="bg-surface-card border border-hairline p-5 rounded-xl flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 border border-primary/20 text-primary rounded-full flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted uppercase tracking-wider">Total Aggregated Tokens</p>
                <p className="text-xl font-normal text-ink font-serif tracking-tight mt-0.5">
                  {billingStats.reduce((acc, u) => acc + (u.totalTokens || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Table (Matching user image) */}
          <div className="bg-surface-card border border-hairline rounded-xl p-5 space-y-3">
            <h3 className="font-medium text-ink text-sm font-serif flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" /> Active Billing Rates Matrix
            </h3>
            <p className="text-xs text-muted-soft">
              Real-time token cost computation rates applied to customer proxy gateways.
            </p>
            <div className="overflow-x-auto pt-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-soft text-muted uppercase tracking-wider text-[9px] font-medium border-b border-hairline-soft">
                    <th className="p-3 pl-4">MODEL/PROVIDER</th>
                    <th className="p-3">INPUT RATE</th>
                    <th className="p-3">CACHED INPUT</th>
                    <th className="p-3">OUTPUT RATE</th>
                    <th className="p-3">BATCH INPUT</th>
                    <th className="p-3">BATCH OUTPUT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-soft font-mono text-[11px] text-body">
                  <tr>
                    <td className="p-3 pl-4 font-sans font-semibold text-ink">Opus (GLM-5p2 / Claude Bypass)</td>
                    <td className="p-3">$5.00 / MTok</td>
                    <td className="p-3">$6.25 / MTok</td>
                    <td className="p-3">$25.00 / MTok</td>
                    <td className="p-3">$0.50 / MTok</td>
                    <td className="p-3">$25.00 / MTok</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* User billing ledger list */}
          <div className="bg-surface-card border border-hairline rounded-xl overflow-hidden shadow-none">
            <div className="p-5 border-b border-hairline-soft flex items-center justify-between">
              <h3 className="font-medium text-ink text-sm font-serif">User Usage & Invoices Ledger</h3>
              <button 
                onClick={fetchBillingStats}
                disabled={billingLoading}
                className="p-1 hover:bg-surface-soft rounded text-muted-soft hover:text-primary transition-colors cursor-pointer"
                title="Refresh Ledger"
              >
                <RefreshCw className={`w-4 h-4 ${billingLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {billingLoading ? (
              <div className="p-12 text-center text-xs text-muted-soft">Loading billing ledger...</div>
            ) : billingStats.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-soft italic">No active approved users found to bill.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-soft text-muted uppercase tracking-wider text-[10px] font-medium border-b border-hairline-soft">
                      <th className="p-4 pl-6">USER EMAIL & NAME</th>
                      <th className="p-4 text-center">API KEYS</th>
                      <th className="p-4">INPUT TOKENS</th>
                      <th className="p-4">OUTPUT TOKENS</th>
                      <th className="p-4">TOTAL TOKENS</th>
                      <th className="p-4 font-semibold text-primary">COMPUTED INVOICE</th>
                      <th className="p-4 pr-6 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline-soft font-sans text-body">
                    {billingStats.map(u => (
                      <tr key={u.email} className="hover:bg-surface-soft/40 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="font-medium text-ink">{u.name}</div>
                          <div className="text-[10px] text-muted-soft font-mono mt-0.5">{u.email}</div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="bg-surface-soft border border-hairline px-2 py-0.5 rounded text-[10px] font-medium">
                            {u.keysCount} keys
                          </span>
                        </td>
                        <td className="p-4 font-mono text-[11px]">{u.inputTokens.toLocaleString()}</td>
                        <td className="p-4 font-mono text-[11px]">{u.outputTokens.toLocaleString()}</td>
                        <td className="p-4 font-mono text-[11px] text-muted-soft">{u.totalTokens.toLocaleString()}</td>
                        <td className="p-4 font-mono text-xs font-semibold text-primary">${u.bill.toFixed(4)}</td>
                        <td className="p-4 pr-6 text-right">
                          <button
                            onClick={() => setSelectedUserBilling(u)}
                            className="px-3 py-1 bg-canvas hover:bg-surface-soft border border-hairline text-primary rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                          >
                            Details & Keys
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* User detailed usage slide-out dialog */}
          {selectedUserBilling && (
            <div className="fixed inset-0 bg-surface-dark/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
              <div className="bg-canvas border border-hairline rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-none animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="font-normal text-ink text-base font-serif tracking-tight">User Keys Invoice Breakdown</h3>
                    <p className="text-xs text-muted-soft">Detailed metrics for <strong className="text-ink">{selectedUserBilling.name}</strong> ({selectedUserBilling.email})</p>
                  </div>
                  <button 
                    onClick={() => setSelectedUserBilling(null)}
                    className="p-1 rounded-lg hover:bg-surface-soft text-muted-soft hover:text-muted transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="overflow-x-auto max-h-80 border border-hairline-soft rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-surface-soft text-muted uppercase tracking-wider text-[9px] font-medium border-b border-hairline-soft">
                        <th className="p-3 pl-4">KEY NAME & PREFIX</th>
                        <th className="p-3">RESTRICTED TO</th>
                        <th className="p-3">INPUT TOKENS</th>
                        <th className="p-3">OUTPUT TOKENS</th>
                        <th className="p-3">TOTAL TOKENS</th>
                        <th className="p-3 pr-4 font-semibold text-primary">BILL AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline-soft font-sans text-body">
                      {selectedUserBilling.keys.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-muted-soft italic">No API keys generated by this user.</td>
                        </tr>
                      ) : (
                        selectedUserBilling.keys.map((k: any) => {
                          const kBill = ((k.inputTokens * 5.00) / 1000000) + ((k.outputTokens * 25.00) / 1000000);
                          return (
                            <tr key={k.key}>
                              <td className="p-3 pl-4">
                                <div className="font-medium text-ink">{k.name}</div>
                                <div className="text-[9px] text-muted-soft font-mono mt-0.5">{k.key}</div>
                              </td>
                              <td className="p-3 font-mono text-[10px]">{k.restrictedModel || 'All'}</td>
                              <td className="p-3 font-mono text-[11px]">{k.inputTokens.toLocaleString()}</td>
                              <td className="p-3 font-mono text-[11px]">{k.outputTokens.toLocaleString()}</td>
                              <td className="p-3 font-mono text-[11px] text-muted-soft">{k.totalTokens.toLocaleString()}</td>
                              <td className="p-3 pr-4 font-mono text-xs font-semibold text-primary">${kBill.toFixed(4)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="pt-3 border-t border-hairline-soft flex justify-between items-center text-xs">
                  <div className="font-mono text-muted-soft">
                    Combined Cost: <strong className="text-primary">${selectedUserBilling.bill.toFixed(4)}</strong>
                  </div>
                  <button
                    onClick={() => setSelectedUserBilling(null)}
                    className="px-4 py-1.5 bg-primary hover:bg-primary-active text-white rounded-lg text-xs font-semibold shadow-none cursor-pointer"
                  >
                    Close Breakdown
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'pricing' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface-card border border-hairline p-6 rounded-xl shadow-none space-y-4">
            <h3 className="font-medium text-ink flex items-center gap-2 font-serif">
              <Database className="w-4 h-4 text-primary" /> Token Pricing Matrices
            </h3>
            <p className="text-xs text-muted-soft leading-relaxed">
              Configure the credit consumption rates per 1,000 tokens for routing nodes. These rates apply instantly across all active API keys.
            </p>
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-muted uppercase">Cohere Input Rate</label>
                  <input
                    type="number"
                    value={pricing.cohereIn}
                    onChange={(e) => setPricing({ ...pricing, cohereIn: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 bg-canvas border border-hairline rounded-lg text-xs font-mono text-body"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted uppercase">Cohere Output Rate</label>
                  <input
                    type="number"
                    value={pricing.cohereOut}
                    onChange={(e) => setPricing({ ...pricing, cohereOut: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 bg-canvas border border-hairline rounded-lg text-xs font-mono text-body"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-muted uppercase">Sonnet Input Rate</label>
                  <input
                    type="number"
                    value={pricing.sonnetIn}
                    onChange={(e) => setPricing({ ...pricing, sonnetIn: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 bg-canvas border border-hairline rounded-lg text-xs font-mono text-body"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted uppercase">Sonnet Output Rate</label>
                  <input
                    type="number"
                    value={pricing.sonnetOut}
                    onChange={(e) => setPricing({ ...pricing, sonnetOut: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 bg-canvas border border-hairline rounded-lg text-xs font-mono text-body"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => showToast('Pricing adjustments saved!', 'success')}
              className="w-full py-2 bg-primary hover:bg-primary-active text-white rounded-lg text-xs font-semibold mt-3 transition-colors cursor-pointer"
            >
              Apply Rate Adjustment
            </button>
          </div>

          <div className="bg-surface-card border border-hairline p-6 rounded-xl shadow-none space-y-4">
            <h3 className="font-medium text-ink flex items-center gap-2 font-serif">
              <Lock className="w-4 h-4 text-primary" /> Gateway Security Log
            </h3>
            <p className="text-xs text-muted-soft leading-relaxed">
              Real-time security logs captured by the API firewall.
            </p>
            <div className="space-y-3 max-h-56 overflow-y-auto pt-2 font-mono text-[10px] leading-relaxed text-body">
              <div className="border-b border-hairline-soft pb-2">
                <p className="text-primary font-semibold">[INFO] 2026-07-03 06:12:35</p>
                <p className="text-muted-soft">API Key nx_live_4x8k authorized request for Command-R-03-2025</p>
              </div>
              <div className="border-b border-hairline-soft pb-2">
                <p className="text-primary font-semibold">[INFO] 2026-07-03 05:41:22</p>
                <p className="text-muted-soft">Google Gmail Integration credential verification successful</p>
              </div>
              <div className="border-b border-hairline-soft pb-2">
                <p className="text-primary font-semibold">[INFO] 2026-07-03 05:40:01</p>
                <p className="text-muted-soft">Google Calendar connection status: Verified token node</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {approvalModalReq && (
        <div className="fixed inset-0 bg-surface-dark/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-canvas border border-hairline rounded-xl max-w-md w-full p-6 space-y-5 shadow-none animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="font-normal text-ink text-base font-serif tracking-tight">Approve Registration Request</h3>
                <p className="text-xs text-muted-soft">Setup initial access permissions for <strong className="text-ink">{approvalModalReq.name}</strong></p>
              </div>
              <button
                onClick={() => setApprovalModalReq(null)}
                className="p-1 rounded-lg hover:bg-surface-soft text-muted-soft hover:text-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted uppercase tracking-wider block">Initial Balance Credits ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={modalCredits}
                  onChange={(e) => setModalCredits(e.target.value)}
                  className="w-full px-3 py-2 bg-canvas border border-hairline rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary text-body"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted uppercase tracking-wider block">RPM Throttle Limit</label>
                <input
                  type="number"
                  required
                  value={modalRpm}
                  onChange={(e) => setModalRpm(e.target.value)}
                  className="w-full px-3 py-2 bg-canvas border border-hairline rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary text-body"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted uppercase tracking-wider block">TPM Throttle Limit</label>
                <input
                  type="number"
                  required
                  value={modalTpm}
                  onChange={(e) => setModalTpm(e.target.value)}
                  className="w-full px-3 py-2 bg-canvas border border-hairline rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary text-body"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted uppercase tracking-wider block">Credits Validity (Expiry Date)</label>
                <input
                  type="date"
                  required
                  value={modalExpiry}
                  onChange={(e) => setModalExpiry(e.target.value)}
                  className="w-full px-3 py-2 bg-canvas border border-hairline rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary text-body"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-hairline-soft flex justify-end gap-3">
              <button
                onClick={() => setApprovalModalReq(null)}
                className="px-3.5 py-1.5 border border-hairline text-body rounded-lg text-xs font-medium hover:bg-surface-soft transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitApproval}
                className="px-3.5 py-1.5 bg-primary hover:bg-primary-active text-white rounded-lg text-xs font-semibold shadow-none transition-colors cursor-pointer"
              >
                Approve & Seed Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Details Modal */}
      {editModalReq && (
        <div className="fixed inset-0 bg-surface-dark/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-canvas border border-hairline rounded-xl max-w-md w-full p-6 space-y-5 shadow-none animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="font-normal text-ink text-base font-serif tracking-tight">Edit Whitelisted User Permissions</h3>
                <p className="text-xs text-muted-soft">Modify permissions for <strong className="text-ink">{editModalReq.name}</strong></p>
              </div>
              <button
                onClick={() => setEditModalReq(null)}
                className="p-1 rounded-lg hover:bg-surface-soft text-muted-soft hover:text-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted uppercase tracking-wider block">Remaining Balance Credits ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editCredits}
                  onChange={(e) => setEditCredits(e.target.value)}
                  className="w-full px-3 py-2 bg-canvas border border-hairline rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary text-body"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted uppercase tracking-wider block">RPM Throttle Limit</label>
                <input
                  type="number"
                  required
                  value={editRpm}
                  onChange={(e) => setEditRpm(e.target.value)}
                  className="w-full px-3 py-2 bg-canvas border border-hairline rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary text-body"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted uppercase tracking-wider block">TPM Throttle Limit</label>
                <input
                  type="number"
                  required
                  value={editTpm}
                  onChange={(e) => setEditTpm(e.target.value)}
                  className="w-full px-3 py-2 bg-canvas border border-hairline rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary text-body"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted uppercase tracking-wider block">Credits Validity (Expiry Date)</label>
                <input
                  type="date"
                  required
                  value={editExpiry}
                  onChange={(e) => setEditExpiry(e.target.value)}
                  className="w-full px-3 py-2 bg-canvas border border-hairline rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary text-body"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-hairline-soft flex justify-between items-center gap-3">
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to permanently delete user ${editModalReq.name}?`)) {
                    handleDeleteClick(editModalReq.id, editModalReq.name);
                    setEditModalReq(null);
                  }
                }}
                className="px-3.5 py-1.5 border border-primary hover:bg-primary/5 text-primary rounded-lg text-xs font-semibold transition-colors"
              >
                Delete User
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditModalReq(null)}
                  className="px-3.5 py-1.5 border border-hairline text-body rounded-lg text-xs font-medium hover:bg-surface-soft transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitEdit}
                  className="px-3.5 py-1.5 bg-primary hover:bg-primary-active text-white rounded-lg text-xs font-semibold shadow-none transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
