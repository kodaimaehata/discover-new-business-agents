import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle, Button, Input, TextArea } from '../components/common';
import { useStore } from '../store';

export function NewProject() {
  const navigate = useNavigate();
  const { createProject, setCurrentProject } = useStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { name?: string; description?: string } = {};
    if (!name.trim()) {
      newErrors.name = '事業案名を入力してください';
    }
    if (!description.trim()) {
      newErrors.description = '概要を入力してください';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const projectId = createProject(name.trim(), description.trim());
    setCurrentProject(projectId);
    navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        戻る
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>新規事業案を作成</CardTitle>
        </CardHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="事業案名"
            placeholder="例：次世代CRMプラットフォーム"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />

          <TextArea
            label="概要"
            placeholder="この事業案の概要を記述してください..."
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            error={errors.description}
          />

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              キャンセル
            </Button>
            <Button type="submit">作成</Button>
          </div>
        </form>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>ステージゲートについて</CardTitle>
        </CardHeader>
        <div className="text-sm text-gray-600 space-y-3">
          <p>
            新規事業案は「WILL/ENTRY」ステージから開始されます。
            各ステージには退出条件（ゲート）が設定されており、
            条件を満たすことで次のステージに進むことができます。
          </p>
          <ol className="list-decimal list-inside space-y-1">
            <li><strong>WILL/ENTRY</strong>：アイデア創出</li>
            <li><strong>MVP1</strong>：顧客／課題実証</li>
            <li><strong>MVP2</strong>：ソリューション実証＋事業計画</li>
            <li><strong>SEED</strong>：商売成立とグロースドライバー発見</li>
            <li><strong>ALPHA</strong>：拡大施策の加速</li>
            <li><strong>BETA</strong>：持続的拡大とガバナンス構築</li>
            <li><strong>EXIT</strong>：部門化／会社化</li>
          </ol>
        </div>
      </Card>
    </div>
  );
}
