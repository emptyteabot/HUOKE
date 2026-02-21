import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 留学成功案例数据库 (RAG)
const EDUCATION_SUCCESS_CASES = [
  {
    student: "张同学",
    background: "国内985大学,GPA 3.8,托福110",
    target: "美国TOP30计算机硕士",
    result: "斯坦福大学CS录取",
    timeline: "提前12个月规划",
    highlights: "科研经历丰富,3篇论文"
  },
  {
    student: "李同学",
    background: "双非院校,GPA 3.5,雅思7.5",
    target: "英国G5金融硕士",
    result: "LSE金融录取",
    timeline: "提前10个月规划",
    highlights: "实习经历突出,2段投行实习"
  },
  {
    student: "王同学",
    background: "国际高中,GPA 3.9,SAT 1500",
    target: "美国TOP20本科",
    result: "哥伦比亚大学本科录取",
    timeline: "提前18个月规划",
    highlights: "活动丰富,创立公益组织"
  }
];

// 留学邮件模板类型
type EducationEmailTemplate =
  | '首次咨询邮件'
  | '留学规划建议'
  | '院校推荐邮件'
  | '申请时间线提醒'
  | '成功案例分享'
  | '优惠活动通知';

interface EmailGenerationParams {
  recipientName: string;
  recipientCompany?: string;
  recipientTitle?: string;
  painPoint?: string;
  productName: string;
  valueProposition: string;
  caseStudy?: string;
  tone?: 'professional' | 'friendly' | 'casual';
  length?: 'short' | 'medium' | 'long';
  // 留学专用字段
  studentName?: string;
  targetCountry?: string;
  targetDegree?: string;
  major?: string;
  budget?: string;
  institutionName?: string;
  consultantName?: string;
  emailTemplate?: EducationEmailTemplate;
}

interface GeneratedEmail {
  subject: string;
  body: string;
  aiModel: string;
}

export class AIService {
  /**
   * Multi-Agent架构: 研究Agent - 查找相关成功案例
   */
  private static async researchAgent(params: EmailGenerationParams): Promise<string> {
    const { targetCountry, targetDegree, major } = params;

    // RAG: 从成功案例数据库中检索相关案例
    const relevantCases = EDUCATION_SUCCESS_CASES.filter(c => {
      if (targetCountry && c.target.includes(targetCountry)) return true;
      if (targetDegree && c.target.includes(targetDegree)) return true;
      if (major && c.result.includes(major)) return true;
      return false;
    });

    if (relevantCases.length > 0) {
      const caseExample = relevantCases[0];
      return `相关成功案例：${caseExample.student}，${caseExample.background}，最终获得${caseExample.result}。关键因素：${caseExample.highlights}`;
    }

    return '我们有300+成功案例，TOP30院校录取率85%';
  }

  /**
   * Multi-Agent架构: 撰写Agent - 生成邮件内容
   */
  private static async writerAgent(
    params: EmailGenerationParams,
    researchContext: string
  ): Promise<{ subject: string; body: string }> {
    const {
      recipientName,
      studentName,
      targetCountry,
      targetDegree,
      major,
      budget,
      institutionName = 'XX留学',
      consultantName = '李老师',
      emailTemplate = '首次咨询邮件',
      tone = 'friendly',
      length = 'medium'
    } = params;

    const toneInstructions = {
      professional: '使用专业、正式的语气',
      friendly: '使用友好、亲切的语气',
      casual: '使用轻松、随意的语气'
    };

    const lengthInstructions = {
      short: '保持简短，100字左右',
      medium: '中等长度，200字左右',
      long: '详细说明，300字左右'
    };

    const templateInstructions = {
      '首次咨询邮件': '介绍机构，建立信任，邀请咨询',
      '留学规划建议': '提供具体的时间线和准备建议',
      '院校推荐邮件': '根据背景推荐3-5所匹配院校',
      '申请时间线提醒': '提醒关键时间节点，避免错过deadline',
      '成功案例分享': '分享相似背景学生的成功案例',
      '优惠活动通知': '介绍限时优惠，制造紧迫感'
    };

    const prompt = `你是一个专业的留学顾问，请生成一封个性化的咨询邮件。

收件人信息：
- 家长/学生姓名：${recipientName}
${studentName ? `- 学生姓名：${studentName}` : ''}
${targetCountry ? `- 目标国家：${targetCountry}` : ''}
${targetDegree ? `- 目标学历：${targetDegree}` : ''}
${major ? `- 意向专业：${major}` : ''}
${budget ? `- 预算范围：${budget}` : ''}

机构信息：
- 机构名称：${institutionName}
- 顾问姓名：${consultantName}
- 成功案例：${researchContext}

邮件类型：${emailTemplate}
要求：
1. ${toneInstructions[tone]}
2. ${lengthInstructions[length]}
3. ${templateInstructions[emailTemplate]}
4. 个性化：根据学生背景定制内容
5. 明确CTA：邀请免费咨询或背景评估
6. 包含社会证明（成功案例）
7. 避免过度推销，提供真实价值

请以JSON格式返回：
{
  "subject": "邮件主题（吸引人，不超过30字）",
  "body": "邮件正文（包含称呼、正文、署名）"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的留学顾问，擅长生成高转化率的个性化咨询邮件。你的邮件温暖、专业、有说服力。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('AI返回空响应');
    }

    return JSON.parse(response);
  }

  /**
   * Multi-Agent架构: 优化Agent - 优化邮件质量
   */
  private static async optimizerAgent(
    email: { subject: string; body: string }
  ): Promise<{ subject: string; body: string; score: number }> {
    const prompt = `请评估以下留学咨询邮件的质量，并提供优化建议：

主题：${email.subject}

正文：
${email.body}

评估维度：
1. 个性化程度 (0-100)
2. 价值主张清晰度 (0-100)
3. CTA明确性 (0-100)
4. 语气适当性 (0-100)
5. 长度适中性 (0-100)

请返回JSON格式：
{
  "score": 85,
  "optimizedSubject": "优化后的主题",
  "optimizedBody": "优化后的正文",
  "suggestions": ["建议1", "建议2"]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: '你是邮件营销专家，擅长优化邮件以提升打开率和回复率。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      return { ...email, score: 70 };
    }

    const parsed = JSON.parse(response);
    return {
      subject: parsed.optimizedSubject || email.subject,
      body: parsed.optimizedBody || email.body,
      score: parsed.score || 70
    };
  }

  /**
   * 生成个性化销售邮件 (Multi-Agent协作)
   */
  static async generateEmail(params: EmailGenerationParams): Promise<GeneratedEmail> {
    try {
      // Agent 1: 研究相关案例
      const researchContext = await this.researchAgent(params);

      // Agent 2: 撰写邮件
      const draftEmail = await this.writerAgent(params, researchContext);

      // Agent 3: 优化邮件
      const optimizedEmail = await this.optimizerAgent(draftEmail);

      return {
        subject: optimizedEmail.subject,
        body: optimizedEmail.body,
        aiModel: 'gpt-4-multi-agent'
      };
    } catch (error) {
      console.error('AI生成邮件失败:', error);
      throw new Error('AI生成邮件失败');
    }
  }

  /**
   * A/B测试: 生成多个邮件变体
   */
  static async generateEmailVariants(
    params: EmailGenerationParams,
    count: number = 3
  ): Promise<Array<GeneratedEmail & { variant: string }>> {
    const variants: Array<GeneratedEmail & { variant: string }> = [];

    // 变体A: 短版本 + 专业语气
    const variantA = await this.generateEmail({
      ...params,
      length: 'short',
      tone: 'professional'
    });
    variants.push({ ...variantA, variant: 'A-短版专业' });

    // 变体B: 中等长度 + 友好语气
    const variantB = await this.generateEmail({
      ...params,
      length: 'medium',
      tone: 'friendly'
    });
    variants.push({ ...variantB, variant: 'B-中版友好' });

    // 变体C: 详细版本 + 案例驱动
    if (count >= 3) {
      const variantC = await this.generateEmail({
        ...params,
        length: 'long',
        tone: 'professional',
        emailTemplate: '成功案例分享'
      });
      variants.push({ ...variantC, variant: 'C-长版案例' });
    }

    return variants;
  }

  /**
   * 优化邮件主题行
   */
  static async optimizeSubject(originalSubject: string): Promise<string[]> {
    const prompt = `请为以下邮件主题生成3个优化版本，提升打开率：

原主题：${originalSubject}

要求：
1. 简短（不超过50字）
2. 吸引人
3. 避免垃圾邮件词汇
4. 个性化
5. 制造好奇心

请以JSON数组格式返回：["主题1", "主题2", "主题3"]`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: '你是邮件营销专家，擅长优化邮件主题行。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 200,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('AI返回空响应');
      }

      const parsed = JSON.parse(response);
      return parsed.subjects || [];
    } catch (error) {
      console.error('优化主题失败:', error);
      return [originalSubject];
    }
  }

  /**
   * 分析潜在客户相关性
   */
  static async analyzeLeadRelevance(
    leadInfo: {
      company: string;
      jobTitle?: string;
      industry?: string;
      companySize?: string;
    },
    targetCriteria: {
      targetIndustries?: string[];
      targetTitles?: string[];
      targetCompanySize?: string[];
    }
  ): Promise<{ score: number; reasoning: string }> {
    const prompt = `分析以下潜在客户与目标客户画像的匹配度：

潜在客户信息：
- 公司：${leadInfo.company}
${leadInfo.jobTitle ? `- 职位：${leadInfo.jobTitle}` : ''}
${leadInfo.industry ? `- 行业：${leadInfo.industry}` : ''}
${leadInfo.companySize ? `- 公司规模：${leadInfo.companySize}` : ''}

目标客户画像：
${targetCriteria.targetIndustries ? `- 目标行业：${targetCriteria.targetIndustries.join(', ')}` : ''}
${targetCriteria.targetTitles ? `- 目标职位：${targetCriteria.targetTitles.join(', ')}` : ''}
${targetCriteria.targetCompanySize ? `- 目标规模：${targetCriteria.targetCompanySize.join(', ')}` : ''}

请评分（0-100）并说明理由。

返回JSON格式：
{
  "score": 85,
  "reasoning": "匹配理由"
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: '你是B2B销售专家，擅长评估潜在客户质量。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('AI返回空响应');
      }

      const parsed = JSON.parse(response);
      return {
        score: parsed.score || 50,
        reasoning: parsed.reasoning || '无法分析'
      };
    } catch (error) {
      console.error('分析潜在客户失败:', error);
      return { score: 50, reasoning: '分析失败' };
    }
  }
}