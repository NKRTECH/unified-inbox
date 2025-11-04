/**
 * Scheduled Messages Page
 * View and manage scheduled messages
 */

'use client';

import { useState, useEffect } from 'react';
import { ScheduledMessagesList } from '@/components/scheduling';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { 
  CalendarIcon, 
  ClockIcon, 
  CheckCircleIcon,
  XCircleIcon,
  RefreshCwIcon,
} from 'lucide-react';

interface ScheduledMessage {
  id: string;
  messageId: string;
  scheduledFor: Date;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
  templateId?: string;
  variables?: Record<string, any>;
  createdAt: Date;
  message: {
    id: string;
    conversationId: string;
    contactId: string;
    channel: string;
    content: string;
    contact: {
      id: string;
      name?: string;
      phone?: string;
      email?: string;
    };
  };
}

interface Stats {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  cancelled: number;
  upcomingToday: number;
  upcomingThisWeek: number;
}

export default function ScheduledMessagesPage() {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    loadScheduledMessages();
  }, [activeTab]);

  const loadScheduledMessages = async () => {
    setLoading(true);
    try {
      const statusParam = activeTab === 'all' ? '' : `?status=${activeTab.toUpperCase()}`;
      const response = await fetch(`/api/messages/schedule${statusParam}`);
      const result = await response.json();

      if (result.success) {
        setMessages(result.data);
        setStats(result.stats);
      } else {
        console.error('Failed to load scheduled messages:', result.error);
      }
    } catch (error) {
      console.error('Error loading scheduled messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/schedule/${messageId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        await loadScheduledMessages();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to cancel message:', error);
      throw error;
    }
  };

  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    color 
  }: { 
    icon: any; 
    label: string; 
    value: number; 
    color: string;
  }) => (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <CalendarIcon className="h-8 w-8 text-purple-600" />
            Scheduled Messages
          </h1>
          <p className="text-gray-600 mt-2">
            Manage and monitor your scheduled messages
          </p>
        </div>
        <Button
          onClick={loadScheduledMessages}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCwIcon className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={ClockIcon}
            label="Pending"
            value={stats.pending}
            color="bg-yellow-100 text-yellow-700"
          />
          <StatCard
            icon={CheckCircleIcon}
            label="Sent"
            value={stats.sent}
            color="bg-green-100 text-green-700"
          />
          <StatCard
            icon={XCircleIcon}
            label="Failed"
            value={stats.failed}
            color="bg-red-100 text-red-700"
          />
          <StatCard
            icon={CalendarIcon}
            label="This Week"
            value={stats.upcomingThisWeek}
            color="bg-purple-100 text-purple-700"
          />
        </div>
      )}

      {/* Tabs */}
      <Card className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="pending">
              Pending ({stats?.pending || 0})
            </TabsTrigger>
            <TabsTrigger value="sent">
              Sent ({stats?.sent || 0})
            </TabsTrigger>
            <TabsTrigger value="failed">
              Failed ({stats?.failed || 0})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled ({stats?.cancelled || 0})
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({stats?.total || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {loading ? (
              <div className="text-center py-12">
                <RefreshCwIcon className="h-12 w-12 text-gray-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading scheduled messages...</p>
              </div>
            ) : (
              <ScheduledMessagesList
                messages={messages}
                onCancel={handleCancel}
                onRefresh={loadScheduledMessages}
              />
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
