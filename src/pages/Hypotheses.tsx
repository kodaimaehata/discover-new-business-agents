import { useState, useEffect } from 'react';
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Circle,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Trash2,
  Edit2,
  Target,
  Compass,
  ChevronUp,
  Save,
} from 'lucide-react';
import { Card, Button, Badge, Modal, Input, TextArea, Select } from '../components/common';
import { useStore } from '../store';
import {
  HYPOTHESIS_LEVELS,
  WHY_SUB_TYPES,
  COMMITMENT_LEVELS,
  type Hypothesis,
  type HypothesisLevel,
  type HypothesisStatus,
  type WhySubType,
  type ExplorationGuardrail,
  type WorkingMissionVision,
  type CommitmentLevel,
} from '../types';

export function Hypotheses() {
  const {
    currentProjectId,
    getProjectHypotheses,
    createHypothesis,
    updateHypothesis,
    deleteHypothesis,
    getProjectGuardrail,
    createGuardrail,
    updateGuardrail,
    getProjectWorkingMV,
    createWorkingMV,
    updateWorkingMV,
  } = useStore();

  const hypotheses = currentProjectId ? getProjectHypotheses(currentProjectId) : [];
  const guardrail = currentProjectId ? getProjectGuardrail(currentProjectId) : undefined;
  const workingMV = currentProjectId ? getProjectWorkingMV(currentProjectId) : undefined;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHypothesis, setEditingHypothesis] = useState<Hypothesis | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // UI State
  const [whySubTypeTab, setWhySubTypeTab] = useState<WhySubType>('customer');
  const [guardrailExpanded, setGuardrailExpanded] = useState(true);
  const [isEditingGuardrail, setIsEditingGuardrail] = useState(false);
  const [isEditingMV, setIsEditingMV] = useState(false);
  const [showMVEditWarning, setShowMVEditWarning] = useState(false);

  // Check if M/V is fully committed
  const isMVCommitted = workingMV?.missionCommitment === 'committed' && workingMV?.visionCommitment === 'committed';
  const isPartiallyCommitted = workingMV && (workingMV.missionCommitment === 'committed' || workingMV.visionCommitment === 'committed');

  // Form state
  const [formData, setFormData] = useState({
    level: 'WHY' as HypothesisLevel,
    whySubType: 'customer' as WhySubType,
    parentId: null as string | null,
    title: '',
    description: '',
  });

  // Guardrail form state
  const [guardrailForm, setGuardrailForm] = useState<Omit<ExplorationGuardrail, 'id' | 'createdAt' | 'updatedAt' | 'projectId'>>({
    domain: '',
    targetCustomer: '',
    observableChange: '',
    exclusions: [],
  });

  // Working Mission/Vision form state
  const [mvForm, setMVForm] = useState<{
    mission: string;
    missionCommitment: CommitmentLevel;
    vision: string;
    visionCommitment: CommitmentLevel;
    commitmentCriteria: WorkingMissionVision['commitmentCriteria'];
  }>({
    mission: '',
    missionCommitment: 'draft',
    vision: '',
    visionCommitment: 'draft',
    commitmentCriteria: {
      customerSegmentDefined: false,
      problemValidated: false,
      competitiveAdvantageIdentified: false,
      solutionDirectionClear: false,
    },
  });

  // Initialize forms when data loads
  useEffect(() => {
    if (guardrail) {
      setGuardrailForm({
        domain: guardrail.domain,
        targetCustomer: guardrail.targetCustomer,
        observableChange: guardrail.observableChange,
        exclusions: guardrail.exclusions,
      });
    }
    if (workingMV) {
      setMVForm({
        mission: workingMV.mission,
        missionCommitment: workingMV.missionCommitment,
        vision: workingMV.vision,
        visionCommitment: workingMV.visionCommitment,
        commitmentCriteria: workingMV.commitmentCriteria,
      });
    }
  }, [guardrail, workingMV]);

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

  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const openCreateModal = (parentId: string | null = null, level: HypothesisLevel = 'WHY', whySubType?: WhySubType) => {
    setFormData({
      level,
      whySubType: whySubType || (level === 'WHY' ? whySubTypeTab : 'customer'),
      parentId,
      title: '',
      description: '',
    });
    setEditingHypothesis(null);
    setIsModalOpen(true);
  };

  const openEditModal = (hypothesis: Hypothesis) => {
    setFormData({
      level: hypothesis.level,
      whySubType: hypothesis.whySubType || 'customer',
      parentId: hypothesis.parentId,
      title: hypothesis.title,
      description: hypothesis.description,
    });
    setEditingHypothesis(hypothesis);
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) return;

    if (editingHypothesis) {
      updateHypothesis(editingHypothesis.id, {
        title: formData.title,
        description: formData.description,
        level: formData.level,
        whySubType: formData.level === 'WHY' ? formData.whySubType : undefined,
      });
    } else {
      createHypothesis({
        projectId: currentProjectId,
        parentId: formData.parentId,
        level: formData.level,
        whySubType: formData.level === 'WHY' ? formData.whySubType : undefined,
        title: formData.title,
        description: formData.description,
        status: 'unverified',
        evidence: [],
        alternatives: [],
      });
    }

    setIsModalOpen(false);
  };

  // Guardrail save handler
  const handleSaveGuardrail = () => {
    if (!currentProjectId) return;
    if (guardrail) {
      updateGuardrail(guardrail.id, guardrailForm);
    } else {
      createGuardrail({
        projectId: currentProjectId,
        ...guardrailForm,
      });
    }
    setIsEditingGuardrail(false);
  };

  // Working Mission/Vision save handler
  const handleSaveMV = () => {
    if (!currentProjectId) return;
    if (workingMV) {
      updateWorkingMV(workingMV.id, {
        ...mvForm,
        missionEvidence: workingMV.missionEvidence,
        visionEvidence: workingMV.visionEvidence,
      });
    } else {
      createWorkingMV({
        projectId: currentProjectId,
        ...mvForm,
        missionEvidence: [],
        visionEvidence: [],
      });
    }
    setIsEditingMV(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('この仮説を削除しますか？子仮説も削除されます。')) {
      deleteHypothesis(id);
    }
  };

  const updateStatus = (id: string, status: HypothesisStatus) => {
    updateHypothesis(id, { status });
  };

  const getStatusIcon = (status: HypothesisStatus) => {
    switch (status) {
      case 'validated':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'invalidated':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'validating':
        return <HelpCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: HypothesisStatus) => {
    switch (status) {
      case 'validated':
        return <Badge variant="success" size="sm">検証済</Badge>;
      case 'invalidated':
        return <Badge variant="danger" size="sm">反証</Badge>;
      case 'validating':
        return <Badge variant="warning" size="sm">検証中</Badge>;
      default:
        return <Badge size="sm">未検証</Badge>;
    }
  };

  const getLevelColor = (level: HypothesisLevel) => {
    switch (level) {
      case 'WHY':
        return 'border-l-blue-500 bg-blue-50';
      case 'WHAT':
        return 'border-l-green-500 bg-green-50';
      case 'HOW':
        return 'border-l-orange-500 bg-orange-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getCommitmentBadge = (level: CommitmentLevel) => {
    switch (level) {
      case 'draft':
        return <Badge size="sm">Draft</Badge>;
      case 'supported':
        return <Badge variant="warning" size="sm">Supported</Badge>;
      case 'committed':
        return <Badge variant="success" size="sm">Committed</Badge>;
    }
  };

  // Build tree structure
  const getChildren = (parentId: string) =>
    hypotheses.filter((h) => h.parentId === parentId);

  const renderHypothesisNode = (hypothesis: Hypothesis, depth: number = 0) => {
    const children = getChildren(hypothesis.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedNodes.has(hypothesis.id);

    const nextLevel = (): HypothesisLevel => {
      switch (hypothesis.level) {
        case 'WHY':
          return 'WHAT';
        case 'WHAT':
          return 'HOW';
        default:
          return 'HOW';
      }
    };

    return (
      <div key={hypothesis.id} style={{ marginLeft: depth * 24 }}>
        <div
          className={`border-l-4 ${getLevelColor(
            hypothesis.level
          )} rounded-lg p-4 mb-2`}
        >
          <div className="flex items-start gap-3">
            <button
              onClick={() => toggleNode(hypothesis.id)}
              className="mt-1 p-1 hover:bg-white/50 rounded"
            >
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )
              ) : (
                <div className="w-4 h-4" />
              )}
            </button>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {getStatusIcon(hypothesis.status)}
                <span className="font-medium text-gray-900">{hypothesis.title}</span>
                <Badge size="sm">{hypothesis.level}</Badge>
                {getStatusBadge(hypothesis.status)}
              </div>
              {hypothesis.description && (
                <p className="text-sm text-gray-600 ml-7">{hypothesis.description}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={hypothesis.status}
                onChange={(e) =>
                  updateStatus(hypothesis.id, e.target.value as HypothesisStatus)
                }
                className="text-xs border border-gray-300 rounded px-2 py-1"
              >
                <option value="unverified">未検証</option>
                <option value="validating">検証中</option>
                <option value="validated">検証済</option>
                <option value="invalidated">反証</option>
              </select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEditModal(hypothesis)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(hypothesis.id)}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
              {hypothesis.level !== 'HOW' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openCreateModal(hypothesis.id, nextLevel())}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {isExpanded &&
          children.map((child) => renderHypothesisNode(child, depth + 1))}
      </div>
    );
  };

  // Filter WHY hypotheses by subtype
  const whyHypotheses = hypotheses.filter(h => h.level === 'WHY' && h.whySubType === whySubTypeTab);
  const whatHypotheses = hypotheses.filter(h => h.level === 'WHAT');
  const howHypotheses = hypotheses.filter(h => h.level === 'HOW');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">仮説ツリー</h1>
          <p className="text-sm text-gray-500 mt-1">
            Working Mission/Vision → Why → What → How の階層で仮説を管理
          </p>
        </div>
      </div>

      {/* Exploration Guardrail Section */}
      <Card>
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setGuardrailExpanded(!guardrailExpanded)}
        >
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold text-gray-900">探索ガードレール</h2>
            <span className="text-xs text-gray-500">探索の拡散を防ぐための初期設定</span>
          </div>
          {guardrailExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>

        {guardrailExpanded && (
          <div className="mt-4 space-y-4">
            {isEditingGuardrail ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="対象領域"
                    placeholder="どの市場/業界/シーン"
                    value={guardrailForm.domain}
                    onChange={(e) => setGuardrailForm({ ...guardrailForm, domain: e.target.value })}
                  />
                  <Input
                    label="対象顧客（仮）"
                    placeholder="誰を対象にするか"
                    value={guardrailForm.targetCustomer}
                    onChange={(e) => setGuardrailForm({ ...guardrailForm, targetCustomer: e.target.value })}
                  />
                </div>
                <Input
                  label="観測したい変化（仮）"
                  placeholder="どんな変化を起こしたいか"
                  value={guardrailForm.observableChange}
                  onChange={(e) => setGuardrailForm({ ...guardrailForm, observableChange: e.target.value })}
                />
                <TextArea
                  label="除外条件（やらないこと）"
                  placeholder="1行に1つずつ記入"
                  rows={3}
                  value={guardrailForm.exclusions.join('\n')}
                  onChange={(e) => setGuardrailForm({ ...guardrailForm, exclusions: e.target.value.split('\n').filter(s => s.trim()) })}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveGuardrail}>
                    <Save className="w-4 h-4 mr-1" />
                    保存
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setIsEditingGuardrail(false)}>
                    キャンセル
                  </Button>
                </div>
              </>
            ) : (
              <>
                {guardrail ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">対象領域：</span>
                      <span className="ml-2">{guardrail.domain || '未設定'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">対象顧客：</span>
                      <span className="ml-2">{guardrail.targetCustomer || '未設定'}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-gray-500">観測したい変化：</span>
                      <span className="ml-2">{guardrail.observableChange || '未設定'}</span>
                    </div>
                    {guardrail.exclusions.length > 0 && (
                      <div className="md:col-span-2">
                        <span className="text-gray-500">除外条件：</span>
                        <ul className="ml-4 list-disc">
                          {guardrail.exclusions.map((ex, i) => (
                            <li key={i} className="text-gray-700">{ex}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">ガードレールが設定されていません</p>
                )}
                <Button size="sm" variant="secondary" onClick={() => setIsEditingGuardrail(true)}>
                  <Edit2 className="w-4 h-4 mr-1" />
                  {guardrail ? '編集' : '設定する'}
                </Button>
              </>
            )}
          </div>
        )}
      </Card>

      {/* Working Mission/Vision Section */}
      <Card className={isMVCommitted ? 'border-indigo-300 bg-indigo-50/30' : ''}>
        <div className="flex items-center gap-2 mb-4">
          <Target className={`w-5 h-5 ${isMVCommitted ? 'text-indigo-700' : 'text-indigo-600'}`} />
          <h2 className="font-semibold text-gray-900">
            {isMVCommitted ? 'Mission / Vision（確定）' : 'Working Mission / Vision'}
          </h2>
          {isMVCommitted ? (
            <Badge variant="success" size="sm">確定済み</Badge>
          ) : (
            <span className="text-xs text-gray-500">暫定版として管理、証拠が揃ったらコミット</span>
          )}
        </div>

        {isEditingMV ? (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-gray-700">Working Mission</label>
                <select
                  value={mvForm.missionCommitment}
                  onChange={(e) => setMVForm({ ...mvForm, missionCommitment: e.target.value as CommitmentLevel })}
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                >
                  {COMMITMENT_LEVELS.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <TextArea
                placeholder="私たちは[誰]の[困りごと]を[どう変える]ために..."
                rows={2}
                value={mvForm.mission}
                onChange={(e) => setMVForm({ ...mvForm, mission: e.target.value })}
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-gray-700">Working Vision</label>
                <select
                  value={mvForm.visionCommitment}
                  onChange={(e) => setMVForm({ ...mvForm, visionCommitment: e.target.value as CommitmentLevel })}
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                >
                  {COMMITMENT_LEVELS.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <TextArea
                placeholder="数年後、[誰]が[当たり前にできる状態]をつくる"
                rows={2}
                value={mvForm.vision}
                onChange={(e) => setMVForm({ ...mvForm, vision: e.target.value })}
              />
            </div>
            {/* Commitment Criteria Checklist */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">コミット条件チェックリスト</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  { key: 'customerSegmentDefined', label: '顧客セグメントが絞れている' },
                  { key: 'problemValidated', label: '課題の強さが確認できている' },
                  { key: 'competitiveAdvantageIdentified', label: '勝てる理由が言える' },
                  { key: 'solutionDirectionClear', label: 'ソリューションの方向性が見えている' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={mvForm.commitmentCriteria[key as keyof typeof mvForm.commitmentCriteria]}
                      onChange={(e) => setMVForm({
                        ...mvForm,
                        commitmentCriteria: {
                          ...mvForm.commitmentCriteria,
                          [key]: e.target.checked,
                        },
                      })}
                      className="rounded border-gray-300"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveMV}>
                <Save className="w-4 h-4 mr-1" />
                保存
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setIsEditingMV(false)}>
                キャンセル
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {workingMV ? (
              <>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-700">Mission</span>
                      {getCommitmentBadge(workingMV.missionCommitment)}
                    </div>
                    <p className="text-gray-800 bg-indigo-50 rounded-lg p-3">
                      {workingMV.mission || '未設定'}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-700">Vision</span>
                      {getCommitmentBadge(workingMV.visionCommitment)}
                    </div>
                    <p className="text-gray-800 bg-indigo-50 rounded-lg p-3">
                      {workingMV.vision || '未設定'}
                    </p>
                  </div>
                </div>
                {/* Commitment progress */}
                <div className="flex flex-wrap gap-2">
                  {Object.entries(workingMV.commitmentCriteria).map(([key, value]) => {
                    const labels: Record<string, string> = {
                      customerSegmentDefined: '顧客セグメント',
                      problemValidated: '課題検証',
                      competitiveAdvantageIdentified: '競争優位',
                      solutionDirectionClear: 'ソリューション',
                    };
                    return (
                      <Badge
                        key={key}
                        variant={value ? 'success' : 'default'}
                        size="sm"
                      >
                        {value ? '✓' : '○'} {labels[key]}
                      </Badge>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">Working Mission/Visionが設定されていません</p>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (isPartiallyCommitted) {
                  setShowMVEditWarning(true);
                } else {
                  setIsEditingMV(true);
                }
              }}
            >
              <Edit2 className="w-4 h-4 mr-1" />
              {workingMV ? (isMVCommitted ? '変更する' : '編集') : '設定する'}
            </Button>
          </div>
        )}
      </Card>

      {/* Warning Modal for editing committed M/V */}
      <Modal
        isOpen={showMVEditWarning}
        onClose={() => setShowMVEditWarning(false)}
        title="確定済みMission/Visionの変更"
      >
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  確定済みのMission/Visionを変更しようとしています
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Mission/Visionは既にコミット済みです。変更すると、これまでの意思決定との整合性に影響する可能性があります。
                </p>
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-2">変更が必要な場合：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>新たな顧客インサイトによる大幅なピボット</li>
              <li>市場環境の変化への対応</li>
              <li>ステークホルダーとの合意に基づく方針変更</li>
            </ul>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowMVEditWarning(false)}>
              キャンセル
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setShowMVEditWarning(false);
                setIsEditingMV(true);
              }}
            >
              変更を続ける
            </Button>
          </div>
        </div>
      </Modal>

      {/* WHY Level with Tab Switching */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <h2 className="font-semibold text-gray-900">Why</h2>
            <span className="text-xs text-gray-500">なぜこの事業をやるのか</span>
          </div>
          <Button size="sm" onClick={() => openCreateModal(null, 'WHY', whySubTypeTab)}>
            <Plus className="w-4 h-4 mr-1" />
            追加
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-4">
          {WHY_SUB_TYPES.map((subType) => (
            <button
              key={subType.id}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                whySubTypeTab === subType.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setWhySubTypeTab(subType.id)}
            >
              {subType.name}
              <span className="ml-1 text-xs text-gray-400">
                ({hypotheses.filter(h => h.level === 'WHY' && h.whySubType === subType.id).length})
              </span>
            </button>
          ))}
        </div>

        {/* WHY Hypotheses */}
        {whyHypotheses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">
              {whySubTypeTab === 'customer' ? '顧客Whyの仮説がありません' : 'チームWILLの仮説がありません'}
            </p>
            <Button size="sm" variant="secondary" onClick={() => openCreateModal(null, 'WHY', whySubTypeTab)}>
              <Plus className="w-4 h-4 mr-1" />
              追加
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {whyHypotheses.map((h) => renderHypothesisNode(h))}
          </div>
        )}
      </Card>

      {/* WHAT Level */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <h2 className="font-semibold text-gray-900">What</h2>
            <span className="text-xs text-gray-500">何を提供するのか</span>
          </div>
          <Button size="sm" onClick={() => openCreateModal(null, 'WHAT')}>
            <Plus className="w-4 h-4 mr-1" />
            追加
          </Button>
        </div>
        {whatHypotheses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Whatの仮説がありません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {whatHypotheses.filter(h => !h.parentId).map((h) => renderHypothesisNode(h))}
          </div>
        )}
      </Card>

      {/* HOW Level */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-orange-500" />
            <h2 className="font-semibold text-gray-900">How</h2>
            <span className="text-xs text-gray-500">どう実現するのか</span>
          </div>
          <Button size="sm" onClick={() => openCreateModal(null, 'HOW')}>
            <Plus className="w-4 h-4 mr-1" />
            追加
          </Button>
        </div>
        {howHypotheses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Howの仮説がありません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {howHypotheses.filter(h => !h.parentId).map((h) => renderHypothesisNode(h))}
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingHypothesis ? '仮説を編集' : '新規仮説を作成'}
      >
        <div className="space-y-4">
          <Select
            label="階層"
            value={formData.level}
            onChange={(e) =>
              setFormData({ ...formData, level: e.target.value as HypothesisLevel })
            }
            options={HYPOTHESIS_LEVELS.map((l) => ({
              value: l.id,
              label: `${l.name} - ${l.description}`,
            }))}
          />

          {formData.level === 'WHY' && (
            <Select
              label="Whyのタイプ"
              value={formData.whySubType}
              onChange={(e) =>
                setFormData({ ...formData, whySubType: e.target.value as WhySubType })
              }
              options={WHY_SUB_TYPES.map((s) => ({
                value: s.id,
                label: `${s.name} - ${s.description}`,
              }))}
            />
          )}

          <Input
            label="仮説タイトル"
            placeholder="例：中小企業のオーナーは顧客管理に課題を抱えている"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <TextArea
            label="詳細説明"
            placeholder="仮説の詳細な内容を記述..."
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit}>
              {editingHypothesis ? '更新' : '作成'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
