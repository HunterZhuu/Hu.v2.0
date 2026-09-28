import { useState } from 'react';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (userData: UserData) => void;
}

export interface UserData {
  id: string;
  email: string;
  username: string;
  password: string;
  isPremium: boolean;
  walletAddress?: string;
  bankAccount?: {
    accountNumber: string;
    bankName: string;
    accountHolder: string;
  };
  balance: number;
  createdAt: string;
}

export default function RegistrationModal({ isOpen, onClose, onRegister }: RegistrationModalProps) {
  const [step, setStep] = useState<'login' | 'register' | 'premium'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleRegister = () => {
    if (!email || !username || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    const userData: UserData = {
      id: 'user_' + Math.random().toString(36).substring(7),
      email,
      username,
      password,
      isPremium: false,
      balance: 100, // Starting balance
      createdAt: new Date().toISOString(),
    };

    onRegister(userData);
    setStep('premium');
  };

  const handleUpgradeToPremium = () => {
    if (!walletAddress && !accountNumber) {
      setError('Please add a wallet address or bank account');
      return;
    }

    // In production, this would verify the payment method
    const userData: UserData = {
      id: 'user_' + Math.random().toString(36).substring(7),
      email,
      username,
      password,
      isPremium: true,
      walletAddress: walletAddress || undefined,
      bankAccount: accountNumber ? {
        accountNumber,
        bankName,
        accountHolder,
      } : undefined,
      balance: 1000, // Premium users get higher starting balance
      createdAt: new Date().toISOString(),
    };

    onRegister(userData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f1419] border border-gray-700 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {step === 'login' && '🔐 Login'}
            {step === 'register' && '📝 Create Account'}
            {step === 'premium' && '⭐ Upgrade to Premium'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Login Step */}
        {step === 'login' && (
          <div className="p-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {error && (
                <div className="px-3 py-2 bg-red-900/30 border border-red-700/50 rounded text-xs text-red-400">
                  {error}
                </div>
              )}

              <button
                onClick={() => {
                  // In production, this would verify credentials
                  setStep('register');
                  setError('');
                }}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded transition-all"
              >
                Login
              </button>

              <div className="text-center text-xs text-gray-400">
                Don't have an account?{' '}
                <button
                  onClick={() => {
                    setStep('register');
                    setError('');
                  }}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Register
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Register Step */}
        {step === 'register' && (
          <div className="p-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="CryptoTrader123"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {error && (
                <div className="px-3 py-2 bg-red-900/30 border border-red-700/50 rounded text-xs text-red-400">
                  {error}
                </div>
              )}

              <button
                onClick={handleRegister}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded transition-all"
              >
                Create Account
              </button>

              <div className="text-center text-xs text-gray-400">
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setStep('login');
                    setError('');
                  }}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Premium Upgrade Step */}
        {step === 'premium' && (
          <div className="p-4">
            <div className="bg-gradient-to-r from-amber-900/20 to-yellow-900/20 border border-amber-700/30 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">⭐</span>
                <h3 className="text-lg font-bold text-amber-400">Premium Benefits</h3>
              </div>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>✓ Custom bet amounts (any amount)</li>
                <li>✓ Higher starting balance ($1000)</li>
                <li>✓ Priority support</li>
                <li>✓ Advanced analytics</li>
                <li>✓ Exclusive tournaments</li>
              </ul>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Wallet Address (Optional)
                </label>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="0x... or your crypto wallet"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="text-center text-xs text-gray-500">OR</div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Bank Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="1234567890"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Bank of America"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Account Holder Name</label>
                <input
                  type="text"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {error && (
                <div className="px-3 py-2 bg-red-900/30 border border-red-700/50 rounded text-xs text-red-400">
                  {error}
                </div>
              )}

              <button
                onClick={handleUpgradeToPremium}
                className="w-full py-3 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold rounded transition-all"
              >
                ⭐ Upgrade to Premium
              </button>

              <button
                onClick={onClose}
                className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm rounded transition-all"
              >
                Skip for now (Free account)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
