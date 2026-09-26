import { useState } from 'react';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onWithdraw: (amount: number, method: string, details: string) => void;
}

export default function WithdrawModal({ 
  isOpen, 
  onClose, 
  currentBalance, 
  onWithdraw 
}: WithdrawModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [accountDetails, setAccountDetails] = useState('');
  const [step, setStep] = useState<'amount' | 'method' | 'details' | 'confirm'>('amount');

  if (!isOpen) return null;

  const withdrawOptions = [50, 100, 250, 500];
  const MIN_WITHDRAWAL = 10;
  
  const paymentMethods = [
    { id: 'paypal', name: 'PayPal', icon: '💳', description: 'Withdraw to PayPal account', placeholder: 'PayPal email address' },
    { id: 'applepay', name: 'Apple Pay', icon: '', description: 'Withdraw to Apple Pay', placeholder: 'Apple ID email or phone number' },
    { id: 'googlepay', name: 'Google Pay', icon: '🅖', description: 'Withdraw to Google Pay', placeholder: 'Google account email or phone number' },
    { id: 'bank', name: 'Bank Transfer', icon: '🏦', description: 'Withdraw to bank account', placeholder: 'Bank account number' },
    { id: 'crypto', name: 'Cryptocurrency', icon: '₿', description: 'Withdraw to crypto wallet', placeholder: 'Wallet address (BTC/ETH/USDT)' },
  ];

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmount = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const getFinalAmount = () => {
    return selectedAmount || parseFloat(customAmount) || 0;
  };

  const handleNext = () => {
    if (step === 'amount' && getFinalAmount() >= MIN_WITHDRAWAL) {
      setStep('method');
    } else if (step === 'method' && selectedMethod) {
      setStep('details');
    } else if (step === 'details' && accountDetails.trim()) {
      setStep('confirm');
    }
  };

  const handleConfirm = () => {
    const amount = getFinalAmount();
    if (amount >= MIN_WITHDRAWAL && selectedMethod && accountDetails.trim()) {
      onWithdraw(amount, selectedMethod, accountDetails);
      onClose();
      // Reset state
      setSelectedAmount(null);
      setCustomAmount('');
      setSelectedMethod(null);
      setAccountDetails('');
      setStep('amount');
    }
  };

  const handleBack = () => {
    if (step === 'method') {
      setStep('amount');
    } else if (step === 'details') {
      setStep('method');
    } else if (step === 'confirm') {
      setStep('details');
    }
  };

  const processingFee = getFinalAmount() * 0.02; // 2% processing fee
  const youReceive = getFinalAmount() - processingFee;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f1419] border border-gray-700 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>💸</span>
            <span>Withdraw Funds</span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Current Balance */}
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Available Balance</div>
            <div className="text-2xl font-bold text-green-400">${currentBalance.toFixed(2)}</div>
          </div>

          {/* Step 1: Select Amount */}
          {step === 'amount' && (
            <>
              <div>
                <label className="text-sm font-bold text-gray-400 mb-2 block">Select Amount</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {withdrawOptions.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => handleAmountSelect(amount)}
                      disabled={amount > currentBalance}
                      className={`py-3 rounded font-bold transition-all ${
                        selectedAmount === amount
                          ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white'
                          : amount > currentBalance
                          ? 'bg-gray-900 text-gray-600 cursor-not-allowed'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Or enter custom amount (min ${MIN_WITHDRAWAL})
                  </label>
                  <input
                    type="number"
                    min={MIN_WITHDRAWAL}
                    max={currentBalance}
                    value={customAmount}
                    onChange={(e) => handleCustomAmount(e.target.value)}
                    placeholder={`Enter amount (min $${MIN_WITHDRAWAL})`}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <button
                onClick={handleNext}
                disabled={getFinalAmount() < MIN_WITHDRAWAL || getFinalAmount() > currentBalance}
                className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white font-bold rounded transition-all"
              >
                Continue
              </button>
            </>
          )}

          {/* Step 2: Select Withdrawal Method */}
          {step === 'method' && (
            <>
              <div>
                <label className="text-sm font-bold text-gray-400 mb-2 block">
                  Withdraw ${getFinalAmount().toFixed(2)} via
                </label>
                <div className="space-y-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={`w-full p-3 rounded-lg transition-all border-2 ${
                        selectedMethod === method.id
                          ? 'border-red-500 bg-red-900/20'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{method.icon}</span>
                        <div className="text-left flex-1">
                          <div className="text-sm font-bold text-white">{method.name}</div>
                          <div className="text-xs text-gray-400">{method.description}</div>
                        </div>
                        {selectedMethod === method.id && (
                          <span className="text-red-400 text-xl">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-400 font-bold rounded transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={!selectedMethod}
                  className="flex-1 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white font-bold rounded transition-all"
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {/* Step 3: Enter Account Details */}
          {step === 'details' && (
            <>
              <div>
                <label className="text-sm font-bold text-gray-400 mb-2 block">
                  {paymentMethods.find(m => m.id === selectedMethod)?.name} Details
                </label>
                <input
                  type="text"
                  value={accountDetails}
                  onChange={(e) => setAccountDetails(e.target.value)}
                  placeholder={paymentMethods.find(m => m.id === selectedMethod)?.placeholder}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                />
                <div className="mt-2 text-xs text-gray-500">
                  ⚠️ Double-check your details. Withdrawals cannot be reversed.
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-400 font-bold rounded transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={!accountDetails.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white font-bold rounded transition-all"
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {/* Step 4: Confirmation */}
          {step === 'confirm' && (
            <>
              <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                <div className="text-sm font-bold text-gray-400 mb-2">Confirm Withdrawal</div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount:</span>
                  <span className="text-white font-bold">${getFinalAmount().toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Method:</span>
                  <span className="text-white font-bold">
                    {paymentMethods.find(m => m.id === selectedMethod)?.name}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Account:</span>
                  <span className="text-white text-sm">{accountDetails}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Processing Fee (2%):</span>
                  <span className="text-amber-400">-${processingFee.toFixed(2)}</span>
                </div>
                
                <div className="border-t border-gray-700 pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">You Receive:</span>
                    <span className="text-green-400 font-bold text-lg">${youReceive.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Processing Time:</span>
                  <span className="text-white">1-3 business days</span>
                </div>
              </div>

              <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3">
                <div className="text-xs text-red-400 font-bold mb-1">⚠️ Important</div>
                <div className="text-xs text-gray-400">
                  Withdrawals are processed within 1-3 business days. 
                  Please ensure your account details are correct.
                  Withdrawals cannot be reversed once submitted.
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-400 font-bold rounded transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded transition-all"
                >
                  Confirm Withdrawal
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
