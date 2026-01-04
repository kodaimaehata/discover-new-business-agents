import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Lightbulb, FileText, Target, Users, RefreshCw, AlertCircle, Settings, StickyNote, X, Check, Loader2, BookOpen, Trash2, ChevronRight, Pencil, Plus, FlaskConical, BarChart3, FileDown, ChevronDown, MessageSquare, MessageCirclePlus } from 'lucide-react';
import { Card, Button, Badge } from '../components/common';
import { useStore } from '../store';
import {
  chatWithVPoP,
  isOpenAIConfigured,
  generateMemoFromConversation,
  generateDataFromConversation,
  type GPT52Model,
  type ReasoningEffort,
  type GeneratedMemo,
  type GeneratableDataType,
  type GeneratedHypothesis,
  type GeneratedExperiment,
  type GeneratedPRD,
  type GeneratedMetric,
  type GeneratedDocument,
  type GeneratedWorkingMV,
  type GeneratedGuardrail,
  MODEL_REASONING_OPTIONS,
  REASONING_EFFORT_LABELS,
  DEFAULT_CHAT_OPTIONS,
} from '../utils/openai';
import { Compass, Shield } from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  prompt: string;
  icon: React.ReactNode;
}

export function Agent() {
  const {
    currentProjectId,
    projects,
    agentMemos,
    agentChatSessions,
    currentChatSessionId,
    addAgentMessage,
    clearSessionMessages,
    createAgentMemo,
    updateAgentMemo,
    deleteAgentMemo,
    createChatSession,
    updateChatSession,
    deleteChatSession,
    setCurrentChatSession,
    getProjectChatSessions,
    getSessionMessages,
    createHypothesis,
    createExperiment,
    createPRD,
    createMetric,
    createDocument,
    getProjectHypotheses,
    getProjectExperiments,
    getProjectSessions,
    getProjectMetrics,
    getProjectPRDs,
    getProjectWorkingMV,
    createWorkingMV,
    updateWorkingMV,
    getProjectGuardrail,
    createGuardrail,
    updateGuardrail,
  } = useStore();

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const hypotheses = currentProjectId ? getProjectHypotheses(currentProjectId) : [];
  const experiments = currentProjectId ? getProjectExperiments(currentProjectId) : [];
  const sessions = currentProjectId ? getProjectSessions(currentProjectId) : [];
  const metrics = currentProjectId ? getProjectMetrics(currentProjectId) : [];
  const prds = currentProjectId ? getProjectPRDs(currentProjectId) : [];
  const projectMemos = currentProjectId
    ? agentMemos.filter((m) => m.projectId === currentProjectId)
    : [];

  // チャットセッション関連
  const projectChatSessions = currentProjectId ? getProjectChatSessions(currentProjectId) : [];
  const currentChatSession = currentChatSessionId
    ? agentChatSessions.find((s) => s.id === currentChatSessionId)
    : null;
  const currentSessionMessages = currentChatSessionId
    ? getSessionMessages(currentChatSessionId)
    : [];

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GPT52Model>(DEFAULT_CHAT_OPTIONS.model);
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>(DEFAULT_CHAT_OPTIONS.reasoningEffort);
  const [isGeneratingMemo, setIsGeneratingMemo] = useState(false);
  const [_generatedMemo, setGeneratedMemo] = useState<GeneratedMemo | null>(null);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [editableMemo, setEditableMemo] = useState<GeneratedMemo | null>(null);
  const [showMemoPanel, setShowMemoPanel] = useState(false);
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [isGeneratingData, setIsGeneratingData] = useState(false);
  const [generatingDataType, setGeneratingDataType] = useState<GeneratableDataType | null>(null);
  const [showDataModal, setShowDataModal] = useState(false);
  const [generatedData, setGeneratedData] = useState<GeneratedHypothesis | GeneratedExperiment | GeneratedPRD | GeneratedMetric | GeneratedDocument | GeneratedWorkingMV | GeneratedGuardrail | null>(null);
  const [showSessionPanel, setShowSessionPanel] = useState(false);
  const [editingSessionTitle, setEditingSessionTitle] = useState<string | null>(null);
  const [sessionTitleInput, setSessionTitleInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dataMenuRef = useRef<HTMLDivElement>(null);

  const selectedMemo = selectedMemoId
    ? projectMemos.find((m) => m.id === selectedMemoId)
    : null;

  const apiConfigured = isOpenAIConfigured();

  // モデル変更時にreasoning effortを適切な値にリセット
  const handleModelChange = (model: GPT52Model) => {
    setSelectedModel(model);
    const availableEfforts = MODEL_REASONING_OPTIONS[model];
    if (!availableEfforts.includes(reasoningEffort)) {
      setReasoningEffort(availableEfforts[0]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSessionMessages]);

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          事業案を選択してください
        </h2>
        <p className="text-gray-500 mb-6">
          サイドバーから事業案を選択してください
        </p>
      </div>
    );
  }

  const quickActions: QuickAction[] = [
    {
      id: 'status',
      label: '現状を整理',
      prompt: '現在の事業案の状況を整理してください。ステージ、仮説、実験状況を含めて。',
      icon: <Target className="w-4 h-4" />,
    },
    {
      id: 'next',
      label: '次のアクション',
      prompt: '次に取るべきアクションを提案してください。優先度と理由を含めて。',
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
      id: 'hypotheses',
      label: '未検証仮説の棚卸し',
      prompt: '未検証の仮説を棚卸しして、検証の優先順位を提案してください。',
      icon: <Lightbulb className="w-4 h-4" />,
    },
    {
      id: 'gate',
      label: 'ゲート条件確認',
      prompt: '現在のステージのゲート条件に対する達成状況を確認してください。',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'session',
      label: '壁打ち準備',
      prompt: '次の壁打ちセッションに向けて、準備すべき資料と論点を整理してください。',
      icon: <Users className="w-4 h-4" />,
    },
  ];

  const handleSend = async () => {
    if (!input.trim() || !currentProjectId) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);

    // セッションがない場合は自動作成
    let sessionId = currentChatSessionId;
    if (!sessionId) {
      sessionId = createChatSession(currentProjectId, `会話 ${new Date().toLocaleString('ja-JP')}`);
    }

    addAgentMessage({
      sessionId,
      role: 'user',
      content: userMessage,
    });

    setIsTyping(true);

    try {
      // Build conversation history for context (current session only)
      const conversationHistory = currentSessionMessages.map((msg) => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      }));

      const response = await chatWithVPoP(
        userMessage,
        {
          project: currentProject!,
          hypotheses,
          experiments,
          sessions,
          metrics,
          prds,
          memos: projectMemos,
        },
        conversationHistory,
        {
          model: selectedModel,
          reasoningEffort,
        }
      );

      addAgentMessage({
        sessionId,
        role: 'agent',
        content: response,
        sources: [
          {
            id: '1',
            type: 'inference',
            title: `${selectedModel} (${reasoningEffort})`,
            content: 'OpenAI APIによる生成',
            createdAt: new Date().toISOString(),
          },
        ],
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'エラーが発生しました';
      setError(errorMessage);
      addAgentMessage({
        sessionId,
        role: 'agent',
        content: `エラーが発生しました: ${errorMessage}`,
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    setInput(action.prompt);
  };

  // メモ生成ハンドラー
  const handleGenerateMemo = async () => {
    if (currentSessionMessages.length === 0 || !currentProjectId) return;

    setIsGeneratingMemo(true);
    setError(null);

    try {
      const memo = await generateMemoFromConversation(
        currentSessionMessages,
        currentProject!.name,
        { model: selectedModel, reasoningEffort }
      );
      setGeneratedMemo(memo);
      setEditableMemo(memo);
      setShowMemoModal(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'メモの生成に失敗しました';
      setError(errorMessage);
    } finally {
      setIsGeneratingMemo(false);
    }
  };

  // メモ保存ハンドラー
  const handleSaveMemo = () => {
    if (!editableMemo || !currentProjectId) return;

    if (editingMemoId) {
      // 既存メモの更新
      updateAgentMemo(editingMemoId, {
        title: editableMemo.title,
        summary: editableMemo.summary,
        keyPoints: editableMemo.keyPoints,
        decisions: editableMemo.decisions,
        nextActions: editableMemo.nextActions,
      });
    } else {
      // 新規メモの作成
      createAgentMemo({
        projectId: currentProjectId,
        title: editableMemo.title,
        summary: editableMemo.summary,
        keyPoints: editableMemo.keyPoints,
        decisions: editableMemo.decisions,
        nextActions: editableMemo.nextActions,
        relatedHypothesisIds: [],
        sourceMessageIds: currentSessionMessages.map((m) => m.id),
        sourceType: 'vpop_agent',
        chatSessionId: currentChatSessionId || undefined,
        tags: [],
      });
    }

    setShowMemoModal(false);
    setGeneratedMemo(null);
    setEditableMemo(null);
    setEditingMemoId(null);
  };

  // 既存メモの編集を開始
  const handleEditMemo = (memo: typeof selectedMemo) => {
    if (!memo) return;
    setEditableMemo({
      title: memo.title,
      summary: memo.summary,
      keyPoints: memo.keyPoints,
      decisions: memo.decisions,
      nextActions: memo.nextActions,
    });
    setEditingMemoId(memo.id);
    setShowMemoModal(true);
  };

  // メモモーダルを閉じる
  const handleCloseMemoModal = () => {
    setShowMemoModal(false);
    setGeneratedMemo(null);
    setEditableMemo(null);
    setEditingMemoId(null);
  };

  // データ生成メニュー項目
  const dataMenuItems: { type: GeneratableDataType; label: string; icon: React.ReactNode }[] = [
    { type: 'workingMV', label: 'Mission/Vision提案', icon: <Compass className="w-4 h-4" /> },
    { type: 'guardrail', label: '探索ガードレール提案', icon: <Shield className="w-4 h-4" /> },
    { type: 'hypothesis', label: '仮説を作成', icon: <Lightbulb className="w-4 h-4" /> },
    { type: 'experiment', label: '実験を作成', icon: <FlaskConical className="w-4 h-4" /> },
    { type: 'prd', label: 'PRDを作成', icon: <FileText className="w-4 h-4" /> },
    { type: 'metric', label: '指標を作成', icon: <BarChart3 className="w-4 h-4" /> },
    { type: 'document', label: '成果物を作成', icon: <FileDown className="w-4 h-4" /> },
  ];

  // データ生成ハンドラー
  const handleGenerateData = async (dataType: GeneratableDataType) => {
    if (currentSessionMessages.length === 0 || !currentProjectId) return;

    setShowDataMenu(false);
    setIsGeneratingData(true);
    setGeneratingDataType(dataType);
    setError(null);

    try {
      const data = await generateDataFromConversation(
        dataType,
        currentSessionMessages,
        currentProject!.name,
        { model: selectedModel, reasoningEffort }
      );
      setGeneratedData(data);
      setShowDataModal(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'データの生成に失敗しました';
      setError(errorMessage);
    } finally {
      setIsGeneratingData(false);
    }
  };

  // データ保存ハンドラー
  const handleSaveData = () => {
    if (!generatedData || !currentProjectId || !generatingDataType) return;

    switch (generatingDataType) {
      case 'hypothesis': {
        const h = generatedData as GeneratedHypothesis;
        createHypothesis({
          projectId: currentProjectId,
          parentId: null,
          level: h.level,
          title: h.title,
          description: h.description,
          status: 'unverified',
          evidence: [],
          alternatives: [],
        });
        break;
      }
      case 'experiment': {
        const e = generatedData as GeneratedExperiment;
        createExperiment({
          projectId: currentProjectId,
          hypothesisIds: [],
          title: e.title,
          description: e.description,
          objective: e.objective,
          method: e.method,
          successCriteria: e.successCriteria,
          status: 'planned',
        });
        break;
      }
      case 'prd': {
        const p = generatedData as GeneratedPRD;
        createPRD({
          projectId: currentProjectId,
          title: p.title,
          core: p.core,
          why: p.why,
          what: {
            solution: p.what.solution,
            features: p.what.features.map((f, i) => ({
              id: `feature-${i}`,
              name: f.name,
              description: f.description,
              priority: f.priority,
            })),
          },
          validationPlan: p.validationPlan,
          metrics: [],
          risks: [],
          status: 'draft',
        });
        break;
      }
      case 'metric': {
        const m = generatedData as GeneratedMetric;
        createMetric({
          projectId: currentProjectId,
          name: m.name,
          description: m.description,
          type: m.type,
          targetValue: m.targetValue,
          unit: m.unit,
          frequency: m.frequency,
          relatedHypothesisIds: [],
          history: [],
        });
        break;
      }
      case 'document': {
        const d = generatedData as GeneratedDocument;
        createDocument({
          projectId: currentProjectId,
          type: d.type,
          title: d.title,
          content: d.content,
          version: 1,
          status: 'draft',
        });
        break;
      }
      case 'workingMV': {
        const mv = generatedData as GeneratedWorkingMV;
        const existingMV = getProjectWorkingMV(currentProjectId);
        if (existingMV) {
          updateWorkingMV(existingMV.id, {
            mission: mv.mission,
            missionCommitment: mv.suggestedCommitmentLevel,
            vision: mv.vision,
            visionCommitment: mv.suggestedCommitmentLevel,
          });
        } else {
          createWorkingMV({
            projectId: currentProjectId,
            mission: mv.mission,
            missionCommitment: mv.suggestedCommitmentLevel,
            missionEvidence: [],
            vision: mv.vision,
            visionCommitment: mv.suggestedCommitmentLevel,
            visionEvidence: [],
            commitmentCriteria: {
              customerSegmentDefined: false,
              problemValidated: false,
              competitiveAdvantageIdentified: false,
              solutionDirectionClear: false,
            },
          });
        }
        break;
      }
      case 'guardrail': {
        const g = generatedData as GeneratedGuardrail;
        const existingGuardrail = getProjectGuardrail(currentProjectId);
        if (existingGuardrail) {
          updateGuardrail(existingGuardrail.id, {
            domain: g.domain,
            targetCustomer: g.targetCustomer,
            observableChange: g.observableChange,
            exclusions: g.exclusions,
          });
        } else {
          createGuardrail({
            projectId: currentProjectId,
            domain: g.domain,
            targetCustomer: g.targetCustomer,
            observableChange: g.observableChange,
            exclusions: g.exclusions,
          });
        }
        break;
      }
    }

    setShowDataModal(false);
    setGeneratedData(null);
    setGeneratingDataType(null);
  };

  // データモーダルを閉じる
  const handleCloseDataModal = () => {
    setShowDataModal(false);
    setGeneratedData(null);
    setGeneratingDataType(null);
  };

  // 新規セッション作成
  const handleCreateNewSession = () => {
    if (!currentProjectId) return;
    createChatSession(currentProjectId, `会話 ${new Date().toLocaleString('ja-JP')}`);
  };

  // セッション切り替え
  const handleSwitchSession = (sessionId: string) => {
    setCurrentChatSession(sessionId);
  };

  // セッション削除
  const handleDeleteSession = (sessionId: string) => {
    if (confirm('このセッションを削除しますか？会話履歴も削除されます。')) {
      deleteChatSession(sessionId);
    }
  };

  // セッションタイトル編集開始
  const handleStartEditSessionTitle = (sessionId: string, currentTitle: string) => {
    setEditingSessionTitle(sessionId);
    setSessionTitleInput(currentTitle);
  };

  // セッションタイトル保存
  const handleSaveSessionTitle = () => {
    if (editingSessionTitle && sessionTitleInput.trim()) {
      updateChatSession(editingSessionTitle, { title: sessionTitleInput.trim() });
    }
    setEditingSessionTitle(null);
    setSessionTitleInput('');
  };

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dataMenuRef.current && !dataMenuRef.current.contains(event.target as Node)) {
        setShowDataMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">VPoP エージェント</h1>
          <p className="text-sm text-gray-500 mt-1">
            VP of Productとして事業推進をサポート
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* セッション管理 */}
          <Button
            variant={showSessionPanel ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setShowSessionPanel(!showSessionPanel)}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            セッション
            {projectChatSessions.length > 0 && (
              <Badge size="sm" className="ml-1">{projectChatSessions.length}</Badge>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCreateNewSession}>
            <MessageCirclePlus className="w-4 h-4 mr-2" />
            新規会話
          </Button>
          {/* データ作成ドロップダウン */}
          <div className="relative" ref={dataMenuRef}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDataMenu(!showDataMenu)}
              disabled={!apiConfigured || currentSessionMessages.length === 0 || isGeneratingData}
            >
              {isGeneratingData ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              データ作成
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
            {showDataMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                {dataMenuItems.map((item) => (
                  <button
                    key={item.type}
                    onClick={() => handleGenerateData(item.type)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleGenerateMemo}
            disabled={!apiConfigured || currentSessionMessages.length === 0 || isGeneratingMemo}
          >
            {isGeneratingMemo ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <StickyNote className="w-4 h-4 mr-2" />
            )}
            メモを作る
          </Button>
          <Button
            variant={showMemoPanel ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setShowMemoPanel(!showMemoPanel)}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            メモ一覧
            {projectMemos.length > 0 && (
              <Badge size="sm" className="ml-1">{projectMemos.length}</Badge>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="w-4 h-4 mr-2" />
            設定
          </Button>
          {currentChatSessionId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm('現在のセッションの履歴をクリアしますか？')) {
                  clearSessionMessages(currentChatSessionId);
                }
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              履歴をクリア
            </Button>
          )}
        </div>
      </div>

      {/* Session Panel */}
      {showSessionPanel && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">会話セッション</h3>
            {currentChatSession && (
              <Badge>現在: {currentChatSession.title}</Badge>
            )}
          </div>
          {projectChatSessions.length === 0 ? (
            <p className="text-sm text-gray-500">
              セッションはありません。「新規会話」ボタンでセッションを作成するか、メッセージを送信すると自動的にセッションが作成されます。
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {projectChatSessions
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .map((session) => {
                  const messageCount = getSessionMessages(session.id).length;
                  return (
                    <div
                      key={session.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        currentChatSessionId === session.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                      onClick={() => handleSwitchSession(session.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {editingSessionTitle === session.id ? (
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={sessionTitleInput}
                                onChange={(e) => setSessionTitleInput(e.target.value)}
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveSessionTitle();
                                  if (e.key === 'Escape') {
                                    setEditingSessionTitle(null);
                                    setSessionTitleInput('');
                                  }
                                }}
                              />
                              <button
                                onClick={handleSaveSessionTitle}
                                className="p-1 text-green-500 hover:bg-green-50 rounded"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingSessionTitle(null);
                                  setSessionTitleInput('');
                                }}
                                className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {session.title}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">
                                  {new Date(session.updatedAt).toLocaleDateString('ja-JP', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                <Badge size="sm">{messageCount} メッセージ</Badge>
                              </div>
                            </>
                          )}
                        </div>
                        {editingSessionTitle !== session.id && (
                          <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleStartEditSessionTitle(session.id, session.title)}
                              className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                              title="タイトルを編集"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSession(session.id)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                              title="セッションを削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Model Settings */}
      {showSettings && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3">モデル設定</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                モデル
              </label>
              <select
                value={selectedModel}
                onChange={(e) => handleModelChange(e.target.value as GPT52Model)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!apiConfigured}
              >
                <option value="gpt-5.2">GPT-5.2</option>
                <option value="gpt-5.2-pro">GPT-5.2 Pro</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {selectedModel === 'gpt-5.2'
                  ? '標準モデル。高速で汎用的なタスクに最適'
                  : 'Proモデル。複雑な推論や高品質な回答に最適'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reasoning Effort
              </label>
              <select
                value={reasoningEffort}
                onChange={(e) => setReasoningEffort(e.target.value as ReasoningEffort)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!apiConfigured}
              >
                {MODEL_REASONING_OPTIONS[selectedModel].map((effort) => (
                  <option key={effort} value={effort}>
                    {REASONING_EFFORT_LABELS[effort]}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                推論の深さを調整。高いほど深く考えますが時間がかかります
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Badge>{selectedModel}</Badge>
            <Badge>{REASONING_EFFORT_LABELS[reasoningEffort]}</Badge>
          </div>
        </div>
      )}

      {/* Memo Panel */}
      {showMemoPanel && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3">保存済みメモ</h3>
          {projectMemos.length === 0 ? (
            <p className="text-sm text-gray-500">
              保存されたメモはありません。チャット後に「メモを作る」ボタンでメモを作成できます。
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* メモ一覧 */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {projectMemos.map((memo) => (
                  <div
                    key={memo.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedMemoId === memo.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedMemoId(memo.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {memo.title}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(memo.createdAt).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>

              {/* メモ詳細 */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 max-h-64 overflow-y-auto">
                {selectedMemo ? (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h4 className="text-md font-semibold text-gray-900">
                        {selectedMemo.title}
                      </h4>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditMemo(selectedMemo)}
                          className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                          title="編集"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('このメモを削除しますか？')) {
                              deleteAgentMemo(selectedMemo.id);
                              setSelectedMemoId(null);
                            }
                          }}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-700">{selectedMemo.summary}</p>
                    </div>

                    {selectedMemo.keyPoints.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">
                          重要なポイント
                        </h5>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {selectedMemo.keyPoints.map((point, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-blue-500">•</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedMemo.decisions.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">
                          決定事項
                        </h5>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {selectedMemo.decisions.map((decision, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-green-500">✓</span>
                              {decision}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedMemo.nextActions.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">
                          次のアクション
                        </h5>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {selectedMemo.nextActions.map((action, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-orange-500">→</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-gray-500">
                    左のメモを選択して詳細を表示
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* API Configuration Warning */}
      {!apiConfigured && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              OpenAI APIキーが設定されていません
            </p>
            <p className="text-sm text-yellow-600 mt-1">
              .envファイルにVITE_OPENAI_API_KEYを設定してください。
              設定後、ページを再読み込みしてください。
            </p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {quickActions.map((action) => (
          <Button
            key={action.id}
            variant="secondary"
            size="sm"
            onClick={() => handleQuickAction(action)}
            disabled={!apiConfigured}
          >
            {action.icon}
            <span className="ml-1">{action.label}</span>
          </Button>
        ))}
      </div>

      {/* Messages */}
      <Card className="flex-1 overflow-hidden flex flex-col" padding="none">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {currentSessionMessages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">
                VPoPエージェントがお手伝いします
              </p>
              <p className="text-sm text-gray-400">
                {apiConfigured
                  ? currentChatSession
                    ? '質問を入力するか、上のクイックアクションをお試しください'
                    : '新規会話を開始するか、セッションを選択してください'
                  : 'OpenAI APIキーを設定してください'}
              </p>
            </div>
          )}

          {currentSessionMessages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user'
                    ? 'bg-blue-100'
                    : 'bg-purple-100'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="w-5 h-5 text-blue-600" />
                ) : (
                  <Bot className="w-5 h-5 text-purple-600" />
                )}
              </div>
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.role === 'agent' ? (
                  <div className="prose prose-sm max-w-none">
                    {message.content.split('\n').map((line, i) => {
                      if (line.startsWith('## ')) {
                        return (
                          <h3 key={i} className="text-lg font-bold mt-2 mb-1">
                            {line.replace('## ', '')}
                          </h3>
                        );
                      }
                      if (line.startsWith('### ')) {
                        return (
                          <h4 key={i} className="text-md font-semibold mt-2 mb-1">
                            {line.replace('### ', '')}
                          </h4>
                        );
                      }
                      if (line.startsWith('- ')) {
                        return (
                          <div key={i} className="ml-4">
                            {line}
                          </div>
                        );
                      }
                      if (line.startsWith('*') && line.endsWith('*')) {
                        return (
                          <p key={i} className="text-sm text-gray-600 italic mt-2">
                            {line.replace(/\*/g, '')}
                          </p>
                        );
                      }
                      if (line === '---') {
                        return <hr key={i} className="my-2" />;
                      }
                      return line ? <p key={i}>{line}</p> : <br key={i} />;
                    })}
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <span>出所:</span>
                      {message.sources.map((source) => (
                        <Badge key={source.id} size="sm">
                          {source.type === 'inference' ? source.title : source.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Bot className="w-5 h-5 text-purple-600" />
              </div>
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4">
          {error && (
            <div className="mb-2 p-2 bg-red-50 text-red-600 text-sm rounded">
              {error}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={apiConfigured ? "質問を入力..." : "APIキーを設定してください"}
              disabled={!apiConfigured}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <Button type="submit" disabled={!input.trim() || isTyping || !apiConfigured}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>

      {/* Memo Modal */}
      {showMemoModal && editableMemo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingMemoId ? 'メモの編集' : 'メモの確認・保存'}
              </h2>
              <button
                onClick={handleCloseMemoModal}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* タイトル */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  タイトル
                </label>
                <input
                  type="text"
                  value={editableMemo.title}
                  onChange={(e) =>
                    setEditableMemo({ ...editableMemo, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 要約 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  要約
                </label>
                <textarea
                  value={editableMemo.summary}
                  onChange={(e) =>
                    setEditableMemo({ ...editableMemo, summary: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 重要なポイント */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  重要なポイント
                </label>
                <div className="space-y-2">
                  {editableMemo.keyPoints.map((point, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={point}
                        onChange={(e) => {
                          const newPoints = [...editableMemo.keyPoints];
                          newPoints[index] = e.target.value;
                          setEditableMemo({ ...editableMemo, keyPoints: newPoints });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => {
                          const newPoints = editableMemo.keyPoints.filter((_, i) => i !== index);
                          setEditableMemo({ ...editableMemo, keyPoints: newPoints });
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setEditableMemo({
                        ...editableMemo,
                        keyPoints: [...editableMemo.keyPoints, ''],
                      })
                    }
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + 追加
                  </button>
                </div>
              </div>

              {/* 決定事項 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  決定事項
                </label>
                <div className="space-y-2">
                  {editableMemo.decisions.map((decision, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={decision}
                        onChange={(e) => {
                          const newDecisions = [...editableMemo.decisions];
                          newDecisions[index] = e.target.value;
                          setEditableMemo({ ...editableMemo, decisions: newDecisions });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => {
                          const newDecisions = editableMemo.decisions.filter((_, i) => i !== index);
                          setEditableMemo({ ...editableMemo, decisions: newDecisions });
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setEditableMemo({
                        ...editableMemo,
                        decisions: [...editableMemo.decisions, ''],
                      })
                    }
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + 追加
                  </button>
                </div>
              </div>

              {/* 次のアクション */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  次のアクション
                </label>
                <div className="space-y-2">
                  {editableMemo.nextActions.map((action, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={action}
                        onChange={(e) => {
                          const newActions = [...editableMemo.nextActions];
                          newActions[index] = e.target.value;
                          setEditableMemo({ ...editableMemo, nextActions: newActions });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => {
                          const newActions = editableMemo.nextActions.filter((_, i) => i !== index);
                          setEditableMemo({ ...editableMemo, nextActions: newActions });
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setEditableMemo({
                        ...editableMemo,
                        nextActions: [...editableMemo.nextActions, ''],
                      })
                    }
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + 追加
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
              <Button variant="ghost" onClick={handleCloseMemoModal}>
                キャンセル
              </Button>
              <Button onClick={handleSaveMemo}>
                <Check className="w-4 h-4 mr-2" />
                {editingMemoId ? '更新' : '保存'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Data Generation Modal */}
      {showDataModal && generatedData && generatingDataType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {generatingDataType === 'workingMV' && 'Mission/Vision提案の確認'}
                {generatingDataType === 'guardrail' && '探索ガードレール提案の確認'}
                {generatingDataType === 'hypothesis' && '仮説の確認'}
                {generatingDataType === 'experiment' && '実験の確認'}
                {generatingDataType === 'prd' && 'PRDの確認'}
                {generatingDataType === 'metric' && '指標の確認'}
                {generatingDataType === 'document' && '成果物の確認'}
              </h2>
              <button
                onClick={handleCloseDataModal}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Working Mission/Vision */}
              {generatingDataType === 'workingMV' && (
                <>
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-sm font-medium text-indigo-700">提案コミットレベル</label>
                      <Badge variant={(generatedData as GeneratedWorkingMV).suggestedCommitmentLevel === 'committed' ? 'success' : 'default'}>
                        {(generatedData as GeneratedWorkingMV).suggestedCommitmentLevel}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Mission</label>
                    <p className="text-gray-900 font-medium bg-gray-50 rounded-lg p-3">
                      {(generatedData as GeneratedWorkingMV).mission}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 italic">
                      理由: {(generatedData as GeneratedWorkingMV).missionRationale}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Vision</label>
                    <p className="text-gray-900 font-medium bg-gray-50 rounded-lg p-3">
                      {(generatedData as GeneratedWorkingMV).vision}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 italic">
                      理由: {(generatedData as GeneratedWorkingMV).visionRationale}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded">
                    保存すると既存のWorking Mission/Visionが更新されます
                  </div>
                </>
              )}

              {/* 探索ガードレール */}
              {generatingDataType === 'guardrail' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">対象領域</label>
                    <p className="text-gray-900 font-medium bg-gray-50 rounded-lg p-3">
                      {(generatedData as GeneratedGuardrail).domain}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">対象顧客（仮）</label>
                    <p className="text-gray-900 bg-gray-50 rounded-lg p-3">
                      {(generatedData as GeneratedGuardrail).targetCustomer}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">観測したい変化</label>
                    <p className="text-gray-900 bg-gray-50 rounded-lg p-3">
                      {(generatedData as GeneratedGuardrail).observableChange}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">除外条件（やらないこと）</label>
                    <div className="space-y-1">
                      {(generatedData as GeneratedGuardrail).exclusions.map((ex, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm bg-red-50 rounded px-3 py-1">
                          <span className="text-red-500">✕</span>
                          <span>{ex}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">提案理由</label>
                    <p className="text-xs text-gray-600 italic">
                      {(generatedData as GeneratedGuardrail).rationale}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded">
                    保存すると既存の探索ガードレールが更新されます
                  </div>
                </>
              )}

              {/* 仮説 */}
              {generatingDataType === 'hypothesis' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">レベル</label>
                    <Badge>{(generatedData as GeneratedHypothesis).level}</Badge>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">タイトル</label>
                    <p className="text-gray-900 font-medium">{(generatedData as GeneratedHypothesis).title}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">説明</label>
                    <p className="text-gray-700">{(generatedData as GeneratedHypothesis).description}</p>
                  </div>
                </>
              )}

              {/* 実験 */}
              {generatingDataType === 'experiment' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">タイトル</label>
                    <p className="text-gray-900 font-medium">{(generatedData as GeneratedExperiment).title}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">概要</label>
                    <p className="text-gray-700">{(generatedData as GeneratedExperiment).description}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">目的</label>
                    <p className="text-gray-700">{(generatedData as GeneratedExperiment).objective}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">方法</label>
                    <p className="text-gray-700">{(generatedData as GeneratedExperiment).method}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">成功基準</label>
                    <p className="text-gray-700">{(generatedData as GeneratedExperiment).successCriteria}</p>
                  </div>
                </>
              )}

              {/* PRD */}
              {generatingDataType === 'prd' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">タイトル</label>
                    <p className="text-gray-900 font-medium">{(generatedData as GeneratedPRD).title}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">ビジョン</label>
                      <p className="text-gray-700 text-sm">{(generatedData as GeneratedPRD).core.vision}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">ミッション</label>
                      <p className="text-gray-700 text-sm">{(generatedData as GeneratedPRD).core.mission}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">課題</label>
                    <p className="text-gray-700 text-sm">{(generatedData as GeneratedPRD).why.problem}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">ターゲット顧客</label>
                    <p className="text-gray-700 text-sm">{(generatedData as GeneratedPRD).why.targetCustomer}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">ソリューション</label>
                    <p className="text-gray-700 text-sm">{(generatedData as GeneratedPRD).what.solution}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">機能</label>
                    <div className="space-y-1">
                      {(generatedData as GeneratedPRD).what.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Badge size="sm">{f.priority}</Badge>
                          <span className="font-medium">{f.name}</span>
                          <span className="text-gray-500">- {f.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* 指標 */}
              {generatingDataType === 'metric' && (
                <>
                  <div className="flex items-center gap-2">
                    <Badge>{(generatedData as GeneratedMetric).type}</Badge>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">指標名</label>
                    <p className="text-gray-900 font-medium">{(generatedData as GeneratedMetric).name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">説明</label>
                    <p className="text-gray-700">{(generatedData as GeneratedMetric).description}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">目標値</label>
                      <p className="text-gray-700">{(generatedData as GeneratedMetric).targetValue}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">単位</label>
                      <p className="text-gray-700">{(generatedData as GeneratedMetric).unit}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">頻度</label>
                      <p className="text-gray-700">{(generatedData as GeneratedMetric).frequency}</p>
                    </div>
                  </div>
                </>
              )}

              {/* 成果物 */}
              {generatingDataType === 'document' && (
                <>
                  <div className="flex items-center gap-2">
                    <Badge>
                      {(generatedData as GeneratedDocument).type === 'one_pager' && '1ページャー'}
                      {(generatedData as GeneratedDocument).type === 'business_plan' && '事業計画書'}
                      {(generatedData as GeneratedDocument).type === 'session_brief' && '壁打ちブリーフ'}
                    </Badge>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">タイトル</label>
                    <p className="text-gray-900 font-medium">{(generatedData as GeneratedDocument).title}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">内容</label>
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {(generatedData as GeneratedDocument).content}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
              <Button variant="ghost" onClick={handleCloseDataModal}>
                キャンセル
              </Button>
              <Button onClick={handleSaveData}>
                <Check className="w-4 h-4 mr-2" />
                保存
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
