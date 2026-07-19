import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; type: string }> }
) {
  const { id, type } = await params;

  if (type !== "asset" && type !== "nameplate") {
    return new Response(null, { status: 404 });
  }

  const asset = await prisma.asset.findUnique({
    where: { id },
    select: {
      assetImage: true,
      assetImageType: true,
      nameplateImage: true,
      nameplateImageType: true,
    },
  });

  const data = asset && (type === "asset" ? asset.assetImage : asset.nameplateImage);
  const contentType =
    asset && (type === "asset" ? asset.assetImageType : asset.nameplateImageType);

  if (!data || !contentType) {
    return new Response(null, { status: 404 });
  }

  return new Response(data, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
