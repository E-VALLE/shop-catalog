import { Card, Group, Image, UnstyledButton } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IMAGE_PANEL_BG } from "../theme/surfaces";

interface ProductGalleryProps {
  title: string;
  thumbnail: string;
  images: string[];
}

/** Imagem principal com miniaturas selecionáveis (só aparecem quando há mais de uma foto). */
export function ProductGallery({ title, thumbnail, images }: ProductGalleryProps) {
  const { t } = useTranslation();
  const gallery = [...new Set(images.length > 0 ? images : [thumbnail])];
  const [selected, setSelected] = useState(0);
  const index = Math.min(selected, gallery.length - 1);

  return (
    <Card bg={IMAGE_PANEL_BG}>
      <Image src={gallery[index]} alt={title} h={360} fit="contain" />
      {gallery.length > 1 && (
        <Group gap="xs" justify="center" role="group" aria-label={t("product.gallery")}>
          {gallery.map((src, position) => (
            <UnstyledButton
              key={src}
              onClick={() => setSelected(position)}
              aria-pressed={position === index}
              aria-label={t("product.galleryThumb", { index: position + 1, total: gallery.length })}
              bd={
                position === index
                  ? "2px solid var(--mantine-primary-color-filled)"
                  : "2px solid var(--mantine-color-default-border)"
              }
              style={{ borderRadius: "var(--mantine-radius-md)", overflow: "hidden" }}
            >
              <Image src={src} alt="" w={64} h={64} fit="contain" loading="lazy" />
            </UnstyledButton>
          ))}
        </Group>
      )}
    </Card>
  );
}
