/**
 * 自动化工作流引擎
 * 基于Twenty CRM的自动化架构
 */

import { prisma } from '../index';
import { EmailService } from './email.service';
import { AIService } from './ai.service';

// 工作流触发器类型
type WorkflowTrigger =
  | 'lead_created'           // 新线索创建
  | 'email_opened'           // 邮件被打开
  | 'email_clicked'          // 邮件链接被点击
  | 'no_response_3days'      // 3天未回复
  | 'no_response_7days'      // 7天未回复
  | 'high_engagement'        // 高参与度
  | 'lead_score_threshold';  // 线索评分达到阈值

// 工作流动作类型
type WorkflowAction =
  | 'send_email'             // 发送邮件
  | 'assign_to_user'         // 分配给用户
  | 'update_lead_status'     // 更新线索状态
  | 'add_tag'                // 添加标签
  | 'create_task'            // 创建任务
  | 'send_notification';     // 发送通知

interface WorkflowRule {
  id: string;
  name: string;
  trigger: WorkflowTrigger;
  conditions?: any;
  actions: Array<{
    type: WorkflowAction;
    params: any;
  }>;
  enabled: boolean;
}

export class WorkflowService {
  /**
   * 预定义工作流规则 (留学机构专用)
   */
  private static readonly DEFAULT_WORKFLOWS: WorkflowRule[] = [
    {
      id: 'auto-assign-new-lead',
      name: '自动分配新线索',
      trigger: 'lead_created',
      actions: [
        {
          type: 'assign_to_user',
          params: { strategy: 'round_robin' } // 轮询分配
        },
        {
          type: 'send_email',
          params: {
            template: '首次咨询邮件',
            delay: 0 // 立即发送
          }
        }
      ],
      enabled: true
    },
    {
      id: 'follow-up-opened-email',
      name: '邮件打开后自动跟进',
      trigger: 'email_opened',
      conditions: {
        opens: { gte: 2 } // 打开2次以上
      },
      actions: [
        {
          type: 'update_lead_status',
          params: { status: 'interested' }
        },
        {
          type: 'send_notification',
          params: {
            message: '线索{{leadName}}多次打开邮件,建议立即跟进'
          }
        }
      ],
      enabled: true
    },
    {
      id: 'follow-up-clicked-link',
      name: '点击链接后发送院校推荐',
      trigger: 'email_clicked',
      actions: [
        {
          type: 'update_lead_status',
          params: { status: 'highly_interested' }
        },
        {
          type: 'send_email',
          params: {
            template: '院校推荐邮件',
            delay: 3600 // 1小时后发送
          }
        }
      ],
      enabled: true
    },
    {
      id: 'follow-up-3days',
      name: '3天未回复自动跟进',
      trigger: 'no_response_3days',
      actions: [
        {
          type: 'send_email',
          params: {
            template: '留学规划建议',
            delay: 0
          }
        }
      ],
      enabled: true
    },
    {
      id: 'follow-up-7days',
      name: '7天未回复最后跟进',
      trigger: 'no_response_7days',
      actions: [
        {
          type: 'send_email',
          params: {
            template: '优惠活动通知',
            delay: 0
          }
        },
        {
          type: 'update_lead_status',
          params: { status: 'cold' }
        }
      ],
      enabled: true
    },
    {
      id: 'high-engagement-alert',
      name: '高参与度线索提醒',
      trigger: 'high_engagement',
      conditions: {
        readingTime: { gte: 30 } // 阅读时长>30秒
      },
      actions: [
        {
          type: 'update_lead_status',
          params: { status: 'hot' }
        },
        {
          type: 'send_notification',
          params: {
            message: '🔥 高意向线索{{leadName}},阅读时长{{readingTime}}秒,建议立即电话跟进!'
          }
        },
        {
          type: 'create_task',
          params: {
            title: '电话跟进高意向线索',
            priority: 'high',
            dueDate: 'today'
          }
        }
      ],
      enabled: true
    }
  ];

  /**
   * 执行工作流
   */
  static async executeWorkflow(
    trigger: WorkflowTrigger,
    context: {
      leadId?: string;
      emailId?: string;
      userId?: string;
      data?: any;
    }
  ): Promise<void> {
    try {
      // 查找匹配的工作流规则
      const matchingWorkflows = this.DEFAULT_WORKFLOWS.filter(
        w => w.enabled && w.trigger === trigger
      );

      for (const workflow of matchingWorkflows) {
        console.log(`🔄 执行工作流: ${workflow.name}`);

        // 检查条件
        if (workflow.conditions) {
          const conditionsMet = await this.checkConditions(workflow.conditions, context);
          if (!conditionsMet) {
            console.log(`⏭️ 条件不满足,跳过工作流: ${workflow.name}`);
            continue;
          }
        }

        // 执行动作
        for (const action of workflow.actions) {
          await this.executeAction(action, context);
        }
      }
    } catch (error) {
      console.error('Execute workflow error:', error);
    }
  }

  /**
   * 检查条件
   */
  private static async checkConditions(conditions: any, context: any): Promise<boolean> {
    // 简单条件检查逻辑
    if (conditions.opens && context.data?.opens) {
      if (conditions.opens.gte && context.data.opens < conditions.opens.gte) {
        return false;
      }
    }

    if (conditions.readingTime && context.data?.readingTime) {
      if (conditions.readingTime.gte && context.data.readingTime < conditions.readingTime.gte) {
        return false;
      }
    }

    return true;
  }

  /**
   * 执行动作
   */
  private static async executeAction(
    action: { type: WorkflowAction; params: any },
    context: any
  ): Promise<void> {
    try {
      switch (action.type) {
        case 'send_email':
          await this.actionSendEmail(action.params, context);
          break;

        case 'assign_to_user':
          await this.actionAssignToUser(action.params, context);
          break;

        case 'update_lead_status':
          await this.actionUpdateLeadStatus(action.params, context);
          break;

        case 'add_tag':
          await this.actionAddTag(action.params, context);
          break;

        case 'create_task':
          await this.actionCreateTask(action.params, context);
          break;

        case 'send_notification':
          await this.actionSendNotification(action.params, context);
          break;

        default:
          console.log(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      console.error(`Execute action error (${action.type}):`, error);
    }
  }

  /**
   * 动作: 发送邮件
   */
  private static async actionSendEmail(params: any, context: any): Promise<void> {
    const { leadId, userId } = context;
    const { template, delay = 0 } = params;

    if (!leadId || !userId) return;

    // 获取线索信息
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });

    if (!lead) return;

    // 延迟发送
    if (delay > 0) {
      setTimeout(async () => {
        await this.sendTemplateEmail(lead, userId, template);
      }, delay * 1000);
    } else {
      await this.sendTemplateEmail(lead, userId, template);
    }
  }

  /**
   * 发送模板邮件
   */
  private static async sendTemplateEmail(lead: any, userId: string, template: string): Promise<void> {
    try {
      // 使用AI生成邮件
      const generatedEmail = await AIService.generateEmail({
        recipientName: lead.name,
        studentName: lead.name,
        targetCountry: lead.targetCountry,
        targetDegree: lead.targetDegree,
        major: lead.major,
        budget: lead.budget,
        productName: 'LeadPulse',
        valueProposition: '专业留学规划服务',
        emailTemplate: template as any
      });

      // 发送邮件
      await EmailService.sendEmail({
        to: lead.email,
        subject: generatedEmail.subject,
        body: generatedEmail.body,
        userId,
        leadId: lead.id
      });

      console.log(`✅ 自动发送邮件: ${template} -> ${lead.email}`);
    } catch (error) {
      console.error('Send template email error:', error);
    }
  }

  /**
   * 动作: 分配给用户
   */
  private static async actionAssignToUser(params: any, context: any): Promise<void> {
    const { leadId } = context;
    const { strategy } = params;

    if (!leadId) return;

    // 获取所有顾问
    const consultants = await prisma.user.findMany({
      where: { role: 'consultant' }
    });

    if (consultants.length === 0) return;

    let assignedUserId: string;

    if (strategy === 'round_robin') {
      // 轮询分配
      const leadCount = await prisma.lead.count();
      const index = leadCount % consultants.length;
      assignedUserId = consultants[index].id;
    } else {
      // 默认分配给第一个
      assignedUserId = consultants[0].id;
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: { userId: assignedUserId }
    });

    console.log(`✅ 自动分配线索 -> 用户 ${assignedUserId}`);
  }

  /**
   * 动作: 更新线索状态
   */
  private static async actionUpdateLeadStatus(params: any, context: any): Promise<void> {
    const { leadId } = context;
    const { status } = params;

    if (!leadId) return;

    await prisma.lead.update({
      where: { id: leadId },
      data: { status }
    });

    console.log(`✅ 更新线索状态 -> ${status}`);
  }

  /**
   * 动作: 添加标签
   */
  private static async actionAddTag(params: any, context: any): Promise<void> {
    const { leadId } = context;
    const { tag } = params;

    if (!leadId) return;

    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });

    if (!lead) return;

    const tags = lead.tags ? JSON.parse(lead.tags as string) : [];
    if (!tags.includes(tag)) {
      tags.push(tag);
      await prisma.lead.update({
        where: { id: leadId },
        data: { tags: JSON.stringify(tags) }
      });
    }

    console.log(`✅ 添加标签: ${tag}`);
  }

  /**
   * 动作: 创建任务
   */
  private static async actionCreateTask(params: any, context: any): Promise<void> {
    const { leadId, userId } = context;
    const { title, priority, dueDate } = params;

    if (!leadId || !userId) return;

    // TODO: 创建任务记录
    console.log(`✅ 创建任务: ${title} (优先级: ${priority})`);
  }

  /**
   * 动作: 发送通知
   */
  private static async actionSendNotification(params: any, context: any): Promise<void> {
    const { leadId } = context;
    const { message } = params;

    if (!leadId) return;

    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });

    if (!lead) return;

    // 替换变量
    const finalMessage = message
      .replace('{{leadName}}', lead.name)
      .replace('{{readingTime}}', context.data?.readingTime || '0');

    console.log(`📬 通知: ${finalMessage}`);

    // TODO: 发送到WebSocket/Webhook
  }

  /**
   * 定时任务: 检查未回复邮件
   */
  static async checkUnrespondedEmails(): Promise<void> {
    try {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // 3天未回复
      const emails3Days = await prisma.email.findMany({
        where: {
          sentAt: { lte: threeDaysAgo },
          repliedAt: null,
          status: { not: 'replied' }
        }
      });

      for (const email of emails3Days) {
        await this.executeWorkflow('no_response_3days', {
          emailId: email.id,
          leadId: email.leadId,
          userId: email.userId
        });
      }

      // 7天未回复
      const emails7Days = await prisma.email.findMany({
        where: {
          sentAt: { lte: sevenDaysAgo },
          repliedAt: null,
          status: { not: 'replied' }
        }
      });

      for (const email of emails7Days) {
        await this.executeWorkflow('no_response_7days', {
          emailId: email.id,
          leadId: email.leadId,
          userId: email.userId
        });
      }

      console.log(`✅ 检查完成: ${emails3Days.length}个3天未回复, ${emails7Days.length}个7天未回复`);
    } catch (error) {
      console.error('Check unresponded emails error:', error);
    }
  }
}
