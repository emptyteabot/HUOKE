import { redeemCode } from '../../../lib/redemption';

export const runtime = 'nodejs';

type RedeemPayload = {
  code?: string;
  email?: string;
  company?: string;
  productUrl?: string;
};

function humanizeError(message: string) {
  switch (String(message || '').trim()) {
    case 'code_required':
      return '请先输入兑换码。';
    case 'email_required':
      return '请填写接收交付包的邮箱。';
    case 'company_required':
      return '请填写公司或项目名。';
    case 'code_not_found':
      return '兑换码不存在，请检查后重试。';
    case 'code_disabled':
      return '这个兑换码已停用，请联系发码方。';
    case 'code_expired':
      return '这个兑换码已过期，请重新购买。';
    case 'code_uses_exceeded':
      return '这个兑换码已经使用过，不能重复开通。';
    default:
      return '兑换失败，请稍后再试。';
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RedeemPayload;
    const redeemed = await redeemCode({
      code: String(payload.code || ''),
      email: String(payload.email || ''),
      company: String(payload.company || ''),
      productUrl: String(payload.productUrl || ''),
    });

    return Response.json({
      ok: true,
      message: '兑换成功，正在进入启动页。',
      startUrl: redeemed.startUrl,
      deliveryId: redeemed.package.id,
      accessCode: redeemed.package.accessCode,
      workspaceId: redeemed.package.workspaceId,
      planName: redeemed.package.planName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'redeem_failed';
    const known = new Set([
      'code_required',
      'email_required',
      'company_required',
      'code_not_found',
      'code_disabled',
      'code_expired',
      'code_uses_exceeded',
    ]);

    return Response.json(
      {
        ok: false,
        error: humanizeError(message),
      },
      { status: known.has(message) ? 400 : 500 },
    );
  }
}
