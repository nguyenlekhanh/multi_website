import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/require-admin';
import { getPreviewPackageAsset } from '@/lib/theme-package/preview/store';

/**
 * Serves `assets/*` files for UNINSTALLED packages staged by the Preview Lab.
 * Admin-gated (the install route is public because installed previews are
 * marketing assets; staged packages are pre-install review material), exact
 * key match only, images only, and never cached.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string; asset: string }> },
) {
  try {
    await requireAdmin();
  } catch {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const { token, asset } = await params;
  const assetFile = getPreviewPackageAsset(token, decodeURIComponent(asset));
  if (!assetFile) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(new Uint8Array(assetFile.data), {
    headers: {
      'content-type': assetFile.mime,
      'cache-control': 'private, no-store',
    },
  });
}
