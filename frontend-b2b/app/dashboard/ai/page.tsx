'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Sparkles, Copy, Send, RefreshCw } from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  jobTitle?: string;
}

export default function AIPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState('');
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [tone, setTone] = useState('professional');
  const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; body: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    fetchLeads(token);
  }, []);

  const fetchLeads = async (token: string) => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/leads`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeads(response.data.leads || []);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    }
  };

  const handleGenerate = async () => {
    if (!selectedLead || !productName || !productDescription) {
      alert('请填写所有必填字段');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/ai/generate-email`,
        {
          leadId: selectedLead,
          productName,
          productDescription,
          tone,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setGeneratedEmail(response.data);
    } catch (error: any) {
      alert(error.response?.data?.error || 'AI生成失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (generatedEmail) {
      const text = `主题: ${generatedEmail.subject}\n\n${generatedEmail.body}`;
      navigator.clipboard.writeText(text);
      alert('已复制到剪贴板');
    }
  };

  const handleSend = async () => {
    if (!generatedEmail || !selectedLead) return;

    const token = localStorage.getItem('token');
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/emails/send`,
        {
          leadId: selectedLead,
          subject: generatedEmail.subject,
          body: generatedEmail.body,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert('邮件已发送');
      setGeneratedEmail(null);
      setSelectedLead('');
      setProductName('');
      setProductDescription('');
    } catch (error: any) {
      alert(error.response?.data?.error || '发送失败');
    }
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
              <a href="/dashboard/emails" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md font-medium">
                邮件
              </a>
              <a href="/dashboard/ai" className="text-blue-600 px-3 py-2 rounded-md font-medium border-b-2 border-blue-600">
                AI生成
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Sparkles className="w-6 h-6 text-yellow-500 mr-2" />
            AI邮件生成
          </h2>
          <p className="text-gray-600 mt-1">使用AI为您的潜在客户生成个性化邮件</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">邮件参数</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择潜在客户 *
                </label>
                <select
                  value={selectedLead}
                  onChange={(e) => setSelectedLead(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">请选择...</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name} - {lead.company}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  产品名称 *
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例如: LeadPulse"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  产品描述 *
                </label>
                <textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="简要描述您的产品或服务..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  邮件语气
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="professional">专业</option>
                  <option value="friendly">友好</option>
                  <option value="casual">随意</option>
                </select>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    生成邮件
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Generated Email */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">生成结果</h3>

            {generatedEmail ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    主题
                  </label>
                  <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                    {generatedEmail.subject}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    正文
                  </label>
                  <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 whitespace-pre-wrap min-h-[300px]">
                    {generatedEmail.body}
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleCopy}
                    className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    复制
                  </button>
                  <button
                    onClick={handleSend}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    发送
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p>填写左侧表单并点击"生成邮件"</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
