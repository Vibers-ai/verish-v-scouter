import { useEffect } from 'react';

function Unauthorized() {
  const maestroLoginUrl = 'https://maestro.vibers-ai.dev/login';

  useEffect(() => {
    // Redirect to Maestro login after a delay
    setTimeout(() => {
      window.location.href = maestroLoginUrl;
    }, 3000);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <div className="text-center">
          <div className="mb-4">
            <svg
              style={{ width: '32px', height: '32px', margin: '0 auto', color: '#eab308' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            인증이 필요합니다
          </h2>
          <p className="text-gray-600 mb-6">
            이 페이지에 접근하려면 Maestro를 통한 인증이 필요합니다.
          </p>

          <div>
            <p className="text-sm text-gray-500 mb-4">
              3초 후 Maestro로 리다이렉트됩니다...
            </p>
            <a
              href={maestroLoginUrl}
              className="inline-block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              지금 Maestro로 이동
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Unauthorized;