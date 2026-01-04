// AlphaDrive 7ステージ
export type Stage =
  | 'WILL_ENTRY'   // アイデア創出
  | 'MVP1'         // 顧客／課題実証
  | 'MVP2'         // ソリューション実証＋事業計画
  | 'SEED'         // 商売成立とグロースドライバー発見
  | 'ALPHA'        // 拡大施策の加速
  | 'BETA'         // 持続的拡大とガバナンス構築
  | 'EXIT';        // 部門化／会社化

export const STAGES: { id: Stage; name: string; description: string }[] = [
  { id: 'WILL_ENTRY', name: 'WILL/ENTRY', description: 'アイデア創出' },
  { id: 'MVP1', name: 'MVP1', description: '顧客／課題実証' },
  { id: 'MVP2', name: 'MVP2', description: 'ソリューション実証＋事業計画' },
  { id: 'SEED', name: 'SEED', description: '商売成立とグロースドライバー発見' },
  { id: 'ALPHA', name: 'ALPHA', description: '拡大施策の加速' },
  { id: 'BETA', name: 'BETA', description: '持続的拡大とガバナンス構築' },
  { id: 'EXIT', name: 'EXIT', description: '部門化／会社化' },
];

// 仮説のミルフィーユ階層（COREはWorking Mission/Visionに移行）
export type HypothesisLevel = 'WHY' | 'WHAT' | 'HOW';

export const HYPOTHESIS_LEVELS: { id: HypothesisLevel; name: string; description: string }[] = [
  { id: 'WHY', name: 'Why', description: 'なぜこの事業をやるのか（顧客課題・WILL）' },
  { id: 'WHAT', name: 'What', description: '何を提供するのか' },
  { id: 'HOW', name: 'How', description: 'どう実現するのか' },
];

// WHYレベルのサブタイプ
export type WhySubType = 'customer' | 'will';
// customer: 顧客のWhy（困りごと・代替手段・発生文脈）
// will: チームのWILL/存在理由（能力・資産・価値観）

export const WHY_SUB_TYPES: { id: WhySubType; name: string; description: string }[] = [
  { id: 'customer', name: '顧客Why', description: '困りごと・代替手段・発生文脈・意思決定' },
  { id: 'will', name: 'チームWILL', description: '能力・資産・ネットワーク・価値観' },
];

// Working Mission/Visionのコミットレベル
export type CommitmentLevel = 'draft' | 'supported' | 'committed';

export const COMMITMENT_LEVELS: { id: CommitmentLevel; name: string; description: string }[] = [
  { id: 'draft', name: 'Draft', description: '仮置き・探索中' },
  { id: 'supported', name: 'Supported', description: '根拠あり・検証中' },
  { id: 'committed', name: 'Committed', description: 'コミット済み' },
];

// 探索のガードレール
export interface ExplorationGuardrail {
  id: string;
  projectId: string;
  domain: string;              // 対象領域（どの市場/業界/シーン）
  targetCustomer: string;      // 対象顧客（仮）
  observableChange: string;    // 観測したい変化（仮）
  exclusions: string[];        // 除外条件（やらないこと）
  createdAt: string;
  updatedAt: string;
}

// Working Mission/Vision（COREレベルを置き換え）
export interface WorkingMissionVision {
  id: string;
  projectId: string;

  // Working Mission
  mission: string;             // 「私たちは[誰]の[困りごと]を[どう変える]ために...」
  missionCommitment: CommitmentLevel;
  missionEvidence: Evidence[]; // コミット判断の根拠

  // Working Vision
  vision: string;              // 「数年後、[誰]が[当たり前にできる状態]をつくる」
  visionCommitment: CommitmentLevel;
  visionEvidence: Evidence[];

  // コミット条件の達成状況
  commitmentCriteria: {
    customerSegmentDefined: boolean;      // 顧客セグメントが絞れている
    problemValidated: boolean;            // 課題の強さが確認できている
    competitiveAdvantageIdentified: boolean; // 勝てる理由が言える
    solutionDirectionClear: boolean;      // ソリューションの方向性が見えている
  };

  createdAt: string;
  updatedAt: string;
}

// 仮説の状態
export type HypothesisStatus = 'unverified' | 'validating' | 'validated' | 'invalidated';

// 仮説
export interface Hypothesis {
  id: string;
  projectId: string;
  parentId: string | null;
  level: HypothesisLevel;
  whySubType?: WhySubType;  // WHYレベルの場合のみ（顧客Why / チームWILL）
  title: string;
  description: string;
  status: HypothesisStatus;
  evidence: Evidence[];
  alternatives: Alternative[];
  selectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

// 代替案（Core/Why/Whatの分岐）
export interface Alternative {
  id: string;
  hypothesisId: string;
  title: string;
  description: string;
  pros: string[];
  cons: string[];
  selected: boolean;
  selectionReason?: string;
}

// エビデンス（根拠）
export interface Evidence {
  id: string;
  type: 'user_input' | 'internal_doc' | 'external_source' | 'inference';
  title: string;
  content: string;
  url?: string;
  createdAt: string;
}

// 実験の状態
export type ExperimentStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

// 実験
export interface Experiment {
  id: string;
  projectId: string;
  hypothesisIds: string[];
  title: string;
  description: string;
  objective: string;
  method: string;
  successCriteria: string;
  status: ExperimentStatus;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  results?: string;
  learnings?: string;
  nextActions?: string;
  createdAt: string;
  updatedAt: string;
}

// 壁打ち相手の役割
export type SessionRole = 'CEO' | 'COO' | 'CFO' | 'CSO' | 'CPO';

export const SESSION_ROLES: { id: SessionRole; name: string; focus: string; questions: string[] }[] = [
  {
    id: 'CEO',
    name: 'CEO',
    focus: '戦略整合・勝ち筋・撤退条件・経営資源配分',
    questions: [
      '会社の戦略方向性との整合性は？',
      'この事業の勝ち筋は何か？',
      '撤退条件は明確か？',
      '必要な経営資源は確保できるか？'
    ]
  },
  {
    id: 'COO',
    name: 'COO',
    focus: '運用設計・提供体制・業務プロセス・品質・ガバナンス',
    questions: [
      '運用体制は構築可能か？',
      'サービス提供プロセスは明確か？',
      '品質管理はどうするか？',
      'ガバナンス体制は？'
    ]
  },
  {
    id: 'CFO',
    name: 'CFO',
    focus: '採算・投資対効果・資金使途・見積の前提・リスク',
    questions: [
      '投資対効果（ROI）は？',
      '損益分岐点はいつか？',
      '資金使途は適切か？',
      '見積の前提条件は妥当か？'
    ]
  },
  {
    id: 'CSO',
    name: 'CSO',
    focus: '市場構造・競争優位・防衛可能性・提携/買収含む選択肢',
    questions: [
      '市場構造の理解は正しいか？',
      '競争優位性は何か？',
      '参入障壁は構築できるか？',
      '提携・買収の選択肢は検討したか？'
    ]
  },
  {
    id: 'CPO',
    name: 'CPO',
    focus: 'プロダクト戦略・ポートフォリオ整合・顧客価値と事業価値の一貫性',
    questions: [
      '既存プロダクトとの整合性は？',
      '顧客価値と事業価値は一貫しているか？',
      'プロダクト原則に沿っているか？',
      '必要なチーム体制は？'
    ]
  },
];

// 壁打ちセッション
export interface Session {
  id: string;
  projectId: string;
  role: SessionRole;
  title: string;
  objective: string;
  agendaItems: AgendaItem[];
  preMaterials: string[];
  constraints: string;
  conclusion?: string;
  pending?: string;
  counterArguments?: string;
  nextActions: SessionAction[];
  chatMessages: SessionChatMessage[];
  status: 'scheduled' | 'in_progress' | 'completed';
  scheduledDate?: string;
  completedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgendaItem {
  id: string;
  topic: string;
  notes: string;
  decision?: string;
}

export interface SessionAction {
  id: string;
  action: string;
  assignee: string;
  dueDate?: string;
  completed: boolean;
}

// セッションチャットメッセージ（CxO AIとの会話）
export interface SessionChatMessage {
  id: string;
  role: 'user' | 'cxo';
  content: string;
  createdAt: string;
}

// 意思決定ログ
export interface DecisionLog {
  id: string;
  projectId: string;
  sessionId?: string;
  title: string;
  decision: string;
  reason: string;
  alternatives: string[];
  risks: string[];
  decidedBy: string;
  decidedAt: string;
  createdAt: string;
}

// 指標
export interface Metric {
  id: string;
  projectId: string;
  name: string;
  description: string;
  type: 'NSM' | 'KPI' | 'OKR';
  targetValue?: string;
  currentValue?: string;
  unit: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  relatedHypothesisIds: string[];
  history: MetricHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface MetricHistory {
  date: string;
  value: string;
  note?: string;
}

// NSM（North Star Metric）
export interface NSMConfig {
  id: string;
  projectId: string;
  metricId: string;
  visionAlignment: string;
  userValueAlignment: string;
  revenueAlignment: string;
  inputMetrics: string[];
  createdAt: string;
  updatedAt: string;
}

// PMF到達条件
export interface PMFCondition {
  id: string;
  projectId: string;
  indicator: string;
  threshold: string;
  observationMethod: string;
  currentStatus: 'not_met' | 'progressing' | 'met';
  evidence?: string;
  createdAt: string;
  updatedAt: string;
}

// PRD
export interface PRD {
  id: string;
  projectId: string;
  title: string;
  core: {
    vision: string;
    mission: string;
  };
  why: {
    problem: string;
    targetCustomer: string;
    value: string;
  };
  what: {
    solution: string;
    features: PRDFeature[];
  };
  validationPlan: string;
  metrics: string[];
  risks: PRDRisk[];
  status: 'draft' | 'review' | 'approved';
  createdAt: string;
  updatedAt: string;
}

export interface PRDFeature {
  id: string;
  name: string;
  description: string;
  priority: 'must' | 'should' | 'could' | 'wont';
  outcomeId?: string;
}

export interface PRDRisk {
  id: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  probability: 'high' | 'medium' | 'low';
  mitigation: string;
}

// ロードマップ
export interface RoadmapItem {
  id: string;
  projectId: string;
  period: string;
  targetMetrics: string;
  expectedOutcome: string;
  hypothesis: string;
  validationMethod: string;
  learnings?: string;
  status: 'planned' | 'in_progress' | 'completed';
  updateHistory: RoadmapUpdate[];
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapUpdate {
  date: string;
  changes: string;
  reason: string;
}

// アウトカム
export interface Outcome {
  id: string;
  projectId: string;
  name: string;
  description: string;
  metricIds: string[];
  relatedFeatureIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ステージゲート（退出条件）
export interface GateRequirement {
  stage: Stage;
  deliverables: string[];
  evidenceRequired: string[];
  decisionCriteria: string[];
}

export const GATE_REQUIREMENTS: GateRequirement[] = [
  {
    stage: 'WILL_ENTRY',
    deliverables: ['課題仮説', '対象顧客仮説', '初期検証計画'],
    evidenceRequired: ['WILLの明文化'],
    decisionCriteria: ['本人の意志が明確', '最低限の仮説が立っている']
  },
  {
    stage: 'MVP1',
    deliverables: ['顧客インタビュー結果', '課題存在の根拠', '優先度仮説'],
    evidenceRequired: ['N件以上のインタビュー記録', '課題の定量/定性データ'],
    decisionCriteria: ['課題の存在が確認できた', '対象顧客が特定できた']
  },
  {
    stage: 'MVP2',
    deliverables: ['PoC/実証結果', '売り方・値付け', 'コスト構造', '事業計画ドラフト'],
    evidenceRequired: ['ソリューション検証データ', '価格テスト結果', '収支シミュレーション'],
    decisionCriteria: ['ソリューションが課題を解決できる', '事業として成立する見込みがある']
  },
  {
    stage: 'SEED',
    deliverables: ['初期商談/受注/継続の証拠', 'グロースドライバー仮説'],
    evidenceRequired: ['受注実績', '継続利用データ', '獲得チャネル検証結果'],
    decisionCriteria: ['商売として成立している', '成長の再現性が見えている']
  },
  {
    stage: 'ALPHA',
    deliverables: ['成長計画', '拡大施策'],
    evidenceRequired: ['成長実績データ', '施策効果測定'],
    decisionCriteria: ['成長が加速している']
  },
  {
    stage: 'BETA',
    deliverables: ['体制計画', 'ガバナンス設計'],
    evidenceRequired: ['持続的成長データ', '体制整備状況'],
    decisionCriteria: ['持続的に拡大できている', 'ガバナンスが機能している']
  },
  {
    stage: 'EXIT',
    deliverables: ['部門化/会社化計画'],
    evidenceRequired: ['事業実績', '独立運営可能性の証拠'],
    decisionCriteria: ['独立した事業体として運営可能']
  }
];

// エージェントメッセージ
export interface AgentMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'agent';
  content: string;
  sources?: Evidence[];
  createdAt: string;
}

// エージェントチャットセッション
export interface AgentChatSession {
  id: string;
  projectId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

// メモのソースタイプ
export type MemoSourceType = 'vpop_agent' | 'cxo_session' | 'manual';

// エージェントメモ（チャットから抽出したコンテキスト）
export interface AgentMemo {
  id: string;
  projectId: string;
  title: string;
  summary: string;
  keyPoints: string[];
  decisions: string[];
  nextActions: string[];
  relatedHypothesisIds: string[];
  sourceMessageIds: string[];
  // 拡張フィールド
  sourceType: MemoSourceType;
  chatSessionId?: string;      // VPoPチャットセッションID
  cxoSessionId?: string;       // CxO壁打ちセッションID
  cxoRole?: SessionRole;       // CxO壁打ちの場合の役割
  tags: string[];              // 検索用タグ
  createdAt: string;
  updatedAt: string;
}

// エージェントタスク
export interface AgentTask {
  id: string;
  projectId: string;
  type: 'research' | 'customer' | 'finance' | 'gtm' | 'story';
  title: string;
  description: string;
  objective: string;
  expectedOutput: string;
  deadline?: string;
  constraints?: string;
  availableEvidence: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
  createdAt: string;
  updatedAt: string;
}

// 事業案（プロジェクト）
export interface Project {
  id: string;
  name: string;
  description: string;
  stage: Stage;
  guardrailId?: string;              // ExplorationGuardrailへの参照
  workingMissionVisionId?: string;   // WorkingMissionVisionへの参照
  pmfConditions: PMFCondition[];
  createdAt: string;
  updatedAt: string;
}

// 成果物タイプ
export type DocumentType = 'one_pager' | 'prd' | 'business_plan' | 'session_brief';

// 成果物
export interface Document {
  id: string;
  projectId: string;
  type: DocumentType;
  title: string;
  content: string;
  targetRole?: SessionRole;
  version: number;
  status: 'draft' | 'review' | 'final';
  createdAt: string;
  updatedAt: string;
}
