import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Container,
  Group,
  LoadingOverlay,
  Pagination,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  VisuallyHidden,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconDownload, IconEdit, IconPlus, IconSearch, IconTrash } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { EditableCell } from "../components/editable-cell";
import { SortableTh } from "../components/sortable-th";
import { EmptyState, ErrorState } from "../components/status-message";
import {
  csvFileName,
  downloadTextFile,
  productsToCsv,
  type CsvHeaders,
  type CsvOptions,
} from "../helpers/csv";
import { categoryOptions, formatCategory } from "../helpers/formatters";
import { isLocalProductId } from "../helpers/ids";
import { useAdminStore } from "../hooks/use-admin-store";
import { useApiQuery } from "../hooks/use-api-query";
import { useCatalog } from "../hooks/use-catalog";
import { useDocumentTitle } from "../hooks/use-document-title";
import { useFormatPrice } from "../hooks/use-format-price";
import { useScrollOnChange } from "../hooks/use-scroll-on-change";
import type { Product, ProductFormValues } from "../schemas/product-schema";
import { getApiErrorMessage } from "../services/api";
import { deleteProduct, listProducts, updateProduct } from "../services/products-service";

const UNDO_TIMEOUT_MS = 8000;

export function AdminProducts() {
  const { t, i18n } = useTranslation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useDocumentTitle(t("admin.title"));
  const formatPrice = useFormatPrice();
  const catalog = useCatalog();
  const { created, applyTo, markDeleted, restoreDeleted, saveEdit } = useAdminStore();
  const { products } = catalog;
  useScrollOnChange(catalog.page, headingRef);

  // Catálogo completo (mesmo cache do dashboard): alimenta a exportação em CSV.
  const everything = useApiQuery(["products", "all"], (signal) =>
    listProducts({ limit: 0, signal }),
  );

  const rows =
    products.status === "success"
      ? [
          ...(catalog.page === 1 && !catalog.searchInput && !catalog.category ? created : []),
          ...applyTo(products.data.products),
        ]
      : [];

  // ---- seleção em massa: vale só para a "visão" atual (página/filtros/ordem); mudou, zera.
  const scope = `${catalog.page}|${catalog.category}|${catalog.sort}|${catalog.searchInput}`;
  const [selection, setSelection] = useState<{ scope: string; ids: number[] }>({
    scope,
    ids: [],
  });
  const selectedIds = selection.scope === scope ? selection.ids : [];
  const setSelectedIds = (ids: number[]) => setSelection({ scope, ids });
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.includes(row.id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  const toggleRow = (id: number) =>
    setSelectedIds(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id],
    );

  // ---- exclusão (uma ou várias) com "Desfazer"
  const deleteProducts = async (ids: number[]) => {
    const results = await Promise.allSettled(
      ids.map((id) => (isLocalProductId(id) ? Promise.resolve() : deleteProduct(id))),
    );
    const deleted = ids.filter((_, index) => results[index].status === "fulfilled");
    const failed = ids.length - deleted.length;
    deleted.forEach(markDeleted);
    setSelectedIds(selectedIds.filter((id) => !deleted.includes(id)));

    if (failed > 0) {
      const firstError = results.find((r) => r.status === "rejected");
      notifications.show({
        title: t("admin.errorTitle"),
        message:
          firstError?.status === "rejected"
            ? getApiErrorMessage(firstError.reason)
            : t("admin.deleteFailed", { count: failed }),
        color: "red",
      });
    }
    if (deleted.length > 0) {
      const id = `admin-undo-${Date.now()}`;
      notifications.show({
        id,
        color: "green",
        autoClose: UNDO_TIMEOUT_MS,
        message: (
          <Group justify="space-between" wrap="nowrap" gap="xs">
            <Text size="sm" flex={1} miw={0}>
              {t("admin.deleted", { count: deleted.length })}
            </Text>
            <Button
              size="compact-md"
              variant="default"
              flex="none"
              onClick={() => {
                restoreDeleted(deleted);
                notifications.hide(id);
              }}
            >
              {t("cart.undo")}
            </Button>
          </Group>
        ),
      });
    }
  };

  const confirmDelete = (ids: number[], singleTitle?: string) => {
    modals.openConfirmModal({
      title: (
        <Title order={3}>
          {ids.length === 1
            ? t("admin.deleteTitle")
            : t("admin.bulkDeleteTitle", { count: ids.length })}
        </Title>
      ),
      children: (
        <Text>
          {ids.length === 1 && singleTitle
            ? t("admin.deleteBody", { title: singleTitle })
            : t("admin.bulkDeleteBody")}
        </Text>
      ),
      labels: { confirm: t("admin.deleteConfirm"), cancel: t("common.cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => void deleteProducts(ids),
    });
  };

  // ---- edição de preço/estoque no lugar (a API só simula; o store guarda o resultado)
  const saveField = async (product: Product, field: "price" | "stock", value: number) => {
    const values: ProductFormValues = {
      title: product.title,
      description: product.description,
      category: product.category,
      price: product.price,
      stock: product.stock ?? 0,
      [field]: value,
    };
    if (!isLocalProductId(product.id)) await updateProduct(product.id, values);
    saveEdit({ ...product, [field]: value });
    notifications.show({
      message: t(field === "price" ? "admin.priceUpdated" : "admin.stockUpdated"),
      color: "green",
    });
  };

  // ---- exportação em CSV do catálogo inteiro (com as alterações feitas nesta sessão)
  const exportCsv = () => {
    if (everything.status !== "success") return;
    const all = [...created, ...applyTo(everything.data.products)];
    const brazilian = i18n.language === "pt-BR";
    const options: CsvOptions = brazilian
      ? { delimiter: ";", decimal: "," }
      : { delimiter: ",", decimal: "." };
    const headers: CsvHeaders = {
      id: t("admin.csv.id"),
      title: t("admin.csv.title"),
      category: t("admin.csv.category"),
      brand: t("admin.csv.brand"),
      price: t("admin.csv.price"),
      discount: t("admin.csv.discount"),
      finalPrice: t("admin.csv.finalPrice"),
      stock: t("admin.csv.stock"),
      rating: t("admin.csv.rating"),
    };
    const name = csvFileName();
    downloadTextFile(name, productsToCsv(all, headers, options, formatCategory));
    notifications.show({
      message: t("admin.exported", { name, count: all.length }),
      color: "green",
    });
  };

  return (
    <Container size="lg" py="xl">
      <Stack>
        <Group justify="space-between">
          <Title order={1} ref={headingRef} tabIndex={-1} style={{ outline: "none" }}>
            {t("admin.title")}
          </Title>
          <Group>
            <Button
              variant="default"
              leftSection={<IconDownload size={18} />}
              disabled={everything.status !== "success"}
              onClick={exportCsv}
            >
              {t("admin.exportCsv")}
            </Button>
            <Button component={Link} to="/admin/produtos/novo" leftSection={<IconPlus size={18} />}>
              {t("dashboard.newProduct")}
            </Button>
          </Group>
        </Group>

        <Group align="flex-end" grow preventGrowOverflow={false}>
          <TextInput
            label={t("admin.search")}
            placeholder={t("admin.searchPlaceholder")}
            type="search"
            leftSection={<IconSearch size={18} />}
            value={catalog.searchInput}
            onChange={(e) => catalog.setSearchInput(e.currentTarget.value)}
          />
          <Select
            label={t("admin.category")}
            placeholder={t("admin.allCategories")}
            clearable
            searchable
            data={categoryOptions(catalog.categories)}
            value={catalog.category}
            onChange={catalog.setCategory}
          />
        </Group>

        {selectedIds.length > 0 && (
          <Group
            role="region"
            aria-label={t("admin.selected", { count: selectedIds.length })}
            justify="space-between"
            p="xs"
            style={{
              border: "1px solid var(--mantine-color-default-border)",
              borderRadius: "var(--mantine-radius-md)",
            }}
          >
            <Text fw={600} aria-live="polite">
              {t("admin.selected", { count: selectedIds.length })}
            </Text>
            <Group gap="xs">
              <Button
                color="red"
                variant="light"
                size="compact-md"
                leftSection={<IconTrash size={16} />}
                onClick={() => confirmDelete(selectedIds)}
              >
                {t("admin.deleteSelected")}
              </Button>
              <Button
                variant="subtle"
                color="gray"
                size="compact-md"
                onClick={() => setSelectedIds([])}
              >
                {t("admin.clearSelection")}
              </Button>
            </Group>
          </Group>
        )}

        {products.status === "error" && (
          <ErrorState message={products.error} onRetry={products.retry} />
        )}

        <Box pos="relative" mih={200}>
          <LoadingOverlay visible={products.status === "loading"} />
          {products.status === "success" && rows.length === 0 && (
            <EmptyState title={t("admin.none")} />
          )}
          {rows.length > 0 && (
            <Table.ScrollContainer minWidth={720}>
              <Table verticalSpacing="sm" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={40}>
                      <Checkbox
                        aria-label={t("admin.selectAll")}
                        checked={allSelected}
                        indeterminate={someSelected}
                        onChange={() => setSelectedIds(allSelected ? [] : rows.map((r) => r.id))}
                      />
                    </Table.Th>
                    <SortableTh
                      label={t("admin.product")}
                      asc="nome"
                      desc="nome-desc"
                      current={catalog.sort}
                      onSort={(key) => catalog.setSort(key)}
                    />
                    <SortableTh
                      label={t("admin.category")}
                      asc="categoria-asc"
                      desc="categoria-desc"
                      current={catalog.sort}
                      onSort={(key) => catalog.setSort(key)}
                    />
                    <SortableTh
                      label={t("admin.price")}
                      asc="tabela-asc"
                      desc="tabela-desc"
                      current={catalog.sort}
                      onSort={(key) => catalog.setSort(key)}
                      align="right"
                    />
                    <SortableTh
                      label={t("admin.stock")}
                      asc="estoque-asc"
                      desc="estoque-desc"
                      current={catalog.sort}
                      onSort={(key) => catalog.setSort(key)}
                      align="right"
                    />
                    <Table.Th>
                      <VisuallyHidden>{t("admin.actions")}</VisuallyHidden>
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((product) => (
                    <Table.Tr
                      key={product.id}
                      bg={
                        selectedIds.includes(product.id)
                          ? "light-dark(var(--mantine-color-blue-0), var(--mantine-color-dark-5))"
                          : undefined
                      }
                    >
                      <Table.Td>
                        <Checkbox
                          aria-label={t("admin.selectRow", { title: product.title })}
                          checked={selectedIds.includes(product.id)}
                          onChange={() => toggleRow(product.id)}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Text fw={500} component={Link} to={`/produtos/${product.id}`} c="inherit">
                          {product.title}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light">{formatCategory(product.category)}</Badge>
                      </Table.Td>
                      <Table.Td ta="right">
                        <EditableCell
                          field="price"
                          title={product.title}
                          value={product.price}
                          display={formatPrice(product.price)}
                          onSave={(value) => saveField(product, "price", value)}
                        />
                      </Table.Td>
                      <Table.Td ta="right">
                        <EditableCell
                          field="stock"
                          title={product.title}
                          value={product.stock}
                          display={String(product.stock ?? "—")}
                          onSave={(value) => saveField(product, "stock", value)}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs" justify="flex-end" wrap="nowrap">
                          <ActionIcon
                            variant="subtle"
                            component={Link}
                            to={`/admin/produtos/${product.id}/editar`}
                            aria-label={t("admin.editAria", { title: product.title })}
                          >
                            <IconEdit size={18} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            aria-label={t("admin.deleteAria", { title: product.title })}
                            onClick={() => confirmDelete([product.id], product.title)}
                          >
                            <IconTrash size={18} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Box>

        {catalog.totalPages > 1 && (
          <Group justify="center">
            <Pagination
              total={catalog.totalPages}
              value={Math.min(catalog.page, catalog.totalPages)}
              onChange={catalog.setPage}
              getControlProps={(control) => ({ "aria-label": t(`pagination.${control}`) })}
            />
          </Group>
        )}
      </Stack>
    </Container>
  );
}
