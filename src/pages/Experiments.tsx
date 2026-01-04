import { useState } from 'react';
import { Plus, Play, CheckCircle, XCircle, Calendar, Trash2, Edit2, Link } from 'lucide-react';
import { Card, Button, Badge, Modal, Input, TextArea } from '../components/common';
import { useStore } from '../store';
import { type Experiment, type ExperimentStatus } from '../types';

export function Experiments() {
  const {
    currentProjectId,
    getProjectExperiments,
    getProjectHypotheses,
    createExperiment,
    updateExperiment,
    deleteExperiment,
  } = useStore();

  const experiments = currentProjectId ? getProjectExperiments(currentProjectId) : [];
  const hypotheses = currentProjectId ? getProjectHypotheses(currentProjectId) : [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExperiment, setEditingExperiment] = useState<Experiment | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<ExperimentStatus | 'all'>('all');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    objective: '',
    method: '',
    successCriteria: '',
    hypothesisIds: [] as string[],
    plannedStartDate: '',
    plannedEndDate: '',
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
      title: '',
      description: '',
      objective: '',
      method: '',
      successCriteria: '',
      hypothesisIds: [],
      plannedStartDate: '',
      plannedEndDate: '',
    });
    setEditingExperiment(null);
    setIsModalOpen(true);
  };

  const openEditModal = (experiment: Experiment) => {
    setFormData({
      title: experiment.title,
      description: experiment.description,
      objective: experiment.objective,
      method: experiment.method,
      successCriteria: experiment.successCriteria,
      hypothesisIds: experiment.hypothesisIds,
      plannedStartDate: experiment.plannedStartDate || '',
      plannedEndDate: experiment.plannedEndDate || '',
    });
    setEditingExperiment(experiment);
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) return;

    if (editingExperiment) {
      updateExperiment(editingExperiment.id, {
        title: formData.title,
        description: formData.description,
        objective: formData.objective,
        method: formData.method,
        successCriteria: formData.successCriteria,
        hypothesisIds: formData.hypothesisIds,
        plannedStartDate: formData.plannedStartDate || undefined,
        plannedEndDate: formData.plannedEndDate || undefined,
      });
    } else {
      createExperiment({
        projectId: currentProjectId,
        title: formData.title,
        description: formData.description,
        objective: formData.objective,
        method: formData.method,
        successCriteria: formData.successCriteria,
        hypothesisIds: formData.hypothesisIds,
        status: 'planned',
        plannedStartDate: formData.plannedStartDate || undefined,
        plannedEndDate: formData.plannedEndDate || undefined,
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('この実験を削除しますか？')) {
      deleteExperiment(id);
    }
  };

  const updateStatus = (id: string, status: ExperimentStatus) => {
    const updates: Partial<Experiment> = { status };
    if (status === 'in_progress') {
      updates.actualStartDate = new Date().toISOString().split('T')[0];
    } else if (status === 'completed' || status === 'cancelled') {
      updates.actualEndDate = new Date().toISOString().split('T')[0];
    }
    updateExperiment(id, updates);
  };

  const getStatusBadge = (status: ExperimentStatus) => {
    switch (status) {
      case 'planned':
        return <Badge size="sm">計画中</Badge>;
      case 'in_progress':
        return <Badge variant="info" size="sm">実行中</Badge>;
      case 'completed':
        return <Badge variant="success" size="sm">完了</Badge>;
      case 'cancelled':
        return <Badge variant="danger" size="sm">中止</Badge>;
    }
  };

  const filteredExperiments =
    selectedStatus === 'all'
      ? experiments
      : experiments.filter((e) => e.status === selectedStatus);

  const groupedExperiments = {
    planned: filteredExperiments.filter((e) => e.status === 'planned'),
    in_progress: filteredExperiments.filter((e) => e.status === 'in_progress'),
    completed: filteredExperiments.filter((e) => e.status === 'completed'),
    cancelled: filteredExperiments.filter((e) => e.status === 'cancelled'),
  };

  const renderExperimentCard = (experiment: Experiment) => {
    const linkedHypotheses = hypotheses.filter((h) =>
      experiment.hypothesisIds.includes(h.id)
    );

    return (
      <Card key={experiment.id} className="mb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-medium text-gray-900">{experiment.title}</h4>
              {getStatusBadge(experiment.status)}
            </div>
            <p className="text-sm text-gray-600 mb-3">{experiment.description}</p>

            {linkedHypotheses.length > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <Link className="w-4 h-4 text-gray-400" />
                <div className="flex flex-wrap gap-1">
                  {linkedHypotheses.map((h) => (
                    <Badge key={h.id} size="sm" variant="info">
                      {h.title}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm mt-3">
              <div>
                <span className="text-gray-500">目的：</span>
                <span className="text-gray-700">{experiment.objective}</span>
              </div>
              <div>
                <span className="text-gray-500">成功基準：</span>
                <span className="text-gray-700">{experiment.successCriteria}</span>
              </div>
            </div>

            {experiment.plannedStartDate && (
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>
                  {experiment.plannedStartDate}
                  {experiment.plannedEndDate && ` ~ ${experiment.plannedEndDate}`}
                </span>
              </div>
            )}

            {experiment.results && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">結果</p>
                <p className="text-sm text-gray-600">{experiment.results}</p>
              </div>
            )}

            {experiment.learnings && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-700 mb-1">学び</p>
                <p className="text-sm text-blue-600">{experiment.learnings}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 ml-4">
            {experiment.status === 'planned' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateStatus(experiment.id, 'in_progress')}
                title="開始"
              >
                <Play className="w-4 h-4 text-green-500" />
              </Button>
            )}
            {experiment.status === 'in_progress' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateStatus(experiment.id, 'completed')}
                  title="完了"
                >
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateStatus(experiment.id, 'cancelled')}
                  title="中止"
                >
                  <XCircle className="w-4 h-4 text-red-500" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditModal(experiment)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(experiment.id)}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">実験ボード</h1>
          <p className="text-sm text-gray-500 mt-1">
            仮説を検証するための実験を計画・実行・振り返り
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          実験を作成
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Button
          variant={selectedStatus === 'all' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setSelectedStatus('all')}
        >
          すべて ({experiments.length})
        </Button>
        <Button
          variant={selectedStatus === 'planned' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setSelectedStatus('planned')}
        >
          計画中 ({groupedExperiments.planned.length})
        </Button>
        <Button
          variant={selectedStatus === 'in_progress' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setSelectedStatus('in_progress')}
        >
          実行中 ({groupedExperiments.in_progress.length})
        </Button>
        <Button
          variant={selectedStatus === 'completed' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setSelectedStatus('completed')}
        >
          完了 ({groupedExperiments.completed.length})
        </Button>
      </div>

      {/* Kanban View */}
      {selectedStatus === 'all' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              計画中 ({groupedExperiments.planned.length})
            </h3>
            {groupedExperiments.planned.map(renderExperimentCard)}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              実行中 ({groupedExperiments.in_progress.length})
            </h3>
            {groupedExperiments.in_progress.map(renderExperimentCard)}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              完了 ({groupedExperiments.completed.length})
            </h3>
            {groupedExperiments.completed.map(renderExperimentCard)}
          </div>
        </div>
      ) : (
        <div>
          {filteredExperiments.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <p className="text-gray-500">該当する実験がありません</p>
              </div>
            </Card>
          ) : (
            filteredExperiments.map(renderExperimentCard)
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingExperiment ? '実験を編集' : '新規実験を作成'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="実験タイトル"
            placeholder="例：顧客インタビュー（N=10）"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <TextArea
            label="概要"
            placeholder="実験の概要..."
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <TextArea
            label="目的"
            placeholder="この実験で何を明らかにしたいか..."
            rows={2}
            value={formData.objective}
            onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
          />

          <TextArea
            label="方法"
            placeholder="どのように実験を行うか..."
            rows={2}
            value={formData.method}
            onChange={(e) => setFormData({ ...formData, method: e.target.value })}
          />

          <TextArea
            label="成功基準"
            placeholder="何をもって成功とするか..."
            rows={2}
            value={formData.successCriteria}
            onChange={(e) => setFormData({ ...formData, successCriteria: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              紐付ける仮説
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {hypotheses.map((h) => (
                <label key={h.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.hypothesisIds.includes(h.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          hypothesisIds: [...formData.hypothesisIds, h.id],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          hypothesisIds: formData.hypothesisIds.filter(
                            (id) => id !== h.id
                          ),
                        });
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{h.title}</span>
                  <Badge size="sm">{h.level}</Badge>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="開始予定日"
              value={formData.plannedStartDate}
              onChange={(e) =>
                setFormData({ ...formData, plannedStartDate: e.target.value })
              }
            />
            <Input
              type="date"
              label="終了予定日"
              value={formData.plannedEndDate}
              onChange={(e) =>
                setFormData({ ...formData, plannedEndDate: e.target.value })
              }
            />
          </div>

          {editingExperiment && (
            <>
              <TextArea
                label="結果"
                placeholder="実験の結果..."
                rows={3}
                value={editingExperiment.results || ''}
                onChange={(e) =>
                  updateExperiment(editingExperiment.id, { results: e.target.value })
                }
              />
              <TextArea
                label="学び"
                placeholder="この実験から得られた学び..."
                rows={3}
                value={editingExperiment.learnings || ''}
                onChange={(e) =>
                  updateExperiment(editingExperiment.id, { learnings: e.target.value })
                }
              />
            </>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit}>
              {editingExperiment ? '更新' : '作成'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
