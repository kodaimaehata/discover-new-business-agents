import type { Project, Hypothesis, Experiment, Session, Metric, PRD, AgentMessage, AgentMemo, SessionRole, SessionChatMessage } from '../types';
import { SESSION_ROLES } from '../types';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// GPT-5.2モデル定義
export type GPT52Model = 'gpt-5.2' | 'gpt-5.2-pro';

// reasoning effortレベル（モデルによって利用可能なレベルが異なる）
export type ReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

// 各モデルで利用可能なreasoning effortレベル
export const MODEL_REASONING_OPTIONS: Record<GPT52Model, ReasoningEffort[]> = {
  'gpt-5.2': ['none', 'minimal', 'low', 'medium', 'high'],
  'gpt-5.2-pro': ['medium', 'high', 'xhigh'],
};

// reasoning effortの表示ラベル
export const REASONING_EFFORT_LABELS: Record<ReasoningEffort, string> = {
  'none': 'なし（最速）',
  'minimal': '最小',
  'low': '低',
  'medium': '中',
  'high': '高',
  'xhigh': '最高（30分以上かかる場合あり）',
};

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'developer';
  content: string;
}

interface ProjectContext {
  project: Project;
  hypotheses: Hypothesis[];
  experiments: Experiment[];
  sessions: Session[];
  metrics: Metric[];
  prds: PRD[];
  memos: AgentMemo[];
}

export function isOpenAIConfigured(): boolean {
  return !!OPENAI_API_KEY && OPENAI_API_KEY !== 'your-api-key-here';
}

function buildSystemPrompt(context: ProjectContext): string {
  const { project, hypotheses, experiments, sessions, metrics, prds, memos } = context;

  const unverifiedHypotheses = hypotheses.filter(h => h.status === 'unverified');
  const activeExperiments = experiments.filter(e => e.status === 'in_progress');
  const upcomingSessions = sessions.filter(s => s.status === 'scheduled');
  const nsmMetric = metrics.find(m => m.type === 'NSM');
  const prd = prds[0];

  return `あなたは「VP of Product（VPoP）エージェント」です。新規事業のPMF達成までを支援する進行管理者として振る舞います。

## あなたの役割
- 状態把握：案件の現在地（ステージ、主要仮説、未検証リスク、実験状況、意思決定、次のゲート条件）を把握
- 推進：次に何をすべきかを、ステージと未検証仮説に基づいて提案
- 成果物作成：検証計画、インタビュー設計、事業計画ドラフト、壁打ち用ブリーフ等を作成支援
- 根拠提示：不確実性は明示し、断定しない

## AlphaDrive 7ステップ（ステージゲート）
1. WILL/ENTRY：アイデア創出
2. MVP1：顧客／課題実証
3. MVP2：ソリューション実証＋事業計画
4. SEED：商売成立とグロースドライバー発見
5. ALPHA：拡大施策の加速
6. BETA：持続的拡大とガバナンス構築
7. EXIT：部門化／会社化

## 仮説のミルフィーユ（更新版）

### 探索ガードレール
探索の拡散を防ぐための初期設定（対象領域、対象顧客、観測したい変化、除外条件）。

### Working Mission/Vision
- Working Mission（仮）：「私たちは[誰]の[困りごと]を[どう変える]ために...」
- Working Vision（仮）：「数年後、[誰]が[当たり前にできる状態]をつくる」
- 文章の美しさより「意思決定に使えるか」が重要
- Draft → Supported → Committed の3段階で管理

### Why（二層構造）
- 顧客のWhy：困りごと・代替手段・発生文脈・意思決定
- チームのWILL/存在理由：能力・資産・ネットワーク・価値観

### What / How
- 上位が変わったら下位も見直す

## 現在の事業案情報

### 基本情報
- 事業案名：${project.name}
- 概要：${project.description}
- 現在のステージ：${project.stage}

### 仮説の状況
- Why（顧客）：${hypotheses.filter(h => h.level === 'WHY' && h.whySubType === 'customer').length}件
- Why（WILL）：${hypotheses.filter(h => h.level === 'WHY' && h.whySubType === 'will').length}件
- What：${hypotheses.filter(h => h.level === 'WHAT').length}件
- How：${hypotheses.filter(h => h.level === 'HOW').length}件
- 未検証：${unverifiedHypotheses.length}件
- 検証済：${hypotheses.filter(h => h.status === 'validated').length}件

${unverifiedHypotheses.length > 0 ? `### 未検証仮説
${unverifiedHypotheses.map(h => `- [${h.level}${h.whySubType ? `/${h.whySubType}` : ''}] ${h.title}`).join('\n')}` : ''}

### 実験の状況
- 計画中：${experiments.filter(e => e.status === 'planned').length}件
- 実行中：${activeExperiments.length}件
- 完了：${experiments.filter(e => e.status === 'completed').length}件

${activeExperiments.length > 0 ? `### 進行中の実験
${activeExperiments.map(e => `- ${e.title}：${e.objective}`).join('\n')}` : ''}

### 壁打ちセッション
- 予定：${upcomingSessions.length}件
- 完了：${sessions.filter(s => s.status === 'completed').length}件

${upcomingSessions.length > 0 ? `### 予定されているセッション
${upcomingSessions.map(s => `- ${s.role}：${s.title}`).join('\n')}` : ''}

### 指標
${nsmMetric ? `- NSM：${nsmMetric.name}（現在値：${nsmMetric.currentValue || '未設定'} ${nsmMetric.unit}）` : '- NSM：未設定'}
- KPI数：${metrics.filter(m => m.type === 'KPI').length}件

${prd ? `### PRD
- タイトル：${prd.title}
- Vision：${prd.core.vision}
- Problem：${prd.why.problem}
- Solution：${prd.what.solution}` : '### PRD：未作成'}

${memos.length > 0 ? `### 過去の会話メモ（重要なコンテキスト）
${memos.map(memo => `
#### ${memo.title}
- 要約：${memo.summary}
${memo.keyPoints.length > 0 ? `- 重要なポイント：\n${memo.keyPoints.map(p => `  - ${p}`).join('\n')}` : ''}
${memo.decisions.length > 0 ? `- 決定事項：\n${memo.decisions.map(d => `  - ${d}`).join('\n')}` : ''}
${memo.nextActions.length > 0 ? `- 次のアクション：\n${memo.nextActions.map(a => `  - ${a}`).join('\n')}` : ''}
`).join('\n')}` : ''}

## 回答の指針
1. 具体的かつ実用的なアドバイスを提供
2. 現在のステージに適した次のアクションを提案
3. 未検証仮説がある場合は、その検証方法を提案
4. 壁打ちの準備が必要な場合は、論点を整理
5. 不確実な情報は「〜と推測されます」「〜の可能性があります」と表現
6. Markdown形式で見やすく整理して回答`;
}

export interface ChatOptions {
  model: GPT52Model;
  reasoningEffort: ReasoningEffort;
}

export const DEFAULT_CHAT_OPTIONS: ChatOptions = {
  model: 'gpt-5.2',
  reasoningEffort: 'medium',
};

export async function chatWithVPoP(
  userMessage: string,
  context: ProjectContext,
  conversationHistory: ChatMessage[] = [],
  options: ChatOptions = DEFAULT_CHAT_OPTIONS
): Promise<string> {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI APIキーが設定されていません。.envファイルにVITE_OPENAI_API_KEYを設定してください。');
  }

  const systemPrompt = buildSystemPrompt(context);

  // Responses API形式でinputを構築
  // GPT-5.2ではsystemロールの代わりにdeveloperロールを使用
  const input: ChatMessage[] = [
    { role: 'developer', content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role === 'system' ? 'developer' as const : msg.role,
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ];

  try {
    // GPT-5.2 Responses API
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: options.model,
        input,
        reasoning: {
          effort: options.reasoningEffort,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI APIエラーが発生しました');
    }

    const data = await response.json();

    // Responses APIのレスポンス形式から出力を取得
    // output_textフィールドまたはoutput配列から取得
    if (data.output_text) {
      return data.output_text;
    }

    // output配列から最後のmessageを取得
    if (data.output && Array.isArray(data.output)) {
      const lastOutput = data.output.find((o: { type: string }) => o.type === 'message');
      if (lastOutput?.content) {
        // contentが配列の場合
        if (Array.isArray(lastOutput.content)) {
          const textContent = lastOutput.content.find((c: { type: string }) => c.type === 'output_text');
          if (textContent?.text) {
            return textContent.text;
          }
        }
        // contentが文字列の場合
        if (typeof lastOutput.content === 'string') {
          return lastOutput.content;
        }
      }
    }

    return '応答を生成できませんでした。';
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('OpenAI APIとの通信中にエラーが発生しました');
  }
}

// メモ生成用のレスポンス型
export interface GeneratedMemo {
  title: string;
  summary: string;
  keyPoints: string[];
  decisions: string[];
  nextActions: string[];
}

// 会話からメモを生成
export async function generateMemoFromConversation(
  messages: AgentMessage[],
  projectName: string,
  options: ChatOptions = DEFAULT_CHAT_OPTIONS
): Promise<GeneratedMemo> {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI APIキーが設定されていません。.envファイルにVITE_OPENAI_API_KEYを設定してください。');
  }

  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'ユーザー' : 'エージェント'}: ${m.content}`)
    .join('\n\n');

  const memoPrompt = `以下のVPoPエージェントとユーザーの会話を分析し、今後のエージェントが参照するためのメモを作成してください。

## 対象事業案: ${projectName}

## 会話内容:
${conversationText}

## 出力形式（必ずJSON形式で出力してください）:
{
  "title": "メモのタイトル（20文字以内で内容を端的に表現）",
  "summary": "会話の要約（100-200文字程度）",
  "keyPoints": ["重要なポイント1", "重要なポイント2", ...],
  "decisions": ["決定事項1", "決定事項2", ...],
  "nextActions": ["次のアクション1", "次のアクション2", ...]
}

## 注意事項:
- keyPoints: 会話で明らかになった重要な洞察や発見（0-5個）
- decisions: 会話中に決まったこと、合意したこと（0-5個）
- nextActions: 今後実行すべきアクション（0-5個）
- 配列が空の場合は空配列[]としてください
- JSON以外のテキストは出力しないでください`;

  const input: ChatMessage[] = [
    { role: 'developer', content: 'あなたは会話内容を分析し、構造化されたメモを作成するアシスタントです。必ずJSON形式で出力してください。' },
    { role: 'user', content: memoPrompt },
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: options.model,
        input,
        reasoning: {
          effort: options.reasoningEffort,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI APIエラーが発生しました');
    }

    const data = await response.json();

    // レスポンスからテキストを取得
    let responseText = '';
    if (data.output_text) {
      responseText = data.output_text;
    } else if (data.output && Array.isArray(data.output)) {
      const lastOutput = data.output.find((o: { type: string }) => o.type === 'message');
      if (lastOutput?.content) {
        if (Array.isArray(lastOutput.content)) {
          const textContent = lastOutput.content.find((c: { type: string }) => c.type === 'output_text');
          if (textContent?.text) {
            responseText = textContent.text;
          }
        } else if (typeof lastOutput.content === 'string') {
          responseText = lastOutput.content;
        }
      }
    }

    if (!responseText) {
      throw new Error('メモの生成に失敗しました');
    }

    // JSONをパース
    // コードブロックで囲まれている場合は除去
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, responseText];
    const jsonText = jsonMatch[1] || responseText;

    try {
      const memo = JSON.parse(jsonText.trim()) as GeneratedMemo;
      return {
        title: memo.title || '無題のメモ',
        summary: memo.summary || '',
        keyPoints: Array.isArray(memo.keyPoints) ? memo.keyPoints : [],
        decisions: Array.isArray(memo.decisions) ? memo.decisions : [],
        nextActions: Array.isArray(memo.nextActions) ? memo.nextActions : [],
      };
    } catch {
      throw new Error('メモのJSON解析に失敗しました');
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('メモ生成中にエラーが発生しました');
  }
}

// 生成可能なデータタイプ
export type GeneratableDataType = 'hypothesis' | 'experiment' | 'prd' | 'metric' | 'document' | 'workingMV' | 'guardrail';

// 生成されたデータの型
export interface GeneratedHypothesis {
  level: 'WHY' | 'WHAT' | 'HOW';
  whySubType?: 'customer' | 'will';
  title: string;
  description: string;
}

export interface GeneratedExperiment {
  title: string;
  description: string;
  objective: string;
  method: string;
  successCriteria: string;
}

export interface GeneratedPRD {
  title: string;
  core: { vision: string; mission: string };
  why: { problem: string; targetCustomer: string; value: string };
  what: { solution: string; features: { name: string; description: string; priority: 'must' | 'should' | 'could' }[] };
  validationPlan: string;
}

export interface GeneratedMetric {
  name: string;
  description: string;
  type: 'NSM' | 'KPI';
  targetValue: string;
  unit: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}

export interface GeneratedDocument {
  type: 'one_pager' | 'business_plan' | 'session_brief';
  title: string;
  content: string;
}

export interface GeneratedWorkingMV {
  mission: string;
  missionRationale: string;  // なぜこのMissionを提案するか
  vision: string;
  visionRationale: string;   // なぜこのVisionを提案するか
  suggestedCommitmentLevel: 'draft' | 'supported' | 'committed';
}

export interface GeneratedGuardrail {
  domain: string;              // 対象領域
  targetCustomer: string;      // 対象顧客（仮）
  observableChange: string;    // 観測したい変化
  exclusions: string[];        // 除外条件
  rationale: string;           // 提案理由
}

// 会話からデータを生成
export async function generateDataFromConversation(
  dataType: GeneratableDataType,
  messages: AgentMessage[],
  projectName: string,
  options: ChatOptions = DEFAULT_CHAT_OPTIONS
): Promise<GeneratedHypothesis | GeneratedExperiment | GeneratedPRD | GeneratedMetric | GeneratedDocument | GeneratedWorkingMV | GeneratedGuardrail> {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI APIキーが設定されていません。');
  }

  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'ユーザー' : 'エージェント'}: ${m.content}`)
    .join('\n\n');

  const prompts: Record<GeneratableDataType, string> = {
    hypothesis: `以下の会話から仮説を抽出してください。

## 対象事業案: ${projectName}

## 会話内容:
${conversationText}

## 出力形式（JSON）:
{
  "level": "WHY" | "WHAT" | "HOW",
  "whySubType": "customer" | "will",  // levelがWHYの場合のみ必須
  "title": "仮説のタイトル（30文字以内）",
  "description": "仮説の詳細説明"
}

## レベルの説明:
- WHY: なぜこの事業をやるのかに関する仮説
  - customer（顧客Why）: 困りごと・代替手段・発生文脈・意思決定
  - will（チームWILL）: 能力・資産・ネットワーク・価値観
- WHAT: 何を提供するのかに関する仮説
- HOW: どう実現するのかに関する仮説

※ ビジョン・ミッションはWorking Mission/Visionで管理するため、仮説レベルには含めません。

会話の内容から最も重要な仮説を1つ抽出してください。`,

    experiment: `以下の会話から実験計画を作成してください。

## 対象事業案: ${projectName}

## 会話内容:
${conversationText}

## 出力形式（JSON）:
{
  "title": "実験のタイトル（30文字以内）",
  "description": "実験の概要",
  "objective": "実験の目的",
  "method": "実験方法",
  "successCriteria": "成功基準"
}

会話で議論された検証方法や実験案を元に、具体的な実験計画を1つ作成してください。`,

    prd: `以下の会話からPRD（製品要件定義書）を作成してください。

## 対象事業案: ${projectName}

## 会話内容:
${conversationText}

## 出力形式（JSON）:
{
  "title": "PRDのタイトル",
  "core": {
    "vision": "ビジョン",
    "mission": "ミッション"
  },
  "why": {
    "problem": "解決する課題",
    "targetCustomer": "ターゲット顧客",
    "value": "提供価値"
  },
  "what": {
    "solution": "ソリューション概要",
    "features": [
      { "name": "機能名", "description": "説明", "priority": "must" | "should" | "could" }
    ]
  },
  "validationPlan": "検証計画"
}

会話の内容を元に、PRDの各項目を埋めてください。不明な部分は推測で埋めてください。`,

    metric: `以下の会話から指標を抽出してください。

## 対象事業案: ${projectName}

## 会話内容:
${conversationText}

## 出力形式（JSON）:
{
  "name": "指標名",
  "description": "指標の説明",
  "type": "NSM" | "KPI",
  "targetValue": "目標値",
  "unit": "単位",
  "frequency": "daily" | "weekly" | "monthly" | "quarterly"
}

## 指標タイプの説明:
- NSM (North Star Metric): 事業の最重要指標
- KPI: 主要業績評価指標

会話で議論された指標を1つ抽出してください。`,

    document: `以下の会話から成果物を作成してください。

## 対象事業案: ${projectName}

## 会話内容:
${conversationText}

## 出力形式（JSON）:
{
  "type": "one_pager" | "business_plan" | "session_brief",
  "title": "ドキュメントのタイトル",
  "content": "ドキュメントの本文（Markdown形式）"
}

## ドキュメントタイプの説明:
- one_pager: 事業概要を1ページにまとめたもの
- business_plan: 事業計画書
- session_brief: 壁打ちセッション用ブリーフ

会話の内容を元に、最も適切なタイプのドキュメントを作成してください。`,

    workingMV: `以下の会話からWorking Mission/Visionを抽出・提案してください。

## 対象事業案: ${projectName}

## 会話内容:
${conversationText}

## 出力形式（JSON）:
{
  "mission": "私たちは[誰]の[困りごと]を[どう変える]ために...",
  "missionRationale": "このMissionを提案する理由",
  "vision": "数年後、[誰]が[当たり前にできる状態]をつくる",
  "visionRationale": "このVisionを提案する理由",
  "suggestedCommitmentLevel": "draft" | "supported" | "committed"
}

## コミットレベルの説明:
- draft: まだ仮説段階、検証が必要
- supported: ある程度の根拠がある、さらなる検証で確信を深められる
- committed: 十分な根拠があり、この方向で進める意思決定ができる

## 注意事項:
- 会話で議論された顧客課題、ターゲット、価値提供を反映してください
- 文章の美しさより「意思決定に使えるか」を重視してください
- 会話の根拠の強さに応じて適切なコミットレベルを提案してください`,

    guardrail: `以下の会話から探索ガードレール（探索の方向性と境界）を抽出してください。

## 対象事業案: ${projectName}

## 会話内容:
${conversationText}

## 出力形式（JSON）:
{
  "domain": "対象領域（どの市場/業界/シーン）",
  "targetCustomer": "対象顧客（仮）",
  "observableChange": "観測したい変化（この事業で何が変わるか）",
  "exclusions": ["やらないこと1", "やらないこと2"],
  "rationale": "このガードレールを提案する理由"
}

## 探索ガードレールの目的:
- 探索が拡散しすぎないように方向性を定める
- 「やらないこと」を明確にして集中を促す
- 仮の設定なので、検証結果に応じて見直し可能

会話で議論された事業の方向性や制約を元に、探索ガードレールを提案してください。`
  };

  const input: ChatMessage[] = [
    { role: 'developer', content: 'あなたは会話内容を分析し、構造化されたデータを生成するアシスタントです。必ずJSON形式で出力してください。JSON以外のテキストは出力しないでください。' },
    { role: 'user', content: prompts[dataType] },
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: options.model,
        input,
        reasoning: {
          effort: options.reasoningEffort,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI APIエラーが発生しました');
    }

    const data = await response.json();

    let responseText = '';
    if (data.output_text) {
      responseText = data.output_text;
    } else if (data.output && Array.isArray(data.output)) {
      const lastOutput = data.output.find((o: { type: string }) => o.type === 'message');
      if (lastOutput?.content) {
        if (Array.isArray(lastOutput.content)) {
          const textContent = lastOutput.content.find((c: { type: string }) => c.type === 'output_text');
          if (textContent?.text) {
            responseText = textContent.text;
          }
        } else if (typeof lastOutput.content === 'string') {
          responseText = lastOutput.content;
        }
      }
    }

    if (!responseText) {
      throw new Error('データの生成に失敗しました');
    }

    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, responseText];
    const jsonText = jsonMatch[1] || responseText;

    return JSON.parse(jsonText.trim());
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('データ生成中にエラーが発生しました');
  }
}

// CxO AI用のコンテキスト情報
interface CxOContext {
  project: Project;
  hypotheses: Hypothesis[];
  experiments: Experiment[];
  sessions: Session[];
  metrics: Metric[];
  prds: PRD[];
  currentSession: Session;
}

// CxO役割別のシステムプロンプトを生成
function buildCxOSystemPrompt(role: SessionRole, context: CxOContext): string {
  const { project, hypotheses, experiments, sessions, metrics, prds, currentSession } = context;
  const roleConfig = SESSION_ROLES.find(r => r.id === role);

  // 仮説の状況を整理
  const whyCustomerHypotheses = hypotheses.filter(h => h.level === 'WHY' && h.whySubType === 'customer');
  const whyWillHypotheses = hypotheses.filter(h => h.level === 'WHY' && h.whySubType === 'will');
  const whatHypotheses = hypotheses.filter(h => h.level === 'WHAT');
  const howHypotheses = hypotheses.filter(h => h.level === 'HOW');
  const validatedHypotheses = hypotheses.filter(h => h.status === 'validated');
  const unverifiedHypotheses = hypotheses.filter(h => h.status === 'unverified');

  // 実験の状況
  const completedExperiments = experiments.filter(e => e.status === 'completed');
  const activeExperiments = experiments.filter(e => e.status === 'in_progress');

  // 過去のセッション（このCxOとのやりとり）
  const pastSessions = sessions.filter(s => s.role === role && s.status === 'completed' && s.id !== currentSession.id);

  // PRD情報
  const prd = prds[0];
  const nsmMetric = metrics.find(m => m.type === 'NSM');

  // 役割別の専門的視点
  const roleSpecificContext: Record<SessionRole, string> = {
    CEO: `## あなたの専門的視点（CEO）
- 会社全体の戦略との整合性を常に確認
- 撤退条件を明確にし、過度な投資を防ぐ
- 勝ち筋が明確でないプロジェクトには鋭く指摘
- 経営資源（人・金・時間）の最適配分を意識
- 大局的な視点で意思決定をサポート

## 質問の観点
${roleConfig?.questions.map(q => `- ${q}`).join('\n')}`,

    COO: `## あなたの専門的視点（COO）
- 運用設計の現実性を厳しくチェック
- サービス提供体制の構築可能性を検証
- 業務プロセスの効率性と品質管理を重視
- ガバナンス体制の整備状況を確認
- 実行フェーズでのリスクを洗い出す

## 質問の観点
${roleConfig?.questions.map(q => `- ${q}`).join('\n')}`,

    CFO: `## あなたの専門的視点（CFO）
- 収益性と投資対効果（ROI）を厳密に検証
- 損益分岐点と資金繰りを常に意識
- 見積もりの前提条件の妥当性を確認
- 財務リスクを洗い出し対策を求める
- コスト構造の持続可能性を評価

## 質問の観点
${roleConfig?.questions.map(q => `- ${q}`).join('\n')}`,

    CSO: `## あなたの専門的視点（CSO）
- 市場構造と競争環境の分析を重視
- 競争優位性と参入障壁の構築を検証
- 提携・買収などの戦略オプションを探る
- 長期的な事業防衛可能性を評価
- 業界トレンドと技術動向を踏まえた助言

## 質問の観点
${roleConfig?.questions.map(q => `- ${q}`).join('\n')}`,

    CPO: `## あなたの専門的視点（CPO）
- 顧客価値と事業価値の一貫性を確認
- 既存プロダクトとのポートフォリオ整合を検証
- プロダクト原則に沿った開発を推進
- 必要なチーム体制とスキルセットを評価
- MVP〜スケールまでのプロダクト戦略を助言

## 質問の観点
${roleConfig?.questions.map(q => `- ${q}`).join('\n')}`,
  };

  return `あなたは「${role}」として、新規事業の壁打ちセッションに参加しています。
${roleConfig?.focus}の観点から、建設的かつ批判的な視点で議論を進めてください。

${roleSpecificContext[role]}

## AlphaDrive 7ステップ（ステージゲート）の理解
1. WILL/ENTRY：アイデア創出 - WILLの明文化が必要
2. MVP1：顧客／課題実証 - 課題の存在確認と対象顧客の特定
3. MVP2：ソリューション実証＋事業計画 - ソリューション検証と事業計画策定
4. SEED：商売成立とグロースドライバー発見 - 受注実績と成長再現性
5. ALPHA：拡大施策の加速 - 成長実績と施策効果
6. BETA：持続的拡大とガバナンス構築 - 持続的成長とガバナンス
7. EXIT：部門化／会社化 - 独立運営可能性

## 仮説のミルフィーユ構造（更新版）
- Working Mission/Vision：暫定版のM/V（Draft → Supported → Committed）
- Why：なぜこの事業をやるのか
  - 顧客Why：困りごと・代替手段・発生文脈
  - チームWILL：能力・資産・価値観
- What：何を提供するのか
- How：どう実現するのか
- 上位が変わったら下位も見直し

## 現在の事業案情報

### 基本情報
- 事業案名：${project.name}
- 概要：${project.description}
- 現在のステージ：${project.stage}

### 仮説の状況
${whyCustomerHypotheses.length > 0 ? `#### Why - 顧客（困りごと・代替手段）
${whyCustomerHypotheses.map(h => `- ${h.title}（${h.status}）`).join('\n')}` : '- 顧客Whyの仮説は未設定'}

${whyWillHypotheses.length > 0 ? `#### Why - チームWILL（能力・資産・価値観）
${whyWillHypotheses.map(h => `- ${h.title}（${h.status}）`).join('\n')}` : '- チームWILLの仮説は未設定'}

${whatHypotheses.length > 0 ? `#### What（何を提供するか）
${whatHypotheses.map(h => `- ${h.title}（${h.status}）`).join('\n')}` : '- Whatレベルの仮説は未設定'}

${howHypotheses.length > 0 ? `#### How（どう実現するか）
${howHypotheses.map(h => `- ${h.title}（${h.status}）`).join('\n')}` : '- Howレベルの仮説は未設定'}

- 検証済み仮説：${validatedHypotheses.length}件
- 未検証仮説：${unverifiedHypotheses.length}件

### 実験・検証の状況
- 完了した実験：${completedExperiments.length}件
- 進行中の実験：${activeExperiments.length}件
${completedExperiments.length > 0 ? `
最近完了した実験:
${completedExperiments.slice(-3).map(e => `- ${e.title}：${e.learnings || '学びなし'}`).join('\n')}` : ''}

### 指標
${nsmMetric ? `- NSM：${nsmMetric.name}（目標：${nsmMetric.targetValue || '未設定'} / 現在：${nsmMetric.currentValue || '未設定'} ${nsmMetric.unit}）` : '- NSM：未設定'}

${prd ? `### PRD情報
- Vision：${prd.core.vision}
- 課題：${prd.why.problem}
- ターゲット：${prd.why.targetCustomer}
- ソリューション：${prd.what.solution}` : '### PRD：未作成'}

### 今回のセッション情報
- タイトル：${currentSession.title}
- 目的：${currentSession.objective}
${currentSession.constraints ? `- 前提・制約：${currentSession.constraints}` : ''}

${pastSessions.length > 0 ? `### 過去の${role}壁打ちセッション
${pastSessions.map(s => `
#### ${s.title}（${s.completedDate || '日付不明'}）
- 目的：${s.objective}
${s.conclusion ? `- 結論：${s.conclusion}` : ''}
${s.counterArguments ? `- 指摘事項：${s.counterArguments}` : ''}
`).join('\n')}` : ''}

## 回答の指針
1. ${role}としての専門的視点から鋭い質問や指摘を行う
2. 具体的な根拠や数字を求める
3. リスクや懸念点を明確に伝える
4. 建設的な代替案や改善提案も行う
5. 過去のセッションでの議論を踏まえて一貫性を保つ
6. 曖昧な回答には深掘りして本質を引き出す
7. 適度な厳しさと建設的なサポートのバランスを取る
8. 日本語で回答する`;
}

// CxO AIとのチャット
export async function chatWithCxO(
  userMessage: string,
  role: SessionRole,
  context: CxOContext,
  conversationHistory: SessionChatMessage[] = [],
  options: ChatOptions = DEFAULT_CHAT_OPTIONS
): Promise<string> {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI APIキーが設定されていません。.envファイルにVITE_OPENAI_API_KEYを設定してください。');
  }

  const systemPrompt = buildCxOSystemPrompt(role, context);

  // 会話履歴を構築
  const historyMessages: ChatMessage[] = conversationHistory.map(msg => ({
    role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
    content: msg.content,
  }));

  const input: ChatMessage[] = [
    { role: 'developer', content: systemPrompt },
    ...historyMessages,
    { role: 'user', content: userMessage },
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: options.model,
        input,
        reasoning: {
          effort: options.reasoningEffort,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI APIエラーが発生しました');
    }

    const data = await response.json();

    // レスポンスからテキストを取得
    if (data.output_text) {
      return data.output_text;
    }

    if (data.output && Array.isArray(data.output)) {
      const lastOutput = data.output.find((o: { type: string }) => o.type === 'message');
      if (lastOutput?.content) {
        if (Array.isArray(lastOutput.content)) {
          const textContent = lastOutput.content.find((c: { type: string }) => c.type === 'output_text');
          if (textContent?.text) {
            return textContent.text;
          }
        }
        if (typeof lastOutput.content === 'string') {
          return lastOutput.content;
        }
      }
    }

    return '応答を生成できませんでした。';
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('CxO AIとの通信中にエラーが発生しました');
  }
}
