import { useState, useMemo } from 'react';

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'loss' | 'fee' | 'bonus';
  amount: number;
  method?: string;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  timestamp: Date;
  details?: string;
  fee?: number;
  asset?: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
}

export default function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const [typeFilter, setTypeFilter] = useState<'all' | 'deposit' | 'withdrawal' | 'bet' | 'win'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Calculate totals
  const totals = useMemo(() => {
    const completed = transactions.filter(t => t.status === 'completed');
    const deposits = completed.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
    const withdrawals = completed.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0);
    const fees = completed.filter(t => t.type === 'fee').reduce((sum, t) => sum + t.amount, 0);
    const wins = completed.filter(t => t.type === 'win').reduce((sum, t) => sum + t.amount, 0);
    const losses = completed.filter(t => t.type === 'loss').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    return { deposits, withdrawals, fees, wins, losses };
  }, [transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => typeFilter === 'all' || t.type === typeFilter)
      .filter(t => statusFilter === 'all' || t.status === statusFilter)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [transactions, typeFilter, statusFilter]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit': return '💰';
      case 'withdrawal': return '💸';
      case 'bet': return '🎲';
      case 'win': return '🏆';
      case 'loss': return '❌';
      case 'fee': return '💼';
      case 'bonus': return '🎁';
      default: return '💵';
    }
  };

  const getMethodIcon = (method?: string) => {
    switch (method) {
      case 'paypal': return '💳';
      case 'applepay': return '';
      case 'googlepay': return '🅖';
      case 'bank': return '🏦';
      case 'crypto': return '₿';
      default: return '';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-0.5 bg-green-900/40 text-green-400 text-xs font-bold rounded border border-green-700/50">✓ Completed</span>;
      case 'pending':
        return <span className="px-2 py-0.5 bg-yellow-900/40 text-yellow-400 text-xs font-bold rounded border border-yellow-700/50 animate-pulse">◌ Pending</span>;
      case 'failed':
        return <span className="px-2 py-0.5 bg-red-900/40 text-red-400 text-xs font-bold rounded border border-red-700/50">✗ Failed</span>;
      default:
        return null;
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatFullDate = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isPositive = (transaction: Transaction) => {
    return transaction.type === 'deposit' || transaction.type === 'win' || transaction.type === 'bonus';
  };

  return (
    <div className="bg-[#0f1419] border border-gray-800 rounded-lg overflow-hidden">
      {/* Summary Cards */}
      <div className="p-4 border-b border-gray-800 bg-gradient-to-r from-blue-900/10 to-purple-900/10">
        <h3 className="text-sm font-bold text-white mb-3">Transaction Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <div className="bg-gray-800/50 rounded p-2">
            <div className="text-xs text-gray-400">Deposits</div>
            <div className="text-sm font-bold text-green-400">${totals.deposits.toFixed(2)}</div>
          </div>
          <div className="bg-gray-800/50 rounded p-2">
            <div className="text-xs text-gray-400">Withdrawals</div>
            <div className="text-sm font-bold text-red-400">${totals.withdrawals.toFixed(2)}</div>
          </div>
          <div className="bg-gray-800/50 rounded p-2">
            <div className="text-xs text-gray-400">Wins</div>
            <div className="text-sm font-bold text-green-400">${totals.wins.toFixed(2)}</div>
          </div>
          <div className="bg-gray-800/50 rounded p-2">
            <div className="text-xs text-gray-400">Losses</div>
            <div className="text-sm font-bold text-red-400">${totals.losses.toFixed(2)}</div>
          </div>
          <div className="bg-gray-800/50 rounded p-2">
            <div className="text-xs text-gray-400">Fees Paid</div>
            <div className="text-sm font-bold text-amber-400">${totals.fees.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-800 space-y-2">
        <div>
          <div className="text-xs text-gray-400 mb-2">Filter by Type</div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All' },
              { id: 'deposit', label: '💰 Deposits' },
              { id: 'withdrawal', label: '💸 Withdrawals' },
              { id: 'bet', label: '🎲 Bets' },
              { id: 'win', label: '🏆 Wins' },
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setTypeFilter(filter.id as any)}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  typeFilter === filter.id
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-400 mb-2">Filter by Status</div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All Status' },
              { id: 'completed', label: '✓ Completed' },
              { id: 'pending', label: '◌ Pending' },
              { id: 'failed', label: '✗ Failed' },
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setStatusFilter(filter.id as any)}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  statusFilter === filter.id
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="max-h-[500px] overflow-y-auto">
        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">📋</div>
            <div className="text-sm">No transactions found</div>
            <div className="text-xs mt-1">Try adjusting your filters</div>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filteredTransactions.map((transaction) => (
              <div key={transaction.id}>
                <button
                  onClick={() => setExpandedId(expandedId === transaction.id ? null : transaction.id)}
                  className="w-full p-4 hover:bg-gray-800/30 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-2xl flex-shrink-0">{getTypeIcon(transaction.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm">{transaction.description}</span>
                          {getStatusBadge(transaction.status)}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span>{formatTime(transaction.timestamp)}</span>
                          {transaction.method && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <span>{getMethodIcon(transaction.method)}</span>
                                <span className="capitalize">{transaction.method}</span>
                              </span>
                            </>
                          )}
                          {transaction.asset && (
                            <>
                              <span>•</span>
                              <span>{transaction.asset}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <div className={`text-sm font-bold ${
                        isPositive(transaction) ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {isPositive(transaction) ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                      </div>
                      {transaction.fee && transaction.fee > 0 && (
                        <div className="text-xs text-amber-400">
                          Fee: ${transaction.fee.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Details */}
                {expandedId === transaction.id && (
                  <div className="px-4 pb-4 bg-gray-900/30">
                    <div className="bg-gray-800/50 rounded p-3 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Transaction ID:</span>
                        <span className="text-white font-mono">{transaction.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Type:</span>
                        <span className="text-white capitalize">{transaction.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Amount:</span>
                        <span className={`font-bold ${isPositive(transaction) ? 'text-green-400' : 'text-red-400'}`}>
                          ${transaction.amount.toFixed(2)}
                        </span>
                      </div>
                      {transaction.fee && transaction.fee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Fee:</span>
                          <span className="text-amber-400">${transaction.fee.toFixed(2)}</span>
                        </div>
                      )}
                      {transaction.method && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Method:</span>
                          <span className="text-white capitalize flex items-center gap-1">
                            {getMethodIcon(transaction.method)} {transaction.method}
                          </span>
                        </div>
                      )}
                      {transaction.details && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Details:</span>
                          <span className="text-white">{transaction.details}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        {getStatusBadge(transaction.status)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Date & Time:</span>
                        <span className="text-white">{formatFullDate(transaction.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-800 bg-gray-900/50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}</span>
          <span>
            {filteredTransactions.filter(t => t.status === 'pending').length > 0 && (
              <span className="text-yellow-400">
                {filteredTransactions.filter(t => t.status === 'pending').length} pending
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
