import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../trpc';
import { useAuth } from '../auth';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      login(data.token, { userId: data.user.id, username: data.user.username, role: data.user.role });
      navigate('/');
    },
    onError: (err) => setError(err.message),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      login(data.token, { userId: data.user.id, username: data.user.username, role: data.user.role });
      navigate('/');
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isRegister) {
      registerMutation.mutate({ username, password });
    } else {
      loginMutation.mutate({ username, password });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-lg font-bold">M</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">营销数据管理系统</h1>
          <p className="text-sm text-gray-500 mt-1">{isRegister ? '注册新账号' : '登录到您的账号'}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {error && (
            <div className="bg-red-50 text-red-600 px-3 py-2.5 rounded-lg mb-4 text-sm border border-red-100">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="form-label">用户名</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="form-input"
                required
              />
            </div>
            <div className="mb-6">
              <label className="form-label">密码</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="form-input"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loginMutation.isPending || registerMutation.isPending}
              className="btn-primary w-full py-2.5"
            >
              {loginMutation.isPending || registerMutation.isPending ? '处理中...' : isRegister ? '注册' : '登录'}
            </button>
          </form>
          <div className="text-center mt-4">
            <button onClick={() => setIsRegister(!isRegister)} className="text-sm text-blue-600 hover:text-blue-700">
              {isRegister ? '已有账号？登录' : '没有账号？注册'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
