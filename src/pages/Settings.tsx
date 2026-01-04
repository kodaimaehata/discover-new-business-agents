import { useState } from 'react';
import { Trash2, Download, Upload, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, Button, Modal, Input } from '../components/common';
import { useStore } from '../store';

export function Settings() {
  const {
    projects,
    currentProjectId,
    updateProject,
    deleteProject,
    updateProjectStage,
  } = useStore();

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleExportData = () => {
    const data = localStorage.getItem('vpop-storage');
    if (data) {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vpop-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        try {
          JSON.parse(content); // Validate JSON
          localStorage.setItem('vpop-storage', content);
          window.location.reload();
        } catch {
          alert('無効なJSONファイルです');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDeleteProject = () => {
    if (confirmText === currentProject?.name && currentProjectId) {
      deleteProject(currentProjectId);
      setIsDeleteModalOpen(false);
      setConfirmText('');
    }
  };

  const handleClearAllData = () => {
    if (window.confirm('すべてのデータを削除しますか？この操作は取り消せません。')) {
      localStorage.removeItem('vpop-storage');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">設定</h1>

      {/* Current Project Settings */}
      {currentProject && (
        <Card>
          <CardHeader>
            <CardTitle>現在の事業案: {currentProject.name}</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                事業案名
              </label>
              <Input
                value={currentProject.name}
                onChange={(e) =>
                  updateProject(currentProject.id, { name: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                概要
              </label>
              <Input
                value={currentProject.description}
                onChange={(e) =>
                  updateProject(currentProject.id, { description: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ステージ
              </label>
              <select
                value={currentProject.stage}
                onChange={(e) =>
                  updateProjectStage(currentProject.id, e.target.value as any)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="WILL_ENTRY">WILL/ENTRY - アイデア創出</option>
                <option value="MVP1">MVP1 - 顧客／課題実証</option>
                <option value="MVP2">MVP2 - ソリューション実証＋事業計画</option>
                <option value="SEED">SEED - 商売成立とグロースドライバー発見</option>
                <option value="ALPHA">ALPHA - 拡大施策の加速</option>
                <option value="BETA">BETA - 持続的拡大とガバナンス構築</option>
                <option value="EXIT">EXIT - 部門化／会社化</option>
              </select>
            </div>

            <div className="pt-4 border-t">
              <Button
                variant="danger"
                onClick={() => setIsDeleteModalOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                この事業案を削除
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle>データ管理</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <div className="flex gap-4">
            <Button variant="secondary" onClick={handleExportData}>
              <Download className="w-4 h-4 mr-2" />
              データをエクスポート
            </Button>
            <label className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors">
              <Upload className="w-4 h-4 mr-2" />
              データをインポート
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportData}
              />
            </label>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  データはブラウザのローカルストレージに保存されています
                </p>
                <p className="text-sm text-yellow-600 mt-1">
                  ブラウザのキャッシュをクリアするとデータが失われる可能性があります。
                  定期的にエクスポートしてバックアップを取ることをお勧めします。
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button variant="danger" onClick={handleClearAllData}>
              <Trash2 className="w-4 h-4 mr-2" />
              すべてのデータを削除
            </Button>
          </div>
        </div>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>VPoP Agent について</CardTitle>
        </CardHeader>
        <div className="prose prose-sm max-w-none text-gray-600">
          <p>
            VPoP Agent は、新規事業のPMF達成までを支援するWebアプリケーションです。
          </p>
          <h4 className="font-medium text-gray-900 mt-4">主な機能</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>AlphaDrive 7ステップのステージゲート管理</li>
            <li>仮説のミルフィーユ（Core/Why/What/How）による仮説管理</li>
            <li>実験ボードによる検証管理</li>
            <li>CEO/COO/CFO/CSO/CPOとの壁打ちセッション管理</li>
            <li>VPoPエージェントによる推奨アクション提示</li>
            <li>PRDウィザード</li>
            <li>NSM・指標・PMF到達条件の管理</li>
            <li>成果物の自動生成</li>
          </ul>
          <h4 className="font-medium text-gray-900 mt-4">参考</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>AlphaDrive ステージゲート方式</li>
            <li>小城久美子さんの「仮説のミルフィーユ」</li>
            <li>Marc Andreessen のPMF定義</li>
          </ul>
        </div>
      </Card>

      {/* Delete Project Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setConfirmText('');
        }}
        title="事業案を削除"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  この操作は取り消せません
                </p>
                <p className="text-sm text-red-600 mt-1">
                  事業案「{currentProject?.name}」と、
                  それに紐づくすべてのデータ（仮説、実験、セッション、PRD、指標など）が削除されます。
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              確認のため、事業案名「{currentProject?.name}」を入力してください
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={currentProject?.name}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setConfirmText('');
              }}
            >
              キャンセル
            </Button>
            <Button
              variant="danger"
              disabled={confirmText !== currentProject?.name}
              onClick={handleDeleteProject}
            >
              削除する
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
