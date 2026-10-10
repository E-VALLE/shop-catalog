import { Card, Group, SimpleGrid, Skeleton, Stack } from "@mantine/core";

/** Mesma estrutura/altura do `ProductCard`, para a lista não "pular" quando os dados chegam. */
function ProductCardSkeleton() {
  return (
    <Card aria-hidden>
      <Card.Section>
        <Skeleton h={180} radius={0} />
      </Card.Section>
      <Group justify="space-between" wrap="nowrap">
        <Skeleton h={22} w={90} radius="xl" />
        <Skeleton h={16} w={40} />
      </Group>
      <Stack gap={6} mih={48}>
        <Skeleton h={16} />
        <Skeleton h={16} w="70%" />
      </Stack>
      <Skeleton h={24} w={120} />
      <Group grow gap="xs" wrap="nowrap">
        <Skeleton h={36} radius="xl" />
        <Skeleton h={36} radius="xl" />
      </Group>
    </Card>
  );
}

interface ProductGridSkeletonProps {
  count?: number;
  /** Texto anunciado a leitores de tela enquanto carrega. */
  label: string;
}

export function ProductGridSkeleton({ count = 12, label }: ProductGridSkeletonProps) {
  return (
    <SimpleGrid
      cols={{ base: 1, xs: 2, md: 3, lg: 4 }}
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </SimpleGrid>
  );
}

/** Esqueleto da página de detalhes (imagem à esquerda, informações à direita). */
export function ProductDetailsSkeleton({ label }: { label: string }) {
  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} role="status" aria-busy="true" aria-label={label}>
      <Card>
        <Skeleton h={360} />
      </Card>
      <Stack>
        <Group>
          <Skeleton h={22} w={90} radius="xl" />
          <Skeleton h={22} w={70} radius="xl" />
        </Group>
        <Skeleton h={32} w="80%" />
        <Skeleton h={20} w={60} />
        <Skeleton h={28} w={180} />
        <Skeleton h={14} />
        <Skeleton h={14} />
        <Skeleton h={14} w="60%" />
        <Group>
          <Skeleton h={50} w={120} />
          <Skeleton h={42} w={200} radius="xl" />
        </Group>
      </Stack>
    </SimpleGrid>
  );
}
