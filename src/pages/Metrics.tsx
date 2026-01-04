import { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Target,
  Star,
  ArrowRight,
  BarChart3,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
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
import type { Metric, MetricHistory, PMFCondition } from '../types';

export function Metrics() {
  const {
    currentProjectId,
    getProjectMetrics,
    createMetric,
    updateMetric,
    deleteMetric,
    nsmConfigs,
    setNSMConfig,
    pmfConditions,
    createPMFCondition,
    updatePMFCondition,
    deletePMFCondition,
  } = useStore();

  const metrics = currentProjectId ? getProjectMetrics(currentProjectId) : [];
  const projectPMFConditions = pmfConditions.filter(
    (c) => c.projectId === currentProjectId
  );
  const nsmConfig = nsmConfigs.find((c) => c.projectId === currentProjectId);
  const nsmMetric = metrics.find((m) => m.id === nsmConfig?.metricId);

  const [isMetricModalOpen, setIsMetricModalOpen] = useState(false);
  const [isNSMModalOpen, setIsNSMModalOpen] = useState(false);
  const [isPMFModalOpen, setIsPMFModalOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<Metric | null>(null);
  const [editingPMF, setEditingPMF] = useState<PMFCondition | null>(null);

  const [metricForm, setMetricForm] = useState({
    name: '',
    description: '',
    type: 'KPI' as Metric['type'],
    targetValue: '',
    currentValue: '',
    unit: '',
    frequency: 'weekly' as Metric['frequency'],
  });

  const [nsmForm, setNSMForm] = useState({
    metricId: '',
    visionAlignment: '',
    userValueAlignment: '',
    revenueAlignment: '',
    inputMetrics: [''],
  });

  const [pmfForm, setPMFForm] = useState({
    indicator: '',
    threshold: '',
    observationMethod: '',
    currentStatus: 'not_met' as PMFCondition['currentStatus'],
    evidence: '',
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

  const openMetricModal = (metric?: Metric) => {
    if (metric) {
      setMetricForm({
        name: metric.name,
        description: metric.description,
        type: metric.type,
        targetValue: metric.targetValue || '',
        currentValue: metric.currentValue || '',
        unit: metric.unit,
        frequency: metric.frequency,
      });
      setEditingMetric(metric);
    } else {
      setMetricForm({
        name: '',
        description: '',
        type: 'KPI',
        targetValue: '',
        currentValue: '',
        unit: '',
        frequency: 'weekly',
      });
      setEditingMetric(null);
    }
    setIsMetricModalOpen(true);
  };

  const handleMetricSubmit = () => {
    if (!metricForm.name.trim()) return;

    if (editingMetric) {
      updateMetric(editingMetric.id, {
        name: metricForm.name,
        description: metricForm.description,
        type: metricForm.type,
        targetValue: metricForm.targetValue,
        currentValue: metricForm.currentValue,
        unit: metricForm.unit,
        frequency: metricForm.frequency,
      });
    } else {
      createMetric({
        projectId: currentProjectId,
        name: metricForm.name,
        description: metricForm.description,
        type: metricForm.type,
        targetValue: metricForm.targetValue,
        currentValue: metricForm.currentValue,
        unit: metricForm.unit,
        frequency: metricForm.frequency,
        relatedHypothesisIds: [],
        history: [],
      });
    }

    setIsMetricModalOpen(false);
  };

  const handleDeleteMetric = (id: string) => {
    if (window.confirm('この指標を削除しますか？')) {
      deleteMetric(id);
    }
  };

  // Future use: record metric value with history
  const _recordMetricValue = (metricId: string, value: string, note?: string) => {
    const metric = metrics.find((m) => m.id === metricId);
    if (!metric) return;

    const newHistory: MetricHistory = {
      date: new Date().toISOString().split('T')[0],
      value,
      note,
    };

    updateMetric(metricId, {
      currentValue: value,
      history: [...metric.history, newHistory],
    });
  };
  void _recordMetricValue;

  const openNSMModal = () => {
    if (nsmConfig) {
      setNSMForm({
        metricId: nsmConfig.metricId,
        visionAlignment: nsmConfig.visionAlignment,
        userValueAlignment: nsmConfig.userValueAlignment,
        revenueAlignment: nsmConfig.revenueAlignment,
        inputMetrics: nsmConfig.inputMetrics.length > 0 ? nsmConfig.inputMetrics : [''],
      });
    } else {
      setNSMForm({
        metricId: '',
        visionAlignment: '',
        userValueAlignment: '',
        revenueAlignment: '',
        inputMetrics: [''],
      });
    }
    setIsNSMModalOpen(true);
  };

  const handleNSMSubmit = () => {
    if (!nsmForm.metricId) return;

    setNSMConfig({
      projectId: currentProjectId,
      metricId: nsmForm.metricId,
      visionAlignment: nsmForm.visionAlignment,
      userValueAlignment: nsmForm.userValueAlignment,
      revenueAlignment: nsmForm.revenueAlignment,
      inputMetrics: nsmForm.inputMetrics.filter((m) => m.trim()),
    });

    // Mark the metric as NSM type
    updateMetric(nsmForm.metricId, { type: 'NSM' });

    setIsNSMModalOpen(false);
  };

  const openPMFModal = (condition?: PMFCondition) => {
    if (condition) {
      setPMFForm({
        indicator: condition.indicator,
        threshold: condition.threshold,
        observationMethod: condition.observationMethod,
        currentStatus: condition.currentStatus,
        evidence: condition.evidence || '',
      });
      setEditingPMF(condition);
    } else {
      setPMFForm({
        indicator: '',
        threshold: '',
        observationMethod: '',
        currentStatus: 'not_met',
        evidence: '',
      });
      setEditingPMF(null);
    }
    setIsPMFModalOpen(true);
  };

  const handlePMFSubmit = () => {
    if (!pmfForm.indicator.trim()) return;

    if (editingPMF) {
      updatePMFCondition(editingPMF.id, {
        indicator: pmfForm.indicator,
        threshold: pmfForm.threshold,
        observationMethod: pmfForm.observationMethod,
        currentStatus: pmfForm.currentStatus,
        evidence: pmfForm.evidence,
      });
    } else {
      createPMFCondition({
        projectId: currentProjectId,
        indicator: pmfForm.indicator,
        threshold: pmfForm.threshold,
        observationMethod: pmfForm.observationMethod,
        currentStatus: pmfForm.currentStatus,
        evidence: pmfForm.evidence,
      });
    }

    setIsPMFModalOpen(false);
  };

  const handleDeletePMF = (id: string) => {
    if (window.confirm('このPMF条件を削除しますか？')) {
      deletePMFCondition(id);
    }
  };

  const getTypeBadge = (type: Metric['type']) => {
    switch (type) {
      case 'NSM':
        return <Badge variant="warning" size="sm"><Star className="w-3 h-3 mr-1" />NSM</Badge>;
      case 'KPI':
        return <Badge variant="info" size="sm">KPI</Badge>;
      case 'OKR':
        return <Badge variant="success" size="sm">OKR</Badge>;
    }
  };

  const getPMFStatusBadge = (status: PMFCondition['currentStatus']) => {
    switch (status) {
      case 'met':
        return <Badge variant="success" size="sm">達成</Badge>;
      case 'progressing':
        return <Badge variant="warning" size="sm">進行中</Badge>;
      case 'not_met':
        return <Badge size="sm">未達成</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">NSM・指標</h1>
          <p className="text-sm text-gray-500 mt-1">
            North Star Metric、KPI、PMF到達条件を管理
          </p>
        </div>
      </div>

      <Tabs defaultValue="nsm">
        <TabsList>
          <TabsTrigger value="nsm">NSM（North Star Metric）</TabsTrigger>
          <TabsTrigger value="metrics">指標一覧</TabsTrigger>
          <TabsTrigger value="pmf">PMF到達条件</TabsTrigger>
        </TabsList>

        {/* NSM Tab */}
        <TabsContent value="nsm" className="mt-4">
          {nsmMetric ? (
            <div className="space-y-4">
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-6 h-6 text-yellow-500" />
                      <h3 className="text-xl font-bold text-gray-900">
                        {nsmMetric.name}
                      </h3>
                    </div>
                    <p className="text-gray-600 mb-4">{nsmMetric.description}</p>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-600 mb-1">現在値</p>
                        <p className="text-2xl font-bold text-blue-700">
                          {nsmMetric.currentValue || '-'} {nsmMetric.unit}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-600 mb-1">目標値</p>
                        <p className="text-2xl font-bold text-green-700">
                          {nsmMetric.targetValue || '-'} {nsmMetric.unit}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={openNSMModal}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>

              {nsmConfig && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">ビジョンとの関係</CardTitle>
                    </CardHeader>
                    <p className="text-sm text-gray-600">{nsmConfig.visionAlignment}</p>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">ユーザー価値との関係</CardTitle>
                    </CardHeader>
                    <p className="text-sm text-gray-600">{nsmConfig.userValueAlignment}</p>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">収益との関係</CardTitle>
                    </CardHeader>
                    <p className="text-sm text-gray-600">{nsmConfig.revenueAlignment}</p>
                  </Card>
                </div>
              )}

              {nsmConfig && nsmConfig.inputMetrics.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Input Metrics（入力指標）</CardTitle>
                  </CardHeader>
                  <div className="flex items-center gap-2 flex-wrap">
                    {nsmConfig.inputMetrics.map((im, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Badge>{im}</Badge>
                        {i < nsmConfig.inputMetrics.length - 1 && (
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    ))}
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <Badge variant="warning">
                      <Star className="w-3 h-3 mr-1" />
                      {nsmMetric.name}
                    </Badge>
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <div className="text-center py-12">
                <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  NSM（North Star Metric）が設定されていません
                </p>
                <p className="text-sm text-gray-400 mb-4">
                  NSMは、ビジョン・ユーザー価値・事業収益のすべてに影響する
                  北極星となる指標です
                </p>
                <Button onClick={openNSMModal}>
                  <Plus className="w-4 h-4 mr-2" />
                  NSMを設定
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => openMetricModal()}>
              <Plus className="w-4 h-4 mr-2" />
              指標を追加
            </Button>
          </div>

          {metrics.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">まだ指標がありません</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metrics.map((metric) => (
                <Card key={metric.id}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-900">{metric.name}</h4>
                        {getTypeBadge(metric.type)}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{metric.description}</p>
                      <div className="flex gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">現在値: </span>
                          <span className="font-medium">
                            {metric.currentValue || '-'} {metric.unit}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">目標: </span>
                          <span className="font-medium">
                            {metric.targetValue || '-'} {metric.unit}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <Badge size="sm">{metric.frequency}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openMetricModal(metric)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMetric(metric.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* PMF Tab */}
        <TabsContent value="pmf" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => openPMFModal()}>
              <Plus className="w-4 h-4 mr-2" />
              PMF条件を追加
            </Button>
          </div>

          <Card className="mb-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">PMFとは</h4>
              <p className="text-sm text-blue-600">
                Marc Andreessenによる定義: 「良い市場に、当該市場を満たすプロダクトがある状態」
              </p>
              <p className="text-sm text-blue-600 mt-2">
                このアプリでは、PMFを抽象概念のままにせず、案件ごとに具体的な到達条件
                （指標・閾値・観測方法）を明文化します。
              </p>
            </div>
          </Card>

          {projectPMFConditions.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">PMF到達条件が設定されていません</p>
                <Button onClick={() => openPMFModal()}>
                  <Plus className="w-4 h-4 mr-2" />
                  PMF条件を設定
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {projectPMFConditions.map((condition) => (
                <Card key={condition.id}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-5 h-5 text-blue-500" />
                        <h4 className="font-medium text-gray-900">{condition.indicator}</h4>
                        {getPMFStatusBadge(condition.currentStatus)}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-500">閾値: </span>
                          <span className="font-medium">{condition.threshold}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">観測方法: </span>
                          <span className="font-medium">{condition.observationMethod}</span>
                        </div>
                      </div>
                      {condition.evidence && (
                        <div className="p-2 bg-gray-50 rounded text-sm text-gray-600">
                          <span className="font-medium">根拠: </span>
                          {condition.evidence}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPMFModal(condition)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePMF(condition.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              {/* PMF Progress Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>PMF到達進捗</CardTitle>
                </CardHeader>
                <div className="flex gap-4">
                  <div className="flex-1 p-3 bg-green-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {projectPMFConditions.filter((c) => c.currentStatus === 'met').length}
                    </p>
                    <p className="text-sm text-green-600">達成</p>
                  </div>
                  <div className="flex-1 p-3 bg-yellow-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-yellow-600">
                      {projectPMFConditions.filter((c) => c.currentStatus === 'progressing').length}
                    </p>
                    <p className="text-sm text-yellow-600">進行中</p>
                  </div>
                  <div className="flex-1 p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-gray-600">
                      {projectPMFConditions.filter((c) => c.currentStatus === 'not_met').length}
                    </p>
                    <p className="text-sm text-gray-600">未達成</p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Metric Modal */}
      <Modal
        isOpen={isMetricModalOpen}
        onClose={() => setIsMetricModalOpen(false)}
        title={editingMetric ? '指標を編集' : '新規指標を追加'}
      >
        <div className="space-y-4">
          <Input
            label="指標名"
            placeholder="例：MAU、継続率、NPS..."
            value={metricForm.name}
            onChange={(e) => setMetricForm({ ...metricForm, name: e.target.value })}
          />

          <TextArea
            label="説明"
            placeholder="この指標が何を測るか..."
            rows={2}
            value={metricForm.description}
            onChange={(e) => setMetricForm({ ...metricForm, description: e.target.value })}
          />

          <Select
            label="種類"
            value={metricForm.type}
            onChange={(e) => setMetricForm({ ...metricForm, type: e.target.value as Metric['type'] })}
            options={[
              { value: 'KPI', label: 'KPI' },
              { value: 'OKR', label: 'OKR' },
            ]}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="現在値"
              placeholder="100"
              value={metricForm.currentValue}
              onChange={(e) => setMetricForm({ ...metricForm, currentValue: e.target.value })}
            />
            <Input
              label="目標値"
              placeholder="500"
              value={metricForm.targetValue}
              onChange={(e) => setMetricForm({ ...metricForm, targetValue: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="単位"
              placeholder="人、%、円..."
              value={metricForm.unit}
              onChange={(e) => setMetricForm({ ...metricForm, unit: e.target.value })}
            />
            <Select
              label="観測頻度"
              value={metricForm.frequency}
              onChange={(e) => setMetricForm({ ...metricForm, frequency: e.target.value as Metric['frequency'] })}
              options={[
                { value: 'daily', label: '日次' },
                { value: 'weekly', label: '週次' },
                { value: 'monthly', label: '月次' },
                { value: 'quarterly', label: '四半期' },
              ]}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsMetricModalOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleMetricSubmit}>
              {editingMetric ? '更新' : '追加'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* NSM Modal */}
      <Modal
        isOpen={isNSMModalOpen}
        onClose={() => setIsNSMModalOpen(false)}
        title="NSM（North Star Metric）を設定"
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 rounded-lg mb-4">
            <h4 className="font-medium text-yellow-800 mb-2">NSMとは</h4>
            <p className="text-sm text-yellow-600">
              ビジョン・ユーザー価値・事業収益のいずれにも影響する指標を
              北極星（North Star）として設定します。
            </p>
          </div>

          <Select
            label="NSMとする指標"
            value={nsmForm.metricId}
            onChange={(e) => setNSMForm({ ...nsmForm, metricId: e.target.value })}
            options={[
              { value: '', label: '指標を選択...' },
              ...metrics.map((m) => ({ value: m.id, label: m.name })),
            ]}
          />

          <TextArea
            label="ビジョンとの関係"
            placeholder="この指標がビジョン達成にどう貢献するか..."
            rows={2}
            value={nsmForm.visionAlignment}
            onChange={(e) => setNSMForm({ ...nsmForm, visionAlignment: e.target.value })}
          />

          <TextArea
            label="ユーザー価値との関係"
            placeholder="この指標がユーザー価値をどう反映しているか..."
            rows={2}
            value={nsmForm.userValueAlignment}
            onChange={(e) => setNSMForm({ ...nsmForm, userValueAlignment: e.target.value })}
          />

          <TextArea
            label="収益との関係（CFO向け）"
            placeholder="この指標が収益にどう影響するか..."
            rows={2}
            value={nsmForm.revenueAlignment}
            onChange={(e) => setNSMForm({ ...nsmForm, revenueAlignment: e.target.value })}
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Input Metrics（入力指標）
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setNSMForm({ ...nsmForm, inputMetrics: [...nsmForm.inputMetrics, ''] })
                }
              >
                <Plus className="w-4 h-4 mr-1" />
                追加
              </Button>
            </div>
            <div className="space-y-2">
              {nsmForm.inputMetrics.map((im, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="例：新規登録数、初回購入率..."
                    value={im}
                    onChange={(e) => {
                      const newInputMetrics = [...nsmForm.inputMetrics];
                      newInputMetrics[i] = e.target.value;
                      setNSMForm({ ...nsmForm, inputMetrics: newInputMetrics });
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setNSMForm({
                        ...nsmForm,
                        inputMetrics: nsmForm.inputMetrics.filter((_, idx) => idx !== i),
                      })
                    }
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsNSMModalOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleNSMSubmit}>設定</Button>
          </div>
        </div>
      </Modal>

      {/* PMF Modal */}
      <Modal
        isOpen={isPMFModalOpen}
        onClose={() => setIsPMFModalOpen(false)}
        title={editingPMF ? 'PMF条件を編集' : 'PMF到達条件を追加'}
      >
        <div className="space-y-4">
          <Input
            label="指標"
            placeholder="例：継続利用率、NPS、月次売上..."
            value={pmfForm.indicator}
            onChange={(e) => setPMFForm({ ...pmfForm, indicator: e.target.value })}
          />

          <Input
            label="閾値"
            placeholder="例：80%以上、NPS 50以上、月商100万円..."
            value={pmfForm.threshold}
            onChange={(e) => setPMFForm({ ...pmfForm, threshold: e.target.value })}
          />

          <TextArea
            label="観測方法"
            placeholder="どのようにこの指標を観測するか..."
            rows={2}
            value={pmfForm.observationMethod}
            onChange={(e) => setPMFForm({ ...pmfForm, observationMethod: e.target.value })}
          />

          <Select
            label="現在のステータス"
            value={pmfForm.currentStatus}
            onChange={(e) => setPMFForm({ ...pmfForm, currentStatus: e.target.value as PMFCondition['currentStatus'] })}
            options={[
              { value: 'not_met', label: '未達成' },
              { value: 'progressing', label: '進行中' },
              { value: 'met', label: '達成' },
            ]}
          />

          <TextArea
            label="根拠（オプション）"
            placeholder="現在のステータスの根拠..."
            rows={2}
            value={pmfForm.evidence}
            onChange={(e) => setPMFForm({ ...pmfForm, evidence: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsPMFModalOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handlePMFSubmit}>
              {editingPMF ? '更新' : '追加'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
