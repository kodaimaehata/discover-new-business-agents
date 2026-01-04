import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, FileText, ChevronRight, AlertTriangle } from 'lucide-react';
import {
  Card,
  Button,
  Badge,
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
import type { PRD as PRDType, PRDFeature, PRDRisk } from '../types';

export function PRD() {
  const { currentProjectId, getProjectPRDs, createPRD, deletePRD, getProjectWorkingMV } = useStore();

  const prds = currentProjectId ? getProjectPRDs(currentProjectId) : [];
  const workingMV = currentProjectId ? getProjectWorkingMV(currentProjectId) : undefined;

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPRD, setSelectedPRD] = useState<PRDType | null>(null);
  const [wizardStep, setWizardStep] = useState(1);

  const [formData, setFormData] = useState({
    title: '',
    core: { vision: '', mission: '' },
    why: { problem: '', targetCustomer: '', value: '' },
    what: { solution: '', features: [] as PRDFeature[] },
    validationPlan: '',
    metrics: [''],
    risks: [] as PRDRisk[],
  });

  // Pre-fill from Working Mission/Vision when opening wizard
  useEffect(() => {
    if (workingMV && isWizardOpen && wizardStep === 1) {
      setFormData((prev) => ({
        ...prev,
        core: {
          vision: workingMV.vision || prev.core.vision,
          mission: workingMV.mission || prev.core.mission,
        },
      }));
    }
  }, [workingMV, isWizardOpen, wizardStep]);

  const isCommitted = workingMV?.missionCommitment === 'committed' && workingMV?.visionCommitment === 'committed';

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

  const resetForm = () => {
    setFormData({
      title: '',
      core: { vision: '', mission: '' },
      why: { problem: '', targetCustomer: '', value: '' },
      what: { solution: '', features: [] },
      validationPlan: '',
      metrics: [''],
      risks: [],
    });
    setWizardStep(1);
  };

  const openWizard = () => {
    resetForm();
    setIsWizardOpen(true);
  };

  const openDetail = (prd: PRDType) => {
    setSelectedPRD(prd);
    setIsDetailOpen(true);
  };

  const handleCreate = () => {
    if (!formData.title.trim()) return;

    createPRD({
      projectId: currentProjectId,
      title: formData.title,
      core: formData.core,
      why: formData.why,
      what: formData.what,
      validationPlan: formData.validationPlan,
      metrics: formData.metrics.filter((m) => m.trim()),
      risks: formData.risks,
      status: 'draft',
    });

    setIsWizardOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('このPRDを削除しますか？')) {
      deletePRD(id);
    }
  };

  const addFeature = () => {
    setFormData({
      ...formData,
      what: {
        ...formData.what,
        features: [
          ...formData.what.features,
          { id: uuidv4(), name: '', description: '', priority: 'should' },
        ],
      },
    });
  };

  const updateFeature = (id: string, updates: Partial<PRDFeature>) => {
    setFormData({
      ...formData,
      what: {
        ...formData.what,
        features: formData.what.features.map((f) =>
          f.id === id ? { ...f, ...updates } : f
        ),
      },
    });
  };

  const removeFeature = (id: string) => {
    setFormData({
      ...formData,
      what: {
        ...formData.what,
        features: formData.what.features.filter((f) => f.id !== id),
      },
    });
  };

  const addRisk = () => {
    setFormData({
      ...formData,
      risks: [
        ...formData.risks,
        { id: uuidv4(), description: '', impact: 'medium', probability: 'medium', mitigation: '' },
      ],
    });
  };

  const updateRisk = (id: string, updates: Partial<PRDRisk>) => {
    setFormData({
      ...formData,
      risks: formData.risks.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    });
  };

  const removeRisk = (id: string) => {
    setFormData({
      ...formData,
      risks: formData.risks.filter((r) => r.id !== id),
    });
  };

  const addMetric = () => {
    setFormData({
      ...formData,
      metrics: [...formData.metrics, ''],
    });
  };

  const updateMetric = (index: number, value: string) => {
    const newMetrics = [...formData.metrics];
    newMetrics[index] = value;
    setFormData({ ...formData, metrics: newMetrics });
  };

  const removeMetric = (index: number) => {
    setFormData({
      ...formData,
      metrics: formData.metrics.filter((_, i) => i !== index),
    });
  };

  const getStatusBadge = (status: PRDType['status']) => {
    switch (status) {
      case 'draft':
        return <Badge size="sm">下書き</Badge>;
      case 'review':
        return <Badge variant="warning" size="sm">レビュー中</Badge>;
      case 'approved':
        return <Badge variant="success" size="sm">承認済</Badge>;
    }
  };

  const renderWizardStep = () => {
    switch (wizardStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 rounded-lg mb-4">
              <h4 className="font-medium text-purple-800 mb-2">Step 1: Working Mission / Vision</h4>
              <p className="text-sm text-purple-600">
                この事業の根幹となるビジョンとミッションを定義します。
                Working Mission/Visionが設定されている場合は自動的に反映されます。
              </p>
            </div>

            {workingMV && !isCommitted && (
              <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Working Mission/Visionがまだコミットされていません
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    PRDを作成する前に、仮説ツリーでMission/Visionをコミット済みにすることを推奨します。
                  </p>
                </div>
              </div>
            )}

            <Input
              label="PRDタイトル"
              placeholder="例：次世代CRMプラットフォーム PRD v1"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />

            <TextArea
              label="Vision（ビジョン）"
              placeholder="数年後、[誰]が[当たり前にできる状態]をつくる..."
              rows={3}
              value={formData.core.vision}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  core: { ...formData.core, vision: e.target.value },
                })
              }
            />

            <TextArea
              label="Mission（ミッション）"
              placeholder="私たちは[誰]の[困りごと]を[どう変える]ために..."
              rows={3}
              value={formData.core.mission}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  core: { ...formData.core, mission: e.target.value },
                })
              }
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg mb-4">
              <h4 className="font-medium text-blue-800 mb-2">Step 2: Why（なぜこの事業をやるのか）</h4>
              <p className="text-sm text-blue-600">
                顧客の課題、ターゲット顧客、提供価値を明確にします。
                Coreから発想できるWhyは無数にあり、選択の理由が重要です。
              </p>
            </div>

            <TextArea
              label="Problem（課題）"
              placeholder="顧客が抱えている課題は何か..."
              rows={3}
              value={formData.why.problem}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  why: { ...formData.why, problem: e.target.value },
                })
              }
            />

            <TextArea
              label="Target Customer（対象顧客）"
              placeholder="誰のための事業か、具体的に..."
              rows={3}
              value={formData.why.targetCustomer}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  why: { ...formData.why, targetCustomer: e.target.value },
                })
              }
            />

            <TextArea
              label="Value（提供価値）"
              placeholder="顧客にどのような価値を提供するか..."
              rows={3}
              value={formData.why.value}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  why: { ...formData.why, value: e.target.value },
                })
              }
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg mb-4">
              <h4 className="font-medium text-green-800 mb-2">Step 3: What（何を提供するのか）</h4>
              <p className="text-sm text-green-600">
                具体的なソリューションと機能を定義します。
                Whyから発想できるWhatも無数にあり、なぜそれを選んだかの理由が重要です。
              </p>
            </div>

            <TextArea
              label="Solution（ソリューション概要）"
              placeholder="どのようなソリューションで課題を解決するか..."
              rows={3}
              value={formData.what.solution}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  what: { ...formData.what, solution: e.target.value },
                })
              }
            />

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Features（機能）
                </label>
                <Button variant="ghost" size="sm" onClick={addFeature}>
                  <Plus className="w-4 h-4 mr-1" />
                  追加
                </Button>
              </div>
              <div className="space-y-3">
                {formData.what.features.map((feature) => (
                  <div key={feature.id} className="p-3 border rounded-lg">
                    <div className="flex gap-3">
                      <Input
                        placeholder="機能名"
                        className="w-1/3"
                        value={feature.name}
                        onChange={(e) =>
                          updateFeature(feature.id, { name: e.target.value })
                        }
                      />
                      <Select
                        className="w-1/4"
                        value={feature.priority}
                        onChange={(e) =>
                          updateFeature(feature.id, {
                            priority: e.target.value as PRDFeature['priority'],
                          })
                        }
                        options={[
                          { value: 'must', label: 'Must' },
                          { value: 'should', label: 'Should' },
                          { value: 'could', label: 'Could' },
                          { value: 'wont', label: "Won't" },
                        ]}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFeature(feature.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                    <TextArea
                      placeholder="機能の説明..."
                      rows={2}
                      className="mt-2"
                      value={feature.description}
                      onChange={(e) =>
                        updateFeature(feature.id, { description: e.target.value })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-orange-50 rounded-lg mb-4">
              <h4 className="font-medium text-orange-800 mb-2">
                Step 4: 検証計画・指標・リスク
              </h4>
              <p className="text-sm text-orange-600">
                仮説の検証方法、成功を測る指標、リスクとその対策を定義します。
                アウトカム重視のPRDには、これらが必須です。
              </p>
            </div>

            <TextArea
              label="Validation Plan（検証計画）"
              placeholder="どのように仮説を検証するか..."
              rows={3}
              value={formData.validationPlan}
              onChange={(e) =>
                setFormData({ ...formData, validationPlan: e.target.value })
              }
            />

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Metrics（計測指標）
                </label>
                <Button variant="ghost" size="sm" onClick={addMetric}>
                  <Plus className="w-4 h-4 mr-1" />
                  追加
                </Button>
              </div>
              <div className="space-y-2">
                {formData.metrics.map((metric, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="例：MAU、継続率、NPS..."
                      value={metric}
                      onChange={(e) => updateMetric(index, e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMetric(index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Risks（リスク）
                </label>
                <Button variant="ghost" size="sm" onClick={addRisk}>
                  <Plus className="w-4 h-4 mr-1" />
                  追加
                </Button>
              </div>
              <div className="space-y-3">
                {formData.risks.map((risk) => (
                  <div key={risk.id} className="p-3 border rounded-lg">
                    <div className="flex gap-3 mb-2">
                      <Select
                        className="w-1/4"
                        value={risk.impact}
                        onChange={(e) =>
                          updateRisk(risk.id, {
                            impact: e.target.value as PRDRisk['impact'],
                          })
                        }
                        options={[
                          { value: 'high', label: '影響: 高' },
                          { value: 'medium', label: '影響: 中' },
                          { value: 'low', label: '影響: 低' },
                        ]}
                      />
                      <Select
                        className="w-1/4"
                        value={risk.probability}
                        onChange={(e) =>
                          updateRisk(risk.id, {
                            probability: e.target.value as PRDRisk['probability'],
                          })
                        }
                        options={[
                          { value: 'high', label: '確率: 高' },
                          { value: 'medium', label: '確率: 中' },
                          { value: 'low', label: '確率: 低' },
                        ]}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRisk(risk.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                    <Input
                      placeholder="リスクの内容..."
                      className="mb-2"
                      value={risk.description}
                      onChange={(e) =>
                        updateRisk(risk.id, { description: e.target.value })
                      }
                    />
                    <Input
                      placeholder="対策..."
                      value={risk.mitigation}
                      onChange={(e) =>
                        updateRisk(risk.id, { mitigation: e.target.value })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PRD</h1>
          <p className="text-sm text-gray-500 mt-1">
            Core/Why/What を中心としたPRDを作成・管理
          </p>
        </div>
        <Button onClick={openWizard}>
          <Plus className="w-4 h-4 mr-2" />
          PRDを作成
        </Button>
      </div>

      {/* PRD List */}
      {prds.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">まだPRDがありません</p>
            <Button onClick={openWizard}>
              <Plus className="w-4 h-4 mr-2" />
              最初のPRDを作成
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prds.map((prd) => (
            <Card key={prd.id} className="cursor-pointer hover:border-blue-300 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1" onClick={() => openDetail(prd)}>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <h3 className="font-medium text-gray-900">{prd.title}</h3>
                    {getStatusBadge(prd.status)}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{prd.core.vision}</p>
                  <div className="flex gap-2">
                    <Badge size="sm" variant="info">
                      {prd.what.features.length}機能
                    </Badge>
                    <Badge size="sm">
                      {prd.risks.length}リスク
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(prd.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Wizard Modal */}
      <Modal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        title="PRD作成ウィザード"
        size="lg"
      >
        <div>
          {/* Progress */}
          <div className="flex items-center justify-between mb-6">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === wizardStep
                      ? 'bg-blue-500 text-white'
                      : step < wizardStep
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step}
                </div>
                {step < 4 && (
                  <ChevronRight
                    className={`w-5 h-5 mx-2 ${
                      step < wizardStep ? 'text-green-500' : 'text-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {renderWizardStep()}

          <div className="flex justify-between pt-6 border-t mt-6">
            <Button
              variant="secondary"
              onClick={() => (wizardStep > 1 ? setWizardStep(wizardStep - 1) : setIsWizardOpen(false))}
            >
              {wizardStep > 1 ? '戻る' : 'キャンセル'}
            </Button>
            {wizardStep < 4 ? (
              <Button onClick={() => setWizardStep(wizardStep + 1)}>
                次へ
              </Button>
            ) : (
              <Button onClick={handleCreate}>PRDを作成</Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedPRD?.title || ''}
        size="xl"
      >
        {selectedPRD && (
          <Tabs defaultValue="core">
            <TabsList>
              <TabsTrigger value="core">Core</TabsTrigger>
              <TabsTrigger value="why">Why</TabsTrigger>
              <TabsTrigger value="what">What</TabsTrigger>
              <TabsTrigger value="validation">検証・リスク</TabsTrigger>
            </TabsList>

            <TabsContent value="core" className="mt-4 space-y-4">
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-800 mb-2">Vision</h4>
                <p className="text-purple-700">{selectedPRD.core.vision}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-800 mb-2">Mission</h4>
                <p className="text-purple-700">{selectedPRD.core.mission}</p>
              </div>
            </TabsContent>

            <TabsContent value="why" className="mt-4 space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Problem</h4>
                <p className="text-blue-700">{selectedPRD.why.problem}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Target Customer</h4>
                <p className="text-blue-700">{selectedPRD.why.targetCustomer}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Value</h4>
                <p className="text-blue-700">{selectedPRD.why.value}</p>
              </div>
            </TabsContent>

            <TabsContent value="what" className="mt-4 space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">Solution</h4>
                <p className="text-green-700">{selectedPRD.what.solution}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Features</h4>
                <div className="space-y-2">
                  {selectedPRD.what.features.map((feature) => (
                    <div key={feature.id} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{feature.name}</span>
                        <Badge
                          size="sm"
                          variant={
                            feature.priority === 'must'
                              ? 'danger'
                              : feature.priority === 'should'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {feature.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="validation" className="mt-4 space-y-4">
              <div className="p-4 bg-orange-50 rounded-lg">
                <h4 className="font-medium text-orange-800 mb-2">Validation Plan</h4>
                <p className="text-orange-700">{selectedPRD.validationPlan}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Metrics</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedPRD.metrics.map((metric, i) => (
                    <Badge key={i}>{metric}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Risks</h4>
                <div className="space-y-2">
                  {selectedPRD.risks.map((risk) => (
                    <div key={risk.id} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          size="sm"
                          variant={risk.impact === 'high' ? 'danger' : risk.impact === 'medium' ? 'warning' : 'default'}
                        >
                          影響: {risk.impact}
                        </Badge>
                        <Badge
                          size="sm"
                          variant={risk.probability === 'high' ? 'danger' : risk.probability === 'medium' ? 'warning' : 'default'}
                        >
                          確率: {risk.probability}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{risk.description}</p>
                      <p className="text-sm text-gray-600">対策: {risk.mitigation}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </Modal>
    </div>
  );
}
