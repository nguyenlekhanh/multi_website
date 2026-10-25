import { NextResponse } from 'next/server';
import { getPackageAsset } from '@/lib/theme-package/store';

/**
 * Serves the preview image of an installed theme package. Only the stored
 * preview is ever served (packages are declarative; no arbitrary file reads).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ themeId: string; asset: string }> },
) {
  const { themeId, asset } = await params;
  const assetFile = await getPackageAsset(themeId, decodeURIComponent(asset));
  if (!assetFile) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(new Uint8Array(assetFile.data), {
    headers: {
      'content-type': assetFile.mime,
      'cache-control': 'public, max-age=3600',
    },
  });
}
