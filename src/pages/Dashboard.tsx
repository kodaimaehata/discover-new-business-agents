import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle,
  Circle,
  AlertTriangle,
  Lightbulb,
  FlaskConical,
  Users,
  Target,
  Compass,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Badge, Button } from '../components/common';
import { useStore } from '../store';
import { STAGES, GATE_REQUIREMENTS, COMMITMENT_LEVELS } from '../types';

export function Dashboard() {
  const navigate = useNavigate();
  const {
    projects,
    currentProjectId,
    getProjectHypotheses,
    getProjectExperiments,
    getProjectSessions,
    getProjectMetrics,
    getProjectWorkingMV,
  } = useStore();

  const currentProject = projects.find((p) => p.id === currentProjectId);

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          事業案を選択してください
        </h2>
        <p className="text-gray-500 mb-6">
          サイドバーから事業案を選択するか、新規作成してください
        </p>
        <Button onClick={() => navigate('/projects/new')}>
          新規事業案を作成
        </Button>
      </div>
    );
  }

  const hypotheses = getProjectHypotheses(currentProject.id);
  const experiments = getProjectExperiments(currentProject.id);
  const sessions = getProjectSessions(currentProject.id);
  const metrics = getProjectMetrics(currentProject.id);
  const workingMV = getProjectWorkingMV(currentProject.id);

  const unverifiedHypotheses = hypotheses.filter((h) => h.status === 'unverified');
  const activeExperiments = experiments.filter((e) => e.status === 'in_progress');
  const upcomingSessions = sessions.filter((s) => s.status === 'scheduled');

  // WHY subtypes count
  const customerWhyCount = hypotheses.filter(h => h.level === 'WHY' && h.whySubType === 'customer').length;
  const willWhyCount = hypotheses.filter(h => h.level === 'WHY' && h.whySubType === 'will').length;

  const getCommitmentBadge = (level: 'draft' | 'supported' | 'committed') => {
    const config = COMMITMENT_LEVELS.find(l => l.id === level);
    switch (level) {
      case 'draft':
        return <Badge size="sm">{config?.name}</Badge>;
      case 'supported':
        return <Badge variant="warning" size="sm">{config?.name}</Badge>;
      case 'committed':
        return <Badge variant="success" size="sm">{config?.name}</Badge>;
    }
  };

  const currentStageIndex = STAGES.findIndex((s) => s.id === currentProject.stage);
  const currentGateRequirements = GATE_REQUIREMENTS.find(
    (g) => g.stage === currentProject.stage
  );

  return (
    <div className="space-y-6">
      {/* Stage Progress */}
      <Card>
        <CardHeader>
          <CardTitle>ステージゲート進捗</CardTitle>
        </CardHeader>
        <div className="flex items-center justify-between overflow-x-auto pb-4">
          {STAGES.map((stage, index) => {
            const isCompleted = index < currentStageIndex;
            const isCurrent = index === currentStageIndex;

            return (
              <div key={stage.id} className="flex items-center">
                <div className="flex flex-col items-center min-w-[100px]">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrent
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <Circle className="w-6 h-6" />
                    )}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium ${
                      isCurrent ? 'text-blue-600' : 'text-gray-600'
                    }`}
                  >
                    {stage.name}
                  </span>
                  <span className="text-xs text-gray-400">{stage.description}</span>
                </div>
                {index < STAGES.length - 1 && (
                  <ArrowRight
                    className={`w-6 h-6 mx-2 ${
                      isCompleted ? 'text-green-500' : 'text-gray-300'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Working Mission/Vision Summary */}
      {(() => {
        const isMVCommitted = workingMV?.missionCommitment === 'committed' && workingMV?.visionCommitment === 'committed';
        return (
          <Card
            className={`cursor-pointer hover:border-blue-300 transition-colors ${isMVCommitted ? 'border-indigo-300 bg-indigo-50/30' : ''}`}
            onClick={() => navigate('/hypotheses')}
          >
            <CardHeader>
              <div className="flex items-center gap-2">
                <Compass className={`w-5 h-5 ${isMVCommitted ? 'text-indigo-700' : 'text-indigo-600'}`} />
                <CardTitle>
                  {isMVCommitted ? 'Mission / Vision（確定）' : 'Working Mission / Vision'}
                </CardTitle>
                {isMVCommitted && <Badge variant="success" size="sm">確定済み</Badge>}
              </div>
            </CardHeader>
            {workingMV ? (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-600">Mission</span>
                    {getCommitmentBadge(workingMV.missionCommitment)}
                  </div>
                  <p className="text-sm text-gray-800 line-clamp-2">
                    {workingMV.mission || '未設定'}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-600">Vision</span>
                    {getCommitmentBadge(workingMV.visionCommitment)}
                  </div>
                  <p className="text-sm text-gray-800 line-clamp-2">
                    {workingMV.vision || '未設定'}
                  </p>
                </div>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>顧客Why: {customerWhyCount}件</span>
                  <span>チームWILL: {willWhyCount}件</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Working Mission/Visionを設定してください
              </p>
            )}
          </Card>
        );
      })()}

      {/* Current Stage Requirements */}
      {currentGateRequirements && (
        <Card>
          <CardHeader>
            <CardTitle>
              {STAGES[currentStageIndex].name} ステージのゲート条件
            </CardTitle>
            <Badge variant="info">{STAGES[currentStageIndex].description}</Badge>
          </CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">提出物</h4>
              <ul className="space-y-2">
                {currentGateRequirements.deliverables.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <Circle className="w-4 h-4 mt-0.5 text-gray-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">必要な根拠</h4>
              <ul className="space-y-2">
                {currentGateRequirements.evidenceRequired.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <Circle className="w-4 h-4 mt-0.5 text-gray-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">判断基準</h4>
              <ul className="space-y-2">
                {currentGateRequirements.decisionCriteria.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <Circle className="w-4 h-4 mt-0.5 text-gray-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className="cursor-pointer hover:border-blue-300 transition-colors"
          onClick={() => navigate('/hypotheses')}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Lightbulb className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">未検証仮説</p>
              <p className="text-2xl font-bold text-gray-900">
                {unverifiedHypotheses.length}
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="cursor-pointer hover:border-blue-300 transition-colors"
          onClick={() => navigate('/experiments')}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FlaskConical className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">実行中の実験</p>
              <p className="text-2xl font-bold text-gray-900">
                {activeExperiments.length}
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="cursor-pointer hover:border-blue-300 transition-colors"
          onClick={() => navigate('/sessions')}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">予定セッション</p>
              <p className="text-2xl font-bold text-gray-900">
                {upcomingSessions.length}
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="cursor-pointer hover:border-blue-300 transition-colors"
          onClick={() => navigate('/metrics')}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">設定済み指標</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Alerts & Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Unverified Hypotheses Alert */}
        {unverifiedHypotheses.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <CardTitle>未検証の仮説があります</CardTitle>
              </div>
            </CardHeader>
            <ul className="space-y-2">
              {unverifiedHypotheses.slice(0, 3).map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <span className="text-sm text-gray-700">{h.title}</span>
                  <Badge size="sm">{h.level}</Badge>
                </li>
              ))}
            </ul>
            {unverifiedHypotheses.length > 3 && (
              <Button
                variant="ghost"
                className="w-full mt-3"
                onClick={() => navigate('/hypotheses')}
              >
                すべて表示 ({unverifiedHypotheses.length}件)
              </Button>
            )}
          </Card>
        )}

        {/* Active Experiments */}
        {activeExperiments.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-blue-500" />
                <CardTitle>進行中の実験</CardTitle>
              </div>
            </CardHeader>
            <ul className="space-y-2">
              {activeExperiments.slice(0, 3).map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <span className="text-sm text-gray-700">{e.title}</span>
                  <Badge variant="info" size="sm">
                    実行中
                  </Badge>
                </li>
              ))}
            </ul>
            {activeExperiments.length > 3 && (
              <Button
                variant="ghost"
                className="w-full mt-3"
                onClick={() => navigate('/experiments')}
              >
                すべて表示 ({activeExperiments.length}件)
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* Next Actions from VPoP */}
      <Card>
        <CardHeader>
          <CardTitle>VPoPからの推奨アクション</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          {unverifiedHypotheses.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">
                  未検証仮説の検証計画を立てましょう
                </p>
                <p className="text-xs text-yellow-600">
                  {unverifiedHypotheses.length}件の仮説が検証待ちです
                </p>
              </div>
              <Button size="sm" onClick={() => navigate('/experiments')}>
                実験を計画
              </Button>
            </div>
          )}

          {activeExperiments.length === 0 && unverifiedHypotheses.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <FlaskConical className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">
                  実験を開始しましょう
                </p>
                <p className="text-xs text-blue-600">
                  仮説を検証するための実験を計画・実行してください
                </p>
              </div>
              <Button size="sm" onClick={() => navigate('/experiments')}>
                実験を作成
              </Button>
            </div>
          )}

          {metrics.length === 0 && (
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <Target className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">
                  NSM（North Star Metric）を設定しましょう
                </p>
                <p className="text-xs text-green-600">
                  事業の成功を測る重要指標を定義してください
                </p>
              </div>
              <Button size="sm" onClick={() => navigate('/metrics')}>
                NSMを設定
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
