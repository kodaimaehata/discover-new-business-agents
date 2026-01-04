import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Plus,
  Calendar,
  Trash2,
  Play,
  CheckCircle,
  MessageSquare,
  Send,
  Bot,
  User,
  Loader2,
  StickyNote,
  X,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  Button,
  Modal,
  Input,
  TextArea,
  Select,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../components/common';
import { useStore } from '../store';
import { SESSION_ROLES, type Session, type SessionRole, type AgendaItem, type SessionAction, type SessionChatMessage } from '../types';
import { chatWithCxO, isOpenAIConfigured, generateMemoFromConversation, type GeneratedMemo } from '../utils/openai';

export function Sessions() {
  const {
    currentProjectId,
    projects,
    getProjectSessions,
    getProjectHypotheses,
    getProjectExperiments,
    getProjectMetrics,
    getProjectPRDs,
    createSession,
    updateSession,
    deleteSession,
    createDecisionLog,
    createAgentMemo,
  } = useStore();

  const sessions = currentProjectId ? getProjectSessions(currentProjectId) : [];
  const currentProject = projects.find(p => p.id === currentProjectId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [selectedRole, setSelectedRole] = useState<SessionRole | 'all'>('all');

  // CxO AIチャット用の状態
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // メモ生成用の状態
  const [isGeneratingMemo, setIsGeneratingMemo] = useState(false);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [editableMemo, setEditableMemo] = useState<GeneratedMemo | null>(null);

  const [formData, setFormData] = useState({
    role: 'CEO' as SessionRole,
    title: '',
    objective: '',
    constraints: '',
    scheduledDate: '',
  });

  if (!currentProjectId) {
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

  const openCreateModal = () => {
    setFormData({
      role: 'CEO',
      title: '',
      objective: '',
      constraints: '',
      scheduledDate: '',
    });
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    if (!formData.title.trim()) return;

    const roleConfig = SESSION_ROLES.find((r) => r.id === formData.role);
    const agendaItems: AgendaItem[] = roleConfig
      ? roleConfig.questions.map((q) => ({
          id: uuidv4(),
          topic: q,
          notes: '',
        }))
      : [];

    createSession({
      projectId: currentProjectId,
      role: formData.role,
      title: formData.title,
      objective: formData.objective,
      agendaItems,
      preMaterials: [],
      constraints: formData.constraints,
      nextActions: [],
      chatMessages: [],
      status: 'scheduled',
      scheduledDate: formData.scheduledDate || undefined,
    });

    setIsModalOpen(false);
  };

  // チャット画面のスクロール
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [selectedSession?.chatMessages]);

  // CxO AIにメッセージを送信
  const sendChatMessage = async () => {
    if (!chatInput.trim() || !selectedSession || !currentProject || isChatLoading) return;

    const userMessage: SessionChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: chatInput.trim(),
      createdAt: new Date().toISOString(),
    };

    // ユーザーメッセージを追加
    const updatedMessages = [...(selectedSession.chatMessages || []), userMessage];
    updateSession(selectedSession.id, { chatMessages: updatedMessages });
    setSelectedSession({ ...selectedSession, chatMessages: updatedMessages });
    setChatInput('');
    setChatError(null);
    setIsChatLoading(true);

    try {
      // CxOコンテキストを準備
      const hypotheses = getProjectHypotheses(currentProjectId!);
      const experiments = getProjectExperiments(currentProjectId!);
      const allSessions = getProjectSessions(currentProjectId!);
      const metrics = getProjectMetrics(currentProjectId!);
      const prds = getProjectPRDs(currentProjectId!);

      const context = {
        project: currentProject,
        hypotheses,
        experiments,
        sessions: allSessions,
        metrics,
        prds,
        currentSession: selectedSession,
      };

      // CxO AIに問い合わせ
      const response = await chatWithCxO(
        userMessage.content,
        selectedSession.role,
        context,
        updatedMessages.slice(0, -1) // 今送ったメッセージを除いた履歴
      );

      // CxOの返信を追加
      const cxoMessage: SessionChatMessage = {
        id: uuidv4(),
        role: 'cxo',
        content: response,
        createdAt: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, cxoMessage];
      updateSession(selectedSession.id, { chatMessages: finalMessages });
      setSelectedSession({ ...selectedSession, chatMessages: finalMessages });
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'エラーが発生しました');
    } finally {
      setIsChatLoading(false);
    }
  };

  // CxO会話からメモを生成
  const handleGenerateMemo = async () => {
    if (!selectedSession || !currentProject || !selectedSession.chatMessages?.length) return;

    setIsGeneratingMemo(true);
    setChatError(null);

    try {
      // SessionChatMessageをAgentMessage形式に変換
      const messagesForMemo = selectedSession.chatMessages.map((msg) => ({
        id: msg.id,
        sessionId: selectedSession.id,
        role: msg.role === 'user' ? 'user' as const : 'agent' as const,
        content: msg.content,
        createdAt: msg.createdAt,
      }));

      const memo = await generateMemoFromConversation(
        messagesForMemo,
        `${currentProject.name} - ${selectedSession.role}壁打ち`
      );

      setEditableMemo(memo);
      setShowMemoModal(true);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'メモ生成中にエラーが発生しました');
    } finally {
      setIsGeneratingMemo(false);
    }
  };

  // メモを保存
  const handleSaveMemo = () => {
    if (!editableMemo || !currentProjectId || !selectedSession) return;

    createAgentMemo({
      projectId: currentProjectId,
      title: editableMemo.title,
      summary: editableMemo.summary,
      keyPoints: editableMemo.keyPoints,
      decisions: editableMemo.decisions,
      nextActions: editableMemo.nextActions,
      relatedHypothesisIds: [],
      sourceMessageIds: selectedSession.chatMessages?.map((m) => m.id) || [],
      sourceType: 'cxo_session',
      cxoSessionId: selectedSession.id,
      cxoRole: selectedSession.role,
      tags: [selectedSession.role, '壁打ち'],
    });

    setShowMemoModal(false);
    setEditableMemo(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('このセッションを削除しますか？')) {
      deleteSession(id);
    }
  };

  const openDetail = (session: Session) => {
    setSelectedSession(session);
    setIsDetailOpen(true);
  };

  const startSession = (id: string) => {
    updateSession(id, { status: 'in_progress' });
  };

  const completeSession = (session: Session) => {
    updateSession(session.id, {
      status: 'completed',
      completedDate: new Date().toISOString().split('T')[0],
    });

    // Create decision log if there's a conclusion
    if (session.conclusion) {
      createDecisionLog({
        projectId: currentProjectId,
        sessionId: session.id,
        title: `${session.role}壁打ち: ${session.title}`,
        decision: session.conclusion,
        reason: session.objective,
        alternatives: [],
        risks: [],
        decidedBy: session.role,
        decidedAt: new Date().toISOString(),
      });
    }
  };

  const updateAgendaItem = (sessionId: string, itemId: string, updates: Partial<AgendaItem>) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const updatedItems = session.agendaItems.map((item) =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    updateSession(sessionId, { agendaItems: updatedItems });
  };

  const addNextAction = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const newAction: SessionAction = {
      id: uuidv4(),
      action: '',
      assignee: '',
      completed: false,
    };
    updateSession(sessionId, { nextActions: [...session.nextActions, newAction] });
  };

  const updateNextAction = (sessionId: string, actionId: string, updates: Partial<SessionAction>) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const updatedActions = session.nextActions.map((action) =>
      action.id === actionId ? { ...action, ...updates } : action
    );
    updateSession(sessionId, { nextActions: updatedActions });
  };

  const removeNextAction = (sessionId: string, actionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    updateSession(sessionId, {
      nextActions: session.nextActions.filter((a) => a.id !== actionId),
    });
  };

  const getRoleBadgeColor = (role: SessionRole) => {
    switch (role) {
      case 'CEO':
        return 'bg-purple-100 text-purple-700';
      case 'COO':
        return 'bg-blue-100 text-blue-700';
      case 'CFO':
        return 'bg-green-100 text-green-700';
      case 'CSO':
        return 'bg-orange-100 text-orange-700';
      case 'CPO':
        return 'bg-pink-100 text-pink-700';
    }
  };

  const filteredSessions =
    selectedRole === 'all'
      ? sessions
      : sessions.filter((s) => s.role === selectedRole);

  const upcomingSessions = filteredSessions.filter((s) => s.status === 'scheduled');
  const inProgressSessions = filteredSessions.filter((s) => s.status === 'in_progress');
  const completedSessions = filteredSessions.filter((s) => s.status === 'completed');

  const renderSessionCard = (session: Session) => (
    <Card key={session.id} className="mb-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(session.role)}`}>
              {session.role}
            </span>
            <h4 className="font-medium text-gray-900">{session.title}</h4>
          </div>
          <p className="text-sm text-gray-600 mb-2">{session.objective}</p>
          {session.scheduledDate && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>{session.scheduledDate}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 ml-4">
          {session.status === 'scheduled' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startSession(session.id)}
              title="開始"
            >
              <Play className="w-4 h-4 text-green-500" />
            </Button>
          )}
          {session.status === 'in_progress' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => completeSession(session)}
              title="完了"
            >
              <CheckCircle className="w-4 h-4 text-green-500" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => openDetail(session)}>
            <MessageSquare className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(session.id)}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">壁打ちセッション</h1>
          <p className="text-sm text-gray-500 mt-1">
            CEO/COO/CFO/CSO/CPOとの壁打ちを意思決定プロセスとして管理
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          セッションを作成
        </Button>
      </div>

      {/* Role Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedRole === 'all' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setSelectedRole('all')}
        >
          すべて
        </Button>
        {SESSION_ROLES.map((role) => (
          <Button
            key={role.id}
            variant={selectedRole === role.id ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSelectedRole(role.id)}
          >
            {role.name}
          </Button>
        ))}
      </div>

      {/* Role Templates */}
      <Card>
        <CardHeader>
          <CardTitle>役割別の論点テンプレート</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {SESSION_ROLES.map((role) => (
            <div key={role.id} className="p-3 bg-gray-50 rounded-lg">
              <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 ${getRoleBadgeColor(role.id)}`}>
                {role.name}
              </div>
              <p className="text-xs text-gray-600 mb-2">{role.focus}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Sessions Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            予定 ({upcomingSessions.length})
          </h3>
          {upcomingSessions.map(renderSessionCard)}
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            進行中 ({inProgressSessions.length})
          </h3>
          {inProgressSessions.map(renderSessionCard)}
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            完了 ({completedSessions.length})
          </h3>
          {completedSessions.map(renderSessionCard)}
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="壁打ちセッションを作成"
      >
        <div className="space-y-4">
          <Select
            label="壁打ち相手"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as SessionRole })}
            options={SESSION_ROLES.map((r) => ({
              value: r.id,
              label: `${r.name} - ${r.focus}`,
            }))}
          />

          <Input
            label="セッションタイトル"
            placeholder="例：事業計画の最終確認"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <TextArea
            label="目的（決めたいこと）"
            placeholder="このセッションで決定したいことを記述..."
            rows={3}
            value={formData.objective}
            onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
          />

          <TextArea
            label="前提・制約"
            placeholder="事前に共有すべき前提条件や制約..."
            rows={2}
            value={formData.constraints}
            onChange={(e) => setFormData({ ...formData, constraints: e.target.value })}
          />

          <Input
            type="date"
            label="予定日"
            value={formData.scheduledDate}
            onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleCreate}>作成</Button>
          </div>
        </div>
      </Modal>

      {/* Session Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedSession ? `${selectedSession.role}壁打ち: ${selectedSession.title}` : ''}
        size="xl"
      >
        {selectedSession && (
          <Tabs defaultValue="chat">
            <TabsList>
              <TabsTrigger value="chat">
                <Bot className="w-4 h-4 mr-1" />
                {selectedSession.role} AI
              </TabsTrigger>
              <TabsTrigger value="agenda">議題・論点</TabsTrigger>
              <TabsTrigger value="notes">結論・保留</TabsTrigger>
              <TabsTrigger value="actions">Next Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="mt-4">
              <div className="flex flex-col h-[500px]">
                {/* セッション情報 */}
                <div className="p-3 bg-gray-50 rounded-lg mb-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">目的</p>
                  <p className="text-sm text-gray-600">{selectedSession.objective}</p>
                </div>

                {!isOpenAIConfigured() ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center p-6 bg-yellow-50 rounded-lg">
                      <p className="text-yellow-700 font-medium mb-2">OpenAI APIキーが設定されていません</p>
                      <p className="text-sm text-yellow-600">.envファイルにVITE_OPENAI_API_KEYを設定してください</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* チャットメッセージ表示エリア */}
                    <div
                      ref={chatContainerRef}
                      className="flex-1 overflow-y-auto p-3 bg-gray-50 rounded-lg space-y-4"
                    >
                      {(!selectedSession.chatMessages || selectedSession.chatMessages.length === 0) && (
                        <div className="text-center text-gray-500 py-8">
                          <Bot className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                          <p className="font-medium">{selectedSession.role}として壁打ちを開始します</p>
                          <p className="text-sm mt-1">
                            {SESSION_ROLES.find(r => r.id === selectedSession.role)?.focus}
                          </p>
                          <p className="text-sm mt-3">
                            質問や相談を入力してください
                          </p>
                        </div>
                      )}

                      {selectedSession.chatMessages?.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              msg.role === 'user'
                                ? 'bg-blue-500 text-white'
                                : getRoleBadgeColor(selectedSession.role)
                            }`}
                          >
                            {msg.role === 'user' ? (
                              <User className="w-4 h-4" />
                            ) : (
                              <span className="text-xs font-bold">{selectedSession.role.charAt(0)}</span>
                            )}
                          </div>
                          <div
                            className={`max-w-[75%] p-3 rounded-lg ${
                              msg.role === 'user'
                                ? 'bg-blue-500 text-white'
                                : 'bg-white border border-gray-200'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'
                              }`}
                            >
                              {new Date(msg.createdAt).toLocaleTimeString('ja-JP', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      ))}

                      {isChatLoading && (
                        <div className="flex gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getRoleBadgeColor(selectedSession.role)}`}>
                            <span className="text-xs font-bold">{selectedSession.role.charAt(0)}</span>
                          </div>
                          <div className="bg-white border border-gray-200 p-3 rounded-lg">
                            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* エラー表示 */}
                    {chatError && (
                      <div className="mt-2 p-2 bg-red-50 text-red-600 text-sm rounded-lg">
                        {chatError}
                      </div>
                    )}

                    {/* 入力エリア */}
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendChatMessage();
                          }
                        }}
                        placeholder={`${selectedSession.role}に質問や相談を入力...`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isChatLoading}
                      />
                      <Button
                        onClick={sendChatMessage}
                        disabled={!chatInput.trim() || isChatLoading}
                      >
                        {isChatLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={handleGenerateMemo}
                        disabled={!selectedSession.chatMessages?.length || isGeneratingMemo || isChatLoading}
                        title="会話からメモを生成"
                      >
                        {isGeneratingMemo ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <StickyNote className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="agenda" className="mt-4">
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-1">目的</p>
                  <p className="text-sm text-gray-600">{selectedSession.objective}</p>
                </div>

                {selectedSession.constraints && (
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm font-medium text-yellow-700 mb-1">前提・制約</p>
                    <p className="text-sm text-yellow-600">{selectedSession.constraints}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">論点</h4>
                  <div className="space-y-3">
                    {selectedSession.agendaItems.map((item) => (
                      <div key={item.id} className="p-3 border rounded-lg">
                        <p className="text-sm font-medium text-gray-900 mb-2">{item.topic}</p>
                        <TextArea
                          placeholder="議論メモ..."
                          rows={2}
                          value={item.notes}
                          onChange={(e) =>
                            updateAgendaItem(selectedSession.id, item.id, {
                              notes: e.target.value,
                            })
                          }
                        />
                        <Input
                          placeholder="決定事項..."
                          className="mt-2"
                          value={item.decision || ''}
                          onChange={(e) =>
                            updateAgendaItem(selectedSession.id, item.id, {
                              decision: e.target.value,
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <div className="space-y-4">
                <TextArea
                  label="結論"
                  placeholder="セッションの結論..."
                  rows={4}
                  value={selectedSession.conclusion || ''}
                  onChange={(e) =>
                    updateSession(selectedSession.id, { conclusion: e.target.value })
                  }
                />

                <TextArea
                  label="保留事項"
                  placeholder="まだ決まっていないこと..."
                  rows={3}
                  value={selectedSession.pending || ''}
                  onChange={(e) =>
                    updateSession(selectedSession.id, { pending: e.target.value })
                  }
                />

                <TextArea
                  label="反証・懸念"
                  placeholder="出された反論や懸念事項..."
                  rows={3}
                  value={selectedSession.counterArguments || ''}
                  onChange={(e) =>
                    updateSession(selectedSession.id, {
                      counterArguments: e.target.value,
                    })
                  }
                />
              </div>
            </TabsContent>

            <TabsContent value="actions" className="mt-4">
              <div className="space-y-3">
                {selectedSession.nextActions.map((action) => (
                  <div key={action.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <input
                      type="checkbox"
                      checked={action.completed}
                      onChange={(e) =>
                        updateNextAction(selectedSession.id, action.id, {
                          completed: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300"
                    />
                    <Input
                      placeholder="アクション内容..."
                      className="flex-1"
                      value={action.action}
                      onChange={(e) =>
                        updateNextAction(selectedSession.id, action.id, {
                          action: e.target.value,
                        })
                      }
                    />
                    <Input
                      placeholder="担当"
                      className="w-32"
                      value={action.assignee}
                      onChange={(e) =>
                        updateNextAction(selectedSession.id, action.id, {
                          assignee: e.target.value,
                        })
                      }
                    />
                    <Input
                      type="date"
                      className="w-40"
                      value={action.dueDate || ''}
                      onChange={(e) =>
                        updateNextAction(selectedSession.id, action.id, {
                          dueDate: e.target.value,
                        })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeNextAction(selectedSession.id, action.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="secondary"
                  onClick={() => addNextAction(selectedSession.id)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  アクションを追加
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </Modal>

      {/* メモ編集モーダル */}
      {showMemoModal && editableMemo && (
        <Modal
          isOpen={showMemoModal}
          onClose={() => {
            setShowMemoModal(false);
            setEditableMemo(null);
          }}
          title="メモの確認・保存"
          size="xl"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <Input
              label="タイトル"
              value={editableMemo.title}
              onChange={(e) =>
                setEditableMemo({ ...editableMemo, title: e.target.value })
              }
            />

            <TextArea
              label="要約"
              rows={3}
              value={editableMemo.summary}
              onChange={(e) =>
                setEditableMemo({ ...editableMemo, summary: e.target.value })
              }
            />

            {/* 重要なポイント */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                重要なポイント
              </label>
              <div className="space-y-2">
                {editableMemo.keyPoints.map((point, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="ポイントを入力..."
                      value={point}
                      onChange={(e) => {
                        const newPoints = [...editableMemo.keyPoints];
                        newPoints[index] = e.target.value;
                        setEditableMemo({ ...editableMemo, keyPoints: newPoints });
                      }}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newPoints = editableMemo.keyPoints.filter((_, i) => i !== index);
                        setEditableMemo({ ...editableMemo, keyPoints: newPoints });
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setEditableMemo({
                      ...editableMemo,
                      keyPoints: [...editableMemo.keyPoints, ''],
                    })
                  }
                >
                  <Plus className="w-4 h-4 mr-1" />
                  追加
                </Button>
              </div>
            </div>

            {/* 決定事項 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                決定事項
              </label>
              <div className="space-y-2">
                {editableMemo.decisions.map((decision, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="決定事項を入力..."
                      value={decision}
                      onChange={(e) => {
                        const newDecisions = [...editableMemo.decisions];
                        newDecisions[index] = e.target.value;
                        setEditableMemo({ ...editableMemo, decisions: newDecisions });
                      }}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newDecisions = editableMemo.decisions.filter((_, i) => i !== index);
                        setEditableMemo({ ...editableMemo, decisions: newDecisions });
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setEditableMemo({
                      ...editableMemo,
                      decisions: [...editableMemo.decisions, ''],
                    })
                  }
                >
                  <Plus className="w-4 h-4 mr-1" />
                  追加
                </Button>
              </div>
            </div>

            {/* Next Actions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Next Actions
              </label>
              <div className="space-y-2">
                {editableMemo.nextActions.map((action, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="アクションを入力..."
                      value={action}
                      onChange={(e) => {
                        const newActions = [...editableMemo.nextActions];
                        newActions[index] = e.target.value;
                        setEditableMemo({ ...editableMemo, nextActions: newActions });
                      }}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newActions = editableMemo.nextActions.filter((_, i) => i !== index);
                        setEditableMemo({ ...editableMemo, nextActions: newActions });
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setEditableMemo({
                      ...editableMemo,
                      nextActions: [...editableMemo.nextActions, ''],
                    })
                  }
                >
                  <Plus className="w-4 h-4 mr-1" />
                  追加
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowMemoModal(false);
                  setEditableMemo(null);
                }}
              >
                キャンセル
              </Button>
              <Button onClick={handleSaveMemo}>
                <StickyNote className="w-4 h-4 mr-2" />
                保存
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
