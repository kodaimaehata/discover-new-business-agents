import { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit3,
  MessageSquare,
  Users,
  FileText,
  Tag,
  Calendar,
  ChevronRight,
  X,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { generateMemoFromText, isOpenAIConfigured, type GeneratedMemo } from '../utils/openai';
import {
  Card,
  Button,
  Modal,
  Input,
  TextArea,
} from '../components/common';
import { useStore } from '../store';
import {
  type AgentMemo,
  type MemoSourceType,
} from '../types';

const SOURCE_TYPE_LABELS: Record<MemoSourceType, { label: string; icon: typeof MessageSquare; color: string }> = {
  vpop_agent: { label: 'VPoPエージェント', icon: MessageSquare, color: 'bg-blue-100 text-blue-700' },
  cxo_session: { label: 'CxO壁打ち', icon: Users, color: 'bg-purple-100 text-purple-700' },
  manual: { label: '手動作成', icon: FileText, color: 'bg-gray-100 text-gray-700' },
};

export function Memos() {
  const {
    currentProjectId,
    projects,
    agentMemos,
    agentChatSessions,
    sessions,
    hypotheses,
    createAgentMemo,
    updateAgentMemo,
    deleteAgentMemo,
  } = useStore();

  const currentProject = projects.find((p) => p.id === currentProjectId);

  const projectMemos = currentProjectId
    ? agentMemos.filter((m) => m.projectId === currentProjectId)
    : [];
  const projectHypotheses = currentProjectId
    ? hypotheses.filter((h) => h.projectId === currentProjectId)
    : [];

  // フィルター状態
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<MemoSourceType | 'all'>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // モーダル状態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState<AgentMemo | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // テキストから生成モーダル状態
  const [showTextInputModal, setShowTextInputModal] = useState(false);
  const [sourceText, setSourceText] = useState('');
  const [textFocusInstruction, setTextFocusInstruction] = useState('');
  const [isGeneratingFromText, setIsGeneratingFromText] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // 編集フォーム
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    keyPoints: [''],
    decisions: [''],
    nextActions: [''],
    tags: [''],
    relatedHypothesisIds: [] as string[],
  });

  // 全タグを抽出
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    projectMemos.forEach((memo) => {
      memo.tags?.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [projectMemos]);

  // フィルタリング
  const filteredMemos = useMemo(() => {
    return projectMemos
      .filter((memo) => {
        // ソースタイプフィルター
        if (sourceTypeFilter !== 'all' && memo.sourceType !== sourceTypeFilter) {
          return false;
        }
        // タグフィルター
        if (tagFilter && !memo.tags?.includes(tagFilter)) {
          return false;
        }
        // 検索クエリ
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            memo.title.toLowerCase().includes(query) ||
            memo.summary.toLowerCase().includes(query) ||
            memo.keyPoints.some((p) => p.toLowerCase().includes(query)) ||
            memo.decisions.some((d) => d.toLowerCase().includes(query)) ||
            memo.nextActions.some((a) => a.toLowerCase().includes(query))
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [projectMemos, sourceTypeFilter, tagFilter, searchQuery]);

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
      title: '',
      summary: '',
      keyPoints: [''],
      decisions: [''],
      nextActions: [''],
      tags: [''],
      relatedHypothesisIds: [],
    });
    setSelectedMemo(null);
    setIsModalOpen(true);
  };

  const openEditModal = (memo: AgentMemo) => {
    setFormData({
      title: memo.title,
      summary: memo.summary,
      keyPoints: memo.keyPoints.length > 0 ? memo.keyPoints : [''],
      decisions: memo.decisions.length > 0 ? memo.decisions : [''],
      nextActions: memo.nextActions.length > 0 ? memo.nextActions : [''],
      tags: memo.tags?.length > 0 ? memo.tags : [''],
      relatedHypothesisIds: memo.relatedHypothesisIds || [],
    });
    setSelectedMemo(memo);
    setIsDetailOpen(false);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.title.trim()) return;

    const cleanedData = {
      title: formData.title.trim(),
      summary: formData.summary.trim(),
      keyPoints: formData.keyPoints.filter((p) => p.trim()),
      decisions: formData.decisions.filter((d) => d.trim()),
      nextActions: formData.nextActions.filter((a) => a.trim()),
      tags: formData.tags.filter((t) => t.trim()),
      relatedHypothesisIds: formData.relatedHypothesisIds,
    };

    if (selectedMemo) {
      updateAgentMemo(selectedMemo.id, cleanedData);
    } else {
      createAgentMemo({
        projectId: currentProjectId,
        ...cleanedData,
        sourceType: 'manual',
        sourceMessageIds: [],
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('このメモを削除しますか？')) {
      deleteAgentMemo(id);
      if (selectedMemo?.id === id) {
        setIsDetailOpen(false);
        setSelectedMemo(null);
      }
    }
  };

  const openDetail = (memo: AgentMemo) => {
    setSelectedMemo(memo);
    setIsDetailOpen(true);
  };

  // テキストから生成モーダルを開く
  const openTextInputModal = () => {
    setSourceText('');
    setTextFocusInstruction('');
    setGenerationError(null);
    setShowTextInputModal(true);
  };

  // テキストからメモを生成
  const handleGenerateFromText = async () => {
    if (!sourceText.trim() || !currentProject) return;

    setIsGeneratingFromText(true);
    setGenerationError(null);

    try {
      const memo = await generateMemoFromText(
        sourceText.trim(),
        currentProject.name,
        undefined,
        textFocusInstruction.trim() || undefined
      );

      // 生成されたメモをフォームにセット
      setFormData({
        title: memo.title,
        summary: memo.summary,
        keyPoints: memo.keyPoints.length > 0 ? memo.keyPoints : [''],
        decisions: memo.decisions.length > 0 ? memo.decisions : [''],
        nextActions: memo.nextActions.length > 0 ? memo.nextActions : [''],
        tags: [''],
        relatedHypothesisIds: [],
      });
      setSelectedMemo(null);
      setShowTextInputModal(false);
      setIsModalOpen(true);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'メモの生成に失敗しました');
    } finally {
      setIsGeneratingFromText(false);
    }
  };

  const getSourceLabel = (memo: AgentMemo) => {
    const config = SOURCE_TYPE_LABELS[memo.sourceType || 'manual'];
    if (memo.sourceType === 'cxo_session' && memo.cxoRole) {
      return `${memo.cxoRole}壁打ち`;
    }
    return config.label;
  };

  const getSourceSession = (memo: AgentMemo) => {
    if (memo.sourceType === 'vpop_agent' && memo.chatSessionId) {
      return agentChatSessions.find((s) => s.id === memo.chatSessionId);
    }
    if (memo.sourceType === 'cxo_session' && memo.cxoSessionId) {
      return sessions.find((s) => s.id === memo.cxoSessionId);
    }
    return null;
  };

  const addArrayItem = (field: 'keyPoints' | 'decisions' | 'nextActions' | 'tags') => {
    setFormData({ ...formData, [field]: [...formData[field], ''] });
  };

  const updateArrayItem = (
    field: 'keyPoints' | 'decisions' | 'nextActions' | 'tags',
    index: number,
    value: string
  ) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  const removeArrayItem = (
    field: 'keyPoints' | 'decisions' | 'nextActions' | 'tags',
    index: number
  ) => {
    const newArray = formData[field].filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: newArray.length > 0 ? newArray : [''] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">メモ</h1>
          <p className="text-sm text-gray-500 mt-1">
            会話やセッションから抽出した重要な情報を管理
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-2" />
            メモを作成
          </Button>
          <Button
            variant="secondary"
            onClick={openTextInputModal}
            disabled={!isOpenAIConfigured()}
            title={!isOpenAIConfigured() ? 'OpenAI APIキーが設定されていません' : undefined}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            テキストから生成
          </Button>
        </div>
      </div>

      {/* フィルター */}
      <Card>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="メモを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={sourceTypeFilter}
              onChange={(e) => setSourceTypeFilter(e.target.value as MemoSourceType | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">すべてのソース</option>
              <option value="vpop_agent">VPoPエージェント</option>
              <option value="cxo_session">CxO壁打ち</option>
              <option value="manual">手動作成</option>
            </select>
          </div>

          {allTags.length > 0 && (
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-400" />
              <select
                value={tagFilter || ''}
                onChange={(e) => setTagFilter(e.target.value || null)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">すべてのタグ</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(searchQuery || sourceTypeFilter !== 'all' || tagFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSourceTypeFilter('all');
                setTagFilter(null);
              }}
            >
              <X className="w-4 h-4 mr-1" />
              クリア
            </Button>
          )}
        </div>
      </Card>

      {/* 統計 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-600">VPoPエージェント</p>
              <p className="text-xl font-bold text-blue-700">
                {projectMemos.filter((m) => m.sourceType === 'vpop_agent').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="bg-purple-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-purple-600">CxO壁打ち</p>
              <p className="text-xl font-bold text-purple-700">
                {projectMemos.filter((m) => m.sourceType === 'cxo_session').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">手動作成</p>
              <p className="text-xl font-bold text-gray-700">
                {projectMemos.filter((m) => m.sourceType === 'manual').length}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Tag className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-green-600">タグ数</p>
              <p className="text-xl font-bold text-green-700">{allTags.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* メモ一覧 */}
      {filteredMemos.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">メモがありません</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || sourceTypeFilter !== 'all' || tagFilter
                ? '条件に一致するメモが見つかりませんでした'
                : 'VPoPエージェントやCxO壁打ちから会話をメモに保存、または手動でメモを作成してください'}
            </p>
            {!searchQuery && sourceTypeFilter === 'all' && !tagFilter && (
              <div className="flex gap-2">
                <Button onClick={openCreateModal}>
                  <Plus className="w-4 h-4 mr-2" />
                  メモを作成
                </Button>
                <Button
                  variant="secondary"
                  onClick={openTextInputModal}
                  disabled={!isOpenAIConfigured()}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  テキストから生成
                </Button>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMemos.map((memo) => {
            const sourceConfig = SOURCE_TYPE_LABELS[memo.sourceType || 'manual'];
            const SourceIcon = sourceConfig.icon;
            const sourceSession = getSourceSession(memo);

            return (
              <Card
                key={memo.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openDetail(memo)}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sourceConfig.color}`}>
                          <SourceIcon className="w-3 h-3" />
                          {getSourceLabel(memo)}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900 line-clamp-2">{memo.title}</h3>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-2">{memo.summary}</p>

                  {memo.tags && memo.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {memo.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {memo.tags.length > 3 && (
                        <span className="px-2 py-0.5 text-gray-400 text-xs">
                          +{memo.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(memo.createdAt).toLocaleDateString('ja-JP')}
                    </div>
                    {sourceSession && (
                      <span className="truncate max-w-[150px]">
                        {sourceSession.title}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* テキストから生成モーダル */}
      <Modal
        isOpen={showTextInputModal}
        onClose={() => setShowTextInputModal(false)}
        title="テキストからメモを生成"
        size="xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ソーステキスト
            </label>
            <TextArea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="メモの元となるテキストを入力してください（会議メモ、議事録、ヒアリング内容など）"
              rows={8}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              フォーカス指示（任意）
            </label>
            <TextArea
              value={textFocusInstruction}
              onChange={(e) => setTextFocusInstruction(e.target.value)}
              placeholder="例）顧客課題に関する内容を中心に、次のアクションを重点的に抽出"
              rows={2}
            />
            <p className="mt-1 text-xs text-gray-500">
              特に注目したい観点を指示できます。空欄の場合はテキスト全体から自動で抽出します。
            </p>
          </div>

          {generationError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
              {generationError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => setShowTextInputModal(false)}
              disabled={isGeneratingFromText}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleGenerateFromText}
              disabled={!sourceText.trim() || isGeneratingFromText}
            >
              {isGeneratingFromText ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  生成する
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 作成/編集モーダル */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedMemo ? 'メモを編集' : 'メモを作成'}
        size="xl"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <Input
            label="タイトル"
            placeholder="メモのタイトル"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <TextArea
            label="要約"
            placeholder="メモの要約..."
            rows={3}
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
          />

          {/* 重要なポイント */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              重要なポイント
            </label>
            <div className="space-y-2">
              {formData.keyPoints.map((point, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="ポイントを入力..."
                    value={point}
                    onChange={(e) => updateArrayItem('keyPoints', index, e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeArrayItem('keyPoints', index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => addArrayItem('keyPoints')}
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
              {formData.decisions.map((decision, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="決定事項を入力..."
                    value={decision}
                    onChange={(e) => updateArrayItem('decisions', index, e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeArrayItem('decisions', index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => addArrayItem('decisions')}
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
              {formData.nextActions.map((action, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="アクションを入力..."
                    value={action}
                    onChange={(e) => updateArrayItem('nextActions', index, e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeArrayItem('nextActions', index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => addArrayItem('nextActions')}
              >
                <Plus className="w-4 h-4 mr-1" />
                追加
              </Button>
            </div>
          </div>

          {/* タグ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              タグ
            </label>
            <div className="space-y-2">
              {formData.tags.map((tag, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="タグを入力..."
                    value={tag}
                    onChange={(e) => updateArrayItem('tags', index, e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeArrayItem('tags', index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => addArrayItem('tags')}
              >
                <Plus className="w-4 h-4 mr-1" />
                追加
              </Button>
            </div>
          </div>

          {/* 関連仮説 */}
          {projectHypotheses.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                関連する仮説
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                {projectHypotheses.map((hypothesis) => (
                  <label key={hypothesis.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.relatedHypothesisIds.includes(hypothesis.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            relatedHypothesisIds: [...formData.relatedHypothesisIds, hypothesis.id],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            relatedHypothesisIds: formData.relatedHypothesisIds.filter(
                              (id) => id !== hypothesis.id
                            ),
                          });
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">
                      <span className="text-gray-500">[{hypothesis.level}]</span>{' '}
                      {hypothesis.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={!formData.title.trim()}>
              {selectedMemo ? '更新' : '作成'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 詳細モーダル */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedMemo?.title || ''}
        size="xl"
      >
        {selectedMemo && (
          <div className="space-y-4">
            {/* ソース情報 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => {
                  const config = SOURCE_TYPE_LABELS[selectedMemo.sourceType || 'manual'];
                  const Icon = config.icon;
                  return (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${config.color}`}>
                      <Icon className="w-4 h-4" />
                      {getSourceLabel(selectedMemo)}
                    </span>
                  );
                })()}
                <span className="text-sm text-gray-500">
                  {new Date(selectedMemo.createdAt).toLocaleString('ja-JP')}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEditModal(selectedMemo)}>
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(selectedMemo.id)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>

            {/* 要約 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">要約</h4>
              <p className="text-gray-900 whitespace-pre-wrap">{selectedMemo.summary}</p>
            </div>

            {/* タグ */}
            {selectedMemo.tags && selectedMemo.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedMemo.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-full cursor-pointer hover:bg-gray-200"
                    onClick={() => {
                      setTagFilter(tag);
                      setIsDetailOpen(false);
                    }}
                  >
                    <Tag className="w-3 h-3 inline mr-1" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* 重要なポイント */}
            {selectedMemo.keyPoints.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">重要なポイント</h4>
                <ul className="list-disc list-inside space-y-1">
                  {selectedMemo.keyPoints.map((point, i) => (
                    <li key={i} className="text-gray-900">{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 決定事項 */}
            {selectedMemo.decisions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">決定事項</h4>
                <ul className="list-disc list-inside space-y-1">
                  {selectedMemo.decisions.map((decision, i) => (
                    <li key={i} className="text-gray-900">{decision}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next Actions */}
            {selectedMemo.nextActions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Next Actions</h4>
                <ul className="list-disc list-inside space-y-1">
                  {selectedMemo.nextActions.map((action, i) => (
                    <li key={i} className="text-gray-900">{action}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 関連仮説 */}
            {selectedMemo.relatedHypothesisIds.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">関連する仮説</h4>
                <div className="space-y-1">
                  {selectedMemo.relatedHypothesisIds.map((id) => {
                    const hypothesis = projectHypotheses.find((h) => h.id === id);
                    if (!hypothesis) return null;
                    return (
                      <div
                        key={id}
                        className="text-sm text-blue-600 hover:underline cursor-pointer"
                      >
                        [{hypothesis.level}] {hypothesis.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
