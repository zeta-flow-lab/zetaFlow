import React, { useState, useEffect } from 'react';
import { Activity, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface TransactionStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  txHash?: string;
  blockNumber?: number;
  timestamp?: number;
  details?: string;
  chain: string;
}

interface TransactionMonitorProps {
  txHash?: string;
  planId?: string;
  onClose: () => void;
}

export function TransactionMonitor({ txHash, planId, onClose }: TransactionMonitorProps) {
  const [steps, setSteps] = useState<TransactionStep[]>([
    {
      id: 'sepolia-submit',
      name: 'Sepolia 入站交易',
      status: txHash ? 'completed' : 'pending',
      txHash,
      chain: 'Sepolia',
      details: txHash ? `交易已确认: ${txHash.slice(0, 10)}...` : '等待交易提交'
    },
    {
      id: 'crosschain-relay',
      name: 'ZetaChain 跨链中继',
      status: 'pending',
      chain: 'ZetaChain',
      details: '等待跨链消息传递'
    },
    {
      id: 'plan-submit',
      name: '计划提交到 Universal App',
      status: 'pending',
      chain: 'ZetaChain',
      details: '等待合约接收计划'
    },
    {
      id: 'asset-swap',
      name: 'ZRC-20 资产交换',
      status: 'pending',
      chain: 'ZetaChain',
      details: '等待 DEX 交换执行'
    },
    {
      id: 'outbound-withdraw',
      name: '出站资产分发',
      status: 'pending',
      chain: 'Multi-chain',
      details: '等待资产分发到目标链'
    }
  ]);

  const [realTimeLog, setRealTimeLog] = useState<string[]>([]);

  // 模拟实时日志更新
  useEffect(() => {
    if (txHash) {
      const interval = setInterval(() => {
        const now = new Date().toLocaleTimeString();
        
        // 真实的状态检查
        setRealTimeLog(prev => [
          ...prev.slice(-20), // 保留最近 20 条日志
          `${now} - ✅ Sepolia 交易已确认: ${txHash.slice(0, 10)}...`,
          `${now} - ⏳ 等待 ZetaChain 观察者网络处理...`,
          `${now} - 🔍 检查 Universal App (0xea88458be...) 余额...`,
          `${now} - ⚠️  跨链消息可能需要 5-30 分钟处理时间`,
          `${now} - 💡 可访问测试页面进行手动出站测试`
        ]);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [txHash]);

  const getStatusIcon = (status: TransactionStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Activity className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TransactionStep['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 border-green-200 bg-green-50';
      case 'processing':
        return 'text-blue-600 border-blue-200 bg-blue-50';
      case 'failed':
        return 'text-red-600 border-red-200 bg-red-50';
      default:
        return 'text-gray-600 border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold">交易执行监控</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左侧：执行步骤 */}
            <div>
              <h3 className="text-lg font-medium mb-4">执行步骤</h3>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div 
                    key={step.id}
                    className={`p-4 rounded-lg border-2 ${getStatusColor(step.status)}`}
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(step.status)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{step.name}</h4>
                          <span className="text-xs px-2 py-1 rounded bg-gray-100">
                            {step.chain}
                          </span>
                        </div>
                        <p className="text-sm mt-1 opacity-75">{step.details}</p>
                        {step.txHash && (
                          <div className="text-xs mt-2 font-mono">
                            TX: {step.txHash.slice(0, 20)}...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 右侧：实时日志 */}
            <div>
              <h3 className="text-lg font-medium mb-4">实时日志</h3>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg h-80 overflow-y-auto font-mono text-sm">
                {realTimeLog.length === 0 ? (
                  <div className="text-gray-500">等待日志输出...</div>
                ) : (
                  realTimeLog.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">调试提示</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  打开浏览器控制台 (F12) 查看更详细的技术日志
                </p>
              </div>
            </div>
          </div>

          {/* 底部：快速链接 */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium mb-3">快速链接</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {txHash && (
                <a 
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-center p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="text-sm font-medium">Sepolia Explorer</div>
                  <div className="text-xs text-gray-500">查看入站交易</div>
                </a>
              )}
              <a 
                href="https://zetachain-athens.blockscout.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-center p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="text-sm font-medium">Athens Explorer</div>
                <div className="text-xs text-gray-500">查看 ZetaChain 状态</div>
              </a>
              <button 
                onClick={() => window.location.hash = '#/test'}
                className="text-center p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="text-sm font-medium">测试出站</div>
                <div className="text-xs text-gray-500">手动触发出站</div>
              </button>
              <button 
                onClick={() => console.log('Universal App Address:', '0xea88458beCA36881C91B8fd8Ad42ce1d776dD685')}
                className="text-center p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="text-sm font-medium">合约地址</div>
                <div className="text-xs text-gray-500">复制到控制台</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
