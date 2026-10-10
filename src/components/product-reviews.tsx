import { Avatar, Button, Group, Rating, Stack, Text, Title, VisuallyHidden } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { averageRating } from "../helpers/reviews";
import type { Review } from "../schemas/product-schema";

const COLLAPSED_COUNT = 3;

function formatReviewDate(iso: string, locale: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

/** Avaliações de clientes (dados da API): média, lista e "ver todas". */
export function ProductReviews({ reviews }: { reviews: Review[] }) {
  const { t, i18n } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const average = averageRating(reviews);
  const visible = showAll ? reviews : reviews.slice(0, COLLAPSED_COUNT);

  return (
    <Stack component="section" aria-labelledby="reviews-title">
      <Group justify="space-between" align="baseline">
        <Title order={2} id="reviews-title">
          {t("reviews.title", { count: reviews.length })}
        </Title>
        {average !== null && (
          <Group gap="xs">
            <Rating value={average} fractions={2} readOnly aria-hidden />
            <Text fw={700}>
              {t("reviews.average", { count: reviews.length, value: average.toFixed(1) })}
            </Text>
          </Group>
        )}
      </Group>

      {reviews.length === 0 && <Text c="dimmed">{t("reviews.none")}</Text>}

      <Stack component="ul" m={0} p={0} style={{ listStyle: "none" }}>
        {visible.map((review, index) => (
          <Group
            key={`${review.reviewerName}-${index}`}
            component="li"
            align="flex-start"
            wrap="nowrap"
          >
            <Avatar
              name={review.reviewerName}
              color="initials"
              variant="filled"
              autoContrast
              alt=""
            />
            <Stack gap={2} flex={1} miw={0}>
              <Group gap="xs">
                <Text fw={600}>{review.reviewerName}</Text>
                <Text size="sm" c="dimmed">
                  {formatReviewDate(review.date, i18n.language)}
                </Text>
              </Group>
              <Group gap="xs">
                <Rating value={review.rating} readOnly size="sm" aria-hidden />
                <VisuallyHidden>{t("reviews.stars", { rating: review.rating })}</VisuallyHidden>
              </Group>
              <Text>{review.comment}</Text>
            </Stack>
          </Group>
        ))}
      </Stack>

      {reviews.length > COLLAPSED_COUNT && (
        <Group>
          <Button
            variant="subtle"
            size="compact-md"
            aria-expanded={showAll}
            onClick={() => setShowAll((current) => !current)}
          >
            {showAll ? t("reviews.showFewer") : t("reviews.showAll", { count: reviews.length })}
          </Button>
        </Group>
      )}
    </Stack>
  );
}
