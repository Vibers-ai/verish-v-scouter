import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import useAuthStore from '../stores/authStore';
import LoadingIndicator from '../components/common/LoadingIndicator';

function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);

  const loginWithCode = useAuthStore((state) => state.loginWithCode);

  const authMutation = useMutation({
    mutationFn: async ({ code, maestroUrl }) => {
      return await loginWithCode(code, maestroUrl);
    },
    onSuccess: (data) => {
      if (data.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError(data.error || 'Authentication failed');
      }
    },
    onError: (error) => {
      setError(error.message || 'Authentication failed');
    },
  });

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const maestroUrl = searchParams.get('maestro_url');
      const state = searchParams.get('state');

      if (!code || !maestroUrl) {
        setError('Missing required parameters. Please try logging in again.');
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
        return;
      }

      // TODO: Validate state parameter for CSRF protection if implementing state generation

      authMutation.mutate({ code, maestroUrl });
    };

    handleCallback();
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            <div className="mb-4">
              <svg
                style={{ width: '32px', height: '32px', margin: '0 auto', color: '#ef4444' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              인증 실패
            </h2>
            <p className="text-gray-600 mb-6">
              {error}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              로그인 페이지로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <div className="text-center">
          <LoadingIndicator />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            인증 처리 중...
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Maestro SSO를 통해 인증을 진행하고 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthCallback;