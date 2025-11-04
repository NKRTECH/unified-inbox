'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStatus } from '@/lib/hooks/use-auth-status';

export function AuthDebug() {
  const [sessionTest, setSessionTest] = useState<any>(null);
  const [accessTokenTest, setAccessTokenTest] = useState<any>(null);
  const { isAuthenticated, isLoading, user } = useAuthStatus();

  const testSession = async () => {
    try {
      const response = await fetch('/api/auth/session-test', {
        credentials: 'include',
      });
      const data = await response.json();
      setSessionTest(data);
    } catch (error) {
      setSessionTest({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const testAccessToken = async () => {
    try {
      const response = await fetch('/api/integrations/twilio/access-token', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      setAccessTokenTest({ status: response.status, data });
    } catch (error) {
      setAccessTokenTest({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Authentication Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">useAuthStatus Hook:</h4>
          <pre className="text-xs bg-gray-100 p-2 rounded">
            {JSON.stringify({ isAuthenticated, isLoading, user }, null, 2)}
          </pre>
        </div>

        <div className="flex gap-2">
          <Button onClick={testSession} size="sm">
            Test Session API
          </Button>
          <Button onClick={testAccessToken} size="sm">
            Test Access Token API
          </Button>
        </div>

        {sessionTest && (
          <div>
            <h4 className="font-medium mb-2">Session Test Result:</h4>
            <pre className="text-xs bg-gray-100 p-2 rounded">
              {JSON.stringify(sessionTest, null, 2)}
            </pre>
          </div>
        )}

        {accessTokenTest && (
          <div>
            <h4 className="font-medium mb-2">Access Token Test Result:</h4>
            <pre className="text-xs bg-gray-100 p-2 rounded">
              {JSON.stringify(accessTokenTest, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}