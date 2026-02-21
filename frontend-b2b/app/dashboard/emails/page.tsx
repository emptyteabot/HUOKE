'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Mail, Eye, MousePointer, Clock } from 'lucide-react';

interface Email {
  id: string;
  subject: string;
  status: string;
  sentAt: string;
  openedAt?: string;
  clickedAt?: string;
  opens: number;
  clicks: number;
  lead: {
    name: string;
    email: string;
    company: string;
  };
}

export default function EmailsPage() {
  const router = useRouter();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    fetchEmails(token);
  }, []);

  const fetchEmails = async (token: string) => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/emails`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmails(response.data.emails || []);
    } catch (error) {
      console.error('Failed to fetch emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'opened':
        return 'bg-green-100 text-green-800';
      case 'clicked':
        return 'bg-purple-100 text-purple-800';
      case 'replied':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: '草稿',
      scheduled: '已计划',
      sent: '已发送',
      opened: '已打开',
      clicked: '已点击',
      replied: '已回复',
      bounced: '退回',
    };
    return statusMap[status] || status;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">LeadPulse</h1>
            </div>
            <nav className="flex items-center space-x-4">
              <a href="/dashboard" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md font-medium">
                仪表盘
              </a>
              <a href="/dashboard/leads" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md font-medium">
                潜在客户
              </a>
              <a href="/dashboard/emails" className="text-blue-600 px-3 py-2 rounded-md font-medium border-b-2 border-blue-600">
                邮件
              </a>
              <a href="/dashboard/ai" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md font-medium">
                AI生成
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">邮件历史</h2>
          <p className="text-gray-600 mt-1">查看所有已发送的邮件及其状态</p>
        </div>

        {/* Emails List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-gray-600">加载中...</div>
          ) : emails.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">暂无邮件记录</p>
              <a href="/dashboard/ai" className="mt-4 inline-block text-blue-600 hover:underline">
                使用AI生成第一封邮件
              </a>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {emails.map((email) => (
                <div key={email.id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{email.subject}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(email.status)}`}>
                          {getStatusText(email.status)}
                        </span>
                      </div>

                      <div className="text-sm text-gray-600 mb-3">
                        <span className="font-medium">{email.lead.name}</span>
                        <span className="mx-2">•</span>
                        <span>{email.lead.email}</span>
                        <span className="mx-2">•</span>
                        <span>{email.lead.company}</span>
                      </div>

                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {new Date(email.sentAt).toLocaleString('zh-CN')}
                        </div>

                        {email.opens > 0 && (
                          <div className="flex items-center">
                            <Eye className="w-4 h-4 mr-1 text-green-600" />
                            打开 {email.opens} 次
                          </div>
                        )}

                        {email.clicks > 0 && (
                          <div className="flex items-center">
                            <MousePointer className="w-4 h-4 mr-1 text-purple-600" />
                            点击 {email.clicks} 次
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
