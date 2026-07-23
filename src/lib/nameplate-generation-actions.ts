"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { recognizeNameplateText } from "@/lib/nameplate-ocr";
import { parseNameplateOcrText } from "@/lib/nameplate-ocr-parse";
import { identifyAssetFromNameplate } from "@/lib/nameplate-identification";
import { getDecryptedVisionProviderConfig } from "@/lib/vision-provider-settings";
import { extractNameplateFieldsWithVision } from "@/lib/vision-providers/extract-nameplate-fields";
import { extractNameplateData } from "@/lib/aas-nameplate";
import type { AasData } from "@/lib/aas";
import { reindexAssetAas } from "@/lib/aas-reindex";
import { mirrorAasDataToLocalRepo } from "@/lib/aas-mirror";
import {
  buildAssetMetadataSubmodel,
  buildAssetNameplateSubmodel,
  buildAssetShell,
  publishAssetAas,
  type NameplateManualFields,
} from "@/lib/aas-publish";

export type NameplateAnalysisResult =
  | { status: "no-photo" }
  | {
      status: "matched";
      globalAssetId: string;
      manufacturerName: string | null;
      productDesignation: string | null;
    }
  | {
      status: "no-match";
      manufacturerNameGuess: string | null;
      articleNumberGuess: string | null;
      rawText: string;
      guessSource: "ocr" | "vision";
    };

/** Best-effort preview of a resolved real shell's own Nameplate submodel, if it has one. */
function nameplatePreview(aasData: AasData): {
  manufacturerName: string | null;
  productDesignation: string | null;
} {
  for (const submodel of aasData.submodels) {
    const nameplate = extractNameplateData(submodel);
    if (nameplate) {
      return {
        manufacturerName: nameplate.manufacturerName,
        productDesignation:
          nameplate.productProperties.find(
            (property) => property.idShort === "ManufacturerProductDesignation"
          )?.value ?? null,
      };
    }
  }
  return { manufacturerName: null, productDesignation: null };
}

export async function analyzeNameplatePhoto(assetId: string): Promise<NameplateAnalysisResult> {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { nameplateImage: true, nameplateImageType: true },
  });
  if (!asset?.nameplateImage) {
    return { status: "no-photo" };
  }

  const repositories = await prisma.aasRepository.findMany({
    where: { isLocalMirror: false },
  });
  const imageBuffer = Buffer.from(asset.nameplateImage);
  const rawText = await recognizeNameplateText(imageBuffer);
  const ocrGuess = parseNameplateOcrText(
    rawText,
    repositories.map((repository) => repository.name)
  );

  let guessSource: "ocr" | "vision" = "ocr";
  let manufacturerNameGuess = ocrGuess.manufacturerName;
  let articleNumberGuess = ocrGuess.articleNumber;

  // OCR couldn't extract an article number - try the configured vision-API
  // fallback (if any) before giving up. A vision failure (no config, bad
  // key, network) just leaves the OCR guess in place - `no-match` with an
  // empty guess is still a valid, handled outcome (manual entry).
  if (!articleNumberGuess) {
    const visionConfig = await getDecryptedVisionProviderConfig();
    if (visionConfig) {
      const visionGuess = await extractNameplateFieldsWithVision(
        visionConfig,
        imageBuffer,
        asset.nameplateImageType ?? "image/jpeg"
      );
      if (visionGuess.articleNumber || visionGuess.manufacturerName) {
        guessSource = "vision";
        manufacturerNameGuess = visionGuess.manufacturerName;
        articleNumberGuess = visionGuess.articleNumber;
      }
    }
  }

  const match = await identifyAssetFromNameplate(articleNumberGuess);
  if (match) {
    const preview = nameplatePreview(match.aasData);
    return {
      status: "matched",
      globalAssetId: match.globalAssetId,
      manufacturerName: preview.manufacturerName,
      productDesignation: preview.productDesignation,
    };
  }

  return {
    status: "no-match",
    manufacturerNameGuess,
    articleNumberGuess,
    rawText: ocrGuess.rawText,
    guessSource,
  };
}

export async function linkAssetToMatchedAas(
  assetId: string,
  globalAssetId: string
): Promise<void> {
  const updated = await prisma.asset.update({
    where: { id: assetId },
    data: { aasGlobalAssetId: globalAssetId, aasEndpointUrl: null },
  });

  const reindexResult = await reindexAssetAas(updated);
  if (reindexResult.status === "ok") {
    await prisma.asset.update({
      where: { id: assetId },
      data: { aasSearchText: reindexResult.text, aasSearchIndexedAt: new Date() },
    });
  }

  await publishAssetAas(updated);
  revalidatePath("/asset-structure/table");
  revalidatePath("/asset-structure", "layout");
}

export type PublishManualNameplateResult = { error: string | null };

export async function publishManualNameplate(
  assetId: string,
  fields: NameplateManualFields
): Promise<PublishManualNameplateResult> {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) {
    return { error: "Asset not found." };
  }

  const updated = await prisma.asset.update({
    where: { id: assetId },
    data: { nameplateSubmodelGeneratedAt: new Date() },
  });

  const status = await mirrorAasDataToLocalRepo({
    shell: buildAssetShell(updated),
    submodels: [
      buildAssetMetadataSubmodel(updated),
      buildAssetNameplateSubmodel(assetId, fields),
    ],
  });

  revalidatePath("/asset-structure/table");
  revalidatePath("/asset-structure", "layout");

  return {
    error:
      status === "mirrored"
        ? null
        : "Could not publish the Nameplate submodel to the local AAS mirror.",
  };
}
