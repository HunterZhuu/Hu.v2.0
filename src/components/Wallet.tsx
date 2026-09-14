import { useState } from 'react';

interface WalletProps {
  balance: number;
  isPremium: boolean;
  onDeposit: () => void;
  onWithdraw: () => void;
}

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'loss';
  amount: number;
  description: string;
  timestamp: Date;
}

// Mock transaction history
const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', type: 'win', amount: 20, description: 'Won bet on BTC/USDT', timestamp: new Date(Date.now() - 3600000) },
  { id: '2', type: 'bet', amount: -10, description: 'Bet on ETH/USDT', timestamp: new Date(Date.now() - 7200000) },
  { id: '3', type: 'deposit', amount: 100, description: 'Deposit via PayPal', timestamp: new Date(Date.now() - 86400000) },
  { id: '4', type: 'loss', amount: -15, description: 'Lost bet on Gold', timestamp: new Date(Date.now() - 172800000) },
  { id: '5', type: 'win', amount: 30, description: 'Won bet on Silver', timestamp: new Date(Date.now() - 259200000) },
];

export default function Wallet({ balance, isPremium, onDeposit, onWithdraw }: WalletProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit': return '💰';
      case 'withdrawal': return '💸';
      case 'bet': return '🎲';
      case 'win': return '🏆';
      case 'loss': return '❌';
      default: return '💵';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'win': return 'text-green-400';
      case 'withdrawal':
      case 'bet':
      case 'loss': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  return (
    <div className="bg-[#0f1419] border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 bg-gradient-to-r from-green-900/20 to-emerald-900/20">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>💳</span>
            <span>PipDuel Wallet</span>
            {isPremium && (
              <span className="px-2 py-0.5 bg-gradient-to-r from-amber-600 to-yellow-600 text-white text-xs font-bold rounded">
                ⭐ PRO
              </span>
            )}
          </h2>
        </div>

        {/* Balance Display */}
        <div className="bg-gray-800/50 rounded-lg p-4 mb-3">
          <div className="text-xs text-gray-400 mb-1">Available Balance</div>
          <div className="text-3xl font-bold text-green-400 mb-3">
            ${balance.toFixed(2)}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onDeposit}
              className="flex-1 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-sm font-bold rounded transition-all"
            >
              + Deposit
            </button>
            <button
              onClick={onWithdraw}
              disabled={balance < 10}
              className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 text-gray-400 text-sm font-bold rounded transition-all"
            >
              Withdraw
            </button>
          </div>
        </div>

        {/* Premium Benefits */}
        {!isPremium && (
          <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3">
            <div className="text-xs text-amber-400 font-bold mb-1">⭐ Upgrade to PRO</div>
            <div className="text-xs text-gray-400">
              Unlock higher bet limits ($100+), priority support, and exclusive features
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-3 text-sm font-bold transition-all ${
            activeTab === 'overview'
              ? 'text-white border-b-2 border-amber-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 text-sm font-bold transition-all ${
            activeTab === 'history'
              ? 'text-white border-b-2 border-amber-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          History
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'overview' ? (
          <div className="space-y-3">
            {/* Account Info */}
            <div className="bg-gray-800/30 rounded p-3">
              <div className="text-xs text-gray-400 mb-2">Account Details</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Account Type:</span>
                  <span className={isPremium ? 'text-amber-400 font-bold' : 'text-gray-400'}>
                    {isPremium ? '⭐ PRO' : 'Standard'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bet Limits:</span>
                  <span className="text-white font-bold">
                    {isPremium ? '$1 - $1,000' : '$1 - $20'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Service Fee:</span>
                  <span className="text-amber-400">5%</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-800/30 rounded p-3">
                <div className="text-xs text-gray-400 mb-1">Total Deposits</div>
                <div className="text-lg font-bold text-green-400">$500.00</div>
              </div>
              <div className="bg-gray-800/30 rounded p-3">
                <div className="text-xs text-gray-400 mb-1">Total Withdrawals</div>
                <div className="text-lg font-bold text-red-400">$180.00</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {MOCK_TRANSACTIONS.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between bg-gray-800/30 rounded p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getTransactionIcon(transaction.type)}</span>
                  <div>
                    <div className="text-sm font-bold text-white">{transaction.description}</div>
                    <div className="text-xs text-gray-500">{formatTime(transaction.timestamp)}</div>
                  </div>
                </div>
                <div className={`text-sm font-bold ${getTransactionColor(transaction.type)}`}>
                  {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
