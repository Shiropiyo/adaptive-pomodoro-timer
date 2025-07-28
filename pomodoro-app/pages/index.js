import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

const AdaptivePomodoro = () => {
  // 基本状態
  const [currentPhase, setCurrentPhase] = useState('idle');
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentWorkDuration, setCurrentWorkDuration] = useState(5);
  const [sessionCount, setSessionCount] = useState(0);
  
  // ダイアログ制御
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [showContinueDialog, setShowContinueDialog] = useState(false);
  const [showBreakSuggestion, setShowBreakSuggestion] = useState(false);
  const [showTaskCompleteDialog, setShowTaskCompleteDialog] = useState(false);
  
  // タスク情報
  const [reason, setReason] = useState('');
  const [currentTaskReason, setCurrentTaskReason] = useState('');
  const [taskResult, setTaskResult] = useState('');
  const [reasonHistory, setReasonHistory] = useState([]);
  
  // 統計とゲーミフィケーション
  const [totalWorkTime, setTotalWorkTime] = useState(0);
  const [totalExp, setTotalExp] = useState(0);
  const [level, setLevel] = useState(1);
  
  // その他の状態
  const [isTimerFinished, setIsTimerFinished] = useState(false);
  const [workStartTime, setWorkStartTime] = useState(null);
  
  const intervalRef = useRef(null);
  const workDurations = [5, 6, 8, 10, 12, 15];
  
  // ローカルストレージから復元
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pomodoroData');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          setReasonHistory(data.reasonHistory || []);
          setTotalWorkTime(data.totalWorkTime || 0);
          setTotalExp(data.totalExp || 0);
          setLevel(data.level || 1);
        } catch (e) {
          console.log('保存データの読み込みに失敗しました');
        }
      }
    }
  }, []);

  // データを保存
  const saveData = () => {
    if (typeof window !== 'undefined') {
      const data = {
        reasonHistory,
        totalWorkTime,
        totalExp,
        level
      };
      localStorage.setItem('pomodoroData', JSON.stringify(data));
    }
  };

  useEffect(() => {
    saveData();
  }, [reasonHistory, totalWorkTime, totalExp, level]);
  
  useEffect(() => {
    if (currentPhase === 'work') {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setCurrentPhase('continue-check');
            setShowContinueDialog(true);
            setIsTimerFinished(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentPhase]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startWork = () => {
    setShowReasonDialog(true);
    setCurrentPhase('work');
    setTimeLeft(currentWorkDuration * 60);
    setWorkStartTime(Date.now());
  };

  const handleReasonSubmit = () => {
    if (reason.trim()) {
      setCurrentTaskReason(reason.trim());
      setReason('');
    }
    setShowReasonDialog(false);
  };

  const handleTaskComplete = () => {
    const actualWorkTime = Math.ceil((Date.now() - workStartTime) / 60000);
    const expGained = Math.ceil(actualWorkTime * 1.5);
    
    const now = new Date();
    setReasonHistory(prev => [...prev, {
      reason: currentTaskReason,
      result: taskResult.trim() || '作業完了',
      datetime: now.toLocaleString('ja-JP'),
      plannedDuration: currentWorkDuration,
      actualDuration: actualWorkTime,
      expGained
    }]);
    
    setTotalWorkTime(prev => prev + actualWorkTime);
    setTotalExp(prev => {
      const newExp = prev + expGained;
      const newLevel = Math.floor(newExp / 100) + 1;
      setLevel(newLevel);
      return newExp;
    });
    
    // 状態をリセット
    setShowTaskCompleteDialog(false);
    setCurrentPhase('idle');
    setCurrentTaskReason('');
    setTaskResult('');
    setSessionCount(0);
    setCurrentWorkDuration(5);
    setTimeLeft(0);
    setWorkStartTime(null);
    setIsTimerFinished(false);
  };

  const handleEarlyComplete = () => {
    // タイマーを停止
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setCurrentPhase('task-complete');
    setShowTaskCompleteDialog(true);
  };

  const handleContinue = () => {
    setShowContinueDialog(false);
    setIsTimerFinished(false);
    setSessionCount(prev => prev + 1);
    
    const currentActualTime = Math.ceil((Date.now() - workStartTime) / 60000);
    if (currentActualTime >= 56) {
      setCurrentPhase('completed');
      return;
    }
    
    const nextSessionIndex = sessionCount + 1;
    if (nextSessionIndex < workDurations.length) {
      setCurrentWorkDuration(workDurations[nextSessionIndex]);
      setCurrentPhase('work');
      setTimeLeft(workDurations[nextSessionIndex] * 60);
    }
  };

  const handleStop = () => {
    setShowContinueDialog(false);
    setIsTimerFinished(false);
    
    if (sessionCount === 0) {
      setShowBreakSuggestion(true);
    } else {
      setShowTaskCompleteDialog(true);
    }
  };

  const handleBreakSuggestion = (action) => {
    setShowBreakSuggestion(false);
    if (action === 'retry') {
      setCurrentPhase('work');
      setTimeLeft(5 * 60);
    } else {
      setCurrentPhase('idle');
    }
  };

  const reset = () => {
    setCurrentPhase('idle');
    setTimeLeft(0);
    setCurrentWorkDuration(5);
    setSessionCount(0);
    setTotalWorkTime(0);
    setReasonHistory([]);
    setShowReasonDialog(false);
    setShowContinueDialog(false);
    setShowBreakSuggestion(false);
    setShowTaskCompleteDialog(false);
    setCurrentTaskReason('');
    setTaskResult('');
    setIsTimerFinished(false);
    setWorkStartTime(null);
    saveData();
  };

  const getPhaseDisplay = () => {
    switch(currentPhase) {
      case 'work':
        return `作業中 (${currentWorkDuration}分)`;
      case 'continue-check':
        return '継続確認';
      case 'completed':
        return 'セッション完了！';
      default:
        return '待機中';
    }
  };

  return (
    <>
      <Head>
        <title>適応型ポモドーロタイマー</title>
        <meta name="description" content="嫌なタスクを小さく始めて継続する適応型ポモドーロタイマー" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ポモドーロタイマー" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="manifest" href="/manifest.json" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className={`max-w-md mx-auto p-6 rounded-lg shadow-lg transition-all duration-500 ${
          isTimerFinished ? 'bg-green-100 border-4 border-green-400 animate-pulse' : 'bg-white'
        }`}>
          <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            適応型ポモドーロタイマー
          </h1>
          
          <div className="text-center mb-6">
            <div className="text-lg font-medium text-gray-600 mb-2">
              {getPhaseDisplay()}
            </div>
            <div className="text-4xl font-mono font-bold text-gray-800">
              {formatTime(timeLeft)}
            </div>
            {currentTaskReason && currentPhase === 'work' && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">現在のタスク:</div>
                <div className="text-sm font-medium text-gray-800">{currentTaskReason}</div>
              </div>
            )}
          </div>

          {/* レベルと経験値表示 */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-blue-800">Lv.{level}</span>
              <span className="text-sm text-blue-600">{totalExp % 100}/100 EXP</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(totalExp % 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-blue-600 mt-1">
              累計作業時間: {totalWorkTime}分 | 総経験値: {totalExp}
            </div>
          </div>

          <div className="mb-6">
            <div className="text-sm text-gray-600 mb-2">
              セッション: {sessionCount + 1}/6
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((sessionCount + 1) / 6) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-4">
            {currentPhase === 'work' && (
              <button
                onClick={handleEarlyComplete}
                className="w-full py-3 px-4 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors mb-4"
              >
                タスク終了
              </button>
            )}

            {currentPhase === 'idle' && (
              <button
                onClick={startWork}
                className="w-full py-3 px-4 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                嫌だなボタン
              </button>
            )}

            {currentPhase === 'completed' && (
              <div className="text-center">
                <p className="text-green-600 font-medium mb-4">
                  お疲れさまでした！約1時間の作業を完了しました。
                </p>
                <button
                  onClick={reset}
                  className="py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  リセット
                </button>
              </div>
            )}

            {reasonHistory.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-800 mb-3">記録</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {reasonHistory.map((entry, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded text-sm border-l-4 border-blue-400">
                      <div className="font-medium text-gray-800 mb-1">{entry.datetime}</div>
                      <div className="text-gray-600 mb-1">
                        <span className="font-medium">課題:</span> {entry.reason}
                      </div>
                      <div className="text-gray-600 mb-1">
                        <span className="font-medium">結果:</span> {entry.result}
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>予定: {entry.plannedDuration}分 / 実際: {entry.actualDuration}分</span>
                        <span className="text-blue-600 font-medium">+{entry.expGained} EXP</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 理由入力ダイアログ */}
          {showReasonDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white p-6 rounded-lg max-w-sm w-full">
                <h3 className="text-lg font-medium mb-4">何が嫌でしたか？</h3>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg mb-4 resize-none"
                  rows="3"
                  placeholder="例：レポートを書かなければならない..."
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleReasonSubmit}
                    className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    開始
                  </button>
                </div>
                <div className="mt-2 text-xs text-gray-500 text-center">
                  タイマーは既に開始されています ({currentWorkDuration}分)
                </div>
              </div>
            </div>
          )}

          {/* 継続確認ダイアログ */}
          {showContinueDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white p-6 rounded-lg max-w-sm w-full text-center">
                <h3 className="text-lg font-medium mb-4">
                  {currentWorkDuration}分お疲れさまでした！
                </h3>
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-2">
                    次は{sessionCount + 1 < workDurations.length ? workDurations[sessionCount + 1] : 15}分の作業になります
                  </p>
                  <p className="text-sm text-gray-600">
                    続けられそうですか？（休憩なしで即座に開始）
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleContinue}
                    className="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    続ける
                  </button>
                  <button
                    onClick={handleStop}
                    className="flex-1 py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    終了
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* タスク分解提案ダイアログ */}
          {showBreakSuggestion && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white p-6 rounded-lg max-w-sm w-full">
                <h3 className="text-lg font-medium mb-4">タスクを分解してみましょう</h3>
                <div className="text-sm text-gray-600 mb-4">
                  <p className="mb-2">5分も集中できなかった場合は、タスクをより小さく分けると良いかもしれません：</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>資料を1ページだけ読む</li>
                    <li>ファイルを開いてタイトルだけ書く</li>
                    <li>関連する道具や資料を机に並べる</li>
                    <li>5行だけメモを書く</li>
                    <li>1つの段落だけ読む</li>
                  </ul>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleBreakSuggestion('retry')}
                    className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                  >
                    もう一度5分
                  </button>
                  <button
                    onClick={() => handleBreakSuggestion('stop')}
                    className="flex-1 py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                  >
                    今日は終了
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* タスク完了ダイアログ */}
          {showTaskCompleteDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white p-6 rounded-lg max-w-sm w-full">
                <h3 className="text-lg font-medium mb-4">タスク完了！</h3>
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="text-sm text-gray-600 mb-1">取り組んだ課題:</div>
                  <div className="text-sm font-medium text-gray-800">{currentTaskReason}</div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    実際に何をどこまでやりましたか？
                  </label>
                  <textarea
                    value={taskResult}
                    onChange={(e) => setTaskResult(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                    rows="3"
                    placeholder="例：7人分の退院サマリを作成完了"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleTaskComplete}
                    className="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    記録する
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default function Home() {
  return <AdaptivePomodoro />;
}
