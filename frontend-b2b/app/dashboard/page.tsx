'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { BarChart3, Users, Mail, TrendingUp, Plus, Search } from 'lucide-react';

interface Stats {
  totalLeads: number;
  totalEmails: number;
  openRate: number;
  clickRate: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    fetchStats(token);
  }, []);

  const fetchStats = async (token: string) => {
    try {
      const [emailStats, user] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/emails/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setStats({
        totalLeads: user.data.totalLeads || 0,
        totalEmails: user.data.totalEmails || 0,
        openRate: emailStats.data.openRate || 0,
        clickRate: emailStats.data.clickRate || 0,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

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
              <a href="/dashboard/emails" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md font-medium">
                邮件
              </a>
              <a href="/dashboard/ai" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md font-medium">
                AI生成
              </a>
              <button
                onClick={handleLogout}
                className="text-gray-700 hover:text-red-600 px-3 py-2 rounded-md font-medium"
              >
                退出
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">潜在客户</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.totalLeads || 0}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">已发送邮件</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.totalEmails || 0}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Mail className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">打开率</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.openRate.toFixed(1)}%</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">点击率</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.clickRate.toFixed(1)}%</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/dashboard/leads?action=add"
              className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <Plus className="w-5 h-5 text-blue-600 mr-3" />
              <span className="font-medium text-gray-700">添加潜在客户</span>
            </a>

            <a
              href="/dashboard/ai"
              className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <BarChart3 className="w-5 h-5 text-blue-600 mr-3" />
              <span className="font-medium text-gray-700">AI生成邮件</span>
            </a>

            <a
              href="/dashboard/leads?action=import"
              className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <Search className="w-5 h-5 text-blue-600 mr-3" />
              <span className="font-medium text-gray-700">LinkedIn搜索</span>
            </a>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">最近活动</h2>
          <div className="text-center py-8 text-gray-500">
            暂无活动记录
          </div>
        </div>
      </main>
    </div>
  );
}
